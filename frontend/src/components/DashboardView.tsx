// DashboardView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import {
  Box,
  Button,
  ButtonBase,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { cx } from "../styles/muiClasses";
import React from "react";
import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Building2,
  ChevronLeft,
  ChevronRight,
  Printer,
  X,
  Wifi,
  WifiOff,
  BellRing,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  DashboardStats,
  DocumentRecord,
  DocumentRouteStep,
  AuditLog,
  User,
  DEFAULT_ROLE_PERMISSIONS,
} from "../types";
import { STATUS_CONFIGS, formatDate } from "../utils/statusUtils";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
type GroupedRouteTransaction = DocumentRouteStep & {
  toDivisions: string[];
  toUsers: string[];
};

const groupRouteTransactions = (document: DocumentRecord) =>
  [...(document.routes || [])]
    .sort((a, b) => {
      const timeDifference =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return timeDifference || a.stepNumber - b.stepNumber;
    })
    .reduce<GroupedRouteTransaction[]>((transactions, route) => {
      const existing = transactions.find(
        (transaction) =>
          transaction.createdAt === route.createdAt &&
          transaction.fromUserId === route.fromUserId &&
          transaction.routeNo === route.routeNo &&
          transaction.actionRequested === route.actionRequested,
      );
      if (existing) {
        if (!existing.toDivisions.includes(route.toDivision)) {
          existing.toDivisions.push(route.toDivision);
        }
        if (route.toUser && !existing.toUsers.includes(route.toUser)) {
          existing.toUsers.push(route.toUser);
          existing.toUser = existing.toUsers.join(", ");
        }
        return transactions;
      }
      transactions.push({
        ...route,
        toDivisions: route.toDivision ? [route.toDivision] : [],
        toUsers: route.toUser ? [route.toUser] : [],
      });
      return transactions;
    }, []);

const getRouteDecision = (route: DocumentRouteStep) => {
  const text =
    `${route.actionRequested || ""} ${route.remarks || ""}`.toUpperCase();
  if (text.includes("DISAPPROVED")) return "DISAPPROVED";
  if (text.includes("APPROVED")) return "APPROVED";
  return undefined;
};

interface DashboardViewProps {
  stats: DashboardStats;
  documents: DocumentRecord[];
  currentUser: User;
  users: User[];
  isOnline: boolean;
  onSelectDoc: (doc: DocumentRecord) => void;
  onOpenCreateDoc: () => void;
  onNavigateToView: (view: string) => void;
  onReapproveDocument: (document: DocumentRecord) => void;
  onSendRoutingReminder: (
    document: DocumentRecord,
    route: DocumentRouteStep,
  ) => void;
  auditLogs: AuditLog[];
}

