import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { IonApp, IonContent } from '@ionic/angular/standalone';

import { ClsPipe } from './shared/cls.pipe';
import { ApiService } from './services/api.service';
import { SessionService } from './services/session.service';
import { StateService } from './services/state.service';
import { UiService } from './services/ui.service';
import { showConfirm, showPrompt } from './services/dialog.service';
import { isDocumentParticipant } from './utils/document-visibility';
import { isSharedDocumentFile } from './utils/attachment-visibility';
import { isRoutingPopupSnoozed, routingPopupSnoozeKey } from './utils/routing-popup-snooze';
import {
  DEFAULT_ROLE_PERMISSIONS,
  DocumentAttachment,
  DocumentRecord,
  Division,
  NotificationItem,
  RolePermission,
  User,
} from './types';

import { HeaderComponent } from './components/shell/header.component';
import { SidebarComponent } from './components/shell/sidebar.component';
import { NotificationDrawerComponent } from './components/shell/notification-drawer.component';
import { LoginComponent } from './components/modals/login.component';
import { AppDialogHostComponent } from './components/ui/app-dialog-host.component';
import { GlobalInputAutocompleteComponent } from './components/ui/global-input-autocomplete.component';
import { AppModalLayerComponent } from './components/ui/modal-layer.component';

import { DashboardComponent } from './components/pages/dashboard/dashboard.component';
import { RoutingFollowUpComponent } from './components/pages/routing-follow-up/routing-follow-up.component';
import { IncomingReportComponent } from './components/pages/reports/incoming-report.component';
import { OutgoingReportComponent } from './components/pages/reports/outgoing-report.component';
import { EnvelopeReportComponent } from './components/pages/reports/envelope-report.component';
import { DocumentListComponent } from './components/pages/document-list/document-list.component';
import { DocumentSlipComponent } from './components/pages/document-slip/document-slip.component';
import { OutgoingEnvelopeComponent } from './components/pages/outgoing-envelope/outgoing-envelope.component';
import { QRCodeGeneratorComponent } from './components/pages/qr-code-generator/qr-code-generator.component';
import { EmployeeProfilesComponent } from './components/pages/employee-profiles/employee-profiles.component';
import { AuditLogsComponent } from './components/pages/audit-logs/audit-logs.component';
import { UserSettingsComponent } from './components/pages/user-settings/user-settings.component';
import { UserManagementComponent } from './components/pages/user-management/user-management.component';

import { DocumentDetailComponent } from './components/modals/document-detail/document-detail.component';
import { CreateDocumentComponent } from './components/modals/create-document/create-document.component';
import { RouteDocumentComponent } from './components/modals/route-document/route-document.component';

