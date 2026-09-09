import { documentFileType, isReplyAttachment } from '../../utils/documentFiles';
// RouteDocumentModal: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { ModalLayer } from "../ui/ModalLayer";
import { FormInput, FormSelect, FormTextarea } from "../ui/FormControls";
import { Alert, Box, Button, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { findPreviousDelivery, hasCompletedPart } from '../../utils/routingRecipients';
import {
  X,
  Send,
  User as UserIcon,
  RefreshCw,
  UserPlus,
  Paperclip,
  FileText,
} from "lucide-react";
import {
  DocumentRecord,
  DocumentStatus,
  DivisionCode,
  User,
  EmployeeProfile,
  DEFAULT_ROLE_PERMISSIONS,
} from "../../types";
import { api } from "../../services/api";
import { ManagedOptionsSelect } from "../ManagedOptionsSelect";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for RouteDocumentModal.
// BASE CSS: Pangunahing design ng component.
const routeDocumentModalCss = `/* RouteDocumentModal.module.css */
.mui-routedocumentmodal-backdrop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 1rem; background: rgb(15 23 42 / .65); backdrop-filter: blur(2px); }.mui-routedocumentmodal-dialog { width: 100%; max-width: 36rem; margin: 2rem 0; overflow: hidden; border: 1px solid #e4e4e7; border-radius: 1rem; background: #fff; color: #18181b; box-shadow: 0 25px 50px rgb(15 23 42 / .25); }.mui-routedocumentmodal-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid #e4e4e7; background: #fafafa; }.mui-routedocumentmodal-headerIdentity { display: flex; align-items: center; gap: .75rem; }.mui-routedocumentmodal-headerIcon { display: grid; place-items: center; padding: .5rem; border: 1px solid #e4e4e7; border-radius: .5rem; background: #fafafa; color: #3f3f46; }.mui-routedocumentmodal-mediumIcon { width: 1.25rem; }.mui-routedocumentmodal-title { margin: 0; color: #18181b; font-size: 1rem; font-weight: 800; }.mui-routedocumentmodal-routeNumber { margin: 0; color: #3f3f46; font: 700 .75rem ui-monospace, monospace; }.mui-routedocumentmodal-closeButton, .mui-routedocumentmodal-tagRemove, .mui-routedocumentmodal-refreshButton, .mui-routedocumentmodal-removeButton, .mui-routedocumentmodal-removeAttachment { border: 0; background: transparent; cursor: pointer; }.mui-routedocumentmodal-closeButton { padding: .375rem; border-radius: .5rem; color: #a1a1aa; }.mui-routedocumentmodal-closeButton:hover { background: #e4e4e7; color: #3f3f46; }
.mui-routedocumentmodal-form { display: grid; gap: 1rem; padding: 1.25rem; font-size: .75rem; }.mui-routedocumentmodal-summary { display: grid; gap: .25rem; padding: .75rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fafafa; }.mui-routedocumentmodal-summaryTitle, .mui-routedocumentmodal-summarySubject { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.mui-routedocumentmodal-summaryTitle { color: #18181b; font-size: .875rem; font-weight: 700; }.mui-routedocumentmodal-summarySubject { color: #71717a; font-size: .6875rem; font-weight: 500; }.mui-routedocumentmodal-summaryMeta { display: flex; align-items: center; justify-content: space-between; padding-top: .25rem; border-top: 1px solid #e4e4e7; color: #71717a; font-size: .625rem; }.mui-routedocumentmodal-location { color: #3f3f46; }.mui-routedocumentmodal-currentStatus { color: #b45309; }.mui-routedocumentmodal-recipientGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }.mui-routedocumentmodal-labelRow, .mui-routedocumentmodal-recipientLabel { display: flex; align-items: center; justify-content: space-between; margin-bottom: .25rem; }.mui-routedocumentmodal-label, .mui-routedocumentmodal-fieldLabel, .mui-routedocumentmodal-completionLabel, .mui-routedocumentmodal-attachmentLabel, .mui-routedocumentmodal-recipientLabel { color: #3f3f46; font-weight: 700; }.mui-routedocumentmodal-fieldLabel, .mui-routedocumentmodal-attachmentLabel { display: block; margin-bottom: .25rem; }.mui-routedocumentmodal-addDivisionButton, .mui-routedocumentmodal-refreshButton { color: #3f3f46; font-size: .625rem; font-weight: 700; }.mui-routedocumentmodal-addDivisionButton:disabled { color: #a1a1aa; cursor: not-allowed; }
.mui-routedocumentmodal-select, .mui-routedocumentmodal-additionalSelect, .mui-routedocumentmodal-managedSelect, .mui-routedocumentmodal-remarks, .mui-routedocumentmodal-handoffInput { width: 100%; border: 1px solid #e4e4e7; border-radius: .5rem; outline: 0; background: #fafafa; color: #18181b; }.mui-routedocumentmodal-select, .mui-routedocumentmodal-additionalSelect, .mui-routedocumentmodal-managedSelect { padding: .5rem; }.mui-routedocumentmodal-additionalSelect { margin-top: .5rem; border-color: #e4e4e7; background: #fff; font-size: .75rem; font-weight: 700; }.mui-routedocumentmodal-select:focus, .mui-routedocumentmodal-additionalSelect:focus, .mui-routedocumentmodal-managedSelect:focus, .mui-routedocumentmodal-remarks:focus { border-color: #71717a; box-shadow: 0 0 0 2px rgb(59 130 246 / .2); }.mui-routedocumentmodal-divisionTags { display: flex; flex-wrap: wrap; gap: .25rem; margin-top: .5rem; }.mui-routedocumentmodal-divisionTag { display: inline-flex; align-items: center; gap: .25rem; padding: .25rem .25rem .25rem .5rem; border-radius: .375rem; background: #f4f4f5; color: #3730a3; font-size: .625rem; font-weight: 700; }.mui-routedocumentmodal-tagRemove { padding: .125rem; border-radius: .25rem; color: inherit; }.mui-routedocumentmodal-tagRemove:hover { background: #e4e4e7; }.mui-routedocumentmodal-tinyIcon { width: .75rem; }
.mui-routedocumentmodal-selectedPanel { padding: .75rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: rgb(239 246 255 / .65); }.mui-routedocumentmodal-panelHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; }.mui-routedocumentmodal-panelTitle, .mui-routedocumentmodal-panelActions { display: flex; align-items: center; gap: .375rem; }.mui-routedocumentmodal-panelTitle { color: #3f3f46; font-weight: 800; }.mui-routedocumentmodal-smallIcon { width: 1rem; }.mui-routedocumentmodal-selectAllButton { padding: .25rem .625rem; border: 1px solid #d4d4d8; border-radius: .5rem; background: #fff; color: #27272a; font-size: .625rem; font-weight: 800; cursor: pointer; }.mui-routedocumentmodal-selectAllButton:hover { background: #f4f4f5; }.mui-routedocumentmodal-recipientCount { padding: .125rem .5rem; border-radius: 999px; background: #3f3f46; color: #fff; font-size: .625rem; font-weight: 900; }.mui-routedocumentmodal-emptyRecipients { margin: 0; color: #71717a; font-size: .6875rem; }.mui-routedocumentmodal-recipientList { display: grid; gap: .5rem; }.mui-routedocumentmodal-recipient { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .5rem .75rem; border: 1px solid #e4e4e7; border-radius: .5rem; background: #fff; }.mui-routedocumentmodal-recipientIdentity { display: flex; min-width: 0; align-items: center; gap: .5rem; }.mui-routedocumentmodal-recipientIcon { flex: none; width: 1rem; color: #3f3f46; }.mui-routedocumentmodal-recipientText { min-width: 0; }.mui-routedocumentmodal-recipientName { margin: 0; overflow: hidden; color: #18181b; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.mui-routedocumentmodal-recipientRole { margin: 0; color: #71717a; font-size: .625rem; }.mui-routedocumentmodal-removeButton, .mui-routedocumentmodal-removeAttachment { padding: .25rem; border-radius: .375rem; color: #f43f5e; }.mui-routedocumentmodal-removeButton:hover, .mui-routedocumentmodal-removeAttachment:hover { background: #fff1f2; }
.mui-routedocumentmodal-completionPanel { padding: .75rem; border: 1px solid #a7f3d0; border-radius: .75rem; background: #ecfdf5; }.mui-routedocumentmodal-completionHeader { margin-bottom: .75rem; }.mui-routedocumentmodal-completionTitle { color: #064e3b; font-weight: 800; }.mui-routedocumentmodal-completionHelp { margin: .25rem 0 0; color: #047857; font-size: .6875rem; line-height: 1.6; }.mui-routedocumentmodal-completionLabel { display: block; margin-bottom: .25rem; }.mui-routedocumentmodal-handoffInput { min-height: 6.5rem; resize: vertical; padding: .75rem; border-color: #6ee7b7; background: #fff; font-size: .875rem; line-height: 1.6; }.mui-routedocumentmodal-handoffInput:focus { border-color: #10b981; box-shadow: 0 0 0 2px rgb(16 185 129 / .2); }.mui-routedocumentmodal-handoffHints { display: flex; flex-wrap: wrap; gap: .25rem 1rem; margin-top: .5rem; color: #047857; font-size: .625rem; font-weight: 500; }.mui-routedocumentmodal-remarks { min-height: 4.5rem; resize: vertical; padding: .625rem; }
.mui-routedocumentmodal-attachmentPicker { display: flex; align-items: center; gap: .75rem; padding: .75rem; border: 1px dashed #d4d4d8; border-radius: .75rem; background: rgb(239 246 255 / .55); cursor: pointer; }.mui-routedocumentmodal-attachmentPicker:hover { background: #fafafa; }.mui-routedocumentmodal-pdfIcon, .mui-routedocumentmodal-paperclipIcon { flex: none; width: 1.25rem; }.mui-routedocumentmodal-pdfIcon { color: #dc2626; }.mui-routedocumentmodal-paperclipIcon { color: #3f3f46; }.mui-routedocumentmodal-attachmentText { min-width: 0; flex: 1; }.mui-routedocumentmodal-attachmentName { display: block; overflow: hidden; color: #27272a; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.mui-routedocumentmodal-attachmentHelp { color: #71717a; font-size: .625rem; }.mui-routedocumentmodal-fileInput { display: none; }.mui-routedocumentmodal-footer { display: flex; justify-content: flex-end; gap: .75rem; padding-top: .75rem; border-top: 1px solid #f4f4f5; }.mui-routedocumentmodal-cancelButton, .mui-routedocumentmodal-submitButton { padding: .5rem 1rem; border: 0; border-radius: .5rem; font-weight: 700; cursor: pointer; }.mui-routedocumentmodal-cancelButton { background: #f4f4f5; color: #3f3f46; }.mui-routedocumentmodal-cancelButton:hover { background: #e4e4e7; }.mui-routedocumentmodal-submitButton { display: flex; align-items: center; gap: .375rem; padding-inline: 1.25rem; background: #3f3f46; color: #fff; }.mui-routedocumentmodal-submitButton:hover { background: #27272a; }.mui-routedocumentmodal-submitButton:disabled { opacity: .6; cursor: wait; }
.dark .mui-routedocumentmodal-dialog { border-color: #27272a; background: #18181b; color: #f4f4f5; }.dark .mui-routedocumentmodal-header { border-color: #27272a; background: rgb(30 41 59 / .8); }.dark .mui-routedocumentmodal-headerIcon { border-color: #3f3f46; background: rgb(23 37 84 / .8); color: #a1a1aa; }.dark .mui-routedocumentmodal-title, .dark .mui-routedocumentmodal-summaryTitle, .dark .mui-routedocumentmodal-recipientName, .dark .mui-routedocumentmodal-attachmentName { color: #fff; }.dark .mui-routedocumentmodal-routeNumber, .dark .mui-routedocumentmodal-location { color: #a1a1aa; }.dark .mui-routedocumentmodal-summary { border-color: #3f3f46; background: rgb(30 41 59 / .5); }.dark .mui-routedocumentmodal-summarySubject, .dark .mui-routedocumentmodal-summaryMeta, .dark .mui-routedocumentmodal-recipientRole { color: #a1a1aa; }.dark .mui-routedocumentmodal-summaryMeta { border-color: #3f3f46; }.dark .mui-routedocumentmodal-label, .dark .mui-routedocumentmodal-fieldLabel, .dark .mui-routedocumentmodal-completionLabel, .dark .mui-routedocumentmodal-attachmentLabel, .dark .mui-routedocumentmodal-recipientLabel { color: #d4d4d8; }
.dark .mui-routedocumentmodal-select, .dark .mui-routedocumentmodal-additionalSelect, .dark .mui-routedocumentmodal-managedSelect, .dark .mui-routedocumentmodal-remarks, .dark .mui-routedocumentmodal-handoffInput { border-color: #3f3f46; background: #27272a; color: #fff; }.dark .mui-routedocumentmodal-divisionTag { background: #1e1b4b; color: #d4d4d8; }.dark .mui-routedocumentmodal-selectedPanel { border-color: #3f3f46; background: rgb(23 37 84 / .3); }.dark .mui-routedocumentmodal-panelTitle { color: #d4d4d8; }.dark .mui-routedocumentmodal-selectAllButton, .dark .mui-routedocumentmodal-recipient { border-color: #3f3f46; background: #27272a; color: #d4d4d8; }.dark .mui-routedocumentmodal-completionPanel { border-color: #065f46; background: rgb(2 44 34 / .3); }.dark .mui-routedocumentmodal-completionTitle { color: #a7f3d0; }.dark .mui-routedocumentmodal-completionHelp, .dark .mui-routedocumentmodal-handoffHints { color: #6ee7b7; }.dark .mui-routedocumentmodal-attachmentPicker { border-color: #3f3f46; background: rgb(23 37 84 / .25); }.dark .mui-routedocumentmodal-footer { border-color: #27272a; }.dark .mui-routedocumentmodal-cancelButton { background: #27272a; color: #d4d4d8; }.dark .mui-routedocumentmodal-cancelButton:hover { background: #3f3f46; }
@media (max-width: 767px) { .mui-routedocumentmodal-backdrop { align-items: flex-start; padding: .5rem; }.mui-routedocumentmodal-dialog { margin: .5rem 0; }.mui-routedocumentmodal-recipientGrid { grid-template-columns: 1fr; }.mui-routedocumentmodal-form { padding: 1rem; }.mui-routedocumentmodal-summaryMeta { align-items: flex-start; flex-direction: column; gap: .25rem; }.mui-routedocumentmodal-footer { flex-direction: column-reverse; }.mui-routedocumentmodal-cancelButton, .mui-routedocumentmodal-submitButton { width: 100%; justify-content: center; } }
.mui-routedocumentmodal-attachmentPicker { cursor: default; }
.mui-routedocumentmodal-attachmentMain { display: flex; min-width: 0; flex: 1; align-items: center; gap: .75rem; cursor: pointer; }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const routeDocumentModalStyles = {
  addDivisionButton: "mui-routedocumentmodal-addDivisionButton",
  additionalSelect: "mui-routedocumentmodal-additionalSelect",
  attachmentHelp: "mui-routedocumentmodal-attachmentHelp",
  attachmentLabel: "mui-routedocumentmodal-attachmentLabel",
  attachmentMain: "mui-routedocumentmodal-attachmentMain",
  attachmentName: "mui-routedocumentmodal-attachmentName",
  attachmentPicker: "mui-routedocumentmodal-attachmentPicker",
  attachmentText: "mui-routedocumentmodal-attachmentText",
  backdrop: "mui-routedocumentmodal-backdrop",
  cancelButton: "mui-routedocumentmodal-cancelButton",
  closeButton: "mui-routedocumentmodal-closeButton",
  completionHeader: "mui-routedocumentmodal-completionHeader",
  completionHelp: "mui-routedocumentmodal-completionHelp",
  completionLabel: "mui-routedocumentmodal-completionLabel",
  completionPanel: "mui-routedocumentmodal-completionPanel",
  completionTitle: "mui-routedocumentmodal-completionTitle",
  currentStatus: "mui-routedocumentmodal-currentStatus",
  dialog: "mui-routedocumentmodal-dialog",
  divisionTag: "mui-routedocumentmodal-divisionTag",
  divisionTags: "mui-routedocumentmodal-divisionTags",
  emptyRecipients: "mui-routedocumentmodal-emptyRecipients",
  fieldLabel: "mui-routedocumentmodal-fieldLabel",
  fileInput: "mui-routedocumentmodal-fileInput",
  footer: "mui-routedocumentmodal-footer",
  form: "mui-routedocumentmodal-form",
  handoffHints: "mui-routedocumentmodal-handoffHints",
  handoffInput: "mui-routedocumentmodal-handoffInput",
  header: "mui-routedocumentmodal-header",
  headerIcon: "mui-routedocumentmodal-headerIcon",
  headerIdentity: "mui-routedocumentmodal-headerIdentity",
  label: "mui-routedocumentmodal-label",
  labelRow: "mui-routedocumentmodal-labelRow",
  location: "mui-routedocumentmodal-location",
  managedSelect: "mui-routedocumentmodal-managedSelect",
  mediumIcon: "mui-routedocumentmodal-mediumIcon",
  panelActions: "mui-routedocumentmodal-panelActions",
  panelHeader: "mui-routedocumentmodal-panelHeader",
  panelTitle: "mui-routedocumentmodal-panelTitle",
  paperclipIcon: "mui-routedocumentmodal-paperclipIcon",
  pdfIcon: "mui-routedocumentmodal-pdfIcon",
  recipient: "mui-routedocumentmodal-recipient",
  recipientCount: "mui-routedocumentmodal-recipientCount",
  recipientGrid: "mui-routedocumentmodal-recipientGrid",
  recipientIcon: "mui-routedocumentmodal-recipientIcon",
  recipientIdentity: "mui-routedocumentmodal-recipientIdentity",
  recipientLabel: "mui-routedocumentmodal-recipientLabel",
  recipientList: "mui-routedocumentmodal-recipientList",
  recipientName: "mui-routedocumentmodal-recipientName",
  recipientRole: "mui-routedocumentmodal-recipientRole",
  recipientText: "mui-routedocumentmodal-recipientText",
  refreshButton: "mui-routedocumentmodal-refreshButton",
  remarks: "mui-routedocumentmodal-remarks",
  removeAttachment: "mui-routedocumentmodal-removeAttachment",
  removeButton: "mui-routedocumentmodal-removeButton",
  routeNumber: "mui-routedocumentmodal-routeNumber",
  select: "mui-routedocumentmodal-select",
  selectAllButton: "mui-routedocumentmodal-selectAllButton",
  selectedPanel: "mui-routedocumentmodal-selectedPanel",
  smallIcon: "mui-routedocumentmodal-smallIcon",
  submitButton: "mui-routedocumentmodal-submitButton",
  summary: "mui-routedocumentmodal-summary",
  summaryMeta: "mui-routedocumentmodal-summaryMeta",
  summarySubject: "mui-routedocumentmodal-summarySubject",
  summaryTitle: "mui-routedocumentmodal-summaryTitle",
  tagRemove: "mui-routedocumentmodal-tagRemove",
  tinyIcon: "mui-routedocumentmodal-tinyIcon",
  title: "mui-routedocumentmodal-title",
} as const;

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createRouteDocumentModalStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const soft = dark ? "#18181b" : "#fafafa";
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    ".mui-routedocumentmodal-dialog": {
      width: 'min(100%, 760px)', maxWidth: '760px !important',
      display: "flex",
      flexDirection: "column",
      maxHeight: "calc(100dvh - 32px)",
      overflow: "hidden",
      borderRadius: "14px !important",
      border: `1px solid ${border}`,
      background: surface,
      boxShadow: "0 24px 70px rgba(24,24,27,.22)",
    },
    ".mui-routedocumentmodal-header": {
      flexShrink: 0,
      padding: "20px 24px",
      background: surface,
      borderBottom: `1px solid ${border}`,
    },
    ".mui-routedocumentmodal-form": {
      minHeight: 0,
      overflowY: "auto",
      scrollbarWidth: "thin",
      background: soft,
      "& select": { textAlign: "left" },
      display: 'grid', gap: '20px !important',
      '& > div:not(.mui-routedocumentmodal-footer)': { minWidth: 0 },
      '& label': { display: 'block', marginBottom: 8, lineHeight: 1.5 },
      '& label, & input, & select, & textarea': { fontSize: '16px !important' },
      '& input, & select': { minHeight: '48px !important' },
      '& button': { minHeight: 44 },
    },
    ".mui-routedocumentmodal-footer": {
      position: "sticky",
      bottom: 0,
      zIndex: 5,
      background: surface,
      borderTop: `1px solid ${border}`,
      paddingBlock: "16px",
      marginTop: 4,
    },
    '[class*="mui-routedocumentmodal-dialog"]': {
      borderRadius: "14px !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".mui-routedocumentmodal-backdrop": { padding: "0 !important" },
      ".mui-routedocumentmodal-dialog": {
        height: "100dvh",
        maxHeight: "100dvh",
        margin: "0 !important",
        borderRadius: "0 !important",
      },
    },
  };
};
const styles = routeDocumentModalStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

const ACTION_OPTIONS = [
  "Appropriate Action",
  "Approval",
  "Return with/without action",
  "Confer with RD",
  "Verify /analyze reports",
  "Please indorse/refer/forward",
  "Furnish Copy",
  "File",
].map((label) => ({ value: label, label }));

const STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "In Progress / Under Review", colorDot: "🔵" },
  {
    value: "FOR_SIGNATURE",
    label: "For Signature / Final Approval",
    colorDot: "🟣",
  },
  { value: "COMPLETED", label: "Completed - My part", colorDot: "🟢" },
  { value: "RETURNED", label: "Returned for Revision", colorDot: "🔴" },
  { value: "ON_HOLD", label: "On Hold / Suspended", colorDot: "🟠" },
  { value: "PENDING", label: "Pending / Received", colorDot: "🟡" },
];

// DATA: Mga props at uri ng data na ginagamit ng component.
interface RouteDocumentModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void | boolean | Promise<void | boolean>;
  currentUser: User;
  users: User[];
}

// LOGIC: State, events, at pagproseso ng data.
export const RouteDocumentModal: React.FC<RouteDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  users,
}) => {
  const allEmployees: EmployeeProfile[] = users
    .filter((user) => user.active && user.role !== "SYSTEM_ADMIN" && user.divisionCode !== "ITMS")
    .map((user) => ({
      id: user.id,
      fullName: user.fullName,
      position: user.designation || user.role,
      office: "BLGF Regional Office II",
      officeType: "BLGF",
      divisionCode: user.divisionCode,
      email: user.email,
      contactNo: user.contactNo,
      address: "",
      active: user.active,
      createdAt: user.createdAt,
    }));
  // Single Route State
  const [toDivision, setToDivision] = useState<DivisionCode | "ALL" | "">("");
  const [additionalDivisions, setAdditionalDivisions] = useState<
    DivisionCode[]
  >([]);
  const [showAddDivision, setShowAddDivision] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [actionRequested, setActionRequested] =
    useState<string>("Appropriate Action");
  const [remarks, setRemarks] = useState<string>("");
  const [newStatus, setNewStatus] = useState<DocumentStatus>("IN_PROGRESS");
  const [handoffInstructions, setHandoffInstructions] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [isUploadingReply, setIsUploadingReply] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [formError, setFormError] = useState('');
  const alreadyRouted = (employee: EmployeeProfile) => Boolean(findPreviousDelivery(document, employee));
  const selectableEmployees = allEmployees.filter(employee => !alreadyRouted(employee));

  const availableDivisions: { code: DivisionCode; name: string }[] = [
    { code: "ORD", name: "ORD - Office of the Regional Director" },
    { code: "AD", name: "AD - Administrative Division" },
    { code: "LAOD", name: "LAOD - Local Assessment Operations Division" },
    { code: "LTOD", name: "LTOD - Local Treasury Operations Division" },
    { code: "FD", name: "FD - Financial Division" },
    { code: "LU", name: "LU - Legal Division / Unit" },
  ];

  useEffect(() => {
    setSelectedUserIds([]);
    setToDivision("");
    setAdditionalDivisions([]);
    setShowAddDivision(false);
    setReplyFile(null);
    setHandoffInstructions("");
    setFormError('');
  }, [document?.id, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || submittingRef.current) return;
    setFormError('');
    if ((document.currentStatus === 'COMPLETED' || hasCompletedPart(document, currentUser))) {
      setFormError('Your part or this transaction has ended. Further routing is not allowed.');
      return;
    }
    const duplicateRecipients = allEmployees.filter(employee => selectedUserIds.includes(employee.id) && alreadyRouted(employee));
    if (duplicateRecipients.length && newStatus !== 'COMPLETED') {
      setFormError(`Already routed to ${duplicateRecipients.map(employee => employee.fullName).join(', ')}. Remove these recipients before sending.`);
      return;
    }
    if (newStatus !== "COMPLETED" && selectedUserIds.length === 0) {
      alert("Select at least one active user account as recipient.");
      return;
    }
    if (newStatus === "COMPLETED" && !handoffInstructions.trim()) {
      alert("Enter the completion and document handoff instructions.");
      return;
    }
    if (!actionRequested) {
      alert("Select an Action Requested before routing.");
      return;
    }
    if (!newStatus) {
      alert("Select a Document Lifecycle Status before routing.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
    const recipients = (newStatus === 'COMPLETED' ? [] : selectedUserIds)
      .map((id) => allEmployees.find((employee) => employee.id === id))
      .filter((employee): employee is EmployeeProfile => Boolean(employee))
      .map((employee) => ({
        toUserId: employee.id,
        toUser: employee.fullName,
        toDivision:
          employee.divisionCode || toDivision || document.currentDivision,
      }));
    const primaryRecipient = recipients[0];

    let replyAttachments = undefined;
    if (replyFile) {
      if (!isReplyAttachment(replyFile)) {
        alert("Use a PDF, JPEG, or PNG reply attachment.");
        return;
      }
      if (replyFile.size > 7 * 1024 * 1024) {
        alert("The reply attachment exceeds the 7 MB attachment limit.");
        return;
      }
      setIsUploadingReply(true);
      try {
        const storedFile = await api.uploadToStorage(
          "documentAttachments",
          replyFile,
        );
        replyAttachments = [
          {
            id: `route-file-${Date.now()}`,
            fileName: replyFile.name,
            fileSize: `${(replyFile.size / (1024 * 1024)).toFixed(2)} MB`,
            fileType: documentFileType(replyFile),
            uploadDate: new Date().toISOString(),
            url: storedFile.url,
            fileData: (storedFile as { fileData?: string }).fileData,
          },
        ];
      } catch (error: any) {
        alert(`Failed to upload reply attachment: ${error.message}`);
        return;
      } finally {
        setIsUploadingReply(false);
      }
    }

    const saved = await onSubmit({
      documentId: document.id,
      routeNo:
        document.routeNo ||
        document.routes?.find((route) => route.routeNo)?.routeNo ||
        "",
      fromDivision: document.currentDivision,
      fromUser: currentUser.fullName,
      toDivision:
        primaryRecipient?.toDivision || toDivision || document.currentDivision,
      toUser: primaryRecipient?.toUser,
      toUserId: primaryRecipient?.toUserId,
      recipients,
      targetDivisions: recipients.map((recipient) => recipient.toDivision),
      actionRequested,
      remarks:
        newStatus === "COMPLETED"
          ? `Handoff Instructions: ${handoffInstructions.trim()}`
          : remarks,
      newStatus,
      actingUserId: currentUser.id,
      actingUserName: currentUser.fullName,
      actingUserRole: currentUser.role,
      replyAttachments,
    });

    if (saved !== false) onClose();
    else setFormError('The document was not routed. Review the error and recipients, then try again.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to route the document. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !document) return null;

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <RouteDocumentModalDesign />
      {
        <ModalLayer onClose={onClose}>
          <div className={styles.backdrop}>
            <div
              className={styles.dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="route-document-title"
            >
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.headerIdentity}>
                  <div className={styles.headerIcon}>
                    <Send className={styles.mediumIcon} />
                  </div>
                  <div>
                    <h2 id="route-document-title" className={styles.title}>
                      Route Document
                    </h2>
                    <p className={styles.routeNumber}>{document.routeNo}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={onClose}
                  className={styles.closeButton}
                >
                  <X className={styles.mediumIcon} />
                </Button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className={styles.form}>
                {formError && <Alert severity="error">{formError}</Alert>}
                {/* DOCUMENT TRACKING: Reference, status, and current office. */}
                <Box component="section" sx={{p:2,border:'1px solid',borderColor:'divider',borderRadius:2,bgcolor:'background.paper'}}>
                  <Typography component="h3" variant="h6">Document Tracking</Typography>
                  {(document.currentStatus === 'COMPLETED' || hasCompletedPart(document, currentUser)) && <Alert severity="info" sx={{ mt: 1 }}>Ended - Your part or this transaction is completed. Further routing is not allowed.</Alert>}
                  <Typography sx={{mt:1,fontFamily:'monospace',fontSize:15,overflowWrap:'anywhere'}}>{document.routeNo || document.trackingNumber}</Typography>
                  <Typography sx={{mt:1,fontSize:15}}>Status: {document.currentStatus.replaceAll('_',' ').toLowerCase()} · Office: {document.currentDivision}</Typography>
                </Box>
                {/* DOCUMENT DETAILS: Full title and content without truncation. */}
                <Box component="section" sx={{p:2,border:'1px solid',borderColor:'divider',borderRadius:2,bgcolor:'background.paper'}}>
                  <Typography component="h3" variant="h6">Document Details</Typography>
                  <Typography sx={{mt:1,fontWeight:650,fontSize:16,overflowWrap:'anywhere'}}>{document.title}</Typography>
                  <Typography sx={{mt:1,fontSize:15,lineHeight:1.7,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{document.subject || 'No document content provided.'}</Typography>
                  <Typography sx={{mt:1,fontSize:14,color:'text.secondary'}}>From: {document.originatingOffice || document.senderName || 'Not provided'}</Typography>
                </Box>
                <Box>
                  <Typography component="h3" variant="h6">Recipients</Typography>
                  <Typography sx={{mt:0.5,fontSize:15,color:'text.secondary'}}>Choose who will receive this document. People marked Already routed cannot be selected again.</Typography>
                </Box>
                {allEmployees.some(alreadyRouted) && <Box sx={{p:2,bgcolor:'action.hover',borderRadius:2}}>
                  <Typography sx={{fontSize:15,fontWeight:650}}>Already routed</Typography>
                  <Typography sx={{fontSize:15,lineHeight:1.7,overflowWrap:'anywhere'}}>{allEmployees.filter(alreadyRouted).map(employee=>employee.fullName).join(', ')}</Typography>
                </Box>}                <div className={styles.recipientGrid}>
                  <div>
                    <div className={styles.labelRow}>
                      <label className={styles.label}>
                        Choose destination division
                      </label>
                      <Button
                        type="button"
                        disabled={!toDivision || toDivision === "ALL"}
                        onClick={() =>
                          setShowAddDivision((current) => !current)
                        }
                        className={styles.addDivisionButton}
                      >
                        + Add Division
                      </Button>
                    </div>
                    <FormSelect
                      value={toDivision}
                      onChange={(e) => {
                        const division = e.target.value as
                          DivisionCode | "ALL" | "";
                        setToDivision(division);
                        setAdditionalDivisions([]);
                        if (!division) {
                          setSelectedUserIds([]);
                          return;
                        }
                        if (division === "ALL") {
                          setAdditionalDivisions(
                            availableDivisions.map((item) => item.code),
                          );
                          setSelectedUserIds(
                            selectableEmployees
                              .filter((employee) => employee.active !== false)
                              .map((employee) => employee.id),
                          );
                          setShowAddDivision(false);
                          return;
                        }
                        setSelectedUserIds(
                          selectableEmployees
                            .filter(
                              (employee) =>
                                employee.active !== false &&
                                employee.divisionCode === division,
                            )
                            .map((employee) => employee.id),
                        );
                      }}
                      className={styles.select}
                    >
                      <option value="">None — Individual Recipient</option>
                      <option value="ALL">ALL — All Divisions</option>
                      {availableDivisions.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </FormSelect>
                    {showAddDivision && (
                      <FormSelect
                        defaultValue=""
                        onChange={(event) => {
                          const division = event.target.value as DivisionCode;
                          if (
                            division &&
                            division !== toDivision &&
                            !additionalDivisions.includes(division)
                          ) {
                            setAdditionalDivisions((current) => [
                              ...current,
                              division,
                            ]);
                            const divisionUserIds = selectableEmployees
                              .filter(
                                (employee) =>
                                  employee.active !== false &&
                                  employee.divisionCode === division,
                              )
                              .map((employee) => employee.id);
                            setSelectedUserIds((current) => [
                              ...new Set([...current, ...divisionUserIds]),
                            ]);
                          }
                          setShowAddDivision(false);
                        }}
                        className={styles.additionalSelect}
                      >
                        <option value="">-- Select another division --</option>
                        {availableDivisions
                          .filter(
                            (division) =>
                              division.code !== toDivision &&
                              !additionalDivisions.includes(division.code),
                          )
                          .map((division) => (
                            <option key={division.code} value={division.code}>
                              {division.name}
                            </option>
                          ))}
                      </FormSelect>
                    )}
                    {additionalDivisions.length > 0 && (
                      <div className={styles.divisionTags}>
                        {additionalDivisions.map((division) => (
                          <span key={division} className={styles.divisionTag}>
                            {division}
                            <Button
                              type="button"
                              onClick={() => {
                                setAdditionalDivisions((current) =>
                                  current.filter((item) => item !== division),
                                );
                                const divisionUserIds = new Set(
                                  selectableEmployees
                                    .filter(
                                      (employee) =>
                                        employee.divisionCode === division,
                                    )
                                    .map((employee) => employee.id),
                                );
                                setSelectedUserIds((current) =>
                                  current.filter(
                                    (id) => !divisionUserIds.has(id),
                                  ),
                                );
                              }}
                              className={styles.tagRemove}
                              aria-label={`Remove ${division} division`}
                            >
                              <X className={styles.tinyIcon} />
                            </Button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={styles.recipientLabel}>
                      <span>Assigned Handler / Recipient *</span>
                      <Button
                        type="button"
                        onClick={() => {
                          // Accounts are sourced directly from User Management.
                        }}
                        className={styles.refreshButton}
                      >
                        <RefreshCw className={styles.tinyIcon} />
                        <span>↻ ({allEmployees.length})</span>
                      </Button>
                    </label>
                    <FormSelect
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const emp = allEmployees.find(
                          (employee: EmployeeProfile) => employee.id === val,
                        );
                        if (emp && !alreadyRouted(emp)) {
                          setSelectedUserIds((previous) =>
                            previous.includes(emp.id)
                              ? previous
                              : [...previous, emp.id],
                          );
                        }
                      }}
                      className={styles.select}
                    >
                      <option value="">-- Add Employee Recipient --</option>
                      {allEmployees.filter(
                        (e) => e.officeType === "BLGF" && e.active !== false,
                      ).length > 0 && (
                        <optgroup label="🏛️ BLGF Personnel">
                          {allEmployees
                            .filter(
                              (e) =>
                                e.officeType === "BLGF" && e.active !== false,
                            )
                            .map((emp) => (
                              <option key={emp.id} value={emp.id} disabled={alreadyRouted(emp) || selectedUserIds.includes(emp.id)}>
                                {emp.fullName} — {emp.position}{alreadyRouted(emp) ? " — Already routed" : selectedUserIds.includes(emp.id) ? " — Selected" : ""}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {allEmployees.filter(
                        (e) =>
                          [
                            "PROVINCIAL_TREASURER",
                            "MUNICIPAL_TREASURER",
                            "LGU",
                          ].includes(e.officeType) && e.active !== false,
                      ).length > 0 && (
                        <optgroup label="🏘️ LGU Staff">
                          {allEmployees
                            .filter(
                              (e) =>
                                [
                                  "PROVINCIAL_TREASURER",
                                  "MUNICIPAL_TREASURER",
                                  "LGU",
                                ].includes(e.officeType) && e.active !== false,
                            )
                            .map((emp) => (
                              <option key={emp.id} value={emp.id} disabled={alreadyRouted(emp) || selectedUserIds.includes(emp.id)}>
                                {emp.fullName} — {emp.position}{alreadyRouted(emp) ? " — Already routed" : selectedUserIds.includes(emp.id) ? " — Selected" : ""}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {allEmployees.filter(
                        (e) =>
                          e.officeType === "OTHER_AGENCIES" &&
                          e.active !== false,
                      ).length > 0 && (
                        <optgroup label="🏢 Other Agencies">
                          {allEmployees
                            .filter(
                              (e) =>
                                e.officeType === "OTHER_AGENCIES" &&
                                e.active !== false,
                            )
                            .map((emp) => (
                              <option key={emp.id} value={emp.id} disabled={alreadyRouted(emp) || selectedUserIds.includes(emp.id)}>
                                {emp.fullName} — {emp.position}{alreadyRouted(emp) ? " — Already routed" : selectedUserIds.includes(emp.id) ? " — Selected" : ""}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </FormSelect>
                  </div>
                </div>

                <div className={styles.selectedPanel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>
                      <UserPlus className={styles.smallIcon} />
                      Selected Recipients
                    </span>
                    <div className={styles.panelActions}>
                      <Button
                        type="button"
                        onClick={() => {
                          setToDivision("");
                          const allActiveUserIds = selectableEmployees
                            .filter((employee) => employee.active !== false)
                            .map((employee) => employee.id);
                          const allSelected =
                            allActiveUserIds.length > 0 &&
                            allActiveUserIds.every((id) =>
                              selectedUserIds.includes(id),
                            );
                          setSelectedUserIds(
                            allSelected ? [] : allActiveUserIds,
                          );
                        }}
                        className={styles.selectAllButton}
                      >
                        {selectableEmployees.length > 0 &&
                        selectableEmployees.every((employee) =>
                          selectedUserIds.includes(employee.id),
                        )
                          ? "Clear All"
                          : "Select All"}
                      </Button>
                      <span className={styles.recipientCount}>
                        {selectedUserIds.length}
                      </span>
                    </div>
                  </div>
                  {selectedUserIds.length === 0 ? (
                    <p className={styles.emptyRecipients}>
                      Add one or more required recipients using the selector
                      above.
                    </p>
                  ) : (
                    <div className={styles.recipientList}>
                      {selectedUserIds.map((id) => {
                        const employee = allEmployees.find(
                          (item) => item.id === id,
                        );
                        if (!employee) return null;
                        return (
                          <div key={id} className={styles.recipient}>
                            <div className={styles.recipientIdentity}>
                              <UserIcon className={styles.recipientIcon} />
                              <div className={styles.recipientText}>
                                <p className={styles.recipientName}>
                                  {employee.fullName}
                                </p>
                                <p className={styles.recipientRole}>
                                  {employee.position} · {employee.divisionCode}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                setToDivision("");
                                setSelectedUserIds((previous) =>
                                  previous.filter((userId) => userId !== id),
                                );
                              }}
                              className={styles.removeButton}
                              aria-label={`Remove ${employee.fullName}`}
                            >
                              <X className={styles.smallIcon} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className={styles.fieldLabel}>
                    Action requested *
                  </label>
                  <ManagedOptionsSelect
                    storageKey="blgf-action-requested-options"
                    options={ACTION_OPTIONS}
                    canManageOptions={
                      currentUser.role === "SYSTEM_ADMIN" ||
                      Boolean(
                        (
                          currentUser.permissions ||
                          DEFAULT_ROLE_PERMISSIONS[currentUser.role]
                        ).allowedActions?.includes("WORKFLOW_OPTION_MANAGE"),
                      )
                    }
                    required
                    value={actionRequested}
                    onChange={setActionRequested}
                    className={styles.managedSelect}
                  />
                </div>

                <div>
                  <label className={styles.fieldLabel}>
                    Update Document Lifecycle Status *
                  </label>
                  <ManagedOptionsSelect
                    storageKey="blgf-lifecycle-status-options"
                    options={STATUS_OPTIONS}
                    colorCoding
                    canManageOptions={
                      currentUser.role === "SYSTEM_ADMIN" ||
                      Boolean(
                        (
                          currentUser.permissions ||
                          DEFAULT_ROLE_PERMISSIONS[currentUser.role]
                        ).allowedActions?.includes("WORKFLOW_OPTION_MANAGE"),
                      )
                    }
                    required
                    value={newStatus}
                    onChange={(next) => setNewStatus(next as DocumentStatus)}
                    className={styles.managedSelect}
                  />
                </div>

                {newStatus === "COMPLETED" && (
                  <div className={styles.completionPanel}>
                    <div className={styles.completionHeader}>
                      <div className={styles.completionTitle}>
                        Completion & Document Handoff
                      </div>
                      <p className={styles.completionHelp}>
                        Give one complete instruction: where the document is,
                        who to approach, and what the recipient must do next.
                      </p>
                    </div>
                    <label className={styles.attachmentLabel}>
                      Completion & Handoff Instructions *
                    </label>
                    <FormTextarea
                      required
                      rows={4}
                      minLength={10}
                      value={handoffInstructions}
                      onChange={(event) =>
                        setHandoffInstructions(event.target.value)
                      }
                      placeholder="Example: Claim the signed document at the Records Unit, BLGF Regional Office II. Look for Juan Dela Cruz, present a valid ID, and sign the receiving logbook before release."
                      className={styles.handoffInput}
                    />

                    <div className={styles.handoffHints}>
                      <span>Include: pickup location</span>
                      <span>Contact person or office</span>
                      <span>Required next step</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className={styles.attachmentLabel}>
                    Reply Attachment (PDF, JPEG, or PNG)
                  </label>
                  <div className={styles.attachmentPicker}>
                    <label className={styles.attachmentMain}>
                      {replyFile ? (
                        <FileText className={styles.pdfIcon} />
                      ) : (
                        <Paperclip className={styles.paperclipIcon} />
                      )}
                      <span className={styles.attachmentText}>
                        <span className={styles.attachmentName}>
                          {replyFile?.name || "Attach reply file"}
                        </span>
                        <span className={styles.attachmentHelp}>
                          Optional, maximum 7 MB
                        </span>
                      </span>
                      <FormInput
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                        className={styles.fileInput}
                        onChange={(event) =>
                          setReplyFile(event.target.files?.[0] || null)
                        }
                      />
                    </label>
                    {replyFile && (
                      <Button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setReplyFile(null);
                        }}
                        className={styles.removeAttachment}
                        aria-label="Remove reply attachment"
                      >
                        <X className={styles.smallIcon} />
                      </Button>
                    )}
                  </div>
                </div>

                {newStatus !== "COMPLETED" && (
                  <div>
                    <label className={styles.fieldLabel}>
                      Routing Remarks & Comments
                    </label>
                    <FormTextarea
                      rows={2}
                      placeholder="Enter specific notes or instructions..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className={styles.remarks}
                    />
                  </div>
                )}

                {/* REVIEW: Read the transaction details before submitting. */}
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default', display: 'grid', gap: 0.75 }}>
                  <Typography sx={{ fontWeight: 650 }}>Review before sending</Typography>
                  <Typography variant="body2">Document: {document.routeNo || document.trackingNumber}</Typography>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{newStatus === 'COMPLETED' ? 'Outcome: Complete your part. Other recipients can continue until their parts are completed.' : `Send to: ${selectedUserIds.map(id => allEmployees.find(employee => employee.id === id)?.fullName || 'Unknown recipient').join(', ') || 'No recipients selected'}`}</Typography>
                  <Typography variant="body2">Requested action: {actionRequested || 'Choose an action above'}</Typography>
                  <Typography variant="body2">Status after saving: {newStatus ? newStatus.replaceAll('_', ' ').toLowerCase() : 'Choose a status above'}</Typography>
                  <Typography variant="caption" color="text.secondary">After a successful save, reopen Document Routing &amp; Audit History to follow this transaction.</Typography>
                </Box>

                {/* Footer Buttons */}
                <div className={styles.footer}>
                  <Button
                    type="button"
                    onClick={onClose}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={(document.currentStatus === 'COMPLETED' || hasCompletedPart(document, currentUser)) || isSubmitting || isUploadingReply || (newStatus !== 'COMPLETED' && selectedUserIds.length === 0)}
                    className={styles.submitButton}
                  >
                    <Send className={styles.smallIcon} />
                    <span>
                      {isSubmitting && !isUploadingReply ? 'Saving, please wait...' : isUploadingReply
                        ? "Uploading Reply..."
                        : newStatus === "COMPLETED"
                          ? "Complete My Part"
                          : `Route to ${selectedUserIds.length} ${
                              selectedUserIds.length === 1
                                ? "Recipient"
                                : "Recipients"
                            }`}
                    </span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ModalLayer>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function RouteDocumentModalDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[routeDocumentModalCss, createRouteDocumentModalStyles(theme)]}
    />
  );
}
