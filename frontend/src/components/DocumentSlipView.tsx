// DocumentSlipView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import { Button, IconButton } from "@mui/material";
import { cx } from "../styles/muiClasses";
import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  ArrowLeft,
  CheckSquare,
  Square,
  Edit3,
  RotateCcw,
  Sparkles,
  FileText,
  Save,
  Trash2,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  DocumentRecord,
  DocumentRouteStep,
  User,
  DEFAULT_ROLE_PERMISSIONS,
} from "../types";
import { formatDate } from "../utils/statusUtils";
import { showConfirm } from "../services/dialogService";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createDocumentSlipViewStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  return {
    // SCREEN DESIGN: Keep selection controls distinct from the printable form.
    '@media screen': {
      '.document-slip-picker': { padding: '20px !important', display: 'grid', gap: 12 },
      '.document-slip-picker-option.MuiButton-root': { padding: '12px !important', justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', gap: 10 },
      '.document-slip-picker-option:focus-visible': { outline: `2px solid ${text}`, outlineOffset: -2 },
    },
    ".mui-systemdesign-system .document-slip-picker": {
      alignSelf: "stretch",
      minWidth: 0,
      borderColor: `${border} !important`,
      boxShadow: dark
        ? "0 8px 24px rgba(0,0,0,.14)"
        : "0 8px 24px rgba(24,24,27,.055)",
    },
    ".mui-systemdesign-system .document-slip-page": {
      minWidth: 0,
    },
    ".mui-systemdesign-system .print-half-a4-canvas": {
      minWidth: 0,
    },
    ".mui-systemdesign-system .document-slip-picker-option": {
      minHeight: "52px !important",
      border: "1px solid transparent !important",
      color: `${text} !important`,
    },
    ".mui-systemdesign-system .document-slip-picker-option:hover": {
      borderColor: `${theme.palette.primary.main}33 !important`,
    },
  };
};

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface DocumentSlipViewProps {
  document: DocumentRecord | null;
  documents: DocumentRecord[];
  currentUser: User;
  users: User[];
  onSelectDocument: (doc: DocumentRecord) => void;
  onBack: () => void;
}

const ROUTING_SLIP_DIVISIONS = [
  { code: "ORD", label: "Office of the Regional Director" },
  { code: "AD", label: "Administrative Division" },
  { code: "LAOD", label: "Local Assessment Operations Division" },
  { code: "LTOD", label: "Local Treasury Operations Division" },
  { code: "FD", label: "Financial Division" },
  { code: "LU", label: "Legal Division / Unit" },
] as const;

const ROUTING_SLIP_ACTIONS = [
  "Appropriate Action",
  "Approval",
  "Return with/without action",
  "Confer with RD",
  "Verify /analyze reports",
  "Please indorse/refer/forward",
  "Furnish Copy",
  "File",
] as const;

export interface PrintFormatPreset {
  id: string;
  name: string;
  isDefault?: boolean;
  docClass?: string;
  docNo?: string;
  senderName?: string;
  senderOffice?: string;
  senderPosition?: string;
  rdName?: string;
  rdPosition?: string;
  receivedBy?: string;
  subjectMatter?: string;
  assignedTo?: { [key: string]: boolean };
  forActions?: { [key: string]: boolean };
  specialInstructionsText?: string;
}

const DEFAULT_PRESETS: PrintFormatPreset[] = [
  {
    id: "FORMAT_1",
    name: "Format 1: BLGF Default (Half A4)",
    isDefault: true,
    senderName: "ATTY. VERNON S. TALATTAG",
    senderOffice: "BLGF RO2",
    senderPosition: "Division Chief",
    rdName: "ATTY. JULAIDA T. CADDAWAN-PANCHO",
    rdPosition: "Regional Director",
    receivedBy: "jay-ann",
    assignedTo: {
      "Financial Analysis": false,
      Treasury: false,
      Assessment: false,
      Legal: false,
      Administrative: true,
    },
    forActions: {
      "Appropriate Action": true,
      Approval: false,
      "Return with/without action": false,
      "Confer with RD": false,
      "Verify /analyze reports": false,
      "Please indorse/refer/forward": false,
      "Furnish Copy": false,
      File: false,
      "Special Instructions": false,
    },
  },
  {
    id: "FORMAT_2",
    name: "Format 2: Regional Director Executive",
    senderName: "ATTY. JULAIDA T. CADDAWAN-PANCHO",
    senderOffice: "Office of the Regional Director (ORD)",
    senderPosition: "Regional Director",
    rdName: "ATTY. JULAIDA T. CADDAWAN-PANCHO",
    rdPosition: "Regional Director",
    receivedBy: "ord-records",
    assignedTo: {
      "Financial Analysis": true,
      Treasury: true,
      Assessment: true,
      Legal: true,
      Administrative: true,
    },
    forActions: {
      "Appropriate Action": true,
      Approval: true,
      "Confer with RD": true,
      "Return with/without action": false,
      "Verify /analyze reports": false,
      "Please indorse/refer/forward": false,
      "Furnish Copy": false,
      File: false,
      "Special Instructions": false,
    },
  },
  {
    id: "FORMAT_3",
    name: "Format 3: Division Action Memorandum",
    senderName: "DIVISION CHIEF / OIC",
    senderOffice: "BLGF RO2 Operating Division",
    senderPosition: "Division Chief",
    rdName: "ATTY. JULAIDA T. CADDAWAN-PANCHO",
    rdPosition: "Regional Director",
    receivedBy: "div-handler",
    assignedTo: {
      "Financial Analysis": true,
      Treasury: false,
      Assessment: false,
      Legal: false,
      Administrative: false,
    },
    forActions: {
      "Verify /analyze reports": true,
      "Appropriate Action": true,
      Approval: false,
      "Return with/without action": false,
      "Confer with RD": false,
      "Please indorse/refer/forward": false,
      "Furnish Copy": false,
      File: false,
      "Special Instructions": false,
    },
  },
];

