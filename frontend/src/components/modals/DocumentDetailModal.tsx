import { isSharedDocumentFile } from "../../utils/attachmentVisibility";
import { documentFileType } from "../../utils/documentFiles";
import { getUserRecipientFlow } from "../../utils/recipientFlow";
// DocumentDetailModal: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { ModalLayer } from "../ui/ModalLayer";
import { FormInput, FormSelect, FormTextarea } from "../ui/FormControls";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Typography,
} from "@mui/material";
import { hasCompletedPart } from "../../utils/routingRecipients";
import { cx } from "../../styles/muiClasses";
import React, { useState } from "react";
import {
  X,
  FileText,
  Printer,
  Send,
  CheckCircle2,
  Download,
  FileCheck,
  Paperclip,
  Upload,
  TrendingUp,
  Clock3,
  ChevronDown,
  UserRound,
  Trash2,
  Eye,
} from "lucide-react";
import {
  DocumentRecord,
  DocumentRouteStep,
  AuditLog,
  User,
  DEFAULT_ROLE_PERMISSIONS,
} from "../../types";
import {
  STATUS_CONFIGS,
  PRIORITY_CONFIGS,
  formatDate,
} from "../../utils/statusUtils";
import { api } from "../../services/api";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createDocumentDetailModalStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const soft = dark ? "#18181b" : "#fafafa";
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    // HANDLER TIMELINE: Explicit spacing keeps nested activity readable.
    ".document-detail-route-step": {
      padding: "16px !important",
      display: "grid",
      gap: 16,
      fontSize: 13,
      lineHeight: 1.6,
    },
    ".handler-details": {
      padding: "16px !important",
      display: "grid",
      gap: 16,
    },
    ".handler-details > div": { marginTop: "0 !important" },
    ".handler-facts": {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
      gap: "12px !important",
    },
    ".handler-facts > div": {
      padding: "12px !important",
      border: `1px solid ${border}`,
      borderRadius: 8,
      overflowWrap: "anywhere",
    },
    ".handler-activity": {
      padding: "4px 0 4px 16px !important",
      border: 0,
      borderLeft: `2px solid ${border}`,
      borderRadius: 0,
      background: "transparent",
      display: "grid",
      gap: 12,
    },
    ".handler-notice": {
      padding: "12px 14px !important",
      borderRadius: 8,
      lineHeight: 1.6,
    },
    ".handler-continuation": {
      padding: "10px 12px !important",
      display: "grid",
      gap: 8,
      borderLeft: `3px solid ${border}`,
    },
    ".handler-toggle.MuiButton-root": {
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
      padding: "14px !important",
      gap: 12,
      textAlign: "left",
      whiteSpace: "normal",
    },
    ".mui-systemdesign-system .document-detail-overlay": {
      backgroundColor: dark
        ? "rgba(2,6,23,.78) !important"
        : "rgba(24,24,27,.46) !important",
    },
    ".mui-systemdesign-system .document-detail-panel": {
      display: "flex",
      flexDirection: "column",
      background: `${surface} !important`,
      maxHeight: "calc(100dvh - 32px)",
      width: "min(1280px, calc(100vw - 32px)) !important",
      maxWidth: "1280px !important",
      borderRadius: "16px !important",
      borderColor: `${border} !important`,
      boxShadow: dark
        ? "0 24px 70px rgba(0,0,0,.42)"
        : "0 24px 70px rgba(24,24,27,.18)",
    },
    ".mui-systemdesign-system .document-detail-header": {
      flex: "0 0 auto",
      alignItems: "center",
      background: `${surface} !important`,
      borderColor: `${border} !important`,
    },
    ".mui-systemdesign-system .document-detail-content": {
      minHeight: 0,
      flex: "1 1 auto",
      background: `${soft} !important`,
      scrollbarWidth: "thin",
      scrollbarColor: `${dark ? "#52525b" : "#d4d4d8"} transparent`,
    },
    ".mui-systemdesign-system .document-detail-section": {
      padding: "16px !important",
      borderColor: `${border} !important`,
      background: `${surface} !important`,
      boxShadow: "none !important",
      borderRadius: "10px !important",
    },
    ".mui-systemdesign-system #document-routing-history": {
      background: "transparent !important",
      padding: "0 !important",
      border: "0 !important",
    },
    ".mui-systemdesign-system #document-routing-history .document-detail-route-step":
      {
        background: "transparent !important",
        border: "0 !important",
        padding: "0 !important",
      },
    // COMPACT HANDOFF LIST: transparent wrapper, surfaces only on recipient rows.
    ".mui-systemdesign-system .recipient-list-row": {
      background: surface,
      borderBottom: `1px solid ${border}`,
      borderRadius: 0,
    },
    ".mui-systemdesign-system .document-detail-section h3": {
      color: `${text} !important`,
      letterSpacing: ".04em",
    },
    ".mui-systemdesign-system .document-detail-route-step": {
      position: "relative",
      borderColor: `${border} !important`,
      borderLeftColor: `${theme.palette.primary.main} !important`,
      background: `${surface} !important`,
      boxShadow: "none !important",
    },
    ".mui-systemdesign-system .document-detail-route-step > div:first-child": {
      borderColor: `${border} !important`,
    },
    ".mui-systemdesign-system .document-detail-attachment": {
      borderColor: `${border} !important`,
      background: `${soft} !important`,
      boxShadow: "none !important",
    },
    ".mui-systemdesign-system .document-detail-upload": {
      borderColor: `${border} !important`,
      background: `${soft} !important`,
      color: `${text} !important`,
    },
    ".mui-systemdesign-system .document-detail-upload:hover": {
      borderColor: `${theme.palette.primary.main} !important`,
      background: `${theme.palette.primary.main}0d !important`,
    },
    ".mui-systemdesign-system .document-detail-empty-attachments": {
      borderColor: `${border} !important`,
      background: `${soft} !important`,
    },
    ".mui-systemdesign-system .document-detail-panel .MuiButton-root": {
      textTransform: "none",
    },
    '[class*="mui-documentdetailmodal"]': {
      borderRadius: "14px !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".handler-toggle.MuiButton-root": {
        flexDirection: "column",
        alignItems: "stretch",
      },
      ".handler-toggle > span:first-child": { minWidth: 0 },
      ".handler-toggle > span:first-child span": {
        whiteSpace: "normal",
        overflow: "visible",
        textOverflow: "clip",
        overflowWrap: "anywhere",
      },
      ".handler-toggle > span:last-child": { justifyContent: "space-between" },
      ".handler-details, .handler-activity, .document-detail-route-step": {
        padding: "12px !important",
      },
      ".mui-systemdesign-system .document-detail-overlay": {
        padding: "0 !important",
      },
      ".mui-systemdesign-system .document-detail-panel": {
        height: "100dvh",
        maxHeight: "100dvh",
        margin: "0 !important",
        borderRadius: "0 !important",
      },
      ".mui-systemdesign-system .document-detail-content": {
        padding: "12px !important",
      },
    },
  };
};

// RESPONSIVE LAYOUT: Component rules na ginagamit ng shared layout.
// BASE CSS: Pangunahing design ng component.
const documentDetailModalbaseCss = [
  // @media screen and (max-width: 767px)
  `.document-detail-overlay {
    align-items: stretch !important;
    padding: 0 !important;
  }`,
  // @media screen and (max-width: 767px)
  `.document-detail-panel {
    width: 100% !important;
    max-width: none !important;
    min-height: 100dvh;
    margin: 0 !important;
    border-width: 0 !important;
    border-radius: 0 !important;
    display: flex;
    flex-direction: column;
  }`,
  // @media screen and (max-width: 767px)
  `.document-detail-header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 0.75rem !important;
  }`,
  // @media screen and (max-width: 767px)
  `.document-detail-header > div {
    min-width: 0;
  }`,
  // @media screen and (max-width: 767px)
  `.document-detail-header > div > div:first-child {
    padding: 0.55rem !important;
  }`,
  // @media screen and (max-width: 767px)
  `.document-detail-content {
    flex: 1;
    max-height: none !important;
    padding: 0.75rem !important;
    overflow-y: auto;
  }`,
  // @media screen and (max-width: 767px)
  `.document-detail-content > * + * {
    margin-top: 0.85rem !important;
  }`,
  // @media screen and (max-width: 767px)
  `.document-detail-content .grid-cols-5 {
    gap: 0.15rem !important;
    font-size: 0.55rem !important;
  }`,
];

// RESPONSIVE LAYOUT: Component rules na ginagamit ng shared layout.
// BASE CSS: Pangunahing design ng component.
const documentDetailModalSystemDesignCss = [
  `.mui-systemdesign-system .document-detail-panel {
  border-radius: 1.1rem !important;
  box-shadow: 0 1.75rem 4.5rem rgb(15 23 42 / 24%) !important;
}`,
];

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface DocumentDetailModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onOpenRouteDoc: (doc: DocumentRecord) => void;
  onPrintSlip: (doc: DocumentRecord) => void;
  onDeleteDoc?: (doc: DocumentRecord) => void;
  currentUser: User;
  users: User[];
  auditLogs: AuditLog[];
  onRefreshDocument?: () => void;
  showFullFlow?: boolean;
}

const displayRouteRemarks = (remarks?: string) => {
  const value = remarks?.trim();
  if (
    !value ||
    value === "Logged in BLGF Document Tracking System" ||
    value === "Routed to all divisions during document logging"
  ) {
    return "N/A";
  }
  return value;
};

const getRouteDecision = (route: DocumentRouteStep) => {
  const text =
    `${route.actionRequested || ""} ${route.remarks || ""}`.toUpperCase();
  if (text.includes("DISAPPROVED")) return "DISAPPROVED";
  if (text.includes("APPROVED")) return "APPROVED";
  return undefined;
};