// LOGIC: State, events, at pagproseso ng data.
export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  documents: allDocuments,
  currentUser,
  users,
  isOnline,
  onSelectDoc,
  onOpenCreateDoc,
  onNavigateToView,
  onReapproveDocument,
  onSendRoutingReminder,
  auditLogs,
}) => {
  const [selectedCard, setSelectedCard] = React.useState<
    | "incoming"
    | "outgoing"
    | "inProgress"
    | "pending"
    | "completed"
    | "returned"
    | null
  >(null);
  const [isUserStatusOpen, setIsUserStatusOpen] = React.useState(false);
  const [transactionPage, setTransactionPage] = React.useState(1);
  const perms =
    currentUser.permissions ||
    DEFAULT_ROLE_PERMISSIONS[currentUser.role] ||
    DEFAULT_ROLE_PERMISSIONS.STAFF;
  const canAccessDocumentSlip = (perms.allowedViews || []).includes("slip");
  const canViewDivisionWorkload = (perms.allowedViews || []).includes(
    "division-workload",
  );
  const canViewRoutingMonitor =
    currentUser.role === "SYSTEM_ADMIN" ||
    (perms.allowedActions || []).includes("ROUTING_MONITOR_VIEW");
  const canSendRoutingReminder =
    currentUser.role === "SYSTEM_ADMIN" ||
    (perms.allowedActions || []).includes("ROUTING_REMINDER_SEND");
  const documents = allDocuments;
  const resolveUserName = (userId?: string, legacyName?: string) =>
    users.find((user) => user.id === userId)?.fullName || legacyName || "";
  const normalizedUserName = currentUser.fullName.trim().toLowerCase();
  const recentTransactions =
    currentUser.role === "SYSTEM_ADMIN"
      ? documents
      : documents.filter((document) => {
          const isDocumentOwnerOrHandler =
            document.createdByUserId === currentUser.id ||
            document.assignedUserId === currentUser.id ||
            document.createdBy?.trim().toLowerCase() === normalizedUserName ||
            document.assignedUser?.trim().toLowerCase() === normalizedUserName;
          const isRoutingParticipant = (document.routes || []).some(
            (route) =>
              route.fromUserId === currentUser.id ||
              route.toUserId === currentUser.id ||
              route.fromUser?.trim().toLowerCase() === normalizedUserName ||
              route.toUser?.trim().toLowerCase() === normalizedUserName,
          );
          return isDocumentOwnerOrHandler || isRoutingParticipant;
        });
  const transactionsPerPage = 5;
  const transactionPageCount = Math.max(
    1,
    Math.ceil(recentTransactions.length / transactionsPerPage),
  );
  React.useEffect(() => {
    setTransactionPage((page) => Math.min(page, transactionPageCount));
  }, [transactionPageCount]);
  const paginatedTransactions = recentTransactions.slice(
    (transactionPage - 1) * transactionsPerPage,
    transactionPage * transactionsPerPage,
  );
  const getLatestDocumentDecision = (
    document: DocumentRecord,
    actorId?: string,
  ) => {
    const actorName = actorId === currentUser.id ? normalizedUserName : "";
    const routeDecisions = (document.routes || [])
      .map((route) => ({
        status: getRouteDecision(route),
        actorId: route.fromUserId,
        actorName: resolveUserName(route.fromUserId, route.fromUser)
          .trim()
          .toLowerCase(),
        timestamp: route.createdAt,
      }))
      .filter(
        (decision) =>
          Boolean(decision.status) &&
          (!actorId ||
            decision.actorId === actorId ||
            decision.actorName === actorName),
      );
    const auditDecisions = auditLogs
      .filter(
        (log) =>
          (log.documentTrackingNumber === document.trackingNumber ||
            log.documentTrackingNumber === document.routeNo) &&
          /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details) &&
          (!actorId ||
            log.userId === actorId ||
            log.userName.trim().toLowerCase() === actorName),
      )
      .map((log) => ({
        status: log.details
          .match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]
          .toUpperCase() as "APPROVED" | "DISAPPROVED",
        actorId: log.userId,
        actorName: log.userName.trim().toLowerCase(),
        timestamp: log.timestamp,
      }));
    return [...routeDecisions, ...auditDecisions].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];
  };
  const myDisapprovedTransactions = documents.filter(
    (document) => getLatestDocumentDecision(document)?.status === "DISAPPROVED",
  );
  const canReapproveDocument = (document: DocumentRecord) =>
    getLatestDocumentDecision(document, currentUser.id)?.status ===
    "DISAPPROVED";

  const urgentDocs = documents.filter(
    (d) =>
      (d.priority === "URGENT" || d.priority === "VERY_URGENT") &&
      d.currentStatus !== "COMPLETED",
  );
  const cardDocuments = selectedCard
    ? selectedCard === "returned"
      ? myDisapprovedTransactions
      : documents.filter((document) => {
          if (selectedCard === "incoming")
            return document.direction === "INCOMING";
          if (selectedCard === "outgoing")
            return document.direction === "OUTGOING";
          if (selectedCard === "inProgress")
            return document.currentStatus === "IN_PROGRESS";
          if (selectedCard === "pending")
            return document.currentStatus === "PENDING";
          if (selectedCard === "completed")
            return document.currentStatus === "COMPLETED";
          return false;
        })
    : [];
  const cardTitle = {
    incoming: "Incoming Documents",
    outgoing: "Outgoing Documents",
    inProgress: "In Progress",
    pending: "Pending Received",
    completed: "Completed",
    returned: "Disapproved Documents",
  }[selectedCard || "pending"];
  const visibleStats = {
    totalIncoming: documents.filter(
      (document) => document.direction === "INCOMING",
    ).length,
    totalOutgoing: documents.filter(
      (document) => document.direction === "OUTGOING",
    ).length,
    inProgressCount: documents.filter(
      (document) => document.currentStatus === "IN_PROGRESS",
    ).length,
    pendingCount: documents.filter(
      (document) => document.currentStatus === "PENDING",
    ).length,
    completedCount: documents.filter(
      (document) => document.currentStatus === "COMPLETED",
    ).length,
    returnedCount: myDisapprovedTransactions.length,
  };
  const pendingRoutingItems = [
    ...new Map(
      documents
        .flatMap((document) =>
          (document.routes || [])
            .filter(
              (route) =>
                route.toUserId &&
                !getRouteDecision(route) &&
                document.currentStatus !== "COMPLETED",
            )
            .map((route) => ({ document, route })),
        )
        .filter(({ document, route }) => {
          const assignedAt = new Date(route.createdAt).getTime();
          const handlerName = resolveUserName(route.toUserId, route.toUser)
            .trim()
            .toLowerCase();
          const hasLaterAction = (document.routes || []).some(
            (candidate) =>
              new Date(candidate.createdAt).getTime() > assignedAt &&
              (candidate.fromUserId === route.toUserId ||
                resolveUserName(candidate.fromUserId, candidate.fromUser)
                  .trim()
                  .toLowerCase() === handlerName),
          );
          const hasAuditedAction = auditLogs.some(
            (log) =>
              (log.documentTrackingNumber === document.trackingNumber ||
                log.documentTrackingNumber === document.routeNo) &&
              new Date(log.timestamp).getTime() > assignedAt &&
              (log.userId === route.toUserId ||
                log.userName.trim().toLowerCase() === handlerName) &&
              ["ROUTE_DOC", "TRANSFER_DOC", "UPDATE_STATUS"].includes(
                log.action,
              ),
          );
          return !hasLaterAction && !hasAuditedAction;
        })
        .sort(
          (first, second) =>
            new Date(first.route.createdAt).getTime() -
            new Date(second.route.createdAt).getTime(),
        )
        .map((item) => [`${item.document.id}:${item.route.toUserId}`, item]),
    ).values(),
  ].sort(
    (first, second) =>
      new Date(first.route.createdAt).getTime() -
      new Date(second.route.createdAt).getTime(),
  );

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      {
        <Box className={cx("dashboard-view space-y-3 md:space-y-6")} sx={{ display: "grid", gap: 2.5, "& > *": { minWidth: 0 } }}>
          <div
            className={cx(
              "dashboard-hero relative overflow-hidden rounded-xl border border-slate-100 bg-white p-3.5 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white md:p-5",
            )}
          >
            <div
              className={cx(
                "relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4",
              )}
            >
              <div>
                <div
                  className={cx(
                    "flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-bold text-[10px] tracking-wider uppercase mb-1",
                  )}
                >
                  <Building2 className={cx("w-3.5 h-3.5")} />
                  <span>
                    Bureau of Local Government Finance &bull; Region II
                    Monitoring Center
                  </span>
                </div>
                <h2
                  className={cx(
                    "text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white",
                  )}
                >
                  Document overview
                </h2>
                <p
                  className={cx(
                    "text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl font-medium",
                  )}
                >
                  Track documents, monitor routing, and keep work moving.
                </p>
              </div>
              <Box
                className={cx(
                  "dashboard-hero-actions flex items-center space-x-2.5",
                )}
               sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  onClick={onOpenCreateDoc}
                  className={cx(
                    "bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95",
                  )}
                >
                  <FileText className={cx("w-4 h-4")} />
                  <span>Log New Document </span>
                </Button>
                {canAccessDocumentSlip && (
                  <Button
                    type="button"
                    onClick={() => onNavigateToView("slip")}
                    variant="outlined"
                    className={cx(
                      "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-2 transition-all",
                    )}
                  >
                    <Printer className={cx("w-4 h-4")} />
                    <span>Document Slip</span>
                  </Button>
                )}
              </Box>
            </div>
          </div>

          {urgentDocs.length > 0 && (
            <div
              className={cx(
                "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl p-3 flex items-center justify-between shadow-xs",
              )}
            >
              <div className={cx("flex items-center space-x-3")}>
                <span
                  className={cx(
                    "p-2 bg-rose-600 text-white rounded-lg animate-pulse shrink-0",
                  )}
                >
                  <AlertTriangle className={cx("w-4 h-4")} />
                </span>
                <div>
                  <span
                    className={cx(
                      "font-bold text-xs md:text-sm text-rose-950 dark:text-rose-100",
                    )}
                  >
                    {urgentDocs.length} Urgent Document(s) Require Immediate
                    Action!
                  </span>
                  <p
                    className={cx(
                      "text-[11px] text-rose-700 dark:text-rose-300 hidden sm:block font-medium",
                    )}
                  >
                    Top Priority: {urgentDocs[0]?.title} (
                    {urgentDocs[0]?.routeNo})
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => onNavigateToView("incoming")}
                className={cx(
                  "text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shrink-0 shadow-xs",
                )}
              >
                <span>View Urgent</span>
                <ChevronRight className={cx("w-3.5 h-3.5")} />
              </Button>
            </div>
          )}

          <Box
            className={cx(
              "dashboard-stat-grid grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-6",
            )}
           sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" }, gap: 1.5 }}>
            <ButtonBase
              onClick={() => setSelectedCard("incoming")}
              sx={{ display: 'block', textAlign: 'left', width: '100%', p: 2.25, minHeight: 128, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: 'text.secondary', boxShadow: '0 4px 14px rgba(24,24,27,.05)' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 3 }, '& > div:nth-of-type(2)': { fontSize: 30, fontWeight: 650, color: 'text.primary', mt: 1 }, '& > div:last-child': { fontSize: 11, color: 'text.secondary' } }}
              className={cx(
                "dashboard-stat-card min-h-[102px] cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-slate-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:min-h-[104px] md:p-4",
              )}
            >
              <div
                className={cx(
                  "flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider",
                )}
              >
                <span>Incoming Docs</span>
                <ArrowDownLeft
                  className={cx("w-4 h-4 text-slate-600 dark:text-slate-400")}
                />
              </div>
              <div
                className={cx(
                  "text-2xl font-extrabold mt-1 text-slate-900 dark:text-white",
                )}
              >
                {visibleStats.totalIncoming}
              </div>
              <div
                className={cx(
                  "mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium",
                )}
              >
                Received in Region II
              </div>
            </ButtonBase>
            <ButtonBase
              onClick={() => setSelectedCard("outgoing")}
              sx={{ display: 'block', textAlign: 'left', width: '100%', p: 2.25, minHeight: 128, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: 'text.secondary', boxShadow: '0 4px 14px rgba(24,24,27,.05)' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 3 }, '& > div:nth-of-type(2)': { fontSize: 30, fontWeight: 650, color: 'text.primary', mt: 1 }, '& > div:last-child': { fontSize: 11, color: 'text.secondary' } }}
              className={cx(
                "dashboard-stat-card min-h-[102px] cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-slate-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:min-h-[104px] md:p-4",
              )}
            >
              <div
                className={cx(
                  "flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider",
                )}
              >
                <span>Outgoing Docs</span>
                <ArrowUpRight
                  className={cx("w-4 h-4 text-slate-600 dark:text-slate-400")}
                />
              </div>
              <div
                className={cx(
                  "text-2xl font-extrabold mt-1 text-slate-900 dark:text-white",
                )}
              >
                {visibleStats.totalOutgoing}
              </div>
              <div
                className={cx(
                  "mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium",
                )}
              >
                Released / Forwarded
              </div>
            </ButtonBase>
            <ButtonBase
              onClick={() => setSelectedCard("inProgress")}
              sx={{ display: 'block', textAlign: 'left', width: '100%', p: 2.25, minHeight: 128, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: 'text.secondary', boxShadow: '0 4px 14px rgba(24,24,27,.05)' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 3 }, '& > div:nth-of-type(2)': { fontSize: 30, fontWeight: 650, color: 'text.primary', mt: 1 }, '& > div:last-child': { fontSize: 11, color: 'text.secondary' } }}
              className={cx(
                "dashboard-stat-card min-h-[102px] cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-slate-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:min-h-[104px] md:p-4",
              )}
            >
              <div
                className={cx(
                  "flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider",
                )}
              >
                <span>In Progress</span>
                <Clock
                  className={cx("w-4 h-4 text-slate-600 dark:text-slate-400")}
                />
              </div>
              <div
                className={cx(
                  "text-2xl font-extrabold mt-1 text-slate-600 dark:text-slate-400",
                )}
              >
                {visibleStats.inProgressCount}
              </div>
              <div
                className={cx(
                  "mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium",
                )}
              >
                Under Division Review
              </div>
            </ButtonBase>
            <ButtonBase
              type="button"
              onClick={() => setSelectedCard("pending")}
              sx={{ display: 'block', textAlign: 'left', width: '100%', p: 2.25, minHeight: 128, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: 'text.secondary', boxShadow: '0 4px 14px rgba(24,24,27,.05)' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 3 }, '& > div:nth-of-type(2)': { fontSize: 30, fontWeight: 650, color: 'text.primary', mt: 1 }, '& > div:last-child': { fontSize: 11, color: 'text.secondary' } }}
              className={cx(
                "dashboard-stat-card min-h-[102px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xs transition-all hover:border-amber-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-800 dark:bg-slate-900 md:min-h-[104px] md:p-4",
              )}
            >
              <div
                className={cx(
                  "flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider",
                )}
              >
                <span>Pending Received</span>
                <span
                  className={cx(
                    "w-2 h-2 rounded-full bg-amber-500 animate-ping",
                  )}
                ></span>
              </div>
              <div
                className={cx(
                  "text-2xl font-extrabold mt-1 text-amber-600 dark:text-amber-400",
                )}
              >
                {visibleStats.pendingCount}
              </div>
              <div
                className={cx(
                  "mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium",
                )}
              >
                Awaiting Action
              </div>
            </ButtonBase>
            <ButtonBase
              onClick={() => setSelectedCard("completed")}
              sx={{ display: 'block', textAlign: 'left', width: '100%', p: 2.25, minHeight: 128, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: 'text.secondary', boxShadow: '0 4px 14px rgba(24,24,27,.05)' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 3 }, '& > div:nth-of-type(2)': { fontSize: 30, fontWeight: 650, color: 'text.primary', mt: 1 }, '& > div:last-child': { fontSize: 11, color: 'text.secondary' } }}
              className={cx(
                "dashboard-stat-card min-h-[102px] cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-emerald-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:min-h-[104px] md:p-4",
              )}
            >
              <div
                className={cx(
                  "flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider",
                )}
              >
                <span>Completed</span>
                <CheckCircle2
                  className={cx(
                    "w-4 h-4 text-emerald-600 dark:text-emerald-400",
                  )}
                />
              </div>
              <div
                className={cx(
                  "text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {visibleStats.completedCount}
              </div>
              <div
                className={cx(
                  "mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium",
                )}
              >
                Completed Documents
              </div>
            </ButtonBase>
            <ButtonBase
              onClick={() => setSelectedCard("returned")}
              sx={{ display: 'block', textAlign: 'left', width: '100%', p: 2.25, minHeight: 128, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, transition: 'border-color 160ms ease, box-shadow 160ms ease', '&:hover': { borderColor: 'text.secondary', boxShadow: '0 4px 14px rgba(24,24,27,.05)' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 3 }, '& > div:nth-of-type(2)': { fontSize: 30, fontWeight: 650, color: 'text.primary', mt: 1 }, '& > div:last-child': { fontSize: 11, color: 'text.secondary' } }}
              className={cx(
                "dashboard-stat-card min-h-[102px] cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-rose-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:min-h-[104px] md:p-4",
              )}
            >
              <div
                className={cx(
                  "flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider",
                )}
              >
                <span>Disapproved</span>
                <RotateCcw
                  className={cx("w-4 h-4 text-rose-600 dark:text-rose-400")}
                />
              </div>
              <div
                className={cx(
                  "text-2xl font-extrabold mt-1 text-rose-600 dark:text-rose-400",
                )}
              >
                {visibleStats.returnedCount}
              </div>
              <div
                className={cx(
                  "mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium",
                )}
              >
                Your Decisions
              </div>
            </ButtonBase>
          </Box>

          {false && canViewRoutingMonitor && (
            <section
              className={cx(
                "rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900",
              )}
            >
              <div
                className={cx(
                  "flex flex-wrap items-start justify-between gap-3",
                )}
              >
                <div>
                  <h3
                    className={cx(
                      "flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white",
                    )}
                  >
                    <Clock className={cx("h-4 w-4 text-amber-600")} />
                    Pending Routing Monitor
                  </h3>
                  <p
                    className={cx(
                      "mt-1 text-xs text-slate-500 dark:text-slate-400",
                    )}
                  >
                    Routes waiting for action, ordered from longest pending.
                  </p>
                </div>
                <span
                  className={cx(
                    "rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                  )}
                >
                  {pendingRoutingItems.length} awaiting action
                </span>
              </div>

              <div className={cx("mt-4 max-h-96 space-y-2 overflow-y-auto")}>
                {pendingRoutingItems.length > 0 ? (
                  pendingRoutingItems.map(({ document, route }) => {
                    const elapsedMs = Math.max(
                      0,
                      Date.now() - new Date(route.createdAt).getTime(),
                    );
                    const pendingDays = Math.floor(elapsedMs / 86_400_000);
                    const pendingHours = Math.max(
                      1,
                      Math.floor(elapsedMs / 3_600_000),
                    );
                    return (
                      <div
                        key={`${document.id}-${route.id}`}
                        className={cx(
                          "grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 md:grid-cols-[1fr_auto] md:items-center",
                        )}
                      >
                        <div className={cx("min-w-0")}>
                          <div
                            className={cx("flex flex-wrap items-center gap-2")}
                          >
                            <span
                              className={cx(
                                "font-mono text-xs font-extrabold text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {document.routeNo || document.trackingNumber}
                            </span>
                            <span
                              className={cx(
                                "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                              )}
                            >
                              {pendingDays > 0
                                ? `${pendingDays} day${pendingDays === 1 ? "" : "s"} pending`
                                : `${pendingHours} hour${pendingHours === 1 ? "" : "s"} pending`}
                            </span>
                          </div>
                          <p
                            className={cx(
                              "mt-1 truncate text-sm font-bold text-slate-900 dark:text-white",
                            )}
                          >
                            {document.title}
                          </p>
                          <div
                            className={cx(
                              "mt-2 grid gap-1 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2",
                            )}
                          >
                            <span>
                              <strong>Handler:</strong>{" "}
                              {resolveUserName(route.toUserId, route.toUser)}
                            </span>
                            <span>
                              <strong>Pending since:</strong>{" "}
                              {formatDate(route.createdAt)}
                            </span>
                            <span className={cx("sm:col-span-2")}>
                              <strong>Action:</strong>{" "}
                              {route.actionRequested || "Appropriate Action"}
                            </span>
                          </div>
                        </div>
                        <div className={cx("flex gap-2")}>
                          <Button
                            type="button"
                            onClick={() => onSelectDoc(document)}
                            className={cx(
                              "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                            )}
                          >
                            View
                          </Button>
                          {canSendRoutingReminder && (
                            <Button
                              type="button"
                              onClick={() =>
                                onSendRoutingReminder(document, route)
                              }
                              className={cx(
                                "inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500",
                              )}
                            >
                              <BellRing className={cx("h-3.5 w-3.5")} />
                              Send Reminder
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className={cx(
                      "rounded-xl bg-slate-50 px-4 py-8 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400",
                    )}
                  >
                    No routes are currently waiting for action.
                  </div>
                )}
              </div>
            </section>
          )}

          {canViewDivisionWorkload && (
            <div
              className={cx(
                "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs",
              )}
            >
              <div className={cx("flex items-center justify-between mb-4")}>
                <div>
                  <h3
                    className={cx(
                      "font-bold text-sm text-slate-900 dark:text-white",
                    )}
                  >
                    Division workload
                  </h3>
                  <p
                    className={cx("text-xs text-slate-500 dark:text-slate-400")}
                  >
                    Document volume across BLGF Regional Office II divisions
                  </p>
                </div>
                <span
                  className={cx(
                    "text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700",
                  )}
                >
                  6 Regional Units
                </span>
              </div>
              <div className={cx("h-64 w-full")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.divisionBreakdown}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="division"
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                    />

                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        borderColor: "#3f3f46",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#ffffff",
                      }}
                      formatter={(value: any) => [
                        `${value} Documents`,
                        "Total Docs",
                      ]}
                    />

                    <Bar dataKey="count" fill="#71717a" maxBarSize={56} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div
            className={cx(
              "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs",
            )}
          >
            <div className={cx("flex items-center justify-between mb-4")}>
              <div>
                <h3
                  className={cx(
                    "font-bold text-sm text-slate-900 dark:text-white",
                  )}
                >
                  Recent documents
                </h3>
                <p className={cx("text-xs text-slate-500 dark:text-slate-400")}>
                  Open a document to see its handler, requested action, and routing history.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => onNavigateToView("incoming")}
                className={cx(
                  "text-xs text-slate-600 dark:text-slate-400 hover:underline font-bold flex items-center space-x-1",
                )}
              >
                <span>View All Documents</span>
                <ChevronRight className={cx("w-3.5 h-3.5")} />
              </Button>
            </div>
            <div className={cx("overflow-x-auto")}>
              <Table
                stickyHeader
                aria-label="Recent documents"
                sx={{ minWidth: 1050, '& td': { verticalAlign: 'top' }, '& th:nth-of-type(3), & td:nth-of-type(3)': { minWidth: 260, maxWidth: 360 }, '& th:first-of-type, & td:first-of-type': { minWidth: 190 } }}
                className={cx("w-full text-left text-xs border-collapse")}
              >
                <TableHead>
                  <TableRow
                    className={cx(
                      "bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider",
                    )}
                  >
                    <TableCell className={cx("py-2.5 px-3")}>
                      Document Route No.
                    </TableCell>
                    <TableCell className={cx("py-2.5 px-3")}>Type</TableCell>
                    <TableCell className={cx("py-2.5 px-3")}>
                      Document Title & Subject
                    </TableCell>
                    <TableCell className={cx("py-2.5 px-3")}>
                      Originating Office
                    </TableCell>
                    <TableCell className={cx("py-2.5 px-3")}>
                      Holding Division
                    </TableCell>
                    <TableCell className={cx("py-2.5 px-3")}>Status</TableCell>
                    <TableCell className={cx("py-2.5 px-3 text-right")}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody
                  className={cx(
                    "divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200",
                  )}
                >
                  {recentTransactions.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className={cx(
                          "px-3 py-10 text-center text-xs text-slate-400",
                        )}
                      >
                        No transactions available yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {paginatedTransactions.map((doc) => {
                    const cfg = STATUS_CONFIGS[doc.currentStatus];
                    const latestAction =
                      [...(doc.routes || [])].sort(
                        (a, b) => b.stepNumber - a.stepNumber,
                      )[0]?.actionRequested ||
                      doc.actionRequested ||
                      "N/A";
                    return (
                      <TableRow
                        key={doc.id}
                        className={cx(
                          "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                        )}
                      >
                        <TableCell
                          className={cx(
                            "py-3 px-3 font-mono font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer",
                          )}
                          onClick={() => onSelectDoc(doc)}
                        >
                          {doc.routeNo}
                        </TableCell>
                        <TableCell className={cx("py-3 px-3")}>
                          <span
                            className={cx(
                              `px-2 py-0.5 rounded text-[10px] font-bold uppercase ${doc.direction === "INCOMING" ? "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300" : "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300"}`,
                            )}
                          >
                            {doc.direction}
                          </span>
                        </TableCell>
                        <TableCell className={cx("py-3 px-3 max-w-xs")}>
                          <div
                            className={cx(
                              "font-semibold text-slate-900 dark:text-white truncate",
                            )}
                          >
                            {doc.title}
                          </div>
                          <div
                            className={cx(
                              "text-[11px] text-slate-500 dark:text-slate-400 truncate",
                            )}
                          >
                            {doc.subject}
                          </div>
                          <div
                            className={cx(
                              "mt-1 truncate text-[10px] font-semibold text-amber-700 dark:text-amber-400",
                            )}
                          >
                            Action: {latestAction}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cx(
                            "max-w-[190px] py-3 px-3 text-slate-600 dark:text-slate-400",
                          )}
                        >
                          <div
                            className={cx(
                              "truncate font-bold text-slate-800 dark:text-slate-200",
                            )}
                          >
                            {doc.senderName || "N/A"}
                          </div>
                          <div
                            className={cx("truncate text-[11px] font-medium")}
                          >
                            {doc.originatingOffice || "N/A"}
                          </div>
                          <div className={cx("truncate text-[10px]")}>
                            {doc.senderAddress || "No address provided"}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cx(
                            "py-3 px-3 font-bold text-slate-800 dark:text-slate-200",
                          )}
                        >
                          {doc.currentDivision}
                        </TableCell>
                        <TableCell className={cx("py-3 px-3")}>
                          <span
                            className={cx(
                              `px-2 py-0.5 rounded text-[10px] font-bold ${cfg?.badgeClass || ""}`,
                            )}
                          >
                            {cfg?.label || doc.currentStatus}
                          </span>
                        </TableCell>
                        <TableCell className={cx("py-3 px-3 text-right")}>
                          <Button
                            type="button"
                            onClick={() => onSelectDoc(doc)}
                            className={cx(
                              "bg-blue-600 hover:bg-slate-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-2xs transition-colors",
                            )}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {recentTransactions.length > transactionsPerPage && (
              <div
                className={cx(
                  "mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-800",
                )}
              >
                <span className={cx("text-slate-500 dark:text-slate-400")}>
                  Page {transactionPage} of {transactionPageCount} ·{" "}
                  {recentTransactions.length} transactions
                </span>
                <div className={cx("flex items-center gap-2")}>
                  <Button
                    type="button"
                    disabled={transactionPage === 1}
                    onClick={() =>
                      setTransactionPage((page) => Math.max(1, page - 1))
                    }
                    className={cx(
                      "inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
                    )}
                  >
                    <ChevronLeft className={cx("h-3.5 w-3.5")} /> Previous
                  </Button>
                  <Button
                    type="button"
                    disabled={transactionPage === transactionPageCount}
                    onClick={() =>
                      setTransactionPage((page) =>
                        Math.min(transactionPageCount, page + 1),
                      )
                    }
                    className={cx(
                      "inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    Next <ChevronRight className={cx("h-3.5 w-3.5")} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isUserStatusOpen && (
            <div
              className={cx(
                "fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs",
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-status-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget)
                  setIsUserStatusOpen(false);
              }}
            >
              <div
                className={cx(
                  "w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
                )}
              >
                <div
                  className={cx(
                    "flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700",
                  )}
                >
                  <div>
                    <h2
                      id="user-status-title"
                      className={cx(
                        "text-sm font-extrabold text-slate-900 dark:text-white",
                      )}
                    >
                      User Account & Session Status
                    </h2>
                    <p
                      className={cx(
                        "mt-0.5 text-[10px] text-slate-500 dark:text-slate-400",
                      )}
                    >
                      {users.length} registered user
                      {users.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className={cx("flex items-center gap-2")}>
                    <span
                      className={cx(
                        `inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-bold ${
                          isOnline
                            ? "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
                            : "border-rose-200 text-rose-700 dark:border-rose-800 dark:text-rose-300"
                        }`,
                      )}
                    >
                      {isOnline ? (
                        <Wifi className={cx("h-3 w-3")} />
                      ) : (
                        <WifiOff className={cx("h-3 w-3")} />
                      )}
                      {isOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                    <Button
                      type="button"
                      onClick={() => setIsUserStatusOpen(false)}
                      className={cx(
                        "rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                      aria-label="Close user status"
                    >
                      <X className={cx("h-4 w-4")} />
                    </Button>
                  </div>
                </div>
                <div
                  className={cx(
                    "grid max-h-[65vh] grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2",
                  )}
                >
                  {users.map((user) => {
                    const userIsOnline = user.id === currentUser.id && isOnline;
                    const initials = user.fullName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((name) => name[0])
                      .join("")
                      .toUpperCase();
                    return (
                      <div
                        key={user.id}
                        className={cx(
                          "flex min-w-0 items-center gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-700",
                        )}
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className={cx(
                              "h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700",
                            )}
                          />
                        ) : (
                          <div
                            className={cx(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                            )}
                          >
                            {initials || "U"}
                          </div>
                        )}
                        <div className={cx("min-w-0 flex-1")}>
                          <p
                            className={cx(
                              "truncate text-xs font-bold text-slate-900 dark:text-white",
                            )}
                          >
                            {user.fullName}
                          </p>
                          <p
                            className={cx(
                              "truncate text-[10px] text-slate-500 dark:text-slate-400",
                            )}
                          >
                            {user.designation || user.role} ·{" "}
                            {user.divisionCode}
                          </p>
                          <div
                            className={cx(
                              "mt-1.5 flex gap-2 text-[9px] font-bold",
                            )}
                          >
                            <span
                              className={cx(
                                user.active
                                  ? "text-emerald-600"
                                  : "text-rose-600",
                              )}
                            >
                              {user.active ? "ACTIVE" : "DEACTIVATED"}
                            </span>
                            <span
                              className={cx(
                                userIsOnline
                                  ? "text-slate-600"
                                  : "text-slate-400",
                              )}
                            >
                              {userIsOnline ? "ONLINE" : "OFFLINE"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedCard && (
            <div
              className={cx(
                "fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs",
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pending-documents-title"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedCard(null);
                }
              }}
            >
              <div
                className={cx(
                  "w-full max-w-lg overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl dark:border-amber-800 dark:bg-slate-900",
                )}
              >
                <div
                  className={cx(
                    "flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800",
                  )}
                >
                  <div>
                    <h2
                      id="pending-documents-title"
                      className={cx(
                        "text-sm font-extrabold text-slate-900 dark:text-white",
                      )}
                    >
                      {cardTitle}
                    </h2>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setSelectedCard(null)}
                    className={cx(
                      "rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                    aria-label={`Close ${cardTitle}`}
                  >
                    <X className={cx("h-4 w-4")} />
                  </Button>
                </div>
                <div className={cx("max-h-96 space-y-2 overflow-y-auto p-4")}>
                  {cardDocuments.length ? (
                    cardDocuments.map((document) => (
                      <div
                        key={document.id}
                        className={cx(
                          "w-full rounded-xl border border-slate-200 p-3 text-left hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:hover:bg-amber-950/30",
                        )}
                      >
                        <div
                          className={cx(
                            "font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400",
                          )}
                        >
                          {document.routeNo}
                        </div>
                        <div
                          className={cx(
                            "mt-1 text-xs font-bold text-slate-900 dark:text-white",
                          )}
                        >
                          {document.title}
                        </div>
                        <div
                          className={cx(
                            "mt-1 text-[10px] text-slate-500 dark:text-slate-400",
                          )}
                        >
                          From: {document.createdBy}
                        </div>
                        {document.routes?.length > 0 && (
                          <ul className={cx("hidden")}>
                            {groupRouteTransactions(document).map(
                              (route, index) => (
                                <li
                                  key={route.id}
                                  className={cx("flex items-start gap-1.5")}
                                >
                                  <span
                                    className={cx(
                                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600",
                                    )}
                                  />
                                  <span>
                                    Step {index + 1}:{" "}
                                    <strong>{route.fromDivision}</strong>
                                    {" → "}
                                    <strong>
                                      {route.toDivisions.join(", ")}
                                    </strong>
                                    {route.toUser ? ` — ${route.toUser}` : ""}
                                    {route.statusAfter
                                      ? ` (${STATUS_CONFIGS[route.statusAfter]?.label || route.statusAfter})`
                                      : ""}
                                  </span>
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                        {document.routes?.length > 0 && (
                          <div
                            className={cx(
                              "mt-3 border-t border-slate-200 pt-3 dark:border-slate-700",
                            )}
                          >
                            <div
                              className={cx(
                                "mb-2 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300",
                              )}
                            >
                              Document Routing & Audit History Trail
                            </div>
                            <div
                              className={cx(
                                "relative space-y-2 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-slate-300 dark:before:bg-slate-700",
                              )}
                            >
                              {groupRouteTransactions(document).map(
                                (route, index) => (
                                  <div
                                    key={route.id}
                                    className={cx("relative pl-6 text-[10px]")}
                                  >
                                    <span
                                      className={cx(
                                        "absolute left-0 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-black text-white ring-2 ring-white dark:ring-slate-900",
                                      )}
                                    >
                                      {index + 1}
                                    </span>
                                    <div
                                      className={cx(
                                        "space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60",
                                      )}
                                    >
                                      <div
                                        className={cx(
                                          "flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 pb-1.5 font-bold dark:border-slate-700",
                                        )}
                                      >
                                        <div
                                          className={cx(
                                            "flex flex-wrap items-center gap-1 text-slate-700 dark:text-slate-400",
                                          )}
                                        >
                                          <span>Route Step #{index + 1}:</span>
                                          {route.routeNo && (
                                            <span
                                              className={cx(
                                                "rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-black text-slate-800 dark:bg-slate-950 dark:text-slate-300",
                                              )}
                                            >
                                              No. {route.routeNo}
                                            </span>
                                          )}
                                          <strong
                                            className={cx(
                                              "text-slate-900 dark:text-white",
                                            )}
                                          >
                                            {route.fromDivision}
                                          </strong>
                                          <span>→</span>
                                          <strong
                                            className={cx(
                                              "text-emerald-700 dark:text-emerald-400",
                                            )}
                                          >
                                            {route.toDivisions.join(", ")}
                                          </strong>
                                        </div>
                                        <span
                                          className={cx(
                                            "font-mono text-[9px] font-medium text-slate-500",
                                          )}
                                        >
                                          {formatDate(route.createdAt)}
                                        </span>
                                      </div>
                                      <div
                                        className={cx(
                                          "grid grid-cols-1 gap-1 text-slate-700 dark:text-slate-300 sm:grid-cols-2",
                                        )}
                                      >
                                        <div>
                                          <span
                                            className={cx("text-slate-500")}
                                          >
                                            Forwarded By:
                                          </span>{" "}
                                          <strong>
                                            {resolveUserName(
                                              route.fromUserId,
                                              route.fromUser,
                                            )}
                                          </strong>
                                        </div>
                                        <div>
                                          <span
                                            className={cx("text-slate-500")}
                                          >
                                            Target Handler:
                                          </span>{" "}
                                          <strong>
                                            {resolveUserName(
                                              route.toUserId,
                                              route.toUser,
                                            ) ||
                                              route.toUsers.join(", ") ||
                                              route.toDivisions.join(", ")}
                                          </strong>
                                        </div>
                                      </div>
                                      <div
                                        className={cx(
                                          "rounded border border-slate-200 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                                        )}
                                      >
                                        {getRouteDecision(route) && (
                                          <div
                                            className={cx(
                                              `mb-2 flex items-center justify-between rounded-md px-2 py-1.5 ${
                                                getRouteDecision(route) ===
                                                "APPROVED"
                                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                              }`,
                                            )}
                                          >
                                            <strong>
                                              {getRouteDecision(route)}
                                            </strong>
                                            <span
                                              className={cx(
                                                "text-[9px] font-bold",
                                              )}
                                            >
                                              by{" "}
                                              {resolveUserName(
                                                route.fromUserId,
                                                route.fromUser,
                                              )}
                                            </span>
                                          </div>
                                        )}
                                        <strong
                                          className={cx(
                                            "text-amber-700 dark:text-amber-400",
                                          )}
                                        >
                                          Action Requested:
                                        </strong>{" "}
                                        {route.actionRequested || "N/A"}
                                        <div className={cx("mt-1")}>
                                          <strong
                                            className={cx("text-slate-500")}
                                          >
                                            Remarks:
                                          </strong>{" "}
                                          {route.remarks?.trim() &&
                                          route.remarks !==
                                            "Logged in BLGF Document Tracking System"
                                            ? route.remarks
                                            : "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                        <div
                          className={cx(
                            "mt-3 flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700",
                          )}
                        >
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedCard(null);
                              onSelectDoc(document);
                            }}
                            className={cx(
                              "rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200",
                            )}
                          >
                            View Details
                          </Button>
                          {selectedCard === "returned" &&
                            canReapproveDocument(document) && (
                              <Button
                                type="button"
                                onClick={() => {
                                  setSelectedCard(null);
                                  onReapproveDocument(document);
                                }}
                                className={cx(
                                  "rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-500",
                                )}
                              >
                                Re-approve
                              </Button>
                            )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p
                      className={cx("py-8 text-center text-xs text-slate-500")}
                    >
                      No {cardTitle.toLowerCase()} related to this user.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Box>
      }
    </>
  );
};
