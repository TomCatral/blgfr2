// AuditLogsView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { FormInput, FormSelect } from "./ui/FormControls";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  Search,
  Download,
  FileSpreadsheet,
  FolderOpen,
} from "lucide-react";
import * as XLSX from "xlsx";
import { AuditLog } from "../types";
import { formatDate } from "../utils/statusUtils";
import { cx } from "../styles/muiClasses";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for AuditLogsView.
// BASE CSS: Pangunahing design ng component.
const auditLogsViewCss = `/* AuditLogsView.module.css */
.mui-auditlogsview-page { display: grid; gap: 1.25rem; }
.mui-auditlogsview-toolbar { display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1rem; background: #fff; border: 1px solid #e4e4e7; border-radius: .75rem; box-shadow: 0 .1rem .25rem rgb(15 23 42 / 5%); }
.mui-auditlogsview-title { display: flex; align-items: center; gap: .5rem; margin: 0; color: #18181b; font-size: 1.125rem; font-weight: 800; }
.mui-auditlogsview-titleIcon { color: #52525b; }
.mui-auditlogsview-subtitle { margin: .125rem 0 0; color: #71717a; font-size: .75rem; font-weight: 500; }
.mui-auditlogsview-toolbarActions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.mui-auditlogsview-folderName { padding: .25rem .5rem; color: #a1a1aa; background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: .25rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .625rem; }
.mui-auditlogsview-excelButton, .mui-auditlogsview-folderButton, .mui-auditlogsview-csvButton { display: inline-flex; align-items: center; gap: .5rem; flex-shrink: 0; padding: .5rem .875rem; color: #fff; border: 0; border-radius: .5rem; cursor: pointer; font-size: .75rem; font-weight: 800; }
.mui-auditlogsview-excelButton { background: #059669; } .mui-auditlogsview-excelButton:hover { background: #10b981; }
.mui-auditlogsview-folderButton { background: #3f3f46; } .mui-auditlogsview-folderButton:hover { background: #71717a; }
.mui-auditlogsview-csvButton { color: #3f3f46; background: #f4f4f5; border: 1px solid #e4e4e7; } .mui-auditlogsview-csvButton:hover { background: #e4e4e7; }
.mui-auditlogsview-csvIcon { color: #3f3f46; }
.mui-auditlogsview-successMessage, .mui-auditlogsview-infoMessage { padding: .75rem; border: 1px solid; border-radius: .75rem; font-size: .75rem; font-weight: 800; text-align: center; }
.mui-auditlogsview-successMessage { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }
.mui-auditlogsview-infoMessage { color: #3f3f46; background: #fafafa; border-color: #e4e4e7; }
.mui-auditlogsview-filters { display: grid; grid-template-columns: 1fr; gap: .75rem; padding: 1rem; background: #fff; border: 1px solid #e4e4e7; border-radius: .75rem; box-shadow: 0 .1rem .25rem rgb(15 23 42 / 5%); font-size: .75rem; }
.mui-auditlogsview-searchField { position: relative; }
.mui-auditlogsview-searchIcon { position: absolute; top: .625rem; left: .75rem; width: 1rem; height: 1rem; color: #a1a1aa; pointer-events: none; }
.mui-auditlogsview-searchInput, .mui-auditlogsview-select { width: 100%; padding: .375rem .75rem; color: #18181b; background: #fafafa; border: 1px solid #e4e4e7; border-radius: .5rem; }
.mui-auditlogsview-searchInput { padding-left: 2.25rem; }
.mui-auditlogsview-searchInput:focus, .mui-auditlogsview-select:focus { outline: none; border-color: #71717a; box-shadow: 0 0 0 3px rgb(59 130 246 / 20%); }
.mui-auditlogsview-tableCard { overflow: hidden; background: #fff; border: 1px solid #e4e4e7; border-radius: .75rem; box-shadow: 0 .1rem .25rem rgb(15 23 42 / 5%); }
.mui-auditlogsview-tableScroll { overflow-x: auto; }
.mui-auditlogsview-table { width: 100%; border-collapse: collapse; font-size: .75rem; text-align: left; }
.mui-auditlogsview-tableHead { color: #71717a; background: #fafafa; border-bottom: 1px solid #e4e4e7; font-size: .625rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.mui-auditlogsview-cell { padding: .75rem; }
.mui-auditlogsview-tableBody { color: #27272a; }
.mui-auditlogsview-tableBody tr + tr { border-top: 1px solid #f4f4f5; }
.mui-auditlogsview-emptyCell { padding: 2rem; color: #a1a1aa; font-weight: 500; text-align: center; }
.mui-auditlogsview-row { transition: background-color 150ms ease; } .mui-auditlogsview-row:hover { background: rgb(248 250 252 / 80%); }
.mui-auditlogsview-timestamp { padding: .75rem; color: #52525b; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .6875rem; }
.mui-auditlogsview-userName { color: #18181b; font-weight: 800; }
.mui-auditlogsview-userRole { color: #71717a; font-size: .625rem; font-weight: 500; }
.mui-auditlogsview-actionBadge { display: inline-flex; padding: .15rem .5rem; border: 1px solid; border-radius: .25rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .625rem; font-weight: 800; }
.mui-auditlogsview-actionCreate { color: #047857; background: #d1fae5; border-color: #a7f3d0; }
.mui-auditlogsview-actionRoute { color: #27272a; background: #f4f4f5; border-color: #e4e4e7; }
.mui-auditlogsview-actionUpdate { color: #b45309; background: #fef3c7; border-color: #fde68a; }
.mui-auditlogsview-actionDanger { color: #be123c; background: #ffe4e6; border-color: #fecdd3; }
.mui-auditlogsview-actionUpload { color: #0e7490; background: #cffafe; border-color: #a5f3fc; }
.mui-auditlogsview-actionLogin { color: #7e22ce; background: #f3e8ff; border-color: #e9d5ff; }
.mui-auditlogsview-actionEnvelope { color: #a21caf; background: #fae8ff; border-color: #f5d0fe; }
.mui-auditlogsview-actionSql { color: #3f3f46; background: #f4f4f5; border-color: #e4e4e7; }
.mui-auditlogsview-actionDefault { color: #3f3f46; background: #f4f4f5; border-color: #e4e4e7; }
.mui-auditlogsview-routeNumber { padding: .75rem; color: #3f3f46; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; }
.mui-auditlogsview-detailsCell { max-width: 28rem; padding: .75rem; color: #3f3f46; font-weight: 500; }
.mui-auditlogsview-detailList { margin: 0; padding-left: 1rem; line-height: 1.55; white-space: normal; }
.mui-auditlogsview-detailList li + li { margin-top: .25rem; }
.mui-auditlogsview-breakWords { overflow-wrap: anywhere; }
.mui-auditlogsview-detailText { white-space: pre-wrap; overflow-wrap: anywhere; }
.mui-auditlogsview-pagination { display: flex; align-items: center; justify-content: space-between; font-size: .75rem; }
.mui-auditlogsview-paginationSummary { color: #71717a; }
.mui-auditlogsview-paginationActions { display: flex; gap: .5rem; }
.mui-auditlogsview-pageButton { padding: .375rem .75rem; background: #fff; border: 1px solid #d4d4d8; border-radius: .5rem; cursor: pointer; }
.mui-auditlogsview-pageButton:disabled { cursor: not-allowed; opacity: .4; }
.mui-auditlogsview-pageNumber { padding: .375rem .5rem; font-weight: 800; }
@media (min-width: 768px) { .mui-auditlogsview-toolbar { flex-direction: row; align-items: center; } .mui-auditlogsview-filters { grid-template-columns: repeat(4, minmax(0, 1fr)); } .mui-auditlogsview-searchField { grid-column: span 2; } }
.dark .mui-auditlogsview-toolbar, .dark .mui-auditlogsview-filters, .dark .mui-auditlogsview-tableCard { background: #18181b; border-color: #27272a; }
.dark .mui-auditlogsview-title, .dark .mui-auditlogsview-userName { color: #fff; }
.dark .mui-auditlogsview-subtitle, .dark .mui-auditlogsview-userRole, .dark .mui-auditlogsview-paginationSummary { color: #a1a1aa; }
.dark .mui-auditlogsview-folderName { background: #27272a; border-color: #3f3f46; }
.dark .mui-auditlogsview-csvButton, .dark .mui-auditlogsview-pageButton { color: #e4e4e7; background: #27272a; border-color: #3f3f46; }
.dark .mui-auditlogsview-searchInput, .dark .mui-auditlogsview-select { color: #fff; background: #27272a; border-color: #3f3f46; }
.dark .mui-auditlogsview-tableHead { color: #a1a1aa; background: rgb(30 41 59 / 80%); border-color: #27272a; }
.dark .mui-auditlogsview-tableBody { color: #e4e4e7; }
.dark .mui-auditlogsview-tableBody tr + tr { border-color: #27272a; }
.dark .mui-auditlogsview-row:hover { background: rgb(30 41 59 / 50%); }
.dark .mui-auditlogsview-timestamp, .dark .mui-auditlogsview-detailsCell { color: #d4d4d8; }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const auditLogsViewStyles = {
  actionBadge: "mui-auditlogsview-actionBadge",
  actionCreate: "mui-auditlogsview-actionCreate",
  actionDanger: "mui-auditlogsview-actionDanger",
  actionDefault: "mui-auditlogsview-actionDefault",
  actionEnvelope: "mui-auditlogsview-actionEnvelope",
  actionLogin: "mui-auditlogsview-actionLogin",
  actionRoute: "mui-auditlogsview-actionRoute",
  actionSql: "mui-auditlogsview-actionSql",
  actionUpdate: "mui-auditlogsview-actionUpdate",
  actionUpload: "mui-auditlogsview-actionUpload",
  breakWords: "mui-auditlogsview-breakWords",
  cell: "mui-auditlogsview-cell",
  csvButton: "mui-auditlogsview-csvButton",
  csvIcon: "mui-auditlogsview-csvIcon",
  detailList: "mui-auditlogsview-detailList",
  detailText: "mui-auditlogsview-detailText",
  detailsCell: "mui-auditlogsview-detailsCell",
  emptyCell: "mui-auditlogsview-emptyCell",
  excelButton: "mui-auditlogsview-excelButton",
  filters: "mui-auditlogsview-filters",
  folderButton: "mui-auditlogsview-folderButton",
  folderName: "mui-auditlogsview-folderName",
  infoMessage: "mui-auditlogsview-infoMessage",
  page: "mui-auditlogsview-page",
  pageButton: "mui-auditlogsview-pageButton",
  pageNumber: "mui-auditlogsview-pageNumber",
  pagination: "mui-auditlogsview-pagination",
  paginationActions: "mui-auditlogsview-paginationActions",
  paginationSummary: "mui-auditlogsview-paginationSummary",
  routeNumber: "mui-auditlogsview-routeNumber",
  row: "mui-auditlogsview-row",
  searchField: "mui-auditlogsview-searchField",
  searchIcon: "mui-auditlogsview-searchIcon",
  searchInput: "mui-auditlogsview-searchInput",
  select: "mui-auditlogsview-select",
  subtitle: "mui-auditlogsview-subtitle",
  successMessage: "mui-auditlogsview-successMessage",
  table: "mui-auditlogsview-table",
  tableBody: "mui-auditlogsview-tableBody",
  tableCard: "mui-auditlogsview-tableCard",
  tableHead: "mui-auditlogsview-tableHead",
  tableScroll: "mui-auditlogsview-tableScroll",
  timestamp: "mui-auditlogsview-timestamp",
  title: "mui-auditlogsview-title",
  titleIcon: "mui-auditlogsview-titleIcon",
  toolbar: "mui-auditlogsview-toolbar",
  toolbarActions: "mui-auditlogsview-toolbarActions",
  userName: "mui-auditlogsview-userName",
  userRole: "mui-auditlogsview-userRole",
} as const;

const styles = auditLogsViewStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface AuditLogsViewProps {
  auditLogs: AuditLog[];
  title?: string;
  subtitle?: string;
}

const normalizeActionDetailItem = (item: string) =>
  item.startsWith("To:") ? item.replace(/\s+\([^)]*\)\s*$/, "") : item;

const getActionDetailItems = (details: string) => {
  const normalized = details.trim();
  if (!normalized) return [];

  if (normalized.includes(" | ")) {
    return normalized
      .split(" | ")
      .map((item) => item.trim())
      .filter(
        (item) =>
          Boolean(item) &&
          !item.startsWith("Assigned Handler / Individual Recipient:"),
      )
      .map(normalizeActionDetailItem);
  }

  if (normalized.startsWith("Envelope dispatched to:")) {
    const subjectMarker = ". Subject: ";
    const releasedMarker = ". Released by ";
    const subjectIndex = normalized.indexOf(subjectMarker);
    const releasedIndex = normalized.lastIndexOf(releasedMarker);
    if (subjectIndex > -1 && releasedIndex > subjectIndex) {
      return [
        normalized.slice(0, subjectIndex).trim(),
        `Subject: ${normalized
          .slice(subjectIndex + subjectMarker.length, releasedIndex)
          .trim()}`,
        `Released by: ${normalized
          .slice(releasedIndex + releasedMarker.length)
          .replace(/\.$/, "")
          .trim()}`,
      ].map(normalizeActionDetailItem);
    }
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (lines.length > 1 ? lines : [normalized]).map(
    normalizeActionDetailItem,
  );
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

const saveDirectoryHandle = async (key: string, handle: any) => {
  const database = await openHandleDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
};

const loadDirectoryHandle = async (key: string) => {
  const database = await openHandleDatabase();
  const handle = await new Promise<any>((resolve, reject) => {
    const request = database
      .transaction("handles", "readonly")
      .objectStore("handles")
      .get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
};

// LOGIC: State, events, at pagproseso ng data.
export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  auditLogs,
  title,
  subtitle,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [exportMsg, setExportMsg] = useState("");
  const [autoDirectory, setAutoDirectory] = useState<any>(null);
  const [savedFolderName, setSavedFolderName] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [page, setPage] = useState(1);
  const logsPerPage = 25;

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
    if (
      monthFilter !== "ALL" &&
      new Date(log.timestamp).toISOString().slice(0, 7) !== monthFilter
    )
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.documentTrackingNumber &&
          log.documentTrackingNumber.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const availableMonths = [
    ...new Set(
      auditLogs.map((log) => new Date(log.timestamp).toISOString().slice(0, 7)),
    ),
  ].sort((a, b) => b.localeCompare(a));
  const exportMonthLabel = monthFilter === "ALL" ? "All_Months" : monthFilter;
  const isEnvelopeLog = Boolean(title);
  const handleStorageKey = isEnvelopeLog
    ? "envelope_log_auto_save"
    : "audit_log_auto_save";
  const folderNameStorageKey = `${handleStorageKey}_folder_name`;
  const toExcelRows = (logs: AuditLog[]) =>
    logs.map((log) => ({
      Timestamp: formatDate(log.timestamp),
      "User Name": log.userName,
      "User Role": log.userRole,
      "Action Type": log.action,
      "Document Route No.": log.documentTrackingNumber || "N/A",
      "Action Details": log.details,
      "IP Address": log.ipAddress || "N/A",
    }));

  const writeMonthToDirectory = async (
    directoryHandle: any,
    requestedMonth = new Date().toISOString().slice(0, 7),
    automatic = true,
  ) => {
    const currentMonth =
      requestedMonth === "ALL"
        ? new Date().toISOString().slice(0, 7)
        : requestedMonth;
    const monthlyLogs = auditLogs.filter(
      (log) =>
        new Date(log.timestamp).toISOString().slice(0, 7) === currentMonth,
    );
    const data = toExcelRows(monthlyLogs);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MonthlyLogs");
    const contents = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileName = `BLGF_R2_${isEnvelopeLog ? "EnvelopeLogs" : "AuditLogs"}_${currentMonth}.xlsx`;
    const fileHandle = await directoryHandle.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    setAutoSaveStatus(
      `${automatic ? "Automatically saved" : "Saved"} ${monthlyLogs.length} record(s) to ${directoryHandle.name}/${fileName}. This is the default monthly log folder.`,
    );
  };

  useEffect(() => {
    setSavedFolderName(localStorage.getItem(folderNameStorageKey) || "");
    loadDirectoryHandle(handleStorageKey)
      .then(async (handle) => {
        if (!handle) return;
        const permission = await handle.queryPermission({ mode: "readwrite" });
        if (permission === "granted") setAutoDirectory(handle);
        else
          setAutoSaveStatus(
            `Select "${handle.name}" again to restore automatic monthly saving.`,
          );
      })
      .catch(() => {});
  }, [handleStorageKey, folderNameStorageKey]);

  useEffect(() => {
    if (!autoDirectory) return;
    const timeout = window.setTimeout(() => {
      writeMonthToDirectory(autoDirectory).catch((error: any) =>
        setAutoSaveStatus(`Automatic save failed: ${error.message}`),
      );
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [auditLogs, autoDirectory]);

  const chooseAutoSaveDirectory = async () => {
    const picker = (globalThis as any).showDirectoryPicker;
    if (!picker) {
      setAutoSaveStatus(
        "The folder picker is unavailable in this browser. Open this system in the latest Chrome or Microsoft Edge, then select the default monthly log folder.",
      );
      return;
    }
    try {
      const handle = await picker({
        id: handleStorageKey,
        mode: "readwrite",
        startIn: "documents",
      });
      const permission = await handle.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") return;
      await saveDirectoryHandle(handleStorageKey, handle);
      localStorage.setItem(folderNameStorageKey, handle.name);
      setSavedFolderName(handle.name);
      setAutoDirectory(handle);
      await writeMonthToDirectory(handle);
    } catch (error: any) {
      if (error?.name !== "AbortError")
        setAutoSaveStatus(`Unable to select folder: ${error.message}`);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE_DOC":
        return styles.actionCreate;
      case "ROUTE_DOC":
        return styles.actionRoute;
      case "UPDATE_STATUS":
        return styles.actionUpdate;
      case "TRANSFER_DOC":
        return styles.actionDanger;
      case "UPLOAD_ATTACHMENT":
        return styles.actionUpload;
      case "DELETE_DOC":
        return styles.actionDanger;
      case "LOGIN":
        return styles.actionLogin;
      case "ENVELOPE_LOG":
        return styles.actionEnvelope;
      case "SQL_QUERY":
        return styles.actionSql;
      default:
        return styles.actionDefault;
    }
  };
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const pageLogs = filteredLogs.slice(
    (page - 1) * logsPerPage,
    page * logsPerPage,
  );

  const exportToExcel = async () => {
    try {
      const data = toExcelRows(filteredLogs);
      const actionLabel =
        actionFilter === "ALL" ? "All_Action_Types" : actionFilter;
      const fileName = `BLGF_R2_${title ? "EnvelopeLogs" : "AuditLogs"}_${exportMonthLabel}_${actionLabel}.xlsx`;

      if (autoDirectory) {
        let permission = await autoDirectory.queryPermission({
          mode: "readwrite",
        });
        if (permission !== "granted") {
          permission = await autoDirectory.requestPermission({
            mode: "readwrite",
          });
        }
        if (permission === "granted") {
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "AuditLogs");
          const contents = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
          });
          const fileHandle = await autoDirectory.getFileHandle(fileName, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(contents);
          await writable.close();
          setAutoSaveStatus(
            `Saved ${data.length} matching record(s) to ${autoDirectory.name}/${fileName}.`,
          );
          return;
        }
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AuditLogs");

      ws["!cols"] = [
        { wch: 22 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 50 },
        { wch: 18 },
      ];

      XLSX.writeFile(wb, fileName);
      setExportMsg(
        "No default folder is active. Downloaded " +
          fileName +
          " (" +
          data.length +
          " records).",
      );
      setTimeout(() => setExportMsg(""), 5000);
    } catch (err: any) {
      setExportMsg("Export failed: " + err.message);
      setTimeout(() => setExportMsg(""), 5000);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = [
        "Timestamp",
        "User Name",
        "User Role",
        "Action Type",
        "Document Route No.",
        "Action Details",
        "IP Address",
      ];
      const rows = filteredLogs.map((log) => [
        formatDate(log.timestamp),
        log.userName,
        log.userRole,
        log.action,
        log.documentTrackingNumber || "N/A",
        '"' + log.details.replace(/"/g, '""') + '"',
        log.ipAddress || "N/A",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const fileName = `BLGF_R2_${title ? "EnvelopeLogs" : "AuditLogs"}_${exportMonthLabel}.csv`;
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      setExportMsg(
        "Exported to " + fileName + " (" + rows.length + " records)",
      );
      setTimeout(() => setExportMsg(""), 5000);
    } catch (err: any) {
      setExportMsg("Export failed: " + err.message);
      setTimeout(() => setExportMsg(""), 5000);
    }
  };

  // LAYOUT: Ang nakikita sa screen.
  // DESIGN: Ang pangunahing layout design ay nasa tabi mismo ng bawat div.
  return (
    <>
      <AuditLogsViewDesign />
      {
        <div className={cx(styles.page, "grid gap-5")}>
          {/* Header */}
          <div
            className={cx(
              styles.toolbar,
              "flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center",
            )}
          >
            <div>
              <h2 className={styles.title}>
                <ClipboardList className={styles.titleIcon} />
                <span>{title || "System Audit Logs & Security Trail"}</span>
              </h2>
              <p className={styles.subtitle}>
                {subtitle ||
                  "Immutable log trail of all user actions, document routing, and system updates in BLGF Regional Office II"}
              </p>
            </div>

            <div className={cx(styles.toolbarActions, "flex flex-wrap gap-2")}>
              {auditLogs.length > 0 && (
                <span className={styles.folderName}>
                  {monthFilter === "ALL"
                    ? "All months"
                    : new Date(`${monthFilter}-01T00:00:00`).toLocaleString(
                        "default",
                        { month: "long", year: "numeric" },
                      )}
                </span>
              )}

              <Button
                type="button"
                onClick={exportToExcel}
                className={styles.excelButton}
                title="Manually save the selected month's logs to Excel"
              >
                <FileSpreadsheet size={16} />
                <span>Manual Excel Save</span>
              </Button>

              <Button
                type="button"
                onClick={chooseAutoSaveDirectory}
                className={styles.folderButton}
                title="Select the folder used for automatic monthly Excel files"
              >
                <FolderOpen size={16} />
                <span>
                  {autoDirectory || savedFolderName
                    ? `Auto Folder: ${autoDirectory?.name || savedFolderName}`
                    : "Select Auto-Save Folder"}
                </span>
              </Button>

              <Button
                type="button"
                onClick={exportToCSV}
                className={styles.csvButton}
                title="Export filtered logs to CSV"
              >
                <Download className={styles.csvIcon} />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Export Message */}
          {exportMsg && (
            <div className={styles.successMessage}>{exportMsg}</div>
          )}
          {autoSaveStatus && (
            <div className={styles.infoMessage}>{autoSaveStatus}</div>
          )}

          {/* Filter Bar */}
            <div
              className={cx(
                styles.filters,
                "grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4",
              )}
            >
            <div className={styles.searchField}>
              <Search className={styles.searchIcon} />
              <FormInput
                type="text"
                placeholder="Filter by user, Document Route No., action details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div>
              <FormSelect
                value={monthFilter}
                onChange={(event) => {
                  setMonthFilter(event.target.value);
                  setPage(1);
                }}
                className={styles.select}
                aria-label="Select log month"
              >
                <option value="ALL">All Months</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {new Date(`${month}-01T00:00:00`).toLocaleString(
                      "default",
                      {
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </option>
                ))}
              </FormSelect>
            </div>

            <div>
              <FormSelect
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className={styles.select}
              >
                <option value="ALL">All Action Types</option>
                <option value="CREATE_DOC">
                  CREATE_DOC (Log New Document)
                </option>
                <option value="ROUTE_DOC">ROUTE_DOC (Forward Document)</option>
                <option value="TRANSFER_DOC">
                  TRANSFER_DOC (Reassign Document)
                </option>
                <option value="UPLOAD_ATTACHMENT">
                  UPLOAD_ATTACHMENT (Digital File)
                </option>
                <option value="UPDATE_STATUS">
                  UPDATE_STATUS (Lifecycle Status)
                </option>
                <option value="LOGIN">LOGIN (User Auth Session)</option>
                <option value="ENVELOPE_LOG">
                  ENVELOPE_LOG (Outgoing Envelope Dispatch)
                </option>
                <option value="SQL_QUERY">
                  DATABASE_QUERY (Legacy Database Action)
                </option>
              </FormSelect>
            </div>
          </div>

          {/* Table */}
          <div
            className={cx(
              styles.tableCard,
              "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
            )}
          >
            <div className={styles.tableScroll}>
              <Table stickyHeader className={styles.table}>
                <TableHead>
                  <TableRow className={styles.tableHead}>
                    <TableCell className={styles.cell}>Timestamp</TableCell>
                    <TableCell className={styles.cell}>Actor / User</TableCell>
                    <TableCell className={styles.cell}>Action Type</TableCell>
                    <TableCell className={styles.cell}>
                      Document Route No.
                    </TableCell>
                    <TableCell className={styles.cell}>
                      Action Details
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className={styles.tableBody}>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className={styles.emptyCell}>
                        No audit logs found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageLogs.map((log) => (
                      <TableRow key={log.id} className={styles.row}>
                        <TableCell className={styles.timestamp}>
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell className={styles.cell}>
                          <div className={styles.userName}>{log.userName}</div>
                          <div className={styles.userRole}>{log.userRole}</div>
                        </TableCell>
                        <TableCell className={styles.cell}>
                          <span
                            className={`${styles.actionBadge} ${getActionBadge(log.action)}`}
                          >
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className={styles.routeNumber}>
                          {log.documentTrackingNumber || "N/A"}
                        </TableCell>
                        <TableCell className={styles.detailsCell}>
                          {getActionDetailItems(log.details).length > 1 ? (
                            <ul className={styles.detailList}>
                              {getActionDetailItems(log.details).map(
                                (detail, index) => (
                                  <li
                                    key={`${log.id}-detail-${index}`}
                                    className={styles.breakWords}
                                  >
                                    {detail}
                                  </li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <span className={styles.detailText}>
                              {log.details}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div
            className={cx(
              styles.pagination,
              "flex flex-wrap items-center justify-between gap-3 text-xs",
            )}
          >
            <span className={styles.paginationSummary}>
              Showing{" "}
              {filteredLogs.length === 0 ? 0 : (page - 1) * logsPerPage + 1}–
              {Math.min(page * logsPerPage, filteredLogs.length)} of{" "}
              {filteredLogs.length}
            </span>
            <div className={styles.paginationActions}>
              <Button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className={styles.pageButton}
              >
                Previous
              </Button>
              <span className={styles.pageNumber}>
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                className={styles.pageButton}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      }
    </>
  );
};

function AuditLogsViewDesign() {
  return <ComponentGlobalStyles styles={[auditLogsViewCss]} />;
}
