import { documentFileType } from "../../utils/documentFiles";
// CreateDocumentModal: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { ModalLayer } from "../ui/ModalLayer";
import { FormInput, FormSelect, FormTextarea } from "../ui/FormControls";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  X,
  FilePlus,
  Send,
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Users,
  UserPlus,
} from "lucide-react";
import {
  DocumentDirection,
  PriorityLevel,
  DivisionCode,
  User,
  DocumentAttachment,
  DocumentRecord,
  DEFAULT_ROLE_PERMISSIONS,
} from "../../types";
import { api } from "../../services/api";
import { showConfirm, showPrompt } from "../../services/dialogService";
import { AutocompleteField } from "../AutocompleteField";
import { ManagedOptionsSelect } from "../ManagedOptionsSelect";
import { cx } from "../../styles/muiClasses";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// LAYOUT: Header, fields, recipients, at action buttons.
const createDocumentModalClasses = {
  mediumIcon: cx("h-5 w-5"),
  section: cx(
    "rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900",
  ),
  sectionLabel: cx("block text-slate-700 font-bold mb-2"),
  twoColumnGrid: cx("grid grid-cols-1 gap-3 sm:grid-cols-2"),
  fieldLabel: cx("block font-bold text-slate-700 mb-1"),
  routeNumber: cx(
    "rounded-lg border border-slate-200 bg-slate-100 p-2.5 font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  ),
  helperText: cx("mt-1 text-[10px] text-slate-500"),
  fieldGrid: cx("grid grid-cols-1 gap-4"),
  titleField: cx("order-2"),
  titleInput: cx(
    "min-h-20 w-full resize-y bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white",
  ),
  categoryField: cx("relative order-1"),
  categoryLabel: cx("mb-1 block font-bold text-slate-700 dark:text-slate-300"),
  categorySelect: cx(
    "w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white",
  ),
  categoryMenu: cx(
    "absolute z-20 mt-1 right-0 w-72 bg-white border rounded-xl shadow-xl p-2 space-y-1 text-xs",
  ),
  compactRow: cx("flex gap-1"),
  categoryInput: cx("min-w-0 flex-1 border rounded px-2 py-1"),
  categoryAddButton: cx("px-2 bg-blue-600 text-white rounded"),
  categoryOption: cx("flex justify-between items-center py-1"),
  truncate: cx("truncate"),
  editButton: cx("text-slate-600"),
  deleteButton: cx("text-rose-600"),
  categoryDoneButton: cx("w-full pt-1 text-slate-500"),
  hiddenCategoryRow: cx("hidden mt-1 flex gap-1"),
  compactCategoryInput: cx(
    "min-w-0 flex-1 border rounded px-2 py-1 text-[10px]",
  ),
  compactCategoryAddButton: cx(
    "px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold",
  ),
  hiddenCategoryTags: cx("hidden mt-1 flex flex-wrap gap-1"),
  categoryTag: cx(
    "text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-100 text-slate-500",
  ),
  input: cx(
    "w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white",
  ),
  recipientSection: cx(
    "rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900",
  ),
  sectionTitle: cx(
    "font-extrabold text-xs text-slate-800 dark:text-slate-200 mb-3",
  ),
  recipientGrid: cx("grid grid-cols-1 sm:grid-cols-2 gap-3"),
  recipientLabel: cx("block font-bold text-slate-700 dark:text-slate-300 mb-1"),
  recipientInput: cx(
    "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs",
  ),
  fullWidth: cx("sm:col-span-2"),
  routingSection: cx(
    "space-y-3 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900",
  ),
  routingTitle: cx(
    "flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200",
  ),
  routingIcon: cx("h-4 w-4 text-slate-500"),
  divisionHeading: cx("mb-1 flex items-center justify-between"),
  compactLabel: cx(
    "block text-[10px] font-bold text-slate-600 dark:text-slate-300",
  ),
  addDivisionButton: cx(
    "text-[10px] font-bold text-slate-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400",
  ),
  additionalDivisionSelect: cx(
    "mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900",
  ),
  divisionSelect: cx(
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800",
  ),
  tags: cx("mt-2 flex flex-wrap gap-1.5"),
  divisionTag: cx(
    "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 py-1 pl-2 pr-1 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  ),
  removeDivisionButton: cx(
    "rounded p-0.5 hover:bg-slate-200 dark:hover:bg-indigo-900",
  ),
  tinyIcon: cx("h-3 w-3"),
  recipientRow: cx("flex gap-2"),
  recipientSelect: cx(
    "min-w-0 flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold",
  ),
  addRecipientButton: cx(
    "inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40",
  ),
  smallIcon: cx("h-4 w-4"),
  recipientTags: cx("flex flex-wrap gap-1.5"),
  removeRecipientButton: cx(
    "rounded p-0.5 hover:bg-slate-200 dark:hover:bg-blue-900",
  ),
  recipientHint: cx(
    "text-[10px] text-slate-700 dark:text-slate-300 font-medium",
  ),
  selectedPanel: cx(
    "rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800",
  ),
  selectedHeading: cx("mb-2 flex items-center justify-between"),
  selectedTitle: cx(
    "text-[10px] font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300",
  ),
  countBadge: cx(
    "rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black text-white",
  ),
  selectedRecipientTag: cx(
    "inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 py-1 pl-2 pr-1 text-[10px] font-bold text-slate-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-slate-200",
  ),
  removeSelectedButton: cx(
    "rounded p-0.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950",
  ),
  warningText: cx("text-[10px] text-amber-700 dark:text-amber-400"),
  routingSummary: cx(
    "bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5",
  ),
  summaryRow: cx("flex items-center justify-between"),
  summaryHighlight: cx("font-bold text-slate-700 dark:text-slate-300"),
  flexibleSelect: cx(
    "min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white",
  ),
  flexibleInput: cx(
    "min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500",
  ),
  compactInput: cx(
    "w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white",
  ),
  hidden: cx("hidden"),
  attachmentIcon: cx("text-slate-500 shrink-0"),
  remarks: cx(
    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900",
  ),
};

const styles = createDocumentModalClasses;

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

const PRIORITY_OPTIONS = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "VERY_URGENT", label: "Very Urgent!" },
  { value: "CONFIDENTIAL", label: "Confidential" },
];

