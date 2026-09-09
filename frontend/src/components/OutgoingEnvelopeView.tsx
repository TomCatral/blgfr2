// OutgoingEnvelopeView: design, logic, at layout sa iisang file.

// IMPORTS: Mga ginagamit na library at shared helpers.
import { GlobalStyles as ComponentGlobalStyles } from "@mui/material";
import { useTheme as useComponentTheme } from "@mui/material/styles";
import { FormInput, FormSelect, FormTextarea } from "./ui/FormControls";
import { Button } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Printer,
  ShieldCheck,
  Plus,
  Trash2,
  UserCircle,
  Building2,
  Settings2,
  X,
} from "lucide-react";
import { DocumentRecord, User, EmployeeProfile } from "../types";
import { api } from "../services/api";
import { showConfirm } from "../services/dialogService";
import { AutocompleteField } from "./AutocompleteField";
import type { Theme } from "@mui/material/styles";

// ============================================================
// DESIGN: Dito baguhin ang kulay, laki, spacing, at cards.
// ============================================================

// Design for OutgoingEnvelopeView.
// BASE CSS: Pangunahing design ng component.
const outgoingEnvelopeViewCss = `/* OutgoingEnvelopeView.module.css */
.mui-outgoingenvelopeview-page { max-width: 72rem; margin: 0 auto; display: grid; gap: 1.25rem; }.mui-outgoingenvelopeview-toolbar, .mui-outgoingenvelopeview-dimensionsCard, .mui-outgoingenvelopeview-editorCard, .mui-outgoingenvelopeview-savedCard { border: 1px solid #e4e4e7; border-radius: .75rem; background: #fff; }.mui-outgoingenvelopeview-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; padding: 1rem; }.mui-outgoingenvelopeview-toolbarIdentity, .mui-outgoingenvelopeview-title, .mui-outgoingenvelopeview-toolbarActions, .mui-outgoingenvelopeview-saveFormatButton, .mui-outgoingenvelopeview-printButton, .mui-outgoingenvelopeview-fromToButton, .mui-outgoingenvelopeview-dimensionsHeading, .mui-outgoingenvelopeview-addButton, .mui-outgoingenvelopeview-savedTitle, .mui-outgoingenvelopeview-previewPrint { display: flex; align-items: center; }.mui-outgoingenvelopeview-toolbarIdentity { gap: .75rem; }.mui-outgoingenvelopeview-backButton { display: grid; place-items: center; padding: .5rem; border: 0; border-radius: .5rem; background: #f4f4f5; cursor: pointer; }.mui-outgoingenvelopeview-smallIcon { width: 1rem; }.mui-outgoingenvelopeview-title { gap: .5rem; margin: 0; color: #18181b; font-weight: 800; }.mui-outgoingenvelopeview-titleIcon { width: 1.25rem; color: #52525b; }.mui-outgoingenvelopeview-subtitle { margin: 0; color: #71717a; font-size: .75rem; }.mui-outgoingenvelopeview-toolbarActions { flex-wrap: wrap; gap: .5rem; }.mui-outgoingenvelopeview-sizeSelect, .mui-outgoingenvelopeview-dimensionInput, .mui-outgoingenvelopeview-field, .mui-outgoingenvelopeview-multilineField, .mui-outgoingenvelopeview-subjectInput, .mui-outgoingenvelopeview-formatNameInput { border: 1px solid #e4e4e7; border-radius: .5rem; outline: 0; background: #fff; color: #3f3f46; font-size: .75rem; }.mui-outgoingenvelopeview-sizeSelect { min-width: 0; padding: .5rem .75rem; font-weight: 700; }.mui-outgoingenvelopeview-saveFormatButton, .mui-outgoingenvelopeview-printButton, .mui-outgoingenvelopeview-fromToButton, .mui-outgoingenvelopeview-addButton, .mui-outgoingenvelopeview-saveButton, .mui-outgoingenvelopeview-previewPrint { justify-content: center; gap: .25rem; padding: .5rem .75rem; border: 0; border-radius: .5rem; font-size: .75rem; font-weight: 700; cursor: pointer; }.mui-outgoingenvelopeview-saveFormatButton { background: #f4f4f5; color: #3f3f46; }.mui-outgoingenvelopeview-printButton, .mui-outgoingenvelopeview-previewPrint { background: #059669; color: #fff; }.mui-outgoingenvelopeview-fromToButton { background: #52525b; color: #fff; }.mui-outgoingenvelopeview-hidden { display: none; }
.mui-outgoingenvelopeview-dimensionsCard { padding: 1rem; }.mui-outgoingenvelopeview-dimensionsContent { display: flex; flex-wrap: wrap; align-items: flex-end; gap: .75rem; }.mui-outgoingenvelopeview-dimensionsHeading { align-self: center; gap: .5rem; margin-right: .5rem; }.mui-outgoingenvelopeview-settingsIcon { width: 1rem; color: #52525b; }.mui-outgoingenvelopeview-dimensionsTitle { margin: 0; color: #27272a; font-size: .75rem; font-weight: 800; }.mui-outgoingenvelopeview-helpText, .mui-outgoingenvelopeview-senderHelp, .mui-outgoingenvelopeview-formatMeta { margin: 0; color: #71717a; font-size: .625rem; }.mui-outgoingenvelopeview-dimensionLabel { color: #52525b; font-size: .6875rem; font-weight: 700; }.mui-outgoingenvelopeview-dimensionInput { display: block; width: 7rem; margin-top: .25rem; padding: .5rem .75rem; background: #fafafa; }.mui-outgoingenvelopeview-dimensionsResult { padding-bottom: .5rem; color: #047857; font-size: .625rem; font-weight: 600; }.mui-outgoingenvelopeview-editorLayout { display: flex; gap: 1.25rem; }.mui-outgoingenvelopeview-editorCard { flex: 1; display: grid; gap: 1rem; padding: 1.25rem; }.mui-outgoingenvelopeview-sectionHeader { display: flex; align-items: center; justify-content: space-between; }.mui-outgoingenvelopeview-sectionTitle { margin: 0; font-size: .875rem; }.mui-outgoingenvelopeview-required { color: #e11d48; }.mui-outgoingenvelopeview-addButton, .mui-outgoingenvelopeview-saveButton { background: #3f3f46; color: #fff; }.mui-outgoingenvelopeview-compactIcon { width: .875rem; }.mui-outgoingenvelopeview-fieldLabel { display: block; margin-bottom: .25rem; font-size: .75rem; font-weight: 700; }.mui-outgoingenvelopeview-subjectInput, .mui-outgoingenvelopeview-field, .mui-outgoingenvelopeview-multilineField, .mui-outgoingenvelopeview-formatNameInput { width: 100%; padding: .5rem; }.mui-outgoingenvelopeview-subjectInput { background: #fafafa; font-weight: 700; }.mui-outgoingenvelopeview-field:focus, .mui-outgoingenvelopeview-multilineField:focus, .mui-outgoingenvelopeview-subjectInput:focus, .mui-outgoingenvelopeview-formatNameInput:focus, .mui-outgoingenvelopeview-dimensionInput:focus { border-color: #71717a; box-shadow: 0 0 0 2px rgb(59 130 246 / .2); }.mui-outgoingenvelopeview-senderPanel { display: grid; gap: .5rem; padding: .75rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: rgb(238 242 255 / .65); }.mui-outgoingenvelopeview-senderTitle { margin: 0; color: #3730a3; font-size: .75rem; font-weight: 800; }.mui-outgoingenvelopeview-twoColumnGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }.mui-outgoingenvelopeview-multilineField { min-height: 3.5rem; resize: vertical; }
.mui-outgoingenvelopeview-addresseeList { display: grid; gap: .75rem; }.mui-outgoingenvelopeview-addresseeCard { display: grid; gap: .5rem; padding: .75rem; border: 1px solid #e4e4e7; border-radius: .75rem; background: #fafafa; }.mui-outgoingenvelopeview-addresseeTitle { color: #3f3f46; font-size: .75rem; font-weight: 700; }.mui-outgoingenvelopeview-smallActions { display: flex; gap: .25rem; }.mui-outgoingenvelopeview-deleteButton, .mui-outgoingenvelopeview-formatDelete { padding: .25rem; border: 0; border-radius: .25rem; background: transparent; color: #e11d48; cursor: pointer; }.mui-outgoingenvelopeview-deleteButton:hover, .mui-outgoingenvelopeview-formatDelete:hover { background: #fff1f2; }.mui-outgoingenvelopeview-autocomplete { position: relative; }.mui-outgoingenvelopeview-suggestions { position: absolute; top: 100%; right: 0; left: 0; z-index: 30; max-height: 11rem; overflow-y: auto; margin-top: .25rem; padding: .25rem; border: 1px solid #e4e4e7; border-radius: .5rem; background: #fff; box-shadow: 0 10px 25px rgb(15 23 42 / .15); }.mui-outgoingenvelopeview-suggestion { display: flex; width: 100%; align-items: center; gap: .5rem; padding: .5rem; border: 0; border-radius: .375rem; background: transparent; text-align: left; cursor: pointer; }.mui-outgoingenvelopeview-suggestion:hover { background: #fafafa; }.mui-outgoingenvelopeview-personIcon { flex: none; width: 1.25rem; color: #3f3f46; }.mui-outgoingenvelopeview-suggestionText { min-width: 0; }.mui-outgoingenvelopeview-suggestionName, .mui-outgoingenvelopeview-suggestionMeta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.mui-outgoingenvelopeview-suggestionName { font-size: .75rem; font-weight: 700; }.mui-outgoingenvelopeview-suggestionMeta { color: #71717a; font-size: .625rem; }.mui-outgoingenvelopeview-noSuggestion { padding: .5rem; color: #a1a1aa; font-size: .625rem; text-align: center; }
.mui-outgoingenvelopeview-savedCard { width: 18rem; display: grid; align-content: start; gap: .75rem; padding: 1.25rem; }.mui-outgoingenvelopeview-savedTitle { gap: .5rem; margin: 0; font-size: .875rem; }.mui-outgoingenvelopeview-savedIcon { width: 1rem; color: #3f3f46; }.mui-outgoingenvelopeview-saveForm { display: grid; gap: .5rem; padding: .75rem; border-radius: .75rem; background: #fafafa; }.mui-outgoingenvelopeview-saveButton { width: 100%; }.mui-outgoingenvelopeview-formatList { display: grid; gap: .25rem; }.mui-outgoingenvelopeview-formatRow { display: flex; align-items: center; justify-content: space-between; padding: .5rem; border-radius: .5rem; }.mui-outgoingenvelopeview-formatRow:hover { background: #fafafa; }.mui-outgoingenvelopeview-formatLoad { flex: 1; border: 0; background: transparent; text-align: left; cursor: pointer; }.mui-outgoingenvelopeview-formatTitle { font-size: .75rem; font-weight: 700; }.mui-outgoingenvelopeview-tinyIcon { width: .75rem; }.mui-outgoingenvelopeview-emptyFormats { padding: .5rem; color: #a1a1aa; font-size: .75rem; text-align: center; }
.mui-outgoingenvelopeview-printArea { max-width: 100%; overflow-x: auto; }.mui-outgoingenvelopeview-envelope { position: relative; min-height: 22.5rem; padding: 1.25rem; border: 2px solid #18181b; border-radius: .75rem; background: #fff; color: #18181b; font-family: Arial, sans-serif; }.mui-outgoingenvelopeview-letterhead { padding-bottom: .375rem; border-bottom: 2px solid #18181b; color: #18181b; font-family: Georgia, serif; text-align: center; }.mui-outgoingenvelopeview-governmentLine { font-size: .625rem; letter-spacing: .025em; line-height: 1.2; }.mui-outgoingenvelopeview-agencyLine { padding-top: .125rem; }.mui-outgoingenvelopeview-agencyName { position: relative; display: inline-flex; align-items: center; font: 900 1rem/1.2 Arial, sans-serif; letter-spacing: -.025em; text-transform: uppercase; }.mui-outgoingenvelopeview-logo { position: absolute; right: 100%; width: 3rem; height: 3rem; margin-right: .625rem; border-radius: 50%; object-fit: contain; }.mui-outgoingenvelopeview-regionalOffice { font-size: .625rem; font-weight: 700; text-transform: uppercase; }.mui-outgoingenvelopeview-city { font-size: .59375rem; }.mui-outgoingenvelopeview-recipientAddress { margin-top: 2.5rem; margin-left: 35%; display: grid; gap: .75rem; }.mui-outgoingenvelopeview-toLabel { margin: 0 0 .25rem; color: #3f3f46; font-size: .625rem; font-weight: 700; text-transform: uppercase; }.mui-outgoingenvelopeview-printedName, .mui-outgoingenvelopeview-printedPosition, .mui-outgoingenvelopeview-printedLine { margin: 0; line-height: 1.2; }.mui-outgoingenvelopeview-printedName { font-size: 1rem; font-weight: 900; text-transform: uppercase; }.mui-outgoingenvelopeview-printedPosition { font-size: .875rem; font-weight: 700; }.mui-outgoingenvelopeview-printedLine { font-size: .875rem; white-space: pre-line; }
.mui-outgoingenvelopeview-previewBackdrop { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgb(2 6 23 / .78); backdrop-filter: blur(2px); }.mui-outgoingenvelopeview-previewDialog { display: flex; width: 100%; max-width: 80rem; height: 94vh; flex-direction: column; overflow: hidden; border-radius: 1rem; background: #fff; box-shadow: 0 25px 50px rgb(0 0 0 / .3); }.mui-outgoingenvelopeview-previewHeader { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem; border-bottom: 1px solid #e4e4e7; }.mui-outgoingenvelopeview-previewTitle { margin: 0; color: #18181b; font-size: .875rem; font-weight: 800; }.mui-outgoingenvelopeview-previewActions { display: flex; align-items: center; gap: .5rem; }.mui-outgoingenvelopeview-previewClose { padding: .5rem; border: 0; border-radius: .5rem; background: transparent; color: #71717a; cursor: pointer; }.mui-outgoingenvelopeview-previewClose:hover { background: #f4f4f5; }.mui-outgoingenvelopeview-mediumIcon { width: 1.25rem; }.mui-outgoingenvelopeview-previewFrame { min-height: 0; flex: 1; border: 0; background: #e4e4e7; }
.dark .mui-outgoingenvelopeview-toolbar, .dark .mui-outgoingenvelopeview-dimensionsCard, .dark .mui-outgoingenvelopeview-editorCard, .dark .mui-outgoingenvelopeview-savedCard, .dark .mui-outgoingenvelopeview-previewDialog { border-color: #27272a; background: #18181b; }.dark .mui-outgoingenvelopeview-title, .dark .mui-outgoingenvelopeview-dimensionsTitle, .dark .mui-outgoingenvelopeview-previewTitle { color: #fff; }.dark .mui-outgoingenvelopeview-backButton, .dark .mui-outgoingenvelopeview-saveFormatButton, .dark .mui-outgoingenvelopeview-saveForm { background: #27272a; color: #d4d4d8; }.dark .mui-outgoingenvelopeview-sizeSelect, .dark .mui-outgoingenvelopeview-dimensionInput, .dark .mui-outgoingenvelopeview-field, .dark .mui-outgoingenvelopeview-multilineField, .dark .mui-outgoingenvelopeview-subjectInput, .dark .mui-outgoingenvelopeview-formatNameInput { border-color: #3f3f46; background: #27272a; color: #fff; }.dark .mui-outgoingenvelopeview-dimensionLabel { color: #d4d4d8; }.dark .mui-outgoingenvelopeview-senderPanel { border-color: #312e81; background: rgb(30 27 75 / .45); }.dark .mui-outgoingenvelopeview-senderTitle { color: #e4e4e7; }.dark .mui-outgoingenvelopeview-senderHelp { color: #d4d4d8; }.dark .mui-outgoingenvelopeview-addresseeCard { border-color: #3f3f46; background: rgb(30 41 59 / .6); }.dark .mui-outgoingenvelopeview-suggestions { border-color: #3f3f46; background: #18181b; }.dark .mui-outgoingenvelopeview-suggestion:hover { background: #172554; }.dark .mui-outgoingenvelopeview-formatRow:hover { background: #27272a; }.dark .mui-outgoingenvelopeview-previewHeader { border-color: #3f3f46; }
@media (max-width: 1023px) { .mui-outgoingenvelopeview-editorLayout { flex-direction: column; }.mui-outgoingenvelopeview-savedCard { width: 100%; } } @media (max-width: 639px) { .mui-outgoingenvelopeview-toolbarActions { display: grid; width: 100%; grid-template-columns: 1fr; }.mui-outgoingenvelopeview-twoColumnGrid { grid-template-columns: 1fr; }.mui-outgoingenvelopeview-recipientAddress { margin-left: 20%; }.mui-outgoingenvelopeview-previewHeader { align-items: flex-start; gap: .5rem; }.mui-outgoingenvelopeview-previewActions { flex-direction: column; align-items: flex-end; } }
@media print { .mui-outgoingenvelopeview-toolbar, .mui-outgoingenvelopeview-dimensionsCard, .mui-outgoingenvelopeview-editorLayout { display: none !important; }.mui-outgoingenvelopeview-printArea { overflow: visible; }.mui-outgoingenvelopeview-envelope { border-radius: 0; box-shadow: none; } }


`;

