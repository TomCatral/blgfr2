// RoutingFollowUpView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Route,
  Search,
  X,
} from "lucide-react";
import {
  AuditLog,
  DEFAULT_ROLE_PERMISSIONS,
  DocumentRecord,
  DocumentRouteStep,
  User,
} from "../types";
import { formatDate } from "../utils/statusUtils";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for RoutingFollowUpView.
// BASE CSS: Pangunahing design ng component.
const routingFollowUpViewCss = `/* RoutingFollowUpView.module.css */
.mui-routingfollowupview-page { display: grid; gap: 1.25rem; }
.mui-routingfollowupview-hero { padding: 1.25rem; color: #27272a; background: linear-gradient(135deg, #fff, #fafafa); border: 1px solid #f4f4f5; border-radius: .85rem; box-shadow: 0 .2rem .8rem rgb(15 23 42 / 6%); }
.mui-routingfollowupview-heroContent { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
.mui-routingfollowupview-eyebrow { display: flex; align-items: center; gap: .5rem; color: #3f3f46; font-size: .75rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.mui-routingfollowupview-heroTitle { margin: .25rem 0 0; font-size: 1.25rem; font-weight: 900; }
.mui-routingfollowupview-heroDescription { margin: .25rem 0 0; color: #71717a; font-size: .75rem; }
.mui-routingfollowupview-summary { padding: .75rem 1rem; background: #fff; border: 1px solid #f4f4f5; border-radius: .75rem; text-align: center; }
.mui-routingfollowupview-summaryCount { font-size: 1.5rem; font-weight: 900; }
.mui-routingfollowupview-summaryLabel { color: #71717a; font-size: .75rem; }
.mui-routingfollowupview-summaryPending { margin-top: .25rem; color: #b45309; font-size: .75rem; font-weight: 800; }
.mui-routingfollowupview-panel { padding: 1rem; background: #fff; border: 1px solid #e4e4e7; border-radius: .75rem; box-shadow: 0 .1rem .25rem rgb(15 23 42 / 5%); }
.mui-routingfollowupview-panelHeading { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; }
.mui-routingfollowupview-clockIcon { color: #d97706; }
.mui-routingfollowupview-panelTitle { margin: 0; color: #18181b; font-size: .875rem; font-weight: 800; }
.mui-routingfollowupview-records { display: grid; gap: .75rem; }
.mui-routingfollowupview-record { display: grid; gap: 1rem; padding: 1rem; background: #fafafa; border-radius: .75rem; }
.mui-routingfollowupview-recordContent { min-width: 0; }
.mui-routingfollowupview-badges { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.mui-routingfollowupview-routeNumber { color: #27272a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .75rem; font-weight: 800; }
.mui-routingfollowupview-statusBadge, .mui-routingfollowupview-elapsedBadge { padding: .25rem .625rem; border-radius: 999px; font-size: .75rem; font-weight: 800; }
.mui-routingfollowupview-waiting { color: #92400e; background: #fef3c7; }
.mui-routingfollowupview-returned { color: #9f1239; background: #ffe4e6; }
.mui-routingfollowupview-active { color: #3f3f46; background: #f4f4f5; }
.mui-routingfollowupview-elapsedBadge { color: #3f3f46; background: #e4e4e7; }
.mui-routingfollowupview-recordTitle { margin: .5rem 0 0; color: #18181b; font-size: .875rem; font-weight: 800; }
.mui-routingfollowupview-details { display: grid; gap: .5rem; margin-top: .75rem; color: #52525b; font-size: .75rem; }
.mui-routingfollowupview-reminders { margin-top: .75rem; padding-top: .5rem; border-top: 1px solid #e4e4e7; font-size: .75rem; }
.mui-routingfollowupview-reminderTitle { color: #3f3f46; font-weight: 800; }
.mui-routingfollowupview-reminderList { display: grid; gap: .25rem; margin: .25rem 0 0; padding-left: 1.25rem; color: #52525b; }
.mui-routingfollowupview-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }
.mui-routingfollowupview-viewButton, .mui-routingfollowupview-reminderButton, .mui-routingfollowupview-pageButton, .mui-routingfollowupview-nextButton { display: inline-flex; min-width: max-content; align-items: center; justify-content: center; gap: .375rem; padding: .5rem .75rem; border-radius: .5rem; cursor: pointer; font-size: .75rem; font-weight: 800; white-space: nowrap; }
.mui-routingfollowupview-viewButton, .mui-routingfollowupview-pageButton { color: #3f3f46; background: #fff; border: 1px solid #e4e4e7; }
.mui-routingfollowupview-viewButton:hover, .mui-routingfollowupview-pageButton:hover { background: #f4f4f5; }
.mui-routingfollowupview-reminderButton, .mui-routingfollowupview-nextButton { color: #fff; background: #3f3f46; border: 1px solid #3f3f46; }
.mui-routingfollowupview-reminderButton:hover, .mui-routingfollowupview-nextButton:hover { background: #27272a; }
.mui-routingfollowupview-empty { padding: 2.5rem 1rem; color: #71717a; background: #fafafa; border-radius: .75rem; font-size: .875rem; text-align: center; }
.mui-routingfollowupview-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; margin-top: 1rem; padding-top: .75rem; color: #71717a; border-top: 1px solid #e4e4e7; font-size: .75rem; }
.mui-routingfollowupview-paginationActions { display: flex; gap: .5rem; }
.mui-routingfollowupview-pageButton:disabled, .mui-routingfollowupview-nextButton:disabled { cursor: not-allowed; opacity: .4; }
@media (min-width: 640px) { .mui-routingfollowupview-details { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .mui-routingfollowupview-record { grid-template-columns: 1fr auto; align-items: center; } }
.dark .mui-routingfollowupview-hero { color: #e5edf8; background: linear-gradient(135deg, #162033, #111a2b); border-color: #303036; }
.dark .mui-routingfollowupview-eyebrow { color: #d4d4d8; }
.dark .mui-routingfollowupview-heroDescription, .dark .mui-routingfollowupview-summaryLabel { color: #d4d4d8; }
.dark .mui-routingfollowupview-summary { background: #18181b; border-color: #303036; }
.dark .mui-routingfollowupview-summaryPending { color: #fcd34d; }
.dark .mui-routingfollowupview-panel { background: #18181b; border-color: #27272a; }
.dark .mui-routingfollowupview-panelTitle, .dark .mui-routingfollowupview-recordTitle { color: #fff; }
.dark .mui-routingfollowupview-record, .dark .mui-routingfollowupview-empty { background: rgb(30 41 59 / 60%); }
.dark .mui-routingfollowupview-details, .dark .mui-routingfollowupview-reminderList { color: #d4d4d8; }
.dark .mui-routingfollowupview-reminders, .dark .mui-routingfollowupview-pagination { border-color: #3f3f46; }
.dark .mui-routingfollowupview-reminderTitle { color: #e4e4e7; }
.dark .mui-routingfollowupview-elapsedBadge { color: #e4e4e7; background: #3f3f46; }
.dark .mui-routingfollowupview-viewButton, .dark .mui-routingfollowupview-pageButton { color: #e4e4e7; background: #18181b; border-color: #3f3f46; }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const routingFollowUpViewStyles = {
  actions: "mui-routingfollowupview-actions",
  active: "mui-routingfollowupview-active",
  badges: "mui-routingfollowupview-badges",
  clockIcon: "mui-routingfollowupview-clockIcon",
  details: "mui-routingfollowupview-details",
  elapsedBadge: "mui-routingfollowupview-elapsedBadge",
  empty: "mui-routingfollowupview-empty",
  eyebrow: "mui-routingfollowupview-eyebrow",
  hero: "mui-routingfollowupview-hero",
  heroContent: "mui-routingfollowupview-heroContent",
  heroDescription: "mui-routingfollowupview-heroDescription",
  heroTitle: "mui-routingfollowupview-heroTitle",
  nextButton: "mui-routingfollowupview-nextButton",
  page: "mui-routingfollowupview-page",
  pageButton: "mui-routingfollowupview-pageButton",
  pagination: "mui-routingfollowupview-pagination",
  paginationActions: "mui-routingfollowupview-paginationActions",
  panel: "mui-routingfollowupview-panel",
  panelHeading: "mui-routingfollowupview-panelHeading",
  panelTitle: "mui-routingfollowupview-panelTitle",
  record: "mui-routingfollowupview-record",
  recordContent: "mui-routingfollowupview-recordContent",
  recordTitle: "mui-routingfollowupview-recordTitle",
  records: "mui-routingfollowupview-records",
  reminderButton: "mui-routingfollowupview-reminderButton",
  reminderList: "mui-routingfollowupview-reminderList",
  reminderTitle: "mui-routingfollowupview-reminderTitle",
  reminders: "mui-routingfollowupview-reminders",
  returned: "mui-routingfollowupview-returned",
  routeNumber: "mui-routingfollowupview-routeNumber",
  statusBadge: "mui-routingfollowupview-statusBadge",
  summary: "mui-routingfollowupview-summary",
  summaryCount: "mui-routingfollowupview-summaryCount",
  summaryLabel: "mui-routingfollowupview-summaryLabel",
  summaryPending: "mui-routingfollowupview-summaryPending",
  viewButton: "mui-routingfollowupview-viewButton",
  waiting: "mui-routingfollowupview-waiting",
} as const;

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createRoutingFollowUpViewStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    ".mui-routingfollowupview-page": {
      gap: "16px !important",
    },
    ".mui-routingfollowupview-hero": {
      padding: "16px 18px !important",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-routingfollowupview-heroTitle": {
      color: text + " !important",
      fontSize: "20px !important",
      lineHeight: "1.3 !important",
      letterSpacing: "-.025em !important",
    },
    ".mui-routingfollowupview-heroDescription": {
      color: muted + " !important",
      fontSize: "13px !important",
      lineHeight: "1.55 !important",
      marginTop: "4px !important",
    },
    ".mui-routingfollowupview-panel": {
      overflow: "hidden",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-routingfollowupview-record": {
      padding: "14px 16px !important",
      background: surface + " !important",
      border: `1px solid ${border}`,
      borderRadius: "10px !important",
    },
    ".mui-routingfollowupview-records": { gap: "16px !important", padding: 16 },
    ".mui-routingfollowupview-recordTitle": {
      fontSize: "13px !important",
      lineHeight: "1.4 !important",
    },
    ".mui-routingfollowupview-details": { fontSize: "13px !important", display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, marginTop: 14, lineHeight: 1.6, '& > div': { padding: 12, background: theme.palette.action.hover, borderRadius: 8 }, '& strong': { display: 'block', color: muted, fontSize: 12, fontWeight: 500, marginBottom: 4 } },
    ".mui-routingfollowupview-routeNumber": { fontSize: "12px !important", color: `${text} !important`, overflowWrap: 'anywhere' },
    ".mui-routingfollowupview-statusBadge": { fontSize: "12px !important" },
    ".mui-routingfollowupview-elapsedBadge": { fontSize: "12px !important" },
    ".mui-routingfollowupview-summary": {
      borderRadius: "10px !important",
      boxShadow: "none !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".mui-routingfollowupview-hero": { padding: "14px !important" },
      ".mui-routingfollowupview-summary": {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        textAlign: "left !important",
      },
      ".mui-routingfollowupview-actions": {
        justifyContent: "flex-start !important",
      },
      ".mui-routingfollowupview-record": { padding: "14px !important" },
    },
  };
};
const styles = routingFollowUpViewStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface RoutingFollowUpViewProps {
  documents: DocumentRecord[];
  auditLogs: AuditLog[];
  users: User[];
  currentUser: User;
  onSelectDoc: (document: DocumentRecord) => void;
  onSendReminder: (document: DocumentRecord, route: DocumentRouteStep) => void;
}

const getRouteDecision = (route: DocumentRouteStep) => {
  const value =
    `${route.actionRequested || ""} ${route.remarks || ""}`.toUpperCase();
  if (value.includes("DISAPPROVED")) return "DISAPPROVED";
  if (value.includes("APPROVED")) return "APPROVED";
  return undefined;
};

// LOGIC: State, events, at pagproseso ng data.
export const RoutingFollowUpView: React.FC<RoutingFollowUpViewProps> = ({
  documents,
  auditLogs,
  users,
  currentUser,
  onSelectDoc,
  onSendReminder,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const permissions =
    currentUser.permissions ||
    DEFAULT_ROLE_PERMISSIONS[currentUser.role] ||
    DEFAULT_ROLE_PERMISSIONS.STAFF;
  const canSendReminder =
    currentUser.role === "SYSTEM_ADMIN" ||
    (permissions.allowedActions || []).includes("ROUTING_REMINDER_SEND");
  const userNameById = useMemo(
    () => new Map(users.map((user) => [user.id, user.fullName])),
    [users],
  );

  const pendingRoutes = useMemo(() => {
    const latestByHandler = new Map<
      string,
      { document: DocumentRecord; route: DocumentRouteStep }
    >();
    for (const document of documents) {
      if (document.currentStatus === "COMPLETED") continue;
      const routes = [...(document.routes || [])].sort(
        (first, second) =>
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime(),
      );
      for (const route of routes) {
        if (!route.toUserId || getRouteDecision(route)) continue;
        const assignedAt = new Date(route.createdAt).getTime();
        const handlerName = (
          userNameById.get(route.toUserId) ||
          route.toUser ||
          ""
        )
          .trim()
          .toLowerCase();
        const hasLaterRouteAction = routes.some(
          (candidate) =>
            new Date(candidate.createdAt).getTime() > assignedAt &&
            (candidate.fromUserId === route.toUserId ||
              candidate.fromUser?.trim().toLowerCase() === handlerName),
        );
        const hasLaterAuditAction = auditLogs.some(
          (log) =>
            (log.documentTrackingNumber === document.trackingNumber ||
              log.documentTrackingNumber === document.routeNo) &&
            new Date(log.timestamp).getTime() > assignedAt &&
            (log.userId === route.toUserId ||
              log.userName.trim().toLowerCase() === handlerName) &&
            ["ROUTE_DOC", "TRANSFER_DOC", "UPDATE_STATUS"].includes(log.action),
        );
        if (hasLaterRouteAction || hasLaterAuditAction) continue;
        latestByHandler.set(`${document.id}:${route.toUserId}`, {
          document,
          route,
        });
      }
    }
    return [...latestByHandler.values()].sort(
      (first, second) =>
        new Date(first.route.createdAt).getTime() -
        new Date(second.route.createdAt).getTime(),
    );
  }, [auditLogs, documents, userNameById]);

  const routingProgress = useMemo(() => {
    const items: Array<{
      document: DocumentRecord;
      route: DocumentRouteStep;
      status: string;
      statusSince: string;
      awaitingAction: boolean;
    }> = [];
    for (const document of documents) {
      if (document.currentStatus === "COMPLETED") continue;
      const documentPendingRoutes = pendingRoutes.filter(
        (item) => item.document.id === document.id,
      );
      if (documentPendingRoutes.length > 0) {
        for (const item of documentPendingRoutes) {
          items.push({
            ...item,
            status: "WAITING FOR ACTION",
            statusSince: item.route.createdAt,
            awaitingAction: true,
          });
        }
        continue;
      }
      const activeHandlerRoute = [...(document.routes || [])]
        .filter(
          (route) =>
            route.toUserId &&
            !getRouteDecision(route) &&
            (!document.assignedUserId ||
              route.toUserId === document.assignedUserId),
        )
        .sort(
          (first, second) =>
            new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime(),
        )
        .at(-1);
      const fallbackRoute = [...(document.routes || [])]
        .filter((route) => route.toUserId && !getRouteDecision(route))
        .sort(
          (first, second) =>
            new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime(),
        )
        .at(-1);
      const reminderRoute = activeHandlerRoute || fallbackRoute;
      if (!reminderRoute) continue;
      items.push({
        document,
        route: reminderRoute,
        status: document.currentStatus.replaceAll("_", " "),
        statusSince: document.updatedAt || reminderRoute.createdAt,
        awaitingAction: false,
      });
    }
    return items.sort(
      (first, second) =>
        new Date(first.statusSince).getTime() -
        new Date(second.statusSince).getTime(),
    );
  }, [documents, pendingRoutes]);
  const filteredRoutingProgress = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return routingProgress;
    return routingProgress.filter(({ document, route, status }) => {
      const handler =
        userNameById.get(route.toUserId || "") || route.toUser || "";
      return [
        document.routeNo,
        document.trackingNumber,
        document.title,
        document.subject,
        document.currentDivision,
        handler,
        status,
        route.actionRequested,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [routingProgress, searchQuery, userNameById]);
  const recordsPerPage = 5;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredRoutingProgress.length / recordsPerPage),
  );
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);
  useEffect(() => setCurrentPage(1), [searchQuery]);
  const paginatedRoutingProgress = filteredRoutingProgress.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage,
  );

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <RoutingFollowUpViewDesign />
      {
        <div className={styles.page}>
          <header className={styles.hero}>
            <div className={styles.heroContent}>
              <div>
                <div className={styles.eyebrow}>
                  <Route /> Routing Monitoring
                </div>
                <h1 className={styles.heroTitle}>Routing Follow-up</h1>
                <p className={styles.heroDescription}>
                  Monitor pending documents and remind handlers who have not
                  taken action.
                </p>
              </div>
              <div className={styles.summary}>
                <div className={styles.summaryCount}>
                  {routingProgress.length}
                </div>
                <div className={styles.summaryLabel}>Routing records</div>
                <div className={styles.summaryPending}>
                  {pendingRoutes.length} awaiting action
                </div>
              </div>
            </div>
          </header>

          <section className={styles.panel}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { sm: "center" },
                gap: 1.5,
                mb: 2,
              }}
            >
              <TextField
                fullWidth
                size="small"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search route number, document, handler, status..."
                aria-label="Search routing follow-up records"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={17} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear routing search"
                        >
                          <X size={16} />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
                sx={{
                  maxWidth: 620,
                  "& .MuiOutlinedInput-root": {
                    height: 44,
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                  },
                  "& .MuiInputBase-input": {
                    minHeight: "0 !important",
                    border: "0 !important",
                    background: "transparent !important",
                    boxShadow: "none !important",
                  },
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  ml: { sm: "auto" },
                  whiteSpace: "nowrap",
                  fontWeight: 700,
                }}
              >
                {filteredRoutingProgress.length} result
                {filteredRoutingProgress.length === 1 ? "" : "s"}
              </Typography>
            </Box>
            <div className={styles.panelHeading}>
              <Clock className={styles.clockIcon} />
              <h2 className={styles.panelTitle}>
                All Routing Progress — longest in status first
              </h2>
            </div>
            <div className={styles.records}>
              {filteredRoutingProgress.length > 0 ? (
                paginatedRoutingProgress.map(
                  ({
                    document,
                    route,
                    status,
                    statusSince,
                    awaitingAction,
                  }) => {
                    const elapsed = Math.max(
                      0,
                      Date.now() - new Date(statusSince).getTime(),
                    );
                    const days = Math.floor(elapsed / 86_400_000);
                    const hours = Math.max(1, Math.floor(elapsed / 3_600_000));
                    const handler =
                      userNameById.get(route.toUserId || "") ||
                      route.toUser ||
                      "Unassigned handler";
                    const reminderHistory = auditLogs
                      .filter(
                        (log) =>
                          (log.documentTrackingNumber ===
                            document.trackingNumber ||
                            log.documentTrackingNumber === document.routeNo) &&
                          log.details.startsWith("Routing reminder sent to ") &&
                          log.details
                            .slice("Routing reminder sent to ".length)
                            .split(" | Message:")[0]
                            .trim()
                            .toLowerCase() === handler.trim().toLowerCase(),
                      )
                      .sort(
                        (first, second) =>
                          new Date(first.timestamp).getTime() -
                          new Date(second.timestamp).getTime(),
                      );
                    return (
                      <article
                        key={`${document.id}-${route.id}`}
                        className={styles.record}
                      >
                        <div className={styles.recordContent}>
                          <div className={styles.badges}>
                            <span className={styles.routeNumber}>
                              {document.routeNo || document.trackingNumber}
                            </span>
                            <span
                              className={`${styles.statusBadge} ${awaitingAction ? styles.waiting : status === "RETURNED" ? styles.returned : styles.active}`}
                            >
                              {status}
                            </span>
                            <span className={styles.elapsedBadge}>
                              {days > 0
                                ? `${days} day${days === 1 ? "" : "s"} in status`
                                : `${hours} hour${hours === 1 ? "" : "s"} in status`}
                            </span>
                          </div>
                          <h3 className={styles.recordTitle}>
                            {document.title}
                          </h3>
                          <div className={styles.details}>
                            <div>
                              <strong>Current handler:</strong> {handler}
                            </div>
                            <div>
                              <strong>Status since:</strong>{" "}
                              {formatDate(statusSince)}
                            </div>
                            <div>
                              <strong>Action:</strong>{" "}
                              {route.actionRequested || "Appropriate Action"}
                            </div>
                          </div>
                          {reminderHistory.length > 0 && (
                            <div className={styles.reminders}>
                              <div className={styles.reminderTitle}>
                                Reminders ({reminderHistory.length})
                              </div>
                              <ol className={styles.reminderList}>
                                {reminderHistory.map((reminder, index) => {
                                  const reminderMessage =
                                    reminder.details
                                      .split(" | Message:")[1]
                                      ?.trim() ||
                                    "Please take action on this routed document.";
                                  return (
                                    <li key={reminder.id}>
                                      <strong>#{index + 1}</strong>
                                      <span>• {reminder.userName}</span>
                                      <time>
                                        • {formatDate(reminder.timestamp)}
                                      </time>
                                      <span>— {reminderMessage}</span>
                                    </li>
                                  );
                                })}
                              </ol>
                            </div>
                          )}
                        </div>
                        <div className={styles.actions}>
                          <Button
                            type="button"
                            onClick={() => onSelectDoc(document)}
                            className={styles.viewButton}
                          >
                            <Eye /> View
                          </Button>
                          {canSendReminder ? (
                            <Button
                              type="button"
                              onClick={() => onSendReminder(document, route)}
                              className={styles.reminderButton}
                            >
                              <BellRing /> Send Reminder
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    );
                  },
                )
              ) : (
                <div className={styles.empty}>
                  {searchQuery
                    ? `No routing records match “${searchQuery}”.`
                    : "No routing progress records are available."}
                </div>
              )}
            </div>
            {filteredRoutingProgress.length > recordsPerPage && (
              <div className={styles.pagination}>
                <span>
                  Page {currentPage} of {pageCount} ·{" "}
                  {filteredRoutingProgress.length} routing records
                </span>
                <div className={styles.paginationActions}>
                  <Button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className={styles.pageButton}
                  >
                    <ChevronLeft /> Previous
                  </Button>
                  <Button
                    type="button"
                    disabled={currentPage === pageCount}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(pageCount, page + 1))
                    }
                    className={styles.nextButton}
                  >
                    Next <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function RoutingFollowUpViewDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[routingFollowUpViewCss, createRoutingFollowUpViewStyles(theme)]}
    />
  );
}