const cleanRouteDestination = (value?: string) =>
  (value || "")
    .split(/\s*\|\s*Assigned Handler \/ Individual Recipient:/i)[0]
    .trim();

const formatReadableStatus = (status?: string) =>
  (status || "IN PROGRESS")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const DIVISION_OFFICE_NAMES: Record<string, string> = {
  ITMS: "Information Technology Management System",
  ORD: "Office of the Regional Director",
  AD: "Administrative Division",
  LAOD: "Local Assessment Operations Division",
  LTOD: "Local Treasury Operations Division",
  FD: "Financial Division",
  LU: "Legal Division / Unit",
};

// DATA: Plain-language guidance for the document's current transaction state.
const NEXT_ACTION: Record<DocumentRecord["currentStatus"], string> = {
  PENDING:
    "The assigned handler reviews the document and starts the requested action.",
  IN_PROGRESS:
    "The handler records the work done, then forwards the document when ready.",
  FOR_SIGNATURE:
    "The designated approver reviews the document for signature or a decision.",
  RETURNED:
    "Review the return remarks and coordinate the requested corrections with the records handler.",
  ON_HOLD:
    "Review the hold remarks and resolve the pending requirement before continuing.",
  COMPLETED:
    "This transaction has ended. Follow the final handoff instructions below. No further routing is allowed.",
};

// PROGRESS DESIGN: Show the current stage, independently of recipient responses.
const TRANSACTION_STAGES = [
  "Received",
  "Processing",
  "For approval",
  "Completed",
];
const TRANSACTION_STAGE: Record<DocumentRecord["currentStatus"], number> = {
  PENDING: 0,
  IN_PROGRESS: 1,
  FOR_SIGNATURE: 2,
  COMPLETED: 3,
  RETURNED: 1,
  ON_HOLD: 1,
};