// CLASS NAMES: Pangalan ng styles na ginagamit sa component.
const outgoingEnvelopeViewStyles = {
  addButton: "mui-outgoingenvelopeview-addButton",
  addresseeCard: "mui-outgoingenvelopeview-addresseeCard",
  addresseeList: "mui-outgoingenvelopeview-addresseeList",
  addresseeTitle: "mui-outgoingenvelopeview-addresseeTitle",
  agencyLine: "mui-outgoingenvelopeview-agencyLine",
  agencyName: "mui-outgoingenvelopeview-agencyName",
  autocomplete: "mui-outgoingenvelopeview-autocomplete",
  backButton: "mui-outgoingenvelopeview-backButton",
  city: "mui-outgoingenvelopeview-city",
  compactIcon: "mui-outgoingenvelopeview-compactIcon",
  deleteButton: "mui-outgoingenvelopeview-deleteButton",
  dimensionInput: "mui-outgoingenvelopeview-dimensionInput",
  dimensionLabel: "mui-outgoingenvelopeview-dimensionLabel",
  dimensionsCard: "mui-outgoingenvelopeview-dimensionsCard",
  dimensionsContent: "mui-outgoingenvelopeview-dimensionsContent",
  dimensionsHeading: "mui-outgoingenvelopeview-dimensionsHeading",
  dimensionsResult: "mui-outgoingenvelopeview-dimensionsResult",
  dimensionsTitle: "mui-outgoingenvelopeview-dimensionsTitle",
  editorCard: "mui-outgoingenvelopeview-editorCard",
  editorLayout: "mui-outgoingenvelopeview-editorLayout",
  emptyFormats: "mui-outgoingenvelopeview-emptyFormats",
  envelope: "mui-outgoingenvelopeview-envelope",
  field: "mui-outgoingenvelopeview-field",
  fieldLabel: "mui-outgoingenvelopeview-fieldLabel",
  formatDelete: "mui-outgoingenvelopeview-formatDelete",
  formatList: "mui-outgoingenvelopeview-formatList",
  formatLoad: "mui-outgoingenvelopeview-formatLoad",
  formatMeta: "mui-outgoingenvelopeview-formatMeta",
  formatNameInput: "mui-outgoingenvelopeview-formatNameInput",
  formatRow: "mui-outgoingenvelopeview-formatRow",
  formatTitle: "mui-outgoingenvelopeview-formatTitle",
  fromToButton: "mui-outgoingenvelopeview-fromToButton",
  governmentLine: "mui-outgoingenvelopeview-governmentLine",
  helpText: "mui-outgoingenvelopeview-helpText",
  hidden: "mui-outgoingenvelopeview-hidden",
  letterhead: "mui-outgoingenvelopeview-letterhead",
  logo: "mui-outgoingenvelopeview-logo",
  mediumIcon: "mui-outgoingenvelopeview-mediumIcon",
  multilineField: "mui-outgoingenvelopeview-multilineField",
  noSuggestion: "mui-outgoingenvelopeview-noSuggestion",
  page: "mui-outgoingenvelopeview-page",
  personIcon: "mui-outgoingenvelopeview-personIcon",
  previewActions: "mui-outgoingenvelopeview-previewActions",
  previewBackdrop: "mui-outgoingenvelopeview-previewBackdrop",
  previewClose: "mui-outgoingenvelopeview-previewClose",
  previewDialog: "mui-outgoingenvelopeview-previewDialog",
  previewFrame: "mui-outgoingenvelopeview-previewFrame",
  previewHeader: "mui-outgoingenvelopeview-previewHeader",
  previewPrint: "mui-outgoingenvelopeview-previewPrint",
  previewTitle: "mui-outgoingenvelopeview-previewTitle",
  printArea: "mui-outgoingenvelopeview-printArea",
  printButton: "mui-outgoingenvelopeview-printButton",
  printedLine: "mui-outgoingenvelopeview-printedLine",
  printedName: "mui-outgoingenvelopeview-printedName",
  printedPosition: "mui-outgoingenvelopeview-printedPosition",
  recipientAddress: "mui-outgoingenvelopeview-recipientAddress",
  regionalOffice: "mui-outgoingenvelopeview-regionalOffice",
  required: "mui-outgoingenvelopeview-required",
  saveButton: "mui-outgoingenvelopeview-saveButton",
  saveForm: "mui-outgoingenvelopeview-saveForm",
  saveFormatButton: "mui-outgoingenvelopeview-saveFormatButton",
  savedCard: "mui-outgoingenvelopeview-savedCard",
  savedIcon: "mui-outgoingenvelopeview-savedIcon",
  savedTitle: "mui-outgoingenvelopeview-savedTitle",
  sectionHeader: "mui-outgoingenvelopeview-sectionHeader",
  sectionTitle: "mui-outgoingenvelopeview-sectionTitle",
  senderHelp: "mui-outgoingenvelopeview-senderHelp",
  senderPanel: "mui-outgoingenvelopeview-senderPanel",
  senderTitle: "mui-outgoingenvelopeview-senderTitle",
  settingsIcon: "mui-outgoingenvelopeview-settingsIcon",
  sizeSelect: "mui-outgoingenvelopeview-sizeSelect",
  smallActions: "mui-outgoingenvelopeview-smallActions",
  smallIcon: "mui-outgoingenvelopeview-smallIcon",
  subjectInput: "mui-outgoingenvelopeview-subjectInput",
  subtitle: "mui-outgoingenvelopeview-subtitle",
  suggestion: "mui-outgoingenvelopeview-suggestion",
  suggestionMeta: "mui-outgoingenvelopeview-suggestionMeta",
  suggestionName: "mui-outgoingenvelopeview-suggestionName",
  suggestionText: "mui-outgoingenvelopeview-suggestionText",
  suggestions: "mui-outgoingenvelopeview-suggestions",
  tinyIcon: "mui-outgoingenvelopeview-tinyIcon",
  title: "mui-outgoingenvelopeview-title",
  titleIcon: "mui-outgoingenvelopeview-titleIcon",
  toLabel: "mui-outgoingenvelopeview-toLabel",
  toolbar: "mui-outgoingenvelopeview-toolbar",
  toolbarActions: "mui-outgoingenvelopeview-toolbarActions",
  toolbarIdentity: "mui-outgoingenvelopeview-toolbarIdentity",
  twoColumnGrid: "mui-outgoingenvelopeview-twoColumnGrid",
} as const;