// LOGIC: State, events, at pagproseso ng data.
export const DocumentSlipView: React.FC<DocumentSlipViewProps> = ({
  document,
  documents,
  currentUser,
  users,
  onSelectDocument,
  onBack,
}) => {
  const activeDoc = document || documents[0];
  const canViewAllRoutes =
    currentUser.permissions?.canViewAllRoutes ??
    DEFAULT_ROLE_PERMISSIONS[currentUser.role].canViewAllRoutes;
  const visibleRoutes = (activeDoc?.routes || []).filter(
    (route) =>
      canViewAllRoutes ||
      route.fromUserId === currentUser.id ||
      route.toUserId === currentUser.id,
  );
  const resolveCurrentUserName = (userId?: string, legacyName?: string) =>
    users.find((user) => user.id === userId)?.fullName || legacyName || "";
  const sortedVisibleRoutes = visibleRoutes
    .map((route) => ({
      ...route,
      fromUser: resolveCurrentUserName(route.fromUserId, route.fromUser),
      toUser: resolveCurrentUserName(route.toUserId, route.toUser),
    }))
    .sort((a, b) => {
      const timeDifference =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return timeDifference || a.stepNumber - b.stepNumber;
    });
  const groupedVisibleRoutes = sortedVisibleRoutes.reduce<
    Array<DocumentRouteStep & { recipientNames: string[] }>
  >((groups, route) => {
    const groupKey = `${route.fromUserId || route.fromUser}|${route.actionRequested}|${route.createdAt}`;
    const recipientName =
      route.toUser ||
      activeDoc?.recipientName ||
      activeDoc?.assignedUser ||
      "Unassigned";
    const existingGroup = groups.find(
      (group) =>
        (group as DocumentRouteStep & { groupKey?: string }).groupKey ===
        groupKey,
    );

    if (existingGroup) {
      if (!existingGroup.recipientNames.includes(recipientName)) {
        existingGroup.recipientNames.push(recipientName);
      }
      return groups;
    }

    groups.push(
      Object.assign({}, route, {
        groupKey,
        recipientNames: [recipientName],
      }),
    );
    return groups;
  }, []);
  const recipientDisplayName =
    resolveCurrentUserName(
      activeDoc?.routes?.at(-1)?.toUserId || activeDoc?.assignedUserId,
      activeDoc?.routes?.at(-1)?.toUser || activeDoc?.assignedUser,
    ) ||
    activeDoc?.recipientName ||
    "________________";
  const latestRecipientRoute = [...(activeDoc?.routes || [])].sort((a, b) => {
    if (b.stepNumber !== a.stepNumber) {
      return b.stepNumber - a.stepNumber;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })[0];
  const latestTransactionRecipientNames = latestRecipientRoute
    ? Array.from(
        new Set(
          (activeDoc?.routes || [])
            .filter((route) => {
              return (
                route.fromUserId === latestRecipientRoute.fromUserId &&
                route.actionRequested ===
                  latestRecipientRoute.actionRequested &&
                route.createdAt === latestRecipientRoute.createdAt
              );
            })
            .map((route) =>
              resolveCurrentUserName(route.toUserId, route.toUser),
            )
            .filter((name): name is string => Boolean(name)),
        ),
      )
    : [];
  const recipientListDisplay =
    latestTransactionRecipientNames.length > 0
      ? latestTransactionRecipientNames.join(", ")
      : recipientDisplayName;
  const latestTransactionDateDisplay = latestRecipientRoute?.createdAt
    ? new Date(latestRecipientRoute.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "";
  const routedByDisplayName =
    (() => {
      const firstRoute = [...(activeDoc?.routes || [])].sort((a, b) => {
        const timeDifference =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return timeDifference || a.stepNumber - b.stepNumber;
      })[0];
      return resolveCurrentUserName(
        firstRoute?.fromUserId,
        firstRoute?.fromUser,
      );
    })() ||
    activeDoc?.createdBy ||
    activeDoc?.senderName ||
    "________________";
  const [documentSearch, setDocumentSearch] = useState("");
  const [routingBy, setRoutingBy] = useState(routedByDisplayName);
  const [routingHistoryText, setRoutingHistoryText] = useState("");
  const hasDocumentSearch = documentSearch.trim().length > 0;
  const matchingDocuments = documentSearch.trim()
    ? documents.filter((candidate) =>
        `${candidate.routeNo} ${candidate.title} ${candidate.subject || ""}`
          .toLowerCase()
          .includes(documentSearch.trim().toLowerCase()),
      )
    : [];

  // Editable Template Fields
  const [docClass, setDocClass] = useState<string>("2026-1-005");
  const [docNo, setDocNo] = useState<string>("");
  const [senderName, setSenderName] = useState<string>(
    "ATTY. VERNON S. TALATTAG",
  );
  const [senderOffice, setSenderOffice] = useState<string>("BLGF RO2");
  const [senderPosition, setSenderPosition] =
    useState<string>("Division Chief");
  const [dateStr, setDateStr] = useState<string>("Jan 05, 2026");
  const [timeStr, setTimeStr] = useState<string>("");
  const [receivedBy, setReceivedBy] = useState<string>("jay-ann");
  const [subjectMatter, setSubjectMatter] = useState<string>(
    "PDS as of Jan 05, 2026",
  );
  const [rdName, setRdName] = useState<string>(
    "ATTY. JULAIDA T. CADDAWAN-PANCHO",
  );
  const [rdPosition, setRdPosition] = useState<string>("Regional Director");
  const [signatoryFormats, setSignatoryFormats] = useState<
    Array<{ id: string; name: string; signatoryName: string; position: string }>
  >(() => {
    try {
      const stored = localStorage.getItem("blgf_signatory_formats");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: "regional-director",
        name: "Regional Director",
        signatoryName: "ATTY. JULAIDA T. CADDAWAN-PANCHO",
        position: "Regional Director",
      },
    ];
  });
  const [selectedSignatoryFormat, setSelectedSignatoryFormat] =
    useState("regional-director");
  const [newSignatoryFormatName, setNewSignatoryFormatName] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("FORMAT_1");
  const [slipLayout, setSlipLayout] = useState<"full" | "simplified">(
    "simplified",
  );

  const saveSignatoryFormats = (
    formats: Array<{
      id: string;
      name: string;
      signatoryName: string;
      position: string;
    }>,
  ) => {
    setSignatoryFormats(formats);
    localStorage.setItem("blgf_signatory_formats", JSON.stringify(formats));
  };

  const applySignatoryFormat = (formatId: string) => {
    setSelectedSignatoryFormat(formatId);
    const format = signatoryFormats.find((item) => item.id === formatId);
    if (!format) return;
    setRdName(format.signatoryName);
    setRdPosition(format.position);
  };

  const createSignatoryFormat = () => {
    const name = newSignatoryFormatName.trim();
    if (!name || !rdName.trim() || !rdPosition.trim()) {
      alert("Enter a format name, signatory name, and position.");
      return;
    }
    const format = {
      id: `signatory-${Date.now()}`,
      name,
      signatoryName: rdName.trim(),
      position: rdPosition.trim(),
    };
    saveSignatoryFormats([...signatoryFormats, format]);
    setSelectedSignatoryFormat(format.id);
    setNewSignatoryFormatName("");
  };

  const deleteSignatoryFormat = () => {
    if (selectedSignatoryFormat === "regional-director") {
      alert("The default Regional Director format cannot be deleted.");
      return;
    }
    const nextFormats = signatoryFormats.filter(
      (item) => item.id !== selectedSignatoryFormat,
    );
    saveSignatoryFormats(nextFormats);
    applySignatoryFormat("regional-director");
  };

  // Checkbox states for ASSIGNED TO
  const [assignedTo, setAssignedTo] = useState<{ [key: string]: boolean }>({
    "Financial Analysis": false,
    Treasury: false,
    Assessment: false,
    Legal: false,
    Administrative: false,
  });

  // Checkbox states for FOR:
  const [forActions, setForActions] = useState<{ [key: string]: boolean }>({
    "Appropriate Action": false,
    Approval: false,
    "Return with/without action": false,
    "Confer with RD": false,
    "Verify /analyze reports": false,
    "Please indorse/refer/forward": false,
    "Furnish Copy": false,
    File: false,
    "Special Instructions": false,
  });

  // Additional Fields
  const [receivedRecordsDate] = useState<string>("");
  const [dispatchInfo] = useState<string>("");
  const [answerInfo] = useState<string>("");
  const [filedDate] = useState<string>("");
  const [filedNo] = useState<string>("");
  const [specialInstructionsText, setSpecialInstructionsText] =
    useState<string>("");

  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);

  // Print Formats List State
  const [printFormats, setPrintFormats] = useState<PrintFormatPreset[]>(() => {
    try {
      const stored = localStorage.getItem("blgf_print_formats");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PRESETS;
  });

  const [newFormatName, setNewFormatName] = useState<string>("");

  // Apply preset fields when preset changes
  const applyPreset = (preset: PrintFormatPreset) => {
    if (preset.senderName) setSenderName(preset.senderName);
    if (preset.senderOffice) setSenderOffice(preset.senderOffice);
    if (preset.senderPosition) setSenderPosition(preset.senderPosition);
    if (preset.rdName) setRdName(preset.rdName);
    if (preset.rdPosition) setRdPosition(preset.rdPosition);
    if (preset.receivedBy) setReceivedBy(preset.receivedBy);
    // Division and action checks come from the latest routing transaction.
    if (preset.specialInstructionsText !== undefined)
      setSpecialInstructionsText(preset.specialInstructionsText);
  };

  const handleSelectFormat = (formatId: string) => {
    setSelectedFormat(formatId);
    const found = printFormats.find((f) => f.id === formatId);
    if (found) {
      applyPreset(found);
    }
  };

  const handleSaveCurrentPreset = () => {
    const targetIndex = printFormats.findIndex((f) => f.id === selectedFormat);
    if (targetIndex === -1) return;

    const currentFmt = printFormats[targetIndex];
    const updatedPreset: PrintFormatPreset = {
      ...currentFmt,
      docClass,
      docNo,
      senderName,
      senderOffice,
      senderPosition,
      rdName,
      rdPosition,
      receivedBy,
      subjectMatter,
      assignedTo,
      forActions,
      specialInstructionsText,
    };

    const updatedFormats = [...printFormats];
    updatedFormats[targetIndex] = updatedPreset;
    setPrintFormats(updatedFormats);

    try {
      localStorage.setItem(
        "blgf_print_formats",
        JSON.stringify(updatedFormats),
      );
    } catch (e) {
      console.error(e);
    }
    alert(`💾 Preset "${currentFmt.name}" updated and saved successfully!`);
  };

  const handleAddFormat = () => {
    if (!newFormatName.trim()) {
      alert("Please enter a name for the new print format preset.");
      return;
    }
    const newId = `FORMAT_${Date.now()}`;
    const newFmt: PrintFormatPreset = {
      id: newId,
      name: newFormatName.trim(),
      docClass,
      docNo,
      senderName,
      senderOffice,
      senderPosition,
      rdName,
      rdPosition,
      receivedBy,
      subjectMatter,
      assignedTo,
      forActions,
      specialInstructionsText,
    };
    const updated = [...printFormats, newFmt];
    setPrintFormats(updated);
    setSelectedFormat(newId);
    try {
      localStorage.setItem("blgf_print_formats", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setNewFormatName("");
    alert(`✅ New Print Preset "${newFmt.name}" created and saved!`);
  };

  const handleDeleteFormat = async (formatId: string) => {
    if (formatId === "FORMAT_1") {
      alert("Format 1 is the system default layout and cannot be deleted.");
      return;
    }
    const targetFmt = printFormats.find((f) => f.id === formatId);
    if (
      await showConfirm(
        `Are you sure you want to delete print preset "${targetFmt?.name || formatId}"?`,
      )
    ) {
      const updated = printFormats.filter((f) => f.id !== formatId);
      setPrintFormats(updated);
      setSelectedFormat("FORMAT_1");
      const defaultFmt =
        updated.find((f) => f.id === "FORMAT_1") || DEFAULT_PRESETS[0];
      applyPreset(defaultFmt);
      try {
        localStorage.setItem("blgf_print_formats", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      alert("🗑️ Print format preset deleted successfully.");
    }
  };

  // Reset to Format 1 Default Handler
  const handleResetToDefault = async () => {
    if (
      await showConfirm(
        "Reset all fields and routing slip presets back to System Defaults?",
      )
    ) {
      setSelectedFormat("FORMAT_1");
      setPrintFormats(DEFAULT_PRESETS);
      try {
        localStorage.setItem(
          "blgf_print_formats",
          JSON.stringify(DEFAULT_PRESETS),
        );
      } catch (e) {
        console.error(e);
      }

      setDocClass(activeDoc?.direction || "");
      setDocNo("");
      setSenderName(activeDoc?.senderName || "ATTY. VERNON S. TALATTAG");
      setSenderOffice(activeDoc?.originatingOffice || "BLGF RO2");
      setSenderPosition("Division Chief");
      setRdName("ATTY. JULAIDA T. CADDAWAN-PANCHO");
      setRdPosition("Regional Director");
      setReceivedBy("jay-ann");
      setSubjectMatter(
        activeDoc?.subject || activeDoc?.title || "PDS as of Jan 05, 2026",
      );
      setSpecialInstructionsText("");
      setAssignedTo({
        "Financial Analysis": false,
        Treasury: false,
        Assessment: false,
        Legal: false,
        Administrative: false,
      });
      setForActions({
        "Appropriate Action": false,
        Approval: false,
        "Return with/without action": false,
        "Confer with RD": false,
        "Verify /analyze reports": false,
        "Please indorse/refer/forward": false,
        "Furnish Copy": false,
        File: false,
        "Special Instructions": false,
      });
      alert(
        "↺ Preset and form fields reset to Format 1 (BLGF Default Half A4)!",
      );
    }
  };

  // Sync with activeDoc when selected document changes
  useEffect(() => {
    if (activeDoc) {
      if (slipLayout === "simplified") {
        setDocNo(activeDoc.routeNo || "");
        setDocClass(activeDoc.direction || "");
        setDateStr(
          activeDoc.dateReceived
            ? new Date(activeDoc.dateReceived).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })
            : "",
        );
        setTimeStr(
          activeDoc.dateReceived
            ? new Date(activeDoc.dateReceived).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
        );
        setRoutingBy(routedByDisplayName);
        setSubjectMatter(activeDoc.subject || activeDoc.title || "");
        setRoutingHistoryText("");
        setSpecialInstructionsText("");
        setAssignedTo(
          Object.fromEntries(
            ROUTING_SLIP_DIVISIONS.map(({ label }) => [label, false]),
          ),
        );
        setForActions(
          Object.fromEntries(
            ROUTING_SLIP_ACTIONS.map((action) => [action, false]),
          ),
        );
        return;
      }

      setDocClass(activeDoc.direction || "");
      setSenderName(
        activeDoc.senderName ||
          activeDoc.originatingOffice ||
          "ATTY. VERNON S. TALATTAG",
      );
      setSenderOffice(activeDoc.originatingOffice || "BLGF RO2");

      const formattedDate = activeDoc.dateReceived
        ? new Date(activeDoc.dateReceived).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })
        : "Jan 05, 2026";
      setDateStr(formattedDate);

      const formattedTime = activeDoc.dateReceived
        ? new Date(activeDoc.dateReceived).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      setTimeStr(formattedTime);

      setSubjectMatter(
        activeDoc.subject || activeDoc.title || "PDS as of Jan 05, 2026",
      );
      setRoutingBy(routedByDisplayName);
      setRoutingHistoryText(
        groupedVisibleRoutes
          .map(
            (route, index) =>
              `${index + 1}. ${route.fromUser} to ${route.recipientNames.join(", ")}\nAction: ${route.actionRequested || "Appropriate Action"}\n${formatDate(route.createdAt)}`,
          )
          .join("\n\n"),
      );

      // Mark every division included in the latest routing transaction.
      const latestRoute = [...(activeDoc.routes || [])].sort((a, b) => {
        if (b.stepNumber !== a.stepNumber) {
          return b.stepNumber - a.stepNumber;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })[0];
      const transactionRoutes = latestRoute
        ? activeDoc.routes.filter((route) => {
            return (
              route.fromUserId === latestRoute.fromUserId &&
              route.actionRequested === latestRoute.actionRequested &&
              route.createdAt === latestRoute.createdAt
            );
          })
        : [];
      const routedDivisions = new Set(
        transactionRoutes.length > 0
          ? transactionRoutes.map((route) => {
              const recipientAccount = users.find(
                (user) => route.toUserId && user.id === route.toUserId,
              );
              return recipientAccount?.divisionCode || route.toDivision;
            })
          : [activeDoc.currentDivision],
      );
      setAssignedTo(
        Object.fromEntries(
          ROUTING_SLIP_DIVISIONS.map(({ code, label }) => [
            label,
            routedDivisions.has(code),
          ]),
        ),
      );

      // Leave FOR blank until the user manually checks an item.
      setForActions(
        Object.fromEntries(
          ROUTING_SLIP_ACTIONS.map((action) => [action, false]),
        ),
      );

      if (activeDoc.remarks) {
        setSpecialInstructionsText(activeDoc.remarks);
      }
    }
  }, [activeDoc, users, routedByDisplayName, slipLayout]);

  const toggleAssigned = (key: string) => {
    setAssignedTo((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleForAction = (key: string) => {
    setForActions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    const restoreTitle = () => {
      window.document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    // Prevent the application name from appearing in browser print headers.
    window.document.title = "";
    window.addEventListener("afterprint", restoreTitle);
    window.print();
    window.setTimeout(restoreTitle, 1000);
  };

  if (!activeDoc) {
    return (
      <>
        <DocumentSlipViewDesign />
        {
          <div
            className={cx(
              "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-600 dark:text-slate-300",
            )}
          >
            <p className={cx("text-sm font-semibold")}>
              No document selected to generate routing slip.
            </p>
          </div>
        }
      </>
    );
  }

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <DocumentSlipViewDesign />
      {
        <div
          className={cx(
            "document-slip-page space-y-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:items-start lg:gap-5 lg:space-y-0",
          )}
        >
          {/* Print the complete routing slip on the upper half of long bond paper. */}
          <style>{`
        @media print {
          @page {
            size: 8.5in 13in;
            margin: 0 !important;
          }
          html {
            width: 8.5in !important;
            height: 13in !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            width: 8.5in !important;
            height: 13in !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-half-a4-canvas {
            width: 8.5in !important;
            max-width: 8.5in !important;
            height: 6.5in !important;
            max-height: 6.5in !important;
            overflow: hidden !important;
            padding: 3mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
          }
          .print-half-a4-canvas > div {
            width: 300mm !important;
            min-width: 300mm !important;
            height: 209mm !important;
            min-height: 209mm !important;
            max-height: 209mm !important;
            box-sizing: border-box !important;
            transform: scale(0.699) !important;
            transform-origin: top left !important;
            overflow: hidden !important;
          }
          body * { visibility: hidden !important; }
          .print-half-a4-canvas, .print-half-a4-canvas * { visibility: visible !important; }
          .print\\:hidden { display: none !important; }
          .no-print { display: none !important; }
          form, input, select, textarea, button, .customize-panel, .top-controller-bar { display: none !important; }
        }
      `}</style>

          {/* Top Controller Bar (Hidden when printing) */}
          <div
            className={cx(
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs print:hidden lg:col-span-2",
            )}
          >
            <div className={cx("flex items-center space-x-3")}>
              <Button
                type="button"
                onClick={onBack}
                className={cx(
                  "p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors border border-slate-200 dark:border-slate-700",
                )}
                title="Back"
              >
                <ArrowLeft className={cx("w-5 h-5")} />
              </Button>
              <div>
                <div className={cx("flex items-center space-x-2")}>
                  <h2
                    className={cx(
                      "text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2",
                    )}
                  >
                    <Printer
                      className={cx("w-5 h-5 text-slate-600 dark:text-slate-400")}
                    />
                    <span>
                      {slipLayout === "full"
                        ? "Official BLGF RO2 Document Routing Slip"
                        : "New Limited Document Routing Slip"}
                    </span>
                  </h2>
                </div>
                {slipLayout === "full" && (
                  <p
                    className={cx(
                      "mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400",
                    )}
                  >
                    Choose a document, review the slip details, then print the completed form.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div
              className={cx(
                "flex items-center space-x-2 w-full md:w-auto justify-end",
              )}
            >
              <FormSelect
                value={slipLayout}
                onChange={(event) =>
                  setSlipLayout(event.target.value as "full" | "simplified")
                }
                className={cx(
                  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white",
                )}
                aria-label="Choose routing slip format"
              >
                <option value="simplified">Limited Slip</option>
                <option value="full">Complete Slip</option>
              </FormSelect>

              <Button
                type="button"
                onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
                className={cx(
                  "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 transition-all shrink-0",
                )}
              >
                <Edit3
                  className={cx("w-4 h-4 text-slate-600 dark:text-slate-400")}
                />
                <span>
                  {isCustomizeOpen ? "Close Form Edit" : "Edit Routing Form"}
                </span>
              </Button>

              <Button
                type="button"
                onClick={handlePrint}
                className={cx(
                  "bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-2 shadow-xs transition-all shrink-0",
                )}
              >
                <Printer className={cx("w-4 h-4")} />
                <span>Print Slip Only</span>
              </Button>
            </div>
          </div>

          <div
            className={cx(
              "print:hidden lg:col-start-1 lg:row-start-2 lg:min-w-0",
            )}
          >
            <div
              className={cx(
                "document-slip-picker relative z-20 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 lg:sticky lg:top-24 lg:max-h-[26rem]",
              )}
            >
              <div
                className={cx(
                  "mb-3 flex items-start gap-2.5 border-b border-slate-200 pb-3 dark:border-slate-800",
                )}
              >
                <div
                  className={cx(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 dark:bg-blue-950/40 dark:text-slate-300",
                  )}
                >
                  <Search className={cx("h-4 w-4")} />
                </div>
                <div className={cx("min-w-0")}>
                  <label
                    className={cx(
                      "block text-xs font-extrabold text-slate-800 dark:text-slate-100",
                    )}
                  >
                    Find document for routing slip
                  </label>
                  <p
                    className={cx(
                      "mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400",
                    )}
                  >
                    Search by route number, title, or subject.
                  </p>
                </div>
              </div>
              <div className={cx("relative")}>
                <Search
                  className={cx(
                    "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400",
                  )}
                />
                <FormInput
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search Document Route No., title, or subject..."
                  className={cx(
                    "w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-xs font-medium dark:border-slate-700 dark:bg-slate-800",
                  )}
                 style={{ paddingLeft: 38 }} />
                {hasDocumentSearch && (
                  <IconButton
                    size="small"
                    onClick={() => setDocumentSearch("")}
                    aria-label="Clear document search"
                    title="Clear search"
                    sx={{
                      position: "absolute",
                      right: 4,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 30,
                      height: 30,
                    }}
                  >
                    <X size={15} />
                  </IconButton>
                )}

                {hasDocumentSearch && (
                  <div
                    className={cx(
                      "relative mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-1 dark:border-slate-700 dark:bg-slate-950/30 lg:max-h-48",
                    )}
                  >
                    {matchingDocuments.length === 0 ? (
                      <div
                        className={cx(
                          "px-3 py-5 text-center text-xs text-slate-400",
                        )}
                      >
                        No documents found.
                      </div>
                    ) : (
                      matchingDocuments.map((candidate) => (
                        <Button
                          key={candidate.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            onSelectDocument(candidate);
                          }}
                          className={cx(
                            `document-slip-picker-option flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${
                              activeDoc.id === candidate.id
                                ? "bg-slate-50 dark:bg-blue-950/30"
                                : ""
                            }`,
                          )}
                        >
                          <FileText
                            className={cx(
                              "mt-0.5 h-4 w-4 shrink-0 text-slate-600",
                            )}
                          />
                          <span className={cx("min-w-0 flex-1")}>
                            <span
                              className={cx(
                                "block font-mono text-xs font-bold text-slate-600",
                              )}
                            >
                              {candidate.routeNo}
                            </span>
                            <span
                              className={cx(
                                "block truncate text-xs font-semibold text-slate-700 dark:text-slate-200",
                              )}
                            >
                              {candidate.title}
                            </span>
                            {candidate.subject && (
                              <span
                                className={cx(
                                  "block truncate text-[11px] text-slate-400",
                                )}
                              >
                                {candidate.subject}
                              </span>
                            )}
                          </span>
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div
                className={cx(
                  "mt-3 grid gap-1 border-t border-slate-200 pt-3 text-[10px] dark:border-slate-800",
                )}
              >
                <span className={cx("text-slate-400 dark:text-slate-500")}>
                  {hasDocumentSearch
                    ? `${matchingDocuments.length} document${matchingDocuments.length === 1 ? "" : "s"} found`
                    : "Start typing to find a document"}
                </span>
                <span
                  className={cx(
                    "truncate font-bold text-slate-600 dark:text-slate-400",
                  )}
                >
                  Selected: {activeDoc?.routeNo || "None"}
                </span>
              </div>
            </div>
          </div>

          {/* CUSTOMIZATION PANEL (Hidden when printing) */}
          {isCustomizeOpen && (
            <div
              className={cx(
                "bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-900/50 rounded-xl p-5 shadow-sm space-y-4 print:hidden animate-fadeIn lg:col-span-2 lg:row-start-2",
              )}
            >
              <div
                className={cx(
                  "flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-2",
                )}
              >
                <h3
                  className={cx(
                    "font-extrabold text-xs text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2",
                  )}
                >
                  <Sparkles className={cx("w-4 h-4 text-slate-600")} />
                  <span>Routing Slip Signatory</span>
                </h3>

                <Button
                  type="button"
                  onClick={handleResetToDefault}
                  className={cx("hidden")}
                  title="Reset form to Format 1 Default"
                >
                  <RotateCcw className={cx("w-3.5 h-3.5")} />
                  <span>Reset to Format 1 Default</span>
                </Button>
              </div>

              {/* PRINT FORMAT MANAGEMENT SECTION */}
              <div className={cx("hidden")}>
                <div
                  className={cx(
                    "font-extrabold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center justify-between",
                  )}
                >
                  <span>
                    Print Format Presets Manager (Select, Save, Reset, or Delete
                    Layouts):
                  </span>
                  <span
                    className={cx(
                      "text-[10px] text-slate-600 dark:text-slate-400 font-semibold font-mono",
                    )}
                  >
                    Active:{" "}
                    {printFormats.find((f) => f.id === selectedFormat)?.name}
                  </span>
                </div>
                <div className={cx("flex flex-wrap items-center gap-2")}>
                  <FormSelect
                    value={selectedFormat}
                    onChange={(e) => handleSelectFormat(e.target.value)}
                    className={cx(
                      "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500",
                    )}
                  >
                    {printFormats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.isDefault ? "(Default)" : ""}
                      </option>
                    ))}
                  </FormSelect>

                  <Button
                    type="button"
                    onClick={handleSaveCurrentPreset}
                    className={cx(
                      "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer flex items-center space-x-1 transition-all",
                    )}
                    title="Save current fields into selected preset"
                  >
                    <Save className={cx("w-3.5 h-3.5")} />
                    <span>Save Preset</span>
                  </Button>

                  {selectedFormat !== "FORMAT_1" ? (
                    <Button
                      type="button"
                      onClick={() => handleDeleteFormat(selectedFormat)}
                      className={cx(
                        "px-3 py-1.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 cursor-pointer flex items-center space-x-1 transition-all",
                      )}
                      title="Delete selected custom format preset"
                    >
                      <Trash2 className={cx("w-3.5 h-3.5")} />
                      <span>Delete Preset</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleResetToDefault}
                      className={cx(
                        "px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-lg shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer",
                      )}
                      title="Reset Format 1 to system defaults"
                    >
                      <RotateCcw className={cx("w-3.5 h-3.5")} />
                      <span>Reset Preset</span>
                    </Button>
                  )}

                  <div className={cx("flex items-center space-x-1.5 ml-auto")}>
                    <FormInput
                      type="text"
                      placeholder="New Preset Title..."
                      value={newFormatName}
                      onChange={(e) => setNewFormatName(e.target.value)}
                      className={cx(
                        "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white",
                      )}
                    />

                    <Button
                      type="button"
                      onClick={handleAddFormat}
                      className={cx(
                        "px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-2xs cursor-pointer flex items-center space-x-1",
                      )}
                    >
                      <Plus className={cx("w-3.5 h-3.5")} />
                      <span>Save as New Preset</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div
                className={cx(
                  "grid w-full grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
                )}
              >
                <div>
                  <label
                    className={cx(
                      "mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300",
                    )}
                  >
                    Signatory Format to Use
                  </label>
                  <FormSelect
                    value={selectedSignatoryFormat}
                    onChange={(event) =>
                      applySignatoryFormat(event.target.value)
                    }
                    className={cx(
                      "w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-900",
                    )}
                  >
                    {signatoryFormats.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.name}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <label
                    className={cx(
                      "mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300",
                    )}
                  >
                    New Format Name
                  </label>
                  <FormInput
                    type="text"
                    value={newSignatoryFormatName}
                    onChange={(event) =>
                      setNewSignatoryFormatName(event.target.value)
                    }
                    placeholder="e.g. OIC Regional Director"
                    className={cx(
                      "w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900",
                    )}
                  />
                </div>
                <div className={cx("flex items-end gap-1.5")}>
                  <Button
                    type="button"
                    onClick={createSignatoryFormat}
                    className={cx(
                      "inline-flex min-h-9 items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500",
                    )}
                  >
                    <Save className={cx("h-3.5 w-3.5")} />
                    Save Format
                  </Button>
                  <Button
                    type="button"
                    onClick={deleteSignatoryFormat}
                    disabled={selectedSignatoryFormat === "regional-director"}
                    className={cx(
                      "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-rose-950 dark:text-rose-300",
                    )}
                    title="Delete selected signatory format"
                  >
                    <Trash2 className={cx("h-3.5 w-3.5")} />
                  </Button>
                </div>
              </div>

              <div
                className={cx(
                  "grid w-full grid-cols-1 gap-3 text-xs sm:grid-cols-2",
                )}
              >
                <div className={cx("hidden")}>
                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Class Code / No.:
                    </label>
                    <FormInput
                      type="text"
                      value={docClass}
                      onChange={(e) => setDocClass(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-mono font-bold",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Sender Name:
                    </label>
                    <FormInput
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-semibold",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Sender Position / Title:
                    </label>
                    <FormInput
                      type="text"
                      value={senderPosition}
                      onChange={(e) => setSenderPosition(e.target.value)}
                      placeholder="e.g. Division Chief"
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-semibold",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Sender Office:
                    </label>
                    <FormInput
                      type="text"
                      value={senderOffice}
                      onChange={(e) => setSenderOffice(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-semibold",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Date:
                    </label>
                    <FormInput
                      type="text"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Time:
                    </label>
                    <FormInput
                      type="text"
                      placeholder="e.g. 10:15 AM"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Received By (Handler):
                    </label>
                    <FormInput
                      type="text"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-600 dark:text-slate-400 font-bold",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cx(
                        "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                      )}
                    >
                      Subject Matter:
                    </label>
                    <FormInput
                      type="text"
                      value={subjectMatter}
                      onChange={(e) => setSubjectMatter(e.target.value)}
                      className={cx(
                        "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-semibold",
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={cx(
                      "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                    )}
                  >
                    Signatory Name (RD):
                  </label>
                  <FormInput
                    type="text"
                    value={rdName}
                    onChange={(e) => setRdName(e.target.value)}
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-bold",
                    )}
                  />
                </div>

                <div>
                  <label
                    className={cx(
                      "block font-bold text-slate-700 dark:text-slate-300 mb-1",
                    )}
                  >
                    Signatory Position / Title:
                  </label>
                  <FormInput
                    type="text"
                    value={rdPosition}
                    onChange={(e) => setRdPosition(e.target.value)}
                    placeholder="e.g. Regional Director"
                    className={cx(
                      "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-bold",
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {false && (
            <div
              className={cx(
                "print-half-a4-canvas w-full max-w-5xl min-w-0 bg-white text-slate-900 p-4 rounded-xl shadow-xl mx-auto font-sans print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full lg:col-start-2 lg:row-start-2",
              )}
            >
              <div
                className={cx(
                  "border-[3px] border-slate-950 p-2.5 sm:p-3.5 space-y-0 print:border-[3px] print:border-black",
                )}
              >
                <header
                  className={cx(
                    "grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center border-b-[3px] border-slate-950 pb-2",
                  )}
                >
                  <img
                    src="/blgflogo.jpg"
                    alt="BLGF seal"
                    className={cx("h-14 w-14 object-contain")}
                  />

                  <div className={cx("text-center font-serif text-slate-950")}>
                    <p className={cx("text-[10px] leading-tight")}>
                      Republic of the Philippines
                    </p>
                    <p className={cx("text-[10px] leading-tight")}>
                      Department of Finance
                    </p>
                    <p
                      className={cx(
                        "pt-0.5 font-sans text-[15px] font-black uppercase leading-tight",
                      )}
                    >
                      Bureau of Local Government Finance
                    </p>
                    <p
                      className={cx(
                        "text-[11px] font-bold uppercase leading-tight",
                      )}
                    >
                      Regional Office No. II · Carig, Tuguegarao City
                    </p>
                    <h2
                      className={cx(
                        "mt-1 font-sans text-[14px] font-black uppercase",
                      )}
                    >
                      Official Document Routing Slip
                    </h2>
                  </div>
                  <div
                    className={cx(
                      "justify-self-end border-2 border-slate-900 px-2 py-1 text-center font-sans text-[8px] font-black uppercase leading-tight",
                    )}
                  >
                    Records
                    <br />
                    Copy
                  </div>
                </header>
                <div
                  className={cx(
                    "border-b-2 border-slate-900 text-[11px] font-sans",
                  )}
                >
                  <div
                    className={cx(
                      "grid grid-cols-12 border-b border-slate-400",
                    )}
                  >
                    <div
                      className={cx(
                        "col-span-7 flex min-h-12 items-center justify-between p-1.5",
                      )}
                    >
                      <span className={cx("font-semibold text-[12px]")}>
                        No.:
                      </span>
                      <span className={cx("font-mono font-bold text-[12px]")}>
                        {docNo || activeDoc.routeNo || "___________"}
                      </span>
                    </div>
                    <div
                      className={cx(
                        "col-span-5 flex min-h-12 items-center justify-between border-l border-slate-900 p-1.5",
                      )}
                    >
                      <span className={cx("font-semibold text-[12px]")}>
                        Class:
                      </span>
                      <span
                        className={cx(
                          "font-mono font-black text-[14px] tracking-wider text-slate-900 underline",
                        )}
                      >
                        {docClass || activeDoc.direction}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cx(
                      "grid grid-cols-12 divide-x divide-slate-400 items-end",
                    )}
                  >
                    <div className={cx("col-span-4 p-1 text-center")}>
                      <div
                        className={cx(
                          "text-[11px] uppercase leading-none text-slate-500",
                        )}
                      >
                        Date:
                      </div>
                      <div
                        className={cx(
                          "text-[12px] font-bold leading-tight underline",
                        )}
                      >
                        {dateStr || "___________"}
                      </div>
                    </div>
                    <div className={cx("col-span-3 p-1")}>
                      <div
                        className={cx(
                          "text-[11px] leading-none text-slate-500",
                        )}
                      >
                        Time:
                      </div>
                      <div
                        className={cx("font-mono text-[11.5px] leading-tight")}
                      >
                        {timeStr || "___________"}
                      </div>
                    </div>
                    <div className={cx("col-span-5 p-1")}>
                      <div
                        className={cx(
                          "text-[11px] leading-none text-slate-500",
                        )}
                      >
                        By:
                      </div>
                      <div
                        className={cx(
                          "truncate text-[11.5px] font-bold leading-tight text-slate-900",
                        )}
                      >
                        {routingBy || "________________"}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cx(
                    "grid min-h-[360px] grid-cols-12 border-b-2 border-slate-900 divide-x-2 divide-slate-900 text-[10.5px] font-sans",
                  )}
                >
                  <div className={cx("col-span-5 bg-slate-50/50 p-2")}>
                    <div
                      className={cx(
                        "border-b border-slate-300 pb-0.5 text-[11px] font-black uppercase tracking-wider",
                      )}
                    >
                      Notes
                    </div>
                    <div
                      className={cx(
                        "min-h-64 whitespace-pre-wrap px-1 py-2 text-[10.5px] font-medium leading-5",
                      )}
                    >
                      {specialInstructionsText || activeDoc.remarks || "\u00A0"}
                    </div>
                    <div className={cx("space-y-3 pt-2")}>
                      <div className={cx("border-b border-slate-300")} />
                      <div className={cx("border-b border-slate-300")} />
                      <div className={cx("border-b border-slate-300")} />
                    </div>
                  </div>

                  <div className={cx("col-span-7 p-2")}>
                    <div
                      className={cx(
                        "border-b border-slate-300 pb-0.5 text-[11px] font-black uppercase tracking-wider",
                      )}
                    >
                      Routing History & Action
                    </div>
                    <div
                      className={cx(
                        "min-h-72 whitespace-pre-wrap px-1 py-2 text-[10.5px] font-medium leading-5",
                      )}
                    >
                      {routingHistoryText || "\u00A0"}
                    </div>
                    <div className={cx("space-y-3 pt-2")}>
                      <div className={cx("border-b border-slate-300")} />
                      <div className={cx("border-b border-slate-300")} />
                      <div className={cx("border-b border-slate-300")} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OFFICIAL ROUTING SLIP PRINT CANVAS - SPECIFICALLY TAILORED FOR HALF A4 BOND PAPER (A5 / 148mm x 210mm) */}
          <div
            className={cx(
              "print-half-a4-canvas w-full max-w-5xl min-w-0 bg-white text-slate-900 p-4 rounded-xl shadow-xl mx-auto font-sans print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full lg:col-start-2 lg:row-start-2",
            )}
          >
            {/* Outer Frame with exact proportions for Half A4 */}
            <div
              className={cx(
                "border-[3px] border-slate-950 p-2.5 sm:p-3.5 space-y-0 print:border-[3px] print:border-black",
              )}
            >
              {/* HEADER SECTION */}
              <div
                className={cx(
                  "grid grid-cols-[4.5rem_minmax(0,1fr)_7.5rem] items-center border-b-[3px] border-slate-950 pb-2",
                )}
              >
                <img
                  src="/blgflogo.jpg"
                  alt="BLGF seal"
                  className={cx("h-14 w-14 object-contain")}
                />

                <div
                  className={cx(
                    "space-y-0 text-center font-serif text-slate-900",
                  )}
                >
                  <div className={cx("text-[10px] leading-tight")}>
                    Republic of the Philippines
                  </div>
                  <div className={cx("text-[10px] leading-tight")}>
                    Department of Finance
                  </div>
                  <div
                    className={cx(
                      "pt-0.5 font-sans text-[15px] font-black uppercase leading-tight",
                    )}
                  >
                    Bureau of Local Government Finance
                  </div>
                  <div
                    className={cx(
                      "text-[11px] font-bold uppercase leading-tight",
                    )}
                  >
                    Regional Office No. II · Carig, Tuguegarao City
                  </div>
                  <div
                    className={cx(
                      "mt-1 font-sans text-[13px] font-black uppercase",
                    )}
                  >
                    Official Document Routing Slip
                  </div>
                </div>
                <div
                  className={cx("flex items-center justify-self-end gap-1.5")}
                >
                  <QRCodeSVG
                    value={
                      docNo || activeDoc.routeNo || activeDoc.trackingNumber
                    }
                    size={50}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    aria-label={`QR code for ${docNo || activeDoc.routeNo || activeDoc.trackingNumber}`}
                  />

                  <div
                    className={cx(
                      "border-2 border-slate-900 px-1.5 py-1 text-center font-sans text-[8px] font-black uppercase leading-tight",
                    )}
                  >
                    Records
                    <br />
                    Copy
                  </div>
                </div>
              </div>

              {/* TOP META DATA GRID */}
              <div
                className={cx(
                  "border-b-2 border-slate-900 text-[11px] font-sans",
                )}
              >
                {/* Row 1: Full recipient list on the left, No. & Class on the right */}
                <div
                  className={cx("grid grid-cols-12 border-b border-slate-400")}
                >
                  <div
                    className={cx(
                      "col-span-7 flex min-h-12 flex-col justify-center p-1.5",
                    )}
                  >
                    <div
                      className={cx(
                        "text-[10px] font-semibold uppercase leading-none text-slate-500",
                      )}
                    >
                      Recipient
                    </div>
                    <div
                      className={cx(
                        "mt-0.5 whitespace-normal break-words text-[11.5px] font-bold uppercase leading-tight tracking-tight",
                      )}
                      title={recipientListDisplay}
                    >
                      {slipLayout === "full" ? recipientListDisplay : "\u00A0"}
                    </div>
                  </div>
                  <div
                    className={cx(
                      "col-span-5 border-l border-slate-900 divide-y divide-slate-400",
                    )}
                  >
                    <div
                      className={cx(
                        "flex justify-between items-center px-1.5 py-0.5",
                      )}
                    >
                      <span className={cx("font-semibold text-[12px]")}>
                        No.:
                      </span>
                      <span className={cx("font-mono font-bold text-[12px]")}>
                        {docNo || activeDoc.routeNo || "\u00A0"}
                      </span>
                    </div>
                    <div
                      className={cx(
                        "flex justify-between items-center px-1.5 py-0.5",
                      )}
                    >
                      <span className={cx("font-semibold text-[12px]")}>
                        Class:
                      </span>
                      <span
                        className={cx(
                          "font-mono font-black text-[14px] tracking-wider text-slate-900 underline",
                        )}
                      >
                        {docClass}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Date, Time, Routed By */}
                <div
                  className={cx(
                    "grid grid-cols-12 border-b border-slate-400 divide-x divide-slate-400 items-end",
                  )}
                >
                  <div className={cx("col-span-4 p-1 text-center")}>
                    <div
                      className={cx(
                        "text-[11px] uppercase leading-none text-slate-500",
                      )}
                    >
                      Date:
                    </div>
                    <div
                      className={cx(
                        "text-[12px] font-bold leading-tight underline",
                      )}
                    >
                      {dateStr || "___________"}
                    </div>
                  </div>
                  <div className={cx("col-span-3 p-1")}>
                    <div
                      className={cx("text-[11px] leading-none text-slate-500")}
                    >
                      Time:
                    </div>
                    <div
                      className={cx("font-mono text-[11.5px] leading-tight")}
                    >
                      {timeStr || "___________"}
                    </div>
                  </div>
                  <div className={cx("col-span-5 p-1")}>
                    <div
                      className={cx("text-[11px] leading-none text-slate-500")}
                    >
                      By:
                    </div>
                    <div
                      className={cx(
                        "truncate text-[11.5px] font-bold leading-tight text-slate-900",
                      )}
                    >
                      {routingBy || routedByDisplayName}
                    </div>
                  </div>
                </div>

                {/* Row 3: Subject Matter */}
                <div
                  className={cx(
                    "grid min-h-16 grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-1.5 px-1.5 py-2",
                  )}
                >
                  <div
                    className={cx(
                      "pt-0.5 text-[11px] font-bold uppercase tracking-tight text-slate-800",
                    )}
                  >
                    Subject Matter:
                  </div>
                  <div
                    className={cx(
                      "whitespace-pre-wrap break-words text-[17px] font-bold leading-5 text-slate-900",
                    )}
                  >
                    {subjectMatter}
                  </div>
                </div>
              </div>

              {/* MAIN TWO-COLUMN ROUTING CONTENT */}
              <div
                className={cx(
                  "grid min-h-[290px] grid-cols-12 border-b-2 border-slate-900 divide-x-2 divide-slate-900 text-[10.5px] font-sans",
                )}
              >
                {/* LEFT COLUMN: ASSIGNED TO & FOR (Actions) */}
                <div className={cx("col-span-5 p-2 space-y-2 bg-slate-50/50")}>
                  {/* ASSIGNED TO SECTION */}
                  <div className={cx("space-y-1")}>
                    <div
                      className={cx(
                        "font-black text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 flex justify-between items-center",
                      )}
                    >
                      <span>ASSIGNED TO:</span>
                    </div>

                    <div className={cx("space-y-0.5 pl-0.5 pt-0.5")}>
                      {ROUTING_SLIP_DIVISIONS.map(({ code, label }) => (
                        <div
                          key={code}
                          onClick={() => {
                            if (slipLayout === "full") toggleAssigned(label);
                          }}
                          className={cx(
                            `flex items-center space-x-1.5 select-none py-0.5 ${
                              slipLayout === "full"
                                ? "cursor-pointer hover:text-slate-700"
                                : "cursor-default"
                            }`,
                          )}
                        >
                          <span className={cx("text-slate-900")}>
                            {assignedTo[label] ? (
                              <CheckSquare
                                className={cx(
                                  "w-3.5 h-3.5 text-slate-900 fill-slate-200",
                                )}
                              />
                            ) : (
                              <Square
                                className={cx("w-3.5 h-3.5 text-slate-400")}
                              />
                            )}
                          </span>
                          <span
                            className={cx(
                              `text-[10.5px] ${assignedTo[label] ? "font-black text-slate-900" : "font-medium text-slate-700"}`,
                            )}
                          >
                            {label} ({code})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FOR (Action Items) SECTION */}
                  <div className={cx("space-y-1 pt-1")}>
                    <div
                      className={cx(
                        "font-black text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5",
                      )}
                    >
                      FOR:
                    </div>

                    <div className={cx("space-y-0.5 pl-0.5 pt-0.5")}>
                      {ROUTING_SLIP_ACTIONS.map((act) => (
                        <div
                          key={act}
                          onClick={() => {
                            if (slipLayout === "full") toggleForAction(act);
                          }}
                          className={cx(
                            `flex items-center space-x-1.5 select-none py-0.5 ${
                              slipLayout === "full"
                                ? "cursor-pointer hover:text-slate-700"
                                : "cursor-default"
                            }`,
                          )}
                        >
                          <span className={cx("text-slate-900")}>
                            {forActions[act] ? (
                              <CheckSquare
                                className={cx(
                                  "w-3.5 h-3.5 text-slate-900 fill-slate-200",
                                )}
                              />
                            ) : (
                              <Square
                                className={cx("w-3.5 h-3.5 text-slate-400")}
                              />
                            )}
                          </span>
                          <span
                            className={cx(
                              `text-[10.5px] ${forActions[act] ? "font-black text-slate-900" : "font-medium text-slate-700"}`,
                            )}
                          >
                            {act}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: ROUTING LOGS, DISPATCH & REMARKS GRID */}
                <div
                  className={cx(
                    "col-span-7 flex flex-col justify-between space-y-2 p-2",
                  )}
                >
                  {/* Received / Dispatch rows shown below the routing history */}
                  <div
                    className={cx(
                      "order-last shrink-0 space-y-1.5 text-[10.5px]",
                    )}
                  >
                    <div
                      className={cx(
                        "grid min-h-6 grid-cols-[6.5rem_1fr] items-end gap-2",
                      )}
                    >
                      <span
                        className={cx("px-1.5 py-1 font-bold text-slate-900")}
                      >
                        Received Records
                      </span>
                      <span
                        className={cx(
                          "min-h-6 border-b border-slate-400 px-1.5 py-1 font-mono text-slate-700",
                        )}
                      >
                        {recipientListDisplay || "\u00A0"}
                      </span>
                    </div>

                    <div
                      className={cx(
                        "grid min-h-6 grid-cols-[6.5rem_1fr] items-end gap-2",
                      )}
                    >
                      <span
                        className={cx(
                          "px-1.5 py-1 font-semibold text-slate-800",
                        )}
                      >
                        Date
                      </span>
                      <span
                        className={cx(
                          "min-h-6 border-b border-slate-400 px-1.5 py-1 font-mono text-slate-700",
                        )}
                      >
                        {receivedRecordsDate ||
                          latestTransactionDateDisplay ||
                          dateStr ||
                          "\u00A0"}
                      </span>
                    </div>

                    <div
                      className={cx(
                        "grid min-h-6 grid-cols-[6.5rem_1fr] items-end gap-2",
                      )}
                    >
                      <span
                        className={cx(
                          "px-1.5 py-1 font-semibold text-slate-800",
                        )}
                      >
                        Dispatch
                      </span>
                      <span
                        className={cx(
                          "min-h-6 border-b border-slate-400 px-1.5 py-1 font-mono text-slate-700",
                        )}
                      >
                        {dispatchInfo || "\u00A0"}
                      </span>
                    </div>

                    <div
                      className={cx(
                        "grid min-h-6 grid-cols-[6.5rem_1fr] items-end gap-2",
                      )}
                    >
                      <span
                        className={cx(
                          "px-1.5 py-1 font-semibold text-slate-800",
                        )}
                      >
                        Answer
                      </span>
                      <span
                        className={cx(
                          "min-h-6 border-b border-slate-400 px-1.5 py-1 font-mono text-slate-700",
                        )}
                      >
                        {answerInfo || "\u00A0"}
                      </span>
                    </div>

                    <div
                      className={cx(
                        "grid min-h-6 grid-cols-[6.5rem_1fr_2.5rem_1fr] items-end gap-2",
                      )}
                    >
                      <span
                        className={cx("px-1.5 py-1 font-bold text-slate-900")}
                      >
                        Filed
                      </span>
                      <span
                        className={cx(
                          "min-h-6 border-b border-slate-400 px-1.5 py-1 font-mono text-slate-700",
                        )}
                      >
                        Date: {filedDate || "\u00A0"}
                      </span>
                      <span
                        className={cx(
                          "px-1.5 py-1 font-semibold text-slate-800",
                        )}
                      >
                        No.
                      </span>
                      <span
                        className={cx(
                          "min-h-6 border-b border-slate-400 px-1.5 py-1 font-mono text-slate-700",
                        )}
                      >
                        {filedNo || "\u00A0"}
                      </span>
                    </div>
                  </div>

                  {/* Digital & Physical Action History Grid */}
                  <div className={cx("order-first flex-1 space-y-1.5")}>
                    <div
                      className={cx(
                        "flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-600",
                      )}
                    >
                      <span>Routing History & Action Notes</span>
                    </div>

                    {/* Actual Route Entries */}
                    <div
                      className={cx(
                        "relative grid grid-cols-1 gap-y-1 text-[10.5px] before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-300",
                      )}
                    >
                      {slipLayout === "simplified" ? (
                        <div
                          className={cx(
                            "min-h-24 whitespace-pre-wrap border-b border-slate-200 py-1 pl-5 text-[10px] font-medium leading-4 text-slate-800",
                          )}
                        >
                          {routingHistoryText || "\u00A0"}
                        </div>
                      ) : groupedVisibleRoutes.length > 0 ? (
                        groupedVisibleRoutes.map((rt, routeIndex) => (
                          <div
                            key={rt.id}
                            className={cx(
                              "relative min-w-0 space-y-0.5 border-b border-slate-200 py-1 pl-5",
                            )}
                          >
                            <span
                              className={cx(
                                "absolute left-0 top-2 z-10 flex h-3 w-3 items-center justify-center rounded-full bg-blue-600 text-[7px] font-black leading-none text-white ring-1 ring-white",
                              )}
                            >
                              {routeIndex + 1}
                            </span>
                            <div
                              className={cx("min-w-0 font-bold text-slate-900")}
                            >
                              <span
                                className={cx("block truncate")}
                                title={rt.recipientNames.join(", ")}
                              >
                                Forwarded to: {rt.recipientNames.join(", ")}
                              </span>
                            </div>
                            <div
                              className={cx(
                                "font-mono text-[9.5px] text-slate-500",
                              )}
                            >
                              {formatDate(rt.createdAt)}
                            </div>
                            <div
                              className={cx(
                                "text-[10px] font-semibold text-amber-800",
                              )}
                            >
                              Action:{" "}
                              {rt.actionRequested || "Appropriate Action"}
                            </div>
                            {rt.remarks && (
                              <div className={cx("text-[10px] text-slate-700")}>
                                Notes: {rt.remarks}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div
                          className={cx(
                            "p-1.5 text-[10.5px] italic text-slate-500",
                          )}
                        >
                          Initial Document Logging & Routing setup in progress.
                        </div>
                      )}

                      {specialInstructionsText && (
                        <div
                          className={cx(
                            "p-1 bg-amber-50/60 border-t border-slate-300 text-slate-800",
                          )}
                        >
                          <span
                            className={cx(
                              "block text-[9.5px] font-bold uppercase text-slate-900",
                            )}
                          >
                            Special Remarks:
                          </span>
                          <span className={cx("text-[10.5px] font-medium")}>
                            {specialInstructionsText}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Blank ruled lines for manual physical handwritten updates on printable sheet */}
                    {groupedVisibleRoutes.length <= 2 && (
                      <div className={cx("space-y-2 pt-1")}>
                        <div
                          className={cx("h-3 border-b border-slate-300")}
                        ></div>
                        <div
                          className={cx("h-3 border-b border-slate-300")}
                        ></div>
                        <div
                          className={cx("h-3 border-b border-slate-300")}
                        ></div>
                        <div
                          className={cx("h-3 border-b border-slate-300")}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTTOM SIGNATURE SECTION */}
              <div
                className={cx("pt-2 flex justify-between items-end font-sans")}
              >
                <div className={cx("space-y-0.5")}>
                  <div
                    className={cx(
                      "text-[11px] font-bold uppercase tracking-tight text-slate-900",
                    )}
                  >
                    Noted by RD
                  </div>
                  <div className={cx("pl-4 pt-1")}>
                    <div
                      className={cx(
                        "inline-block border-b-2 border-slate-900 pr-4 font-serif text-[13px] font-black uppercase text-slate-900",
                      )}
                    >
                      {rdName}
                    </div>
                    <div
                      className={cx(
                        "mt-0.5 text-[11px] font-bold text-slate-700",
                      )}
                    >
                      {rdPosition || "Regional Director"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function DocumentSlipViewDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles styles={[createDocumentSlipViewStyles(theme)]} />
  );
}
