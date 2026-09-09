// ReportsView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FolderOpen,
  Mail,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { AuditLog, DocumentRecord } from "../types";
import { formatDate } from "../utils/statusUtils";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for ReportsView.
// BASE CSS: Pangunahing design ng component.
const reportsViewCss = `/* ReportsView.module.css */
.mui-reportsview-page { display: grid; gap: 1.25rem; }.mui-reportsview-hero, .mui-reportsview-filters, .mui-reportsview-tableCard { border: 1px solid #e4e4e7; border-radius: .75rem; background: #fff; box-shadow: 0 1px 2px rgb(15 23 42 / .04); }.mui-reportsview-hero { padding: 1.25rem; }.mui-reportsview-heroContent { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }.mui-reportsview-title { display: flex; align-items: center; gap: .5rem; margin: 0; color: #18181b; font-size: 1.125rem; font-weight: 800; }.mui-reportsview-titleIcon { width: 1.25rem; color: #059669; }.mui-reportsview-subtitle { margin: .25rem 0 0; color: #71717a; font-size: .75rem; font-weight: 500; }.mui-reportsview-heroActions { display: flex; flex-wrap: wrap; gap: .5rem; }
.mui-reportsview-exportButton, .mui-reportsview-folderButton, .mui-reportsview-historyButton { display: flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .5rem; font-size: .75rem; font-weight: 700; cursor: pointer; transition: background-color .15s; }.mui-reportsview-exportButton, .mui-reportsview-folderButton { padding: .5rem .875rem; border: 0; color: #fff; }.mui-reportsview-exportButton { background: #059669; }.mui-reportsview-exportButton:hover { background: #047857; }.mui-reportsview-folderButton { background: #3f3f46; }.mui-reportsview-folderButton:hover { background: #27272a; }.mui-reportsview-buttonIcon { width: 1rem; }.mui-reportsview-statusMessage { padding: .75rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fafafa; color: #3f3f46; font-size: .75rem; font-weight: 700; text-align: center; }
.mui-reportsview-reportTabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }.mui-reportsview-reportTab { padding: 1rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fff; text-align: left; cursor: pointer; transition: border-color .15s, background-color .15s, box-shadow .15s; }.mui-reportsview-reportTab:hover { border-color: #d4d4d8; }.mui-reportsview-reportTabActive { border-color: #71717a; background: #fafafa; box-shadow: 0 0 0 2px #f4f4f5; }.mui-reportsview-tabHeader { display: flex; align-items: center; justify-content: space-between; }.mui-reportsview-tabIcon { width: 1.25rem; color: #3f3f46; }.mui-reportsview-tabCount { color: #18181b; font-size: 1.25rem; font-weight: 900; }.mui-reportsview-tabLabel { margin-top: .5rem; color: #27272a; font-size: .875rem; font-weight: 700; }
.mui-reportsview-filters { display: grid; grid-template-columns: 2fr 1fr; gap: .75rem; padding: 1rem; }.mui-reportsview-searchField { position: relative; }.mui-reportsview-searchIcon { position: absolute; top: .625rem; left: .75rem; width: 1rem; color: #a1a1aa; }.mui-reportsview-searchInput, .mui-reportsview-monthSelect { width: 100%; border: 1px solid #e4e4e7; border-radius: .5rem; outline: 0; background: #fafafa; color: #18181b; font-size: .75rem; }.mui-reportsview-searchInput { padding: .5rem .75rem .5rem 2.25rem; }.mui-reportsview-monthSelect { padding: .5rem .75rem; }.mui-reportsview-searchInput:focus, .mui-reportsview-monthSelect:focus { border-color: #71717a; box-shadow: 0 0 0 2px rgb(59 130 246 / .2); }
.mui-reportsview-tableCard { overflow: hidden; }.mui-reportsview-tableTitle { padding: .75rem 1rem; border-bottom: 1px solid #e4e4e7; color: #52525b; font-size: .75rem; font-weight: 700; }.mui-reportsview-tableScroll { overflow-x: auto; }.mui-reportsview-envelopeTable, .mui-reportsview-documentTable { width: 100%; border-collapse: collapse; font-size: .75rem; text-align: left; }.mui-reportsview-envelopeTable { min-width: 53rem; }.mui-reportsview-documentTable { min-width: 90rem; }.mui-reportsview-tableHead { background: #fafafa; color: #71717a; font-size: .625rem; text-transform: uppercase; }.mui-reportsview-cell, .mui-reportsview-envelopeTable td, .mui-reportsview-documentTable td { padding: .75rem; }.mui-reportsview-tableBody tr { border-top: 1px solid #f4f4f5; }.mui-reportsview-row { vertical-align: top; }.mui-reportsview-row:hover { background: #fafafa; }.mui-reportsview-nowrapCell { padding: .75rem; white-space: nowrap; }.mui-reportsview-routeCell { padding: .75rem; color: #3f3f46; font-family: ui-monospace, monospace; font-weight: 700; }.mui-reportsview-strongCell, .mui-reportsview-bold { font-weight: 700; }.mui-reportsview-detailsCell { max-width: 36rem; padding: .75rem; white-space: pre-wrap; }.mui-reportsview-titleCell { max-width: 24rem; padding: .75rem; }.mui-reportsview-documentTitle { color: #18181b; font-weight: 700; }.mui-reportsview-mutedLine { margin-top: .25rem; color: #71717a; }
.mui-reportsview-outcome { display: inline-flex; padding: .25rem .625rem; border-radius: 999px; font-size: .625rem; font-weight: 900; white-space: nowrap; }.mui-reportsview-outcomeNegative { background: #ffe4e6; color: #9f1239; }.mui-reportsview-outcomeComplete { background: #d1fae5; color: #065f46; }.mui-reportsview-outcomeApproved { background: #f4f4f5; color: #3f3f46; }.mui-reportsview-outcomePending { background: #fef3c7; color: #92400e; }.mui-reportsview-handoffCell { min-width: 17.5rem; max-width: 28rem; padding: .75rem; }.mui-reportsview-handoff { display: grid; gap: .375rem; padding: .625rem; border: 1px solid #a7f3d0; border-radius: .5rem; background: #ecfdf5; font-size: .6875rem; }.mui-reportsview-detailLabel { color: #71717a; font-weight: 700; }.mui-reportsview-instructions, .mui-reportsview-completionNotes { white-space: pre-wrap; }.mui-reportsview-instructions { line-height: 1.6; }.mui-reportsview-completionNotes { padding-top: .375rem; border-top: 1px solid #a7f3d0; }.mui-reportsview-muted { color: #a1a1aa; }.mui-reportsview-activityCell { max-width: 20rem; padding: .75rem; }
.mui-reportsview-historyButton { padding: .375rem .75rem; border: 1px solid #e4e4e7; background: #fafafa; color: #27272a; white-space: nowrap; }.mui-reportsview-historyButton:hover { background: #f4f4f5; }.mui-reportsview-historyRow { background: rgb(239 246 255 / .7); }.mui-reportsview-historyCell { padding: 1rem; }.mui-reportsview-historyTitle { margin-bottom: .75rem; color: #3f3f46; font-size: .75rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }.mui-reportsview-historyList { display: grid; gap: .5rem; }.mui-reportsview-historyEvent { display: grid; grid-template-columns: 4.375rem 11.25rem 11.25rem 1fr; gap: .5rem; padding: .75rem; border: 1px solid #f4f4f5; border-radius: .5rem; background: #fff; }.mui-reportsview-eventNumber { color: #27272a; font-weight: 900; }.mui-reportsview-eventName { font-weight: 900; }.mui-reportsview-eventNegative { color: #be123c; }.mui-reportsview-eventPositive { color: #047857; }.mui-reportsview-eventNeutral { color: #18181b; }.mui-reportsview-eventDetails { margin-top: .25rem; color: #52525b; white-space: pre-wrap; }.mui-reportsview-noEvents { color: #71717a; }.mui-reportsview-empty { padding: 2.5rem; color: #a1a1aa; font-size: .75rem; font-weight: 500; text-align: center; }
.dark .mui-reportsview-hero, .dark .mui-reportsview-filters, .dark .mui-reportsview-tableCard, .dark .mui-reportsview-reportTab { border-color: #27272a; background: #18181b; }.dark .mui-reportsview-title, .dark .mui-reportsview-tabCount, .dark .mui-reportsview-documentTitle, .dark .mui-reportsview-eventNeutral { color: #fff; }.dark .mui-reportsview-subtitle { color: #a1a1aa; }.dark .mui-reportsview-statusMessage { border-color: #3f3f46; background: rgb(23 37 84 / .6); color: #e4e4e7; }.dark .mui-reportsview-reportTabActive { border-color: #71717a; background: rgb(23 37 84 / .45); box-shadow: 0 0 0 2px #3f3f46; }.dark .mui-reportsview-tabIcon { color: #a1a1aa; }.dark .mui-reportsview-tabLabel { color: #e4e4e7; }
.dark .mui-reportsview-searchInput, .dark .mui-reportsview-monthSelect { border-color: #3f3f46; background: #27272a; color: #fff; }.dark .mui-reportsview-tableTitle { border-color: #27272a; color: #d4d4d8; }.dark .mui-reportsview-tableHead { background: rgb(30 41 59 / .8); color: #a1a1aa; }.dark .mui-reportsview-tableBody tr { border-color: #27272a; }.dark .mui-reportsview-row:hover { background: rgb(30 41 59 / .5); }.dark .mui-reportsview-handoff { border-color: #064e3b; background: rgb(2 44 34 / .35); }.dark .mui-reportsview-completionNotes { border-color: #064e3b; }.dark .mui-reportsview-historyButton { border-color: #3f3f46; background: rgb(23 37 84 / .5); color: #d4d4d8; }.dark .mui-reportsview-historyRow { background: rgb(23 37 84 / .2); }.dark .mui-reportsview-historyEvent { border-color: #3f3f46; background: #18181b; }.dark .mui-reportsview-historyTitle { color: #e4e4e7; }.dark .mui-reportsview-eventDetails { color: #d4d4d8; }
@media (max-width: 1023px) { .mui-reportsview-heroContent { align-items: stretch; flex-direction: column; }.mui-reportsview-historyEvent { grid-template-columns: 1fr 1fr; } } @media (max-width: 767px) { .mui-reportsview-reportTabs, .mui-reportsview-filters { grid-template-columns: 1fr; }.mui-reportsview-historyEvent { grid-template-columns: 1fr; } }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const reportsViewStyles = {
  activityCell: "mui-reportsview-activityCell",
  bold: "mui-reportsview-bold",
  buttonIcon: "mui-reportsview-buttonIcon",
  cell: "mui-reportsview-cell",
  completionNotes: "mui-reportsview-completionNotes",
  detailLabel: "mui-reportsview-detailLabel",
  detailsCell: "mui-reportsview-detailsCell",
  documentTable: "mui-reportsview-documentTable",
  documentTitle: "mui-reportsview-documentTitle",
  empty: "mui-reportsview-empty",
  envelopeTable: "mui-reportsview-envelopeTable",
  eventDetails: "mui-reportsview-eventDetails",
  eventName: "mui-reportsview-eventName",
  eventNegative: "mui-reportsview-eventNegative",
  eventNeutral: "mui-reportsview-eventNeutral",
  eventNumber: "mui-reportsview-eventNumber",
  eventPositive: "mui-reportsview-eventPositive",
  exportButton: "mui-reportsview-exportButton",
  filters: "mui-reportsview-filters",
  folderButton: "mui-reportsview-folderButton",
  handoff: "mui-reportsview-handoff",
  handoffCell: "mui-reportsview-handoffCell",
  hero: "mui-reportsview-hero",
  heroActions: "mui-reportsview-heroActions",
  heroContent: "mui-reportsview-heroContent",
  historyButton: "mui-reportsview-historyButton",
  historyCell: "mui-reportsview-historyCell",
  historyEvent: "mui-reportsview-historyEvent",
  historyList: "mui-reportsview-historyList",
  historyRow: "mui-reportsview-historyRow",
  historyTitle: "mui-reportsview-historyTitle",
  instructions: "mui-reportsview-instructions",
  monthSelect: "mui-reportsview-monthSelect",
  muted: "mui-reportsview-muted",
  mutedLine: "mui-reportsview-mutedLine",
  noEvents: "mui-reportsview-noEvents",
  nowrapCell: "mui-reportsview-nowrapCell",
  outcome: "mui-reportsview-outcome",
  outcomeApproved: "mui-reportsview-outcomeApproved",
  outcomeComplete: "mui-reportsview-outcomeComplete",
  outcomeNegative: "mui-reportsview-outcomeNegative",
  outcomePending: "mui-reportsview-outcomePending",
  page: "mui-reportsview-page",
  reportTab: "mui-reportsview-reportTab",
  reportTabActive: "mui-reportsview-reportTabActive",
  reportTabs: "mui-reportsview-reportTabs",
  routeCell: "mui-reportsview-routeCell",
  row: "mui-reportsview-row",
  searchField: "mui-reportsview-searchField",
  searchIcon: "mui-reportsview-searchIcon",
  searchInput: "mui-reportsview-searchInput",
  statusMessage: "mui-reportsview-statusMessage",
  strongCell: "mui-reportsview-strongCell",
  subtitle: "mui-reportsview-subtitle",
  tabCount: "mui-reportsview-tabCount",
  tabHeader: "mui-reportsview-tabHeader",
  tabIcon: "mui-reportsview-tabIcon",
  tabLabel: "mui-reportsview-tabLabel",
  tableBody: "mui-reportsview-tableBody",
  tableCard: "mui-reportsview-tableCard",
  tableHead: "mui-reportsview-tableHead",
  tableScroll: "mui-reportsview-tableScroll",
  tableTitle: "mui-reportsview-tableTitle",
  title: "mui-reportsview-title",
  titleCell: "mui-reportsview-titleCell",
  titleIcon: "mui-reportsview-titleIcon",
} as const;

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createReportsViewStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    // TABLE: Keep route numbers and subjects readable; scroll the table on narrow screens.
    '.mui-reportsview-tableScroll': { overflowX: 'auto', scrollbarWidth: 'thin' },
    '.mui-reportsview-tableScroll table': { minWidth: 1280, tableLayout: 'auto' },
    '.mui-reportsview-routeCell': { minWidth: 190, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12px !important' },
    '.mui-reportsview-titleCell': { minWidth: 260, maxWidth: 340, lineHeight: 1.55 },
    '.mui-reportsview-searchInput': { paddingLeft: '38px !important' },
    ".mui-reportsview-page": {
      gap: "16px !important",
    },
    ".mui-reportsview-header": {
      padding: "16px 18px !important",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-reportsview-title": {
      color: text + " !important",
      fontSize: "20px !important",
      lineHeight: "1.3 !important",
      letterSpacing: "-.025em !important",
    },
    ".mui-reportsview-subtitle": {
      color: muted + " !important",
      fontSize: "13px !important",
      lineHeight: "1.55 !important",
      marginTop: "4px !important",
    },
    ".mui-reportsview-tableCard": {
      overflow: "hidden",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".mui-reportsview-header": { padding: "14px !important" },
    },
  };
};
const styles = reportsViewStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

const classes = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

// DATA: Mga props at uri ng data na ginagamit ng component.
type ReportType = "INCOMING" | "OUTGOING" | "ENVELOPE";

interface ReportsViewProps {
  documents: DocumentRecord[];
  envelopeLogs: AuditLog[];
  auditLogs: AuditLog[];
  reportType?: ReportType;
}

interface ReportEvent {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  details: string;
  outcome: "APPROVED" | "DISAPPROVED" | "RETURNED" | "COMPLETED" | "";
}

const AUTO_SAVE_KEY = "document_reports_auto_save";

const AUTO_SAVE_FOLDER_KEY = `${AUTO_SAVE_KEY}_folder_name`;

const monthOf = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 7);
};

const openHandleDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("blgf_file_handles", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("handles")) {
        request.result.createObjectStore("handles");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveDirectoryHandle = async (handle: any) => {
  const database = await openHandleDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, AUTO_SAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};

const loadDirectoryHandle = async () => {
  const database = await openHandleDatabase();
  const handle = await new Promise<any>((resolve, reject) => {
    const request = database
      .transaction("handles", "readonly")
      .objectStore("handles")
      .get(AUTO_SAVE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
};

const latestRouteOf = (document: DocumentRecord) =>
  [...(document.routes || [])].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  )[0];

const decisionFrom = (value?: string) =>
  value
    ?.match(/(?:Action:\s*|^)(APPROVED|DISAPPROVED)\b/i)?.[1]
    .toUpperCase() as "APPROVED" | "DISAPPROVED" | undefined;

const eventsFor = (document: DocumentRecord, auditLogs: AuditLog[]) => {
  const routeEvents: ReportEvent[] = (document.routes || []).map((route) => {
    const decision = decisionFrom(
      `${route.actionRequested || ""} ${route.remarks || ""}`,
    );
    return {
      id: `route-${route.id}`,
      timestamp: route.processedAt || route.createdAt,
      actor: route.fromUser || "System",
      event: decision
        ? decision === "APPROVED"
          ? "Approved"
          : "Disapproved / Returned"
        : route.isTransfer
          ? "Transferred"
          : "Routed / Assigned",
      details: decision
        ? `${decision === "APPROVED" ? "Approved for continued processing" : "Disapproved and returned"}${route.actionTaken ? `. Action taken: ${route.actionTaken}` : ""}${route.remarks ? `. Reason/remarks: ${route.remarks}` : ""}`
        : `Sent to ${route.toUser || route.toDivision || "Unassigned"}${route.actionRequested ? ` for ${route.actionRequested}` : ""}${route.actionTaken ? `. Action taken/completion note: ${route.actionTaken}` : ""}${route.remarks ? `. Notes/remarks: ${route.remarks}` : ""}`,
      outcome:
        decision ||
        (route.statusAfter === "RETURNED"
          ? "RETURNED"
          : route.statusAfter === "COMPLETED"
            ? "COMPLETED"
            : ""),
    };
  });
  const routeNumber = document.routeNo || document.trackingNumber;
  const auditEvents: ReportEvent[] = auditLogs
    .filter(
      (log) =>
        (log.documentTrackingNumber === routeNumber ||
          log.documentTrackingNumber === document.trackingNumber) &&
        [
          "CREATE_DOC",
          "REGISTER_DOC",
          "ROUTE_DOC",
          "TRANSFER_DOC",
          "UPDATE_STATUS",
        ].includes(log.action),
    )
    .map((log) => {
      const decision = decisionFrom(log.details);
      const status = log.details
        .match(/Status:\s*([^|]+)/i)?.[1]
        ?.trim()
        .toUpperCase();
      return {
        id: `audit-${log.id}`,
        timestamp: log.timestamp,
        actor: log.userName,
        event: decision
          ? decision === "APPROVED"
            ? "Approved"
            : "Disapproved / Returned"
          : log.action === "CREATE_DOC" || log.action === "REGISTER_DOC"
            ? "Received / Registered"
            : log.action === "TRANSFER_DOC"
              ? "Transferred"
              : log.action === "UPDATE_STATUS"
                ? "Status Updated"
                : "Routed / Assigned",
        details: log.details,
        outcome:
          decision ||
          (status === "RETURNED"
            ? "RETURNED"
            : status === "COMPLETED"
              ? "COMPLETED"
              : ""),
      };
    });
  return [...routeEvents, ...auditEvents]
    .sort(
      (first, second) =>
        new Date(first.timestamp).getTime() -
        new Date(second.timestamp).getTime(),
    )
    .filter(
      (event, index, events) =>
        index ===
        events.findIndex(
          (candidate) =>
            candidate.event === event.event &&
            candidate.actor.trim().toLowerCase() ===
              event.actor.trim().toLowerCase() &&
            Math.abs(
              new Date(candidate.timestamp).getTime() -
                new Date(event.timestamp).getTime(),
            ) < 2_000,
        ),
    );
};

const completionNotesOf = (document: DocumentRecord, auditLogs: AuditLog[]) => {
  const routeNumber = document.routeNo || document.trackingNumber;
  const routeNotes = (document.routes || [])
    .filter(
      (route) =>
        route.statusAfter === "COMPLETED" ||
        Boolean(route.actionTaken?.trim()) ||
        Boolean(route.processedAt && route.remarks?.trim()),
    )
    .map((route) => {
      const note = [route.actionTaken, route.remarks]
        .map((value) => value?.trim())
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(" — ");
      return note
        ? `${route.fromUser || route.toUser || "User"} (${formatDate(route.processedAt || route.createdAt)}): ${note}`
        : "";
    });
  const auditNotes = auditLogs
    .filter(
      (log) =>
        (log.documentTrackingNumber === routeNumber ||
          log.documentTrackingNumber === document.trackingNumber) &&
        /COMPLETED|completion|completed/i.test(log.details),
    )
    .map(
      (log) => `${log.userName} (${formatDate(log.timestamp)}): ${log.details}`,
    );
  return [...new Set([...routeNotes, ...auditNotes].filter(Boolean))].join(
    "\n",
  );
};

const handoffOf = (document: DocumentRecord) => {
  const completedRoute = [...(document.routes || [])]
    .reverse()
    .find((route) => route.statusAfter === "COMPLETED");
  const remarks = completedRoute?.remarks?.trim() || "";
  const legacyPickupLocation =
    remarks
      .match(/Pickup Location:\s*(.*?)(?:\s*\|\s*Next Action:|$)/i)?.[1]
      ?.trim() ||
    (remarks && !/Pickup Location:/i.test(remarks) ? remarks : "Not recorded");
  const legacyNextAction =
    remarks.match(/Next Action:\s*(.*)$/i)?.[1]?.trim() || "Not recorded";
  const instructions =
    remarks.match(/Handoff Instructions:\s*(.*)$/i)?.[1]?.trim() ||
    `${legacyPickupLocation} ${legacyNextAction}`.trim();
  return {
    instructions,
    completedBy: completedRoute?.fromUser || "Not completed",
    completedOffice: completedRoute?.fromDivision || "Not recorded",
    completedOn: completedRoute
      ? formatDate(completedRoute.processedAt || completedRoute.createdAt)
      : "Not completed",
  };
};

const finalOutcomeOf = (document: DocumentRecord, events: ReportEvent[]) => {
  const latestDecision = [...events].reverse().find((event) => event.outcome);
  if (
    latestDecision?.outcome === "DISAPPROVED" ||
    latestDecision?.outcome === "RETURNED"
  )
    return "DISAPPROVED / RETURNED";
  if (
    document.currentStatus === "COMPLETED" ||
    latestDecision?.outcome === "COMPLETED"
  )
    return "COMPLETED";
  if (latestDecision?.outcome === "APPROVED")
    return "APPROVED — FOR CONTINUED PROCESSING";
  if (document.currentStatus === "FOR_SIGNATURE")
    return "WAITING FOR APPROVAL / SIGNATURE";
  if (document.currentStatus === "ON_HOLD") return "ON HOLD";
  if (document.currentStatus === "IN_PROGRESS") return "IN PROGRESS";
  return "PENDING ACTION";
};

const documentRows = (documents: DocumentRecord[], auditLogs: AuditLog[]) =>
  documents.map((document) => {
    const latestRoute = latestRouteOf(document);
    const events = eventsFor(document, auditLogs);
    const lastEvent = events.at(-1);
    const completionNotes = completionNotesOf(document, auditLogs);
    const handoff = handoffOf(document);
    return {
      "Document Route No.": document.routeNo || document.trackingNumber,
      Direction: document.direction,
      Title: document.title,
      Subject: document.subject,
      Category: document.category,
      "From Office": document.originatingOffice,
      Sender: document.senderName,
      Recipient: document.recipientName || "N/A",
      "Initially Received / Recorded By": document.createdBy,
      "Current Holder":
        latestRoute?.toUser || document.assignedUser || "Unassigned",
      "Current Division": latestRoute?.toDivision || document.currentDivision,
      "Final Outcome": finalOutcomeOf(document, events),
      "Last Activity": lastEvent
        ? `${lastEvent.event} by ${lastEvent.actor} on ${formatDate(lastEvent.timestamp)}`
        : "No activity recorded",
      "Actual Activity Timeline":
        events
          .map(
            (event) =>
              `${formatDate(event.timestamp)} | ${event.actor} | ${event.event} | ${event.details}`,
          )
          .join("\n") || "No activity recorded",
      "Final Action / Disposition":
        latestRoute?.actionRequested ||
        document.actionRequested ||
        "For appropriate action",
      "Completion Notes": completionNotes || "No completion notes recorded",
      "Completion & Handoff Instructions": handoff.instructions,
      "Handoff - Completed By": handoff.completedBy,
      "Handoff - Completed Office": handoff.completedOffice,
      "Handoff - Completed On": handoff.completedOn,
      "Final Remarks": latestRoute?.remarks || document.remarks || "N/A",
      Priority: document.priority.replaceAll("_", " "),
      Status: document.currentStatus.replaceAll("_", " "),
      "Date Received": formatDate(document.dateReceived),
      "Target Completion": formatDate(document.targetCompletionDate),
      "Completed Date": document.completedDate
        ? formatDate(document.completedDate)
        : "N/A",
      "Last Updated": formatDate(document.updatedAt),
    };
  });

const envelopeRows = (logs: AuditLog[]) =>
  logs.map((log) => ({
    Timestamp: formatDate(log.timestamp),
    "Document Route No.": log.documentTrackingNumber || "N/A",
    "Released By": log.userName,
    "User Role": log.userRole,
    "Dispatch Details": log.details,
    "IP Address": log.ipAddress || "N/A",
  }));

const reportLabel = (type: ReportType) =>
  type === "INCOMING"
    ? "Incoming Documents"
    : type === "OUTGOING"
      ? "Outgoing Documents"
      : "Envelope Dispatches";

const reportFileLabel = (type: ReportType) =>
  type === "INCOMING"
    ? "Incoming"
    : type === "OUTGOING"
      ? "Outgoing"
      : "Envelope";

const makeWorkbook = (rows: Record<string, unknown>[], sheetName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0] || { Report: "" }).map(
    (heading) => ({
      wch: Math.min(55, Math.max(16, heading.length + 3)),
    }),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return workbook;
};

// LOGIC: State, events, at pagproseso ng data.
export const ReportsView: React.FC<ReportsViewProps> = ({
  documents,
  envelopeLogs,
  auditLogs,
  reportType,
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>(
    reportType || "INCOMING",
  );
  const [monthFilter, setMonthFilter] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [autoDirectory, setAutoDirectory] = useState<any>(null);
  const [savedFolderName, setSavedFolderName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const availableMonths = useMemo(
    () =>
      [
        ...new Set([
          ...documents.map((document) => monthOf(document.dateReceived)),
          ...envelopeLogs.map((log) => monthOf(log.timestamp)),
        ]),
      ]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a)),
    [documents, envelopeLogs],
  );

  const incoming = useMemo(
    () => documents.filter((document) => document.direction === "INCOMING"),
    [documents],
  );
  const outgoing = useMemo(
    () => documents.filter((document) => document.direction === "OUTGOING"),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const source = activeReport === "INCOMING" ? incoming : outgoing;
    const query = searchQuery.trim().toLowerCase();
    return source.filter((document) => {
      if (
        monthFilter !== "ALL" &&
        monthOf(document.dateReceived) !== monthFilter
      )
        return false;
      if (!query) return true;
      return [
        document.routeNo,
        document.trackingNumber,
        document.title,
        document.subject,
        document.senderName,
        document.recipientName,
        document.originatingOffice,
        document.destinationOffice,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [activeReport, incoming, monthFilter, outgoing, searchQuery]);

  const filteredEnvelopeLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return envelopeLogs.filter((log) => {
      if (monthFilter !== "ALL" && monthOf(log.timestamp) !== monthFilter)
        return false;
      if (!query) return true;
      return [log.documentTrackingNumber, log.userName, log.details].some(
        (value) => value?.toLowerCase().includes(query),
      );
    });
  }, [envelopeLogs, monthFilter, searchQuery]);

  const rowsFor = (type: ReportType, month: string) => {
    if (type === "ENVELOPE") {
      return envelopeRows(
        envelopeLogs.filter(
          (log) => month === "ALL" || monthOf(log.timestamp) === month,
        ),
      );
    }
    return documentRows(
      documents.filter(
        (document) =>
          document.direction === type &&
          (month === "ALL" || monthOf(document.dateReceived) === month),
      ),
      auditLogs,
    );
  };

  const writeReportToDirectory = async (
    directory: any,
    type: ReportType,
    month: string,
  ) => {
    const rows = rowsFor(type, month);
    const workbook = makeWorkbook(rows, reportLabel(type));
    const contents = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const fileName = `BLGF_R2_${reportFileLabel(type)}_Report_${month}.xlsx`;
    const fileHandle = await directory.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    return { count: rows.length, fileName };
  };

  const autoExportCurrentMonth = async (directory: any) => {
    const month = new Date().toISOString().slice(0, 7);
    const results = await Promise.all(
      (["INCOMING", "OUTGOING", "ENVELOPE"] as ReportType[]).map((type) =>
        writeReportToDirectory(directory, type, month),
      ),
    );
    setStatusMessage(
      `Monthly auto-export updated ${results.length} reports in ${directory.name} for ${month}.`,
    );
  };

  useEffect(() => {
    setSavedFolderName(localStorage.getItem(AUTO_SAVE_FOLDER_KEY) || "");
    loadDirectoryHandle()
      .then(async (handle) => {
        if (!handle) return;
        const permission = await handle.queryPermission({ mode: "readwrite" });
        if (permission === "granted") setAutoDirectory(handle);
        else
          setStatusMessage(
            `Select "${handle.name}" again to restore monthly auto-export.`,
          );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!autoDirectory) return;
    const timeout = window.setTimeout(() => {
      autoExportCurrentMonth(autoDirectory).catch((error: Error) =>
        setStatusMessage(`Monthly auto-export failed: ${error.message}`),
      );
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [documents, envelopeLogs, autoDirectory]);

  const chooseAutoSaveDirectory = async () => {
    const picker = (globalThis as any).showDirectoryPicker;
    if (!picker) {
      setStatusMessage(
        "Monthly auto-export requires the latest Chrome or Microsoft Edge.",
      );
      return;
    }
    try {
      const handle = await picker({
        id: AUTO_SAVE_KEY,
        mode: "readwrite",
        startIn: "documents",
      });
      const permission = await handle.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") return;
      await saveDirectoryHandle(handle);
      localStorage.setItem(AUTO_SAVE_FOLDER_KEY, handle.name);
      setSavedFolderName(handle.name);
      setAutoDirectory(handle);
      await autoExportCurrentMonth(handle);
    } catch (error: any) {
      if (error?.name !== "AbortError")
        setStatusMessage(`Unable to select report folder: ${error.message}`);
    }
  };

  const exportActiveReport = async () => {
    try {
      const rows =
        activeReport === "ENVELOPE"
          ? envelopeRows(filteredEnvelopeLogs)
          : documentRows(filteredDocuments, auditLogs);
      const month = monthFilter === "ALL" ? "All_Months" : monthFilter;
      const fileName = `BLGF_R2_${reportFileLabel(activeReport)}_Report_${month}.xlsx`;
      const workbook = makeWorkbook(rows, reportLabel(activeReport));
      XLSX.writeFile(workbook, fileName);
      setStatusMessage(`Exported ${rows.length} record(s) to ${fileName}.`);
    } catch (error: any) {
      setStatusMessage(`Excel export failed: ${error.message}`);
    }
  };

  const visibleCount =
    activeReport === "ENVELOPE"
      ? filteredEnvelopeLogs.length
      : filteredDocuments.length;

  const reportTabs = [
    { type: "INCOMING" as const, icon: ArrowDownLeft, count: incoming.length },
    { type: "OUTGOING" as const, icon: ArrowUpRight, count: outgoing.length },
    { type: "ENVELOPE" as const, icon: Mail, count: envelopeLogs.length },
  ];

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <ReportsViewDesign />
      {
        <div className={styles.page}>
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <div>
                <h2 className={styles.title}>
                  <FileSpreadsheet className={styles.titleIcon} />
                  {reportType
                    ? `${reportLabel(activeReport)} Report`
                    : "Document Reports"}
                </h2>
                <p className={styles.subtitle}>
                  {reportType
                    ? `Monthly ${reportLabel(activeReport).toLowerCase()} records with Excel export and automatic folder saving.`
                    : "Separate monthly reports for incoming documents, outgoing documents, and envelope dispatches."}
                </p>
              </div>
              <div className={styles.heroActions}>
                <Button
                  type="button"
                  onClick={exportActiveReport}
                  className={styles.exportButton}
                >
                  <Download className={styles.buttonIcon} /> Export Current
                  Report
                </Button>
                <Button
                  type="button"
                  onClick={chooseAutoSaveDirectory}
                  className={styles.folderButton}
                >
                  <FolderOpen className={styles.buttonIcon} />
                  {autoDirectory || savedFolderName
                    ? `Auto Folder: ${autoDirectory?.name || savedFolderName}`
                    : "Enable Monthly Auto-Export"}
                </Button>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className={styles.statusMessage}>{statusMessage}</div>
          )}

          {!reportType && (
            <div className={styles.reportTabs}>
              {reportTabs.map(({ type, icon: Icon, count }) => (
                <Button
                  type="button"
                  key={type}
                  onClick={() => {
                    setActiveReport(type);
                    setSearchQuery("");
                  }}
                  className={classes(
                    styles.reportTab,
                    activeReport === type && styles.reportTabActive,
                  )}
                >
                  <div className={styles.tabHeader}>
                    <Icon className={styles.tabIcon} />
                    <span className={styles.tabCount}>{count}</span>
                  </div>
                  <div className={styles.tabLabel}>
                    {reportLabel(type)} Report
                  </div>
                </Button>
              ))}
            </div>
          )}

          <div className={styles.filters}>
            <div className={styles.searchField}>
              <Search className={styles.searchIcon} />
              <FormInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search route number, title, sender, recipient, or details..."
                className={styles.searchInput}
               style={{ paddingLeft: 38 }} />
            </div>
            <FormSelect
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className={styles.monthSelect}
            >
              <option value="ALL">All Months</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {new Date(`${month}-01T00:00:00`).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              ))}
            </FormSelect>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableTitle}>
              {reportLabel(activeReport)} · {visibleCount} record(s)
            </div>
            <div className={styles.tableScroll}>
              {activeReport === "ENVELOPE" ? (
                <Table stickyHeader className={styles.envelopeTable}>
                  <TableHead className={styles.tableHead}>
                    <TableRow>
                      <TableCell className={styles.cell}>Timestamp</TableCell>
                      <TableCell className={styles.cell}>Route No.</TableCell>
                      <TableCell className={styles.cell}>Released By</TableCell>
                      <TableCell className={styles.cell}>
                        Dispatch Details
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className={styles.tableBody}>
                    {filteredEnvelopeLogs.map((log) => (
                      <TableRow key={log.id} className={styles.row}>
                        <TableCell className={styles.nowrapCell}>
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell className={styles.routeCell}>
                          {log.documentTrackingNumber || "N/A"}
                        </TableCell>
                        <TableCell className={styles.strongCell}>
                          {log.userName}
                        </TableCell>
                        <TableCell className={styles.detailsCell}>
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table stickyHeader className={styles.documentTable}>
                  <TableHead className={styles.tableHead}>
                    <TableRow>
                      <TableCell className={styles.cell}>Route No.</TableCell>
                      <TableCell className={styles.cell}>
                        Date Received
                      </TableCell>
                      <TableCell className={styles.cell}>
                        Title / Subject
                      </TableCell>
                      <TableCell className={styles.cell}>From Office</TableCell>
                      <TableCell className={styles.cell}>
                        Initial Receiver
                      </TableCell>
                      <TableCell className={styles.cell}>
                        Current Holder
                      </TableCell>
                      <TableCell className={styles.cell}>
                        Final Outcome
                      </TableCell>
                      <TableCell className={styles.cell}>
                        Completion & Document Handoff
                      </TableCell>
                      <TableCell className={styles.cell}>
                        Last Activity
                      </TableCell>
                      <TableCell className={styles.cell}>
                        Full History
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className={styles.tableBody}>
                    {filteredDocuments.map((document) => {
                      const latestRoute = latestRouteOf(document);
                      const events = eventsFor(document, auditLogs);
                      const lastEvent = events.at(-1);
                      const finalOutcome = finalOutcomeOf(document, events);
                      const completionNotes = completionNotesOf(
                        document,
                        auditLogs,
                      );
                      const handoff = handoffOf(document);
                      return (
                        <React.Fragment key={document.id}>
                          <TableRow className={styles.row}>
                            <TableCell className={styles.routeCell}>
                              {document.routeNo || document.trackingNumber}
                            </TableCell>
                            <TableCell className={styles.nowrapCell}>
                              {formatDate(document.dateReceived)}
                            </TableCell>
                            <TableCell className={styles.titleCell}>
                              <div className={styles.documentTitle}>
                                {document.title}
                              </div>
                              <div className={styles.mutedLine}>
                                {document.subject}
                              </div>
                            </TableCell>
                            <TableCell className={styles.cell}>
                              {document.originatingOffice}
                            </TableCell>
                            <TableCell className={styles.strongCell}>
                              {document.createdBy}
                            </TableCell>
                            <TableCell className={styles.cell}>
                              <div className={styles.bold}>
                                {latestRoute?.toUser ||
                                  document.assignedUser ||
                                  "Unassigned"}
                              </div>
                              <div className={styles.mutedLine}>
                                {latestRoute?.toDivision ||
                                  document.currentDivision}
                              </div>
                            </TableCell>
                            <TableCell className={styles.cell}>
                              <span
                                className={classes(
                                  styles.outcome,
                                  finalOutcome.includes("DISAPPROVED")
                                    ? styles.outcomeNegative
                                    : finalOutcome === "COMPLETED"
                                      ? styles.outcomeComplete
                                      : finalOutcome.includes("APPROVED")
                                        ? styles.outcomeApproved
                                        : styles.outcomePending,
                                )}
                              >
                                {finalOutcome}
                              </span>
                            </TableCell>
                            <TableCell className={styles.handoffCell}>
                              {document.currentStatus === "COMPLETED" ? (
                                <div className={styles.handoff}>
                                  <div>
                                    <span className={styles.detailLabel}>
                                      Instructions:
                                    </span>{" "}
                                    <strong className={styles.instructions}>
                                      {handoff.instructions}
                                    </strong>
                                  </div>
                                  <div>
                                    <span className={styles.detailLabel}>
                                      Completed by:
                                    </span>{" "}
                                    <strong>{handoff.completedBy}</strong>
                                  </div>
                                  <div>
                                    <span className={styles.detailLabel}>
                                      Office:
                                    </span>{" "}
                                    <strong>{handoff.completedOffice}</strong>
                                  </div>
                                  <div>
                                    <span className={styles.detailLabel}>
                                      Completed on:
                                    </span>{" "}
                                    <strong>{handoff.completedOn}</strong>
                                  </div>
                                  {completionNotes && (
                                    <div className={styles.completionNotes}>
                                      <span className={styles.detailLabel}>
                                        Notes:
                                      </span>{" "}
                                      {completionNotes}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className={styles.muted}>
                                  Available when document is completed
                                </span>
                              )}
                            </TableCell>
                            <TableCell className={styles.activityCell}>
                              {lastEvent ? (
                                <>
                                  <div className={styles.bold}>
                                    {lastEvent.event} by {lastEvent.actor}
                                  </div>
                                  <div className={styles.mutedLine}>
                                    {formatDate(lastEvent.timestamp)}
                                  </div>
                                </>
                              ) : (
                                "No activity recorded"
                              )}
                            </TableCell>
                            <TableCell className={styles.cell}>
                              <Button
                                type="button"
                                onClick={() =>
                                  setExpandedRouteId((current) =>
                                    current === document.id
                                      ? null
                                      : document.id,
                                  )
                                }
                                className={styles.historyButton}
                              >
                                {expandedRouteId === document.id
                                  ? "Hide History"
                                  : `View History (${events.length})`}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedRouteId === document.id && (
                            <TableRow className={styles.historyRow}>
                              <TableCell
                                colSpan={10}
                                className={styles.historyCell}
                              >
                                <div className={styles.historyTitle}>
                                  Route History —{" "}
                                  {document.routeNo || document.trackingNumber}
                                </div>
                                {events.length ? (
                                  <div className={styles.historyList}>
                                    {events.map((event, index) => (
                                      <div
                                        key={event.id}
                                        className={styles.historyEvent}
                                      >
                                        <div className={styles.eventNumber}>
                                          #{index + 1}
                                        </div>
                                        <div>
                                          <span className={styles.muted}>
                                            Date:
                                          </span>
                                          <div className={styles.bold}>
                                            {formatDate(event.timestamp)}
                                          </div>
                                        </div>
                                        <div>
                                          <span className={styles.muted}>
                                            User:
                                          </span>
                                          <div className={styles.bold}>
                                            {event.actor}
                                          </div>
                                        </div>
                                        <div>
                                          <span className={styles.muted}>
                                            What happened:
                                          </span>
                                          <div
                                            className={classes(
                                              styles.eventName,
                                              event.outcome === "DISAPPROVED" ||
                                                event.outcome === "RETURNED"
                                                ? styles.eventNegative
                                                : event.outcome ===
                                                      "APPROVED" ||
                                                    event.outcome ===
                                                      "COMPLETED"
                                                  ? styles.eventPositive
                                                  : styles.eventNeutral,
                                            )}
                                          >
                                            {event.event}
                                          </div>
                                          <div className={styles.eventDetails}>
                                            {event.details}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className={styles.noEvents}>
                                    No routing events recorded yet.
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {visibleCount === 0 && (
                <div className={styles.empty}>
                  No records match this report filter.
                </div>
              )}
            </div>
          </div>
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function ReportsViewDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[reportsViewCss, createReportsViewStyles(theme)]}
    />
  );
}
