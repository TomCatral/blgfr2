// Header: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { Box, Typography, Button, IconButton, InputAdornment, TextField } from "@mui/material";
import { cx } from "../styles/muiClasses";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Search,
  Shield,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Menu,
  ScanLine,
  Camera,
  Download,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode } from "html5-qrcode";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// RESPONSIVE LAYOUT: Component rules na ginagamit ng shared layout.
// BASE CSS: Pangunahing design ng component.
const headerbaseCss = [
  // @media screen and (max-width: 767px)
  `.app-top-agency-bar {
    display: none !important;
  }`,
  // @media screen and (max-width: 767px)
  `.app-main-header {
    height: auto !important;
    min-height: 6.75rem;
    padding: 0.6rem 0.75rem !important;
    display: grid !important;
    grid-template-columns: auto 1fr;
    gap: 0.6rem 0.75rem;
  }`,
  // @media screen and (max-width: 767px)
  `.header-brand {
    grid-column: 1;
    min-width: 0;
  }`,
  // @media screen and (max-width: 767px)
  `.header-brand > img {
    width: 2.25rem !important;
    height: 2.25rem !important;
  }`,
  // @media screen and (max-width: 767px)
  `.header-actions {
    grid-column: 2;
    justify-self: end;
    gap: 0.4rem !important;
    min-width: 0;
  }`,
  // @media screen and (max-width: 767px)
  `.header-actions > button {
    width: 2.5rem;
    height: 2.5rem;
    flex: 0 0 2.5rem;
  }`,
];

// RESPONSIVE LAYOUT: Component rules na ginagamit ng shared layout.
// BASE CSS: Pangunahing design ng component.
const headerSystemDesignCss = [
  `.mui-systemdesign-system .app-main-header {
  background: rgb(255 255 255 / 94%) !important;
  border-color: var(--ui-border) !important;
  box-shadow: 0 0.2rem 0.8rem rgb(15 23 42 / 5%);
}`,
  `.mui-systemdesign-system .header-brand img {
  filter: drop-shadow(0 0.2rem 0.35rem rgb(15 23 42 / 12%));
}`,
  `.mui-systemdesign-system .header-brand {
  letter-spacing: -0.015em;
}`,
  `.mui-systemdesign-system .header-actions > button {
  border-radius: 0.8rem !important;
  box-shadow: 0 0.2rem 0.55rem rgb(15 23 42 / 6%);
}`,
  `.dark.mui-systemdesign-system .app-main-header {
  background: rgb(15 23 42 / 94%) !important;
  border-color: var(--ui-border) !important;
}`,
];

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface HeaderProps {
  currentUser: any;
  users?: any[];
  documents?: any[];
  notifications: any[];
  onOpenCreateDoc: () => void;
  onOpenQuickRoute?: () => void;
  onSearchDoc: (query: string) => void;
  onSelectDoc?: (doc: any) => void;
  onOpenNotifications: () => void;
  onLogout?: () => void;
  activeView: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenMobileSidebar?: () => void;
  isOnline?: boolean;
}

// LOGIC: State, events, at pagproseso ng data.
export const Header = ({
  currentUser,
  users = [],
  documents = [],
  notifications,
  onOpenNotifications,
  onLogout,
  onSearchDoc,
  onSelectDoc,
  isDarkMode,
  onToggleDarkMode,
  onOpenMobileSidebar,
  isOnline = true,
}: HeaderProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isUserStatusOpen, setIsUserStatusOpen] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const documentsRef = useRef(documents);
  const onSearchDocRef = useRef(onSearchDoc);
  const onSelectDocRef = useRef(onSelectDoc);

  useEffect(() => {
    documentsRef.current = documents;
    onSearchDocRef.current = onSearchDoc;
    onSelectDocRef.current = onSelectDoc;
  }, [documents, onSearchDoc, onSelectDoc]);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === "accepted") setIsAppInstalled(true);
      setInstallPrompt(null);
      return;
    }
    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(
      isAppleMobile
        ? "To install DTS on iPhone or iPad: open this page in Safari, tap the Share button, then select “Add to Home Screen.”"
        : "To install DTS: open this site in Chrome or Edge, open the browser menu, then select “Install app” or “Add to Home screen.”",
    );
  };

