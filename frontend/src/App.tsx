import { isSharedDocumentFile } from './utils/attachmentVisibility';
import { isRoutingPopupSnoozed, routingPopupSnoozeKey } from './utils/routingPopupSnooze';
import { isDocumentParticipant } from './utils/documentVisibility';
import { ModalLayer } from './components/ui/ModalLayer';
import { cx } from "./styles/muiClasses";import { lazy, Suspense, useState, useEffect, useMemo, useRef, type ComponentType } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Alert, Avatar, Backdrop, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, GlobalStyles, Typography } from '@mui/material';
import { createAppTheme } from './theme';
import { baseCss } from './styles/base.styles';
import { systemDesignCss, systemDesignStyles as design } from './styles/SystemDesign.styles';
import { utilitiesCss } from './styles/utilities.styles';
import { createSharedAppStyles } from './styles/sharedApp.styles';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/modals/LoginModal';
import { GlobalInputAutocomplete } from './components/GlobalInputAutocomplete';
import { AppDialogHost } from './components/modals/AppDialogHost';
import { showConfirm, showPrompt } from './services/dialogService';
import { NotificationDrawer } from './components/NotificationDrawer';
import { api } from './services/api';
import {
  User,
  DocumentRecord,
  DashboardStats,
  NotificationItem,
  AuditLog,
  Division,
  DocumentAttachment,
  DEFAULT_ROLE_PERMISSIONS } from
'./types';

const lazyNamed = <T extends Record<string, unknown>, K extends keyof T>(loader: () => Promise<T>, name: K) =>
  lazy(async () => ({ default: (await loader())[name] as ComponentType<any> }));

const muiGlobalCss = [baseCss, systemDesignCss, utilitiesCss].join('');

const DashboardView = lazyNamed(() => import('./components/DashboardView'), 'DashboardView');
const DocumentListView = lazyNamed(() => import('./components/DocumentListView'), 'DocumentListView');
const DocumentDetailModal = lazyNamed(() => import('./components/modals/DocumentDetailModal'), 'DocumentDetailModal');
const CreateDocumentModal = lazyNamed(() => import('./components/modals/CreateDocumentModal'), 'CreateDocumentModal');
const RouteDocumentModal = lazyNamed(() => import('./components/modals/RouteDocumentModal'), 'RouteDocumentModal');
const DocumentSlipView = lazyNamed(() => import('./components/DocumentSlipView'), 'DocumentSlipView');
const UserSettingsView = lazyNamed(() => import('./components/UserSettingsView'), 'UserSettingsView');
const AuditLogsView = lazyNamed(() => import('./components/AuditLogsView'), 'AuditLogsView');
const UserManagementView = lazyNamed(() => import('./components/UserManagementView'), 'UserManagementView');
const EmployeeProfilesView = lazyNamed(() => import('./components/EmployeeProfilesView'), 'EmployeeProfilesView');
const QRCodeGeneratorView = lazyNamed(() => import('./components/QRCodeGeneratorView'), 'QRCodeGeneratorView');
const OutgoingEnvelopeView = lazyNamed(() => import('./components/OutgoingEnvelopeView'), 'OutgoingEnvelopeView');
const RoutingFollowUpView = lazyNamed(() => import('./components/RoutingFollowUpView'), 'RoutingFollowUpView');
const IncomingReportView = lazyNamed(() => import('./components/IncomingReportView'), 'IncomingReportView');
const OutgoingReportView = lazyNamed(() => import('./components/OutgoingReportView'), 'OutgoingReportView');
const EnvelopeReportView = lazyNamed(() => import('./components/EnvelopeReportView'), 'EnvelopeReportView');

const preloadWorkspaceViews = () => Promise.allSettled([
  import('./components/DocumentListView'),
  import('./components/DocumentSlipView'),
  import('./components/UserSettingsView'),
  import('./components/AuditLogsView'),
  import('./components/UserManagementView'),
  import('./components/EmployeeProfilesView'),
  import('./components/QRCodeGeneratorView'),
  import('./components/OutgoingEnvelopeView'),
  import('./components/RoutingFollowUpView'),
  import('./components/IncomingReportView'),
  import('./components/OutgoingReportView'),
  import('./components/EnvelopeReportView'),
]);

