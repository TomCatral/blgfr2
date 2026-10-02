import { Component, Input, signal, computed, inject, CUSTOM_ELEMENTS_SCHEMA, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { AppModalLayerComponent } from '../../ui/modal-layer.component';
import { ClsPipe } from '../../../shared/cls.pipe';
import { FlowNodeComponent } from './flow-node.component';
import {
  DocumentRecord,
  DocumentRouteStep,
  DocumentAttachment,
  AuditLog,
  PopupAction,
  User,
  DEFAULT_ROLE_PERMISSIONS,
  DivisionCode,
} from '../../../types';
import { formatDate } from '../../../utils/status-utils';
import { isDocumentParticipant } from '../../../utils/document-visibility';
import { isSharedDocumentFile } from '../../../utils/attachment-visibility';
import { documentFileType } from '../../../utils/document-files';
import { hasCompletedPart } from '../../../utils/routing-recipients';
import { ApiService } from '../../../services/api.service';
import { UiService } from '../../../services/ui.service';
import { StateService } from '../../../services/state.service';
import { showConfirm, showPrompt } from '../../../services/dialog.service';

const displayRouteRemarks = (remarks?: string) => {
  const value = remarks?.trim();
  if (!value || value === 'Logged in BLGF Document Tracking System' || value === 'Routed to all divisions during document logging') return 'N/A';
  return value;
};

const getRouteDecision = (route: DocumentRouteStep) => {
  const text = `${route.actionRequested || ''} ${route.remarks || ''}`.toUpperCase();
  if (text.includes('DISAPPROVED')) return 'DISAPPROVED';
  if (text.includes('APPROVED')) return 'APPROVED';
  return undefined;
};

const cleanRouteDestination = (value?: string) =>
  (value || '').split(/\s*\|\s*Assigned Handler \/ Individual Recipient:/i)[0].trim();

const formatReadableStatus = (status?: string) =>
  (status || 'IN PROGRESS').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

const DIVISION_OFFICE_NAMES: Record<string, string> = {
  ITMS: 'Information Technology Management System',
  ORD: 'Office of the Regional Director',
  AD: 'Administrative Division',
  LAOD: 'Local Assessment Operations Division',
  LTOD: 'Local Treasury Operations Division',
  FD: 'Financial Division',
  LU: 'Legal Division / Unit',
};

const NEXT_ACTION: Record<DocumentRecord['currentStatus'], string> = {
  NOT_YET_ROUTED: 'Document has been registered. Dispatch or route this document to an initial division or recipient handler.',
  PENDING: 'The assigned handler reviews the document and starts the requested action.',
  IN_PROGRESS: 'The handler records the work done, then forwards the document when ready.',
  FOR_SIGNATURE: 'The designated approver reviews the document for signature or a decision.',
  RETURNED: 'Review the return remarks and coordinate the requested corrections with the records handler.',
  ON_HOLD: 'Review the hold remarks and resolve the pending requirement before continuing.',
  COMPLETED: 'This transaction has ended. Follow the final handoff instructions below. No further routing is allowed.',
};

const TRANSACTION_STAGES = ['Received', 'Processing', 'For approval', 'Completed'];

const TRANSACTION_STAGE: Record<DocumentRecord['currentStatus'], number> = {
  NOT_YET_ROUTED: 0,
  PENDING: 0,
  IN_PROGRESS: 1,
  FOR_SIGNATURE: 2,
  RETURNED: 1,
  ON_HOLD: 1,
  COMPLETED: 3,
};

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, AppModalLayerComponent, ClsPipe, FlowNodeComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './document-detail.component.html',
  styleUrls: ['./document-detail.component.scss'],
})
export class DocumentDetailComponent implements OnChanges {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private state = inject(StateService);
  private sanitizer = inject(DomSanitizer);

  readonly host = this;

  @Input() isOpen = false;
  @Input() document!: DocumentRecord;
  @Input() currentUser!: User;
  @Input() users: User[] = [];
  @Input() auditLogs: AuditLog[] = [];
  @Input() showFullFlow = true;
  @Input() onClose!: () => void;
  @Input() onPrintSlip!: (doc: DocumentRecord) => void;
  @Input() onOpenRouteDoc!: (doc: DocumentRecord) => void;
  @Input() onDeleteDoc?: (doc: DocumentRecord) => void;
  @Input() onRefreshDocument?: () => Promise<void> | void;
  @Input() onDecision?: (doc: DocumentRecord, decision: 'APPROVED' | 'DISAPPROVED') => Promise<boolean> | boolean;
  @Input() pendingPopupAction?: PopupAction | null;
  @Input() onSnoozeClose?: () => void;

  isSubmittingDecision = signal(false);
  docVersion = signal(0);
  viewingPdf = signal<{
    url: string;
    safeUrl: SafeResourceUrl;
    name: string;
    shouldRevoke?: boolean;
  } | null>(null);
  isUploading = signal(false);
  selectedFlowRecipient = signal<string | null>(null);
  flowFilterMode = signal<'ALL' | 'MY'>('MY');
  flowViewMode = signal<'graph' | 'timeline'>('graph');
  auditExpanded = signal(false);

  isEditingFinalInstructions = signal(false);
  finalInstructionsDraft = signal('');
  isSavingFinalInstructions = signal(false);
  overrideFinalInstructions = signal<string | null>(null);
  saveInstructionSuccess = signal(false);
  copiedInstructionFeedback = signal(false);

  readonly instructionPresets = [
    {
      label: 'Room 204 Records',
      icon: 'archive-outline',
      text: 'Available for pickup at Room 204 Records Section. Look for the Records Officer and present a valid government ID.',
    },
    {
      label: 'ORD Office',
      icon: 'business-outline',
      text: 'For claiming at the Office of the Regional Director (ORD) Receiving Desk.',
    },
    {
      label: 'Admin Division',
      icon: 'briefcase-outline',
      text: 'Available for release at the Administrative Division Window. Please sign the receiving transmittal copy upon pickup.',
    },
    {
      label: 'Releasing Window',
      icon: 'mail-unread-outline',
      text: 'Dispatched to Ground Floor Releasing Window for pick-up / courier forwarding.',
    },
    {
      label: 'Archived / Storage',
      icon: 'file-tray-full-outline',
      text: 'Transaction completed and original copy archived in BLGF Records Central Storage.',
    },
  ];

  readonly userMap = computed(() => {
    const map = new Map<string, string>();
    for (const u of this.users) {
      if (u.id) map.set(u.id, u.fullName);
    }
    return map;
  });

  readonly userDivisionMap = computed(() => {
    const map = new Map<string, string>();
    for (const u of this.users) {
      if (u.id && u.divisionCode) map.set(u.id, u.divisionCode);
    }
    return map;
  });

  readonly userNameToIdMap = computed(() => {
    const map = new Map<string, string>();
    for (const u of this.users) {
      if (u.fullName) map.set(u.fullName.trim().toLowerCase(), u.id);
    }
    return map;
  });

  readonly docAuditLogs = computed(() => {
    this.docVersion();
    const doc = this.document;
    if (!doc) return [];
    const trackingSet = new Set([doc.trackingNumber, doc.routeNo].filter(Boolean) as string[]);
    return this.auditLogs.filter((log) => Boolean(log.documentTrackingNumber && trackingSet.has(log.documentTrackingNumber)));
  });