// THEME: Kulay, spacing, at itsura sa light at dark mode.
const createOutgoingEnvelopeViewStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    ".mui-outgoingenvelopeview-page": {
      gap: "16px !important",
    },
    ".mui-outgoingenvelopeview-header": {
      padding: "16px 18px !important",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-outgoingenvelopeview-title": {
      color: text + " !important",
      fontSize: "20px !important",
      lineHeight: "1.3 !important",
      letterSpacing: "-.025em !important",
    },
    ".mui-outgoingenvelopeview-subtitle": {
      color: muted + " !important",
      fontSize: "13px !important",
      lineHeight: "1.55 !important",
      marginTop: "4px !important",
    },
    ".mui-outgoingenvelopeview-panel": {
      overflow: "hidden",
      border: `1px solid ${border} !important`,
      borderRadius: "12px !important",
      background: surface + " !important",
      boxShadow: shadow + " !important",
    },
    ".mui-outgoingenvelopeview-toolbarActions .MuiButton-root": {
      color: text + " !important",
      background: "transparent !important",
      borderColor: "transparent !important",
    },
    ".mui-outgoingenvelopeview-toolbarActions button": {
      color: text + " !important",
      background: "transparent !important",
      borderColor: "transparent !important",
    },
    // MOBILE: Design para sa maliit na screen.
    "@media (max-width: 767px)": {
      ".mui-outgoingenvelopeview-header": { padding: "14px !important" },
    },
  };
};
const styles = outgoingEnvelopeViewStyles;