type PopupAction = {
  id: string;
  userId: string;
  title: string;
  message: string;
  documentId: string;
  trackingNumber: string;
  type: 'ACTION_REQUIRED';
  requiresDecision: boolean;
  createdAt: string;
  reminderSenderName?: string;
  reminderActionRequested?: string;
  decisionStatus?: 'APPROVED' | 'DISAPPROVED';
};

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {
    class: 'app-root',
    '[class.dark]': 'isDarkMode()',
  },
  imports: [
    IonApp,
    IonContent,
    DatePipe,
    NgClass,
    ClsPipe,
    HeaderComponent,
    SidebarComponent,
    NotificationDrawerComponent,
    LoginComponent,
    AppDialogHostComponent,
    GlobalInputAutocompleteComponent,
    AppModalLayerComponent,
    DashboardComponent,
    RoutingFollowUpComponent,
    IncomingReportComponent,
    OutgoingReportComponent,
    EnvelopeReportComponent,
    DocumentListComponent,
    DocumentSlipComponent,
    OutgoingEnvelopeComponent,
    QRCodeGeneratorComponent,
    EmployeeProfilesComponent,
    AuditLogsComponent,
    UserSettingsComponent,
    UserManagementComponent,
    DocumentDetailComponent,
    CreateDocumentComponent,
    RouteDocumentComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  session = inject(SessionService);
  state = inject(StateService);
  private ui = inject(UiService);

  currentUser = this.session.currentUser;
  isDarkMode = this.session.isDarkMode;

  readonly activeView = signal<string>('dashboard');
  readonly searchQuery = signal<string>('');
  readonly isSidebarCollapsed = signal(false);
  readonly isMobileSidebarOpen = signal(false);

  readonly selectedDoc = signal<DocumentRecord | null>(null);
  readonly fullFlowDocumentId = signal<string | null>(null);
  readonly routeModalDoc = signal<DocumentRecord | null>(null);
  readonly isCreateModalOpen = signal(false);
  readonly isNotifDrawerOpen = signal(false);
  readonly routingPopup = signal<PopupAction | null>(null);
  readonly reminderPopup = signal<NotificationItem | null>(null);
  readonly decisionSubmittingId = signal<string | null>(null);
  readonly targetDatePopup = signal<DocumentRecord | null>(null);
  readonly slipSelectedDoc = signal<DocumentRecord | null>(null);

  private closedApprovalPopupIds = new Map<string, number>();
  private closedReminderPopupIds = new Set<string>();
  private routingSnoozeTick = signal(0);
  private nativeAlert = window.alert;
  private listeners: Array<() => void> = [];
  private targetDateInterval: number | null = null;
  private snoozeInterval: number | null = null;

  readonly accessibleDocuments = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    const all = this.state.documents();
    const permissions =
      user.permissions ||
      DEFAULT_ROLE_PERMISSIONS[user.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF;
    if (user.role === 'SYSTEM_ADMIN' || permissions.canViewAllDocuments) {
      return all;
    }
    return all.filter((document) =>
      isDocumentParticipant(document, user, this.state.auditLogs()),
    );
  });

  readonly showingStartupState = computed(
    () => !this.session.isOnline() || !this.session.isDataLoaded(),
  );

  readonly existingRouteNumbers = computed(() =>
    this.state
      .documents()
      .map((document) => document.routeNo)
      .filter((routeNo): routeNo is string => Boolean(routeNo)),
  );

  readonly userPendingCount = computed(() => {
    const user = this.currentUser();
    if (!user) return 0;
    return this.state
      .documents()
      .filter((document) => {
        if (document.currentStatus !== 'PENDING') return false;
        if (document.assignedUserId === user.id) return true;
        const latestRouteTime = document.routes?.at(-1)?.createdAt;
        return Boolean(
          latestRouteTime &&
            document.routes
              .filter((route) => route.createdAt === latestRouteTime)
              .some((route) => route.toUserId === user.id),
        );
      }).length;
  });

  readonly routingPopupDocument = computed(() => {
    const popup = this.routingPopup();
    if (!popup) return undefined;
    return this.accessibleDocuments().find(
      (document) =>
        document.id === popup.documentId ||
        document.routeNo === popup.trackingNumber,
    );
  });

  readonly routingPopupRoute = computed(() => {
    const user = this.currentUser();
    const doc = this.routingPopupDocument();
    if (!user || !doc) return undefined;
    return [...(doc.routes || [])]
      .filter(
        (route) =>
          route.toUserId === user.id &&
          !/^(APPROVED|DISAPPROVED)$/i.test(route.actionRequested?.trim() || ''),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
          b.stepNumber - a.stepNumber,
      )[0];
  });

  readonly routingPopupForwardedAt = computed(() => {
    const route = this.routingPopupRoute();
    const timestamp = route?.createdAt ? new Date(route.createdAt) : null;
    if (!timestamp || Number.isNaN(timestamp.getTime())) return undefined;
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(timestamp);
  });

  readonly routingPopupForwardedBy = computed(() => {
    const route = this.routingPopupRoute();
    if (!route) return undefined;
    return (
      this.state.users().find((user) => user.id === route.fromUserId)
        ?.fullName || route.fromUser
    );
  });

  readonly routingPopupRouteFromDivision = computed(
    () => this.routingPopupRoute()?.fromDivision,
  );

  readonly routingPopupAttachments = computed(() => {
    const doc = this.routingPopupDocument();
    if (!doc) return [];
    return (doc.attachments || []).filter((file) =>
      isSharedDocumentFile(file, doc, this.state.auditLogs()),
    );
  });

  constructor() {
    effect(() => {
      this.syncReminderPopup();
      this.checkTargetDates();
      this.syncRoutingPopup();
    });
    this.syncTargetDatePopup();
  }

  ngOnInit(): void {
    this.nativeAlert = window.alert;
    window.alert = (message?: unknown): void => {
      this.ui.showError(String(message ?? ''));
    };

    const onOnline = (): void => {
      this.session.isOnline.set(true);
      if (this.currentUser()) void this.loadBackendData();
    };
    const onOffline = (): void => this.session.isOnline.set(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    this.listeners.push(
      () => window.removeEventListener('online', onOnline),
      () => window.removeEventListener('offline', onOffline),
    );

    const onStorage = (): void => this.routingSnoozeTick.update((value) => value + 1);
    this.snoozeInterval = window.setInterval(
      () => this.routingSnoozeTick.update((value) => value + 1),
      30000,
    );
    window.addEventListener('storage', onStorage);
    this.listeners.push(() => {
      window.clearInterval(this.snoozeInterval!);
      window.removeEventListener('storage', onStorage);
    });

    void this.initializeSession();
  }

  ngOnDestroy(): void {
    window.alert = this.nativeAlert;
    this.listeners.forEach((remove) => remove());
    if (this.targetDateInterval !== null) window.clearInterval(this.targetDateInterval);
    this.state.stopPolling();
    this.state.notifications.set([]);
  }

  private async initializeSession(): Promise<void> {
    if (this.currentUser()) {
      void this.loadBackendData();
      this.state.startPolling();
      void this.state.refreshNotifications();
      return;
    }
    const savedUserId = this.session.persistedUserId();
    if (!savedUserId) {
      this.session.markDataLoaded();
      return;
    }
    try {
      const savedUsers = await firstValueFrom(this.api.getUsers());
      const savedUser = savedUsers.find(
        (user) => user.id === savedUserId && user.active,
      );
      if (savedUser) {
        this.state.users.set(savedUsers);
        this.session.login(savedUser);
        void this.loadBackendData();
        this.state.startPolling();
        void this.state.refreshNotifications();
      } else {
        localStorage.removeItem('blgf_current_user');
        sessionStorage.removeItem('blgf_current_user');
      }
    } catch {
      localStorage.removeItem('blgf_current_user');
      sessionStorage.removeItem('blgf_current_user');
    } finally {
      this.session.markDataLoaded();
    }
  }

  loadBackendData = async (): Promise<void> => {
    await this.state.loadAll();
    const current = this.selectedDoc();
    if (current) {
      const refreshed = this.state.documents().find((d) => d.id === current.id);
      if (refreshed) {
        this.selectedDoc.set(refreshed);
      }
    }
  };

  effectivePermissions(): RolePermission {
    const user = this.currentUser();
    if (!user) return DEFAULT_ROLE_PERMISSIONS.STAFF;
    return (
      user.permissions ||
      DEFAULT_ROLE_PERMISSIONS[user.role] ||
      DEFAULT_ROLE_PERMISSIONS.STAFF
    );
  }

  canViewSlip(): boolean {
    return this.effectivePermissions().allowedViews.includes('slip');
  }

  handleSearchDoc(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;
    this.searchQuery.set(trimmed);
    const q = trimmed.toUpperCase();

    const exactMatch = this.accessibleDocuments().find((doc) => {
      const routeNo = (doc.routeNo || '').trim().toUpperCase();
      const tracking = (doc.trackingNumber || '').trim().toUpperCase();
      return routeNo === q || tracking === q;
    });

    if (exactMatch) {
      this.openDetailFromHeader(exactMatch);
      this.activeView.set(exactMatch.direction === 'OUTGOING' ? 'outgoing' : 'incoming');
      return;
    }

    this.activeView.set(
      q.includes('OUT') || /^BLGFR2-\d{4}-\d{2}-OUT-\d+/i.test(trimmed)
        ? 'outgoing'
        : 'incoming',
    );
  }

  openDetailFromHeader(doc: DocumentRecord): void {
    if (doc.routeNo || doc.trackingNumber) {
      this.searchQuery.set(doc.routeNo || doc.trackingNumber);
    }
    this.fullFlowDocumentId.set(doc.id);
    this.selectedDoc.set(doc);
  }

  openDetail = (doc: DocumentRecord): void => {
    this.selectedDoc.set(doc);
  };

  openCreate = (): void => this.isCreateModalOpen.set(true);

  openRoute = (doc: DocumentRecord): void => this.routeModalDoc.set(doc);

  closeCreate = (): void => this.isCreateModalOpen.set(false);

  closeRoute = (): void => this.routeModalDoc.set(null);

  closeDetail = (): void => {
    this.selectedDoc.set(null);
    this.fullFlowDocumentId.set(null);
  };

  printSlip = (doc: DocumentRecord): void => {
    this.slipSelectedDoc.set(doc);
    this.activeView.set('slip');
  };

  printSlipFromDetail = (doc: DocumentRecord): void => {
    this.selectedDoc.set(null);
    this.fullFlowDocumentId.set(null);
    this.slipSelectedDoc.set(doc);
    this.activeView.set('slip');
  };

  setSlipDoc = (doc: DocumentRecord): void => this.slipSelectedDoc.set(doc);

  clearSearch = (): void => this.searchQuery.set('');

  backToIncoming = (): void => this.activeView.set('incoming');

  backToOutgoing = (): void => this.activeView.set('outgoing');

  navigateTo = (view: string): void => {
    this.searchQuery.set('');
    this.activeView.set(view);
  };

  toggleCollapse = (): void =>
    this.isSidebarCollapsed.update((collapsed) => !collapsed);

  openMobileSidebar = (): void => {
    this.isSidebarCollapsed.set(false);
    this.isMobileSidebarOpen.set(true);
  };

  stop(event: Event): void {
    event.stopPropagation();
  }

  selectDocByTrackingNo(trackingNo: string): void {
    const found = this.accessibleDocuments().find(
      (document) => document.routeNo === trackingNo,
    );
    if (found) this.selectedDoc.set(found);
  }

  // ===== Login / Logout =====

  handleLogin = (user: User): void => {
    this.session.login(user);
  };

  handleLogout(): void {
    this.session.logout();
    this.activeView.set('dashboard');
    this.selectedDoc.set(null);
    this.fullFlowDocumentId.set(null);
    this.routeModalDoc.set(null);
    this.slipSelectedDoc.set(null);
    this.searchQuery.set('');
    this.state.notifications.set([]);
  }

  // ===== Document handlers =====

  createDocument = async (formData: Record<string, unknown>): Promise<void> => {
    const actingUser = this.currentUser();
    if (!actingUser) {
      alert('Your session has ended. Please sign in again.');
      return;
    }
    try {
      const shouldRoute = formData['shouldRouteModal'] as boolean;
      const shouldPrint = formData['shouldPrintSlip'] as boolean;
      delete formData['shouldPrintSlip'];
      delete formData['shouldRouteModal'];

      let created: DocumentRecord | undefined;
      let candidateRouteNo = String(formData['routeNo'] || '');
      for (let attempt = 0; attempt < 1000; attempt += 1) {
        try {
          created = await firstValueFrom(this.api.createDocument({
            ...formData,
            routeNo: candidateRouteNo,
          }));
          break;
        } catch (error: unknown) {
          const message = String((error as Error)?.message || '');
          if (!/duplicate|already assigned|already used|no longer available/i.test(message)) {
            throw error;
          }
          const serverSuggestion = message.match(
            /next (?:number )?is\s+(BLGFR2-\d{4}-\d{2}-(?:IN|OUT)-\d+)/i,
          )?.[1];
          if (serverSuggestion && serverSuggestion !== candidateRouteNo) {
            candidateRouteNo = serverSuggestion;
            continue;
          }
          try {
            const latest = await firstValueFrom(this.api.getNextRouteNumber(
              formData['direction'] as string,
            ));
            if (latest.routeNo && latest.routeNo !== candidateRouteNo) {
              candidateRouteNo = latest.routeNo;
              continue;
            }
          } catch {
            // Older API versions do not expose the next-number endpoint.
          }
          const match = candidateRouteNo.match(/^(.*-)(\d+)$/);
          if (!match) throw error;
          candidateRouteNo = `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, '0')}`;
        }
      }
      if (!created) {
        throw new Error('Unable to allocate an available Document Route No.');
      }
      formData['routeNo'] = created.routeNo || candidateRouteNo;
      this.state.prependDocument(created);
      await this.loadBackendData();

      if (shouldPrint) {
        this.slipSelectedDoc.set(created);
        this.activeView.set('slip');
      } else if (shouldRoute) {
        this.routeModalDoc.set(created);
      } else {
        const receiverIds = [
          ...new Set(
            [
              formData['assignedUserId'] as string,
              ...(Array.isArray(formData['initialRecipientIds'])
                ? (formData['initialRecipientIds'] as string[])
                : []),
            ].filter(Boolean) as string[],
          ),
        ];
        const receiverDetails = receiverIds
          .map((id) => this.state.users().find((user) => user.id === id))
          .filter((user): user is User => Boolean(user))
          .map((user) => user.fullName);
        const senderDetails = actingUser.fullName;
        alert(
          `Document registered successfully!\nDocument Route No.: ${created.routeNo || formData['routeNo']}\nFrom: ${senderDetails}${
            receiverDetails.length
              ? `\nReceived by:\n${receiverDetails.join('\n')}`
              : formData['recipientName']
                ? `\nReceived by:\n${formData['recipientName']}`
                : ''
          }`,
        );
      }
    } catch (err: unknown) {
      const message = String((err as Error)?.message || '');
      alert('Failed to register document: ' + message);
    }
  };

  routeDocument = async (routeData: Record<string, unknown>): Promise<boolean> => {
    const actingUser = this.currentUser();
    if (!actingUser) {
      alert('Your session has ended. Please sign in again.');
      return false;
    }
    try {
      const updatedDoc =
        (routeData['recipients'] as unknown[])?.length > 1
          ? await firstValueFrom(this.api.multiRouteDocument(
              routeData['documentId'] as string,
              routeData as never,
            ))
          : await firstValueFrom(this.api.routeDocument(
              routeData['documentId'] as string,
              routeData as never,
            ));
      this.state.replaceDocument(updatedDoc);

      const user = this.currentUser();
      if (user) {
        const completedAlertIds = this.state
          .notifications()
          .filter((notification) => notification.documentId === updatedDoc.id)
          .map((notification) => notification.id);
        if (completedAlertIds.length) {
          const dismissedIds = this.state.getDismissedNotificationIds(user.id);
          completedAlertIds.forEach((id) => dismissedIds.add(id));
          localStorage.setItem(
            `blgf_dismissed_notifications_${user.id}`,
            JSON.stringify([...dismissedIds]),
          );
          this.state.notifications.set(
            this.state.notifications().filter(
              (notification) => !completedAlertIds.includes(notification.id),
            ),
          );
        }
      }
      await this.loadBackendData();
      const recipientNames = [
        ...new Set(
          (
            (routeData['recipients'] as unknown[])?.length
              ? (routeData['recipients'] as Array<{ toUser?: string }>).map(
                  (recipient) => recipient.toUser || '',
                )
              : [routeData['toUser'] || '']
          ).filter(Boolean) as string[],
        ),
      ];
      this.ui.showSuccess(
        `Document Route No. ${updatedDoc.routeNo || routeData['routeNo']} successfully routed.\nFrom: ${actingUser.fullName}\nTo: ${
          recipientNames.length
            ? recipientNames.join(', ')
            : routeData['toDivision']
        }`,
      );
      return true;
    } catch (err: unknown) {
      throw new Error(
        String((err as Error)?.message || 'Unable to route the document. Please try again.'),
      );
    }
  };

  routeDecision = async (
    notification: NotificationItem | PopupAction,
    decision: 'APPROVED' | 'DISAPPROVED',
  ): Promise<boolean> => {
    const user = this.currentUser();
    if (!notification.documentId || !user) return false;
    if (this.decisionSubmittingId() === notification.id) return false;
    let remarks = '';
    if (decision === 'DISAPPROVED') {
      const response = await showPrompt(
        'Required: Explain why this document is disapproved:',
        '',
      );
      remarks = response?.trim() || '';
      if (!remarks) {
        alert('A disapproval remark is required.');
        return false;
      }
    }
    this.decisionSubmittingId.set(notification.id);
    try {
      let updated: DocumentRecord;
      try {
        updated = await firstValueFrom(this.api.decideDocumentRoute(
          notification.documentId,
          decision,
          remarks,
          user.id,
        ));
      } catch (decisionError: unknown) {
        const message = String((decisionError as Error)?.message || '');
        if (!/endpoint not found|not found|404/i.test(message)) {
          throw decisionError;
        }
        const currentDocument = this.state
          .documents()
          .find((document) => document.id === notification.documentId);
        const assignedRoute = [...(currentDocument?.routes || [])]
          .reverse()
          .find((route) => route.toUserId === user.id);
        const legacySenderRoute = (currentDocument?.routes || []).find(
          (route) =>
            Boolean(route.toUserId) &&
            route.toUser?.trim().toLowerCase() ===
              assignedRoute?.fromUser?.trim().toLowerCase(),
        );
        const originalSender = this.state.users().find(
          (candidate) =>
            candidate.active &&
            (candidate.id === assignedRoute?.fromUserId ||
              candidate.id === legacySenderRoute?.toUserId ||
              candidate.id === currentDocument?.createdByUserId ||
              candidate.fullName.trim().toLowerCase() ===
                assignedRoute?.fromUser?.trim().toLowerCase() ||
              candidate.fullName.trim().toLowerCase() ===
                currentDocument?.createdBy?.trim().toLowerCase()),
        );
        if (!currentDocument || !originalSender) {
          throw new Error(
            'The original sender could not be found for this decision.',
          );
        }
        try {
          updated = await firstValueFrom(this.api.routeDocument(currentDocument.id, {
            fromDivision: user.divisionCode,
            fromUser: user.fullName,
            toDivision: originalSender.divisionCode,
            toUser: originalSender.fullName,
            toUserId: originalSender.id,
            actionRequested: decision,
            remarks:
              decision === 'DISAPPROVED'
                ? remarks
                : 'Approved; proceed with routing.',
            newStatus: decision === 'DISAPPROVED' ? 'RETURNED' : 'IN_PROGRESS',
            actingUserId: user.id,
            actingUserName: user.fullName,
            actingUserRole: user.role,
          } as never));
        } catch (routeError: unknown) {
          if (!/active user|recipient/i.test(String((routeError as Error)?.message || ''))) {
            throw routeError;
          }
          updated = await firstValueFrom(this.api.transferDocument(currentDocument.id, {
            fromDivision: user.divisionCode,
            fromUser: user.fullName,
            toDivision: originalSender.divisionCode,
            toUser: originalSender.fullName,
            toUserId: originalSender.id,
            transferReason:
              decision === 'DISAPPROVED'
                ? `DISAPPROVED by ${user.fullName}. Reason: ${remarks}`
                : `APPROVED by ${user.fullName}. Proceed with routing.`,
            actingUserId: user.id,
            actingUserName: user.fullName,
            actingUserRole: user.role,
          } as never));
        }
      }
      this.state.replaceDocument(updated);
      this.state.notifications.set(
        this.state.notifications().filter((item) => item.id !== notification.id),
      );
      const dismissedIds = this.state.getDismissedNotificationIds(user.id);
      dismissedIds.add(notification.id);
      localStorage.setItem(
        `blgf_dismissed_notifications_${user.id}`,
        JSON.stringify([...dismissedIds]),
      );
      this.routingPopup.set(null);
      this.isNotifDrawerOpen.set(false);
      if (
        this.reminderPopup()?.id === notification.id ||
        this.reminderPopup()?.documentId === notification.documentId
      ) {
        this.closedReminderPopupIds.add(notification.id);
        this.reminderPopup.set(null);
      }
      await this.loadBackendData();
      if (decision === 'APPROVED') {
        this.routeModalDoc.set({
          ...updated,
          currentDivision: user.divisionCode,
          assignedUser: user.fullName,
          assignedUserId: user.id,
        });
        this.ui.showSuccess(
          `Document ${updated.routeNo} approved. Proceed with routing to the next recipient.`,
        );
      } else {
        this.ui.showSuccess(
          `Document ${updated.routeNo} disapproved and returned to the sender.\nReason: ${remarks}`,
        );
      }
      return true;
    } catch (error: unknown) {
      alert(`Failed to record decision: ${String((error as Error)?.message || error)}`);
      return false;
    } finally {
      this.decisionSubmittingId.set(null);
    }
  };

  handleReminderDecision = async (
    reminder: NotificationItem,
    decision: 'APPROVED' | 'DISAPPROVED',
  ): Promise<void> => {
    let docId = reminder.documentId;
    if (!docId && reminder.trackingNumber) {
      const match = this.state.documents().find(
        (d) =>
          (d.routeNo &&
            d.routeNo.trim().toUpperCase() ===
              reminder.trackingNumber?.trim().toUpperCase()) ||
          (d.trackingNumber &&
            d.trackingNumber.trim().toUpperCase() ===
              reminder.trackingNumber?.trim().toUpperCase()),
      );
      if (match) docId = match.id;
    }
    const itemToDecide: NotificationItem = {
      ...reminder,
      documentId: docId || reminder.documentId,
    };
    const success = await this.routeDecision(itemToDecide, decision);
    if (success) {
      this.closeReminder();
    }
  };

  handleDocumentDetailDecision = async (
    doc: DocumentRecord,
    decision: 'APPROVED' | 'DISAPPROVED',
  ): Promise<boolean> => {
    const user = this.currentUser();
    if (!user) return false;
    const pseudoNotif: NotificationItem = {
      id: `doc-decision-${doc.id}-${Date.now()}`,
      userId: user.id,
      title: 'Routing Decision',
      message: `Decision for document ${doc.routeNo || doc.trackingNumber}`,
      documentId: doc.id,
      trackingNumber: doc.routeNo || doc.trackingNumber,
      type: 'ACTION_REQUIRED',
      requiresDecision: true,
      createdAt: new Date().toISOString(),
    };
    const success = await this.routeDecision(pseudoNotif, decision);
    if (success) {
      const refreshed = this.state.documents().find((d) => d.id === doc.id);
      if (refreshed) {
        this.selectedDoc.set(refreshed);
      }
    }
    return success;
  };

  reapproveDocument = (document: DocumentRecord): void =>
    void this.routeDecision(
      {
        id: `reapprove-${document.id}-${Date.now()}`,
        userId: this.currentUser()?.id || '',
        title: 'Re-approve Document',
        message: `Re-approve ${document.routeNo}`,
        documentId: document.id,
        trackingNumber: document.routeNo || document.trackingNumber,
        type: 'ACTION_REQUIRED',
        requiresDecision: true,
        createdAt: new Date().toISOString(),
      },
      'APPROVED',
    );

  sendRoutingReminder = async (
    document: DocumentRecord,
    route: DocumentRecord['routes'][number],
  ): Promise<void> => {
    if (!route.toUserId) return;
    const currentHandlerName =
      this.state.users().find((user) => user.id === route.toUserId)?.fullName ||
      route.toUser ||
      'document handler';
    const message = await showPrompt(
      `Reminder for ${currentHandlerName}:`,
      'Please take action on this routed document.',
    );
    if (!message?.trim()) return;
    try {
      await firstValueFrom(this.api.sendRoutingReminder({
        documentId: document.id,
        recipientUserId: route.toUserId,
        message: message.trim(),
        actionRequested: route.actionRequested || 'Appropriate Action',
      }));
      this.ui.showSuccess(`Reminder sent to ${currentHandlerName}.`);
      await this.loadBackendData();
    } catch (error: unknown) {
      this.ui.showError(`Failed to send reminder: ${String((error as Error)?.message || error)}`);
    }
  };

  deleteDocument = async (doc: DocumentRecord): Promise<void> => {
    if (
      await showConfirm(
        `Are you sure you want to delete document [${doc.routeNo}] "${doc.title}"?`,
      )
    ) {
      try {
        await firstValueFrom(this.api.deleteDocument(doc.id));
        this.state.removeDocument(doc.id);
        await this.loadBackendData();
        alert(`Document [${doc.routeNo}] deleted successfully.`);
      } catch (err: unknown) {
        alert('Failed to delete document: ' + String((err as Error)?.message || err));
      }
    }
  };

  // ===== User handlers =====

  createUser = async (userData: Partial<User>): Promise<User> => {
    try {
      const newUser = await firstValueFrom(this.api.createUser(userData));
      this.state.users.set([...this.state.users(), newUser]);
      alert(`User ${newUser.fullName} added successfully.`);
      return newUser;
    } catch (err: unknown) {
      alert('Failed to create user: ' + String((err as Error)?.message || err));
      throw err;
    }
  };

  updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
    try {
      const updated = await firstValueFrom(this.api.updateUser(id, userData));
      this.state.users.set(
        this.state.users().map((user) => (user.id === id ? updated : user)),
      );
      if (this.currentUser() && this.currentUser()!.id === id) {
        this.session.currentUser.set(updated);
      }
      return updated;
    } catch (err: unknown) {
      alert('Failed to update user: ' + String((err as Error)?.message || err));
      throw err;
    }
  };

  selfUpdateUser = async (
    id: string,
    userData: Partial<User> & { currentPassword?: string },
  ): Promise<User> => {
    const currentUser = this.currentUser();
    if (!currentUser) throw new Error('No current user');
    const updated = await firstValueFrom(this.api.updateUser(currentUser.id, userData));
    this.session.currentUser.set(updated);
    this.state.users.set(
      this.state.users().map((user) =>
        user.id === updated.id ? updated : user,
      ),
    );
    return updated;
  };

  deleteUser = async (id: string): Promise<{ success: boolean }> => {
    const result = await firstValueFrom(this.api.deleteUser(id));
    this.state.users.set(this.state.users().filter((user) => user.id !== id));
    return result;
  };

  createDivision = async (division: Partial<Division>): Promise<Division> => {
    const created = await firstValueFrom(this.api.createDivision(
      division as Omit<Division, 'id'>,
    ));
    this.state.divisions.set([...this.state.divisions(), created]);
    return created;
  };

  updateDivision = async (
    id: string,
    division: Partial<Division>,
  ): Promise<Division> => {
    const updated = await firstValueFrom(this.api.updateDivision(id, division as never));
    this.state.divisions.set(
      this.state.divisions().map((item) =>
        item.id === id ? updated : item,
      ),
    );
    return updated;
  };

  deleteDivision = async (id: string): Promise<{ success: boolean }> => {
    const result = await firstValueFrom(this.api.deleteDivision(id));
    this.state.divisions.set(
      this.state.divisions().filter((item) => item.id !== id),
    );
    return result;
  };

  markNotifRead = (id: string): void => {
    const user = this.currentUser();
    if (user) {
      const dismissedIds = this.state.getDismissedNotificationIds(user.id);
      dismissedIds.add(id);
      localStorage.setItem(
        `blgf_dismissed_notifications_${user.id}`,
        JSON.stringify([...dismissedIds]),
      );
    }
    this.state.notifications.set(
      this.state.notifications().filter((notification) => notification.id !== id),
    );
  };

  // ===== Envelope dispatch =====

  logEnvelopeDispatch = async (
    details: string,
    trackingNumber: string,
  ): Promise<void> => {
    const user = this.currentUser();
    if (!user) return;
    const log = await firstValueFrom(this.api.createEnvelopeLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'ENVELOPE_LOG',
      documentTrackingNumber: trackingNumber,
      details,
    }));
    this.state.envelopeLogs.set([log, ...this.state.envelopeLogs()]);
  };

  // ===== Target date popup =====

  acknowledgeTargetDate(document: DocumentRecord): void {
    localStorage.setItem(
      `blgf_target_alert_${document.id}_${document.targetCompletionDate}`,
      'acknowledged',
    );
    this.targetDatePopup.set(null);
  }

  reviewTargetDate(document: DocumentRecord): void {
    this.acknowledgeTargetDate(document);
    this.selectedDoc.set(document);
    this.activeView.set(document.direction === 'OUTGOING' ? 'outgoing' : 'incoming');
  }

  private syncTargetDatePopup(): void {
    this.targetDateInterval = window.setInterval(
      () => this.checkTargetDates(),
      60000,
    );
  }

  private checkTargetDates(): void {
    const user = this.currentUser();
    if (!user || this.targetDatePopup()) return;
    const now = Date.now();
    const dueDocument = this.state.documents().find((doc) => {
      if (
        doc.currentStatus === 'COMPLETED' ||
        !doc.targetCompletionDate ||
        new Date(doc.targetCompletionDate).getTime() > now
      ) {
        return false;
      }
      const canAccess =
        user.role === 'SYSTEM_ADMIN' ||
        doc.assignedUserId === user.id ||
        (doc.routes || []).some((route) => route.toUserId === user.id);
      if (!canAccess) return false;
      const alertKey = `blgf_target_alert_${doc.id}_${doc.targetCompletionDate}`;
      return localStorage.getItem(alertKey) !== 'acknowledged';
    });
    if (dueDocument) this.targetDatePopup.set(dueDocument);
  }

  private syncReminderPopup(): void {
    const current = this.state.notifications();
    const latestReminder = current.find(
      (notification) =>
        notification.type === 'URGENT' &&
        notification.title === 'Routing Action Reminder' &&
        !this.closedReminderPopupIds.has(notification.id),
    );
    if (latestReminder && this.reminderPopup()?.id !== latestReminder.id) {
      this.reminderPopup.set(latestReminder);
    }
  }

  private syncRoutingPopup(): void {
    const user = this.currentUser();
    if (!user) {
      this.closedApprovalPopupIds = new Map();
      this.routingPopup.set(null);
      return;
    }
    const pending = this.state
      .documents()
      .flatMap((document) =>
        (document.routes || [])
          .filter(
            (route) =>
              (route.toUserId === user.id ||
                (!route.toUserId &&
                  route.toUser?.trim().toLowerCase() ===
                    user.fullName.trim().toLowerCase())) &&
              !/^(APPROVED|DISAPPROVED)$/i.test(route.actionRequested),
          )
          .map((route) => ({ document, route })),
      )
      .filter(({ document, route }) => {
        if (document.currentStatus === 'COMPLETED') return false;
        const assignedAt = new Date(route.createdAt).getTime();
        if (!this.isNewRecipientAssignment(document, route)) return false;
        const hasSavedDecision = (document.routes || []).some(
          (candidate) =>
            (candidate.fromUserId === user.id ||
              (!candidate.fromUserId &&
                candidate.fromUser?.trim().toLowerCase() ===
                  user.fullName.trim().toLowerCase())) &&
            new Date(candidate.createdAt).getTime() > assignedAt &&
            /^(APPROVED|DISAPPROVED)$/i.test(candidate.actionRequested),
        );
        const hasAuditedDecision = this.state.auditLogs().some(
          (log) =>
            log.documentTrackingNumber === document.trackingNumber &&
            log.userId === user.id &&
            new Date(log.timestamp).getTime() > assignedAt &&
            /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
        );
        return !hasSavedDecision && !hasAuditedDecision;
      })
      .sort(
        (a, b) =>
          new Date(b.route.createdAt).getTime() -
          new Date(a.route.createdAt).getTime(),
      );
    const next = pending.find(({ route }) => {
      const key = routingPopupSnoozeKey(user.id, route.id);
      let closedAt = this.closedApprovalPopupIds.get(key);
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) closedAt = Number(saved);
      } catch {
        // In-memory snooze still works when storage is unavailable.
      }
      return !isRoutingPopupSnoozed(closedAt);
    });
    if (!next) {
      if (this.routingPopup()?.requiresDecision) this.routingPopup.set(null);
      return;
    }
    const popupId = `approval-popup-${next.route.id}`;
    if (this.routingPopup()?.id === popupId) return;
    this.routingPopup.set({
      id: popupId,
      userId: user.id,
      title: 'Document Routed to You',
      message: `Document ${next.document.routeNo || next.document.trackingNumber} requires your approval.`,
      documentId: next.document.id,
      trackingNumber: next.document.routeNo || next.document.trackingNumber,
      type: 'ACTION_REQUIRED',
      requiresDecision: true,
      createdAt: next.route.createdAt,
    });
  }

  private isNewRecipientAssignment(
    document: DocumentRecord,
    route: DocumentRecord['routes'][number],
  ): boolean {
    const assignedAt = new Date(route.createdAt).getTime();
    const wasAlreadyInvolved =
      this.sameRoutingUser(
        document.createdByUserId,
        document.createdBy,
        route.toUserId,
        route.toUser,
      ) ||
      (document.routes || []).some(
        (candidate) =>
          candidate.id !== route.id &&
          new Date(candidate.createdAt).getTime() < assignedAt &&
          (this.sameRoutingUser(
            candidate.fromUserId,
            candidate.fromUser,
            route.toUserId,
            route.toUser,
          ) ||
            this.sameRoutingUser(
              candidate.toUserId,
              candidate.toUser,
              route.toUserId,
              route.toUser,
            )),
      );
    return !wasAlreadyInvolved;
  }

  private sameRoutingUser(
    firstId?: string,
    firstName?: string,
    secondId?: string,
    secondName?: string,
  ): boolean {
    return (
      Boolean(firstId && secondId && firstId === secondId) ||
      Boolean(
        firstName?.split('|')[0].trim().toLowerCase() &&
          firstName.split('|')[0].trim().toLowerCase() ===
            secondName?.split('|')[0].trim().toLowerCase(),
      )
    );
  }

  closeRoutingActionPopup = (): void => {
    const popup = this.routingPopup();
    if (popup?.id.startsWith('approval-popup-')) {
      const key = routingPopupSnoozeKey(
        this.currentUser()?.id || '',
        popup.id.slice('approval-popup-'.length),
      );
      const closedAt = Date.now();
      this.closedApprovalPopupIds.set(key, closedAt);
      try {
        localStorage.setItem(key, String(closedAt));
      } catch {
        // Keep the session snooze.
      }
    }
    this.routingPopup.set(null);
  };

  closeReminder = (): void => {
    const reminder = this.reminderPopup();
    if (reminder) this.closedReminderPopupIds.add(reminder.id);
    this.reminderPopup.set(null);
  };

  viewReminderDocument(reminder: NotificationItem): void {
    if (reminder.trackingNumber) {
      const document = this.accessibleDocuments().find(
        (candidate) =>
          candidate.routeNo === reminder.trackingNumber ||
          candidate.trackingNumber === reminder.trackingNumber,
      );
      if (document) this.selectedDoc.set(document);
    }
    this.closedReminderPopupIds.add(reminder.id);
    this.reminderPopup.set(null);
  }

  openPopupAttachment(attachment: DocumentAttachment): void {
    if (!attachment.url) return;
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  }

  downloadPopupAttachment(attachment: DocumentAttachment): void {
    if (!attachment.url) return;
    const link = window.document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  }

  selectedDocTyped(): DocumentRecord | null {
    return this.selectedDoc();
  }
}