// FLOW DESIGN: connectors show recorded order, not a dependency between recipients.
function HandoffConnector({ label }: { label?: string }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 0.5,
        color: "text.secondary",
      }}
    >
      <Box sx={{ height: 22, width: 2, bgcolor: "text.secondary" }} />
      <ChevronDown size={20} strokeWidth={2} />
      {label && (
        <Typography sx={{ fontSize: 12, mt: 0.25, mb: 0.5 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}

// LOGIC: State, events, at pagproseso ng data.
export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  onOpenRouteDoc,
  onPrintSlip,
  onDeleteDoc,
  currentUser,
  users,
  auditLogs,
  showFullFlow = false,
  onRefreshDocument,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFlowRecipient, setSelectedFlowRecipient] = useState<
    string | null
  >(null);
  const [viewingPdf, setViewingPdf] = useState<{
    url: string;
    name: string;
    shouldRevoke: boolean;
  } | null>(null);
  if (!document) return null;

  const cfg = STATUS_CONFIGS[document.currentStatus];
  const prioCfg = PRIORITY_CONFIGS[document.priority];
  const effectivePermissions =
    currentUser.permissions || DEFAULT_ROLE_PERMISSIONS[currentUser.role];
  // Document Routing Slip is a single permission covering access and printing.
  const canAccessDocumentSlip = (
    effectivePermissions.allowedViews || []
  ).includes("slip");
  const isCurrentUserRouteSender = (route: DocumentRouteStep) =>
    route.fromUserId === currentUser.id;
  const isCurrentUserRouteRecipient = (route: DocumentRouteStep) =>
    route.toUserId === currentUser.id;
  const isDocumentParticipant =
    currentUser.role === "SYSTEM_ADMIN" ||
    effectivePermissions.canViewAllDocuments ||
    document.createdByUserId === currentUser.id ||
    document.assignedUserId === currentUser.id ||
    Boolean(
      document.routes?.some(
        (route) =>
          isCurrentUserRouteSender(route) || route.toUserId === currentUser.id,
      ),
    ) ||
    auditLogs.some(
      (log) =>
        log.documentTrackingNumber === document.trackingNumber &&
        (log.userId === currentUser.id ||
          new RegExp(
            `\\bTo:\\s*${currentUser.fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*\\||$)`,
            "i",
          ).test(log.details)),
    );
  // The audit trail shows the complete document flow. Access to the document
  // itself is still controlled by isDocumentParticipant/canViewAllDocuments.
  const storedRoutes = document.routes || [];
  const recoveredAuditRoutes: DocumentRouteStep[] = auditLogs
    .filter(
      (log) =>
        log.documentTrackingNumber === document.trackingNumber &&
        log.action === "ROUTE_DOC" &&
        /\bTo:\s*([^|]+)/i.test(log.details),
    )
    .map((log, index) => {
      const toUser = cleanRouteDestination(
        log.details.match(/\bTo:\s*([^|]+)/i)?.[1],
      );
      const actionRequested =
        log.details.match(/Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i)?.[1] ||
        "Appropriate Action";
      const recipient = users.find(
        (user) =>
          user.fullName.trim().toLowerCase() === toUser.trim().toLowerCase(),
      );
      const sender = users.find((user) => user.id === log.userId);
      const statusAfter =
        log.details.match(/Status:\s*([^|]+)$/i)?.[1]?.trim() ||
        document.currentStatus;
      return {
        id: `audit-route-${log.id}`,
        documentId: document.id,
        stepNumber: storedRoutes.length + index + 1,
        routeNo: document.routeNo || document.trackingNumber,
        fromDivision: sender?.divisionCode || document.currentDivision,
        fromUserId: log.userId,
        fromUser: log.userName,
        toDivision: recipient?.divisionCode || document.currentDivision,
        toUser: recipient?.fullName || toUser,
        toUserId: recipient?.id,
        actionRequested,
        remarks:
          log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] ||
          "",
        statusBefore: document.currentStatus,
        statusAfter: statusAfter as DocumentRecord["currentStatus"],
        receivedAt: log.timestamp,
        createdAt: log.timestamp,
      } satisfies DocumentRouteStep;
    })
    .filter(
      (auditRoute) =>
        auditRoute.toUser &&
        !/^N\/A(?:\s|$)/i.test(auditRoute.toUser) &&
        !storedRoutes.some(
          (route) =>
            (route.fromUserId === auditRoute.fromUserId ||
              route.fromUser.trim().toLowerCase() ===
                auditRoute.fromUser.trim().toLowerCase()) &&
            (route.toUserId === auditRoute.toUserId ||
              route.toUser?.trim().toLowerCase() ===
                auditRoute.toUser?.trim().toLowerCase()) &&
            route.actionRequested.trim().toLowerCase() ===
              auditRoute.actionRequested.trim().toLowerCase() &&
            Math.abs(
              new Date(route.createdAt).getTime() -
                new Date(auditRoute.createdAt).getTime(),
            ) < 5000,
        ),
    );
  const visibleRoutes = [...storedRoutes, ...recoveredAuditRoutes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const isSameDispatch = (
    route: DocumentRouteStep,
    candidate: DocumentRouteStep,
  ) =>
    !getRouteDecision(route) &&
    !getRouteDecision(candidate) &&
    candidate.createdAt === route.createdAt &&
    candidate.fromUserId === route.fromUserId &&
    candidate.routeNo === route.routeNo &&
    candidate.actionRequested === route.actionRequested;
  // Older multi-recipient records were sometimes saved without isMultiRoute.
  // Infer the batch from the common dispatch fields so they remain one route
  // step with one progress sub-step per handler.
  const getRouteBatch = (route: DocumentRouteStep) => {
    const batch = (document.routes || []).filter((candidate) =>
      isSameDispatch(route, candidate),
    );
    return batch.length > 0 ? batch : [route];
  };
  const getRouteDivisions = (route: DocumentRouteStep) =>
    [...new Set(getRouteBatch(route).map((item) => item.toDivision))]
      .filter(Boolean)
      .join(", ");
  const resolveUserName = (userId?: string, legacyName?: string) =>
    users.find((user) => user.id === userId)?.fullName || legacyName || "";
  const matchesPerson = (
    firstId?: string,
    firstName?: string,
    secondId?: string,
    secondName?: string,
  ) => {
    if (firstId && secondId) return firstId === secondId;
    const first = resolveUserName(firstId, firstName).trim().toLowerCase();
    const second = resolveUserName(secondId, secondName).trim().toLowerCase();
    return Boolean(first && second && first === second);
  };
  const getRouteHandlers = (route: DocumentRouteStep) =>
    [
      ...new Set(
        getRouteBatch(route)
          .map((item) => resolveUserName(item.toUserId, item.toUser))
          .filter(Boolean),
      ),
    ].join(", ");
  const sharedDocumentFiles = (document.attachments || []).filter((file) =>
    isSharedDocumentFile(file, document, auditLogs),
  );
  const getRouteAttachments = (route: DocumentRouteStep) =>
    route.attachments || [];
  const sameRouteUser = (
    firstId?: string,
    firstName?: string,
    secondId?: string,
    secondName?: string,
  ) =>
    Boolean(firstId && secondId && firstId === secondId) ||
    Boolean(
      resolveUserName(firstId, firstName).trim().toLowerCase() &&
      resolveUserName(firstId, firstName).trim().toLowerCase() ===
        resolveUserName(secondId, secondName).trim().toLowerCase(),
    );
  const recipientWasAlreadyInvolved = (route: DocumentRouteStep) =>
    sameRouteUser(
      document.createdByUserId,
      document.createdBy,
      route.toUserId,
      route.toUser,
    ) ||
    (document.routes || []).some(
      (candidate) =>
        candidate.id !== route.id &&
        new Date(candidate.createdAt).getTime() <
          new Date(route.createdAt).getTime() &&
        (sameRouteUser(
          candidate.fromUserId,
          candidate.fromUser,
          route.toUserId,
          route.toUser,
        ) ||
          sameRouteUser(
            candidate.toUserId,
            candidate.toUser,
            route.toUserId,
            route.toUser,
          )),
    );
  // Every delivery is a handoff, including onward forwarding. Decisions and
  // completion-only records remain within the responsible recipient's activity.
  const historyRoutes = visibleRoutes.filter(
    (route, index, routes) =>
      !getRouteDecision(route) &&
      Boolean(route.toUserId || route.toUser?.trim()) &&
      index ===
        routes.findIndex((candidate) => isSameDispatch(route, candidate)),
  );
  const selectedRecipientId = visibleRoutes.some(
    (route) => route.id === selectedFlowRecipient,
  )
    ? selectedFlowRecipient
    : historyRoutes[0]?.id;
  const selectFlowRecipient = (id: string) => {
    setSelectedFlowRecipient(id);
  };
  const getDecisionSubsteps = (route: DocumentRouteStep) => {
    const recipientIds = getRouteBatch(route)
      .map((item) => item.toUserId)
      .filter(Boolean);
    const recipientNames = getRouteBatch(route)
      .map((item) => resolveUserName(item.toUserId, item.toUser).toLowerCase())
      .filter(Boolean);
    return (document.routes || []).filter(
      (candidate) =>
        Boolean(getRouteDecision(candidate)) &&
        new Date(candidate.createdAt).getTime() >=
          new Date(route.createdAt).getTime() &&
        (recipientIds.includes(candidate.fromUserId) ||
          recipientNames.includes(
            resolveUserName(
              candidate.fromUserId,
              candidate.fromUser,
            ).toLowerCase(),
          )),
    );
  };
  const getHandlerDecision = (handlerRoute: DocumentRouteStep) => {
    const savedDecision = getDecisionSubsteps(handlerRoute)
      .filter((decision) =>
        matchesPerson(
          decision.fromUserId,
          decision.fromUser,
          handlerRoute.toUserId,
          handlerRoute.toUser,
        ),
      )
      .at(-1);

    // Recover legacy decisions that reached the immutable audit log but whose
    // route row was lost by the old refresh-before-save race condition.
    const auditDecision = auditLogs
      .filter(
        (log) =>
          [document.trackingNumber, document.routeNo].includes(
            log.documentTrackingNumber,
          ) &&
          (log.userId === handlerRoute.toUserId ||
            log.userName.trim().toLowerCase() ===
              resolveUserName(handlerRoute.toUserId, handlerRoute.toUser)
                .trim()
                .toLowerCase()) &&
          new Date(log.timestamp).getTime() >=
            new Date(handlerRoute.createdAt).getTime() &&
          /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .at(-1);
    if (!auditDecision) return savedDecision;

    const decision = auditDecision.details
      .match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]
      .toUpperCase() as "APPROVED" | "DISAPPROVED";
    const auditRemarks =
      auditDecision.details.match(
        /Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i,
      )?.[1] ||
      auditDecision.details.match(/Remarks:\s*(.*)$/i)?.[1] ||
      (decision === "APPROVED"
        ? "Approved; proceed with routing."
        : "No reason recorded.");
    const recoveredDecision = {
      ...handlerRoute,
      id: `audit-decision-${auditDecision.id}`,
      fromDivision: handlerRoute.toDivision,
      fromUserId: auditDecision.userId,
      fromUser: auditDecision.userName,
      actionRequested: decision,
      remarks: auditRemarks,
      statusAfter: decision === "DISAPPROVED" ? "RETURNED" : "IN_PROGRESS",
      processedAt: auditDecision.timestamp,
      createdAt: auditDecision.timestamp,
    } satisfies DocumentRouteStep;
    if (!savedDecision) return recoveredDecision;
    return new Date(recoveredDecision.createdAt).getTime() >
      new Date(savedDecision.createdAt).getTime()
      ? recoveredDecision
      : savedDecision;
  };
  const getHandlerActivitySubsteps = (handlerRoute: DocumentRouteStep) => {
    const handlerId = handlerRoute.toUserId;
    const handlerName = resolveUserName(
      handlerRoute.toUserId,
      handlerRoute.toUser,
    )
      .trim()
      .toLowerCase();
    const assignedAt = new Date(handlerRoute.createdAt).getTime();
    const routeActivities = (document.routes || [])
      .filter(
        (route) =>
          route.id !== handlerRoute.id &&
          !getRouteDecision(route) &&
          new Date(route.createdAt).getTime() > assignedAt &&
          matchesPerson(
            route.fromUserId,
            route.fromUser,
            handlerId,
            handlerName,
          ),
      )
      .map((route) => ({
        id: route.id,
        action:
          route.actionRequested || route.actionTaken || "Action completed",
        remarks: displayRouteRemarks(route.remarks),
        timestamp: route.createdAt,
        status: route.statusAfter,
        destination: cleanRouteDestination(
          resolveUserName(route.toUserId, route.toUser) || route.toDivision,
        ),
        recipientId: route.toUserId,
        destinationDivision: route.toDivision,
        attachments: getRouteAttachments(route),
      }));
    const auditActivities = auditLogs
      .filter(
        (log) =>
          log.documentTrackingNumber === document.trackingNumber &&
          new Date(log.timestamp).getTime() > assignedAt &&
          matchesPerson(log.userId, log.userName, handlerId, handlerName) &&
          [
            "ROUTE_DOC",
            "TRANSFER_DOC",
            "UPDATE_STATUS",
            "UPLOAD_ATTACHMENT",
          ].includes(log.action) &&
          !/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
      )
      .map((log) => {
        const action =
          log.action === "UPLOAD_ATTACHMENT"
            ? "File uploaded"
            : log.details.match(
                /Action:\s*(.*?)(?:\s*\|\s*Remarks:|$)/i,
              )?.[1] ||
              (log.action === "TRANSFER_DOC"
                ? "Transferred"
                : "Action completed");
        const remarks =
          log.details.match(/Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i)?.[1] ||
          "N/A";
        const status =
          log.details.match(/Status:\s*([^|]+)$/i)?.[1]?.trim() || "";
        const destination = cleanRouteDestination(
          log.details.match(
            /To:\s*(.*?)(?:\s*\|\s*(?:Assigned|Action):|$)/i,
          )?.[1],
        );
        const recipient = users.find(
          (user) =>
            user.fullName.trim().toLowerCase() ===
            destination.trim().toLowerCase(),
        );
        return {
          id: `audit-activity-${log.id}`,
          action,
          remarks,
          timestamp: log.timestamp,
          status,
          destination,
          recipientId: recipient?.id,
          destinationDivision: "",
          // Legacy handler replies sometimes persisted files only at document
          // level while the action itself survived in the audit log.
          attachments:
            log.action === "UPLOAD_ATTACHMENT"
              ? (document.attachments || []).filter(
                  (file) =>
                    file.fileName ===
                    log.details.match(/Uploaded file attachment "(.*?)"/)?.[1],
                )
              : [],
        };
      })
      .filter(
        (audit) =>
          !routeActivities.some(
            (route) =>
              route.action.trim().toLowerCase() ===
                audit.action.trim().toLowerCase() &&
              Math.abs(
                new Date(route.timestamp).getTime() -
                  new Date(audit.timestamp).getTime(),
              ) < 5000,
          ),
      );
    return [...routeActivities, ...auditActivities].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  };
  const getContinuationDecision = (activity: {
    recipientId?: string;
    destination: string;
    timestamp: string;
  }) => {
    if (!activity.destination) return undefined;
    const destinationName = activity.destination.trim().toLowerCase();
    const routeDecision = (document.routes || [])
      .filter(
        (route) =>
          Boolean(getRouteDecision(route)) &&
          new Date(route.createdAt).getTime() >
            new Date(activity.timestamp).getTime() &&
          matchesPerson(
            route.fromUserId,
            route.fromUser,
            activity.recipientId,
            destinationName,
          ),
      )
      .at(-1);
    if (routeDecision) {
      return {
        status: getRouteDecision(routeDecision),
        remarks: displayRouteRemarks(routeDecision.remarks),
        timestamp: routeDecision.createdAt,
      };
    }
    const auditDecision = auditLogs
      .filter(
        (log) =>
          log.documentTrackingNumber === document.trackingNumber &&
          new Date(log.timestamp).getTime() >
            new Date(activity.timestamp).getTime() &&
          (log.userId === activity.recipientId ||
            log.userName.trim().toLowerCase() === destinationName) &&
          /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )[0];
    if (!auditDecision) return undefined;
    return {
      status: auditDecision.details
        .match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]
        .toUpperCase() as "APPROVED" | "DISAPPROVED",
      remarks:
        auditDecision.details.match(
          /Remarks:\s*(.*?)(?:\s*\|\s*Status:|$)/i,
        )?.[1] || "N/A",
      timestamp: auditDecision.timestamp,
    };
  };
  const continuationRequiresApproval = (activity: {
    recipientId?: string;
    destination: string;
    timestamp: string;
  }) => {
    const destinationName = activity.destination.trim().toLowerCase();
    const sameActivityRecipient = (userId?: string, userName?: string) =>
      Boolean(activity.recipientId && userId === activity.recipientId) ||
      Boolean(
        destinationName &&
        resolveUserName(userId, userName).trim().toLowerCase() ===
          destinationName,
      );
    if (sameActivityRecipient(document.createdByUserId, document.createdBy)) {
      return false;
    }
    const activityTime = new Date(activity.timestamp).getTime();
    return !(document.routes || []).some(
      (route) =>
        new Date(route.createdAt).getTime() < activityTime &&
        (sameActivityRecipient(route.fromUserId, route.fromUser) ||
          sameActivityRecipient(route.toUserId, route.toUser)),
    );
  };
  const latestDocumentDecision = [
    ...(document.routes || [])
      .map((route) => ({
        status: getRouteDecision(route),
        timestamp: route.createdAt,
      }))
      .filter((item) => item.status),
    ...auditLogs
      .filter(
        (log) =>
          log.documentTrackingNumber === document.trackingNumber &&
          /(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i.test(log.details),
      )
      .map((log) => ({
        status: log.details
          .match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]
          .toUpperCase() as "APPROVED" | "DISAPPROVED",
        timestamp: log.timestamp,
      })),
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0]?.status;
  const pendingDecisionRoute = [...(document.routes || [])]
    .reverse()
    .find(
      (route) =>
        !getRouteDecision(route) &&
        matchesPerson(
          route.toUserId,
          route.toUser,
          currentUser.id,
          currentUser.fullName,
        ) &&
        !getHandlerDecision(route),
    );
  // Keep Route / Forward available to every authorized participant throughout
  // the active lifecycle. A decision closes only that handler's action; it must
  // not remove the ability to create a later routing step.
  const canRouteDocument =
    document.currentStatus !== "COMPLETED" &&
    !hasCompletedPart(document, currentUser) &&
    document.currentStatus !== "RETURNED" &&
    latestDocumentDecision !== "DISAPPROVED" &&
    !pendingDecisionRoute &&
    isDocumentParticipant;
  // RECIPIENT PROGRESS: resolve each assignment inside its own handoff.
  const getRecipientSnapshot = (route: DocumentRouteStep) => {
    const decision = getHandlerDecision(route);
    const response = decision ? getRouteDecision(decision) : undefined;
    const activities = getHandlerActivitySubsteps(route);
    const latestActivity = activities.at(-1);
    const decisionIsLatest =
      decision &&
      (!latestActivity ||
        new Date(decision.createdAt).getTime() >=
          new Date(latestActivity.timestamp).getTime());
    const completedActivity = [...activities]
      .reverse()
      .find((activity) => activity.status === "COMPLETED");
    const ended = Boolean(completedActivity);
    const status = ended
      ? "Completed"
      : decisionIsLatest
        ? formatReadableStatus(response)
        : latestActivity?.destination
          ? "Forwarded"
          : latestActivity
            ? "Activity recorded"
            : "No response recorded";
    return {
      route,
      status,
      response,
      ended,
      finalAction: completedActivity?.remarks,
      progress: ended ? 2 : activities.length || decision ? 1 : 0,
      lastUpdated:
        completedActivity?.timestamp ||
        (decisionIsLatest
          ? decision.createdAt
          : latestActivity?.timestamp || route.createdAt),
    };
  };

  // BRANCHES: attach each delivery to the earlier recipient who forwarded it.
  const flowRecipients = showFullFlow
    ? historyRoutes.flatMap(getRouteBatch)
    : getUserRecipientFlow(
        historyRoutes.flatMap(getRouteBatch),
        currentUser.id,
        currentUser.fullName,
      );
  const flowChildren = new Map<string, DocumentRouteStep[]>();
  const flowRoots: DocumentRouteStep[] = [];
  flowRecipients.forEach((recipient, index) => {
    const parent = flowRecipients
      .slice(0, index)
      .reverse()
      .find((previous) =>
        matchesPerson(
          recipient.fromUserId,
          recipient.fromUser,
          previous.toUserId,
          resolveUserName(previous.toUserId, previous.toUser),
        ),
      );
    if (parent)
      flowChildren.set(parent.id, [
        ...(flowChildren.get(parent.id) || []),
        recipient,
      ]);
    else flowRoots.push(recipient);
  });
  const selectedRoute =
    flowRecipients.find((route) => route.id === selectedRecipientId) ||
    flowRecipients[0];
  const selectedSnapshot = selectedRoute
    ? getRecipientSnapshot(selectedRoute)
    : undefined;
  const selectedActivities = selectedRoute
    ? getHandlerActivitySubsteps(selectedRoute)
    : [];
  const selectedDecision = selectedRoute
    ? getHandlerDecision(selectedRoute)
    : undefined;
  const flowRootSenders = [
    ...new Set(
      flowRoots
        .map((route) => resolveUserName(route.fromUserId, route.fromUser))
        .filter(Boolean),
    ),
  ];
  // Keep original files separate from the selected recipient's response uploads.
  const sharedFileIds = new Set(
    sharedDocumentFiles.map((file) => file.id || file.url || file.fileName),
  );
  const recipientResponseFiles = [
    ...new Map(
      [
        ...(selectedRoute?.attachments || []),
        ...(document.attachments || []).filter(file =>
  file.uploadedByUserId === selectedRoute?.toUserId
),
        ...selectedActivities.flatMap((activity) => activity.attachments || []),
        ...(selectedDecision?.attachments || []),
      ]
        .filter(
          (file) => !sharedFileIds.has(file.id || file.url || file.fileName),
        )
        .map((file) => [file.id || file.url || file.fileName, file]),
    ).values(),
  ];
  const renderFlowNode = (
    recipient: DocumentRouteStep,
    flowNumber: string,
  ): React.ReactNode => {
    const snapshot = getRecipientSnapshot(recipient);
    const children = flowChildren.get(recipient.id) || [];
    const routeDecision = getHandlerDecision(recipient);
    const disapprovalReason =
      snapshot.response === "DISAPPROVED" &&
      routeDecision?.remarks &&
      !/^(N\/A|None)$/i.test(routeDecision.remarks.trim())
        ? displayRouteRemarks(routeDecision.remarks)
        : "";
    const statusLabel = snapshot.ended
      ? "Completed"
      : snapshot.response
        ? formatReadableStatus(snapshot.response)
        : snapshot.status === "No response recorded"
          ? "Pending"
          : snapshot.status;
    const statusColor =
      snapshot.ended || snapshot.response === "APPROVED"
        ? "success"
        : snapshot.response === "DISAPPROVED"
          ? "error"
          : snapshot.status === "Forwarded" ||
              snapshot.status === "Activity recorded"
            ? "info"
            : "default";
    return (
      <Box
        component="li"
        key={recipient.id}
        sx={{
          listStyle: "none",
          minWidth: 0,
          mb: 2,
          position: "relative",
          ...(flowNumber.includes(".")
            ? {
                "&:before": {
                  content: '""',
                  position: "absolute",
                  left: -18,
                  top: 24,
                  width: 16,
                  borderTop: "2px solid",
                  borderColor: "text.secondary",
                },
                "&:after": {
                  content: '""',
                  position: "absolute",
                  left: -7,
                  top: 20,
                  width: 8,
                  height: 8,
                  borderTop: "2px solid",
                  borderRight: "2px solid",
                  borderColor: "text.secondary",
                  transform: "rotate(45deg)",
                },
              }
            : {}),
        }}
      >
        <Button
          aria-pressed={selectedRoute?.id === recipient.id}
          aria-controls="flow-recipient-details"
          onClick={() => selectFlowRecipient(recipient.id)}
          sx={{
            "&&": {
              display: "block",
              width: "100%",
              textAlign: "left",
              p: 1.5,
              bgcolor: "background.paper",
              color: "text.primary",
              border: "1px solid",
              borderColor:
                selectedRoute?.id === recipient.id ? "text.primary" : "divider",
              borderRadius: 1,
              textTransform: "none",
              whiteSpace: "normal",
            },
          }}
        >
          <Box
            component="span"
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
              minHeight: 24,
            }}
          >
            <Box
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                minWidth: 0,
              }}
            >
              <Box
                component="span"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  bgcolor: "text.primary",
                  color: "background.paper",
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                Step {flowNumber}
              </Box>
              <Typography
                component="span"
                sx={{ fontSize: 17, fontWeight: 650, overflowWrap: "anywhere" }}
              >
                {resolveUserName(recipient.toUserId, recipient.toUser) ||
                  recipient.toDivision}
              </Typography>
            </Box>
            <Chip
              component="span"
              size="small"
              label={statusLabel}
              color={statusColor}
              variant={statusColor === "default" ? "outlined" : "filled"}
              sx={{ fontSize: 12, fontWeight: 650, flexShrink: 0 }}
            />
          </Box>
          <Box
            component="span"
            aria-label={`Progress for ${resolveUserName(recipient.toUserId, recipient.toUser)}: ${snapshot.status}`}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 0.5,
              mt: 1,
            }}
          >
            {[
              "Received",
              snapshot.response === "APPROVED"
                ? "Approved"
                : snapshot.response === "DISAPPROVED"
                  ? "Disapproved"
                  : "Action recorded",
              "Completed",
            ].map((label, index) => (
              <Box
                component="span"
                key={label}
                sx={{
                  borderTop: "2px solid",
                  borderColor:
                    index <= snapshot.progress
                      ? snapshot.ended
                        ? "success.main"
                        : "text.primary"
                      : "divider",
                  pt: 0.5,
                  fontSize: 13,
                  color:
                    index <= snapshot.progress
                      ? "text.primary"
                      : "text.secondary",
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
          {disapprovalReason && (
            <Box
              component="span"
              sx={{
                display: "block",
                mt: 1.25,
                p: 1.25,
                border: "1px solid",
                borderLeftWidth: 3,
                borderColor: "error.main",
                bgcolor: "background.default",
                color: "text.primary",
                borderRadius: 1.5,
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              <Box
                component="span"
                sx={{
                  display: "block",
                  mb: 0.25,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "error.main",
                }}
              >
                Reason for disapproval
              </Box>
              <Box component="span" sx={{ color: "text.secondary" }}>
                {disapprovalReason}
              </Box>
            </Box>
          )}
        </Button>
        {snapshot.ended && (
          <>
            <HandoffConnector />
            <Box
              role="status"
              sx={{
                mx: "auto",
                width: "fit-content",
                px: 3,
                py: 1,
                borderRadius: 20,
                border: "1px solid",
                borderColor: "success.main",
                bgcolor: "background.paper",
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 650 }}>
                End - Part completed
              </Typography>
            </Box>
          </>
        )}
        {children.length > 0 && (
          <Box
            component="ul"
            aria-label={`Forwarded by ${resolveUserName(recipient.toUserId, recipient.toUser)}`}
            sx={{
              m: 0,
              mt: 1,
              ml: { xs: 1, sm: 2 },
              pl: 2,
              borderLeft: "2px solid",
              borderColor: "text.secondary",
              listStyle: "none",
            }}
          >
            {children.map((child, index) =>
              renderFlowNode(child, `${flowNumber}.${index + 1}`),
            )}
          </Box>
        )}
      </Box>
    );
  };
  const flowStepNumbers = new Map<string, string>();
  const recordFlowSteps = (route: DocumentRouteStep, step: string) => {
    if (flowStepNumbers.has(route.id)) return;
    flowStepNumbers.set(route.id, step);
    (flowChildren.get(route.id) || []).forEach((child, index) =>
      recordFlowSteps(child, `${step}.${index + 1}`),
    );
  };
  flowRoots.forEach((root) => recordFlowSteps(root, "1"));
  const flowSummaryEvents = flowRecipients.map((route) => ({
    route,
    snapshot: getRecipientSnapshot(route),
    activities: getHandlerActivitySubsteps(route),
    decision: getHandlerDecision(route),
    step: flowStepNumbers.get(route.id) || String(route.stepNumber || 1),
    files: [
      ...new Map(
        [
          ...(route.attachments || []),
          ...(document.attachments || []).filter(
            (file) =>
              file.attachmentScope === "RECIPIENT" &&
              file.uploadedByUserId === route.toUserId &&
              (!file.uploadedForRouteId ||
                file.uploadedForRouteId === route.id),
          ),
          ...getHandlerActivitySubsteps(route).flatMap(
            (activity) => activity.attachments || [],
          ),
          ...(getHandlerDecision(route)?.attachments || []),
        ]
          .filter(
            (file) => !sharedFileIds.has(file.id || file.url || file.fileName),
          )
          .map((file) => [file.id || file.url || file.fileName, file]),
      ).values(),
    ],
  }));
  const finalReleaseRoute = [...(document.routes || [])]
    .reverse()
    .find((route) => route.statusAfter === "COMPLETED");
  const finalReleaseRemarks = finalReleaseRoute?.remarks || "";
  const completingUser = users.find(
    (user) => user.id === finalReleaseRoute?.fromUserId,
  );
  const completingDivision =
    completingUser?.divisionCode || finalReleaseRoute?.fromDivision;
  const completedAtOffice = completingDivision
    ? `${DIVISION_OFFICE_NAMES[completingDivision] || completingDivision} (${completingDivision})`
    : "Office not recorded";
  const legacyPickupLocation =
    finalReleaseRemarks
      .match(/Pickup Location:\s*(.*?)(?:\s*\|\s*Next Action:|$)/i)?.[1]
      ?.trim() ||
    (finalReleaseRemarks && !/Pickup Location:/i.test(finalReleaseRemarks)
      ? finalReleaseRemarks
      : "Pickup location was not recorded.");
  const legacyNextAction =
    finalReleaseRemarks.match(/Next Action:\s*(.*)$/i)?.[1]?.trim() ||
    "Contact the completing office for the next instruction.";
  const finalHandoffInstructions =
    finalReleaseRemarks.match(/Handoff Instructions:\s*(.*)$/i)?.[1]?.trim() ||
    `${legacyPickupLocation} ${legacyNextAction}`.trim();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files) as File[]) {
        if (file.size > 7 * 1024 * 1024) {
          throw new Error(`${file.name} exceeds the 7 MB attachment limit.`);
        }
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const storedFile = await api.uploadToStorage(
          "documentAttachments",
          file,
        );
        await api.attachFile(document.id, {
          fileName: file.name,
          fileSize: `${sizeMb} MB`,
          fileType: documentFileType(file),
          url: storedFile.url,
          fileData: (storedFile as { fileData?: string }).fileData,
          actingUserId: currentUser.id,
          actingUserName: currentUser.fullName,
          actingUserRole: currentUser.role,
        });
      }
      alert("✅ Attachment uploaded successfully!");
      if (onRefreshDocument) onRefreshDocument();
    } catch (err: any) {
      alert("Failed to upload file: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const createAttachmentObjectUrl = (url: string) => {
    if (!url.startsWith("data:")) return { url, shouldRevoke: false };

    const [metadata, encodedData = ""] = url.split(",", 2);
    const mimeType =
      metadata.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
    const isBase64 = metadata.includes(";base64");
    const binary = isBase64
      ? window.atob(encodedData)
      : decodeURIComponent(encodedData);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return {
      url: URL.createObjectURL(new Blob([bytes], { type: mimeType })),
      shouldRevoke: true,
    };
  };

  const closePdfViewer = () => {
    if (viewingPdf?.shouldRevoke) URL.revokeObjectURL(viewingPdf.url);
    setViewingPdf(null);
  };

  const handleViewAttachment = (
    file: DocumentRecord["attachments"][number],
  ) => {
    if (!file.url) return;
  
    const isPreviewable =
  file.fileType === "application/pdf" ||
  file.fileType === "image/jpeg" ||
  file.fileType === "image/png" ||
  file.fileName.toLowerCase().endsWith(".pdf") ||
  file.fileName.toLowerCase().endsWith(".jpg") ||
  file.fileName.toLowerCase().endsWith(".jpeg") ||
  file.fileName.toLowerCase().endsWith(".png");
  
    try {
      const preview = createAttachmentObjectUrl(file.url);
      if (isPreviewable) {
        setViewingPdf({
          url: preview.url,
          name: file.fileName,
          shouldRevoke: preview.shouldRevoke,
        });
        return;
      }

      // Non-PDF files continue to use the browser's native viewer.
      const previewWindow = window.open(
        preview.url,
        "_blank",
        "noopener,noreferrer",
      );
      if (!previewWindow) {
        if (preview.shouldRevoke) URL.revokeObjectURL(preview.url);
        alert("Please allow pop-ups to view this attachment.");
        return;
      }
      previewWindow.location.replace(preview.url);
      if (preview.shouldRevoke) {
        window.setTimeout(() => URL.revokeObjectURL(preview.url), 60_000);
      }
    } catch {
      alert(
        "This attachment could not be opened. Please use Download instead.",
      );
    }
  };

  const handleDownloadAttachment = (
    file: DocumentRecord["attachments"][number],
  ) => {
    if (!file.url) return;
    const download = createAttachmentObjectUrl(file.url);
    const link = window.document.createElement("a");
    link.href = download.url;
    link.download = file.fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    if (download.shouldRevoke) {
      window.setTimeout(() => URL.revokeObjectURL(download.url), 1_000);
    }
  };

  // FILE SECTION DESIGN: compact rows with readable names and clear actions.
  const renderFlowFiles = (
    title: string,
    description: string,
    files: DocumentRecord["attachments"],
    emptyMessage: string,
    showPdfPreview = false,
  ) => (
    <Box
      component="section"
      aria-label={title}
      sx={{
        mt: 2.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 2, py: 1.5, bgcolor: "action.hover" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography component="h4" sx={{ fontSize: 16, fontWeight: 650 }}>
            {title}
          </Typography>
          <Chip
            size="small"
            label={files.length}
            aria-label={files.length + " files"}
            sx={{ height: 24, fontSize: 13 }}
          />
        </Box>
        <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
      {!files.length && (
        <Typography sx={{ p: 2, fontSize: 14, color: "text.secondary" }}>
          {emptyMessage}
        </Typography>
      )}
      {files.map((file) => (
        <Box
          key={file.id || file.url || file.fileName}
          sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Typography
            sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}
          >
            {file.fileName}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
            {[file.fileSize, file.uploadDate ? formatDate(file.uploadDate) : ""]
              .filter(Boolean)
              .join(" - ")}
              {showPdfPreview &&
  file.url &&
  (file.fileType === "application/pdf" ||
    file.fileName.toLowerCase().endsWith(".pdf")) && (
    <Box
      sx={{
        mt: 2,
        width: "100%",
        height: 600,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <iframe
        src={file.url}
        title={file.fileName}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
    </Box>
  )}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
           {!showPdfPreview && (
  <Button
    variant="outlined"
    startIcon={<Eye size={16} />}
    disabled={!file.url}
    onClick={() => handleViewAttachment(file)}
    aria-label={"View " + file.fileName}
    sx={{ minHeight: 44, textTransform: "none" }}
  >
    View
  </Button>
)}
            <Button
              variant="outlined"
              disabled={!file.url}
              onClick={() => handleDownloadAttachment(file)}
              aria-label={"Download " + file.fileName}
              sx={{ minHeight: 44, textTransform: "none" }}
            >
              Download
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );

  const handlePrintAttachment = (url?: string) => {
    if (!url) return;
    const frame = window.document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.opacity = "0";
    frame.src = url;
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1000);
    };
    window.document.body.appendChild(frame);
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <DocumentDetailModalDesign />
      {
        <ModalLayer onClose={() => (viewingPdf ? closePdfViewer() : onClose())}>
          {viewingPdf && (
            <ModalLayer onClose={closePdfViewer}>
              <div
                className={cx(
                  "fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-2 backdrop-blur-md sm:p-4",
                )}
                role="dialog"
                aria-modal="true"
                aria-label={`PDF viewer: ${viewingPdf.name}`}
              >
                <div
                  className={cx(
                    "flex h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 sm:h-[92vh] sm:rounded-2xl",
                  )}
                >
                  <div
                    className={cx(
                      "flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800 sm:px-4 sm:py-3",
                    )}
                  >
                    <div className={cx("flex min-w-0 items-center gap-2")}>
                      <FileText
                        className={cx("h-4 w-4 shrink-0 text-slate-600")}
                      />
                      <span
                        className={cx("truncate text-xs font-bold sm:text-sm")}
                      >
                        {viewingPdf.name}
                      </span>
                    </div>
                    <div className={cx("flex shrink-0 items-center gap-1")}>
                      <Button
                        type="button"
                        onClick={() =>
                          window.open(
                            viewingPdf.url,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className={cx(
                          "inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:bg-blue-950/50 dark:text-slate-300",
                        )}
                      >
                        <Eye className={cx("h-4 w-4")} />
                        <span className={cx("hidden sm:inline")}>Open</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={closePdfViewer}
                        className={cx(
                          "inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                        )}
                        aria-label="Close PDF viewer"
                      >
                        <X className={cx("h-5 w-5")} />
                      </Button>
                    </div>
                  </div>
                  <div
                    className={cx(
                      "min-h-0 flex-1 bg-slate-200 dark:bg-slate-800",
                    )}
                  >
                    <iframe
                      src={viewingPdf.url}
                      className={cx("h-full w-full border-0")}
                      title={`PDF viewer: ${viewingPdf.name}`}
                    />
                  </div>
                </div>
              </div>
            </ModalLayer>
          )}

          <div
            className={cx(
              "document-detail-overlay fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto",
            )}
            role="dialog"
            aria-modal="true"
            aria-label={`Document details: ${document.routeNo}`}
          >
            <div
              className={cx(
                "document-detail-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 text-slate-900 dark:text-slate-100",
              )}
            >
              {/* Modal Content */}
              <div
                className={cx(
                  "document-detail-content bg-slate-50/60 dark:bg-slate-950/30 p-4 sm:p-5 space-y-4 sm:space-y-5 max-h-[75vh] overflow-y-auto",
                )}
              >
                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: 24, sm: 28 },
                    fontWeight: 700,
                    lineHeight: 1.3,
                    mb: 2,
                    textAlign: "center",
                  }}
                >
                  Tracking Documents
                </Typography>
                {/* DOCUMENT HEADER: responsive summary and files, with full readable values. */}
                <Box
                  component="header"
                  aria-labelledby="document-information-title"
                  sx={{
                    p: { xs: 2, sm: 3 },
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      mb: 2.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        id="document-information-title"
                        component="h2"
                        sx={{
                          fontSize: 24,
                          fontWeight: 700,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {document.title}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 15, color: "text.secondary", mt: 0.5 }}
                      >
                        Document information &amp; files
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      endIcon={<ChevronDown size={18} />}
                      onClick={() =>
                        globalThis.document
                          .getElementById("document-routing-history")
                          ?.scrollIntoView({ block: "start" })
                      }
                      sx={{ minHeight: 44, textTransform: "none" }}
                    >
                      View flow
                    </Button>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        lg: "minmax(0,1.2fr) minmax(0,1fr)",
                      },
                      gap: { xs: 3, lg: 4 },
                      alignItems: "start",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        component="h4"
                        sx={{ fontSize: 16, fontWeight: 650, mb: 1 }}
                      >
                        Document content
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 16,
                          lineHeight: 1.75,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          mb: 2.5,
                        }}
                      >
                        {document.subject || "No description provided."}
                      </Typography>
                      <Box
                        component="dl"
                        sx={{
                          m: 0,
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2,minmax(0,1fr))",
                          },
                          columnGap: 3,
                        }}
                      >
                        {[
                          [
                            "Tracking number",
                            document.routeNo || document.trackingNumber,
                          ],
                          ["Category", document.category],
                          ["Originating office", document.originatingOffice],
                          ["Destination office", document.destinationOffice],
                          ["Sender", document.senderName],
                          ["Position", document.senderPosition],
                          [
                            "Sender address",
                            document.senderAddress?.trim() || "N/A",
                          ],
                          [
                            "Date received",
                            document.dateReceived
                              ? formatDate(document.dateReceived)
                              : "Not recorded",
                          ],
                          [
                            "Target due date",
                            document.targetCompletionDate
                              ? formatDate(document.targetCompletionDate)
                              : "Not set",
                          ],
                          ["Priority", document.priority],
                          ["Direction", document.direction],
                        ].map(([label, value]) => (
                          <Box
                            key={label}
                            sx={{
                              minWidth: 0,
                              py: 1.5,
                              borderTop: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Typography
                              component="dt"
                              sx={{
                                fontSize: 13,
                                color: "text.secondary",
                                mb: 0.5,
                              }}
                            >
                              {label}
                            </Typography>
                            <Typography
                              component="dd"
                              sx={{
                                m: 0,
                                fontSize: 15,
                                lineHeight: 1.6,
                                overflowWrap: "anywhere",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {value || "Not recorded"}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box
                      component="section"
                      aria-labelledby="document-files-title"
                      sx={{
                        minWidth: 0,
                        pl: { lg: 3 },
                        borderLeft: { lg: "1px solid" },
                        borderColor: { lg: "divider" },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1.5,
                          mb: 1,
                        }}
                      >
                        <Typography
                          id="document-files-title"
                          component="h4"
                          sx={{ fontSize: 16, fontWeight: 650 }}
                        >
                          Files from document logging (
                          {sharedDocumentFiles.length})
                        </Typography>
                        {isDocumentParticipant && (
                          <Button
                            component="label"
                            variant="outlined"
                            disabled={isUploading}
                            startIcon={<Upload size={17} />}
                            sx={{
                              minHeight: 44,
                              fontSize: 14,
                              textTransform: "none",
                            }}
                          >
                            {isUploading ? "Uploading..." : "Add files"}
                            <input
                              type="file"
                              multiple
                              onChange={handleFileUpload}
                              disabled={isUploading}
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                              style={{
                                position: "absolute",
                                width: 1,
                                height: 1,
                                padding: 0,
                                overflow: "hidden",
                                clipPath: "inset(50%)",
                              }}
                              tabIndex={-1}
                            />
                          </Button>
                        )}
                      </Box>
                      <Typography
                        sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}
                      >
                        PDF, Word, Excel, PNG, or JPG
                      </Typography>
                      {!sharedDocumentFiles.length ? (
                        <Box
                          sx={{
                            p: 2.5,
                            border: "1px dashed",
                            borderColor: "divider",
                            borderRadius: 2,
                            bgcolor: "action.hover",
                          }}
                        >
                          <Paperclip size={22} />
                          <Typography
                            sx={{ fontSize: 15, fontWeight: 600, mt: 1 }}
                          >
                            No files attached
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 14,
                              mt: 0.5,
                              color: "text.secondary",
                            }}
                          >
                            {isDocumentParticipant
                              ? "Use Add files to attach supporting documents."
                              : "No digital files are available for this document."}
                          </Typography>
                        </Box>
                      ) : (
                        <Box
                          component="ul"
                          sx={{ m: 0, p: 0, listStyle: "none" }}
                        >
                          {sharedDocumentFiles.map((file) => (
                            <Box
                              component="li"
                              key={file.id}
                              sx={{
                                py: 2,
                                borderTop: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1.25,
                                  alignItems: "start",
                                }}
                              >
                                <FileText
                                  size={20}
                                  style={{ flexShrink: 0, marginTop: 3 }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    sx={{
                                      fontSize: 15,
                                      fontWeight: 600,
                                      lineHeight: 1.5,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {file.fileName}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 13,
                                      color: "text.secondary",
                                      mt: 0.5,
                                    }}
                                  >
                                    {file.fileSize || "Size not recorded"}
                                    {file.uploadDate
                                      ? " - " + formatDate(file.uploadDate)
                                      : ""}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                  mt: 1.5,
                                }}
                              >
                                <Button
                                  variant="outlined"
                                  startIcon={<Eye size={16} />}
                                  onClick={() => handleViewAttachment(file)}
                                  disabled={!file.url}
                                  aria-label={`View ${file.fileName}`}
                                  sx={{ minHeight: 44, textTransform: "none" }}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="outlined"
                                  startIcon={<Download size={16} />}
                                  onClick={() => handleDownloadAttachment(file)}
                                  disabled={!file.url}
                                  aria-label={`Download ${file.fileName}`}
                                  sx={{ minHeight: 44, textTransform: "none" }}
                                >
                                  Download
                                </Button>
                                {(file.fileType === "application/pdf" ||
                                  file.fileName
                                    .toLowerCase()
                                    .endsWith(".pdf")) && (
                                  <Button
                                    startIcon={<Printer size={16} />}
                                    onClick={() =>
                                      handlePrintAttachment(file.url)
                                    }
                                    disabled={!file.url}
                                    aria-label={`Print ${file.fileName}`}
                                    sx={{
                                      minHeight: 44,
                                      textTransform: "none",
                                    }}
                                  >
                                    Print
                                  </Button>
                                )}
                              </Box>
                              {!file.url && (
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    color: "text.secondary",
                                    mt: 0.5,
                                  }}
                                >
                                  File link unavailable.
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* TRACKING PROGRESS SECTION */}
                <div
                  className={cx(
                    "document-detail-section bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm",
                  )}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Document Tracking
                      </Typography>
                      <Typography component="h3" variant="h6">
                        {cfg?.label ||
                          formatReadableStatus(document.currentStatus)}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      sx={{ "&&": { color: "text.primary" } }}
                      onClick={() =>
                        globalThis.document
                          .getElementById("document-routing-history")
                          ?.scrollIntoView({ block: "start" })
                      }
                    >
                      View routing timeline
                    </Button>
                  </Box>
                  <Box
                    component="ol"
                    aria-label="Transaction progress"
                    sx={{
                      listStyle: "none",
                      p: 0,
                      my: 2,
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: 1,
                    }}
                  >
                    {TRANSACTION_STAGES.map((stage, index) => {
                      const current = TRANSACTION_STAGE[document.currentStatus];
                      const active = index === current;
                      const reached = index <= current;
                      const paused =
                        document.currentStatus === "RETURNED" ||
                        document.currentStatus === "ON_HOLD";
                      return (
                        <Box
                          component="li"
                          key={stage}
                          aria-current={active ? "step" : undefined}
                          sx={{ minWidth: 0 }}
                        >
                          <Box
                            sx={{
                              height: 5,
                              borderRadius: 1,
                              mb: 1,
                              bgcolor:
                                active && paused
                                  ? "warning.main"
                                  : reached
                                    ? "text.primary"
                                    : "divider",
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              fontWeight: active ? 700 : 400,
                              color: reached
                                ? "text.primary"
                                : "text.secondary",
                              lineHeight: 1.5,
                            }}
                          >
                            {index + 1}. {stage}
                          </Typography>
                          {active && (
                            <Typography
                              variant="caption"
                              color={paused ? "warning.main" : "text.secondary"}
                            >
                              {paused
                                ? document.currentStatus === "RETURNED"
                                  ? "Needs revision"
                                  : "On hold"
                                : document.currentStatus === "COMPLETED"
                                  ? "Ended"
                                  : "Current stage"}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1.5 }}>
                    {NEXT_ACTION[document.currentStatus]}
                  </Typography>
                  {pendingDecisionRoute && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <strong>Action required before routing:</strong> Review
                      this document and select <strong>Approve</strong> or{" "}
                      <strong>Disapprove</strong> first. After approval, the
                      Route / Forward button will become available. If
                      disapproved, include the reason and the document will be
                      returned to the sender.
                    </Alert>
                  )}
                  <Box
                    component="dl"
                    sx={{
                      m: 0,
                      mt: 2,
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        component="dt"
                        variant="caption"
                        color="text.secondary"
                      >
                        Assigned on document record
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                        {resolveUserName(
                          document.assignedUserId,
                          document.assignedUser,
                        ) || "No named handler"}{" "}
                        · {document.currentDivision}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        component="dt"
                        variant="caption"
                        color="text.secondary"
                      >
                        Target date
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                        {document.targetCompletionDate
                          ? formatDate(document.targetCompletionDate)
                          : "Not set"}
                      </Typography>
                    </Box>
                  </Box>{" "}
                  {document.currentStatus === "COMPLETED" && (
                    <div
                      className={cx(
                        "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100",
                      )}
                    >
                      <div
                        className={cx(
                          "flex flex-wrap items-center justify-between gap-2",
                        )}
                      >
                        <div className={cx("font-extrabold")}>
                          Transaction ended
                        </div>
                        <div
                          className={cx(
                            "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
                          )}
                        >
                          Completed
                        </div>
                      </div>
                      <div className={cx("mt-3")}>
                        <div
                          className={cx(
                            "rounded-lg bg-white/80 p-3 dark:bg-slate-900/50",
                          )}
                        >
                          <div
                            className={cx(
                              "text-xs font-bold uppercase tracking-wide text-slate-400",
                            )}
                          >
                            Final action / Handoff instructions
                          </div>
                          <div
                            className={cx(
                              "mt-1 whitespace-pre-wrap font-bold leading-relaxed text-slate-800 dark:text-slate-100",
                            )}
                          >
                            {finalHandoffInstructions}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cx(
                          "mt-3 grid gap-2 border-t border-emerald-200 pt-3 text-xs text-emerald-800 sm:grid-cols-3 dark:border-emerald-800 dark:text-emerald-300",
                        )}
                      >
                        <span>
                          <strong>Completed by:</strong>{" "}
                          {resolveUserName(
                            finalReleaseRoute?.fromUserId,
                            finalReleaseRoute?.fromUser,
                          ) || "N/A"}
                        </span>
                        <span>
                          <strong>Completed at Office:</strong>{" "}
                          {completedAtOffice}
                        </span>
                        <span>
                          <strong>Completed on:</strong>{" "}
                          {finalReleaseRoute
                            ? formatDate(finalReleaseRoute.createdAt)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Routing History Timeline */}
                <section
                  id="document-routing-history"
                  className={cx(
                    "document-detail-section border-t border-slate-200 pt-4 text-sm leading-relaxed dark:border-slate-800",
                  )}
                >
                  <div className={cx("mb-4")}>
                    <h3
                      className={cx(
                        "text-sm font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-100",
                      )}
                    >
                      Tracking Documents
                    </h3>
                    <p
                      className={cx(
                        "mt-1 text-xs font-medium text-slate-500 dark:text-slate-400",
                      )}
                    >
                      {showFullFlow
                        ? "All recipients and forwarding branches for this document are shown. Select a name to view the transaction details."
                        : "Routes you received or sent, including their onward forwarding, are shown. Select a name to view instructions, activity, and files."}
                    </p>
                  </div>

                  <Box
                    sx={{
                      mx: "auto",
                      width: { xs: "100%", sm: "85%" },
                      p: 1.5,
                      textAlign: "center",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 3,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Typography sx={{ fontWeight: 650 }}>
                      Start · Document registered
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {document.createdBy || "Recorded sender"} ·{" "}
                      {formatDate(document.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {flowRecipients.length} received handoff
                      {flowRecipients.length === 1 ? "" : "s"} · Oldest first
                    </Typography>
                  </Box>
                  {/* FLOW AND DETAILS: progress belongs to the name; facts appear once. */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "minmax(0,1fr)",
                        md: "minmax(0,1.35fr) minmax(300px,1fr)",
                      },
                      gap: 2,
                      mt: 2,
                      alignItems: "start",
                    }}
                  >
                    <Box
                      component="nav"
                      aria-label="Document recipient flow"
                      sx={{
                        p: 1.5,
                        bgcolor: "action.hover",
                        borderRadius: 2,
                        minWidth: 0,
                      }}
                    >
                      <Typography sx={{ fontWeight: 650 }}>
                        {showFullFlow
                          ? "Complete document flow"
                          : "Your document flow"}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}
                      >
                        Follow the arrows downward. Step 1.1 continues from Step
                        1. Branches below a name show its forwarded recipients.
                      </Typography>
                      {flowRoots.length > 0 && (
                        <Box
                          sx={{
                            mx: "auto",
                            px: 2,
                            py: 1,
                            maxWidth: 260,
                            textAlign: "center",
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            Sent by
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 600,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {flowRootSenders.join(", ") || "Not recorded"}
                          </Typography>
                        </Box>
                      )}
                      {flowRoots.length === 1 && <HandoffConnector />}
                      {flowRoots.length > 1 && (
                        <Box
                          aria-hidden="true"
                          sx={{
                            display: { xs: "none", sm: "block" },
                            height: 42,
                            position: "relative",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: "50%",
                              height: 20,
                              borderLeft: "2px solid",
                              borderColor: "text.secondary",
                            }}
                          />
                          <Box
                            sx={{
                              position: "absolute",
                              top: 20,
                              left: `${50 / flowRoots.length}%`,
                              right: `${50 / flowRoots.length}%`,
                              borderTop: "2px solid",
                              borderColor: "text.secondary",
                            }}
                          />
                          {flowRoots.map((root, index) => (
                            <Box
                              key={root.id}
                              sx={{
                                position: "absolute",
                                top: 20,
                                left: `${((index + 0.5) / flowRoots.length) * 100}%`,
                                height: 22,
                                borderLeft: "2px solid",
                                borderColor: "text.secondary",
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      <Box
                        component="ul"
                        sx={{
                          p: 0,
                          m: 0,
                          listStyle: "none",
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "minmax(0, 1fr)",
                            sm: `repeat(${Math.max(1, flowRoots.length)}, minmax(190px, 1fr))`,
                          },
                          gap: 2,
                          alignItems: "start",
                          overflowX: "auto",
                        }}
                      >
                        {flowRoots.map((root) => renderFlowNode(root, "1"))}
                      </Box>
                      {!flowRoots.length && (
                        <Typography>
                          No routes involving your account are recorded for this
                          document.
                        </Typography>
                      )}
                    </Box>
                    <Box
                      id="flow-recipient-details"
                      component="section"
                      aria-label="Selected recipient details"
                      sx={{
                        p: 2,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        minWidth: 0,
                        position: { md: "sticky" },
                        top: { md: 0 },
                      }}
                    >
                      {selectedRoute && selectedSnapshot ? (
                        <>
                          <Typography
                            component="h3"
                            sx={{ fontSize: 16, fontWeight: 650 }}
                          >
                            {resolveUserName(
                              selectedRoute.toUserId,
                              selectedRoute.toUser,
                            )}
                          </Typography>
                          <Box
                            component="dl"
                            sx={{ m: 0, mt: 1.5, display: "grid", gap: 1.5 }}
                          >
                            {[
                              [
                                "From",
                                resolveUserName(
                                  selectedRoute.fromUserId,
                                  selectedRoute.fromUser,
                                ),
                              ],
                              ["Office", selectedRoute.toDivision],
                              ["Received", formatDate(selectedRoute.createdAt)],
                              [
                                "Requested action",
                                selectedRoute.actionRequested,
                              ],
                              [
                                "Instructions",
                                displayRouteRemarks(selectedRoute.remarks),
                              ],
                            ]
                              .filter(
                                ([, value]) =>
                                  value && !/^(N\/A|None)$/i.test(value),
                              )
                              .map(([label, value]) => (
                                <Box key={label}>
                                  <Typography
                                    component="dt"
                                    sx={{
                                      fontSize: 14,
                                      color: "text.secondary",
                                    }}
                                  >
                                    {label}
                                  </Typography>
                                  <Typography
                                    component="dd"
                                    sx={{
                                      m: 0,
                                      fontSize: 16,
                                      whiteSpace: "pre-wrap",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {value}
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                          {selectedDecision && (
                            <Box
                              sx={{
                                mt: 2,
                                pt: 1.5,
                                borderTop: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                sx={{ fontWeight: 650, fontSize: 16 }}
                              >
                                Decision:{" "}
                                {formatReadableStatus(
                                  getRouteDecision(selectedDecision),
                                )}
                              </Typography>
                              <Typography
                                sx={{ fontSize: 15, color: "text.secondary" }}
                              >
                                {formatDate(selectedDecision.createdAt)}
                              </Typography>
                              {selectedDecision.remarks && (
                                <Typography sx={{ fontSize: 16, mt: 0.5 }}>
                                  {displayRouteRemarks(
                                    selectedDecision.remarks,
                                  )}
                                </Typography>
                              )}
                            </Box>
                          )}
                          <Typography
                            sx={{ mt: 2, fontWeight: 650, fontSize: 16 }}
                          >
                            Activity
                          </Typography>
                          {!selectedActivities.length && (
                            <Typography
                              sx={{
                                fontSize: 16,
                                mt: 0.5,
                                color: "text.secondary",
                              }}
                            >
                              No activity recorded yet.
                            </Typography>
                          )}
                          <Box component="ol" sx={{ pl: 2.5, mb: 0 }}>
                            {selectedActivities.map((activity) => (
                              <Box
                                component="li"
                                key={activity.id}
                                sx={{ mb: 1.5 }}
                              >
                                <Typography
                                  sx={{ fontSize: 16, fontWeight: 600 }}
                                >
                                  {activity.status === "COMPLETED"
                                    ? "Part completed"
                                    : activity.destination
                                      ? `Forwarded to ${activity.destination}`
                                      : activity.action}
                                </Typography>
                                <Typography
                                  sx={{ fontSize: 14, color: "text.secondary" }}
                                >
                                  {formatDate(activity.timestamp)}
                                </Typography>
                                {activity.remarks &&
                                  !/^(N\/A|None)$/i.test(activity.remarks) && (
                                    <Typography
                                      sx={{
                                        fontSize: 16,
                                        mt: 0.5,
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {activity.remarks}
                                    </Typography>
                                  )}
                              </Box>
                            ))}
                          </Box>

                          {/* Step files include attachments sent with the handoff and later recipient responses. */}
                          {renderFlowFiles(
                            "Response files",
                            "Files sent with this handoff or uploaded by the recipient during this step.",
                            recipientResponseFiles,
                            "No files were exchanged during this step.",
                           
                          )}
                        </>
                      ) : (
                        <Typography>
                          Select a recipient to view details.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {flowRecipients.length > 0 && (
                    <>
                      <HandoffConnector />
                      <Box
                        sx={{
                          mx: "auto",
                          width: { xs: "100%", sm: "85%" },
                          p: 1.5,
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 3,
                          bgcolor: "background.paper",
                        }}
                      >
                        <Typography sx={{ fontWeight: 650 }}>
                          {document.currentStatus === "COMPLETED"
                            ? "Document completed"
                            : "Tracking continues"}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 13,
                            mt: 0.5,
                            color: "text.secondary",
                          }}
                        >
                          {document.currentStatus === "COMPLETED"
                            ? "All required parts are completed. No further routing."
                            : "Check each recipient above for their current status and next action."}
                        </Typography>
                      </Box>
                    </>
                  )}
                  {/* FLOW SUMMARY: concise outcome of every visible recipient branch. */}
                  <Accordion
                    disableGutters
                    sx={{
                      mt: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "10px !important",
                      boxShadow: "none",
                      "&:before": { display: "none" },
                    }}
                  >
                    <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                      <Box>
                        <Typography sx={{ fontWeight: 650 }}>
                          Recorded audit events ({flowSummaryEvents.length})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Summary of what happened in each recipient flow
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {flowSummaryEvents.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No flow activity is available for this document.
                        </Typography>
                      ) : (
                        <Box
                          component="ol"
                          sx={{
                            m: 0,
                            pl: 3,
                            "& > li": {
                              pl: 1,
                              py: 1.5,
                              borderBottom: "1px solid",
                              borderColor: "divider",
                            },
                            "& > li:last-child": { borderBottom: 0 },
                          }}
                        >
                          {flowSummaryEvents.map(
                            ({
                              route,
                              snapshot,
                              activities,
                              decision,
                              step,
                              files,
                            }) => (
                              <Box component="li" key={route.id}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 1,
                                  }}
                                >
                                  <Chip
                                    size="small"
                                    label={`Step ${step}`}
                                    sx={{ fontWeight: 700 }}
                                  />
                                  <Typography sx={{ fontWeight: 650 }}>
                                    {resolveUserName(
                                      route.toUserId,
                                      route.toUser,
                                    ) || route.toDivision}
                                    : {snapshot.status}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Routed by{" "}
                                  {resolveUserName(
                                    route.fromUserId,
                                    route.fromUser,
                                  ) || "Not recorded"}{" "}
                                  · {formatDate(route.createdAt)}
                                </Typography>
                                <Box
                                  component="dl"
                                  sx={{
                                    m: 0,
                                    mt: 1,
                                    display: "grid",
                                    gridTemplateColumns: {
                                      xs: "1fr",
                                      sm: "repeat(2,minmax(0,1fr))",
                                    },
                                    gap: 1,
                                  }}
                                >
                                  {[
                                    ["Office", route.toDivision],
                                    ["Requested action", route.actionRequested],
                                    [
                                      "Instructions",
                                      displayRouteRemarks(route.remarks),
                                    ],
                                    [
                                      "Decision",
                                      decision
                                        ? formatReadableStatus(
                                            getRouteDecision(decision),
                                          )
                                        : "Pending",
                                    ],
                                  ]
                                    .filter(
                                      ([, value]) =>
                                        value && !/^(N\/A|None)$/i.test(value),
                                    )
                                    .map(([label, value]) => (
                                      <Box
                                        key={label}
                                        sx={{
                                          p: 1,
                                          bgcolor: "action.hover",
                                          borderRadius: 1,
                                        }}
                                      >
                                        <Typography
                                          component="dt"
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {label}
                                        </Typography>
                                        <Typography
                                          component="dd"
                                          variant="body2"
                                          sx={{
                                            m: 0,
                                            whiteSpace: "pre-wrap",
                                            overflowWrap: "anywhere",
                                          }}
                                        >
                                          {value}
                                        </Typography>
                                      </Box>
                                    ))}
                                </Box>
                                {decision?.remarks && (
                                  <Typography
                                    variant="body2"
                                    sx={{ mt: 1, whiteSpace: "pre-wrap" }}
                                  >
                                    <strong>Decision remarks:</strong>{" "}
                                    {displayRouteRemarks(decision.remarks)}
                                  </Typography>
                                )}
                                <Box
                                  component="ol"
                                  sx={{ mt: 1, mb: 0, pl: 2.5 }}
                                >
                                  {activities.length ? (
                                    activities.map((activity) => (
                                      <Box
                                        component="li"
                                        key={activity.id}
                                        sx={{ mb: 0.75 }}
                                      >
                                        <Typography variant="body2">
                                          {activity.status === "COMPLETED"
                                            ? "Completed their part"
                                            : activity.destination
                                              ? `Forwarded to ${activity.destination}`
                                              : activity.action}{" "}
                                          · {formatDate(activity.timestamp)}
                                        </Typography>
                                        {activity.remarks &&
                                          !/^(N\/A|None)$/i.test(
                                            activity.remarks,
                                          ) && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {displayRouteRemarks(
                                                activity.remarks,
                                              )}
                                            </Typography>
                                          )}
                                      </Box>
                                    ))
                                  ) : (
                                    <Typography
                                      component="li"
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      No further activity recorded.
                                    </Typography>
                                  )}
                                </Box>
                                {renderFlowFiles(
                                  "Uploaded files",
                                  "Files sent with the handoff or uploaded by the recipient during this step.",
                                  files,
                                  "No files were exchanged during this step.",
                                )}
                              </Box>
                            ),
                          )}
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </section>
              </div>

              {/* Modal Footer */}
              <div
                className={cx(
                  "sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 backdrop-blur",
                )}
              >
                <Button
                  type="button"
                  onClick={onClose}
                  className={cx(
                    "px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors",
                  )}
                >
                  Close
                </Button>

                <div className={cx("flex flex-wrap items-center gap-2")}>
                  {onDeleteDoc && currentUser.role === "SYSTEM_ADMIN" && (
                    <Button
                      type="button"
                      onClick={() => {
                        onClose();
                        onDeleteDoc(document);
                      }}
                      className={cx(
                        "px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer",
                      )}
                    >
                      <Trash2 className={cx("w-4 h-4")} />
                      <span>Delete</span>
                    </Button>
                  )}

                  {isDocumentParticipant && canAccessDocumentSlip && (
                    <Button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPrintSlip(document);
                      }}
                      className={cx(
                        "px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs",
                      )}
                    >
                      <Printer className={cx("w-4 h-4")} />
                      <span>Print Slip</span>
                    </Button>
                  )}

                  {pendingDecisionRoute && (
                    <Typography
                      sx={{
                        maxWidth: 300,
                        fontSize: 12,
                        lineHeight: 1.4,
                        color: "text.secondary",
                      }}
                    >
                      Route / Forward is locked until you Approve or Disapprove
                      this handoff.
                    </Typography>
                  )}
                  {(canRouteDocument || pendingDecisionRoute) && (
                    <Button
                      type="button"
                      disabled={Boolean(pendingDecisionRoute)}
                      onClick={() => {
                        onClose();
                        onOpenRouteDoc(document);
                      }}
                      className={cx(
                        "px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs",
                      )}
                    >
                      <Send className={cx("w-4 h-4")} />
                      <span>Route / Forward</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalLayer>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function DocumentDetailModalDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[0] +
          "}",
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[1] +
          "}",
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[2] +
          "}",
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[3] +
          "}",
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[4] +
          "}",
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[5] +
          "}",
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[6] +
          "}",
        "@media screen and (max-width: 767px) {" +
          documentDetailModalbaseCss[7] +
          "}",
        documentDetailModalSystemDesignCss[0],
        createDocumentDetailModalStyles(theme),
      ]}
    />
  );
}