const ViewLoadingFallback = () => (
  <Box role="status" aria-label="Loading" sx={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
    <Box component="img" src="/blgflogo.jpg" alt="" sx={{ width: 52, height: 52, objectFit: 'contain', borderRadius: '50%', animation: 'blgf-logo-loading 180ms ease-out both' }} />
  </Box>
);

const dismissedNotificationKey = (userId: string) =>
`blgf_dismissed_notifications_${userId}`;

const getDismissedNotificationIds = (userId: string) => {
  try {
    return new Set<string>(
      JSON.parse(
        localStorage.getItem(dismissedNotificationKey(userId)) || '[]'
      )
    );
  } catch {
    return new Set<string>();
  }
};

const sameRoutingUser = (
firstId?: string,
firstName?: string,
secondId?: string,
secondName?: string) =>

Boolean(firstId && secondId && firstId === secondId) ||
Boolean(
  firstName?.split('|')[0].trim().toLowerCase() &&
  firstName.split('|')[0].trim().toLowerCase() ===
  secondName?.split('|')[0].trim().toLowerCase()
);

const isNewRecipientAssignment = (
document: DocumentRecord,
route: DocumentRecord['routes'][number]) =>
{
  const assignedAt = new Date(route.createdAt).getTime();
  const wasAlreadyInvolved =
  sameRoutingUser(
    document.createdByUserId,
    document.createdBy,
    route.toUserId,
    route.toUser
  ) ||
  (document.routes || []).some(
    (candidate) =>
    candidate.id !== route.id &&
    new Date(candidate.createdAt).getTime() < assignedAt && (
    sameRoutingUser(
      candidate.fromUserId,
      candidate.fromUser,
      route.toUserId,
      route.toUser
    ) ||
    sameRoutingUser(
      candidate.toUserId,
      candidate.toUser,
      route.toUserId,
      route.toUser
    ))
  );
  return !wasAlreadyInvolved;
};

export default function App() {
  // Navigation
  const [activeView, setActiveView] = useState<string>('dashboard');

  // Global search query (filters the document list by tracking number / title)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('blgf_theme') === 'dark';
  });
  const muiTheme = useMemo(() => createAppTheme(isDarkMode ? 'dark' : 'light'), [isDarkMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('blgf_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('blgf_theme', 'light');
    }
  }, [isDarkMode]);

  // User Session - Start as null (no auto-login)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    if (!currentUser) return undefined;
    const preloadTimer = window.setTimeout(() => {
      void preloadWorkspaceViews();
    }, 300);
    return () => window.clearTimeout(preloadTimer);
  }, [currentUser]);

  // Sidebar Collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
  useState<boolean>(false);

  // Core Data
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [envelopeLogs, setEnvelopeLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const documentsRef = useRef<DocumentRecord[]>([]);
  const auditLogsRef = useRef<AuditLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncoming: 0,
    totalOutgoing: 0,
    pendingCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    urgentCount: 0,
    returnedCount: 0,
    avgTurnaroundHours: 0,
    divisionBreakdown: [],
    statusBreakdown: [],
    recentActivity: []
  });

  // Modals & Drawers
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [fullFlowDocumentId, setFullFlowDocumentId] = useState<string | null>(null);
  const [routeModalDoc, setRouteModalDoc] = useState<DocumentRecord | null>(
    null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  const [routingPopup, setRoutingPopup] = useState<NotificationItem | null>(null);
  const [reminderPopup, setReminderPopup] = useState<NotificationItem | null>(null);
  const [decisionSubmittingId, setDecisionSubmittingId] = useState<string | null>(null);
  const [successPopup, setSuccessPopup] = useState<string | null>(null);
  const [alertPopup, setAlertPopup] = useState<string | null>(null);
  const [targetDatePopup, setTargetDatePopup] = useState<DocumentRecord | null>(
    null
  );
  const closedApprovalPopupIds = useRef<Map<string, number>>(new Map());
  const [routingSnoozeTick, setRoutingSnoozeTick] = useState(0);
  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => setRoutingSnoozeTick(value => value + 1);
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('storage', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', refresh); };
  }, [currentUser?.id]);
  const closedReminderPopupIds = useRef<Set<string>>(new Set());
  const [slipSelectedDoc, setSlipSelectedDoc] = useState<DocumentRecord | null>(
    null
  );

  documentsRef.current = documents;
  auditLogsRef.current = auditLogs;

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: any) => {
      setAlertPopup(String(message ?? ''));
    };
    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  useEffect(() => {
    if (
    !currentUser ||
    !documents.length ||
    targetDatePopup)
    return;

    const checkTargetDates = () => {
      const now = Date.now();
      const dueDocument = documents.find((doc) => {
        if (
        doc.currentStatus === 'COMPLETED' ||
        !doc.targetCompletionDate ||
        new Date(doc.targetCompletionDate).getTime() > now)

        return false;
        const canAccess =
        currentUser.role === 'SYSTEM_ADMIN' ||
        doc.assignedUserId === currentUser.id ||
        (doc.routes || []).some(
          (route) =>
          route.toUserId === currentUser.id
        );
        if (!canAccess) return false;
        const alertKey = `blgf_target_alert_${doc.id}_${doc.targetCompletionDate}`;
        return localStorage.getItem(alertKey) !== 'acknowledged';
      });
      if (dueDocument) setTargetDatePopup(dueDocument);
    };

    checkTargetDates();
    const interval = window.setInterval(checkTargetDates, 60000);
    return () => window.clearInterval(interval);
  }, [currentUser, documents, targetDatePopup]);

  const acknowledgeTargetDate = (document: DocumentRecord) => {
    localStorage.setItem(
      `blgf_target_alert_${document.id}_${document.targetCompletionDate}`,
      'acknowledged'
    );
    setTargetDatePopup(null);
  };

  // Check for saved session on mount
  useEffect(() => {
    const savedUserId =
    sessionStorage.getItem('blgf_current_user') ||
    localStorage.getItem('blgf_current_user');
    if (savedUserId && users.length > 0) {
      const savedUser = users.find((u) => u.id === savedUserId);
      if (savedUser && savedUser.active) {
        sessionStorage.setItem('blgf_current_user', savedUser.id);
        setCurrentUser(savedUser);
        setShowLoginModal(false);
      }
    }
  }, [users]);

  // Load Data from Express Backend API
  const loadBackendData = async () => {
    try {
      const [
      docsData,
      statsData,
      usersData,
      divisionsData,
      logsData,
      envelopeLogsData] =
      await Promise.all([
      api.getDocuments().catch(() => null),
      api.getStats().catch(() => null),
      api.getUsers().catch(() => null),
      api.getDivisions().catch(() => null),
      api.getAuditLogs().catch(() => null),
      api.getEnvelopeLogs().catch(() => null)]
      );

      if (docsData) setDocuments(docsData);
      if (statsData) setStats(statsData);
      if (usersData) setUsers(usersData);
      if (divisionsData) setDivisions(divisionsData);
      if (logsData) setAuditLogs(logsData);
      if (envelopeLogsData) setEnvelopeLogs(envelopeLogsData);
    } catch (err) {
      console.warn('Backend sync fallback to local memory state:', err);
    } finally {
      setIsDataLoaded(true);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (currentUser) {
        loadBackendData();
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      const savedUserId = localStorage.getItem('blgf_current_user');
      if (savedUserId) {
        // Validate a persisted ID with the non-failing users lookup before any
        // protected document requests. This also removes stale browser state
        // left behind after a database reset.
        api.
        getUsers().
        then((savedUsers) => {
          const savedUser = savedUsers.find(
            (user) => user.id === savedUserId && user.active
          );
          if (savedUser) {
            setUsers(savedUsers);
            setCurrentUser(savedUser);
            setShowLoginModal(false);
          } else {
            localStorage.removeItem('blgf_current_user');
          }
        }).
        catch(() => localStorage.removeItem('blgf_current_user')).
        finally(() => setIsDataLoaded(true));
        return;
      }
      setIsDataLoaded(true);
      return;
    }

    loadBackendData();

    const refreshDashboard = async () => {
      const [latestDocuments, latestStats, latestAuditLogs] = await Promise.all([
      api.getDocuments().catch(() => null),
      api.getStats().catch(() => null),
      api.getAuditLogs().catch(() => null)]
      );
      if (latestDocuments) setDocuments(latestDocuments);
      if (latestStats) setStats(latestStats);
      if (latestAuditLogs) setAuditLogs(latestAuditLogs);
    };
    const refresh = window.setInterval(refreshDashboard, 5000);
    return () => window.clearInterval(refresh);
  }, [currentUser?.id]);

  // Keep an open detail modal synchronized with the newest server copy. The
  // selected document used to remain a stale snapshot after another handler
  // approved or disapproved a route.
  useEffect(() => {
    if (!selectedDoc) return;
    const latestSelectedDocument = documents.find(
      (document) => document.id === selectedDoc.id
    );
    if (latestSelectedDocument && latestSelectedDocument !== selectedDoc) {
      setSelectedDoc(latestSelectedDocument);
    }
  }, [documents, selectedDoc]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    const refreshNotifications = async () => {
      const latest = await api.getNotifications(currentUser.id).catch(() => []);
      if (cancelled) return;
      const dismissedIds = getDismissedNotificationIds(currentUser.id);
      const normalized = latest.map((notification) => {
        const text = `${notification.title} ${notification.message}`.toUpperCase();
        const inferredStatus = text.includes('DISAPPROVED') ?
        'DISAPPROVED' as const :
        text.includes('APPROVED') ?
        'APPROVED' as const :
        undefined;
        const relatedDocument = documentsRef.current.find(
          (document) => document.id === notification.documentId
        );
        const pendingAssignment = relatedDocument ?
        [...(relatedDocument.routes || [])].
        reverse().
        find(
          (route) =>
          sameRoutingUser(
            route.toUserId,
            route.toUser,
            currentUser.id,
            currentUser.fullName
          ) &&
          !/^(APPROVED|DISAPPROVED)$/i.test(
            route.actionRequested
          ) &&
          isNewRecipientAssignment(relatedDocument, route) &&
          !(relatedDocument.routes || []).some(
            (candidate) =>
            new Date(candidate.createdAt).getTime() >
            new Date(route.createdAt).getTime() &&
            sameRoutingUser(
              candidate.fromUserId,
              candidate.fromUser,
              currentUser.id,
              currentUser.fullName
            ) &&
            /^(APPROVED|DISAPPROVED)$/i.test(
              candidate.actionRequested
            )
          )
        ) :
        undefined;
        return {
          ...notification,
          decisionStatus: notification.decisionStatus || inferredStatus,
          requiresDecision: Boolean(pendingAssignment && !inferredStatus)
        };
      });
      const auditResults = documentsRef.current.flatMap((document) =>
      (document.routes || []).flatMap((route) => {
        const currentUserIsRouter =
        route.fromUserId === currentUser.id ||
        !route.fromUserId &&
        route.fromUser?.trim().toLowerCase() ===
        currentUser.fullName.trim().toLowerCase();
        const currentUserIsHandler =
        route.toUserId === currentUser.id ||
        !route.toUserId &&
        route.toUser?.trim().toLowerCase() ===
        currentUser.fullName.trim().toLowerCase();
        if (!currentUserIsRouter && !currentUserIsHandler) return [];

        const decisionLog = auditLogsRef.current.
        filter(
          (log) =>
          log.documentTrackingNumber === document.trackingNumber && (
          log.userId === route.toUserId ||
          log.userName.trim().toLowerCase() ===
          route.toUser?.trim().toLowerCase()) &&
          new Date(log.timestamp).getTime() >
          new Date(route.createdAt).getTime() &&
          /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details)
        ).
        sort(
          (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
        )[0];
        if (!decisionLog) return [];
        const status = decisionLog.details.
        match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1].
        toUpperCase() as 'APPROVED' | 'DISAPPROVED';
        const reason =
        decisionLog.details.match(
          /Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i
        )?.[1] || 'No reason provided.';
        return [{
          id: `audit-result-${currentUser.id}-${decisionLog.id}`,
          userId: currentUser.id,
          title:
          status === 'APPROVED' ?
          'This is Approved' :
          'This is Disapproved',
          message:
          status === 'APPROVED' ?
          `Document ${document.routeNo || document.trackingNumber} was approved by ${decisionLog.userName}.` :
          `Document ${document.routeNo || document.trackingNumber} was disapproved by ${decisionLog.userName}. Reason: ${reason}`,
          documentId: document.id,
          trackingNumber: document.routeNo || document.trackingNumber,
          type: 'INFO' as const,
          requiresDecision: false,
          decisionStatus: status,
          createdAt: decisionLog.timestamp
        }];
      })
      );
      const uniqueAuditResults = [
      ...new Map(auditResults.map((item) => [item.id, item])).values()];

      const resultDocumentIds = new Set(
        uniqueAuditResults.map((item) => item.documentId)
      );
      const mergedNotifications = [
      ...uniqueAuditResults,
      ...normalized.filter(
        (item) =>
        item.title === 'Routing Action Reminder' ||
        !resultDocumentIds.has(item.documentId)
      )];

      setNotifications(
        mergedNotifications.
        filter((notification) => {
          // An approval request stays actionable until a real decision route is
          // saved. Closing/dismissing the UI must not turn it into a hidden
          // WAIT FOR APPROVAL state with no way to act.
          if (
          dismissedIds.has(notification.id) &&
          !notification.requiresDecision)
          {
            return false;
          }
          if (!notification.decisionStatus) return true;
          return (
            Date.now() - new Date(notification.createdAt).getTime() <
            24 * 60 * 60 * 1000);

        }).
        sort((first, second) => {
          const timeDifference =
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime();
          if (timeDifference !== 0) return timeDifference;
          return Number(second.requiresDecision) - Number(first.requiresDecision);
        })
      );
    };
    refreshNotifications();
    const refresh = window.setInterval(refreshNotifications, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const latestReminder = notifications.find(
      (notification) =>
      notification.type === 'URGENT' &&
      notification.title === 'Routing Action Reminder' &&
      !closedReminderPopupIds.current.has(notification.id)
    );
    if (latestReminder && reminderPopup?.id !== latestReminder.id) {
      setReminderPopup(latestReminder);
    }
  }, [notifications, reminderPopup?.id]);

  // Approval actions are derived from document routing state, independently of
  // the display-only notification feed.
  useEffect(() => {
    if (!currentUser) {
      closedApprovalPopupIds.current = new Map();
      setRoutingPopup(null);
      return;
    }
    const pending = documents.
    flatMap((document) =>
    (document.routes || []).
    filter(
      (route) =>
      (route.toUserId === currentUser.id ||
      !route.toUserId &&
      route.toUser?.trim().toLowerCase() ===
      currentUser.fullName.trim().toLowerCase()) &&
      !/^(APPROVED|DISAPPROVED)$/i.test(route.actionRequested)
    ).
    map((route) => ({ document, route }))
    ).
    filter(({ document, route }) => {
      if (document.currentStatus === 'COMPLETED') return false;
      const assignedAt = new Date(route.createdAt).getTime();
      // Approval is required only for a newly introduced SSO recipient.
      // Returning or continuing participants receive the route directly.
      if (!isNewRecipientAssignment(document, route)) return false;
      const hasSavedDecision = (document.routes || []).some(
        (candidate) =>
        (candidate.fromUserId === currentUser.id ||
        !candidate.fromUserId &&
        candidate.fromUser?.trim().toLowerCase() ===
        currentUser.fullName.trim().toLowerCase()) &&
        new Date(candidate.createdAt).getTime() > assignedAt &&
        /^(APPROVED|DISAPPROVED)$/i.test(candidate.actionRequested)
      );
      const hasAuditedDecision = auditLogs.some(
        (log) =>
        log.documentTrackingNumber === document.trackingNumber &&
        log.userId === currentUser.id &&
        new Date(log.timestamp).getTime() > assignedAt &&
        /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details)
      );
      return !hasSavedDecision && !hasAuditedDecision;
    }).
    sort(
      (a, b) =>
      new Date(b.route.createdAt).getTime() -
      new Date(a.route.createdAt).getTime()
    );
    const next = pending.find(({ route }) => {
      const key = routingPopupSnoozeKey(currentUser.id, route.id);
      let closedAt = closedApprovalPopupIds.current.get(key);
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) closedAt = Number(saved);
      } catch { /* In-memory snooze still works when storage is unavailable. */ }
      return !isRoutingPopupSnoozed(closedAt);
    });
    if (!next) {
      if (routingPopup?.requiresDecision) setRoutingPopup(null);
      return;
    }
    const popupId = `approval-popup-${next.route.id}`;
    if (routingPopup?.id === popupId) return;
    setRoutingPopup({
      id: popupId,
      userId: currentUser.id,
      title: 'Document Routed to You',
      message: `Document ${next.document.routeNo || next.document.trackingNumber} requires your approval.`,
      documentId: next.document.id,
      trackingNumber: next.document.routeNo || next.document.trackingNumber,
      type: 'ACTION_REQUIRED',
      requiresDecision: true,
      createdAt: next.route.createdAt
    });
  }, [documents, auditLogs, currentUser, routingPopup, routingSnoozeTick]);

  // Login Handler
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    sessionStorage.setItem('blgf_current_user', user.id);
    localStorage.setItem('blgf_current_user', user.id);
  };

  // Logout Handler
  const handleLogout = () => {
    setCurrentUser(null);
    setShowLoginModal(true);
    sessionStorage.removeItem('blgf_current_user');
    localStorage.removeItem('blgf_current_user');
    setActiveView('dashboard');
    setSelectedDoc(null);
            setFullFlowDocumentId(null);
    setRouteModalDoc(null);
    setSlipSelectedDoc(null);
    setSearchQuery('');
  };

  // Handlers
  const handleCreateDocument = async (formData: any) => {
    const actingUser = currentUser;
    if (!actingUser) {
      alert('Your session has ended. Please sign in again.');
      return;
    }
    try {
      const shouldRoute = formData.shouldRouteModal;
      const shouldPrint = formData.shouldPrintSlip;
      delete formData.shouldPrintSlip;
      delete formData.shouldRouteModal;

      let created: DocumentRecord | undefined;
      let candidateRouteNo = String(formData.routeNo || '');
      for (let attempt = 0; attempt < 1000; attempt += 1) {
        try {
          created = await api.createDocument({
            ...formData,
            routeNo: candidateRouteNo
          });
          break;
        } catch (error: any) {
          const message = String(error?.message || '');
          if (!/duplicate|already assigned|already used|no longer available/i.test(message)) {
            throw error;
          }

          const serverSuggestion = message.match(
            /next (?:number )?is\s+(BLGFR2-\d{4}-\d{2}-(?:IN|OUT)-\d+)/i
          )?.[1];
          if (serverSuggestion && serverSuggestion !== candidateRouteNo) {
            candidateRouteNo = serverSuggestion;
            continue;
          }

          try {
            const latest = await api.getNextRouteNumber(formData.direction);
            if (latest.routeNo && latest.routeNo !== candidateRouteNo) {
              candidateRouteNo = latest.routeNo;
              continue;
            }
          } catch {







            // Older API versions do not expose the next-number endpoint.
          }const match = candidateRouteNo.match(/^(.*-)(\d+)$/);if (!match) throw error;candidateRouteNo = `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, '0')}`;}}if (!created) {
        throw new Error('Unable to allocate an available Document Route No.');
      }
      formData.routeNo = created.routeNo || candidateRouteNo;
      setDocuments((prev) => [created, ...prev]);
      await loadBackendData();

      if (shouldPrint) {
        setSlipSelectedDoc(created);
        setActiveView('slip');
      } else if (shouldRoute) {
        setRouteModalDoc(created);
      } else {
        const receiverIds = [
        ...new Set(
          [
          formData.assignedUserId,
          ...(Array.isArray(formData.initialRecipientIds) ?
          formData.initialRecipientIds :
          [])].
          filter(Boolean)
        )];

        const receiverDetails = receiverIds.
        map((id) => users.find((user) => user.id === id)).
        filter((user): user is User => Boolean(user)).
        map((user) => user.fullName);
        const senderDetails = actingUser.fullName;
        alert(
          `✅ Document registered!\nDocument Route No.: ${created.routeNo || formData.routeNo}\nFrom: ${senderDetails}${
          receiverDetails.length ?
          `\nReceived by:\n${receiverDetails.join('\n')}` :
          formData.recipientName ?
          `\nReceived by:\n${formData.recipientName}` :
          ''}`

        );
      }
    } catch (err: any) {
      const message = String(err?.message || '');
      alert('Failed to register document: ' + message);
    }
  };

  const handleRouteDocument = async (routeData: any) => {
    const actingUser = currentUser;
    if (!actingUser) {
      alert('Your session has ended. Please sign in again.');
      return false;
    }
    try {
      const updatedDoc =
      routeData.recipients?.length > 1 ?
      await api.multiRouteDocument(routeData.documentId, routeData) :
      await api.routeDocument(routeData.documentId, routeData);
      setDocuments((prev) =>
      prev.map((d) => d.id === updatedDoc.id ? updatedDoc : d)
      );
      // A recipient has acted on this document; clear their routing alert.
      const completedAlertIds = notifications.
      filter((notification) => notification.documentId === updatedDoc.id).
      map((notification) => notification.id);
      if (completedAlertIds.length) {
        const dismissedIds = getDismissedNotificationIds(actingUser.id);
        completedAlertIds.forEach((id) => dismissedIds.add(id));
        localStorage.setItem(
          dismissedNotificationKey(actingUser.id),
          JSON.stringify([...dismissedIds])
        );
        setNotifications((previous) =>
        previous.filter(
          (notification) => !completedAlertIds.includes(notification.id)
        )
        );
      }
      await loadBackendData();
      const recipientNames = [
      ...new Set(
        (routeData.recipients?.length ?
        routeData.recipients.map(
          (recipient: {toUser?: string;}) => recipient.toUser || ''
        ) :
        [routeData.toUser || '']).
        filter(Boolean)
      )];

      setSuccessPopup(
        `Document Route No. ${updatedDoc.routeNo || routeData.routeNo} successfully routed.\nFrom: ${actingUser.fullName}\nTo: ${
        recipientNames.length ?
        recipientNames.join(', ') :
        routeData.toDivision}`

      );
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Unable to route the document. Please try again.');
    }
  };

  const handleRouteDecision = async (
  notification: NotificationItem,
  decision: 'APPROVED' | 'DISAPPROVED') =>
  {
    if (!notification.documentId) return;
    if (decisionSubmittingId === notification.id) return;
    let remarks = '';
    if (decision === 'DISAPPROVED') {
      const response = await showPrompt(
        'Required: Explain why this document is disapproved:',
        ''
      );
      remarks = response?.trim() || '';
      if (!remarks) {
        alert('A disapproval remark is required.');
        return;
      }
    }
    setDecisionSubmittingId(notification.id);
    try {
      let updated: DocumentRecord;
      try {
        updated = await api.decideDocumentRoute(
          notification.documentId,
          decision,
          remarks,
          currentUser.id
        );
      } catch (decisionError: any) {
        const message = String(decisionError?.message || '');
        if (!/endpoint not found|not found|404/i.test(message)) {
          throw decisionError;
        }

        const currentDocument = documents.find(
          (document) => document.id === notification.documentId
        );
        const assignedRoute = [...(currentDocument?.routes || [])].
        reverse().
        find((route) => route.toUserId === currentUser.id);
        const legacySenderRoute = (currentDocument?.routes || []).find(
          (route) =>
          Boolean(route.toUserId) &&
          route.toUser?.trim().toLowerCase() ===
          assignedRoute?.fromUser?.trim().toLowerCase()
        );
        const originalSender = users.find(
          (user) =>
          user.active && (
          user.id === assignedRoute?.fromUserId ||
          user.id === legacySenderRoute?.toUserId ||
          user.id === currentDocument?.createdByUserId ||
          user.fullName.trim().toLowerCase() ===
          assignedRoute?.fromUser?.trim().toLowerCase() ||
          user.fullName.trim().toLowerCase() ===
          currentDocument?.createdBy?.trim().toLowerCase())
        );
        if (!currentDocument || !originalSender) {
          throw new Error(
            'The original sender could not be found for this decision.'
          );
        }

        try {
          updated = await api.routeDocument(currentDocument.id, {
            fromDivision: currentUser.divisionCode,
            fromUser: currentUser.fullName,
            toDivision: originalSender.divisionCode,
            toUser: originalSender.fullName,
            toUserId: originalSender.id,
            actionRequested: decision,
            remarks:
            decision === 'DISAPPROVED' ?
            remarks :
            'Approved; proceed with routing.',
            newStatus:
            decision === 'DISAPPROVED' ? 'RETURNED' : 'IN_PROGRESS',
            actingUserId: currentUser.id,
            actingUserName: currentUser.fullName,
            actingUserRole: currentUser.role
          });
        } catch (routeError: any) {
          if (!/active user|recipient/i.test(String(routeError?.message || ''))) {
            throw routeError;
          }
          updated = await api.transferDocument(currentDocument.id, {
            fromDivision: currentUser.divisionCode,
            fromUser: currentUser.fullName,
            toDivision: originalSender.divisionCode,
            toUser: originalSender.fullName,
            toUserId: originalSender.id,
            transferReason:
            decision === 'DISAPPROVED' ?
            `DISAPPROVED by ${currentUser.fullName}. Reason: ${remarks}` :
            `APPROVED by ${currentUser.fullName}. Proceed with routing.`,
            actingUserId: currentUser.id,
            actingUserName: currentUser.fullName,
            actingUserRole: currentUser.role
          });
        }
      }
      setDocuments((previous) =>
      previous.map((document) =>
      document.id === updated.id ? updated : document
      )
      );
      setNotifications((previous) =>
      previous.filter((item) => item.id !== notification.id)
      );
      const dismissedIds = getDismissedNotificationIds(currentUser.id);
      dismissedIds.add(notification.id);
      localStorage.setItem(
        dismissedNotificationKey(currentUser.id),
        JSON.stringify([...dismissedIds])
      );
      setRoutingPopup(null);
      setIsNotifDrawerOpen(false);
      await loadBackendData();
      if (decision === 'APPROVED') {
        setRouteModalDoc({
          ...updated,
          currentDivision: currentUser.divisionCode,
          assignedUser: currentUser.fullName,
          assignedUserId: currentUser.id
        });
        setSuccessPopup(
          `Document ${updated.routeNo} approved. Proceed with routing to the next recipient.`
        );
      } else {
        setSuccessPopup(
          `Document ${updated.routeNo} disapproved and returned to the sender.\nReason: ${remarks}`
        );
      }
    } catch (error: any) {
      alert(`Failed to record decision: ${error.message}`);
    } finally {
      setDecisionSubmittingId(null);
    }
  };

  const handleReapproveDocument = (document: DocumentRecord) =>
  handleRouteDecision(
    {
      id: `reapprove-${document.id}-${Date.now()}`,
      userId: currentUser?.id || '',
      title: 'Re-approve Document',
      message: `Re-approve ${document.routeNo}`,
      documentId: document.id,
      trackingNumber: document.routeNo || document.trackingNumber,
      type: 'ACTION_REQUIRED',
      createdAt: new Date().toISOString()
    },
    'APPROVED'
  );

  const handleSendRoutingReminder = async (
  document: DocumentRecord,
  route: DocumentRecord['routes'][number]) =>
  {
    if (!route.toUserId) return;
    const currentHandlerName =
    users.find((user) => user.id === route.toUserId)?.fullName ||
    route.toUser ||
    'document handler';
    const message = await showPrompt(
      `Reminder for ${currentHandlerName}:`,
      'Please take action on this routed document.'
    );
    if (!message?.trim()) return;
    try {
      await api.sendRoutingReminder({
        documentId: document.id,
        recipientUserId: route.toUserId,
        message: message.trim(),
        actionRequested: route.actionRequested || 'Appropriate Action'
      });
      setSuccessPopup(
        `Reminder sent to ${currentHandlerName}.`
      );
      await loadBackendData();
    } catch (error: any) {
      setAlertPopup(`Failed to send reminder: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (doc: DocumentRecord) => {
    if (
    await showConfirm(
      `Are you sure you want to delete document [${doc.routeNo}] "${doc.title}"?`
    ))
    {
      try {
        await api.deleteDocument(doc.id);
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        await loadBackendData();
        alert(`🗑️ Document [${doc.routeNo}] deleted successfully.`);
      } catch (err: any) {
        alert('Failed to delete document: ' + err.message);
      }
    }
  };

  const handleCreateUser = async (userData: Partial<User>) => {
    try {
      const newUser = await api.createUser(userData);
      setUsers((prev) => [...prev, newUser]);
      alert(`✅ User ${newUser.fullName} added successfully.`);
    } catch (err: any) {
      alert('Failed to create user: ' + err.message);
    }
  };

  const handleUpdateUser = async (id: string, userData: Partial<User>) => {
    try {
      const updated = await api.updateUser(id, userData);
      setUsers((prev) => prev.map((u) => u.id === id ? updated : u));
      if (currentUser && currentUser.id === id) {
        setCurrentUser(updated);
      }
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
      throw err;
    }
  };

  const handleSelfUpdateUser = async (
  userData: Partial<User> & {currentPassword?: string;}) =>
  {
    if (!currentUser) return;
    const updated = await api.updateUser(currentUser.id, userData);
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
  };

  const handleMarkNotifRead = (id: string) => {
    if (currentUser) {
      const dismissedIds = getDismissedNotificationIds(currentUser.id);
      dismissedIds.add(id);
      localStorage.setItem(
        dismissedNotificationKey(currentUser.id),
        JSON.stringify([...dismissedIds])
      );
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (!isOnline || !isDataLoaded) {
    return (
      <ThemeProvider theme={muiTheme}>
        <GlobalStyles styles={muiGlobalCss} />
        <GlobalStyles styles={createSharedAppStyles(muiTheme)} />
        <ViewLoadingFallback />
      </ThemeProvider>);

  }

  // If not logged in, show login modal
  if (!currentUser) {
    return (
      <ThemeProvider theme={muiTheme}><GlobalStyles styles={muiGlobalCss} /><GlobalStyles styles={createSharedAppStyles(muiTheme)} /><div
        className={cx(`min-h-screen bg-slate-50 dark:bg-slate-950 ${isDarkMode ? 'dark' : ''}`)}>
        
        <LoginModal
          isOpen={showLoginModal}
          onLoginSuccess={handleLogin}
          onClose={undefined} />
        
      </div></ThemeProvider>);

  }

  const effectivePermissions =
  currentUser.permissions ||
  DEFAULT_ROLE_PERMISSIONS[currentUser.role] ||
  DEFAULT_ROLE_PERMISSIONS.STAFF;
  const accessibleDocuments =
  currentUser.role === 'SYSTEM_ADMIN' ||
  effectivePermissions.canViewAllDocuments ?
  documents :
  documents.filter((document) =>
    isDocumentParticipant(document, currentUser, auditLogs)
  );
  const routingPopupDocument = routingPopup ?
  accessibleDocuments.find(
    (document) =>
    document.id === routingPopup.documentId ||
    document.routeNo === routingPopup.trackingNumber
  ) :
  undefined;
  // Show the latest actual delivery to this signed-in recipient.
  const routingPopupRoute = [...(routingPopupDocument?.routes || [])]
    .filter(route => route.toUserId === currentUser.id &&
      !/^(APPROVED|DISAPPROVED)$/i.test(route.actionRequested?.trim() || ''))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      b.stepNumber - a.stepNumber)[0];
  const forwardedTimestamp = routingPopupRoute?.createdAt ? new Date(routingPopupRoute.createdAt) : null;
  const routingPopupForwardedAt = forwardedTimestamp && !Number.isNaN(forwardedTimestamp.getTime())
    ? new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(forwardedTimestamp)
    : undefined;
  const routingPopupForwardedBy = routingPopupRoute
    ? users.find(user => user.id === routingPopupRoute.fromUserId)?.fullName || routingPopupRoute.fromUser
    : undefined;
  const routingPopupAttachments = routingPopupDocument
    ? (routingPopupDocument.attachments || []).filter(file => isSharedDocumentFile(file, routingPopupDocument, auditLogs))
    : [];
  const openPopupAttachment = (attachment: DocumentAttachment) => {
    if (!attachment.url) return;
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  };
  const downloadPopupAttachment = (attachment: DocumentAttachment) => {
    if (!attachment.url) return;
    const link = window.document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const closeRoutingActionPopup = () => {
    if (routingPopup?.id.startsWith('approval-popup-')) {
      const key = routingPopupSnoozeKey(currentUser.id, routingPopup.id.slice('approval-popup-'.length));
      const closedAt = Date.now();
      closedApprovalPopupIds.current.set(key, closedAt);
      try { localStorage.setItem(key, String(closedAt)); } catch { /* Keep the session snooze. */ }
    }
    setRoutingPopup(null);
  };
  const userPendingCount = documents.filter((document) => {
    if (document.currentStatus !== 'PENDING') return false;
    if (
    document.assignedUserId === currentUser.id)
    {
      return true;
    }

    const latestRouteTime = document.routes?.at(-1)?.createdAt;
    return Boolean(
      latestRouteTime &&
      document.routes.
      filter((route) => route.createdAt === latestRouteTime).
      some(
        (route) => route.toUserId === currentUser.id
      )
    );
  }).length;
  return (
    <ThemeProvider theme={muiTheme}>
      <GlobalStyles styles={muiGlobalCss} />
      <GlobalStyles styles={createSharedAppStyles(muiTheme)} />
      <AppDialogHost />
      <GlobalInputAutocomplete />
      <Suspense fallback={<ViewLoadingFallback />}>
      <div
        className={`${design.system} ${cx(`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white ${isDarkMode ? 'dark' : ''}`)}`}>
        
        {/* Top Bar Header */}
        {/* Global search receives every document. Transaction access remains
                 restricted inside DocumentDetailModal. */}
        <Header
          currentUser={currentUser}
          users={users}
          documents={accessibleDocuments}
          notifications={notifications}
          onOpenCreateDoc={() => setIsCreateModalOpen(true)}
          onLogout={handleLogout}
          onSearchDoc={(query) => {
            if (query.trim()) {
              setSearchQuery(query.trim());
              setActiveView(
                (query.trim().toUpperCase().includes('OUT') ||
                  /^BLGFR2-\d{4}-\d{2}-OUT-\d+/i.test(query.trim()))
                  ? 'outgoing'
                  : 'incoming',
              );
            }
          }}
          onSelectDoc={(doc) => {
            setFullFlowDocumentId(doc.id);
            setSelectedDoc(doc);
          }}
          onOpenNotifications={() => setIsNotifDrawerOpen(true)}
          activeView={activeView}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          onOpenMobileSidebar={() => {
            setIsSidebarCollapsed(false);
            setIsMobileSidebarOpen(true);
          }}
          isOnline={isOnline} />
        

        {/* Main App Layout */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {isMobileSidebarOpen &&
          <Backdrop
            open
            onClick={() => setIsMobileSidebarOpen(false)}
            sx={{ display: { md: 'none' }, zIndex: 45, backdropFilter: 'blur(2px)', bgcolor: 'rgba(2,6,23,.64)' }} />

          }
          {/* Left Navigation Sidebar */}
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            currentUser={currentUser}
            pendingCount={userPendingCount}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)} />
          

          {/* Content Area */}
          <Box component="main" className={cx("app-content")} sx={{ minWidth: 0, flex: 1, width: '100%', maxWidth: 1600, mx: 'auto', px: { xs: 1.5, sm: 2.5, lg: 3.5 }, pt: { xs: 1.5, sm: 2.5 }, pb: 7, overflowY: 'auto', bgcolor: 'background.default' }}>
            <Suspense fallback={<ViewLoadingFallback />}>
            {/* Dashboard View */}
            {activeView === 'dashboard' &&
            <DashboardView
              stats={stats}
              documents={accessibleDocuments}
              currentUser={currentUser}
              users={users}
              isOnline={isOnline}
              onSelectDoc={(doc) => setSelectedDoc(doc)}
              onOpenCreateDoc={() => setIsCreateModalOpen(true)}
              onNavigateToView={(v) => setActiveView(v)}
              onReapproveDocument={handleReapproveDocument}
              onSendRoutingReminder={handleSendRoutingReminder}
              auditLogs={auditLogs} />

            }

            {activeView === 'routing-followup' &&
            <RoutingFollowUpView
              documents={accessibleDocuments}
              auditLogs={auditLogs}
              users={users}
              currentUser={currentUser}
              onSelectDoc={(document) => setSelectedDoc(document)}
              onSendReminder={handleSendRoutingReminder} />

            }

            {activeView === 'incoming-report' &&
            <IncomingReportView
              documents={accessibleDocuments}
              envelopeLogs={envelopeLogs}
              auditLogs={auditLogs} />

            }
            {activeView === 'outgoing-report' &&
            <OutgoingReportView
              documents={accessibleDocuments}
              envelopeLogs={envelopeLogs}
              auditLogs={auditLogs} />

            }
            {activeView === 'envelope-report' &&
            <EnvelopeReportView
              documents={accessibleDocuments}
              envelopeLogs={envelopeLogs}
              auditLogs={auditLogs} />

            }

            {/* Incoming Documents View */}
            {activeView === 'incoming' &&
            <DocumentListView
              documents={accessibleDocuments}
              initialDirection="INCOMING"
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              onSelectDoc={(doc) => setSelectedDoc(doc)}
              onOpenRouteDoc={(doc) => setRouteModalDoc(doc)}
              onOpenCreateDoc={() => setIsCreateModalOpen(true)}
              onPrintSlip={(doc) => {
                setSlipSelectedDoc(doc);
                setActiveView('slip');
              }}
              onDeleteDoc={handleDeleteDocument}
              currentUser={currentUser} />

            }

            {/* Outgoing Documents View */}
            {activeView === 'outgoing' &&
            <DocumentListView
              documents={accessibleDocuments}
              initialDirection="OUTGOING"
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              onSelectDoc={(doc) => setSelectedDoc(doc)}
              onOpenRouteDoc={(doc) => setRouteModalDoc(doc)}
              onOpenCreateDoc={() => setIsCreateModalOpen(true)}
              onPrintSlip={(doc) => {
                setSlipSelectedDoc(doc);
                setActiveView('slip');
              }}
              onDeleteDoc={handleDeleteDocument}
              currentUser={currentUser} />

            }

            {/* Official Document Routing Slip */}
            {activeView === 'slip' &&
            (
            currentUser.permissions ||
            DEFAULT_ROLE_PERMISSIONS[currentUser.role]).
            allowedViews.includes('slip') &&
            <DocumentSlipView
              document={slipSelectedDoc}
              documents={accessibleDocuments}
              currentUser={currentUser}
              users={users}
              onSelectDocument={(doc) => setSlipSelectedDoc(doc)}
              onBack={() => setActiveView('incoming')} />

            }

            {/* Outgoing Envelope View */}
            {activeView === 'envelope' &&
            <OutgoingEnvelopeView
              document={null}
              documents={documents}
              currentUser={currentUser}
              onBack={() => setActiveView('outgoing')}
              onLogDispatch={async (details, trackingNumber) => {
                const log = await api.createEnvelopeLog({
                  userId: currentUser.id,
                  userName: currentUser.fullName,
                  userRole: currentUser.role,
                  action: 'ENVELOPE_LOG',
                  documentTrackingNumber: trackingNumber,
                  details
                });
                setEnvelopeLogs((prev) => [log, ...prev]);
              }} />

            }

            {/* QR Code Generator View */}
            {activeView === 'qr' && <QRCodeGeneratorView />}

            {/* Employee Profiles Directory */}
            {activeView === 'employees' &&
            <EmployeeProfilesView currentUser={currentUser} />
            }

            {/* Detailed Audit Logs */}
            {activeView === 'audit' && <AuditLogsView auditLogs={auditLogs} />}
            {activeView === 'envelope-logs' &&
            <AuditLogsView
              auditLogs={envelopeLogs}
              title="Outgoing Envelope Dispatch Logs"
              subtitle="Separate record of every outgoing envelope dispatch, Document Route No., releasing user, and recipient details" />

            }

            {/* User Account & Profile Settings */}
            {activeView === 'settings' &&
            <UserSettingsView
              currentUser={currentUser}
              onUpdateUser={handleSelfUpdateUser} />

            }
            {/* User Management */}
            {activeView === 'users' &&
            <UserManagementView
              users={users}
              divisions={divisions}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={async (id: string) => {
                await api.deleteUser(id);
                setUsers((prev) => prev.filter((u) => u.id !== id));
              }}
              currentUser={currentUser}
              onCreateDivision={async (division) => {
                const created = await api.createDivision(division);
                setDivisions((previous) => [...previous, created]);
              }}
              onUpdateDivision={async (id, division) => {
                const updated = await api.updateDivision(id, division);
                setDivisions((previous) =>
                previous.map((item) => item.id === id ? updated : item)
                );
              }}
              onDeleteDivision={async (id) => {
                await api.deleteDivision(id);
                setDivisions((previous) =>
                previous.filter((item) => item.id !== id)
                );
              }} />

            }
            </Suspense>
          </Box>
        </Box>

        <footer className={cx("app-footer fixed inset-x-0 bottom-0 z-40 flex h-7 items-center justify-center border-t border-blue-900 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 text-[10px] font-medium text-slate-300")}>
          DOF · BLGF REGION II · Document Tracking System
        </footer>

        {/* MODALS */}
        {/* Detail Modal */}
        <DocumentDetailModal
          key={selectedDoc?.id || 'closed'}
          document={selectedDoc}
          showFullFlow={Boolean(selectedDoc && selectedDoc.id === fullFlowDocumentId)}
          onClose={() => {
            setSelectedDoc(null);
            setFullFlowDocumentId(null);
          }}
          onOpenRouteDoc={(doc) => setRouteModalDoc(doc)}
          onPrintSlip={(doc) => {
            setSelectedDoc(null);
            setFullFlowDocumentId(null);
            setSlipSelectedDoc(doc);
            setActiveView('slip');
          }}
          onDeleteDoc={handleDeleteDocument}
          currentUser={currentUser}
          users={users}
          auditLogs={auditLogs}
          onRefreshDocument={loadBackendData} />
        

        {/* Create Document Modal */}
        <CreateDocumentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateDocument}
          currentUser={currentUser}
          existingDocuments={documents}
          existingRouteNumbers={documents.
          map((document) => document.routeNo).
          filter((routeNo): routeNo is string => Boolean(routeNo))}
          initialDirection={activeView === 'outgoing' ? 'OUTGOING' : 'INCOMING'} />
        

        {/* Route Document Modal */}
        <RouteDocumentModal
          document={routeModalDoc}
          isOpen={!!routeModalDoc}
          onClose={() => setRouteModalDoc(null)}
          onSubmit={handleRouteDocument}
          currentUser={currentUser}
          users={users} />
        

        <Dialog open={Boolean(targetDatePopup)} maxWidth="xs" fullWidth aria-labelledby="target-date-popup-title" slotProps={{ backdrop: { sx: { backdropFilter: 'blur(6px)' } } }}>
          {targetDatePopup && <>
            <DialogTitle id="target-date-popup-title" sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.dark', fontWeight: 900 }}>!</Avatar>
                <Box><Typography variant="overline" color="warning.dark" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Deadline alert</Typography><Typography variant="h6">Target completion date reached</Typography></Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Alert severity="warning" icon={false} sx={{ mb: 2 }}>
                This document has reached its target completion date and may require immediate action.
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: .75 }}>
                <Typography variant="caption" color="primary" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>{targetDatePopup.routeNo}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{targetDatePopup.title}</Typography>
                <Typography variant="body2" color="text.secondary">Target date: <strong>{new Date(targetDatePopup.targetCompletionDate).toLocaleString()}</strong></Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button
                color="inherit"
                onClick={() => acknowledgeTargetDate(targetDatePopup)}>
                Acknowledge
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  const document = targetDatePopup;
                  acknowledgeTargetDate(document);
                  setSelectedDoc(document);
                  setActiveView(
                    document.direction === 'OUTGOING' ?
                    'outgoing' :
                    'incoming'
                  );
                }}>
                Review document
              </Button>
            </DialogActions>
          </>}
        </Dialog>

        {/* SIMPLE NOTICES: shared MUI dialog layout and responsive actions. */}
        <Dialog open={Boolean(alertPopup)} onClose={()=>setAlertPopup(null)} fullWidth maxWidth="xs" aria-labelledby="alert-popup-title">
          <DialogTitle id="alert-popup-title">{/fail|error|unable|invalid|required|cannot|duplicate/i.test(alertPopup || '')?'Action unsuccessful':'Notice'}</DialogTitle>
          <DialogContent><Typography sx={{fontSize:15,lineHeight:1.7,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{alertPopup}</Typography></DialogContent>
          <DialogActions><Button autoFocus variant="contained" onClick={()=>setAlertPopup(null)}>Done</Button></DialogActions>
        </Dialog>
        <Dialog open={Boolean(successPopup)} onClose={()=>setSuccessPopup(null)} fullWidth maxWidth="xs" aria-labelledby="success-popup-title">
          <DialogTitle id="success-popup-title">Routing successful</DialogTitle>
          <DialogContent><Alert severity="success" sx={{'& .MuiAlert-message':{overflowWrap:'anywhere',whiteSpace:'pre-wrap',fontSize:15}}}>{successPopup}</Alert></DialogContent>
          <DialogActions><Button autoFocus variant="contained" onClick={()=>setSuccessPopup(null)}>Done</Button></DialogActions>
        </Dialog>

        {reminderPopup &&
        <ModalLayer onClose={() => { closedReminderPopupIds.current.add(reminderPopup.id); setReminderPopup(null); }}>
          <div className={cx("fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm")}>
            <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="routing-reminder-title"
            className={cx("modal-reminder-panel w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900")}>
            
              <div className="modal-reminder-header">
                <div className={cx("text-xs font-bold uppercase tracking-wider text-amber-100")}>
                  Action Reminder
                </div>
                <h2 id="routing-reminder-title" className={cx("mt-1 text-lg font-extrabold")}>
                  {reminderPopup.title}
                </h2>
              </div>
              <div className="modal-reminder-content">
                <p className={cx("text-sm leading-relaxed text-slate-700 dark:text-slate-200")}>
                  {reminderPopup.message}
                </p>
                <div className={cx("mt-4 grid gap-2 sm:grid-cols-2")}>
                  <div className={cx("rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800")}>
                    <div className={cx("text-xs font-bold uppercase tracking-wide text-slate-400")}>Reminder From</div>
                    <div className={cx("mt-1 text-sm font-extrabold text-slate-800 dark:text-slate-100")}>
                      {reminderPopup.reminderSenderName || 'Document routing officer'}
                    </div>
                  </div>
                  <div className={cx("rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30")}>
                    <div className={cx("text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400")}>Required Action</div>
                    <div className={cx("mt-1 text-sm font-extrabold text-amber-900 dark:text-amber-200")}>
                      {reminderPopup.reminderActionRequested || 'Appropriate Action'}
                    </div>
                  </div>
                </div>
                {reminderPopup.trackingNumber &&
              <div className={cx("mt-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800")}>
                    <div className={cx("text-xs font-bold uppercase tracking-wide text-slate-400")}>Document Route No.</div>
                    <div className={cx("mt-1 font-mono text-sm font-extrabold text-blue-700 dark:text-blue-300")}>{reminderPopup.trackingNumber}</div>
                  </div>
              }
                <div className={cx("mt-5 grid grid-cols-2 gap-2")}>
                  <Button
                  type="button"
                  onClick={() => {
                    if (reminderPopup.trackingNumber) {
                      const document = accessibleDocuments.find(
                        (candidate) =>
                        candidate.routeNo === reminderPopup.trackingNumber ||
                        candidate.trackingNumber === reminderPopup.trackingNumber
                      );
                      if (document) setSelectedDoc(document);
                    }
                    closedReminderPopupIds.current.add(reminderPopup.id);
                    setReminderPopup(null);
                  }}
                  className={cx("rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-500")}>
                  
                    View Document
                  </Button>
                  <Button
                  type="button"
                  onClick={() => {
                    closedReminderPopupIds.current.add(reminderPopup.id);
                    setReminderPopup(null);
                  }}
                  className={cx("rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200")}>
                  
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ModalLayer>
        }

        {/* ROUTING NOTIFICATION: compact header, readable facts, fixed action footer. */}
        {routingPopup && <ModalLayer onClose={closeRoutingActionPopup}>
          <Box sx={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',p:{xs:1.5,sm:3},bgcolor:'rgba(24,24,27,.5)'}}>
            <Box role="dialog" aria-modal="true" aria-labelledby="routing-popup-title" sx={{width:'100%',maxWidth:600,maxHeight:'calc(100dvh - 32px)',display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:3,border:'1px solid',borderColor:'divider',bgcolor:'background.paper',color:'text.primary',boxShadow:24}}>
              <Box component="header" sx={{display:'flex',alignItems:'center',gap:1.5,p:2.5,borderBottom:'1px solid',borderColor:'divider'}}>
                <Box aria-hidden="true" sx={{width:40,height:40,flexShrink:0,display:'grid',placeItems:'center',borderRadius:2,bgcolor:'action.hover',fontSize:20,fontWeight:700}}>{routingPopup.decisionStatus==='APPROVED'?'✓':routingPopup.decisionStatus==='DISAPPROVED'?'×':'→'}</Box>
                <Box sx={{flex:1,minWidth:0}}>
                  <Typography id="routing-popup-title" component="h2" sx={{fontSize:20,fontWeight:700,lineHeight:1.4}}>{routingPopup.title}</Typography>
                  <Typography sx={{fontSize:14,color:'text.secondary',mt:0.5}}>{routingPopup.decisionStatus ? 'Decision: '+routingPopup.decisionStatus.toLowerCase() : 'Review the document and requested action.'}</Typography>
                </Box>
                <Button onClick={closeRoutingActionPopup} aria-label="Close notification" sx={{'&&':{minWidth:44,minHeight:44,p:0,color:'text.secondary',fontSize:24}}}>×</Button>
              </Box>
              <Box sx={{p:{xs:2,sm:3},minHeight:0,overflowY:'auto'}}>
                <Typography sx={{fontSize:13,color:'text.secondary'}}>Document tracking number</Typography>
                <Typography sx={{fontFamily:'monospace',fontSize:15,mt:0.5,overflowWrap:'anywhere'}}>{routingPopupDocument?.routeNo || routingPopup.trackingNumber || 'Not recorded'}</Typography>
                <Typography component="h3" sx={{fontSize:20,fontWeight:650,lineHeight:1.5,mt:1.5,mb:2,overflowWrap:'anywhere'}}>{routingPopupDocument?.title || routingPopup.message}</Typography>
                <Box component="dl" sx={{m:0,display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2,py:2,borderTop:'1px solid',borderColor:'divider'}}>
                  {[['Last forwarded to you by',routingPopupForwardedBy],['Date & time forwarded (Philippine time)',routingPopupForwardedAt],['Forwarding office',routingPopupRoute?.fromDivision],['Original sender',routingPopupDocument?.senderName],['Originating office',routingPopupDocument?.originatingOffice]].map(([label,value])=><Box key={label} sx={{minWidth:0}}><Typography component="dt" sx={{fontSize:13,color:'text.secondary'}}>{label}</Typography><Typography component="dd" sx={{m:0,mt:0.5,fontSize:15,overflowWrap:'anywhere'}}>{value || 'Not recorded'}</Typography></Box>)}
                </Box>
                <Box sx={{p:2,bgcolor:'action.hover',borderRadius:2,mb:2.5}}>
                  <Typography sx={{fontSize:13,color:'text.secondary'}}>Action requested</Typography>
                  <Typography sx={{fontSize:16,fontWeight:650,mt:0.5,overflowWrap:'anywhere'}}>{routingPopupDocument?.actionRequested || 'Appropriate Action'}</Typography>
                </Box>
                <Typography component="h3" sx={{fontSize:16,fontWeight:650,mb:1}}>Attachments ({routingPopupAttachments.length})</Typography>
                {routingPopupAttachments.length ? <Box component="ul" sx={{listStyle:'none',m:0,p:0}}>{routingPopupAttachments.map(attachment=><Box component="li" key={attachment.id} sx={{py:1.5,borderTop:'1px solid',borderColor:'divider'}}>
                  <Typography sx={{fontSize:15,fontWeight:600,lineHeight:1.5,overflowWrap:'anywhere'}}>{attachment.fileName}</Typography>
                  <Typography sx={{fontSize:13,color:'text.secondary',mt:0.5}}>{attachment.fileSize || 'Attached document'}</Typography>
                  <Box sx={{display:'flex',flexWrap:'wrap',gap:1,mt:1}}>
                    <Button variant="outlined" disabled={!attachment.url} onClick={()=>openPopupAttachment(attachment)} aria-label={`View ${attachment.fileName}`} sx={{minHeight:44,textTransform:'none'}}>View</Button>
                    <Button variant="outlined" disabled={!attachment.url} onClick={()=>downloadPopupAttachment(attachment)} aria-label={`Download ${attachment.fileName}`} sx={{minHeight:44,textTransform:'none'}}>Download</Button>
                  </Box>
                </Box>)}</Box> : <Typography sx={{fontSize:14,color:'text.secondary',py:1}}>No attachments included.</Typography>}
              </Box>
              <Box component="footer" sx={{p:2,display:'flex',flexWrap:'wrap',gap:1.25,borderTop:'1px solid',borderColor:'divider',bgcolor:'background.paper'}}>
                {routingPopup.requiresDecision && <>
                  <Button variant="contained" color="success" disabled={decisionSubmittingId===routingPopup.id} onClick={()=>handleRouteDecision(routingPopup,'APPROVED')} sx={{flex:1,minHeight:46,fontSize:15,textTransform:'none',boxShadow:'none'}}>{decisionSubmittingId===routingPopup.id?'Saving...':'Approve'}</Button>
                  <Button variant="outlined" color="error" disabled={decisionSubmittingId===routingPopup.id} onClick={()=>handleRouteDecision(routingPopup,'DISAPPROVED')} sx={{flex:1,minHeight:46,fontSize:15,textTransform:'none'}}>Disapprove</Button>
                </>}
                <Button onClick={closeRoutingActionPopup} sx={{minHeight:46,fontSize:15,textTransform:'none'}}>Close for 24 hours</Button>
              </Box>
            </Box>
          </Box>
        </ModalLayer>}

        {/* Notification Drawer */}
        <NotificationDrawer
          isOpen={isNotifDrawerOpen}
          onClose={() => setIsNotifDrawerOpen(false)}
          notifications={notifications}
          onMarkRead={handleMarkNotifRead}
          onDecision={handleRouteDecision}
          decisionSubmittingId={decisionSubmittingId}
          onSelectDoc={(trackingNo) => {
            const found = accessibleDocuments.find(
              (d) => d.routeNo === trackingNo
            );
            if (found) setSelectedDoc(found);
          }} />
        
      </div>
      </Suspense>
    </ThemeProvider>);

}