const DEFAULT_DOCUMENT_CATEGORIES = [
  "Treasury Circular",
  "Real Property Tax Assessment",
  "Financial Report",
  "Legal Opinion",
  "Personnel Memo",
  "General Correspondence",
];

const loadDocumentCategories = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem("blgf_document_categories") || "null",
    );
    if (!Array.isArray(parsed)) return DEFAULT_DOCUMENT_CATEGORIES;

    const categories = parsed
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (!item || typeof item !== "object") return "";
        const option = item as { label?: unknown; value?: unknown };
        if (typeof option.label === "string") return option.label.trim();
        return typeof option.value === "string" ? option.value.trim() : "";
      })
      .filter((item, index, all) => item && all.indexOf(item) === index);
    return categories.length ? categories : DEFAULT_DOCUMENT_CATEGORIES;
  } catch {
    return DEFAULT_DOCUMENT_CATEGORIES;
  }
};

// DATA: Mga props at uri ng data na ginagamit ng component.
interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  currentUser: User;
  existingRouteNumbers: string[];
  existingDocuments: DocumentRecord[];
  initialDirection?: DocumentDirection;
}

// LOGIC: State, events, at pagproseso ng data.
export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  existingRouteNumbers,
  existingDocuments,
  initialDirection = "INCOMING",
}) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  const [direction, setDirection] =
    useState<DocumentDirection>(initialDirection);
  const [title, setTitle] = useState("");
  const directionCode = direction === "INCOMING" ? "IN" : "OUT";
  const routePrefix = `BLGFR2-${year}-${month}-${directionCode}-`;
  const nextRouteSequence =
    existingRouteNumbers.reduce((highest, existingRouteNo) => {
      if (!existingRouteNo.startsWith(routePrefix)) return highest;
      const sequence = Number(existingRouteNo.slice(routePrefix.length));
      return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
    }, 0) + 1;
  const formattedRouteNo = `${routePrefix}${String(nextRouteSequence).padStart(2, "0")}`;
  const [serverRouteNo, setServerRouteNo] = useState("");
  const displayedRouteNo = serverRouteNo || formattedRouteNo;
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Treasury Circular");
  const [categories, setCategories] = useState<string[]>(
    loadDocumentCategories,
  );
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderPosition, setSenderPosition] = useState("");
  const [originatingOffice, setOriginatingOffice] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>(
    [],
  );
  const [recipientPosition, setRecipientPosition] = useState("");
  const [recipientOffice, setRecipientOffice] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("ROUTINE");
  const [currentDivision, setCurrentDivision] = useState<
    DivisionCode | "ALL" | ""
  >("");
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  );
  const [remarks, setRemarks] = useState("");
  const [initialAction, setInitialAction] = useState("Appropriate Action");
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [allEmployees, setAllEmployees] = useState<User[]>([]);
  const [excludedRecipientIds, setExcludedRecipientIds] = useState<string[]>(
    [],
  );
  const [additionalDivisions, setAdditionalDivisions] = useState<
    DivisionCode[]
  >([]);
  const [showAddDivision, setShowAddDivision] = useState(false);
  const directory = {
    titles: existingDocuments.map((document) => document.title),
    subjects: existingDocuments.map((document) => document.subject),
    senderNames: existingDocuments.map((document) => document.senderName),
    senderPositions: existingDocuments.map(
      (document) => document.senderPosition || "",
    ),
    originatingOffices: existingDocuments.map(
      (document) => document.originatingOffice,
    ),
    senderAddresses: existingDocuments.map(
      (document) => document.senderAddress || "",
    ),
    remarks: existingDocuments.map((document) => document.remarks || ""),
  };

  useEffect(() => {
    if (isOpen) {
      setDirection(initialDirection);
      setRecipientName("");
      setRecipientUserId("");
      setSelectedRecipientIds([]);
      setRecipientPosition("");
      setRecipientOffice("");
      setRecipientAddress("");
      setCurrentDivision("");
      setExcludedRecipientIds([]);
      setAdditionalDivisions([]);
      setInitialAction("Appropriate Action");
      api
        .getUsers()
        .then((users) =>
          setAllEmployees(
            users.filter((user) => user.active && user.role !== "SYSTEM_ADMIN"),
          ),
        )
        .catch(() => {});
    }
  }, [isOpen, initialDirection]);

  useEffect(() => {
    if (!isOpen) return;
    setServerRouteNo("");
    api
      .getNextRouteNumber(direction)
      .then(({ routeNo: nextRouteNo }) => setServerRouteNo(nextRouteNo))
      .catch(() => setServerRouteNo(formattedRouteNo));
  }, [isOpen, direction, formattedRouteNo]);

  if (!isOpen) return null;

  const holdingDivisionRecipients =
    !recipientUserId && selectedRecipientIds.length === 0 && currentDivision
      ? allEmployees.filter(
          (user) =>
            user.active &&
            (currentDivision === "ALL" ||
              user.divisionCode === currentDivision ||
              additionalDivisions.includes(user.divisionCode)) &&
            !excludedRecipientIds.includes(user.id),
        )
      : [];
  const selectedDivisionCodes: Array<DivisionCode | "ALL"> =
    currentDivision === "ALL"
      ? ["ALL"]
      : ([currentDivision, ...additionalDivisions].filter(
          Boolean,
        ) as DivisionCode[]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAtts: DocumentAttachment[] = [];
    for (const f of Array.from(files) as File[]) {
      const storedFile = await api.uploadToStorage("documentAttachments", f);
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
      newAtts.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fileName: f.name,
        fileSize: `${sizeMb} MB`,
        fileType: documentFileType(f),
        uploadDate: new Date().toISOString(),
        url: storedFile.url,
      });
    }

    setAttachments((prev) => [...prev, ...newAtts]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };
  const saveCategories = (next: string[]) => {
    setCategories(next);
    localStorage.setItem("blgf_document_categories", JSON.stringify(next));
  };

  const handleSubmit = (
    e: React.FormEvent,
    actionType: "none" | "route" = "none",
  ) => {
    e.preventDefault();
    const missingFields = [
      !title.trim() && "Document Title",
      !category.trim() && "Category / Type",
      !subject.trim() && "Subject Matter / Particulars",
      !senderName.trim() && "Letter From / Sender",
      !originatingOffice.trim() && "Originating Office",
      !senderAddress.trim() && "Office Address",
      !currentDivision &&
        !recipientUserId &&
        selectedRecipientIds.length === 0 &&
        "Division Assignment or Assigned Personnel",
      !recipientUserId &&
        selectedRecipientIds.length === 0 &&
        holdingDivisionRecipients.length === 0 &&
        "Assigned Handler / Recipient",
      !initialAction && "Action Requested",
      !priority && "Priority Level",
      !targetCompletionDate && "Target Completion Date",
    ].filter(Boolean);
    if (missingFields.length > 0) {
      alert(
        `Please complete all required fields before proceeding:\n\n${missingFields
          .map((field) => `• ${field}`)
          .join("\n")}`,
      );
      return;
    }
    onSubmit({
      direction,
      // New servers assign the definitive number. Sending the preview keeps
      // document creation compatible with older deployed API versions.
      routeNo: displayedRouteNo,
      title,
      subject,
      category,
      originatingOffice: originatingOffice || "BLGF Regional Office II",
      destinationOffice: recipientOffice || "BLGF Regional Office II",
      senderName,
      senderPosition,
      senderAddress,
      recipientName,
      assignedUser: recipientName,
      assignedUserId:
        selectedRecipientIds.length === 0 ? recipientUserId : undefined,
      recipientPosition,
      recipientOffice,
      recipientAddress,
      priority,
      currentDivision:
        currentDivision === "ALL" ? currentUser.divisionCode : currentDivision,
      routeAllDivisions: currentDivision === "ALL",
      routeMultipleDivisions:
        additionalDivisions.length > 0 || selectedRecipientIds.length > 1,
      initialTargetDivisions:
        currentDivision === "ALL"
          ? []
          : [currentDivision, ...additionalDivisions].filter(Boolean),
      initialRecipientIds: [
        ...new Set([
          ...selectedRecipientIds,
          ...holdingDivisionRecipients.map((user) => user.id),
        ]),
      ],

      targetCompletionDate: new Date(targetCompletionDate).toISOString(),
      initialAction,
      remarks,
      attachments,
      createdBy: currentUser.fullName,
      userId: currentUser.id,
      userRole: currentUser.role,
      shouldPrintSlip: false,
      shouldRouteModal:
        actionType === "route" && !recipientUserId && !currentDivision,
      shouldOpenEnvelope: false,
      excludedRecipientIds,
    });

    onClose();
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      {
        <ModalLayer onClose={onClose}>
          <Box
            component="div"
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 2,
              overflowY: "auto",
              backgroundColor: "rgba(24,24,27, 0.6)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Box
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-document-title"
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                maxWidth: "900px",
                maxHeight: "calc(100dvh - 32px)",
                margin: "0",
                overflow: "hidden",
                border: "1px solid #e4e4e7",
                borderRadius: "12px",
                backgroundColor: "background.paper",
                color: "text.primary",
                boxShadow: "0 20px 48px rgba(24,24,27, 0.14)",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1.5,
                  padding: "16px 20px",
                  borderBottom: "1px solid #e4e4e7",
                }}
              >
                <Box sx={{ display: "flex", minWidth: 0, gap: 1.5 }}>
                  <Box sx={{ marginTop: "2px", color: "text.secondary" }}>
                    <FilePlus className={styles.mediumIcon} />
                  </Box>
                  <div>
                    <h2
                      id="create-document-title"
                      style={{ margin: 0, fontSize: "20px", fontWeight: 650 }}
                    >
                      New document
                    </h2>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "12px",
                        color: "#71717a",
                      }}
                    >
                      Bureau of Local Government Finance Regional Office II
                    </p>
                  </div>
                </Box>
                <Tooltip title="Close form">
                  <IconButton
                    type="button"
                    onClick={onClose}
                    aria-label="Close new document form"
                    sx={{
                      padding: "6px",
                      color: "#a1a1aa",
                      borderRadius: "8px",
                    }}
                  >
                    <X style={{ width: "20px", height: "20px" }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Form Body */}
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minHeight: 0,
                  flex: "1 1 auto",
                  overflowY: "auto",
                  padding: { xs: "16px 16px 0", sm: "24px 24px 0" },
                  backgroundColor: "background.default",
                  fontSize: 15,
                  "& input, & select, & textarea": {
                    fontSize: "16px !important",
                  },
                  "& > *": { flexShrink: 0 },
                  "& label": {
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: 600,
                    color: "text.primary",
                  },
                  "& textarea": { minHeight: 80 },
                }}
              >
                {/* Direction Switcher */}
                <Box
                  sx={{
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    color: "text.secondary",
                    lineHeight: 1.6,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 650, color: "text.primary" }}
                  >
                    Document information → Recipients → Save
                  </Typography>
                  <Typography variant="caption">
                    Complete the required fields (*). Register Only saves the
                    record; Register &amp; Route also starts the handoff to your
                    selected recipients.
                  </Typography>
                </Box>
                <div className={styles.section}>
                  <label className={styles.sectionLabel}>
                    Transaction Direction
                  </label>
                  <div className={styles.twoColumnGrid}>
                    <Button
                      type="button"
                      variant={
                        direction === "INCOMING" ? "contained" : "outlined"
                      }
                      onClick={() => setDirection("INCOMING")}
                      sx={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        border: "1px solid",
                        transition: "all 150ms ease",
                        ...(direction === "INCOMING"
                          ? {
                              backgroundColor: "#3f3f46",
                              color: "white",
                              borderColor: "#3f3f46",
                              boxShadow: "0 1px 2px rgba(24,24,27, 0.08)",
                            }
                          : {
                              backgroundColor: "background.paper",
                              color: "text.primary",
                              borderColor: "#e4e4e7",
                              "&:hover": { color: "text.primary" },
                            }),
                      }}
                    >
                      <span>INCOMING DOCUMENT</span>
                    </Button>
                    <Button
                      type="button"
                      variant={
                        direction === "OUTGOING" ? "contained" : "outlined"
                      }
                      color="secondary"
                      onClick={() => setDirection("OUTGOING")}
                      sx={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        border: "1px solid",
                        transition: "all 150ms ease",
                        ...(direction === "OUTGOING"
                          ? {
                              backgroundColor: "#52525b",
                              color: "white",
                              borderColor: "#52525b",
                              boxShadow: "0 1px 2px rgba(24,24,27, 0.08)",
                            }
                          : {
                              backgroundColor: "background.paper",
                              color: "text.primary",
                              borderColor: "#e4e4e7",
                              "&:hover": { color: "text.primary" },
                            }),
                      }}
                    >
                      <span>OUTGOING DOCUMENT</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <label className={styles.fieldLabel}>
                    Document Tracking No. (Automatic)
                  </label>
                  <div className={styles.routeNumber}>{displayedRouteNo}</div>
                  <p className={styles.helperText}>
                    Generated automatically when the document is saved. The
                    final number may advance if another document is registered
                    first.
                  </p>
                </div>

                {/* Title & Category */}
                <Typography component="h3" variant="h6">
                  Document Details
                </Typography>
                <div className={styles.fieldGrid}>
                  <div className={styles.titleField}>
                    <label className={styles.fieldLabel}>
                      Document title *
                    </label>
                    <AutocompleteField
                      required
                      multiline
                      rows={2}
                      placeholder="e.g. Q2 Real Property Tax Assessment Summary"
                      value={title}
                      onChange={setTitle}
                      suggestions={directory.titles}
                      ariaLabel="Document Title"
                      className={styles.titleInput}
                    />
                  </div>
                  <div className={styles.categoryField}>
                    <label className={styles.categoryLabel}>
                      Category / Type *
                    </label>
                    <ManagedOptionsSelect
                      storageKey="blgf_document_categories"
                      options={categories.map((c) => ({ value: c, label: c }))}
                      canManageOptions={currentUser.role === "SYSTEM_ADMIN"}
                      required
                      value={category}
                      onChange={setCategory}
                      textAlign="left"
                      className={styles.categorySelect}
                    />

                    {showCategoryManager && (
                      <div className={styles.categoryMenu}>
                        <div className={styles.compactRow}>
                          <FormInput
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="New category"
                            className={styles.categoryInput}
                          />

                          <Button
                            type="button"
                            onClick={() => {
                              const item = newCategory.trim();
                              if (item && !categories.includes(item)) {
                                saveCategories([...categories, item]);
                                setCategory(item);
                                setNewCategory("");
                              }
                            }}
                            className={styles.categoryAddButton}
                          >
                            Add
                          </Button>
                        </div>
                        {categories.map((item) => (
                          <div key={item} className={styles.categoryOption}>
                            <span className={styles.truncate}>{item}</span>
                            <span className={styles.compactRow}>
                              <Button
                                type="button"
                                onClick={async () => {
                                  const next = (
                                    await showPrompt("Edit category:", item)
                                  )?.trim();
                                  if (next && !categories.includes(next)) {
                                    saveCategories(
                                      categories.map((value) =>
                                        value === item ? next : value,
                                      ),
                                    );
                                    if (category === item) setCategory(next);
                                  }
                                }}
                                className={styles.editButton}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                onClick={async () => {
                                  if (
                                    await showConfirm(
                                      `Delete category "${item}"?`,
                                    )
                                  ) {
                                    const next = categories.filter(
                                      (value) => value !== item,
                                    );
                                    saveCategories(next);
                                    if (category === item) setCategory(next[0]);
                                  }
                                }}
                                className={styles.deleteButton}
                              >
                                Delete
                              </Button>
                            </span>
                          </div>
                        ))}
                        <Button
                          type="button"
                          onClick={() => setShowCategoryManager(false)}
                          className={styles.categoryDoneButton}
                        >
                          Close
                        </Button>
                      </div>
                    )}
                    <div className={styles.hiddenCategoryRow}>
                      <FormInput
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New type"
                        className={styles.compactCategoryInput}
                      />

                      <Button
                        type="button"
                        onClick={() => {
                          const item = newCategory.trim();
                          if (item && !categories.includes(item)) {
                            saveCategories([...categories, item]);
                            setCategory(item);
                            setNewCategory("");
                          }
                        }}
                        className={styles.compactCategoryAddButton}
                      >
                        Add
                      </Button>
                    </div>
                    <div className={styles.hiddenCategoryTags}>
                      {categories.map((item) => (
                        <Button
                          key={item}
                          type="button"
                          onClick={async () => {
                            if (
                              categories.length > 1 &&
                              (await showConfirm(`Delete category "${item}"?`))
                            ) {
                              const next = categories.filter(
                                (value) => value !== item,
                              );
                              saveCategories(next);
                              if (category === item) setCategory(next[0]);
                            }
                          }}
                          className={styles.categoryTag}
                        >
                          × {item}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subject / Summary */}
                <div>
                  <label className={styles.fieldLabel}>
                    Subject Matter / Particulars *
                  </label>
                  <AutocompleteField
                    required
                    multiline
                    rows={2}
                    placeholder="Brief summary of document content, action requested, or background..."
                    value={subject}
                    onChange={setSubject}
                    suggestions={directory.subjects}
                    ariaLabel="Subject Matter or Particulars"
                    className={styles.input}
                  />
                </div>

                <div className={styles.recipientSection}>
                  <div className={styles.sectionTitle}>
                    Letter Origin / Sending Office
                  </div>
                  <div className={styles.recipientGrid}>
                    <div>
                      <label className={styles.recipientLabel}>
                        Letter From / Sender *
                      </label>
                      <AutocompleteField
                        required
                        value={senderName}
                        onChange={setSenderName}
                        suggestions={directory.senderNames}
                        ariaLabel="Letter From or Sender"
                        placeholder="Name of sender or signatory"
                        className={styles.recipientInput}
                      />
                    </div>
                    <div>
                      <label className={styles.recipientLabel}>
                        Originating Office *
                      </label>
                      <AutocompleteField
                        required
                        value={originatingOffice}
                        onChange={setOriginatingOffice}
                        suggestions={directory.originatingOffices}
                        ariaLabel="Originating Office"
                        placeholder="e.g. Provincial Treasury Office"
                        className={styles.recipientInput}
                      />
                    </div>
                    <div>
                      <label className={styles.recipientLabel}>Position</label>
                      <AutocompleteField
                        value={senderPosition}
                        onChange={setSenderPosition}
                        suggestions={directory.senderPositions}
                        ariaLabel="Sender Position"
                        placeholder="e.g. Provincial Treasurer"
                        className={styles.recipientInput}
                      />
                    </div>
                    <div className={styles.fullWidth}>
                      <label className={styles.recipientLabel}>
                        Office Address *
                      </label>
                      <AutocompleteField
                        required
                        value={senderAddress}
                        onChange={setSenderAddress}
                        suggestions={directory.senderAddresses}
                        ariaLabel="Office Address"
                        placeholder="Complete office or mailing address"
                        className={styles.recipientInput}
                      />
                    </div>
                  </div>
                </div>

                {/* Route recipient: active User Management accounts */}
                <div className={styles.routingSection}>
                  <label className={styles.routingTitle}>
                    <Users className={styles.routingIcon} />
                    <span>Initial Division / Recipient Assignment</span>
                  </label>
                  <div>
                    <div className={styles.divisionHeading}>
                      <label className={styles.compactLabel}>
                        Division Assignment *
                      </label>
                      <Button
                        type="button"
                        onClick={() =>
                          setShowAddDivision((current) => !current)
                        }
                        disabled={!currentDivision || currentDivision === "ALL"}
                        className={styles.addDivisionButton}
                        title={
                          currentDivision
                            ? "Route to another division"
                            : "Select the first division before adding another"
                        }
                      >
                        + Add Division
                      </Button>
                    </div>
                    {showAddDivision && (
                      <FormSelect
                        defaultValue=""
                        onChange={(event) => {
                          const division = event.target.value as DivisionCode;
                          if (
                            division &&
                            division !== currentDivision &&
                            !additionalDivisions.includes(division)
                          ) {
                            setAdditionalDivisions((current) => [
                              ...current,
                              division,
                            ]);
                            setExcludedRecipientIds([]);
                          }
                          setShowAddDivision(false);
                        }}
                        className={styles.additionalDivisionSelect}
                      >
                        <option value="">
                          -- Select another division to route --
                        </option>
                        {[
                          ["ORD", "Office of the Regional Director"],
                          ["AD", "Administrative Division"],
                          ["LAOD", "Local Assessment Operations Division"],
                          ["LTOD", "Local Treasury Operations Division"],
                          ["FD", "Financial Division"],
                          ["LU", "Legal Division / Unit"],
                        ]
                          .filter(
                            ([code]) =>
                              code !== currentDivision &&
                              !additionalDivisions.includes(
                                code as DivisionCode,
                              ),
                          )
                          .map(([code, name]) => (
                            <option key={code} value={code}>
                              {name} ({code})
                            </option>
                          ))}
                      </FormSelect>
                    )}
                    <FormSelect
                      value={
                        recipientUserId || selectedRecipientIds.length > 0
                          ? ""
                          : currentDivision
                      }
                      onChange={(event) => {
                        const division = event.target.value as
                          | DivisionCode
                          | "ALL"
                          | "";
                        setCurrentDivision(division);
                        setAdditionalDivisions((current) =>
                          division === "ALL" || !division
                            ? []
                            : current.filter((item) => item !== division),
                        );
                        setExcludedRecipientIds([]);
                        if (division) {
                          setSelectedRecipientIds([]);
                          setRecipientName("");
                          setRecipientUserId("");
                          setRecipientPosition("");
                          setRecipientOffice("");
                          setRecipientAddress("");
                        }
                      }}
                      className={styles.divisionSelect}
                    >
                      <option value="">None — Individual Recipient</option>
                      <option value="ALL">All Divisions</option>
                      <option value="ORD">
                        Office of the Regional Director (ORD)
                      </option>
                      <option value="AD">Administrative Division (AD)</option>
                      <option value="LAOD">
                        Local Assessment Operations Division (LAOD)
                      </option>
                      <option value="LTOD">
                        Local Treasury Operations Division (LTOD)
                      </option>
                      <option value="FD">Financial Division (FD)</option>
                      <option value="LU">Legal Division / Unit (LU)</option>
                    </FormSelect>
                    {currentDivision && (
                      <div className={styles.tags}>
                        {selectedDivisionCodes.map((division, index) => (
                          <span key={division} className={styles.divisionTag}>
                            {division}
                            <Button
                              type="button"
                              onClick={() => {
                                if (currentDivision === "ALL") {
                                  setCurrentDivision("");
                                  setAdditionalDivisions([]);
                                } else if (index === 0) {
                                  const [nextPrimary, ...remaining] =
                                    additionalDivisions;
                                  setCurrentDivision(nextPrimary || "");
                                  setAdditionalDivisions(remaining);
                                } else {
                                  setAdditionalDivisions((current) =>
                                    current.filter((item) => item !== division),
                                  );
                                }
                                setExcludedRecipientIds([]);
                              }}
                              className={styles.removeDivisionButton}
                              aria-label={`Remove ${division} division`}
                            >
                              <X className={styles.tinyIcon} />
                            </Button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className={styles.compactLabel}>
                    Assigned Handler / Individual Recipient *
                  </label>
                  <div className={styles.recipientRow}>
                    <FormSelect
                      value={recipientUserId}
                      onChange={(e) => {
                        const account = allEmployees.find(
                          (user) => user.id === e.target.value,
                        );
                        if (!account) {
                          setRecipientName("");
                          setRecipientUserId("");
                          setRecipientPosition("");
                          setRecipientOffice("");
                          setRecipientAddress("");
                          setCurrentDivision("");
                          return;
                        }
                        setRecipientName(account.fullName);
                        setRecipientUserId(account.id);
                        setRecipientPosition(
                          account.designation || account.role,
                        );
                        setRecipientOffice("BLGF Regional Office II");
                        setCurrentDivision(account.divisionCode);
                        setRecipientAddress(
                          "Regional Government Center, Carig Sur, Tuguegarao City",
                        );
                      }}
                      className={styles.recipientSelect}
                    >
                      <option value="">
                        -- Select active BLGF user account --
                      </option>
                      {allEmployees
                        .filter(
                          (user) => !selectedRecipientIds.includes(user.id),
                        )
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName} — {user.designation || user.role}
                          </option>
                        ))}
                    </FormSelect>
                    <Button
                      type="button"
                      disabled={!recipientUserId}
                      onClick={() => {
                        if (!recipientUserId) return;
                        setSelectedRecipientIds((current) => [
                          ...new Set([...current, recipientUserId]),
                        ]);
                        setRecipientName("");
                        setRecipientUserId("");
                        setRecipientPosition("");
                        setRecipientOffice("");
                        setRecipientAddress("");
                      }}
                      className={styles.addRecipientButton}
                    >
                      <UserPlus className={styles.smallIcon} />
                      Add Recipient
                    </Button>
                  </div>
                  {selectedRecipientIds.length > 0 && (
                    <div className={styles.recipientTags}>
                      {selectedRecipientIds.map((id) => {
                        const selectedUser = allEmployees.find(
                          (user) => user.id === id,
                        );
                        if (!selectedUser) return null;
                        return (
                          <span key={id} className={styles.divisionTag}>
                            {selectedUser.fullName}
                            <Button
                              type="button"
                              onClick={() =>
                                setSelectedRecipientIds((current) =>
                                  current.filter((userId) => userId !== id),
                                )
                              }
                              className={styles.removeRecipientButton}
                              aria-label={`Remove ${selectedUser.fullName}`}
                            >
                              <X className={styles.tinyIcon} />
                            </Button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {recipientName && (
                    <p className={styles.recipientHint}>
                      Selected: {recipientName} · {recipientPosition}
                    </p>
                  )}
                  {!recipientUserId &&
                    selectedRecipientIds.length === 0 &&
                    currentDivision && (
                      <div className={styles.selectedPanel}>
                        <div className={styles.selectedHeading}>
                          <p className={styles.selectedTitle}>
                            Recipients from{" "}
                            {currentDivision === "ALL"
                              ? "All Divisions"
                              : [currentDivision, ...additionalDivisions].join(
                                  ", ",
                                )}
                          </p>
                          <span className={styles.countBadge}>
                            {holdingDivisionRecipients.length}
                          </span>
                        </div>
                        {holdingDivisionRecipients.length > 0 ? (
                          <div className={styles.recipientTags}>
                            {holdingDivisionRecipients.map((user) => (
                              <span
                                key={user.id}
                                className={styles.selectedRecipientTag}
                              >
                                {user.fullName}
                                {user.designation
                                  ? ` · ${user.designation}`
                                  : ""}
                                <Button
                                  type="button"
                                  onClick={() =>
                                    setExcludedRecipientIds((current) => [
                                      ...current,
                                      user.id,
                                    ])
                                  }
                                  className={styles.removeSelectedButton}
                                  aria-label={`Remove ${user.fullName} from recipients`}
                                  title="Remove employee from this route"
                                >
                                  <X className={styles.tinyIcon} />
                                </Button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.warningText}>
                            No active users are assigned to this division.
                          </p>
                        )}
                      </div>
                    )}
                </div>

                {/* Selected Employee Details */}
                {recipientName && (
                  <div className={styles.routingSummary}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryHighlight}>
                        ✓ Selected
                      </span>
                    </div>
                    <div>
                      <strong>Name:</strong> {recipientName}
                    </div>
                    {recipientPosition && (
                      <div>
                        <strong>Position:</strong> {recipientPosition}
                      </div>
                    )}
                    {recipientOffice && (
                      <div>
                        <strong>Office:</strong> {recipientOffice}
                      </div>
                    )}
                    {recipientAddress && (
                      <div>
                        <strong>Address:</strong> {recipientAddress}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className={styles.categoryLabel}>
                    Action Requested *
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
                    value={initialAction}
                    onChange={setInitialAction}
                    className={styles.flexibleSelect}
                  />
                </div>

                {/* Priority and Target Completion Date */}
                <div className={styles.recipientGrid}>
                  <div>
                    <label className={styles.fieldLabel}>
                      Priority Level *
                    </label>
                    <ManagedOptionsSelect
                      storageKey="blgf-priority-options"
                      options={PRIORITY_OPTIONS}
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
                      value={priority}
                      onChange={(next) => setPriority(next as PriorityLevel)}
                      className={styles.flexibleInput}
                    />
                  </div>

                  <div>
                    <label className={styles.fieldLabel}>
                      Target Completion Date *
                    </label>
                    <FormInput
                      type="date"
                      required
                      value={targetCompletionDate}
                      onChange={(e) => setTargetCompletionDate(e.target.value)}
                      className={styles.compactInput}
                    />
                  </div>
                </div>

                {/* Attach Documents Section */}
                <Box component="section" sx={{ display: "grid", gap: 2.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Paperclip size={18} aria-hidden="true" />
                    <Box>
                      <Typography
                        sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}
                      >
                        Supporting documents
                      </Typography>
                      <Typography
                        sx={{ marginTop: 0.5, fontSize: 11.5 }}
                        color="text.secondary"
                      >
                        Optional files related to this transaction
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    component="label"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      padding: 1.5,
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 1,
                      backgroundColor: "background.default",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: "primary.main",
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        placeItems: "center",
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: 1,
                        color: "primary.main",
                        backgroundColor: "action.hover",
                      }}
                    >
                      <Upload size={19} aria-hidden="true" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        Select files from your device
                      </Typography>
                      <Typography
                        sx={{ marginTop: 0.25, fontSize: 11 }}
                        color="text.secondary"
                      >
                        PDF, Word, Excel, PNG or JPG files
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        display: { xs: "none", sm: "block" },
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                      color="primary"
                    >
                      Browse files
                    </Typography>
                    <FormInput
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className={styles.hidden}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                  </Box>

                  {attachments.length > 0 && (
                    <Box sx={{ display: "grid", gap: 1 }}>
                      {attachments.map((att) => (
                        <Box
                          key={att.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 0,
                            padding: "8px 12px",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            backgroundColor: "background.paper",
                          }}
                        >
                          <FileText
                            size={17}
                            className={styles.attachmentIcon}
                            aria-hidden="true"
                          />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              noWrap
                              sx={{ fontSize: 12, fontWeight: 700 }}
                            >
                              {att.fileName}
                            </Typography>
                            <Typography
                              sx={{ fontSize: 10.5 }}
                              color="text.secondary"
                            >
                              {att.fileSize}
                            </Typography>
                          </Box>
                          <Tooltip title="Remove file">
                            <IconButton
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id)}
                              aria-label={`Remove ${att.fileName}`}
                              color="error"
                              size="small"
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Remarks */}
                <div>
                  <label className={styles.recipientLabel}>
                    Initial Routing Instructions / Remarks
                  </label>
                  <AutocompleteField
                    placeholder="e.g. Received via mail courier, complete with annexes..."
                    value={remarks}
                    onChange={setRemarks}
                    suggestions={directory.remarks}
                    ariaLabel="Initial Routing Instructions or Remarks"
                    className={styles.remarks}
                  />
                </div>

                {/* Submit Buttons */}
                <Box
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    zIndex: 5,
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    gap: 1,
                    margin: "0 -24px",
                    padding: "16px 24px",
                    borderTop: "1px solid #e4e4e7",
                    backgroundColor: "background.paper",
                  }}
                >
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                      padding: "8px 14px",
                      backgroundColor: "#f4f4f5",
                      color: "text.primary",
                      fontWeight: 700,
                      borderRadius: "8px",
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, "none")}
                    variant="contained"
                    color="inherit"
                    sx={{
                      padding: "8px 14px",
                      backgroundColor: "#e4e4e7",
                      color: "#27272a",
                      fontWeight: 700,
                      borderRadius: "8px",
                    }}
                    title="Register document without routing"
                  >
                    <span>Register Only</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, "route")}
                    variant="contained"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      padding: "8px 14px",
                      backgroundColor: "#3f3f46",
                      color: "white",
                      fontWeight: 700,
                      borderRadius: "8px",
                    }}
                    title="Register and open routing dispatch window"
                  >
                    <Send style={{ width: "14px", height: "14px" }} />
                    <span>Register & Route</span>
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </ModalLayer>
      }
    </>
  );
};