// Filter documents by tracking number (route no.), title & subject, and
  // other document details. Each recommendation remembers which field matched
  // so the dropdown can show a "Matched in …" hint.
  const searchResults = searchQuery.trim()
    ? documents
        .map((d: any) => {
          const query = searchQuery.trim().toLowerCase();
          const fields: Array<[string, string]> = [
            ["Tracking No.", `${d.routeNo || d.trackingNumber || ""}`],
            ["Title", `${d.title || ""}`],
            ["Subject", `${d.subject || ""}`],
            ["Originating Office", `${d.originatingOffice || ""}`],
            ["Sender", `${d.senderName || ""}`],
            ["Division", `${d.currentDivision || ""}`],
            ["Category", `${d.category || ""}`],
          ];
          const matchedField = fields.find(([, value]) =>
            value.toLowerCase().includes(query),
          )?.[0];
          const matchedInTags = (d.tags || []).some((t: string) =>
            t.toLowerCase().includes(query),
          );
          if (!matchedField && !matchedInTags) return null;
          return {
            doc: d,
            matchedField: matchedInTags ? "Tags" : matchedField,
          };
        })
        .filter(Boolean)
    : [];
const wasForwardedToCurrentUser = (document: any) =>
    Boolean(
      document.routes?.some((route: any) => route.toUserId === currentUser?.id),
    );
  const getCurrentUserAction = (document: any) =>
    [...(document.routes || [])]
      .reverse()
      .find((route: any) => route.toUserId === currentUser?.id)
      ?.actionRequested ||
    document.actionRequested ||
    "N/A";

  const uc = notifications?.length || 0;

  const badgeMap: any = {
    SYSTEM_ADMIN:
      "bg-gradient-to-r from-purple-500 to-violet-500 text-white border-purple-300 dark:border-purple-700",
    ADMIN:
      "bg-gradient-to-r from-sky-500 to-blue-500 text-white border-sky-300 dark:border-sky-700",
    RECORDS_OFFICER:
      "bg-gradient-to-r from-slate-500 to-cyan-500 text-white border-slate-300 dark:border-slate-700",
    DIVISION_CHIEF:
      "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-300 dark:border-emerald-700",
    ACTION_OFFICER:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 dark:border-amber-700",
    STAFF:
      "bg-gradient-to-r from-slate-500 to-slate-600 text-white border-slate-300 dark:border-slate-700",
  };
  const badge = "bg-slate-700 text-white border-slate-600";

  const processScannedCode = useCallback((decodedText: string) => {
    const rawCode = decodedText.trim();
    const routeNumber =
      rawCode.match(/BLGFR2-\d{4}-\d{2}-(?:IN|OUT)-\d+/i)?.[0] || rawCode;
    const scannedCode = routeNumber.trim();
    if (!scannedCode) return;
    setSearchQuery(scannedCode);
    setIsSearchFocused(false);
    const exactDocument = documentsRef.current.find(
      (document: any) =>
        document.routeNo?.toLowerCase() === scannedCode.toLowerCase(),
    );
    if (exactDocument && onSelectDocRef.current) {
      setIsScannerOpen(false);
      onSelectDocRef.current(exactDocument);
    } else {
      setScannerError(`No document found for QR code: ${scannedCode}`);
      onSearchDocRef.current(scannedCode);
    }
  }, []);

  // Handle scroll detection for shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isScannerOpen) return;

    let disposed = false;
    const scannerElement = document.getElementById("document-search-scanner");
    if (scannerElement) scannerElement.replaceChildren();
    const scanner = new Html5Qrcode("document-search-scanner");
    scannerRef.current = scanner;
    setScannerError("");

    const startScanner = async () => {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length)
        throw new Error("No camera was found on this device.");
      const preferredCamera =
        [...cameras]
          .reverse()
          .find((camera) => /back|rear|environment/i.test(camera.label)) ||
        cameras[cameras.length - 1];
      await scanner.start(
        preferredCamera.id,
        {
          fps: 15,
          qrbox: (width, height) => ({
            width: Math.min(260, Math.floor(width * 0.8)),
            height: Math.min(260, Math.floor(height * 0.8)),
          }),
          aspectRatio: 1,
        },
        (decodedText) => {
          if (!disposed) processScannedCode(decodedText);
        },
        () => undefined,
      );
    };

    startScanner()
      .then(async () => {
        if (disposed && scanner.isScanning) {
          await scanner.stop().catch(() => undefined);
          scanner.clear();
        }
      })
      .catch((error: any) => {
        if (!disposed) {
          setScannerError(
            error?.message ||
              "Camera access failed. Allow camera permission and open the application through HTTPS.",
          );
        }
      });

    return () => {
      disposed = true;
      scannerRef.current = null;
      if (scanner.isScanning) {
        void scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => undefined)
          .finally(() => scannerElement?.replaceChildren());
      } else {
        try {
          scanner.clear();
        } catch {
          // The scanner may not have initialized after a permission error.
        }
        scannerElement?.replaceChildren();
      }
    };
  }, [isScannerOpen, processScannedCode]); // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

// Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchDoc(searchQuery.trim());
    }
  };

  // Highlight matched portion of a search term inside result text
  const highlightMatch = (text: string, query: string) => {
    const q = query.trim();
    const source = String(text || '');
    if (!q || !source) return source;
    const index = source.toLowerCase().indexOf(q.toLowerCase());
    if (index === -1) return source;
    return (
      <>
        {source.slice(0, index)}
        <span
          className={cx(
            "rounded-sm bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200",
          )}
        >
          {source.slice(index, index + q.length)}
        </span>
        {source.slice(index + q.length)}
      </>
    );
  };

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <HeaderDesign />
      {
        <header
          className={cx(
            `sticky top-0 z-30 transition-all duration-300 ${
              scrolled
                ? "shadow-lg shadow-slate-900/10 dark:shadow-black/30"
                : "shadow-sm"
            }`,
          )}
        >
          {/* ===== Accent Gradient Border ===== */}


          {/* ===== Top Bar: Republic Header ===== */}


          {/* ===== Main Header Bar ===== */}
          <Box
            className={cx(
              "app-main-header h-[68px] min-w-0 px-4 md:px-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60",
            )}
           sx={{ minHeight: 76, px: { xs: 1.5, md: 3 }, gap: 2, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
            {/* Left: Logo & Title */}
            <div
              className={cx(
                "header-brand min-w-0 shrink flex items-center gap-3",
              )}
            >
              <Button
                type="button"
                onClick={onOpenMobileSidebar}
                className={cx(
                  "md:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
                )}
                aria-label="Open navigation menu"
                title="Open navigation menu"
               sx={{ display: { xs: "inline-flex", md: "none" }, minWidth: 40, p: 0 }}>
                <Menu className={cx("h-5 w-5")} />
              </Button>
            <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 180 }}><Typography sx={{ fontWeight: 700, letterSpacing: '.12em', fontSize: 13 }}>BLGF REGION II</Typography><Typography variant="caption" color="text.secondary">Document workspace</Typography></Box></div>

            {/* Center: Global Search */}
            <div
              className={cx(
                "global-document-search relative min-w-0 flex-1 max-w-md mx-2 md:mx-4",
              )}
            >
              <TextField
                inputRef={searchInputRef}
                fullWidth
                size="small"
                placeholder="Search documents... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    setIsSearchFocused(false);
                    searchInputRef.current?.blur();
                  }
                  if (e.key === "Enter") {
                    handleSearchSubmit(e);
                    setIsSearchFocused(false);
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={17} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end" sx={{ gap: 0.25 }}>
                        {searchQuery.trim() && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSearchQuery("");
                              searchInputRef.current?.focus();
                            }}
                            aria-label="Clear search"
                          >
                            <X size={16} />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => {
                            setIsSearchFocused(false);
                            setScannerError("");
                            setIsScannerOpen(true);
                          }}
                          title="Scan document barcode or QR code"
                          aria-label="Scan document barcode or QR code"
                        >
                          <ScanLine size={17} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 44,
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                    boxShadow: "0 1px 2px rgba(24,24,27,.03)",
                  },
                  "& .MuiInputBase-input": {
                    minHeight: "0 !important",
                    padding: "10px 0 !important",
                    border: "0 !important",
                    background: "transparent !important",
                    boxShadow: "none !important",
                    fontSize: 13,
                  },
                  "& .MuiIconButton-root": { width: 32, height: 32 },
                }}
              />

              {/* Search Dropdown Results */}
              <AnimatePresence>
                {isSearchFocused && searchQuery.trim() && (
                  <motion.div
                    ref={searchDropdownRef}
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className={cx(
                      "absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl shadow-slate-900/15 dark:shadow-black/40 z-50 max-h-[70vh] overflow-hidden",
                    )}
                  >
                    {searchResults.length === 0 ? (
                      <div className={cx("p-6 text-center")}>
                        <Search
                          className={cx(
                            "w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2",
                          )}
                        />
                        <p
                          className={cx(
                            "text-xs font-bold text-slate-500 dark:text-slate-400",
                          )}
                        >
                          No documents found
                        </p>
                        <p
                          className={cx(
                            "text-[10px] text-slate-400 dark:text-slate-500 mt-0.5",
                          )}
                        >
                          Try a different search term
                        </p>
                      </div>
                    ) : (
                      <>
                        <div
                          className={cx(
                            "px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between",
                          )}
                        >
                          <span
                            className={cx(
                              "text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                            )}
                          >
                            Documents ({searchResults.length})
                          </span>
                          <Button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onSearchDoc(searchQuery.trim());
                              setSearchQuery("");
                              setIsSearchFocused(false);
                            }}
                            className={cx(
                              "text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:underline",
                            )}
                          >
                            View all results →
                          </Button>
                        </div>
                        <div
                          className={cx(
                            "max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800",
                          )}
                        >
{searchResults.slice(0, 8).map(
                            ({ doc, matchedField }: any) => (
                            <Button
                              type="button"
                              key={doc.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (onSelectDoc) {
                                  onSelectDoc(doc);
                                }
                                setSearchQuery("");
                                setIsSearchFocused(false);
                              }}
                              className={cx(
                                "w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer",
                              )}
                            >
<div
                                className={cx(
                                  "flex items-start justify-between gap-2",
                                )}
                              >
                                <div className={cx("min-w-0 flex-1")}>
                                  <div
                                    className={cx("flex items-center gap-1.5")}
                                  >
                                    <span
                                      className={cx(
                                        "font-mono text-[11px] font-extrabold text-blue-700 dark:text-blue-400 truncate",
                                      )}
                                    >
                                      {highlightMatch(
                                        doc.routeNo || doc.trackingNumber || "",
                                        searchQuery,
                                      )}
                                    </span>
                                    <span
                                      className={cx(
                                        `inline-flex shrink-0 items-center text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          doc.direction === "INCOMING"
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                            : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                        }`,
                                      )}
                                    >
                                      {doc.direction === "INCOMING" ? (
                                        <ArrowDownLeft
                                          className={cx("w-2.5 h-2.5 mr-0.5")}
                                        />
                                      ) : (
                                        <ArrowUpRight
                                          className={cx("w-2.5 h-2.5 mr-0.5")}
                                        />
                                      )}
                                      {doc.direction}
                                    </span>
                                  </div>
                                  <div
                                    className={cx(
                                      "flex items-center gap-1.5 mt-1",
                                    )}
                                  >
                                    <FileText
                                      className={cx(
                                        "w-3.5 h-3.5 text-slate-500 shrink-0",
                                      )}
                                    />
                                    <span
                                      className={cx(
                                        "text-xs font-bold text-slate-900 dark:text-white truncate",
                                      )}
                                    >
                                      {highlightMatch(doc.title, searchQuery)}
                                    </span>
                                  </div>
<p
                                    className={cx(
                                      "text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5",
                                    )}
                                  >
                                    {highlightMatch(doc.subject, searchQuery)}
                                  </p>
                                  {matchedField && (
                                    <span
                                      className={cx(
                                        "mt-1 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300",
                                      )}
                                    >
                                      Matched in {matchedField}
                                    </span>
                                  )}
                                  <p
                                    className={cx(
                                      "mt-0.5 max-w-64 truncate text-[9px] font-semibold text-amber-700 dark:text-amber-400",
                                    )}
                                  >
                                    Action: {getCurrentUserAction(doc)}
                                  </p>
                                  {wasForwardedToCurrentUser(doc) && (
                                    <span
                                      className={cx(
                                        "mt-1 inline-flex rounded bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
                                      )}
                                    >
                                      Forwarded to you
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={cx(
                                    "flex flex-col items-end gap-1 shrink-0",
                                  )}
                                >
                                  <span
                                    className={cx(
                                      "text-[9px] font-bold text-slate-400 dark:text-slate-500",
                                    )}
                                  >
                                    {doc.currentDivision}
                                  </span>
                                  <span
                                    className={cx(
                                      `text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        doc.currentStatus === "COMPLETED"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                          : doc.currentStatus === "IN_PROGRESS"
                                            ? "bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300"
                                            : doc.currentStatus === "PENDING"
                                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                              : doc.currentStatus ===
                                                  "FOR_SIGNATURE"
                                                ? "bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300"
                                                : doc.currentStatus ===
                                                    "RETURNED"
                                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                                  : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      }`,
                                    )}
                                  >
                                    Current status:{" "}
                                    {doc.currentStatus?.replaceAll("_", " ")}
                                  </span>
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                        {searchResults.length > 8 && (
                          <div
                            className={cx(
                              "px-3 py-2 border-t border-slate-100 dark:border-slate-800",
                            )}
                          >
                            <Button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                onSearchDoc(searchQuery.trim());
                                setSearchQuery("");
                                setIsSearchFocused(false);
                              }}
                              className={cx(
                                "w-full text-center text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:underline py-1",
                              )}
                            >
                              + {searchResults.length - 8} more results — View
                              all
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              className={cx(
                "header-actions shrink-0 flex items-center gap-2 md:gap-3",
              )}
            >
              <Button
                type="button"
                onClick={() => setIsUserStatusOpen(true)}
                title="User account and session status"
                className={cx(
                  "relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition-all duration-200 hover:bg-slate-200 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700",
                )}
              >
                <Users
                  className={cx("h-4 w-4 text-slate-600 dark:text-slate-300")}
                />
              </Button>

              {/* Dark Mode Toggle */}
              <Button
                type="button"
                onClick={onToggleDarkMode}
                title={
                  isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
                className={cx(
                  "relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm",
                )}
              >
                {isDarkMode ? (
                  <Sun className={cx("w-4 h-4 text-amber-400")} />
                ) : (
                  <Moon className={cx("w-4 h-4 text-slate-600")} />
                )}
              </Button>

              {/* Notification Bell */}
              <Button
                type="button"
                onClick={onOpenNotifications}
                title={`${uc > 0 ? uc + " unread" : "No"} notifications`}
                className={cx(
                  "relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm",
                )}
              >
                <Bell
                  className={cx("w-4 h-4 text-slate-600 dark:text-slate-300")}
                />
                {uc > 0 && (
                  <span
                    className={cx(
                      "absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold shadow-sm shadow-rose-500/30 animate-pulse",
                    )}
                  >
                    {uc > 9 ? "9+" : uc}
                  </span>
                )}
              </Button>

              {/* User Profile Dropdown */}
              <div className={cx("relative")} ref={menuRef}>
                <Button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={cx(
                    "flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm",
                  )}
                >
                  <div
                    className={cx(
                      "w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-slate-600 text-white text-xs font-bold flex items-center justify-center shadow-sm overflow-hidden",
                    )}
                  >
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={`${currentUser.fullName || "User"} profile`}
                        className={cx("h-full w-full object-cover")}
                      />
                    ) : (
                      currentUser?.fullName?.charAt(0) || "U"
                    )}
                  </div>
                  <span
                    className={cx(
                      "text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline",
                    )}
                  >
                    {currentUser?.fullName}
                  </span>
                  <motion.div
                    animate={{ rotate: showUserMenu ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className={cx("w-3.5 h-3.5 text-slate-400")} />
                  </motion.div>
                </Button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cx(
                        "absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 z-50 py-2 text-xs overflow-hidden",
                      )}
                    >
                      <div
                        className={cx(
                          "border-b border-slate-100 px-4 py-3 text-center dark:border-slate-800",
                        )}
                      >
                        <p
                          className={cx(
                            "mb-2 text-[11px] font-extrabold text-slate-700 dark:text-slate-200",
                          )}
                        >
                          Install DTS on Android or iOS
                        </p>
                        {!isAppInstalled && (
                          <Button
                            type="button"
                            onClick={handleInstallApp}
                            className={cx(
                              "mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-500",
                            )}
                          >
                            <Download className={cx("h-3.5 w-3.5")} />
                            <span>Install DTS App</span>
                          </Button>
                        )}
                        {isAppInstalled && (
                          <p
                            className={cx(
                              "mt-2 text-[10px] font-bold text-emerald-600",
                            )}
                          >
                            DTS app is installed
                          </p>
                        )}
                      </div>

                      {/* User info header */}
                      <div
                        className={cx(
                          "px-4 py-3 border-b border-slate-100 dark:border-slate-800",
                        )}
                      >
                        <div className={cx("flex items-center gap-3")}>
                          <div
                            className={cx(
                              "w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-slate-600 text-white text-sm font-bold flex items-center justify-center shadow-md overflow-hidden ring-2 ring-white dark:ring-slate-800",
                            )}
                          >
                            {currentUser?.avatarUrl ? (
                              <img
                                src={currentUser.avatarUrl}
                                alt={`${currentUser.fullName || "User"} profile`}
                                className={cx("h-full w-full object-cover")}
                              />
                            ) : (
                              currentUser?.fullName?.charAt(0) || "U"
                            )}
                          </div>
                          <div className={cx("flex-1 min-w-0")}>
                            <p
                              className={cx(
                                "font-bold text-sm text-slate-900 dark:text-white truncate",
                              )}
                            >
                              {currentUser?.fullName}
                            </p>
                            <p
                              className={cx(
                                "text-[11px] text-slate-400 dark:text-slate-500 truncate",
                              )}
                            >
                              {currentUser?.designation}
                            </p>
                          </div>
                        </div>
                        <div className={cx("mt-2 flex items-center gap-1.5")}>
                          <span
                            className={cx(
                              "px-2 py-0.5 rounded-md font-bold text-[10px] border " +
                                badge,
                            )}
                          >
                            {currentUser?.role?.replace("_", " ") || "STAFF"}
                          </span>
                          {currentUser?.divisionCode && (
                            <span
                              className={cx(
                                "px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[10px] border border-slate-200 dark:border-slate-700",
                              )}
                            >
                              {currentUser.divisionCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Info */}
                      <div
                        className={cx(
                          "px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center font-medium",
                        )}
                      >
                        Logged in as {currentUser?.fullName}
                      </div>

                      {/* Actions Footer */}
                      <div className={cx("px-2 py-1.5 space-y-1")}>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            if (onLogout) onLogout();
                          }}
                          className={cx(
                            "w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all duration-150 cursor-pointer",
                          )}
                        >
                          <svg
                            className={cx("w-4 h-4")}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          <span className={cx("text-xs font-bold")}>
                            Sign Out / Logout
                          </span>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Box>

          <AnimatePresence>
            {isUserStatusOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cx(
                  "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs",
                )}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                    setIsUserStatusOpen(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 8 }}
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
                        className={cx(
                          "text-sm font-extrabold text-slate-900 dark:text-white",
                        )}
                      >
                        User Account & Session Status
                      </h2>
                      <p className={cx("mt-0.5 text-[10px] text-slate-500")}>
                        {users.length} registered user
                        {users.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className={cx("flex items-center gap-2")}>
                      <span
                        className={cx(
                          `flex items-center gap-1 text-[9px] font-bold ${isOnline ? "text-emerald-600" : "text-rose-600"}`,
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
                      const online = user.id === currentUser?.id && isOnline;
                      const initials = String(user.fullName || "User")
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
                              {initials}
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
                                "truncate text-[10px] text-slate-500",
                              )}
                            >
                              {user.designation || user.role} ·{" "}
                              {user.divisionCode}
                            </p>
                            <div
                              className={cx(
                                "mt-1 flex gap-2 text-[9px] font-bold",
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
                                  online ? "text-slate-600" : "text-slate-400",
                                )}
                              >
                                {online ? "ONLINE" : "OFFLINE"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isScannerOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cx(
                  "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-4",
                )}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget)
                    setIsScannerOpen(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  className={cx(
                    "w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
                  )}
                >
                  <div
                    className={cx(
                      "flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700",
                    )}
                  >
                    <h2
                      className={cx(
                        "flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white",
                      )}
                    >
                      <Camera className={cx("h-5 w-5 text-slate-600")} />
                      Scan QR Code
                    </h2>
                    <Button
                      type="button"
                      onClick={() => setIsScannerOpen(false)}
                      className={cx(
                        "rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                      aria-label="Close scanner"
                    >
                      <X className={cx("h-5 w-5")} />
                    </Button>
                  </div>
                  <div className={cx("p-3")}>
                    <div
                      id="document-search-scanner"
                      className={cx(
                        "aspect-square w-full overflow-hidden rounded-xl bg-black",
                      )}
                    />

                    {scannerError && (
                      <p
                        className={cx(
                          "mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
                        )}
                      >
                        {scannerError}
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      }
    </>
  );
};

export default Header;

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function HeaderDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[
        "@media screen and (max-width: 767px) {" + headerbaseCss[0] + "}",
        "@media screen and (max-width: 767px) {" + headerbaseCss[1] + "}",
        "@media screen and (max-width: 767px) {" + headerbaseCss[2] + "}",
        "@media screen and (max-width: 767px) {" + headerbaseCss[3] + "}",
        "@media screen and (max-width: 767px) {" + headerbaseCss[4] + "}",
        "@media screen and (max-width: 767px) {" + headerbaseCss[5] + "}",
        headerSystemDesignCss[0],
        headerSystemDesignCss[1],
        headerSystemDesignCss[2],
        headerSystemDesignCss[3],
        headerSystemDesignCss[4],
      ]}
    />
  );
}