  // Recalled routing steps are gone from the trail, so their audit entries must
  // not resurface as Recorded Actions.
  private readonly removedRecipientCutoffs = computed(() => {
    const removals = new Map<string, number>();
    for (const log of this.docAuditLogs()) {
      if (!/removed recipient/i.test(log.details)) continue;
      const name = log.details.match(/removed recipient\s+(.+?)(?:\s+from transaction|\s*\||$)/i)?.[1]
        ?.replace(/\s*\([^)]*\)\s*$/, '')
        .trim()
        .toLowerCase();
      if (!name) continue;
      const at = new Date(log.timestamp).getTime();
      removals.set(name, Math.max(removals.get(name) ?? 0, at));
    }
    return removals;
  });

  private isSupersededByRemoval(log: AuditLog): boolean {
    const removals = this.removedRecipientCutoffs();
    if (removals.size === 0) return false;
    if (log.action !== 'ROUTE_DOC') return false;
    const destination = log.details
      .match(/\bTo:\s*(.*?)(?:\s*\|\s*(?:Action|Remarks|Status|Division):|$)/i)?.[1]
      ?.trim()
      .toLowerCase();
    if (!destination || /^n\/a(\s|$)/.test(destination)) return false;
    const removedAt = removals.get(destination);
    return removedAt !== undefined && new Date(log.timestamp).getTime() <= removedAt;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.document) {
      if (this.document.finalInstructions?.trim()) {
        this.overrideFinalInstructions.set(this.document.finalInstructions.trim());
      } else {
        this.overrideFinalInstructions.set(null);
      }
      this.flowFilterMode.set('MY');
      this.docVersion.update((v) => v + 1);
    }
    if (changes['currentUser'] && this.currentUser) {
      this.flowFilterMode.set('MY');
      this.docVersion.update((v) => v + 1);
    }
  }

  documentFields = computed(() =>
    [
      { label: 'Tracking #', value: this.document.routeNo || this.document.trackingNumber },
      { label: 'Category', value: this.document.category },
      { label: 'Originating office', value: this.document.originatingOffice },
      { label: 'Destination office', value: this.document.destinationOffice },
      { label: 'Assigned handler', value: this.resolveUserName(this.document.assignedUserId, this.document.assignedUser) || this.document.assignedUser },
      { label: 'Target due date', value: this.document.targetCompletionDate ? formatDate(this.document.targetCompletionDate) : 'Not set' },
      { label: 'Priority', value: this.document.priority },
      { label: 'Direction', value: this.document.direction },
    ].map((field) => ({ label: field.label, value: field.value || '' })),
  );

  nextActionText = computed(() => NEXT_ACTION[this.document.currentStatus]);

  transactionStages = computed(() =>
    TRANSACTION_STAGES.map((label, index) => {
      const current = TRANSACTION_STAGE[this.document.currentStatus];
      const active = index === current;
      const reached = index <= current;
      const paused = this.document.currentStatus === 'RETURNED' || this.document.currentStatus === 'ON_HOLD';
      return {
        label,
        active,
        reached,
        paused,
        barClass: paused && active ? 'bg-amber-500' : active ? 'bg-[linear-gradient(90deg,#2563eb,#6366f1)] shadow-sm' : reached ? 'bg-slate-800 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700',
        textClass: active ? 'font-extrabold text-blue-700 dark:text-blue-300' : reached ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400',
        subLabel: paused ? (this.document.currentStatus === 'RETURNED' ? 'Needs revision' : 'On hold') : this.document.currentStatus === 'COMPLETED' ? 'Ended' : 'Current stage',
        subTextClass: paused ? 'text-amber-600' : active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500',
      };
    }),
  );

  isDocumentParticipant(): boolean {
    return isDocumentParticipant(this.document, this.currentUser, this.auditLogs);
  }

  canAccessDocumentSlip(): boolean {
    const perms = this.currentUser.permissions || DEFAULT_ROLE_PERMISSIONS[this.currentUser.role] || DEFAULT_ROLE_PERMISSIONS.STAFF;
    return (perms.allowedViews || []).includes('slip');
  }

  canViewAllRoutes = computed<boolean>(() => {
    if (this.currentUser?.role === 'SYSTEM_ADMIN') return true;
    const perms =
      this.currentUser?.permissions ||
      DEFAULT_ROLE_PERMISSIONS[this.currentUser?.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    return Boolean(perms.canViewAllRoutes);
  });

  hasMultipleBranches = computed<boolean>(() => {
    const all = this.rawHistoryRoutes();
    if (all.length <= 1) return false;
    const roots = all.filter((route, index) => {
      if (index === 0) return true;
      const hasParent = all
        .slice(0, index)
        .some((p) => this.matchesPerson(p.toUserId, p.toUser, route.fromUserId, route.fromUser));
      return !hasParent;
    });
    return roots.length > 1;
  });

  isRecipientYou(route: DocumentRouteStep): boolean {
    if (!this.currentUser) return false;
    return this.matchesPerson(route.toUserId, route.toUser, this.currentUser.id, this.currentUser.fullName);
  }

  isSenderYou(route: DocumentRouteStep): boolean {
    if (!this.currentUser) return false;
    return this.matchesPerson(route.fromUserId, route.fromUser, this.currentUser.id, this.currentUser.fullName);
  }

  isParticipantInStep(route: DocumentRouteStep): boolean {
    if (!this.currentUser) return false;
    return (
      this.matchesPerson(route.fromUserId, route.fromUser, this.currentUser.id, this.currentUser.fullName) ||
      this.matchesPerson(route.toUserId, route.toUser, this.currentUser.id, this.currentUser.fullName)
    );
  }

  isRouteConnectedToUser(route: DocumentRouteStep, allRoutes: DocumentRouteStep[]): boolean {
    if (!this.currentUser) return true;

    if (this.isParticipantInStep(route)) return true;

    if (this.matchesPerson(this.document.createdByUserId, this.document.createdBy, this.currentUser.id, this.currentUser.fullName)) {
      if (this.matchesPerson(route.fromUserId, route.fromUser, this.currentUser.id, this.currentUser.fullName)) {
        return true;
      }
    }

    // Upstream check: does this route lead downstream to a step where user is a participant?
    const leadsToUser = (curr: DocumentRouteStep, visited = new Set<string>()): boolean => {
      if (visited.has(curr.id)) return false;
      visited.add(curr.id);

      const children = allRoutes
        .slice(allRoutes.indexOf(curr) + 1)
        .filter((child) => this.matchesPerson(child.fromUserId, child.fromUser, curr.toUserId, curr.toUser));
      for (const child of children) {
        if (this.isParticipantInStep(child) || leadsToUser(child, visited)) {
          return true;
        }
      }
      return false;
    };

    if (leadsToUser(route)) return true;

    // Downstream check: did this route originate from a step where user was a participant?
    const originatesFromUser = (curr: DocumentRouteStep, visited = new Set<string>()): boolean => {
      if (visited.has(curr.id)) return false;
      visited.add(curr.id);

      const parents = allRoutes
        .slice(0, allRoutes.indexOf(curr))
        .reverse()
        .filter((parent) => this.matchesPerson(parent.toUserId, parent.toUser, curr.fromUserId, curr.fromUser));
      for (const parent of parents) {
        if (this.isParticipantInStep(parent) || originatesFromUser(parent, visited)) {
          return true;
        }
      }
      return false;
    };

    if (originatesFromUser(route)) return true;

    return false;
  }

  intakeRoute = computed<DocumentRouteStep>(() => ({
    id: `intake-${this.document.id}`,
    documentId: this.document.id,
    routeNo: this.document.routeNo,
    fromDivision: (this.document.originatingOffice as DivisionCode) || 'ORD',
    fromUser: this.document.createdBy || 'Originating Office',
    fromUserId: this.document.createdByUserId || 'origin',
    toDivision: (this.document.currentDivision as DivisionCode) || (this.document.destinationOffice as DivisionCode) || 'ORD',
    toUser: this.resolveUserName(this.document.assignedUserId, this.document.assignedUser) || this.document.destinationOffice || 'Records Section',
    toUserId: this.document.assignedUserId || 'assigned',
    actionRequested: 'Document Logged & Initial Intake',
    remarks: this.document.subject || 'Document registered in BLGF Document Tracking System',
    statusBefore: 'PENDING',
    statusAfter: this.document.currentStatus || 'PENDING',
    createdAt: this.document.createdAt,
    stepNumber: 0,
  }));

  rawHistoryRoutes = computed<DocumentRouteStep[]>(() => {
    const routes = (this.document.routes || []).filter((r) => {
      if (getRouteDecision(r)) return false;
      const hasRecipient = Boolean(r.toUserId || (r.toUser && r.toUser.trim() && r.toUser.trim() !== 'N/A'));
      if (!hasRecipient) return false;
      if (r.statusAfter === 'COMPLETED' && (!r.toUserId || !r.toUser?.trim() || r.toUser.trim() === 'N/A' || (r.fromUserId && r.toUserId && r.fromUserId === r.toUserId))) {
        return false;
      }
      return true;
    });
    return routes;
  });

  isDocumentCreator(): boolean {
    if (!this.currentUser || !this.document) return false;
    return this.matchesPerson(
      this.document.createdByUserId,
      this.document.createdBy,
      this.currentUser.id,
      this.currentUser.fullName,
    );
  }

  visibleRoutes = computed<DocumentRouteStep[]>(() => {
    const all = this.rawHistoryRoutes();
    const connected = all.filter((r) => this.isRouteConnectedToUser(r, all));
    if (connected.length > 0) {
      return connected;
    }
    return all;
  });

  historyRoutes = this.visibleRoutes;

  flowRecipients = computed<DocumentRouteStep[]>(() => {
    return this.visibleRoutes();
  });

  flowRoots = computed<DocumentRouteStep[]>(() => {
    const recipients = this.flowRecipients();
    if (recipients.length === 0) return [];
    const roots = recipients.filter((route, index) => {
      if (index === 0) return true;
      const hasParent = recipients
        .slice(0, index)
        .some((p) => this.matchesPerson(p.toUserId, p.toUser, route.fromUserId, route.fromUser));
      return !hasParent;
    });
    return roots.length > 0 ? roots : (recipients[0] ? [recipients[0]] : []);
  });

  firstDispatchSender = computed<string>(() => {
    // 1. Find the earliest non-decision route in the visible flow
    const visibleRecipients = this.flowRecipients();
    const firstRoute = visibleRecipients[0];
    if (firstRoute) {
      const sender = this.resolveUserName(firstRoute.fromUserId, firstRoute.fromUser) || firstRoute.fromUser;
      if (sender && sender.trim() && sender !== 'Originating Office' && sender !== 'N/A') {
        return sender.trim();
      }
    }

    // 2. Fallback to document creator
    const creator = this.resolveUserName(this.document.createdByUserId, this.document.createdBy) || this.document.createdBy;
    if (creator && creator.trim()) {
      return creator.trim();
    }

    // 3. Fallback to originating office
    return this.document.originatingOffice || 'Originating Office';
  });

  flowRootSenders = computed<string[]>(() => {
    return [this.firstDispatchSender()];
  });

  currentCustodian = computed(() => {
    if (this.document.currentStatus === 'COMPLETED') {
      return { name: 'Completed & Finalized', office: this.completedAtOffice(), action: 'Archived / Picked up' };
    }
    if (this.document.currentStatus === 'NOT_YET_ROUTED' || (!this.document.routes || this.document.routes.length === 0)) {
      return {
        name: 'Not Yet Routed',
        office: this.document.originatingOffice || 'Dispatch Origin',
        action: 'Awaiting Initial Routing',
      };
    }
    const latestRoute = [...(this.document.routes || [])].reverse().find((r) => !getRouteDecision(r));
    if (latestRoute) {
      return {
        name: this.resolveUserName(latestRoute.toUserId, latestRoute.toUser) || latestRoute.toDivision,
        office: latestRoute.toDivision,
        action: latestRoute.actionRequested || 'In processing',
      };
    }
    return {
      name: this.resolveUserName(this.document.assignedUserId, this.document.assignedUser) || this.document.assignedUser || 'Assigned Handler',
      office: this.document.currentDivision || this.document.destinationOffice,
      action: 'Initial Intake',
    };
  });

  databaseTransactions = computed(() => {
    interface TxItem {
      id: string;
      type: 'REGISTRATION' | 'ROUTE' | 'DECISION' | 'AUDIT_ACTION' | 'ATTACHMENT' | 'STATUS_CHANGE';
      typeLabel: string;
      timestamp: string;
      actorName: string;
      actorDivision?: string;
      targetName?: string;
      targetDivision?: string;
      action: string;
      remarks?: string;
      status?: string;
      badgeClass: string;
      icon: string;
      attachments?: DocumentAttachment[];
      isCurrentUser: boolean;
    }

    const items: TxItem[] = [];

    items.push({
      id: `tx-init-${this.document.id}`,
      type: 'REGISTRATION',
      typeLabel: 'Document Logged',
      timestamp: this.document.createdAt,
      actorName: this.document.createdBy || 'Originating Office',
      actorDivision: this.document.originatingOffice,
      targetName: this.resolveUserName(this.document.assignedUserId, this.document.assignedUser) || this.document.assignedUser || this.document.destinationOffice,
      targetDivision: this.document.destinationOffice,
      action: `Logged document [${this.document.routeNo || this.document.trackingNumber}]`,
      remarks: this.document.subject || 'Document logged and assigned in BLGF Document Tracking System',
      status: this.document.currentStatus,
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/60 dark:text-blue-200',
      icon: 'document-text',
      attachments: this.sharedDocumentFiles(),
      isCurrentUser: this.matchesPerson(this.document.createdByUserId, this.document.createdBy, this.currentUser.id, this.currentUser.fullName),
    });

    (this.document.routes || []).forEach((route, idx) => {
      const decision = getRouteDecision(route);
      const isDec = Boolean(decision);
      const actorName = this.resolveUserName(route.fromUserId, route.fromUser) || route.fromDivision || 'Sender';
      const targetName = this.resolveUserName(route.toUserId, route.toUser) || route.toDivision;

      items.push({
        id: `tx-route-${route.id || idx}`,
        type: isDec ? 'DECISION' : 'ROUTE',
        typeLabel: isDec ? `Decision: ${decision}` : `Route #${route.stepNumber || idx + 1}`,
        timestamp: route.createdAt,
        actorName,
        actorDivision: route.fromDivision,
        targetName,
        targetDivision: route.toDivision,
        action: route.actionRequested || (isDec ? `Decision recorded: ${decision}` : 'Forwarded document'),
        remarks: displayRouteRemarks(route.remarks) !== 'N/A' ? displayRouteRemarks(route.remarks) : undefined,
        status: route.statusAfter,
        badgeClass: isDec
          ? decision === 'APPROVED'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200'
            : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200'
          : 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200',
        icon: isDec ? (decision === 'APPROVED' ? 'checkmark-circle' : 'close-circle') : 'git-branch',
        attachments: route.attachments || [],
        isCurrentUser:
          this.matchesPerson(route.fromUserId, route.fromUser, this.currentUser.id, this.currentUser.fullName) ||
          this.matchesPerson(route.toUserId, route.toUser, this.currentUser.id, this.currentUser.fullName),
      });
    });

    this.docAuditLogs().forEach((log) => {
        const isDuplicateRoute = items.some(
          (i) => Math.abs(new Date(i.timestamp).getTime() - new Date(log.timestamp).getTime()) < 3000 &&
                 (log.details.includes(i.action) || log.details.includes(i.actorName)),
        );
        if (!isDuplicateRoute) {
          const isAttachment = log.action === 'UPLOAD_ATTACHMENT';
          const isApproval = /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details);
          const isTransfer = log.action === 'TRANSFER_DOC';
          const isStatus = log.action === 'UPDATE_STATUS';

          let type: TxItem['type'] = 'AUDIT_ACTION';
          let typeLabel = 'Audit Log';
          let icon = 'time';
          let badgeClass = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';

          if (isAttachment) {
            type = 'ATTACHMENT';
            typeLabel = 'File Uploaded';
            icon = 'attach';
            badgeClass = 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/60 dark:text-teal-200';
          } else if (isApproval) {
            type = 'DECISION';
            typeLabel = 'Decision Recorded';
            icon = log.details.includes('APPROVED') ? 'checkmark-circle' : 'close-circle';
            badgeClass = log.details.includes('APPROVED')
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200'
              : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200';
          } else if (isTransfer) {
            type = 'ROUTE';
            typeLabel = 'Document Transferred';
            icon = 'swap-horizontal';
            badgeClass = 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-200';
          } else if (isStatus) {
            type = 'STATUS_CHANGE';
            typeLabel = 'Status Update';
            icon = 'refresh-circle';
            badgeClass = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200';
          }

          items.push({
            id: `tx-audit-${log.id}`,
            type,
            typeLabel,
            timestamp: log.timestamp,
            actorName: log.userName,
            actorDivision: log.userId ? this.userDivisionMap().get(log.userId) : undefined,
            action: log.details.split(/\s*\|\s*/)[0] || log.action,
            remarks: log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1],
            status: log.details.match(/Status:\s*([^|]+)$/i)?.[1]?.trim(),
            badgeClass,
            icon,
            isCurrentUser: this.matchesPerson(log.userId, log.userName, this.currentUser.id, this.currentUser.fullName),
          });
        }
      });

    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  statusChipClass(): string {
    switch (this.document.currentStatus) {
      case 'NOT_YET_ROUTED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
      case 'RETURNED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
      case 'ON_HOLD':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200';
      case 'FOR_SIGNATURE':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
    }
  }

  private pendingDecisionRouteSignal = computed(() => {
    this.docVersion();
    const routes = this.document.routes || [];
    if (routes.length === 0) return undefined;

    const userAssignments = [...routes].filter(
      (route) =>
        !getRouteDecision(route) &&
        this.matchesPerson(
          route.toUserId,
          route.toUser,
          this.currentUser.id,
          this.currentUser.fullName,
        ) &&
        !this.getHandlerDecision(route),
    );
    const latestAssignment = userAssignments.at(-1);
    if (!latestAssignment) return undefined;

    const assignedAt = new Date(latestAssignment.createdAt).getTime();

    const userAlreadyActed =
      routes.some(
        (route) =>
          this.matchesPerson(
            route.fromUserId,
            route.fromUser,
            this.currentUser.id,
            this.currentUser.fullName,
          ) &&
          new Date(route.createdAt).getTime() >= assignedAt &&
          route.id !== latestAssignment.id,
      ) ||
      this.docAuditLogs().some(
        (log) =>
          log.documentTrackingNumber === this.document.trackingNumber &&
          log.userId === this.currentUser.id &&
          new Date(log.timestamp).getTime() >= assignedAt &&
          ['ROUTE_DOC', 'TRANSFER_DOC', 'UPDATE_STATUS'].includes(log.action),
      );

    if (userAlreadyActed) {
      return undefined;
    }

    return latestAssignment;
  });

  pendingDecisionRoute = this.pendingDecisionRouteSignal;

  readonly isDecisionRequired = computed(() => {
    if (this.document.currentStatus === 'COMPLETED' || this.document.currentStatus === 'RETURNED') {
      return false;
    }
    return Boolean(this.pendingDecisionRoute());
  });

  readonly decisionRouteDetails = computed(() => {
    const route = this.pendingDecisionRoute();
    if (route) {
      return {
        fromUser: this.resolveUserName(route.fromUserId, route.fromUser) || route.fromUser || 'Sender',
        fromDivision: route.fromDivision || 'Forwarding Office',
        actionRequested: route.actionRequested || 'Appropriate Action',
        remarks: displayRouteRemarks(route.remarks) !== 'N/A' ? displayRouteRemarks(route.remarks) : undefined,
        forwardedAt: route.createdAt ? formatDate(route.createdAt) : undefined,
      };
    }
    return undefined;
  });

  latestDocumentDecision = computed(() => {
    this.docVersion();
    return [
      ...(this.document.routes || [])
        .map((route) => ({ status: getRouteDecision(route), timestamp: route.createdAt }))
        .filter((item) => item.status),
      ...this.docAuditLogs()
        .filter((log) => /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details))
        .map((log) => ({
          status: log.details.match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]?.toUpperCase() as 'APPROVED' | 'DISAPPROVED',
          timestamp: log.timestamp,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.status;
  });

  canRouteDocument = computed(() => {
    this.docVersion();
    const isUnrouted =
      this.document.currentStatus === 'NOT_YET_ROUTED' ||
      !this.document.routes ||
      this.document.routes.length === 0;
    const isPrivileged = ['ADMIN', 'SYSTEM_ADMIN', 'ORD', 'RECORDS_OFFICER'].includes(
      this.currentUser?.role || '',
    );
    return (
      this.document.currentStatus !== 'COMPLETED' &&
      !hasCompletedPart(this.document, this.currentUser) &&
      this.document.currentStatus !== 'RETURNED' &&
      this.latestDocumentDecision() !== 'DISAPPROVED' &&
      !this.isDecisionRequired() &&
      (this.isDocumentParticipant() || isPrivileged || isUnrouted)
    );
  });

  sharedDocumentFiles = computed(() => (this.document.attachments || []).filter((file) => isSharedDocumentFile(file, this.document, this.auditLogs)));

  selectedRoute = computed(() => {
    const id = this.selectedFlowRecipient();
    const recipients = this.flowRecipients();
    if (id && recipients.some((r) => r.id === id)) return recipients.find((r) => r.id === id)!;
    return this.historyRoutes()[0];
  });

  selectedSnapshot = computed(() => (this.selectedRoute() ? this.getRecipientSnapshot(this.selectedRoute()!) : undefined));

  selectedActivities = computed(() => (this.selectedRoute() ? this.getHandlerActivitySubsteps(this.selectedRoute()!) : []));

  selectedDecision = computed(() => (this.selectedRoute() ? this.getHandlerDecision(this.selectedRoute()!) : undefined));

  selectedDetailFields = computed(() => {
    const route = this.selectedRoute();
    if (!route) return [];

    const fields: { label: string; value?: string }[] = [
      { label: 'From', value: this.resolveUserName(route.fromUserId, route.fromUser) },
      { label: 'Office', value: route.toDivision },
      { label: 'Received', value: formatDate(route.createdAt) },
      { label: 'Requested action', value: route.actionRequested },
    ];

    const regRemarks = this.getFlowNodeRegularRemarks(route.id);
    if (regRemarks) {
      fields.push({ label: 'Routing Notes', value: regRemarks });
    }

    return fields.filter((field) => field.value && !/^(N\/A|None)$/i.test(field.value));
  });

  selectedCompletionInfo = computed(() => {
    const route = this.selectedRoute();
    if (!route) return null;
    const snap = this.selectedSnapshot();
    const activities = this.selectedActivities();
    const completedActivity = activities.find((a) => a.status === 'COMPLETED');
    const isCompleted = Boolean(snap?.ended || snap?.status === 'Completed' || completedActivity || route.statusAfter === 'COMPLETED');
    const handoffInst = this.getFlowNodeHandoffInstruction(route.id) || completedActivity?.instruction;

    if (!isCompleted && !handoffInst && this.document.currentStatus !== 'COMPLETED') {
      return null;
    }

    const performer =
      completedActivity?.performerName ||
      this.resolveUserName(route.fromUserId, route.fromUser) ||
      this.resolveUserName(route.toUserId, route.toUser) ||
      route.toDivision ||
      '';

    const performerDivision = completedActivity?.performerDivision || route.fromDivision || route.toDivision || '';

    const instruction =
      handoffInst ||
      completedActivity?.instruction ||
      (completedActivity?.remarks && !this.isNoneRemark(completedActivity.remarks) ? completedActivity.remarks : '') ||
      '';

    const timestamp = completedActivity?.timestamp || snap?.lastUpdated || route.processedAt || route.createdAt;

    return {
      isCompleted,
      completedBy: performer,
      division: performerDivision,
      instruction: instruction && !this.isNoneRemark(instruction) ? instruction : '',
      timestamp,
    };
  });

  resolveUserDivision(userId?: string, fallbackDivision?: string): string {
    if (userId) {
      const user = this.users.find((u) => u.id === userId);
      if (user?.divisionCode) return user.divisionCode;
    }
    return fallbackDivision || '';
  }

  editingPartId = signal<string | null>(null);
  editingPartDraft = signal<string>('');

  completedPartsList = computed(() => {
    this.docVersion();
    const items: {
      id: string;
      routeId?: string;
      completedBy: string;
      division: string;
      timestamp: string;
      instruction: string;
      isFullCompletion: boolean;
      isCurrentUser: boolean;
    }[] = [];

    const seenKeys = new Set<string>();
    const cleanInstruction = (text?: string) => (text || '').replace(/^Handoff Instructions:\s*/i, '').trim();

    // 1. Scan all routes in document.routes
    const routes = this.document.routes || [];
    routes.forEach((route, idx) => {
      const isRouteCompleted = route.statusAfter === 'COMPLETED';
      const snap = this.getRecipientSnapshot(route);
      const activities = this.getHandlerActivitySubsteps(route);
      const completedActivity = activities.find((a) => a.status === 'COMPLETED');
      const isSnapCompleted = Boolean(snap?.ended || snap?.status === 'Completed' || completedActivity);
      const handoffInst = this.getFlowNodeHandoffInstruction(route.id);
      const rawRemarks = cleanInstruction(route.remarks);
      const validRemark = rawRemarks !== 'N/A' && !this.isNoneRemark(rawRemarks) ? rawRemarks : '';
      const instruction = handoffInst || completedActivity?.instruction || validRemark;

      if (isRouteCompleted || isSnapCompleted || (instruction && (route.actionRequested?.toUpperCase() === 'COMPLETED' || isRouteCompleted))) {
        const completerId =
          completedActivity?.performerId ||
          (route.fromUserId && route.fromUserId !== 'origin' && route.fromUserId !== 'assigned' ? route.fromUserId : undefined) ||
          route.toUserId;

        const performer =
          completedActivity?.performerName ||
          this.resolveUserName(completerId, route.fromUser) ||
          route.fromUser ||
          this.resolveUserName(route.toUserId, route.toUser) ||
          route.toUser ||
          route.toDivision ||
          'Personnel';

        const division =
          completedActivity?.performerDivision ||
          route.fromDivision ||
          this.resolveUserDivision(route.fromUserId) ||
          route.toDivision ||
          this.resolveUserDivision(route.toUserId) ||
          '';

        const timestamp = completedActivity?.timestamp || snap?.lastUpdated || route.processedAt || route.createdAt;
        const key = `${performer.toLowerCase()}_${(instruction || '').toLowerCase()}`;

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const isFinal = this.document.currentStatus === 'COMPLETED' && (idx === routes.length - 1 || route.statusAfter === 'COMPLETED');
          items.push({
            id: route.id,
            routeId: route.id,
            completedBy: performer,
            division,
            timestamp,
            instruction: instruction || 'Part completed without additional remarks.',
            isFullCompletion: isFinal,
            isCurrentUser: this.matchesPerson(completerId, performer, this.currentUser?.id, this.currentUser?.fullName),
          });
        }
      }
    });

    // 2. Scan audit logs for any completion logs that might have been recorded directly
    const auditLogs = this.docAuditLogs();
    for (const log of auditLogs) {
      if ((log.action === 'UPDATE_STATUS' || log.action === 'ROUTE_DOC') && /(?:Action:\s*|^)COMPLETED\b|Status:\s*COMPLETED\b/i.test(log.details)) {
        const instructionMatch = log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1]?.trim() || '';
        const cleaned = cleanInstruction(instructionMatch);
        const validInstruction = cleaned !== 'N/A' && !this.isNoneRemark(cleaned) ? cleaned : '';
        const performer = log.userName || this.resolveUserName(log.userId, log.userName) || 'Personnel';
        const key = `${performer.toLowerCase()}_${(validInstruction || '').toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const user = this.users.find((u) => u.id === log.userId || u.fullName.toLowerCase() === log.userName?.toLowerCase());
          items.push({
            id: `audit-comp-${log.id}`,
            completedBy: performer,
            division: user?.divisionCode || '',
            timestamp: log.timestamp,
            instruction: validInstruction || 'Completed without remarks.',
            isFullCompletion: this.document.currentStatus === 'COMPLETED',
            isCurrentUser: this.matchesPerson(log.userId, performer, this.currentUser?.id, this.currentUser?.fullName),
          });
        }
      }
    }

    return items;
  });

  canEditPart(part: { isCurrentUser: boolean }): boolean {
    return Boolean(part.isCurrentUser);
  }

  startEditingPartInstruction(part: { id: string; routeId?: string; instruction: string; isCurrentUser?: boolean }): void {
    if (!this.canEditPart(part as any)) return;
    this.editingPartId.set(part.id);
    const text = part.instruction === 'Part completed without additional remarks.' ? '' : part.instruction;
    this.editingPartDraft.set(text);
  }

  cancelEditingPartInstruction(): void {
    this.editingPartId.set(null);
  }

  async savePartInstruction(part: { id: string; routeId?: string; isCurrentUser?: boolean }): Promise<void> {
    if (!this.canEditPart(part as any)) return;
    const text = this.editingPartDraft().trim();
    if (!text) return;
    this.isSavingFinalInstructions.set(true);
    try {
      await firstValueFrom(
        this.api.updateFinalInstructions(this.document.id, text, this.currentUser?.id, part.routeId),
      );
      this.document.finalInstructions = text;
      this.overrideFinalInstructions.set(text);

      const routes = [...(this.document.routes || [])];
      if (part.routeId) {
        const target = routes.find((r) => r.id === part.routeId);
        if (target) {
          target.remarks = `Handoff Instructions: ${text}`;
        }
      }
      this.document.routes = routes;
      this.editingPartId.set(null);
      this.saveInstructionSuccess.set(true);
      setTimeout(() => this.saveInstructionSuccess.set(false), 3000);
      this.docVersion.update((v) => v + 1);
    } catch (err) {
      console.error('Failed to update instruction', err);
      alert('Unable to save the instruction. Please try again.');
    } finally {
      this.isSavingFinalInstructions.set(false);
    }
  }

  completedHandoffs = computed(() => {
    return this.completedPartsList().map((item) => ({
      routeId: item.routeId || item.id,
      completedBy: item.completedBy,
      division: item.division,
      timestamp: item.timestamp,
      instruction: item.instruction,
      isCurrentUser: item.isCurrentUser,
    }));
  });

  recipientResponseFiles = computed(() => {
    const route = this.selectedRoute();
    if (!route) return [];
    const sharedIds = new Set(this.sharedDocumentFiles().map((f) => f.id || f.url || f.fileName));
    const files = [
      ...(route.attachments || []),
      ...(this.document.attachments || []).filter((f) => f.uploadedByUserId === route.toUserId),
      ...this.getHandlerActivitySubsteps(route).flatMap((a) => a.attachments || []),
      ...(this.getHandlerDecision(route)?.attachments || []),
    ];
    return [...new Map(files.filter((f) => !sharedIds.has(f.id || f.url || f.fileName)).map((f) => [f.id || f.url || f.fileName, f])).values()];
  });

  canAccessSelectedStepFiles = computed(() => {
    const route = this.selectedRoute();
    if (!route) return false;
    if (!this.currentUser) return false;

    // Administrators and Records Officers can view all step attachments
    if (
      this.currentUser.role === 'ADMIN' ||
      this.currentUser.role === 'SYSTEM_ADMIN' ||
      this.currentUser.role === 'ORD' ||
      this.currentUser.role === 'RECORDS_OFFICER' ||
      this.currentUser.divisionCode === 'ORD'
    ) {
      return true;
    }

    // Document creator can view
    if (this.matchesPerson(this.document.createdByUserId, this.document.createdBy, this.currentUser.id, this.currentUser.fullName)) {
      return true;
    }

    // Participants of this handoff / step (Sender or Recipient) can view
    if (this.isParticipantInStep(route)) {
      return true;
    }

    // Members of the recipient or sender division can view if assigned to their office
    if (
      this.currentUser.divisionCode &&
      (this.currentUser.divisionCode === route.toDivision || this.currentUser.divisionCode === route.fromDivision)
    ) {
      return true;
    }

    return false;
  });

  selectedStepFiles = computed<DocumentAttachment[]>(() => {
    const route = this.selectedRoute();
    if (!route) return [];

    // Keys of original document attachments (intake / document registration files that belong at the top "sa taas")
    const sharedKeys = new Set(
      this.sharedDocumentFiles().map((f) => String(f.id || f.url || f.fileName))
    );

    const files: DocumentAttachment[] = [];
    const seen = new Set<string>();

    const addFile = (f?: DocumentAttachment | null) => {
      if (!f) return;
      const key = String(f.id || f.url || f.fileName);
      if (!key) return;

      // Do NOT include original / shared document files here - they remain at the top
      if (sharedKeys.has(key)) return;
      if (isSharedDocumentFile(f, this.document, this.auditLogs)) return;

      if (!seen.has(key)) {
        seen.add(key);
        files.push(f);
      }
    };

    // 1. Files attached specifically when sending / replying to this route
    (route.attachments || []).forEach(addFile);

    // 2. Files uploaded specifically for this route or recipient scope
    (this.document.attachments || []).forEach((f) => {
      if (f.uploadedForRouteId === route.id) {
        addFile(f);
      } else if (
        f.attachmentScope === 'RECIPIENT' &&
        f.uploadedByUserId &&
        (f.uploadedByUserId === route.toUserId || f.uploadedByUserId === route.fromUserId)
      ) {
        addFile(f);
      }
    });

    // 3. Attachments from activities/substeps performed on this route
    this.getHandlerActivitySubsteps(route).forEach((act) => {
      (act.attachments || []).forEach(addFile);
    });

    // 4. Attachments from decision taken on this route
    const dec = this.getHandlerDecision(route);
    if (dec && dec.attachments) {
      dec.attachments.forEach(addFile);
    }

    return files;
  });

  finalReleaseRoute = computed(() => [...(this.document.routes || [])].reverse().find((r) => r.statusAfter === 'COMPLETED'));

  finalInstructionAuthor = computed(() => {
    this.docVersion();
    const instruction = this.finalHandoffInstructions().trim();
    const matchingAudit = [...this.docAuditLogs()]
      .filter((log) =>
        /Updated final instructions/i.test(log.details) &&
        (!instruction || log.details.includes(instruction)),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (matchingAudit) {
      return { userId: matchingAudit.userId, userName: matchingAudit.userName };
    }

    const finalRoute = this.finalReleaseRoute();
    return finalRoute
      ? { userId: finalRoute.fromUserId, userName: finalRoute.fromUser }
      : null;
  });

  completedAtOffice = computed(() => {
    const route = this.finalReleaseRoute();
    if (!route) return 'Office not recorded';
    const div = (route.fromUserId ? this.userDivisionMap().get(route.fromUserId) : undefined) || route.fromDivision;
    return div ? `${DIVISION_OFFICE_NAMES[div] || div} (${div})` : 'Office not recorded';
  });

  finalHandoffInstructions = computed(() => {
    if (this.document.currentStatus !== 'COMPLETED') {
      return '';
    }
    const override = this.overrideFinalInstructions();
    if (override !== null && override.trim()) {
      return override.trim();
    }
    if (this.document.finalInstructions?.trim()) {
      return this.document.finalInstructions.trim();
    }
    const route = this.finalReleaseRoute();
    const remarks = route?.remarks?.trim() || '';
    if (!remarks) {
      return 'Pickup location was not recorded. Contact the completing office for the next instruction.';
    }
    const handoffMatch = remarks.match(/Handoff Instructions:\s*(.*)$/is);
    if (handoffMatch?.[1]?.trim()) return handoffMatch[1].trim();

    const legacyPickup = remarks.match(/Pickup Location:\s*(.*?)(?:\s*\|\s*Next Action:|$)/is)?.[1]?.trim();
    const legacyNext = remarks.match(/Next Action:\s*(.*)$/is)?.[1]?.trim();
    if (legacyPickup || legacyNext) {
      const p = legacyPickup || 'Pickup location was not recorded.';
      const n = legacyNext || 'Contact the completing office for the next instruction.';
      return `${p} ${n}`.trim();
    }
    return remarks;
  });

  flowStepNumberMap = computed(() => {
    const map = new Map<string, string>();
    const record = (route: DocumentRouteStep, step: string) => {
      if (map.has(route.id)) return;
      map.set(route.id, step);
      this.getFlowNodeChildren(route.id).forEach((child, index) => record(child, `${step}.${index + 1}`));
    };
    this.flowRoots().forEach((root) => record(root, '1'));
    return map;
  });

  flowSummaryEvents = computed(() => {
    const sharedIds = new Set(this.sharedDocumentFiles().map((f) => f.id || f.url || f.fileName));
    return this.flowRecipients().map((route) => {
      const snapshot = this.getRecipientSnapshot(route);
      const activities = this.getHandlerActivitySubsteps(route);
      const decision = this.getHandlerDecision(route);
      return {
        route,
        snapshot,
        activities,
        decision,
        step: this.flowStepNumberMap().get(route.id) || String(route.stepNumber || 1),
        files: [
          ...new Map(
            [
              ...(route.attachments || []),
              ...(this.document.attachments || []).filter((f) => f.attachmentScope === 'RECIPIENT' && f.uploadedByUserId === route.toUserId && (!f.uploadedForRouteId || f.uploadedForRouteId === route.id)),
              ...activities.flatMap((a) => a.attachments || []),
              ...(decision?.attachments || []),
            ]
              .filter((f) => !sharedIds.has(f.id || f.url || f.fileName))
              .map((f) => [f.id || f.url || f.fileName, f]),
          ).values(),
        ],
        detailFields: [
          ['Office', route.toDivision],
          ['Requested action', route.actionRequested],
          ['Routing Notes', this.getFlowNodeRegularRemarks(route.id) || ''],
          ['Handoff Instructions', (this.document.currentStatus === 'COMPLETED' && (snapshot.ended || snapshot.status === 'Completed')) ? (this.getFlowNodeHandoffInstruction(route.id) || '') : ''],
          ['Decision', decision ? formatReadableStatus(getRouteDecision(decision)) : 'Pending'],
        ]
          .filter(([, value]) => value && !/^(N\/A|None)$/i.test(value))
          .map(([label, value]) => ({ label, value })),
      };
    });
  });

  formatDate = formatDate;
  formatReadableStatus = formatReadableStatus;
  displayRouteRemarks = displayRouteRemarks;
  getRouteDecision = getRouteDecision;
  isNoneRemark = (r?: string) => !r || /^(N\/A|None)$/i.test(r.trim());
  isPdfFile = (f: DocumentAttachment) => f.fileType === 'application/pdf' || f.fileName.toLowerCase().endsWith('.pdf');

  resolveUserName(userId?: string, legacyName?: string): string {
    if (userId) {
      const name = this.userMap().get(userId);
      if (name) return name;
    }
    return legacyName || '';
  }

  matchesPerson(firstId?: string, firstName?: string, secondId?: string, secondName?: string): boolean {
    if (firstId && secondId) return firstId === secondId;
    const first = this.resolveUserName(firstId, firstName).trim().toLowerCase();
    const second = this.resolveUserName(secondId, secondName).trim().toLowerCase();
    return Boolean(first && second && first === second);
  }

  private isSameDispatch(route: DocumentRouteStep, candidate: DocumentRouteStep): boolean {
    return !getRouteDecision(route) && !getRouteDecision(candidate) && candidate.createdAt === route.createdAt && candidate.fromUserId === route.fromUserId && candidate.routeNo === route.routeNo && candidate.actionRequested === route.actionRequested;
  }

  getRouteBatch(route: DocumentRouteStep): DocumentRouteStep[] {
    const batch = (this.document.routes || []).filter((c) => this.isSameDispatch(route, c));
    return batch.length > 0 ? batch : [route];
  }

  readonly flowNodeSnapshotsMap = computed(() => {
    this.docVersion();
    const map = new Map<string, any>();
    for (const route of this.flowRecipients()) {
      map.set(route.id, this.computeRecipientSnapshot(route));
    }
    return map;
  });

  getRecipientSnapshot(route: DocumentRouteStep) {
    const cached = this.flowNodeSnapshotsMap().get(route.id);
    if (cached) return cached;
    return this.computeRecipientSnapshot(route);
  }

  private computeRecipientSnapshot(route: DocumentRouteStep) {
    const decision = this.getHandlerDecision(route);
    const response = decision ? getRouteDecision(decision) : undefined;
    const activities = this.getHandlerActivitySubsteps(route);
    const latestActivity = [...activities].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).at(-1);
    const decisionIsLatest = decision && (!latestActivity || new Date(decision.createdAt).getTime() >= new Date(latestActivity.timestamp).getTime());
    const completedActivity = activities.find((a) => a.status === 'COMPLETED');
    const routeCompleted = route.statusAfter === 'COMPLETED';
    const ended = Boolean(completedActivity || routeCompleted);
    const status = ended ? 'Completed' : decisionIsLatest ? formatReadableStatus(response) : latestActivity?.destination ? 'Forwarded' : latestActivity ? 'Activity recorded' : 'No response recorded';
    return {
      route,
      status,
      response,
      ended,
      finalAction: completedActivity?.remarks || (routeCompleted ? route.remarks : undefined),
      progress: ended ? 2 : activities.length || decision ? 1 : 0,
      lastUpdated: completedActivity?.timestamp || (decisionIsLatest ? decision!.createdAt : latestActivity?.timestamp || route.processedAt || route.createdAt),
    };
  }

  readonly handlerDecisionsMap = computed(() => {
    this.docVersion();
    const map = new Map<string, DocumentRouteStep | undefined>();
    for (const route of this.flowRecipients()) {
      map.set(route.id, this.computeHandlerDecision(route));
    }
    return map;
  });

  getHandlerDecision(handlerRoute: DocumentRouteStep): DocumentRouteStep | undefined {
    const cached = this.handlerDecisionsMap().get(handlerRoute.id);
    if (cached !== undefined) return cached;
    return this.computeHandlerDecision(handlerRoute);
  }

  private computeHandlerDecision(handlerRoute: DocumentRouteStep): DocumentRouteStep | undefined {
    const savedDecision = this.getDecisionSubsteps(handlerRoute)
      .filter((d) => this.matchesPerson(d.fromUserId, d.fromUser, handlerRoute.toUserId, handlerRoute.toUser))
      .at(-1);

    const handlerName = this.resolveUserName(handlerRoute.toUserId, handlerRoute.toUser).trim().toLowerCase();
    const routeTime = new Date(handlerRoute.createdAt).getTime();

    const auditDecision = this.docAuditLogs()
      .filter(
        (log) =>
          (log.userId === handlerRoute.toUserId || log.userName.trim().toLowerCase() === handlerName) &&
          new Date(log.timestamp).getTime() >= routeTime &&
          /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .at(-1);
    if (!auditDecision) return savedDecision;

    const decision = auditDecision.details.match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]?.toUpperCase() as 'APPROVED' | 'DISAPPROVED';
    const auditRemarks =
      auditDecision.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] ||
      auditDecision.details.match(/Remarks:\s*(.*)$/i)?.[1] ||
      (decision === 'APPROVED' ? 'Approved; proceed with routing.' : 'No reason recorded.');
    const recoveredDecision = {
      ...handlerRoute,
      id: `audit-decision-${auditDecision.id}`,
      fromDivision: handlerRoute.toDivision,
      fromUserId: auditDecision.userId,
      fromUser: auditDecision.userName,
      actionRequested: decision,
      remarks: auditRemarks,
      statusAfter: decision === 'DISAPPROVED' ? 'RETURNED' : 'IN_PROGRESS',
      processedAt: auditDecision.timestamp,
      createdAt: auditDecision.timestamp,
    } satisfies DocumentRouteStep;
    if (!savedDecision) return recoveredDecision;
    return new Date(recoveredDecision.createdAt).getTime() > new Date(savedDecision.createdAt).getTime() ? recoveredDecision : savedDecision;
  }

  private getDecisionSubsteps(route: DocumentRouteStep) {
    const recipientIds = this.getRouteBatch(route).map((i) => i.toUserId).filter(Boolean);
    const recipientNames = this.getRouteBatch(route).map((i) => this.resolveUserName(i.toUserId, i.toUser).toLowerCase()).filter(Boolean);
    return (this.document.routes || []).filter(
      (c) =>
        Boolean(getRouteDecision(c)) &&
        new Date(c.createdAt).getTime() >= new Date(route.createdAt).getTime() &&
        (recipientIds.includes(c.fromUserId) || recipientNames.includes(this.resolveUserName(c.fromUserId, c.fromUser).toLowerCase())),
    );
  }

  readonly handlerActivitiesMap = computed(() => {
    this.docVersion();
    const map = new Map<string, any[]>();
    for (const route of this.flowRecipients()) {
      map.set(route.id, this.computeHandlerActivitySubsteps(route));
    }
    return map;
  });

  getHandlerActivitySubsteps(handlerRoute: DocumentRouteStep) {
    const cached = this.handlerActivitiesMap().get(handlerRoute.id);
    if (cached) return cached;
    return this.computeHandlerActivitySubsteps(handlerRoute);
  }

  private computeHandlerActivitySubsteps(handlerRoute: DocumentRouteStep) {
    const handlerId = handlerRoute.toUserId;
    const handlerName = this.resolveUserName(handlerRoute.toUserId, handlerRoute.toUser).trim().toLowerCase();
    const assignedAt = new Date(handlerRoute.createdAt).getTime();
    const routeActivities = (this.document.routes || [])
      .filter(
        (route) =>
          route.id !== handlerRoute.id &&
          !getRouteDecision(route) &&
          new Date(route.createdAt).getTime() > assignedAt &&
          this.matchesPerson(route.fromUserId, route.fromUser, handlerId, handlerName),
      )
      .map((route) => {
        const attachments = (route.attachments || []).filter(Boolean);
        const performerName = this.resolveUserName(route.fromUserId, route.fromUser) || handlerRoute.toUser || handlerRoute.toDivision || 'Unknown';
        const rawRemarks = route.remarks || '';
        const handoffMatch = rawRemarks.match(/Handoff Instructions:\s*(.*)$/is);
        const instruction = handoffMatch ? handoffMatch[1].trim() : '';
        const cleanedRemarks = displayRouteRemarks(route.remarks);
        return {
          id: route.id,
          performerId: route.fromUserId,
          action: route.actionRequested || route.actionTaken || 'Action completed',
          remarks: cleanedRemarks,
          instruction,
          performerName,
          performerDivision: route.fromDivision || handlerRoute.toDivision || '',
          timestamp: route.createdAt,
          status: route.statusAfter,
          destination: cleanRouteDestination(this.resolveUserName(route.toUserId, route.toUser) || route.toDivision),
          recipientId: route.toUserId,
          destinationDivision: route.toDivision,
          attachments,
        };
      });
    const auditActivities = this.docAuditLogs()
      .filter(
        (log) =>
          new Date(log.timestamp).getTime() > assignedAt &&
          this.matchesPerson(log.userId, log.userName, handlerId, handlerName) &&
          ['ROUTE_DOC', 'TRANSFER_DOC', 'UPDATE_STATUS', 'UPLOAD_ATTACHMENT'].includes(log.action) &&
          !/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details) &&
          !this.isSupersededByRemoval(log),
      )
      .map((log) => {
        const action = log.action === 'UPLOAD_ATTACHMENT' ? 'File uploaded' : log.details.match(/Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i)?.[1] || (log.action === 'TRANSFER_DOC' ? 'Transferred' : 'Action completed');
        const remarks = log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] || 'N/A';
        const status = log.details.match(/Status:\s*([^|]+)$/i)?.[1]?.trim() || '';
        const destination = cleanRouteDestination(log.details.match(/To:\s*(.*?)(?:\s*\|\s*(?:Assigned|Action):|$)/i)?.[1]);
        const recipientId = destination ? this.userNameToIdMap().get(destination.trim().toLowerCase()) : undefined;
        const performerName = this.resolveUserName(log.userId, log.userName) || log.userName || handlerRoute.toUser || handlerRoute.toDivision || 'Unknown';
        const handoffMatch = remarks.match(/Handoff Instructions:\s*(.*)$/is) || log.details.match(/Handoff Instructions:\s*(.*?)(?:\s*\||$)/is);
        const instruction = handoffMatch ? handoffMatch[1].trim() : '';
        return {
          id: `audit-activity-${log.id}`,
          performerId: log.userId,
          action,
          remarks,
          instruction,
          performerName,
          performerDivision: handlerRoute.toDivision || '',
          timestamp: log.timestamp,
          status,
          destination,
          recipientId,
          destinationDivision: '',
          attachments: (() => {
            return log.action === 'UPLOAD_ATTACHMENT'
              ? (this.document.attachments || []).filter(
                  (f) => f.fileName === log.details.match(/Uploaded file attachment "(.*?)"/)?.[1],
                )
              : [];
          })(),
        };
      })
      .filter(
        (audit) =>
          !routeActivities.some(
            (route) =>
              route.action.trim().toLowerCase() === audit.action.trim().toLowerCase() &&
              Math.abs(new Date(route.timestamp).getTime() - new Date(audit.timestamp).getTime()) < 5000,
          ),
      );
    return [...routeActivities, ...auditActivities].sort((a, b) => {
      const aComp = a.status === 'COMPLETED' ? 1 : 0;
      const bComp = b.status === 'COMPLETED' ? 1 : 0;
      if (aComp !== bComp) return bComp - aComp;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  selectFlowRecipient(id: string): void {
    this.selectedFlowRecipient.set(id);
    this.isEditingFinalInstructions.set(false);
  }

  scrollToFlow(): void {
    setTimeout(() => document.getElementById('document-routing-history')?.scrollIntoView({ block: 'start' }), 0);
  }

  handleClose = () => {
    if (this.viewingPdf()) {
      this.closePdfViewer();
      return;
    }
    if (this.isDecisionRequired() && this.onSnoozeClose) {
      this.onSnoozeClose();
    } else {
      this.onClose();
    }
  };

  handleSnoozeClose = (): void => {
    if (this.onSnoozeClose) {
      this.onSnoozeClose();
    } else {
      this.onClose();
    }
  };

  closePdfViewer(): void {
    const pdf = this.viewingPdf();
    if (pdf?.shouldRevoke) URL.revokeObjectURL(pdf.url);
    this.viewingPdf.set(null);
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.handleClose();
  }

  handleViewAttachment(file: DocumentAttachment): void {
    if (!file.url) return;
    try {
      const preview = this.createAttachmentObjectUrl(file.url);
      this.viewingPdf.set({
        url: preview.url,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(preview.url),
        name: file.fileName,
        shouldRevoke: preview.shouldRevoke,
      });
    } catch {
      alert('This attachment could not be opened. Please use Download instead.');
    }
  }

  handleDownloadAttachment(file: DocumentAttachment): void {
    if (!file.url) return;
    const download = this.createAttachmentObjectUrl(file.url);
    const link = document.createElement('a');
    link.href = download.url;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (download.shouldRevoke) window.setTimeout(() => URL.revokeObjectURL(download.url), 1_000);
  }

  handlePrintAttachment(url?: string): void {
    if (!url) return;
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.src = url;
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1000);
    };
    document.body.appendChild(frame);
  }

  async handleFileUpload(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    this.isUploading.set(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 7 * 1024 * 1024) throw new Error(`${file.name} exceeds the 7 MB attachment limit.`);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const storedFile = await firstValueFrom(this.api.uploadToStorage('documentAttachments', file));
        await firstValueFrom(
          this.api.attachFile(this.document.id, {
            fileName: file.name,
            fileSize: `${sizeMb} MB`,
            fileType: documentFileType(file),
            url: storedFile.url,
            fileData: storedFile.fileData,
            actingUserId: this.currentUser.id,
            actingUserName: this.currentUser.fullName,
            actingUserRole: this.currentUser.role,
          }),
        );
      }
      alert('Attachment uploaded successfully!');
      if (this.onRefreshDocument) await this.onRefreshDocument();
    } catch (err: any) {
      alert('Failed to upload file: ' + err.message);
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  startEditingFinalInstructions(): void {
    const route = this.selectedRoute();
    const current = (route ? this.getFlowNodeHandoffInstruction(route.id) : null) || this.finalHandoffInstructions();
    const isDefault =
      current === 'Pickup location was not recorded. Contact the completing office for the next instruction.' ||
      current.includes('Pickup location was not recorded.');
    this.finalInstructionsDraft.set(isDefault ? '' : current);
    this.isEditingFinalInstructions.set(true);
  }

  cancelEditingFinalInstructions(): void {
    this.isEditingFinalInstructions.set(false);
  }

  applyInstructionPreset(presetText: string): void {
    this.finalInstructionsDraft.set(presetText);
  }

  clearInstructionsDraft(): void {
    this.finalInstructionsDraft.set('');
  }

  async copyInstructionsToClipboard(customText?: string): Promise<void> {
    const route = this.selectedRoute();
    const text = customText || (route ? this.getFlowNodeHandoffInstruction(route.id) : null) || this.finalHandoffInstructions();
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      this.copiedInstructionFeedback.set(true);
      setTimeout(() => this.copiedInstructionFeedback.set(false), 2500);
    } catch {
      // ignore
    }
  }

  async saveFinalInstructions(): Promise<void> {
    const text = this.finalInstructionsDraft().trim();
    if (!text) return;
    const currentSelectedRoute = this.selectedRoute();
    const routeId = currentSelectedRoute?.id;
    this.isSavingFinalInstructions.set(true);
    try {
      await firstValueFrom(
        this.api.updateFinalInstructions(this.document.id, text, this.currentUser?.id, routeId),
      );
      this.document.finalInstructions = text;
      this.overrideFinalInstructions.set(text);

      const routes = [...(this.document.routes || [])];
      if (routeId) {
        const targetIndex = routes.findIndex((r) => r.id === routeId);
        if (targetIndex !== -1) {
          routes[targetIndex] = {
            ...routes[targetIndex],
            remarks: `Handoff Instructions: ${text}`,
          };
          this.document.routes = routes;
        }
      } else {
        const finalIndex = [...routes].reverse().findIndex((r) => r.statusAfter === 'COMPLETED');
        if (finalIndex !== -1) {
          const actualIndex = routes.length - 1 - finalIndex;
          routes[actualIndex] = {
            ...routes[actualIndex],
            remarks: `Handoff Instructions: ${text}`,
          };
          this.document.routes = routes;
        }
      }
      this.isEditingFinalInstructions.set(false);
      this.saveInstructionSuccess.set(true);
      setTimeout(() => this.saveInstructionSuccess.set(false), 3500);

      if (this.onRefreshDocument) {
        await this.onRefreshDocument();
      }
    } catch (err: any) {
      alert('Failed to save instruction: ' + (err.error?.error || err.message || 'Unknown error'));
    } finally {
      this.isSavingFinalInstructions.set(false);
    }
  }

  handleDelete(): void {
    if (!this.onDeleteDoc) return;
    this.onClose();
    void this.onDeleteDoc(this.document);
  }

  handlePrintSlip(): void {
    this.onClose();
    this.onPrintSlip(this.document);
  }

  handleOpenRouteDoc(): void {
    if (this.isDecisionRequired()) {
      alert('Action Required: You must take an action (Approve or Disapprove) on this document before you can proceed with routing.');
      return;
    }
    this.onClose();
    this.onOpenRouteDoc(this.document);
  }

  async handleApprove(): Promise<void> {
    if (this.isSubmittingDecision()) return;
    this.isSubmittingDecision.set(true);
    try {
      if (this.onDecision) {
        await this.onDecision(this.document, 'APPROVED');
      } else {
        await firstValueFrom(
          this.api.decideDocumentRoute(this.document.id, 'APPROVED', undefined, this.currentUser.id),
        );
      }
      if (this.onRefreshDocument) {
        await this.onRefreshDocument();
      }
      this.docVersion.update((v) => v + 1);
    } catch (err) {
      console.error('Failed to approve document', err);
      alert('Failed to record approval. Please try again.');
    } finally {
      this.isSubmittingDecision.set(false);
    }
  }

  async handleDisapprove(): Promise<void> {
    if (this.isSubmittingDecision()) return;
    if (this.onDecision) {
      this.isSubmittingDecision.set(true);
      try {
        await this.onDecision(this.document, 'DISAPPROVED');
        if (this.onRefreshDocument) {
          await this.onRefreshDocument();
        }
        this.docVersion.update((v) => v + 1);
      } catch (err) {
        console.error('Failed to disapprove document', err);
      } finally {
        this.isSubmittingDecision.set(false);
      }
    } else {
      const response = await showPrompt('Required: Explain why this document is disapproved:');
      const remarks = response?.trim() || '';
      if (!remarks) {
        alert('A disapproval remark is required.');
        return;
      }
      this.isSubmittingDecision.set(true);
      try {
        await firstValueFrom(
          this.api.decideDocumentRoute(this.document.id, 'DISAPPROVED', remarks, this.currentUser.id),
        );
        if (this.onRefreshDocument) {
          await this.onRefreshDocument();
        }
        this.docVersion.update((v) => v + 1);
      } catch (err) {
        console.error('Failed to record disapproval', err);
        alert('Failed to record disapproval. Please try again.');
      } finally {
        this.isSubmittingDecision.set(false);
      }
    }
  }

  canDeleteTransaction(): boolean {
    if (!this.currentUser) return false;
    const perm =
      this.currentUser.permissions ||
      DEFAULT_ROLE_PERMISSIONS[this.currentUser.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    return (
      this.currentUser.role === 'SYSTEM_ADMIN' ||
      Boolean(perm.canDelete) ||
      this.isDocumentCreator()
    );
  }

  isRemovingRoute = signal(false);

  canRemoveRoute(route?: DocumentRouteStep | null): boolean {
    if (!route || !this.currentUser) return false;
    if (route.id.startsWith('intake-') || route.stepNumber === 0) return false;
    if (this.document.currentStatus === 'COMPLETED') return false;

    const isRouteSender = this.matchesPerson(
      route.fromUserId,
      route.fromUser,
      this.currentUser.id,
      this.currentUser.fullName,
    );
    const isDocCreator = this.matchesPerson(
      this.document.createdByUserId,
      this.document.createdBy,
      this.currentUser.id,
      this.currentUser.fullName,
    );
    const isAdmin = this.currentUser.role === 'ADMIN' || this.currentUser.role === 'SYSTEM_ADMIN';
    const perm =
      this.currentUser.permissions ||
      DEFAULT_ROLE_PERMISSIONS[this.currentUser.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    const hasDeletePermission = Boolean(perm.canDelete);

    const isInitialRoute = route.stepNumber === 1 || !route.stepNumber;
    if (isInitialRoute) {
      return Boolean(isDocCreator || isAdmin || hasDeletePermission);
    }

    return Boolean(isRouteSender || isDocCreator || isAdmin || hasDeletePermission);
  }

  async handleRemoveRoute(event: Event, route: DocumentRouteStep): Promise<void> {
    event.stopPropagation();
    if (!this.canRemoveRoute(route)) return;

    const recipientName =
      this.resolveUserName(route.toUserId, route.toUser) ||
      route.toUser ||
      route.toDivision ||
      'this recipient';

    const isInitialRoute = route.stepNumber === 1 || !route.stepNumber;

    const confirmMessage = isInitialRoute
      ? `Are you sure you want to remove ${recipientName} from this transaction?\n\nSince this is the initial routing of a new document, the entire transaction will be cancelled and route number [${this.document.routeNo || this.document.trackingNumber}] will be freed up for reuse.`
      : `Are you sure you want to remove Step ${route.stepNumber} for ${recipientName}?\n\nOnly this routing transaction will be removed. The document, route number, and other routing steps will remain.`;

    const confirmed = await showConfirm(confirmMessage, {
      title: isInitialRoute ? 'Cancel new document route?' : `Remove routing Step ${route.stepNumber}?`,
      confirmLabel: isInitialRoute ? 'Cancel route & release number' : 'Remove this step',
      cancelLabel: 'Keep transaction',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.isRemovingRoute.set(true);
    try {
      const res = await firstValueFrom(
        this.api.removeDocumentRoute(this.document.id, route.id, this.currentUser?.id),
      );
      if (res?.deletedDocument) {
        this.ui.showSuccess(res?.message || 'Transaction and route number were completely removed and freed for reuse.');
        await this.state.refreshNotifications().catch(() => undefined);
        if (this.onRefreshDocument) {
          await this.onRefreshDocument();
        }
        if (this.onClose) {
          this.onClose();
        }
        return;
      }

      if (res?.document) {
        this.document = res.document;
      }
      if (this.onRefreshDocument) {
        await this.onRefreshDocument();
      }
      this.selectedFlowRecipient.set(null);
      this.docVersion.update((v) => v + 1);
      this.ui.showSuccess(res?.message || `Removed ${recipientName} from transaction.`);
    } catch (err: any) {
      console.error('Failed to remove recipient route', err);
      this.ui.showError(err?.message || err?.error?.error || 'Unable to remove this recipient from the transaction. Please try again.');
    } finally {
      this.isRemovingRoute.set(false);
    }
  }

  getFlowNodeButtonClass(id: string): string {
    const base =
      'block w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-all duration-150 dark:bg-slate-900';
    return this.selectedRoute()?.id === id
      ? `${base} border-blue-600 ring-2 ring-blue-600/25 shadow-lg shadow-blue-600/10 dark:border-blue-400 dark:ring-blue-400/25`
      : `${base} border-slate-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:hover:border-slate-500`;
  }

  getFlowNodeSnapshot(id: string) {
    const snap = this.flowNodeSnapshotsMap().get(id);
    if (snap) return snap;
    const route = this.flowRecipients().find((r) => r.id === id) || this.flowRecipients()[0];
    return route
      ? this.computeRecipientSnapshot(route)
      : {
          route: undefined as unknown as DocumentRouteStep,
          status: '',
          response: undefined as string | undefined,
          ended: false,
          finalAction: undefined as string | undefined,
          progress: 0,
          lastUpdated: '',
        };
  }

  getFlowNodeStepClass(id: string): string {
    const snap = this.getFlowNodeSnapshot(id);
    if (snap.ended) return 'bg-emerald-600 text-white';
    if (snap.response === 'DISAPPROVED') return 'bg-rose-600 text-white';
    if (snap.status === 'Forwarded' || snap.status === 'Activity recorded') return 'bg-blue-600 text-white';
    return 'bg-slate-700 text-slate-100';
  }

  getFlowNodeStatusLabel(id: string): string {
    const snap = this.getFlowNodeSnapshot(id);
    if (snap.response) return formatReadableStatus(snap.response);
    if (snap.status === 'No response recorded') return 'Pending';
    if (snap.status === 'Forwarded' || snap.status === 'Activity recorded') return snap.status;
    if (snap.ended) return 'Action recorded';
    return snap.status;
  }

  getFlowNodeStatusChipClass(id: string): string {
    const base = 'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ';
    const snap = this.getFlowNodeSnapshot(id);
    if (snap.response === 'APPROVED') return base + 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    if (snap.response === 'DISAPPROVED') return base + 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
    if (snap.status === 'Forwarded' || snap.status === 'Activity recorded') return base + 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (snap.ended) return base + 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    return base + 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }

  getFlowNodeProgress(id: string): { label: string; className: string }[] {
    const snap = this.getFlowNodeSnapshot(id);
    const labels = [
      'Received',
      snap.response === 'APPROVED' ? 'Approved' : snap.response === 'DISAPPROVED' ? 'Disapproved' : 'Action recorded',
      'Completed',
    ];
    return labels.map((label, index) => {
      let className = 'stage-pending';
      if (snap.ended) {
        if (index === 2) {
          className = 'stage-completed-green';
        } else {
          className = 'stage-passed-green';
        }
      } else if (index <= snap.progress) {
        if (index === 1 && snap.response === 'DISAPPROVED') {
          className = 'stage-disapproved-red';
        } else {
          className = 'stage-active-blue';
        }
      }
      return { label, className };
    });
  }

  getFlowNodeDisapproval(id: string): string {
    const snap = this.getFlowNodeSnapshot(id);
    const route = this.flowRecipients().find((r) => r.id === id);
    if (!route) return '';
    const decision = this.getHandlerDecision(route);
    if (snap.response === 'DISAPPROVED' && decision?.remarks && !/^(N\/A|None)$/i.test(decision.remarks.trim())) return displayRouteRemarks(decision.remarks);
    return '';
  }

  getFlowNodeRegularRemarks(id: string): string | null {
    const route = this.flowRecipients().find((r) => r.id === id);
    if (!route || !route.remarks) return null;
    const raw = route.remarks.trim();
    if (!raw || raw === 'N/A' || raw === 'None' || raw === 'Logged in BLGF Document Tracking System' || raw === 'Routed to all divisions during document logging') {
      return null;
    }

    if (/Handoff Instructions:/i.test(raw)) {
      const cleaned = raw.replace(/Handoff Instructions:\s*.*$/is, '').trim();
      return cleaned && cleaned !== 'N/A' && cleaned !== 'None' ? cleaned : null;
    }

    return raw;
  }

  readonly flowNodeHandoffInstructionsMap = computed(() => {
    this.docVersion();
    const map = new Map<string, string | null>();
    for (const route of this.flowRecipients()) {
      map.set(route.id, this.computeFlowNodeHandoffInstruction(route.id));
    }
    return map;
  });

  getFlowNodeHandoffInstruction(id: string): string | null {
    const cached = this.flowNodeHandoffInstructionsMap().get(id);
    if (cached !== undefined) return cached;
    return this.computeFlowNodeHandoffInstruction(id);
  }

  getFlowNodeInstructionAuthor(id: string): string {
    const route = this.flowRecipients().find((item) => item.id === id);
    if (!route) return 'Unknown personnel';
    const author = this.finalInstructionAuthor();
    if (author && this.matchesPerson(author.userId, author.userName, route.toUserId, route.toUser)) {
      return this.resolveUserName(author.userId, author.userName) || route.toDivision;
    }
    return this.resolveUserName(route.toUserId, route.toUser) || route.toDivision;
  }

  private computeFlowNodeHandoffInstruction(id: string): string | null {
    if (this.document.currentStatus !== 'COMPLETED') {
      return null;
    }

    const route = this.flowRecipients().find((r) => r.id === id);
    if (!route) return null;

    const instructionAuthor = this.finalInstructionAuthor();
    const isInstructionAuthor = Boolean(
      instructionAuthor &&
      this.matchesPerson(instructionAuthor.userId, instructionAuthor.userName, route.toUserId, route.toUser),
    );
    // Never attach a document-level instruction to a different recipient merely
    // because that recipient happens to be the last card in the flow.
    if (instructionAuthor && !isInstructionAuthor) {
      return null;
    }

    const snap = this.getFlowNodeSnapshot(id);
    if (!snap.ended && snap.status !== 'Completed') {
      const finalRoute = this.finalReleaseRoute();
      const isFinal = finalRoute && (this.matchesPerson(finalRoute.fromUserId, finalRoute.fromUser, route.toUserId, route.toUser) || finalRoute.id === route.id);
      if (!isFinal) return null;
    }

    // 1. Check if completed activity done by this recipient has Handoff Instructions
    const activities = this.getHandlerActivitySubsteps(route);
    const completedAct = [...activities].reverse().find((a) => a.status === 'COMPLETED' || /Handoff Instructions:/i.test(a.remarks));
    if (completedAct?.remarks) {
      const match = completedAct.remarks.match(/Handoff Instructions:\s*(.*)$/is);
      if (match?.[1]?.trim()) return match[1].trim();
      if (!/^(N\/A|None)$/i.test(completedAct.remarks.trim())) return completedAct.remarks.trim();
    }

    // 2. Check if route itself has Handoff Instructions and was completed
    if (route.remarks && /Handoff Instructions:/i.test(route.remarks) && (!instructionAuthor || isInstructionAuthor)) {
      const match = route.remarks.match(/Handoff Instructions:\s*(.*)$/is);
      if (match?.[1]?.trim()) return match[1].trim();
    }

    // 3. If this is the final release route handler or document is completed
    const finalRoute = this.finalReleaseRoute();
    if (isInstructionAuthor || (!instructionAuthor && finalRoute && this.matchesPerson(finalRoute.fromUserId, finalRoute.fromUser, route.toUserId, route.toUser))) {
      if (this.finalHandoffInstructions()) {
        return this.finalHandoffInstructions();
      }
    }

    // 4. Fallback if the route has finalAction or snapshot ended
    if (snap.finalAction) {
      const match = snap.finalAction.match(/Handoff Instructions:\s*(.*)$/is);
      if (match?.[1]?.trim()) return match[1].trim();
      if (!/^(N\/A|None)$/i.test(snap.finalAction.trim())) return snap.finalAction.trim();
    }

    return null;
  }

  canShowFlowNodeEnd(id: string): boolean {
    if (this.document.currentStatus !== 'COMPLETED') {
      return false;
    }
    // Cannot show end badge if this recipient forwarded to child recipients
    if (this.getFlowNodeChildren(id).length > 0) {
      return false;
    }
    const snap = this.getFlowNodeSnapshot(id);
    if (snap.ended || snap.status === 'Completed') {
      return true;
    }
    const finalRoute = this.finalReleaseRoute();
    if (finalRoute && finalRoute.id === id) {
      return true;
    }
    const recipients = this.flowRecipients();
    if (recipients.length > 0 && recipients[recipients.length - 1].id === id) {
      return true;
    }
    return false;
  }

  readonly flowChildrenMap = computed(() => {
    this.docVersion();
    const map = new Map<string, DocumentRouteStep[]>();
    const recipients = this.flowRecipients();
    for (const r of recipients) {
      map.set(r.id, []);
    }
    recipients.forEach((recipient) => {
      const parent = recipients
        .slice(0, recipients.indexOf(recipient))
        .reverse()
        .find((p) => this.matchesPerson(recipient.fromUserId, recipient.fromUser, p.toUserId, this.resolveUserName(p.toUserId, p.toUser)));
      if (parent) {
        const list = map.get(parent.id) || [];
        list.push(recipient);
        map.set(parent.id, list);
      }
    });
    return map;
  });

  getFlowNodeChildren(id: string): DocumentRouteStep[] {
    return this.flowChildrenMap().get(id) || [];
  }

  attachmentMeta(file: DocumentAttachment): string {
    return [file.fileSize, file.uploadDate ? formatDate(file.uploadDate) : ''].filter(Boolean).join(' - ');
  }

  private createAttachmentObjectUrl(url: string) {
    if (!url.startsWith('data:')) return { url, shouldRevoke: false };
    const [metadata, encodedData = ''] = url.split(',', 2);
    const mimeType = metadata.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream';
    const isBase64 = metadata.includes(';base64');
    const binary = isBase64 ? window.atob(encodedData) : decodeURIComponent(encodedData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { url: URL.createObjectURL(new Blob([bytes], { type: mimeType })), shouldRevoke: true };
  }
}