// ============================================================
// COMPONENT: Data, logic, at layout ng screen.
// ============================================================

// DATA: Mga props at uri ng data na ginagamit ng component.
interface EnvelopeAddressee {
  id: string;
  name: string;
  position: string;
  office: string;
  address: string;
}

interface EnvelopeSender {
  name: string;
  position: string;
  office: string;
  address: string;
}

interface OutgoingEnvelopeViewProps {
  document: DocumentRecord | null;
  documents?: DocumentRecord[];
  currentUser: User;
  onBack: () => void;
  onLogDispatch?: (
    details: string,
    trackingNumber: string,
  ) => Promise<void> | void;
}

// LOGIC: State, events, at pagproseso ng data.
export const OutgoingEnvelopeView: React.FC<OutgoingEnvelopeViewProps> = ({
  document,
  documents = [],
  currentUser,
  onBack,
  onLogDispatch,
}) => {
  const [envelopeSize, setEnvelopeSize] = useState<"NO10" | "DL" | "CUSTOM">(
    "NO10",
  );
  const [envelopeWidth, setEnvelopeWidth] = useState(9.5);
  const [envelopeHeight, setEnvelopeHeight] = useState(4.125);
  const [envelopePdfUrl, setEnvelopePdfUrl] = useState<string | null>(null);
  const envelopePdfFrameRef = useRef<HTMLIFrameElement | null>(null);
  const activeDoc = document;
  const [logged, setLogged] = useState(false);
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState<EnvelopeSender>({
    name: "",
    position: "",
    office: "Bureau of Local Government Finance — Regional Office II",
    address: "Regional Government Center, Carig Sur, Tuguegarao City",
  });
  const [addressees, setAddressees] = useState<EnvelopeAddressee[]>([
    {
      id: "addr-manual-1",
      name: "",
      position: "",
      office: "",
      address: "",
    },
  ]);
  const [activeNameField, setActiveNameField] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>(() => {
    try {
      const stored = localStorage.getItem("blgf_employees");
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed)
          ? parsed.filter((item) => item && typeof item.fullName === "string")
          : [];
      }
    } catch (e) {}
    return [];
  });

  const [savedFormats, setSavedFormats] = useState<
    {
      id: string;
      name: string;
      subject: string;
      sender?: EnvelopeSender;
      addressees: EnvelopeAddressee[];
    }[]
  >(() => {
    try {
      const stored = localStorage.getItem("blgf_envelope_formats");
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed)
          ? parsed.filter(
              (item) =>
                item &&
                typeof item.name === "string" &&
                Array.isArray(item.addressees),
            )
          : [];
      }
    } catch (e) {}
    return [];
  });
  const [formatName, setFormatName] = useState("");
  const [showSaveFormat, setShowSaveFormat] = useState(false);

  useEffect(() => {
    api
      .getEmployees()
      .then((directoryEmployees) => {
        const activeEmployees = directoryEmployees.filter(
          (employee) => employee.active !== false,
        );
        setEmployees(activeEmployees);
        localStorage.setItem("blgf_employees", JSON.stringify(activeEmployees));
      })
      .catch(() => {
        // Retain the locally cached Office Directory when offline.
      });
  }, []);
  useEffect(() => {
    if (activeDoc) {
      setSubject(activeDoc.subject || activeDoc.title || "");
      setLogged(false);
      setAddressees([
        {
          id: "addr-1",
          name: "",
          position: "",
          office: "",
          address: "",
        },
      ]);
    }
  }, [activeDoc]);

  const addAddressee = () => {
    setAddressees([
      ...addressees,
      {
        id: `addr-${Date.now()}`,
        name: "",
        position: "",
        office: "",
        address: "",
      },
    ]);
  };

  const updateAddressee = (
    id: string,
    field: keyof EnvelopeAddressee,
    value: string,
  ) => {
    setAddressees(
      addressees.map((a: EnvelopeAddressee) =>
        a.id === id ? { ...a, [field]: value } : a,
      ),
    );
  };

  const removeAddressee = (id: string) => {
    setAddressees(addressees.filter((a: EnvelopeAddressee) => a.id !== id));
  };

  const selectEmployeeForAddressee = (
    addresseeId: string,
    employee: EmployeeProfile,
  ) => {
    setAddressees((current) =>
      current.map((addressee) =>
        addressee.id === addresseeId
          ? {
              ...addressee,
              name: employee.fullName,
              position: employee.position || "",
              office: employee.office || "",
              address: employee.address || "",
            }
          : addressee,
      ),
    );
    setActiveNameField(null);
  };

  const validateEnvelopeFields = () => {
    if (!subject.trim()) {
      alert("Please fill in Subject / Reference.");
      return false;
    }
    if (!addressees.length) {
      alert("Please add at least one addressee.");
      return false;
    }
    const incompleteIndex = addressees.findIndex(
      (item) =>
        !item.name.trim() ||
        !item.position.trim() ||
        !item.office.trim() ||
        !item.address.trim(),
    );
    if (incompleteIndex >= 0) {
      alert(
        `Please complete Full Name, Position, Office / Department, and Address for Addressee #${incompleteIndex + 1}.`,
      );
      return false;
    }
    return true;
  };

  const validateSenderFields = () => {
    if (
      !sender.name.trim() ||
      !sender.position.trim() ||
      !sender.office.trim() ||
      !sender.address.trim()
    ) {
      alert(
        "Please complete the FROM Name, Position, Office, and Address before printing the FROM/TO.",
      );
      return false;
    }
    return true;
  };

  const saveCurrentFormat = () => {
    if (!validateEnvelopeFields()) return;
    if (!formatName.trim()) {
      alert("Please fill in the format name.");
      return;
    }
    const newFormat = {
      id: `fmt-${Date.now()}`,
      name: formatName,
      subject,
      sender,
      addressees,
    };
    const updated = [...savedFormats, newFormat];
    setSavedFormats(updated);
    localStorage.setItem("blgf_envelope_formats", JSON.stringify(updated));
    setFormatName("");
    setShowSaveFormat(false);
    alert("Format saved!");
  };

  const loadFormat = (fmt: (typeof savedFormats)[0]) => {
    setSubject(fmt.subject);
    if (fmt.sender) setSender(fmt.sender);
    setAddressees(fmt.addressees);
  };

  const deleteFormat = async (id: string) => {
    if (await showConfirm("Delete this format?")) {
      const updated = savedFormats.filter((f: any) => f.id !== id);
      setSavedFormats(updated);
      localStorage.setItem("blgf_envelope_formats", JSON.stringify(updated));
    }
  };

  const recordDispatch = async () => {
    const dispatchDetails = [
      ...addressees.flatMap((addressee, index) => [
        `Recipient ${index + 1}: ${addressee.name}`,
        `Office ${index + 1}: ${addressee.office}`,
      ]),
      `Subject: ${subject}`,
      `Released by: ${currentUser.fullName}`,
    ];

    try {
      await onLogDispatch?.(
        dispatchDetails.join(" | "),
        activeDoc?.routeNo || "MANUAL-ENVELOPE",
      );
      setLogged(true);
      return true;
    } catch (error) {
      alert("Unable to record the envelope dispatch. Please try again.");
      return false;
    }
  };

  const closeEnvelopePdf = () => {
    if (envelopePdfUrl) URL.revokeObjectURL(envelopePdfUrl);
    setEnvelopePdfUrl(null);
  };

  const printPreparedEnvelope = async () => {
    try {
      const printWindow = envelopePdfFrameRef.current?.contentWindow;
      if (!printWindow) {
        throw new Error("Envelope PDF is not ready.");
      }
      printWindow.focus();
      printWindow.print();
      if (!logged) {
        await recordDispatch();
      }
    } catch {
      alert(
        "Unable to open the envelope print dialog. No dispatch log was saved.",
      );
    }
  };

  const printEnvelopeDirectly = () => {
    if (!validateEnvelopeFields()) return;
    try {
      closeEnvelopePdf();
      let printFinished = false;
      const handleAfterPrint = () => {
        if (printFinished) return;
        printFinished = true;
        window.removeEventListener("afterprint", handleAfterPrint);
        if (!logged) void recordDispatch();
      };
      window.addEventListener("afterprint", handleAfterPrint);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          try {
            window.print();
          } catch {
            window.removeEventListener("afterprint", handleAfterPrint);
            alert(
              "Unable to open the envelope print dialog. No dispatch log was saved.",
            );
          }
        });
      });
    } catch {
      alert(
        "Unable to open the envelope print dialog. No dispatch log was saved.",
      );
    }
  };

  const escapePrintText = (value: string) =>
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

  const printFromToCutOut = () => {
    if (!validateEnvelopeFields()) return;
    if (!validateSenderFields()) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print the FROM/TO cut-out labels.");
      return;
    }

    const safeSenderName = escapePrintText(sender.name.trim());
    const safeSenderDesignation = escapePrintText(sender.position.trim());
    const safeSenderOffice = escapePrintText(sender.office.trim());
    const safeSenderAddress = escapePrintText(sender.address.trim());
    const pageRule = "size: A4 portrait; margin: 12mm;";
    const pageWidth = "150mm";
    const pageHeight = "88mm";
    const pageRows = "44mm 44mm";
    const labelPadding = "4mm 9mm";
    const labelFontSize = "9pt";
    const pages = addressees
      .map(
        (addressee) => `
          <article class="half-bond-page">
            <section class="cut-label from-label">
              <div class="label-heading">FROM:</div>
              <div class="name">${safeSenderName}</div>
              <div>${safeSenderDesignation}</div>
              <div>${safeSenderOffice}</div>
              <div>${safeSenderAddress}</div>
            </section>
            <section class="cut-label to-label">
              <div class="label-heading">TO:</div>
              <div class="name">${escapePrintText(addressee.name)}</div>
              <div>${escapePrintText(addressee.position)}</div>
              <div>${escapePrintText(addressee.office)}</div>
              <div>${escapePrintText(addressee.address)}</div>
            </section>
          </article>`,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>BLGF FROM and TO Cut-Out Labels</title>
          <style>
            @page { ${pageRule} }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111; background: #fff; }
            body { width: auto; }
            .half-bond-page { width: ${pageWidth}; height: ${pageHeight}; display: grid; grid-template-rows: ${pageRows}; margin: 16mm auto 0; break-after: page; page-break-after: always; overflow: hidden; }
            .half-bond-page:last-child { break-after: auto; page-break-after: auto; }
            .cut-label { position: relative; display: flex; flex-direction: column; justify-content: center; border: 1.5px dashed #444; padding: ${labelPadding}; font-size: ${labelFontSize}; line-height: 1.2; }
            .to-label { padding-left: 23mm; }
            .label-heading { position: absolute; left: 4mm; top: 3mm; font-size: 8pt; font-weight: 800; letter-spacing: .08em; }
            .name { font-size: 10pt; font-weight: 800; text-transform: uppercase; }
            @media screen { body { min-height: 297mm; padding: 12px; background: #e5e7eb; } .half-bond-page { background: white; box-shadow: 0 2px 12px #a1a1aa; } }
          </style>
        </head>
        <body>${pages}
          <script>
            window.onload = function () { window.print(); window.close(); };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const selectEnvelopeSize = (size: "NO10" | "DL" | "CUSTOM") => {
    setEnvelopeSize(size);
    if (size === "NO10") {
      setEnvelopeWidth(9.5);
      setEnvelopeHeight(4.125);
    } else if (size === "DL") {
      setEnvelopeWidth(8.66);
      setEnvelopeHeight(4.33);
    }
  };

  const envelopeDimensions = {
    width: `${Math.max(1, envelopeWidth)}in`,
    height: `${Math.max(1, envelopeHeight)}in`,
  };

  // LAYOUT: Ang nakikita sa screen.
  return (
    <>
      <OutgoingEnvelopeViewDesign />
      {
        <div className={styles.page}>
          <style>{`
        @media print {
          html, body {
            width: ${envelopeDimensions.width} !important;
            height: ${envelopeDimensions.height} !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          body * { visibility: hidden; }
           .envelope-print-area, .envelope-print-area * { visibility: visible; }
           .envelope-print-area {
             position: absolute;
             left: 0;
             top: 0;
             width: ${envelopeDimensions.width} !important;
             height: auto !important;
             margin: 0 !important;
             padding: 0 !important;
             overflow: visible !important;
           }
           .envelope-page {
             width: ${envelopeDimensions.width} !important;
             height: ${envelopeDimensions.height} !important;
             min-height: 0 !important;
             margin: 0 !important;
             padding: 0.18in !important;
             box-sizing: border-box;
             overflow: hidden;
             break-after: page;
             page-break-after: always;
             border-radius: 0 !important;
           }
           .envelope-page:last-child { break-after: auto; page-break-after: auto; }
          .print\\:hidden { display: none !important; }
          @page {
            size: ${envelopeDimensions.width} ${envelopeDimensions.height};
            margin: 0;
          }
        }
      `}</style>

          <div className={styles.toolbar}>
            <div className={styles.toolbarIdentity}>
              <Button
                type="button"
                onClick={onBack}
                className={styles.backButton}
              >
                <ArrowLeft className={styles.smallIcon} />
              </Button>
              <div>
                <h2 className={styles.title}>
                  <Mail className={styles.titleIcon} /> Outgoing Envelope
                </h2>
                <p className={styles.subtitle}>
                  {activeDoc?.routeNo ||
                    "Manual envelope — no document selected"}
                </p>
              </div>
            </div>
            <div className={styles.toolbarActions}>
              <FormSelect
                value={envelopeSize}
                onChange={(event) =>
                  selectEnvelopeSize(
                    event.target.value as "NO10" | "DL" | "CUSTOM",
                  )
                }
                className={styles.sizeSelect}
                aria-label="Envelope size"
              >
                <option value="NO10">#10 envelope (9.5 × 4.125 in)</option>
                <option value="DL">DL envelope (8.66 × 4.33 in)</option>
                <option value="CUSTOM">Custom size</option>
              </FormSelect>
              <Button
                type="button"
                onClick={() => setShowSaveFormat(!showSaveFormat)}
                className={styles.saveFormatButton}
              >
                <Plus className={styles.smallIcon} /> Save Format
              </Button>
              <Button
                type="button"
                onClick={recordDispatch}
                disabled={logged}
                className={styles.hidden}
              >
                <ShieldCheck className={styles.smallIcon} />{" "}
                {logged ? "Dispatched ✓" : "Record Dispatch"}
              </Button>
              <Button
                type="button"
                onClick={printEnvelopeDirectly}
                className={styles.printButton}
              >
                <Printer className={styles.smallIcon} /> Print Envelope
              </Button>
              <Button
                type="button"
                onClick={printFromToCutOut}
                className={styles.fromToButton}
              >
                <Printer className={styles.smallIcon} /> Print FROM/TO
              </Button>
            </div>
          </div>

          <div className={styles.dimensionsCard}>
            <div className={styles.dimensionsContent}>
              <div className={styles.dimensionsHeading}>
                <Settings2 className={styles.settingsIcon} />
                <div>
                  <p className={styles.dimensionsTitle}>Envelope dimensions</p>
                  <p className={styles.formatMeta}>
                    Match the envelope loaded in the printer.
                  </p>
                </div>
              </div>
              <label className={styles.dimensionLabel}>
                Width (inches)
                <FormInput
                  type="number"
                  min="1"
                  max="20"
                  step="0.01"
                  value={envelopeWidth}
                  onChange={(event) => {
                    setEnvelopeWidth(Number(event.target.value) || 1);
                    setEnvelopeSize("CUSTOM");
                  }}
                  className={styles.dimensionInput}
                />
              </label>
              <label className={styles.dimensionLabel}>
                Height (inches)
                <FormInput
                  type="number"
                  min="1"
                  max="15"
                  step="0.01"
                  value={envelopeHeight}
                  onChange={(event) => {
                    setEnvelopeHeight(Number(event.target.value) || 1);
                    setEnvelopeSize("CUSTOM");
                  }}
                  className={styles.dimensionInput}
                />
              </label>
              <p className={styles.dimensionsResult}>
                Print page: {envelopeWidth} × {envelopeHeight} inches
              </p>
            </div>
          </div>

          <div className={styles.editorLayout}>
            <div className={styles.editorCard}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  Create Envelope Format{" "}
                  <span className={styles.required}>*</span>
                </h3>
                <Button
                  type="button"
                  onClick={addAddressee}
                  className={styles.addButton}
                >
                  <Plus className={styles.compactIcon} /> Add Addressee
                </Button>
              </div>
              <div>
                <label className={styles.fieldLabel}>
                  Subject / Reference:{" "}
                  <span className={styles.required}>*</span>
                </label>
                <AutocompleteField
                  value={subject}
                  onChange={setSubject}
                  suggestions={[
                    ...documents.flatMap((item) => [item.subject, item.title]),
                    ...savedFormats.map((format) => format.subject),
                  ]}
                  ariaLabel="Subject or Reference"
                  placeholder="Type a subject or reference"
                  required
                  className={styles.subjectInput}
                />
              </div>
              <div className={styles.senderPanel}>
                <div>
                  <p className={styles.senderTitle}>
                    FROM — Editable Sender Format
                  </p>
                  <p className={styles.senderHelp}>
                    These details appear on the half-bond FROM cut-out and are
                    included when this format is saved.
                  </p>
                </div>
                <div className={styles.twoColumnGrid}>
                  <FormInput
                    type="text"
                    required
                    value={sender.name}
                    onChange={(event) =>
                      setSender((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Sender Name"
                    className={styles.field}
                  />

                  <FormInput
                    type="text"
                    required
                    value={sender.position}
                    onChange={(event) =>
                      setSender((current) => ({
                        ...current,
                        position: event.target.value,
                      }))
                    }
                    placeholder="Sender Position"
                    className={styles.field}
                  />

                  <FormTextarea
                    required
                    rows={2}
                    value={sender.office}
                    onChange={(event) =>
                      setSender((current) => ({
                        ...current,
                        office: event.target.value,
                      }))
                    }
                    placeholder="Sender Office"
                    className={styles.field}
                  />

                  <FormTextarea
                    required
                    rows={2}
                    value={sender.address}
                    onChange={(event) =>
                      setSender((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Sender Address"
                    className={styles.field}
                  />
                </div>
              </div>
              <div className={styles.addresseeList}>
                {addressees.map((addr, idx) => (
                  <div key={addr.id} className={styles.addresseeCard}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.addresseeTitle}>
                        Addressee #{idx + 1}{" "}
                        <span className={styles.required}>*</span>
                      </span>
                      <div className={styles.smallActions}>
                        {addressees.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeAddressee(addr.id)}
                            className={styles.deleteButton}
                          >
                            <Trash2 className={styles.compactIcon} />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className={styles.twoColumnGrid}>
                      <div className={styles.autocomplete}>
                        <FormInput
                          value={addr.name}
                          onFocus={() => setActiveNameField(addr.id)}
                          onBlur={() =>
                            window.setTimeout(
                              () =>
                                setActiveNameField((current) =>
                                  current === addr.id ? null : current,
                                ),
                              150,
                            )
                          }
                          onChange={(e) => {
                            updateAddressee(addr.id, "name", e.target.value);
                            setActiveNameField(addr.id);
                          }}
                          placeholder="Full Name"
                          required
                          autoComplete="off"
                          data-autocomplete-managed="true"
                          className={styles.field}
                        />

                        {activeNameField === addr.id && addr.name.trim() && (
                          <div className={styles.suggestions}>
                            {employees
                              .filter((employee) =>
                                `${employee.fullName} ${employee.position} ${employee.office}`
                                  .toLowerCase()
                                  .includes(addr.name.trim().toLowerCase()),
                              )
                              .slice(0, 8)
                              .map((employee) => (
                                <Button
                                  key={employee.id}
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    selectEmployeeForAddressee(
                                      addr.id,
                                      employee,
                                    );
                                  }}
                                  className={styles.suggestion}
                                >
                                  <UserCircle className={styles.personIcon} />
                                  <span className={styles.suggestionText}>
                                    <span className={styles.suggestionName}>
                                      {employee.fullName}
                                    </span>
                                    <span className={styles.suggestionMeta}>
                                      {employee.position}
                                      {employee.office
                                        ? ` · ${employee.office}`
                                        : ""}
                                    </span>
                                  </span>
                                </Button>
                              ))}
                            {employees.filter((employee) =>
                              `${employee.fullName} ${employee.position} ${employee.office}`
                                .toLowerCase()
                                .includes(addr.name.trim().toLowerCase()),
                            ).length === 0 && (
                              <div className={styles.noSuggestion}>
                                No matching Office Directory name
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <AutocompleteField
                        value={addr.position}
                        onChange={(value) =>
                          updateAddressee(addr.id, "position", value)
                        }
                        suggestions={[
                          ...employees.map(
                            (employee) => employee.position || "",
                          ),
                          ...savedFormats.flatMap((format) =>
                            format.addressees.map((item) => item.position),
                          ),
                        ]}
                        ariaLabel={`Addressee ${idx + 1} Position`}
                        placeholder="Position"
                        required
                        className={styles.field}
                      />

                      <AutocompleteField
                        multiline
                        rows={2}
                        value={addr.office}
                        onChange={(value) =>
                          updateAddressee(addr.id, "office", value)
                        }
                        suggestions={[
                          ...employees.map((employee) => employee.office || ""),
                          ...savedFormats.flatMap((format) =>
                            format.addressees.map((item) => item.office),
                          ),
                        ]}
                        ariaLabel={`Addressee ${idx + 1} Office or Department`}
                        placeholder={
                          "Office Line 1\nOffice / Department Line 2"
                        }
                        required
                        className={styles.multilineField}
                      />

                      <AutocompleteField
                        multiline
                        rows={2}
                        value={addr.address}
                        onChange={(value) =>
                          updateAddressee(addr.id, "address", value)
                        }
                        suggestions={[
                          ...employees.map(
                            (employee) => employee.address || "",
                          ),
                          ...savedFormats.flatMap((format) =>
                            format.addressees.map((item) => item.address),
                          ),
                        ]}
                        ariaLabel={`Addressee ${idx + 1} Address`}
                        placeholder={"Address Line 1\nAddress Line 2"}
                        required
                        className={styles.multilineField}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.savedCard}>
              <h3 className={styles.savedTitle}>
                <Building2 className={styles.savedIcon} /> Saved Formats
              </h3>
              {showSaveFormat && (
                <div className={styles.saveForm}>
                  <FormInput
                    value={formatName}
                    onChange={(e) => setFormatName(e.target.value)}
                    placeholder="Format name..."
                    required
                    className={styles.formatNameInput}
                  />

                  <Button
                    type="button"
                    onClick={saveCurrentFormat}
                    className={styles.saveButton}
                  >
                    Save Current
                  </Button>
                </div>
              )}
              <div className={styles.formatList}>
                {savedFormats.map((fmt) => (
                  <div key={fmt.id} className={styles.formatRow}>
                    <Button
                      type="button"
                      onClick={() => loadFormat(fmt)}
                      className={styles.formatLoad}
                    >
                      <div className={styles.formatTitle}>{fmt.name}</div>
                      <div className={styles.formatMeta}>
                        {fmt.addressees.length} addressee(s)
                      </div>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => deleteFormat(fmt.id)}
                      className={styles.formatDelete}
                    >
                      <Trash2 className={styles.tinyIcon} />
                    </Button>
                  </div>
                ))}
                {savedFormats.length === 0 && (
                  <div className={styles.emptyFormats}>
                    No saved formats yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Envelope Print Area */}
          <div className={styles.printArea}>
            {addressees.map((addr) => (
              <div
                key={addr.id}
                className={styles.envelope}
                style={{
                  width: envelopeDimensions.width,
                  height: envelopeDimensions.height,
                  overflow: "hidden",
                }}
              >
                <div className={styles.letterhead}>
                  <div className={styles.governmentLine}>
                    Republic of the Philippines
                  </div>
                  <div className={styles.governmentLine}>
                    Department of Finance
                  </div>
                  <div className={styles.agencyLine}>
                    <div className={styles.agencyName}>
                      <img
                        src="/blgflogo.jpg"
                        alt="BLGF Regional Office II logo"
                        className={styles.logo}
                      />
                      Bureau of Local Government Finance, RO2
                    </div>
                  </div>
                  <div className={styles.regionalOffice}>
                    Regional Office No. 02
                  </div>
                  <div className={styles.city}>Carig, Tuguegarao City</div>
                </div>
                <div className={styles.recipientAddress}>
                  <p className={styles.toLabel}>To:</p>
                  <div>
                    <p className={styles.printedName}>
                      {addr.name || "___________________________"}
                    </p>
                    <p className={styles.printedPosition}>
                      {addr.position || "___________________________"}
                    </p>
                    <p className={styles.printedLine}>
                      {addr.office || "___________________________"}
                    </p>
                    <p className={styles.printedLine}>
                      {addr.address || "___________________________"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {envelopePdfUrl && (
            <div className={styles.previewBackdrop}>
              <div className={styles.previewDialog}>
                <div className={styles.previewHeader}>
                  <div>
                    <h3 className={styles.previewTitle}>
                      Envelope PDF Preview
                    </h3>
                    <p className={styles.formatMeta}>
                      Only the selected {envelopeWidth} × {envelopeHeight}-inch
                      envelope is included. Use Print Envelope to print and log.
                    </p>
                  </div>
                  <div className={styles.previewActions}>
                    <Button
                      type="button"
                      onClick={printPreparedEnvelope}
                      className={styles.previewPrint}
                    >
                      <Printer className={styles.smallIcon} />
                      Print Envelope
                    </Button>
                    <Button
                      type="button"
                      onClick={closeEnvelopePdf}
                      className={styles.previewClose}
                      aria-label="Close envelope PDF preview"
                    >
                      <X className={styles.mediumIcon} />
                    </Button>
                  </div>
                </div>
                <iframe
                  ref={envelopePdfFrameRef}
                  src={envelopePdfUrl}
                  title="Envelope PDF preview"
                  className={styles.previewFrame}
                />
              </div>
            </div>
          )}
        </div>
      }
    </>
  );
};

// DESIGN LOADER: Kasama lang ang design kapag ginagamit ang component.
function OutgoingEnvelopeViewDesign() {
  const theme = useComponentTheme();
  return (
    <ComponentGlobalStyles
      styles={[
        outgoingEnvelopeViewCss,
        createOutgoingEnvelopeViewStyles(theme),
      ]}
    />
  );
}
