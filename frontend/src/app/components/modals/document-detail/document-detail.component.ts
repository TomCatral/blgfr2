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
  User,
  DEFAULT_ROLE_PERMISSIONS,
  DivisionCode,
} from '../../../types';
import {
  STATUS_CONFIGS,
  PRIORITY_CONFIGS,
  formatDate,
} from '../../../utils/status-utils';
import { isDocumentParticipant } from '../../../utils/document-visibility';
import { isSharedDocumentFile } from '../../../utils/attachment-visibility';
import { documentFileType } from '../../../utils/document-files';
import { hasCompletedPart } from '../../../utils/routing-recipients';
import { ApiService } from '../../../services/api.service';

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
  PENDING: 'The assigned handler reviews the document and starts the requested action.',
  IN_PROGRESS: 'The handler records the work done, then forwards the document when ready.',
  FOR_SIGNATURE: 'The designated approver reviews the document for signature or a decision.',
  RETURNED: 'Review the return remarks and coordinate the requested corrections with the records handler.',
  ON_HOLD: 'Review the hold remarks and resolve the pending requirement before continuing.',
  COMPLETED: 'This transaction has ended. Follow the final handoff instructions below. No further routing is allowed.',
};

const TRANSACTION_STAGES = ['Received', 'Processing', 'For approval', 'Completed'];

