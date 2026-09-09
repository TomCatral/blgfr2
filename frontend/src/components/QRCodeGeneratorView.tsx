// QRCodeGeneratorView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import { Button } from "@mui/material";
import React, { useState, useRef } from "react";
import { QrCode, Download, Printer, Copy, Check, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for QRCodeGeneratorView.
// BASE CSS: Pangunahing design ng component.
const qRCodeGeneratorViewCss = `/* QRCodeGeneratorView.module.css */
.mui-qrcodegeneratorview-page { max-width: 56rem; margin: 0 auto; display: grid; gap: 1.25rem; }
.mui-qrcodegeneratorview-hero, .mui-qrcodegeneratorview-card, .mui-qrcodegeneratorview-previewCard { background: #fff; border: 1px solid #e4e4e7; box-shadow: 0 1px 2px rgb(15 23 42 / .04); }
.mui-qrcodegeneratorview-hero { padding: 1.25rem; border-radius: 1rem; }.mui-qrcodegeneratorview-heroContent { display: flex; align-items: center; gap: .75rem; }
.mui-qrcodegeneratorview-heroIcon { display: grid; place-items: center; padding: .625rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fafafa; }
.mui-qrcodegeneratorview-largeIcon { width: 1.5rem; height: 1.5rem; color: #3f3f46; }.mui-qrcodegeneratorview-title { margin: 0; color: #18181b; font-size: 1.125rem; font-weight: 800; }
.mui-qrcodegeneratorview-subtitle { margin: .125rem 0 0; color: #71717a; font-size: .75rem; }.mui-qrcodegeneratorview-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(17rem, 1fr); gap: 1.25rem; }
.mui-qrcodegeneratorview-formColumn { display: grid; gap: 1rem; }.mui-qrcodegeneratorview-card, .mui-qrcodegeneratorview-previewCard { padding: 1.25rem; border-radius: .75rem; }.mui-qrcodegeneratorview-card { display: grid; gap: 1rem; }
.mui-qrcodegeneratorview-label, .mui-qrcodegeneratorview-smallLabel { display: block; color: #3f3f46; font-weight: 700; }.mui-qrcodegeneratorview-label { margin-bottom: .375rem; font-size: .75rem; }.mui-qrcodegeneratorview-smallLabel { margin-bottom: .25rem; font-size: .625rem; }
.mui-qrcodegeneratorview-inputRow, .mui-qrcodegeneratorview-sizeRow { display: flex; align-items: center; gap: .75rem; }.mui-qrcodegeneratorview-textInput, .mui-qrcodegeneratorview-sizeInput, .mui-qrcodegeneratorview-rangeField { border: 1px solid #e4e4e7; border-radius: .5rem; outline: none; background: #fafafa; color: #18181b; font-size: .75rem; }
.mui-qrcodegeneratorview-textInput { min-width: 0; flex: 1; padding: .625rem; }.mui-qrcodegeneratorview-sizeInput { width: 6rem; padding: .375rem .5rem; font-weight: 700; }.mui-qrcodegeneratorview-rangeField { width: 100%; padding: .5rem; background: #fff; font-weight: 700; }
.mui-qrcodegeneratorview-textInput:focus, .mui-qrcodegeneratorview-sizeInput:focus, .mui-qrcodegeneratorview-rangeField:focus { border-color: #71717a; box-shadow: 0 0 0 2px rgb(59 130 246 / .22); }
.mui-qrcodegeneratorview-primaryButton, .mui-qrcodegeneratorview-rangeButton, .mui-qrcodegeneratorview-printRangeButton, .mui-qrcodegeneratorview-clearButton, .mui-qrcodegeneratorview-recentCode, .mui-qrcodegeneratorview-actionButton { border-radius: .5rem; font-weight: 700; cursor: pointer; transition: background-color .15s, border-color .15s, color .15s; }
.mui-qrcodegeneratorview-primaryButton, .mui-qrcodegeneratorview-rangeButton { border: 0; background: #3f3f46; color: #fff; }.mui-qrcodegeneratorview-primaryButton { display: inline-flex; align-items: center; justify-content: center; gap: .375rem; padding: .5rem 1rem; font-size: .75rem; }
.mui-qrcodegeneratorview-primaryButton:hover, .mui-qrcodegeneratorview-rangeButton:hover { background: #27272a; }.mui-qrcodegeneratorview-buttonIcon { width: 1rem; height: 1rem; }.mui-qrcodegeneratorview-rangeInput { flex: 1; accent-color: #3f3f46; }.mui-qrcodegeneratorview-unit, .mui-qrcodegeneratorview-helpText { color: #71717a; font-size: .625rem; }.mui-qrcodegeneratorview-unit { font-weight: 700; }.mui-qrcodegeneratorview-helpText { margin: .25rem 0 0; }
.mui-qrcodegeneratorview-rangePanel { padding: .75rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: rgb(239 246 255 / .65); }.mui-qrcodegeneratorview-rangeTitle { color: #3f3f46; font-size: .75rem; font-weight: 800; }.mui-qrcodegeneratorview-rangeHelp { margin: .25rem 0 0; color: #27272a; font-size: .625rem; }
.mui-qrcodegeneratorview-rangeGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; margin-top: .75rem; }.mui-qrcodegeneratorview-rangeButton, .mui-qrcodegeneratorview-printRangeButton { width: 100%; margin-top: .5rem; padding: .5rem .75rem; font-size: .75rem; }
.mui-qrcodegeneratorview-printRangeButton { display: flex; align-items: center; justify-content: center; gap: .5rem; border: 1px solid #3f3f46; background: #fff; color: #27272a; }.mui-qrcodegeneratorview-printRangeButton:hover { background: #fafafa; }
.mui-qrcodegeneratorview-recentSection { padding-top: .75rem; border-top: 1px solid #e4e4e7; }.mui-qrcodegeneratorview-sectionHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; }.mui-qrcodegeneratorview-sectionTitle { margin: 0; color: #3f3f46; font-size: .75rem; }
.mui-qrcodegeneratorview-clearButton { display: flex; align-items: center; gap: .25rem; padding: .25rem; border: 0; background: transparent; color: #f43f5e; font-size: .625rem; }.mui-qrcodegeneratorview-clearButton:hover { color: #be123c; }.mui-qrcodegeneratorview-smallIcon { width: .75rem; }.mui-qrcodegeneratorview-recentList { display: flex; flex-wrap: wrap; gap: .5rem; }
.mui-qrcodegeneratorview-recentCode { padding: .25rem .625rem; border: 1px solid #e4e4e7; background: #fafafa; color: #3f3f46; font-size: .625rem; }.mui-qrcodegeneratorview-recentCode:hover { background: #fafafa; }.mui-qrcodegeneratorview-recentCodeActive { border-color: #3f3f46; background: #3f3f46; color: #fff; }
.mui-qrcodegeneratorview-previewCard { display: grid; align-content: start; gap: 1rem; }.mui-qrcodegeneratorview-preview { min-width: 0; text-align: center; }.mui-qrcodegeneratorview-previewCanvas { width: 100%; overflow: hidden; padding: .5rem; border-radius: .75rem; background: #fff; }
.mui-qrcodegeneratorview-copyGrid { display: flex; width: 100%; align-items: flex-start; justify-content: center; gap: .5rem; }.mui-qrcodegeneratorview-copy { display: flex; min-width: 0; flex-direction: column; align-items: center; text-align: center; }.mui-qrcodegeneratorview-copyType { margin-bottom: .25rem; color: #3f3f46; font-size: .5rem; font-weight: 800; letter-spacing: .04em; }
.mui-qrcodegeneratorview-routeNumber { max-width: 100%; margin-top: .25rem; overflow-wrap: anywhere; color: #27272a; font: 700 .4375rem ui-monospace, monospace; }.mui-qrcodegeneratorview-placeholder { display: flex; aspect-ratio: 1; max-width: 100%; align-items: center; justify-content: center; border: 2px dashed #d4d4d8; border-radius: .5rem; background: #fafafa; color: #a1a1aa; }
.mui-qrcodegeneratorview-placeholderContent { text-align: center; }.mui-qrcodegeneratorview-placeholderIcon { width: 3rem; height: 3rem; margin: 0 auto; color: #d4d4d8; }.mui-qrcodegeneratorview-placeholderText { margin: .5rem 0 0; font-size: .625rem; }.mui-qrcodegeneratorview-previewCaption { margin: .5rem 0 0; color: #71717a; font-size: .625rem; font-weight: 600; }
.mui-qrcodegeneratorview-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }.mui-qrcodegeneratorview-actionButton { display: flex; flex-direction: column; align-items: center; gap: .25rem; padding: .5rem; border: 0; background: #f4f4f5; font-size: .75rem; }.mui-qrcodegeneratorview-actionButton:hover { background: #e4e4e7; }.mui-qrcodegeneratorview-downloadIcon { width: 1rem; color: #3f3f46; }.mui-qrcodegeneratorview-successIcon { width: 1rem; color: #059669; }.mui-qrcodegeneratorview-copyIcon { width: 1rem; color: #52525b; }.mui-qrcodegeneratorview-actionLabel { font-size: .625rem; }.mui-qrcodegeneratorview-hiddenCodes { display: none; }
.dark .mui-qrcodegeneratorview-hero, .dark .mui-qrcodegeneratorview-card, .dark .mui-qrcodegeneratorview-previewCard { border-color: #27272a; background: #18181b; }.dark .mui-qrcodegeneratorview-heroIcon { border-color: #3f3f46; background: #172554; }.dark .mui-qrcodegeneratorview-largeIcon { color: #a1a1aa; }
.dark .mui-qrcodegeneratorview-title { color: #fff; }.dark .mui-qrcodegeneratorview-subtitle, .dark .mui-qrcodegeneratorview-helpText, .dark .mui-qrcodegeneratorview-previewCaption { color: #a1a1aa; }.dark .mui-qrcodegeneratorview-label, .dark .mui-qrcodegeneratorview-smallLabel, .dark .mui-qrcodegeneratorview-sectionTitle { color: #d4d4d8; }
.dark .mui-qrcodegeneratorview-textInput, .dark .mui-qrcodegeneratorview-sizeInput, .dark .mui-qrcodegeneratorview-rangeField { border-color: #3f3f46; background: #27272a; color: #fff; }.dark .mui-qrcodegeneratorview-rangePanel { border-color: #3f3f46; background: rgb(23 37 84 / .45); }
.dark .mui-qrcodegeneratorview-rangeTitle { color: #e4e4e7; }.dark .mui-qrcodegeneratorview-rangeHelp { color: #d4d4d8; }.dark .mui-qrcodegeneratorview-printRangeButton { background: #18181b; color: #d4d4d8; }.dark .mui-qrcodegeneratorview-recentSection { border-color: #3f3f46; }
.dark .mui-qrcodegeneratorview-recentCode { border-color: #3f3f46; background: #27272a; color: #d4d4d8; }.dark .mui-qrcodegeneratorview-recentCodeActive { border-color: #3f3f46; background: #3f3f46; color: #fff; }.dark .mui-qrcodegeneratorview-placeholder { border-color: #3f3f46; background: #27272a; }
.dark .mui-qrcodegeneratorview-actionButton { background: #27272a; color: #e4e4e7; }.dark .mui-qrcodegeneratorview-actionButton:hover { background: #3f3f46; }
@media (max-width: 1023px) { .mui-qrcodegeneratorview-layout { grid-template-columns: 1fr; } } @media (max-width: 639px) { .mui-qrcodegeneratorview-inputRow { align-items: stretch; flex-direction: column; }.mui-qrcodegeneratorview-rangeGrid { grid-template-columns: 1fr; } }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const qRCodeGeneratorViewStyles = {
  actionButton: "mui-qrcodegeneratorview-actionButton",
  actionLabel: "mui-qrcodegeneratorview-actionLabel",
  actions: "mui-qrcodegeneratorview-actions",
  buttonIcon: "mui-qrcodegeneratorview-buttonIcon",
  card: "mui-qrcodegeneratorview-card",
  clearButton: "mui-qrcodegeneratorview-clearButton",
  copy: "mui-qrcodegeneratorview-copy",
  copyGrid: "mui-qrcodegeneratorview-copyGrid",
  copyIcon: "mui-qrcodegeneratorview-copyIcon",
  copyType: "mui-qrcodegeneratorview-copyType",
  downloadIcon: "mui-qrcodegeneratorview-downloadIcon",
  formColumn: "mui-qrcodegeneratorview-formColumn",
  helpText: "mui-qrcodegeneratorview-helpText",
  hero: "mui-qrcodegeneratorview-hero",
  heroContent: "mui-qrcodegeneratorview-heroContent",
  heroIcon: "mui-qrcodegeneratorview-heroIcon",
  hiddenCodes: "mui-qrcodegeneratorview-hiddenCodes",
  inputRow: "mui-qrcodegeneratorview-inputRow",
  label: "mui-qrcodegeneratorview-label",
  largeIcon: "mui-qrcodegeneratorview-largeIcon",
  layout: "mui-qrcodegeneratorview-layout",
  page: "mui-qrcodegeneratorview-page",
  placeholder: "mui-qrcodegeneratorview-placeholder",
  placeholderContent: "mui-qrcodegeneratorview-placeholderContent",
  placeholderIcon: "mui-qrcodegeneratorview-placeholderIcon",
  placeholderText: "mui-qrcodegeneratorview-placeholderText",
  preview: "mui-qrcodegeneratorview-preview",
  previewCanvas: "mui-qrcodegeneratorview-previewCanvas",
  previewCaption: "mui-qrcodegeneratorview-previewCaption",
  previewCard: "mui-qrcodegeneratorview-previewCard",
  primaryButton: "mui-qrcodegeneratorview-primaryButton",
  printRangeButton: "mui-qrcodegeneratorview-printRangeButton",
  rangeButton: "mui-qrcodegeneratorview-rangeButton",
  rangeField: "mui-qrcodegeneratorview-rangeField",
  rangeGrid: "mui-qrcodegeneratorview-rangeGrid",
  rangeHelp: "mui-qrcodegeneratorview-rangeHelp",
  rangeInput: "mui-qrcodegeneratorview-rangeInput",
  rangePanel: "mui-qrcodegeneratorview-rangePanel",
  rangeTitle: "mui-qrcodegeneratorview-rangeTitle",
  recentCode: "mui-qrcodegeneratorview-recentCode",
  recentCodeActive: "mui-qrcodegeneratorview-recentCodeActive",
  recentList: "mui-qrcodegeneratorview-recentList",
  recentSection: "mui-qrcodegeneratorview-recentSection",
  routeNumber: "mui-qrcodegeneratorview-routeNumber",
  sectionHeader: "mui-qrcodegeneratorview-sectionHeader",
  sectionTitle: "mui-qrcodegeneratorview-sectionTitle",
  sizeInput: "mui-qrcodegeneratorview-sizeInput",
  sizeRow: "mui-qrcodegeneratorview-sizeRow",
  smallIcon: "mui-qrcodegeneratorview-smallIcon",
  smallLabel: "mui-qrcodegeneratorview-smallLabel",
  subtitle: "mui-qrcodegeneratorview-subtitle",
  successIcon: "mui-qrcodegeneratorview-successIcon",
  textInput: "mui-qrcodegeneratorview-textInput",
  title: "mui-qrcodegeneratorview-title",
  unit: "mui-qrcodegeneratorview-unit",
} as const;

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createQRCodeGeneratorViewStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const soft = dark ? "#18181b" : "#fafafa";
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    ".mui-qrcodegeneratorview-page": {
      gap: "16px !important",
    },
    ".mui-qrcodegeneratorview-header": {
      padding: "16px 18px !important",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-qrcodegeneratorview-title": {
      color: text + " !important",
      fontSize: "20px !important",
      lineHeight: "1.3 !important",
      letterSpacing: "-.025em !important",
    },
    ".mui-qrcodegeneratorview-subtitle": {
      color: muted + " !important",
      fontSize: "13px !important",
      lineHeight: "1.55 !important",
      marginTop: "4px !important",
    },
    ".mui-qrcodegeneratorview-panel": {
      overflow: "hidden",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-qrcodegeneratorview-preview": {
      borderRadius: "16px !important",
      background: soft + " !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".mui-qrcodegeneratorview-header": { padding: "14px !important" },
    },
  };
};
const styles = qRCodeGeneratorViewStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// LOGIC: State, events, at pagproseso ng data.
export const QRCodeGeneratorView: React.FC = () => {
  const [routeDirection, setRouteDirection] = useState<"IN" | "OUT">("IN");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("10");
  const [manualQrValue, setManualQrValue] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [qrSize, setQrSize] = useState(200);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const rangeQrRef = useRef<HTMLDivElement>(null);
  const [generatedRange, setGeneratedRange] = useState<string[]>([]);
  const [recentQrs, setRecentQrs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("blgf_recent_qrs");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const saveRecentCodes = (values: string[]) => {
    const updated = [...new Set([...values, ...recentQrs])].slice(0, 20);
    setRecentQrs(updated);
    localStorage.setItem("blgf_recent_qrs", JSON.stringify(updated));
  };

  const generateQR = () => {
    const value = manualQrValue.trim();
    if (!value) {
      alert("Enter the text or code to include in the QR code.");
      return;
    }
    setQrValue(value);
    saveRecentCodes([value]);
  };

  const generateRouteNumberRange = () => {
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      alert("Enter whole numbers for both Start Number and End Number.");
      return;
    }
    if (start < 1 || start > 100 || end < 1 || end > 100) {
      alert("Start Number and End Number must both be from 1 to 100.");
      return;
    }
    if (end < start) {
      alert(
        "Ending number must be greater than or equal to the starting number.",
      );
      return;
    }
    if (end - start + 1 > 100) {
      alert("Generate a maximum of 100 route numbers at one time.");
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const values = Array.from(
      { length: end - start + 1 },
      (_, index) =>
        `BLGFR2-${year}-${month}-${routeDirection}-${String(start + index).padStart(2, "0")}`,
    );
    setQrValue(values[0]);
    setGeneratedRange(values);
    saveRecentCodes(values);
  };

  const handleDownload = () => {
    if (!qrValue) return;
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = qrSize;
      canvas.height = qrSize + 40;
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 20, qrSize, qrSize);

      // Add text at bottom
      ctx!.fillStyle = "#000000";
      ctx!.font = "bold 10px Arial";
      ctx!.textAlign = "center";
      ctx!.fillText(qrValue, canvas.width / 2, canvas.height - 8);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `BLGF_QR_${qrValue.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleCopy = async () => {
    if (!qrValue) return;
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = qrValue;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const escapeHtml = (value: string) =>
    value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[character] || character,
    );

  const openDuplicatePrintWindow = (
    codes: Array<{ value: string; svg: string }>,
  ) => {
    if (codes.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print QR code.");
      return;
    }
    // Keep one size source for preview, download, and printing. The pixel
    // control is converted to a practical physical print size.
    const printedQrSize = Math.min(30, Math.max(16, qrSize * 0.075));
    const printedBoxHeight = printedQrSize + 6;
    const printedCopyWidth = printedQrSize + 6;
    const printedPairWidth = printedCopyWidth * 2 + 2;
    const pairsPerRow = printedQrSize <= 20 ? 3 : 2;
    const sheets = codes
      .map(({ value, svg }) => {
        const safeValue = escapeHtml(value);
        const copy = (copyType: "ORIGINAL COPY" | "FILE COPY") => `
          <section class="copy">
            <div class="copy-type">${copyType}</div>
            <div class="qr-container">${svg}</div>
            <div class="route-number">${safeValue}</div>
          </section>`;
        return `<article class="sheet">${copy("ORIGINAL COPY")}${copy("FILE COPY")}</article>`;
      })
      .join("");
    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>BLGF QR Codes - Original and File Copies</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; background: #fff; font-family: Arial, sans-serif; color: #111827; }
            body { width: 194mm; display: grid; grid-template-columns: repeat(${pairsPerRow}, ${printedPairWidth}mm); align-content: start; justify-content: center; column-gap: 3mm; row-gap: 1mm; }
            .sheet { width: ${printedPairWidth}mm; height: ${printedBoxHeight}mm; display: flex; align-items: center; justify-content: center; gap: 2mm; break-inside: avoid; page-break-inside: avoid; }
            .copy { position: relative; width: ${printedCopyWidth}mm; flex: 0 0 ${printedCopyWidth}mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0; overflow: hidden; text-align: center; }
            .copy-type { margin: 0 0 .5mm; padding: 0; font-size: 7px; line-height: 1; font-weight: 800; letter-spacing: .04em; }
            .qr-container { display: flex; align-items: center; justify-content: center; }
            .qr-container svg { display: block; flex: none; width: ${printedQrSize}mm !important; height: ${printedQrSize}mm !important; min-width: ${printedQrSize}mm; min-height: ${printedQrSize}mm; aspect-ratio: 1 / 1; }
            .route-number { margin-top: .5mm; font-family: Consolas, monospace; font-size: 7px; line-height: 1; font-weight: 800; }
            @media screen { body { min-height: 281mm; } .sheet { box-shadow: 0 0 8px #d4d4d8; } }
          </style>
        </head>
        <body>${sheets}
          <script>
            window.onload = function() { window.print(); window.close(); }
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrint = () => {
    if (!qrValue) return;
    const svg = qrRef.current?.querySelector("svg")?.outerHTML;
    if (!svg) return;
    openDuplicatePrintWindow([{ value: qrValue, svg }]);
  };

  const handlePrintRange = () => {
    const elements = Array.from(
      rangeQrRef.current?.querySelectorAll<SVGSVGElement>(
        "svg[data-route-code]",
      ) || [],
    );
    const codes = elements.map((svg) => ({
      value: svg.dataset.routeCode || "",
      svg: svg.outerHTML,
    }));
    openDuplicatePrintWindow(codes.filter((code) => code.value));
  };

  const clearRecent = () => {
    setRecentQrs([]);
    localStorage.removeItem("blgf_recent_qrs");
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <QRCodeGeneratorViewDesign />
      {
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <div className={styles.heroIcon}>
                <QrCode className={styles.largeIcon} />
              </div>
              <div>
                <h2 className={styles.title}>QR code generator</h2>
                <p className={styles.subtitle}>
                  Enter a document number, URL, or custom text to create a QR
                  code
                </p>
              </div>
            </div>
          </div>

          <div className={styles.layout}>
            {/* Input Section */}
            <div className={styles.formColumn}>
              <div className={styles.previewCard}>
                <div>
                  <label className={styles.label}>Manual QR code value</label>
                  <div className={styles.inputRow}>
                    <FormInput
                      type="text"
                      value={manualQrValue}
                      onChange={(event) => setManualQrValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") generateQR();
                      }}
                      placeholder="Enter Document Route No., URL, or custom text"
                      className={styles.textInput}
                    />

                    <Button
                      type="button"
                      onClick={generateQR}
                      className={styles.primaryButton}
                    >
                      <QrCode className={styles.buttonIcon} />
                      <span>Generate QR</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <label className={styles.label}>
                    Preview, download, and print size
                  </label>
                  <div className={styles.sizeRow}>
                    <FormInput
                      type="range"
                      min="128"
                      max="400"
                      step="8"
                      value={qrSize}
                      onChange={(e) => setQrSize(Number(e.target.value))}
                      className={styles.rangeInput}
                    />

                    <FormInput
                      type="number"
                      min="128"
                      max="400"
                      step="8"
                      value={qrSize}
                      onChange={(event) =>
                        setQrSize(
                          Math.min(
                            400,
                            Math.max(128, Number(event.target.value) || 128),
                          ),
                        )
                      }
                      className={styles.sizeInput}
                      aria-label="QR preview size in pixels"
                    />

                    <span className={styles.unit}>px</span>
                  </div>
                  <p className={styles.helpText}>
                    This single setting controls the square QR in the preview,
                    downloaded PNG, and centered Original/File Copy print
                    layout.
                  </p>
                </div>

                <div className={styles.rangePanel}>
                  <label className={styles.rangeTitle}>
                    Document Route No. QR Range
                  </label>
                  <p className={styles.rangeHelp}>
                    Format: BLGFR2-YEAR-MONTH-IN/OUT-SEQUENCE
                  </p>
                  <div className={styles.rangeGrid}>
                    <div>
                      <label className={styles.smallLabel}>Direction</label>
                      <FormSelect
                        value={routeDirection}
                        onChange={(event) =>
                          setRouteDirection(event.target.value as "IN" | "OUT")
                        }
                        className={styles.rangeField}
                      >
                        <option value="IN">Incoming</option>
                        <option value="OUT">Outgoing</option>
                      </FormSelect>
                    </div>
                    <div>
                      <label className={styles.smallLabel}>Start Number</label>
                      <FormInput
                        type="number"
                        min="1"
                        max="100"
                        value={rangeStart}
                        onChange={(event) => setRangeStart(event.target.value)}
                        onBlur={() => {
                          if (rangeStart === "") setRangeStart("1");
                        }}
                        className={styles.rangeField}
                      />
                    </div>
                    <div>
                      <label className={styles.smallLabel}>End Number</label>
                      <FormInput
                        type="number"
                        min="1"
                        max="100"
                        value={rangeEnd}
                        onChange={(event) => setRangeEnd(event.target.value)}
                        onBlur={() => {
                          if (rangeEnd === "") setRangeEnd("100");
                        }}
                        className={styles.rangeField}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={generateRouteNumberRange}
                    className={styles.rangeButton}
                  >
                    Generate Route QR Range
                  </Button>
                  {generatedRange.length > 0 && (
                    <Button
                      type="button"
                      onClick={handlePrintRange}
                      className={styles.printRangeButton}
                    >
                      <Printer className={styles.buttonIcon} />
                      Print Generated Range — 2 Copies Each
                    </Button>
                  )}
                </div>

                {/* Recent QR Codes */}
                {recentQrs.length > 0 && (
                  <div className={styles.recentSection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>Recent QR Codes</h3>
                      <Button
                        type="button"
                        onClick={clearRecent}
                        className={styles.clearButton}
                      >
                        <Trash2 className={styles.smallIcon} />
                        <span>Clear</span>
                      </Button>
                    </div>
                    <div className={styles.recentList}>
                      {recentQrs.map((item, idx) => (
                        <Button
                          type="button"
                          key={idx}
                          onClick={() => {
                            setQrValue(item);
                          }}
                          className={`${styles.recentCode} ${qrValue === item ? styles.recentCodeActive : ""}`}
                        >
                          {item.length > 30 ? item.slice(0, 30) + "..." : item}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code Display */}
            <div className={styles.previewCard}>
              <div className={styles.preview}>
                <div ref={qrRef} className={styles.previewCanvas}>
                  {qrValue ? (
                    <div className={styles.copyGrid}>
                      {(["ORIGINAL COPY", "FILE COPY"] as const).map(
                        (copyType) => (
                          <div
                            key={copyType}
                            className={styles.copy}
                            style={{ width: `min(45%, ${qrSize}px)` }}
                          >
                            <span className={styles.copyType}>{copyType}</span>
                            <QRCodeSVG
                              value={qrValue}
                              size={qrSize}
                              style={{
                                display: "block",
                                width: "100%",
                                maxWidth: qrSize,
                                height: "auto",
                                aspectRatio: "1 / 1",
                              }}
                            />

                            <span className={styles.routeNumber}>
                              {qrValue}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div
                      className={styles.placeholder}
                      style={{ width: qrSize }}
                    >
                      <div className={styles.placeholderContent}>
                        <QrCode className={styles.placeholderIcon} />
                        <p className={styles.placeholderText}>
                          Generate a QR code
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {qrValue && (
                  <p className={styles.previewCaption}>
                    Interactive side-by-side print preview
                  </p>
                )}
              </div>

              {qrValue && (
                <div className={styles.actions}>
                  <Button
                    type="button"
                    onClick={handleDownload}
                    className={styles.actionButton}
                  >
                    <Download className={styles.downloadIcon} />
                    <span className={styles.actionLabel}>Download</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCopy}
                    className={styles.actionButton}
                  >
                    {copied ? (
                      <Check className={styles.successIcon} />
                    ) : (
                      <Copy className={styles.copyIcon} />
                    )}
                    <span className={styles.actionLabel}>
                      {copied ? "Copied" : "Copy"}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePrint}
                    className={styles.actionButton}
                  >
                    <Printer className={styles.successIcon} />
                    <span className={styles.actionLabel}>Print</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div
            ref={rangeQrRef}
            className={styles.hiddenCodes}
            aria-hidden="true"
          >
            {generatedRange.map((value) => (
              <QRCodeSVG key={value} value={value} data-route-code={value} />
            ))}
          </div>
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function QRCodeGeneratorViewDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[qRCodeGeneratorViewCss, createQRCodeGeneratorViewStyles(theme)]}
    />
  );
}
