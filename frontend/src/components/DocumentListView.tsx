// DocumentListView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import {
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import React, { useState } from "react";
import {
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Printer,
  Eye,
  Send,
  QrCode,
  Tag,
  Calendar,
  Paperclip,
  Trash2,
  Search,
  X,
} from "lucide-react";
import {
  DocumentRecord,
  DocumentDirection,
  User,
  DEFAULT_ROLE_PERMISSIONS,
} from "../types";
import {
  STATUS_CONFIGS,
  PRIORITY_CONFIGS,
  formatShortDate,
} from "../utils/statusUtils";
import { calculateDocumentProgress } from "../utils/progress";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for DocumentListView.
// BASE CSS: Pangunahing design ng component.
const documentListViewCss = `/* DocumentListView.module.css */
.mui-documentlistview-page { display: grid; gap: 1.25rem; }
.mui-documentlistview-header, .mui-documentlistview-filters, .mui-documentlistview-tableCard { border: 1px solid #e4e4e7; border-radius: .75rem; background: #fff; box-shadow: 0 1px 2px rgb(15 23 42 / .04); }
.mui-documentlistview-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; }.mui-documentlistview-title { display: flex; align-items: center; gap: .5rem; margin: 0; color: #18181b; font-size: 1.25rem; font-weight: 800; }.mui-documentlistview-titleIcon { width: 1.25rem; color: #3f3f46; }.mui-documentlistview-subtitle { margin: .125rem 0 0; color: #71717a; font-size: .75rem; font-weight: 500; }
.mui-documentlistview-createButton, .mui-documentlistview-viewButton, .mui-documentlistview-routeButton, .mui-documentlistview-slipButton, .mui-documentlistview-deleteButton { display: inline-flex; align-items: center; justify-content: center; gap: .25rem; font-weight: 700; cursor: pointer; transition: background-color .15s, color .15s, border-color .15s; }.mui-documentlistview-createButton { flex: none; gap: .5rem; padding: .5rem 1rem; border: 0; border-radius: .5rem; background: #3f3f46; color: #fff; font-size: .8125rem; }.mui-documentlistview-createButton:hover { background: #27272a; }.mui-documentlistview-buttonIcon { width: 1rem; }
.mui-documentlistview-filters { display: grid; gap: 1rem; padding: 1rem; }.mui-documentlistview-filterHeader { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; padding-bottom: .75rem; border-bottom: 1px solid #e4e4e7; }.mui-documentlistview-directionTabs { display: flex; align-items: center; gap: .125rem; padding: .25rem; border: 1px solid #e4e4e7; border-radius: .5rem; background: #f4f4f5; }
.mui-documentlistview-directionTab { display: flex; align-items: center; gap: .375rem; padding: .375rem .75rem; border: 0; border-radius: .375rem; background: transparent; color: #52525b; font-size: .75rem; font-weight: 600; cursor: pointer; transition: background-color .15s, color .15s; }.mui-documentlistview-directionTab:hover { color: #18181b; }.mui-documentlistview-directionTabActive { background: #3f3f46; color: #fff; box-shadow: 0 1px 2px rgb(15 23 42 / .12); }.mui-documentlistview-directionTabActive:hover { color: #fff; }.mui-documentlistview-outgoingTab { background: #52525b; }.mui-documentlistview-tabIcon { width: .875rem; }.mui-documentlistview-resultCount { margin: 0; color: #71717a; font-size: .75rem; font-weight: 500; }.mui-documentlistview-resultValue { color: #18181b; }.mui-documentlistview-filterGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
.mui-documentlistview-select { width: 100%; padding: .5rem .75rem; border: 1px solid #e4e4e7; border-radius: .5rem; outline: none; background: #fafafa; color: #18181b; font-size: .75rem; }.mui-documentlistview-select:focus { border-color: #71717a; box-shadow: 0 0 0 2px rgb(59 130 246 / .22); }
.mui-documentlistview-tableCard { overflow: hidden; }.mui-documentlistview-tableScroll { overflow-x: auto; }.mui-documentlistview-table { width: 100%; border-collapse: collapse; color: #27272a; font-size: .75rem; text-align: left; }.mui-documentlistview-tableHeadRow { border-bottom: 1px solid #e4e4e7; background: #fafafa; color: #71717a; font-size: .625rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }.mui-documentlistview-cell, .mui-documentlistview-actionsHead, .mui-documentlistview-table td { padding: .75rem; }.mui-documentlistview-actionsHead { text-align: right; }.mui-documentlistview-tableBody { color: #27272a; }.mui-documentlistview-tableBody tr { border-bottom: 1px solid #f4f4f5; }.mui-documentlistview-tableBody tr:last-child { border-bottom: 0; }.mui-documentlistview-tableRow { transition: background-color .15s; }.mui-documentlistview-tableRow:hover { background: rgb(248 250 252 / .8); }
.mui-documentlistview-empty { padding: 3rem; color: #71717a; text-align: center; }.mui-documentlistview-emptyIcon { width: 3rem; height: 3rem; margin: 0 auto .75rem; color: #d4d4d8; }.mui-documentlistview-emptyTitle { margin: 0; color: #27272a; font-size: 1rem; }.mui-documentlistview-emptyText { margin: .25rem 0 0; font-size: .75rem; }
.mui-documentlistview-searchBanner { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; border: 1px solid #bfdbfe; border-radius: .75rem; background: #eff6ff; }.mui-documentlistview-searchBannerIcon { width: 1rem; height: 1rem; color: #2563eb; flex: none; }.mui-documentlistview-searchBannerTitle { margin: 0; color: #1e3a8a; font-size: .8125rem; font-weight: 800; }.mui-documentlistview-searchBannerText { margin: .125rem 0 0; color: #3b82f6; font-size: .6875rem; font-weight: 500; }.mui-documentlistview-searchClearButton { margin-left: auto; display: inline-flex; align-items: center; gap: .25rem; padding: .375rem .625rem; border: 1px solid #93c5fd; border-radius: .5rem; background: #fff; color: #1d4ed8; font-size: .6875rem; font-weight: 700; cursor: pointer; transition: background-color .15s, border-color .15s; }.mui-documentlistview-searchClearButton:hover { background: #dbeafe; border-color: #60a5fa; }.mui-documentlistview-match { border-radius: .1875rem; background: #fef08a; color: #854d0e; padding: 0 .0625rem; }
.dark .mui-documentlistview-searchBanner { border-color: #1e40af; background: rgb(30 58 138 / .25); }.dark .mui-documentlistview-searchBannerTitle { color: #bfdbfe; }.dark .mui-documentlistview-searchBannerText { color: #93c5fd; }.dark .mui-documentlistview-searchClearButton { border-color: #1e40af; background: #172554; color: #93c5fd; }.dark .mui-documentlistview-searchClearButton:hover { background: #1e3a8a; }.dark .mui-documentlistview-match { background: rgb(250 204 21 / .35); color: #fde68a; }
.mui-documentlistview-routeCell { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }.mui-documentlistview-routeLink { display: flex; align-items: center; gap: .25rem; padding: 0; color: #3f3f46; font-weight: 700; cursor: pointer; }.mui-documentlistview-routeLink:hover { text-decoration: underline; }.mui-documentlistview-routeIcon { width: .875rem; color: #a1a1aa; }.mui-documentlistview-routeMeta { display: flex; align-items: center; gap: .25rem; margin-top: .25rem; }.mui-documentlistview-directionBadge, .mui-documentlistview-priorityBadge, .mui-documentlistview-statusBadge { display: inline-flex; align-items: center; border-radius: .375rem; font-weight: 800; }.mui-documentlistview-directionBadge { padding: .125rem .375rem; font-size: .5625rem; text-transform: uppercase; }.mui-documentlistview-incomingBadge { background: #f4f4f5; color: #27272a; }.mui-documentlistview-outgoingBadge { background: #f4f4f5; color: #3f3f46; }
.mui-documentlistview-attachmentCount, .mui-documentlistview-category { display: flex; align-items: center; gap: .125rem; color: #71717a; font-size: .625rem; font-weight: 700; }.mui-documentlistview-attachmentIcon, .mui-documentlistview-smallIcon { width: .75rem; }.mui-documentlistview-attachmentIcon { color: #71717a; }.mui-documentlistview-priorityBadge { padding: .125rem .5rem; font-size: .625rem; white-space: nowrap; }.mui-documentlistview-priority_ROUTINE { background: #f4f4f5; color: #52525b; }.mui-documentlistview-priority_URGENT { background: #fef3c7; color: #b45309; }.mui-documentlistview-priority_VERY_URGENT { background: #fee2e2; color: #b91c1c; }.mui-documentlistview-priority_CONFIDENTIAL { background: #f3e8ff; color: #7e22ce; }.mui-documentlistview-pulse { animation: pulse 1.7s ease-in-out infinite; } @keyframes pulse { 50% { opacity: .55; } }
.mui-documentlistview-documentCell { max-width: 20rem; }.mui-documentlistview-documentTitle, .mui-documentlistview-subject, .mui-documentlistview-latestAction { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.mui-documentlistview-documentTitle { color: #18181b; font-weight: 700; }.mui-documentlistview-tableRow:hover .mui-documentlistview-documentTitle { color: #3f3f46; }.mui-documentlistview-subject { margin-top: .125rem; color: #71717a; font-size: .6875rem; font-weight: 500; }.mui-documentlistview-category { margin-top: .125rem; color: #a1a1aa; }.mui-documentlistview-latestAction { margin-top: .25rem; color: #b45309; font-size: .625rem; font-weight: 600; }
.mui-documentlistview-progressCell { width: 8rem; }.mui-documentlistview-progressLabels { display: flex; align-items: center; justify-content: space-between; gap: .25rem; margin-bottom: .25rem; font-size: .625rem; }.mui-documentlistview-progressStage { max-width: 3.75rem; overflow: hidden; color: #a1a1aa; font-size: .5625rem; text-overflow: ellipsis; white-space: nowrap; }.mui-documentlistview-progressTrack { width: 100%; height: .375rem; overflow: hidden; border-radius: 999px; background: #e4e4e7; }.mui-documentlistview-progressBar { height: 100%; border-radius: inherit; }.mui-documentlistview-progressValue { font-weight: 800; }.mui-documentlistview-progress_PENDING, .mui-documentlistview-progress_ON_HOLD { color: #d97706; }.mui-documentlistview-progress_IN_PROGRESS, .mui-documentlistview-progress_FOR_SIGNATURE { color: #3f3f46; }.mui-documentlistview-progress_COMPLETED { color: #059669; }.mui-documentlistview-progress_RETURNED { color: #dc2626; }.mui-documentlistview-progressBar.mui-documentlistview-progress_PENDING, .mui-documentlistview-progressBar.mui-documentlistview-progress_ON_HOLD { background: #f59e0b; }.mui-documentlistview-progressBar.mui-documentlistview-progress_IN_PROGRESS, .mui-documentlistview-progressBar.mui-documentlistview-progress_FOR_SIGNATURE { background: #71717a; }.mui-documentlistview-progressBar.mui-documentlistview-progress_COMPLETED { background: #10b981; }.mui-documentlistview-progressBar.mui-documentlistview-progress_RETURNED { background: #ef4444; }
.mui-documentlistview-statusBadge { gap: .375rem; padding: .25rem .625rem; font-size: .6875rem; white-space: nowrap; }.mui-documentlistview-statusDot { width: .5rem; height: .5rem; border-radius: 50%; background: currentColor; }.mui-documentlistview-status_PENDING { background: #f4f4f5; color: #52525b; }.mui-documentlistview-status_IN_PROGRESS { background: #f4f4f5; color: #27272a; }.mui-documentlistview-status_FOR_SIGNATURE { background: #f3e8ff; color: #7e22ce; }.mui-documentlistview-status_COMPLETED { background: #d1fae5; color: #047857; }.mui-documentlistview-status_RETURNED { background: #fee2e2; color: #b91c1c; }.mui-documentlistview-status_ON_HOLD { background: #fef3c7; color: #b45309; }
.mui-documentlistview-division { color: #27272a; font-weight: 700; }.mui-documentlistview-assignee { color: #71717a; font-size: .625rem; }.mui-documentlistview-dateCell { font-size: .6875rem; }.mui-documentlistview-receivedDate { display: flex; align-items: center; gap: .25rem; color: #3f3f46; font-weight: 500; }.mui-documentlistview-dueDate { margin-top: .125rem; color: #b45309; font-size: .625rem; }.mui-documentlistview-actionsCell { text-align: right; white-space: nowrap; }.mui-documentlistview-viewButton, .mui-documentlistview-routeButton, .mui-documentlistview-slipButton, .mui-documentlistview-deleteButton { margin-left: .25rem; padding: .25rem .5rem; border-radius: .25rem; font-size: .625rem; }.mui-documentlistview-viewButton { border: 1px solid #e4e4e7; background: #f4f4f5; color: #3f3f46; }.mui-documentlistview-viewButton:hover { background: #e4e4e7; }.mui-documentlistview-routeButton, .mui-documentlistview-slipButton { border: 0; color: #fff; }.mui-documentlistview-routeButton { background: #3f3f46; }.mui-documentlistview-routeButton:hover { background: #27272a; }.mui-documentlistview-slipButton { background: #059669; }.mui-documentlistview-slipButton:hover { background: #047857; }.mui-documentlistview-deleteButton { border: 1px solid #fecdd3; background: #ffe4e6; color: #be123c; }.mui-documentlistview-deleteButton:hover { border-color: #e11d48; background: #e11d48; color: #fff; }.mui-documentlistview-actionIcon { width: .75rem; }
.dark .mui-documentlistview-header, .dark .mui-documentlistview-filters, .dark .mui-documentlistview-tableCard { border-color: #27272a; background: #18181b; }.dark .mui-documentlistview-title, .dark .mui-documentlistview-resultValue, .dark .mui-documentlistview-documentTitle { color: #fff; }.dark .mui-documentlistview-subtitle, .dark .mui-documentlistview-resultCount, .dark .mui-documentlistview-subject, .dark .mui-documentlistview-assignee { color: #a1a1aa; }.dark .mui-documentlistview-filterHeader { border-color: #27272a; }.dark .mui-documentlistview-directionTabs { border-color: #3f3f46; background: #27272a; }.dark .mui-documentlistview-directionTab { color: #d4d4d8; }.dark .mui-documentlistview-directionTabActive { color: #fff; }.dark .mui-documentlistview-select { border-color: #3f3f46; background: #27272a; color: #fff; }
.dark .mui-documentlistview-tableHeadRow { border-color: #27272a; background: rgb(30 41 59 / .8); color: #a1a1aa; }.dark .mui-documentlistview-tableBody { color: #e4e4e7; }.dark .mui-documentlistview-tableBody tr { border-color: #27272a; }.dark .mui-documentlistview-tableRow:hover { background: rgb(30 41 59 / .5); }.dark .mui-documentlistview-empty { color: #a1a1aa; }.dark .mui-documentlistview-emptyTitle, .dark .mui-documentlistview-division { color: #e4e4e7; }.dark .mui-documentlistview-routeLink { color: #a1a1aa; }.dark .mui-documentlistview-progressTrack { background: #3f3f46; }.dark .mui-documentlistview-receivedDate { color: #d4d4d8; }.dark .mui-documentlistview-viewButton { border-color: #3f3f46; background: #27272a; color: #e4e4e7; }.dark .mui-documentlistview-viewButton:hover { background: #3f3f46; }.dark .mui-documentlistview-deleteButton { border-color: #9f1239; background: rgb(76 5 25 / .65); color: #fda4af; }
@media (max-width: 767px) { .mui-documentlistview-header { align-items: flex-start; flex-direction: column; }.mui-documentlistview-title { font-size: 1.0625rem; }.mui-documentlistview-filterGrid { grid-template-columns: 1fr; }.mui-documentlistview-directionTabs { width: 100%; overflow-x: auto; }.mui-documentlistview-directionTab { flex: 1; justify-content: center; white-space: nowrap; } }
@media (prefers-reduced-motion: reduce) { .mui-documentlistview-pulse { animation: none; } }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const documentListViewStyles = {
  actionIcon: "mui-documentlistview-actionIcon",
  actionsCell: "mui-documentlistview-actionsCell",
  actionsHead: "mui-documentlistview-actionsHead",
  assignee: "mui-documentlistview-assignee",
  attachmentCount: "mui-documentlistview-attachmentCount",
  attachmentIcon: "mui-documentlistview-attachmentIcon",
  buttonIcon: "mui-documentlistview-buttonIcon",
  category: "mui-documentlistview-category",
  cell: "mui-documentlistview-cell",
  createButton: "mui-documentlistview-createButton",
  dateCell: "mui-documentlistview-dateCell",
  deleteButton: "mui-documentlistview-deleteButton",
  directionBadge: "mui-documentlistview-directionBadge",
  directionTab: "mui-documentlistview-directionTab",
  directionTabActive: "mui-documentlistview-directionTabActive",
  directionTabs: "mui-documentlistview-directionTabs",
  division: "mui-documentlistview-division",
  documentCell: "mui-documentlistview-documentCell",
  documentTitle: "mui-documentlistview-documentTitle",
  dueDate: "mui-documentlistview-dueDate",
  empty: "mui-documentlistview-empty",
  emptyIcon: "mui-documentlistview-emptyIcon",
  emptyText: "mui-documentlistview-emptyText",
  emptyTitle: "mui-documentlistview-emptyTitle",
  filterGrid: "mui-documentlistview-filterGrid",
  filterHeader: "mui-documentlistview-filterHeader",
  filters: "mui-documentlistview-filters",
  header: "mui-documentlistview-header",
  incomingBadge: "mui-documentlistview-incomingBadge",
  latestAction: "mui-documentlistview-latestAction",
  outgoingBadge: "mui-documentlistview-outgoingBadge",
  outgoingTab: "mui-documentlistview-outgoingTab",
  page: "mui-documentlistview-page",
  priorityBadge: "mui-documentlistview-priorityBadge",
  priority_CONFIDENTIAL: "mui-documentlistview-priority_CONFIDENTIAL",
  priority_ROUTINE: "mui-documentlistview-priority_ROUTINE",
  priority_URGENT: "mui-documentlistview-priority_URGENT",
  priority_VERY_URGENT: "mui-documentlistview-priority_VERY_URGENT",
  progressBar: "mui-documentlistview-progressBar",
  progressCell: "mui-documentlistview-progressCell",
  progressLabels: "mui-documentlistview-progressLabels",
  progressStage: "mui-documentlistview-progressStage",
  progressTrack: "mui-documentlistview-progressTrack",
  progressValue: "mui-documentlistview-progressValue",
  progress_COMPLETED: "mui-documentlistview-progress_COMPLETED",
  progress_FOR_SIGNATURE: "mui-documentlistview-progress_FOR_SIGNATURE",
  progress_IN_PROGRESS: "mui-documentlistview-progress_IN_PROGRESS",
  progress_ON_HOLD: "mui-documentlistview-progress_ON_HOLD",
  progress_PENDING: "mui-documentlistview-progress_PENDING",
  progress_RETURNED: "mui-documentlistview-progress_RETURNED",
  pulse: "mui-documentlistview-pulse",
  receivedDate: "mui-documentlistview-receivedDate",
  resultCount: "mui-documentlistview-resultCount",
  resultValue: "mui-documentlistview-resultValue",
  routeButton: "mui-documentlistview-routeButton",
  routeCell: "mui-documentlistview-routeCell",
  routeIcon: "mui-documentlistview-routeIcon",
  routeLink: "mui-documentlistview-routeLink",
  routeMeta: "mui-documentlistview-routeMeta",
  searchBanner: "mui-documentlistview-searchBanner",
  searchBannerIcon: "mui-documentlistview-searchBannerIcon",
  searchBannerTitle: "mui-documentlistview-searchBannerTitle",
  searchBannerText: "mui-documentlistview-searchBannerText",
  searchClearButton: "mui-documentlistview-searchClearButton",
  match: "mui-documentlistview-match",
  select: "mui-documentlistview-select",
  slipButton: "mui-documentlistview-slipButton",
  smallIcon: "mui-documentlistview-smallIcon",
  statusBadge: "mui-documentlistview-statusBadge",
  statusDot: "mui-documentlistview-statusDot",
  status_COMPLETED: "mui-documentlistview-status_COMPLETED",
  status_FOR_SIGNATURE: "mui-documentlistview-status_FOR_SIGNATURE",
  status_IN_PROGRESS: "mui-documentlistview-status_IN_PROGRESS",
  status_ON_HOLD: "mui-documentlistview-status_ON_HOLD",
  status_PENDING: "mui-documentlistview-status_PENDING",
  status_RETURNED: "mui-documentlistview-status_RETURNED",
  subject: "mui-documentlistview-subject",
  subtitle: "mui-documentlistview-subtitle",
  tabIcon: "mui-documentlistview-tabIcon",
  table: "mui-documentlistview-table",
  tableBody: "mui-documentlistview-tableBody",
  tableCard: "mui-documentlistview-tableCard",
  tableHeadRow: "mui-documentlistview-tableHeadRow",
  tableRow: "mui-documentlistview-tableRow",
  tableScroll: "mui-documentlistview-tableScroll",
  title: "mui-documentlistview-title",
  titleIcon: "mui-documentlistview-titleIcon",
  viewButton: "mui-documentlistview-viewButton",
} as const;

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createDocumentListViewStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const soft = dark ? "#18181b" : "#fafafa";
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    '.mui-documentlistview-tableScroll table': { minWidth: 1220 },
    '.mui-documentlistview-progress': { minWidth: 120 },
    '.mui-documentlistview-table td': { verticalAlign: 'top' },
    '.mui-documentlistview-tableScroll:focus-visible': { outline: `2px solid ${text}`, outlineOffset: -2 },
    ".mui-documentlistview-page": {
      gap: "16px !important",
    },
    ".mui-documentlistview-header": {
      padding: "16px 18px !important",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-documentlistview-title": {
      color: text + " !important",
      fontSize: "20px !important",
      lineHeight: "1.3 !important",
      letterSpacing: "-.025em !important",
    },
    ".mui-documentlistview-subtitle": {
      color: muted + " !important",
      fontSize: "13px !important",
      lineHeight: "1.55 !important",
      marginTop: "4px !important",
    },
    ".mui-documentlistview-tableCard": {
      overflow: "hidden",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-documentlistview-tableScroll": {
      overflowX: "auto !important",
      scrollbarWidth: "thin",
      scrollbarColor: `${dark ? "#52525b" : "#b8c4d4"} transparent`,
    },
    ".mui-documentlistview-actionsHead": {
      position: "sticky !important",
      right: "0",
      zIndex: 4,
      width: 164,
      minWidth: 164,
      background: soft + " !important",
      boxShadow: dark
        ? "-8px 0 14px rgba(0,0,0,.2)"
        : "-8px 0 14px rgba(24,24,27,.06)",
    },
    ".mui-documentlistview-actionsCell": {
      position: "sticky !important",
      right: "0",
      zIndex: 2,
      width: 164,
      minWidth: 164,
      background: surface + " !important",
      boxShadow: dark
        ? "-8px 0 14px rgba(0,0,0,.2)"
        : "-8px 0 14px rgba(24,24,27,.06)",
    },
    ".mui-documentlistview-actionsCell .MuiIconButton-root": {
      width: 32,
      height: 32,
      minWidth: 32,
      marginLeft: "4px !important",
      padding: "0 !important",
      borderRadius: "7px !important",
      boxShadow: "none !important",
    },
    ".mui-documentlistview-titleIcon": {
      width: "22px !important",
      height: "22px !important",
    },
    ".mui-documentlistview-buttonIcon": {
      width: "17px !important",
      height: "17px !important",
    },
    ".mui-documentlistview-directionTab": { fontSize: "12.5px !important" },
    ".mui-documentlistview-resultCount": { fontSize: "12.5px !important" },
    ".mui-documentlistview-tabIcon": {
      width: "15px !important",
      height: "15px !important",
    },
    ".mui-documentlistview-documentTitle": {
      fontSize: "13px !important",
      lineHeight: "1.45 !important",
      whiteSpace: 'normal !important', overflow: 'visible !important', textOverflow: 'clip !important', overflowWrap: 'anywhere',
    },
    ".mui-documentlistview-subject": { fontSize: "12px !important" },
    ".mui-documentlistview-dateCell": { fontSize: "12px !important" },
    ".mui-documentlistview-category": {
      fontSize: "11.5px !important",
      lineHeight: "1.45 !important",
    },
    ".mui-documentlistview-latestAction": {
      fontSize: "11.5px !important",
      lineHeight: "1.45 !important",
    },
    ".mui-documentlistview-assignee": {
      fontSize: "11.5px !important",
      lineHeight: "1.45 !important",
    },
    ".mui-documentlistview-dueDate": {
      fontSize: "11.5px !important",
      lineHeight: "1.45 !important",
    },
    ".mui-documentlistview-smallIcon": {
      width: "14px !important",
      height: "14px !important",
    },
    ".mui-documentlistview-attachmentIcon": {
      width: "14px !important",
      height: "14px !important",
    },
    ".mui-documentlistview-actionIcon": {
      width: "14px !important",
      height: "14px !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".mui-documentlistview-header": {
        padding: "14px !important",
        gap: "12px !important",
      },
      ".mui-documentlistview-createButton": { width: "100%" },
      ".mui-documentlistview-table": { minWidth: "980px" },
    },
  };
};
const styles = documentListViewStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

const classes = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

// Highlight the matched part of a tracking number / title in the list.
const highlightText = (
  text: string | undefined,
  query: string,
  matchClass: string,
) => {
  const source = String(text || "");
  const q = query.trim();
  if (!q || !source) return source;
  const index = source.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) return source;
  return (
    <>
      {source.slice(0, index)}
      <mark className={matchClass}>{source.slice(index, index + q.length)}</mark>
      {source.slice(index + q.length)}
    </>
  );
};

// DATA: Mga props at uri ng data na ginagamit ng component.
interface DocumentListViewProps {
  documents: DocumentRecord[];
  initialDirection?: DocumentDirection | "ALL";
  searchQuery?: string;
  onClearSearch?: () => void;
  onSelectDoc: (doc: DocumentRecord) => void;
  onOpenRouteDoc: (doc: DocumentRecord) => void;
  onOpenCreateDoc: () => void;
  onPrintSlip: (doc: DocumentRecord) => void;
  onDeleteDoc?: (doc: DocumentRecord) => void;
  currentUser: User;
  createButtonLabel?: string;
}

// LOGIC: State, events, at pagproseso ng data.
export const DocumentListView: React.FC<DocumentListViewProps> = ({
  documents,
  initialDirection = "ALL",
  searchQuery = "",
  onClearSearch,
  onSelectDoc,
  onOpenRouteDoc,
  onOpenCreateDoc,
  onPrintSlip,
  onDeleteDoc,
  currentUser,
  createButtonLabel,
}) => {
  const [directionFilter, setDirectionFilter] = useState<
    DocumentDirection | "ALL"
  >(initialDirection);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [divisionFilter, setDivisionFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Filter documents based on user role permissions
  const perms =
    currentUser.permissions ||
    DEFAULT_ROLE_PERMISSIONS[currentUser.role] ||
    DEFAULT_ROLE_PERMISSIONS.STAFF;
  const canAccessDocumentSlip = (perms.allowedViews || []).includes("slip");
  const userCanRouteDocument = (document: DocumentRecord) =>
    document.currentStatus !== "COMPLETED" &&
    document.currentStatus !== "RETURNED";
  // The parent supplies the already access-controlled document collection,
  // including recovered audit-only routing participants.
  const userFilteredDocs = documents;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  // While a global search is active it takes precedence over the direction
  // tab, so a matching document is shown regardless of whether it is incoming
  // or outgoing.
  const effectiveDirection = normalizedQuery ? "ALL" : directionFilter;

  const filteredDocs = userFilteredDocs.filter((doc) => {
    if (normalizedQuery) {
      const searchable = [
        doc.routeNo || doc.trackingNumber || "",
        doc.title || "",
        doc.subject || "",
        doc.originatingOffice || "",
        doc.senderName || "",
        doc.currentDivision || "",
        doc.category || "",
        (doc.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    }
    if (effectiveDirection !== "ALL" && doc.direction !== effectiveDirection)
      return false;
    if (statusFilter !== "ALL" && doc.currentStatus !== statusFilter)
      return false;
    if (divisionFilter !== "ALL" && doc.currentDivision !== divisionFilter)
      return false;
    if (priorityFilter !== "ALL" && doc.priority !== priorityFilter)
      return false;
    return true;
  });

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <DocumentListViewDesign />
      {
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h2 className={styles.title}>
                <FileText className={styles.titleIcon} />
                <span>Documents</span>
              </h2>
              <p className={styles.subtitle}>
                Search, filter, and manage your document records.
              </p>
            </div>
            <Button
              type="button"
              onClick={onOpenCreateDoc}
              className={styles.createButton}
            >
              <Plus className={styles.buttonIcon} />
              <span>
                {createButtonLabel ||
                  (initialDirection === "OUTGOING"
                    ? "Log Outgoing Document"
                    : "Log New Document")}
              </span>
            </Button>
          </div>

          {/* Global Search Results Notice */}
          {normalizedQuery && (
            <div className={styles.searchBanner}>
              <Search className={styles.searchBannerIcon} />
              <div style={{ minWidth: 0 }}>
                <h3 className={styles.searchBannerTitle}>
                  Search results for “{searchQuery.trim()}”
                </h3>
                <p className={styles.searchBannerText}>
                  {filteredDocs.length} matching document
                  {filteredDocs.length === 1 ? "" : "s"} by tracking number,
                  title & details
                </p>
              </div>
              {onClearSearch && (
                <Button
                  type="button"
                  onClick={onClearSearch}
                  className={styles.searchClearButton}
                >
                  <X className={styles.smallIcon} />
                  <span>Clear search</span>
                </Button>
              )}
            </div>
          )}

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterHeader}>
              <div className={styles.directionTabs}>
                {(["ALL", "INCOMING", "OUTGOING"] as const).map((dir) => (
                  <Button
                    type="button"
                    key={dir}
                    onClick={() => setDirectionFilter(dir)}
                    className={classes(
                      styles.directionTab,
                      effectiveDirection === dir && styles.directionTabActive,
                      effectiveDirection === dir &&
                        dir === "OUTGOING" &&
                        styles.outgoingTab,
                    )}
                  >
                    {dir === "INCOMING" && (
                      <ArrowDownLeft className={styles.tabIcon} />
                    )}
                    {dir === "OUTGOING" && (
                      <ArrowUpRight className={styles.tabIcon} />
                    )}
                    <span>
                      {dir === "ALL"
                        ? `All (${userFilteredDocs.length})`
                        : `${dir === "INCOMING" ? "Incoming" : "Outgoing"} (${userFilteredDocs.filter((d) => d.direction === dir).length})`}
                    </span>
                  </Button>
                ))}
              </div>
              <div className={styles.resultCount}>
                Showing{" "}
                <strong className={styles.resultValue}>
                  {filteredDocs.length}
                </strong>{" "}
                record(s)
              </div>
            </div>

            <div className={styles.filterGrid}>
              <FormSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.select}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FOR_SIGNATURE">For Signature</option>
                <option value="COMPLETED">Completed</option>
                <option value="RETURNED">Returned</option>
                <option value="ON_HOLD">On Hold</option>
              </FormSelect>
              <FormSelect
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className={styles.select}
              >
                <option value="ALL">All Divisions</option>
                <option value="ORD">ORD</option>
                <option value="LTOD">LTOD</option>
                <option value="LAOD">LAOD</option>
                <option value="AD">AD</option>
                <option value="LU">LU</option>
              </FormSelect>
              <FormSelect
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={styles.select}
              >
                <option value="ALL">All Priorities</option>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="VERY_URGENT">Very Urgent!</option>
                <option value="CONFIDENTIAL">Confidential</option>
              </FormSelect>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableCard}>
            {filteredDocs.length === 0 ? (
              <div className={styles.empty}>
                <FileText className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>
                  No documents match filter criteria
                </h3>
                <p className={styles.emptyText}>
                  Try resetting search query or adjusting filters.
                </p>
              </div>
            ) : (
              <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Document records. Scroll horizontally to view all columns.">
                <Table stickyHeader className={styles.table}>
                  <TableHead>
                    <TableRow className={styles.tableHeadRow}>
                      <TableCell className={styles.cell}>
                        Document Route No. / Type
                      </TableCell>
                      <TableCell className={styles.cell}>Priority</TableCell>
                      <TableCell className={styles.cell}>
                        Document Title & Subject
                      </TableCell>
                      <TableCell className={styles.cell}>Progress</TableCell>
                      <TableCell className={styles.cell}>Status</TableCell>
                      <TableCell className={styles.cell}>Division</TableCell>
                      <TableCell className={styles.cell}>Dates</TableCell>
                      <TableCell className={styles.actionsHead}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className={styles.tableBody}>
                    {filteredDocs.map((doc) => {
                      const cfg = STATUS_CONFIGS[doc.currentStatus];
                      const prioCfg = PRIORITY_CONFIGS[doc.priority];
                      const progress = calculateDocumentProgress(doc);
                      const latestAction =
                        [...(doc.routes || [])].sort(
                          (a, b) => b.stepNumber - a.stepNumber,
                        )[0]?.actionRequested ||
                        doc.actionRequested ||
                        "N/A";
                      return (
                        <TableRow key={doc.id} className={styles.tableRow}>
                          <TableCell className={styles.routeCell}>
                            <div
                              className={styles.routeLink}
                              onClick={() => onSelectDoc(doc)}
                            >
                              <QrCode className={styles.routeIcon} />
                              <span>
                                {highlightText(
                                  doc.routeNo,
                                  normalizedQuery,
                                  styles.match,
                                )}
                              </span>
                            </div>
                            <div className={styles.routeMeta}>
                              <span
                                className={classes(
                                  styles.directionBadge,
                                  doc.direction === "INCOMING"
                                    ? styles.incomingBadge
                                    : styles.outgoingBadge,
                                )}
                              >
                                {doc.direction}
                              </span>
                              {(doc.attachments || []).length > 0 && (
                                <span className={styles.attachmentCount}>
                                  <Paperclip
                                    className={styles.attachmentIcon}
                                  />
                                  <span>{doc.attachments?.length}</span>
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={styles.cell}>
                            <span
                              className={classes(
                                styles.priorityBadge,
                                styles[`priority_${doc.priority}`],
                                prioCfg?.animatePulse && styles.pulse,
                              )}
                            >
                              {prioCfg?.label || doc.priority}
                            </span>
                          </TableCell>
                          <TableCell className={styles.documentCell}>
                            <div className={styles.documentTitle}>
                              {highlightText(
                                doc.title,
                                normalizedQuery,
                                styles.match,
                              )}
                            </div>
                            <div className={styles.subject}>{doc.subject}</div>
                            <div className={styles.category}>
                              <Tag className={styles.smallIcon} />
                              <span>{doc.category}</span>
                            </div>
                            <div className={styles.latestAction}>
                              Action: {latestAction}
                            </div>
                          </TableCell>
                          <TableCell className={styles.progressCell}>
                            <div className={styles.progressLabels}>
                              <span
                                className={classes(
                                  styles.progressValue,
                                  styles[`progress_${doc.currentStatus}`],
                                )}
                              >
                                {progress.percentage}%
                              </span>
                              <span className={styles.progressStage}>
                                {progress.stageName}
                              </span>
                            </div>
                            <div className={styles.progressTrack}>
                              <div
                                className={classes(
                                  styles.progressBar,
                                  styles[`progress_${doc.currentStatus}`],
                                )}
                                style={{ width: `${progress.percentage}%` }}
                              ></div>
                            </div>
                          </TableCell>
                          <TableCell className={styles.cell}>
                            <span
                              className={classes(
                                styles.statusBadge,
                                styles[`status_${doc.currentStatus}`],
                              )}
                            >
                              <span className={styles.statusDot}></span>
                              <span>{cfg?.label || doc.currentStatus}</span>
                            </span>
                          </TableCell>
                          <TableCell className={styles.cell}>
                            <div className={styles.division}>
                              {doc.currentDivision}
                            </div>
                            <div className={styles.assignee}>
                              {doc.assignedUser || "Unassigned"}
                            </div>
                          </TableCell>
                          <TableCell className={styles.dateCell}>
                            <div className={styles.receivedDate}>
                              <Calendar className={styles.smallIcon} />
                              <span>{formatShortDate(doc.dateReceived)}</span>
                            </div>
                            <div className={styles.dueDate}>
                              Due: {formatShortDate(doc.targetCompletionDate)}
                            </div>
                          </TableCell>
                          <TableCell className={styles.actionsCell}>
                            <Tooltip title="View document">
                              <IconButton
                                type="button"
                                onClick={() => onSelectDoc(doc)}
                                className={styles.viewButton}
                                aria-label={`View ${doc.routeNo}`}
                              >
                                <Eye className={styles.actionIcon} />
                              </IconButton>
                            </Tooltip>
                            {userCanRouteDocument(doc) && (
                              <Tooltip title="Route document">
                                <IconButton
                                  type="button"
                                  onClick={() => onOpenRouteDoc(doc)}
                                  className={styles.routeButton}
                                  aria-label={`Route ${doc.routeNo}`}
                                >
                                  <Send className={styles.actionIcon} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canAccessDocumentSlip && (
                              <Tooltip title="Print routing slip">
                                <IconButton
                                  type="button"
                                  onClick={() => onPrintSlip(doc)}
                                  className={styles.slipButton}
                                  aria-label={`Print routing slip for ${doc.routeNo}`}
                                >
                                  <Printer className={styles.actionIcon} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {onDeleteDoc &&
                              (currentUser.role === "SYSTEM_ADMIN" ||
                                perms.canDelete) && (
                                <Tooltip title="Delete document">
                                  <IconButton
                                    type="button"
                                    onClick={() => onDeleteDoc(doc)}
                                    className={styles.deleteButton}
                                    aria-label={`Delete ${doc.routeNo}`}
                                  >
                                    <Trash2 className={styles.actionIcon} />
                                  </IconButton>
                                </Tooltip>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function DocumentListViewDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[documentListViewCss, createDocumentListViewStyles(theme)]}
    />
  );
}