const TRANSACTION_STAGE: Record<DocumentRecord['currentStatus'], number> = {
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

  viewingPdf = signal<{ url: string; name: string; shouldRevoke?: boolean } | null>(null);
  isUploading = signal(false);
  selectedFlowRecipient = signal<string | null>(null);
  flowFilterMode = signal<'ALL' | 'MY'>('ALL');
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] && this.document) {
      if (this.document.finalInstructions?.trim()) {
        this.overrideFinalInstructions.set(this.document.finalInstructions.trim());
      } else {
        this.overrideFinalInstructions.set(null);
      }
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

  isParticipantInStep(route: DocumentRouteStep): boolean {
    return (
      this.matchesPerson(route.fromUserId, route.fromUser, this.currentUser.id, this.currentUser.fullName) ||
      this.matchesPerson(route.toUserId, route.toUser, this.currentUser.id, this.currentUser.fullName) ||
      this.currentUser.divisionCode === route.toDivision ||
      this.currentUser.divisionCode === route.fromDivision
    );
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
    const routes = (this.document.routes || []).filter((r) => !getRouteDecision(r));
    if (routes.length === 0) {
      return [this.intakeRoute()];
    }
    return routes;
  });

  visibleRoutes = computed<DocumentRouteStep[]>(() => {
    const all = this.rawHistoryRoutes();
    if (this.flowFilterMode() === 'MY') {
      const filtered = all.filter((r) => this.isParticipantInStep(r));
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  });

  historyRoutes = this.visibleRoutes;

  flowRecipients = computed<DocumentRouteStep[]>(() => {
    return this.visibleRoutes();
  });

  flowRoots = computed<DocumentRouteStep[]>(() => {
    const recipients = this.flowRecipients();
    if (recipients.length === 0) return [this.intakeRoute()];
    const roots = recipients.filter((route, index) => {
      if (index === 0) return true;
      const hasParent = recipients
        .slice(0, index)
        .some((p) => this.matchesPerson(p.toUserId, p.toUser, route.fromUserId, route.fromUser));
      return !hasParent;
    });
    return roots.length > 0 ? roots : [recipients[0]];
  });

  firstDispatchSender = computed<string>(() => {
    // 1. Find the earliest non-decision route chronologically
    const allRoutes = [...(this.document.routes || [])]
      .filter((r) => !getRouteDecision(r))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const firstRoute = allRoutes[0];
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

    const docTrackingNos = new Set([this.document.trackingNumber, this.document.routeNo].filter(Boolean));
    this.auditLogs
      .filter((log) => docTrackingNos.has(log.documentTrackingNumber))
      .forEach((log) => {
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
            actorDivision: this.users.find((u) => u.id === log.userId)?.divisionCode,
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

  private pendingDecisionRouteSignal = computed(() =>
    [...(this.document.routes || [])]
      .reverse()
      .find(
        (route) =>
          !getRouteDecision(route) &&
          this.matchesPerson(route.toUserId, route.toUser, this.currentUser.id, this.currentUser.fullName) &&
          !this.getHandlerDecision(route),
      ),
  );

  pendingDecisionRoute = this.pendingDecisionRouteSignal;

  latestDocumentDecision = computed(() => {
    return [
      ...(this.document.routes || [])
        .map((route) => ({ status: getRouteDecision(route), timestamp: route.createdAt }))
        .filter((item) => item.status),
      ...this.auditLogs
        .filter((log) => log.documentTrackingNumber === this.document.trackingNumber && /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details))
        .map((log) => ({
          status: log.details.match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]?.toUpperCase() as 'APPROVED' | 'DISAPPROVED',
          timestamp: log.timestamp,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.status;
  });

  canRouteDocument = computed(() => {
    return (
      this.document.currentStatus !== 'COMPLETED' &&
      !hasCompletedPart(this.document, this.currentUser) &&
      this.document.currentStatus !== 'RETURNED' &&
      this.latestDocumentDecision() !== 'DISAPPROVED' &&
      !this.pendingDecisionRoute() &&
      this.isDocumentParticipant()
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
    const snap = this.getRecipientSnapshot(route);
    const isCompleted = snap.ended || snap.status === 'Completed';

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

    if (this.document.currentStatus === 'COMPLETED' && isCompleted) {
      const handoff = this.getFlowNodeHandoffInstruction(route.id);
      if (handoff) {
        fields.push({ label: 'Handoff Instructions', value: handoff });
      }
    }

    return fields.filter((field) => field.value && !/^(N\/A|None)$/i.test(field.value));
  });

  completedHandoffs = computed(() => {
    if (this.document.currentStatus !== 'COMPLETED') {
      return [];
    }
    const results: {
      routeId: string;
      completedBy: string;
      division: string;
      timestamp: string;
      instruction: string;
      isCurrentUser: boolean;
    }[] = [];
    const seen = new Set<string>();

    for (const recipient of this.flowRecipients()) {
      const instruction = this.getFlowNodeHandoffInstruction(recipient.id);
      if (instruction && !seen.has(instruction)) {
        seen.add(instruction);
        const snap = this.getFlowNodeSnapshot(recipient.id);
        const name = this.resolveUserName(recipient.toUserId, recipient.toUser) || recipient.toDivision;
        results.push({
          routeId: recipient.id,
          completedBy: name,
          division: recipient.toDivision,
          timestamp: snap.lastUpdated || recipient.createdAt,
          instruction,
          isCurrentUser: this.matchesPerson(recipient.toUserId, recipient.toUser, this.currentUser.id, this.currentUser.fullName),
        });
      }
    }

    return results;
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

  selectedStepFiles = computed<DocumentAttachment[]>(() => {
    const route = this.selectedRoute();
    if (!route) return [];
    const files: DocumentAttachment[] = [];
    const seen = new Set<string>();

    const addFile = (f?: DocumentAttachment | null) => {
      if (!f) return;
      const key = f.id || f.url || f.fileName;
      if (key && !seen.has(key)) {
        seen.add(key);
        files.push(f);
      }
    };

    (route.attachments || []).forEach(addFile);

    (this.document.attachments || []).forEach((f) => {
      if (f.uploadedForRouteId === route.id) addFile(f);
      else if (f.uploadedByUserId && (f.uploadedByUserId === route.toUserId || f.uploadedByUserId === route.fromUserId)) addFile(f);
    });

    this.getHandlerActivitySubsteps(route).forEach((act) => {
      (act.attachments || []).forEach(addFile);
    });

    const dec = this.getHandlerDecision(route);
    if (dec && dec.attachments) {
      dec.attachments.forEach(addFile);
    }

    (this.document.attachments || []).forEach(addFile);

    return files;
  });

  finalReleaseRoute = computed(() => [...(this.document.routes || [])].reverse().find((r) => r.statusAfter === 'COMPLETED'));

  completedAtOffice = computed(() => {
    const route = this.finalReleaseRoute();
    if (!route) return 'Office not recorded';
    const user = this.users.find((u) => u.id === route.fromUserId);
    const div = user?.divisionCode || route.fromDivision;
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
    return this.users.find((u) => u.id === userId)?.fullName || legacyName || '';
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

  getRecipientSnapshot(route: DocumentRouteStep) {
    const decision = this.getHandlerDecision(route);
    const response = decision ? getRouteDecision(decision) : undefined;
    const activities = this.getHandlerActivitySubsteps(route);
    const latestActivity = activities.at(-1);
    const decisionIsLatest = decision && (!latestActivity || new Date(decision.createdAt).getTime() >= new Date(latestActivity.timestamp).getTime());
    const completedActivity = [...activities].reverse().find((a) => a.status === 'COMPLETED');
    const ended = Boolean(completedActivity);
    const status = ended ? 'Completed' : decisionIsLatest ? formatReadableStatus(response) : latestActivity?.destination ? 'Forwarded' : latestActivity ? 'Activity recorded' : 'No response recorded';
    return {
      route,
      status,
      response,
      ended,
      finalAction: completedActivity?.remarks,
      progress: ended ? 2 : activities.length || decision ? 1 : 0,
      lastUpdated: completedActivity?.timestamp || (decisionIsLatest ? decision!.createdAt : latestActivity?.timestamp || route.createdAt),
    };
  }

  getHandlerDecision(handlerRoute: DocumentRouteStep) {
    const savedDecision = this.getDecisionSubsteps(handlerRoute)
      .filter((d) => this.matchesPerson(d.fromUserId, d.fromUser, handlerRoute.toUserId, handlerRoute.toUser))
      .at(-1);

    const auditDecision = this.auditLogs
      .filter(
        (log) =>
          [this.document.trackingNumber, this.document.routeNo].includes(log.documentTrackingNumber) &&
          (log.userId === handlerRoute.toUserId || log.userName.trim().toLowerCase() === this.resolveUserName(handlerRoute.toUserId, handlerRoute.toUser).trim().toLowerCase()) &&
          new Date(log.timestamp).getTime() >= new Date(handlerRoute.createdAt).getTime() &&
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

  getHandlerActivitySubsteps(handlerRoute: DocumentRouteStep) {
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
        let attachments = (route.attachments || []).filter(Boolean);
        if (!attachments.length && (this.document.attachments || []).length > 0) {
          const mentionsAttach = /attach|attached|attachment|file/i.test(route.remarks || '');
          if (mentionsAttach) {
            attachments = this.document.attachments || [];
          }
        }
        return {
          id: route.id,
          action: route.actionRequested || route.actionTaken || 'Action completed',
          remarks: displayRouteRemarks(route.remarks),
          timestamp: route.createdAt,
          status: route.statusAfter,
          destination: cleanRouteDestination(this.resolveUserName(route.toUserId, route.toUser) || route.toDivision),
          recipientId: route.toUserId,
          destinationDivision: route.toDivision,
          attachments,
        };
      });
    const auditActivities = this.auditLogs
      .filter(
        (log) =>
          log.documentTrackingNumber === this.document.trackingNumber &&
          new Date(log.timestamp).getTime() > assignedAt &&
          this.matchesPerson(log.userId, log.userName, handlerId, handlerName) &&
          ['ROUTE_DOC', 'TRANSFER_DOC', 'UPDATE_STATUS', 'UPLOAD_ATTACHMENT'].includes(log.action) &&
          !/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
      )
      .map((log) => {
        const action = log.action === 'UPLOAD_ATTACHMENT' ? 'File uploaded' : log.details.match(/Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i)?.[1] || (log.action === 'TRANSFER_DOC' ? 'Transferred' : 'Action completed');
        const remarks = log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] || 'N/A';
        const status = log.details.match(/Status:\s*([^|]+)$/i)?.[1]?.trim() || '';
        const destination = cleanRouteDestination(log.details.match(/To:\s*(.*?)(?:\s*\|\s*(?:Assigned|Action):|$)/i)?.[1]);
        const recipient = this.users.find((u) => u.fullName.trim().toLowerCase() === destination.trim().toLowerCase());
        return {
          id: `audit-activity-${log.id}`,
          action,
          remarks,
          timestamp: log.timestamp,
          status,
          destination,
          recipientId: recipient?.id,
          destinationDivision: '',
          attachments: (() => {
            let atts = log.action === 'UPLOAD_ATTACHMENT' ? (this.document.attachments || []).filter((f) => f.fileName === log.details.match(/Uploaded file attachment "(.*?)"/)?.[1]) : [];
            if (!atts.length && /attach|attached|attachment|file/i.test(remarks) && (this.document.attachments || []).length > 0) {
              atts = this.document.attachments || [];
            }
            return atts;
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
    return [...routeActivities, ...auditActivities].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  selectFlowRecipient(id: string): void {
    this.selectedFlowRecipient.set(id);
  }

  scrollToFlow(): void {
    setTimeout(() => document.getElementById('document-routing-history')?.scrollIntoView({ block: 'start' }), 0);
  }

  handleClose = () => {
    if (this.viewingPdf()) {
      this.closePdfViewer();
    } else {
      this.onClose();
    }
  };

  closePdfViewer(): void {
    const pdf = this.viewingPdf();
    if (pdf?.shouldRevoke) URL.revokeObjectURL(pdf.url);
    this.viewingPdf.set(null);
  }

  openPdfInNewTab(): void {
    const pdf = this.viewingPdf();
    if (pdf) window.open(pdf.url, '_blank', 'noopener,noreferrer');
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.handleClose();
  }

  safePdfUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  handleViewAttachment(file: DocumentAttachment): void {
    if (!file.url) return;
    const isPreviewable = file.fileType === 'application/pdf' || file.fileType === 'image/jpeg' || file.fileType === 'image/png' || file.fileName.toLowerCase().endsWith('.pdf') || file.fileName.toLowerCase().endsWith('.jpg') || file.fileName.toLowerCase().endsWith('.jpeg') || file.fileName.toLowerCase().endsWith('.png');
    try {
      const preview = this.createAttachmentObjectUrl(file.url);
      if (isPreviewable) {
        this.viewingPdf.set({ url: preview.url, name: file.fileName, shouldRevoke: preview.shouldRevoke });
        return;
      }
      const w = window.open(preview.url, '_blank', 'noopener,noreferrer');
      if (!w) {
        if (preview.shouldRevoke) URL.revokeObjectURL(preview.url);
        alert('Please allow pop-ups to view this attachment.');
        return;
      }
      w.location.replace(preview.url);
      if (preview.shouldRevoke) window.setTimeout(() => URL.revokeObjectURL(preview.url), 60_000);
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
    const current = this.finalHandoffInstructions();
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

  async copyInstructionsToClipboard(): Promise<void> {
    const text = this.finalHandoffInstructions();
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
    this.isSavingFinalInstructions.set(true);
    try {
      await firstValueFrom(
        this.api.updateFinalInstructions(this.document.id, text, this.currentUser?.id),
      );
      this.document.finalInstructions = text;
      this.overrideFinalInstructions.set(text);

      const routes = [...(this.document.routes || [])];
      const finalIndex = [...routes].reverse().findIndex((r) => r.statusAfter === 'COMPLETED');
      if (finalIndex !== -1) {
        const actualIndex = routes.length - 1 - finalIndex;
        routes[actualIndex] = {
          ...routes[actualIndex],
          remarks: `Handoff Instructions: ${text}`,
        };
        this.document.routes = routes;
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
    this.onClose();
    this.onOpenRouteDoc(this.document);
  }

  getFlowNodeButtonClass(id: string): string {
    const base =
      'block w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-all duration-150 dark:bg-slate-900';
    return this.selectedRoute()?.id === id
      ? `${base} border-blue-600 ring-2 ring-blue-600/25 shadow-lg shadow-blue-600/10 dark:border-blue-400 dark:ring-blue-400/25`
      : `${base} border-slate-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:hover:border-slate-500`;
  }

  getFlowNodeSnapshot(id: string) {
    const route = this.flowRecipients().find((r) => r.id === id) || this.flowRecipients()[0];
    return route
      ? this.getRecipientSnapshot(route)
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
    if (snap.ended) return 'Completed';
    if (snap.response) return formatReadableStatus(snap.response);
    if (snap.status === 'No response recorded') return 'Pending';
    return snap.status;
  }

  getFlowNodeStatusChipClass(id: string): string {
    const base = 'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ';
    const snap = this.getFlowNodeSnapshot(id);
    if (snap.ended || snap.response === 'APPROVED') return base + 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    if (snap.response === 'DISAPPROVED') return base + 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
    if (snap.status === 'Forwarded' || snap.status === 'Activity recorded') return base + 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    return base + 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }

  getFlowNodeProgress(id: string): { label: string; className: string }[] {
    const base = 'border-t-[3px] rounded-md pt-1.5 ';
    const snap = this.getFlowNodeSnapshot(id);
    const labels = ['Received', snap.response === 'APPROVED' ? 'Approved' : snap.response === 'DISAPPROVED' ? 'Disapproved' : 'Action recorded', 'Completed'];
    return labels.map((label, index) => ({
      label,
      className:
        index <= snap.progress
          ? snap.ended
            ? base + 'border-emerald-500 text-slate-900 dark:text-white'
            : base + 'border-blue-500 text-slate-900 dark:text-white'
          : base + 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400',
    }));
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

  getFlowNodeHandoffInstruction(id: string): string | null {
    // Only show instruction when the entire document transaction is completed!
    if (this.document.currentStatus !== 'COMPLETED') {
      return null;
    }

    const route = this.flowRecipients().find((r) => r.id === id);
    if (!route) return null;

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
    if (route.remarks && /Handoff Instructions:/i.test(route.remarks)) {
      const match = route.remarks.match(/Handoff Instructions:\s*(.*)$/is);
      if (match?.[1]?.trim()) return match[1].trim();
    }

    // 3. If this is the final release route handler or document is completed
    const finalRoute = this.finalReleaseRoute();
    if (finalRoute && (this.matchesPerson(finalRoute.fromUserId, finalRoute.fromUser, route.toUserId, route.toUser) || finalRoute.id === route.id)) {
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

  getFlowNodeChildren(id: string): DocumentRouteStep[] {
    const results: DocumentRouteStep[] = [];
    const recipients = this.flowRecipients();
    recipients.forEach((recipient) => {
      const parent = recipients
        .slice(0, recipients.indexOf(recipient))
        .reverse()
        .find((p) => this.matchesPerson(recipient.fromUserId, recipient.fromUser, p.toUserId, this.resolveUserName(p.toUserId, p.toUser)));
      if (parent?.id === id) results.push(recipient);
    });
    return results;
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
