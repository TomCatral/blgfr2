import type { Theme } from "@mui/material/styles";
// Theme-aware appearance. Edit desktop rules here and phone rules below.
export const createSharedAppStyles = (theme: Theme) => {
  const dark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const soft = dark ? "#18181b" : "#fafafa";
  const border = theme.palette.divider;
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const shadow = "0 1px 2px rgba(24,24,27,.04)";
  return {
    // Shared neutral palette. Component layouts stay in their own TSX files.
    ':root': {
      '--color-slate-50': '#fafafa', '--color-slate-100': '#f4f4f5',
      '--color-slate-200': '#e4e4e7', '--color-slate-300': '#d4d4d8',
      '--color-slate-400': '#a1a1aa', '--color-slate-500': '#71717a',
      '--color-slate-600': '#52525b', '--color-slate-700': '#3f3f46',
      '--color-slate-800': '#27272a', '--color-slate-900': '#18181b',
      '--color-slate-950': '#101012',
    },
    '.app-content h1, .app-content h2, [role="dialog"] h2': {
      fontWeight: '650 !important', letterSpacing: '-.025em', lineHeight: 1.35,
    },
    '.app-content h3': { fontWeight: '650 !important', lineHeight: 1.4 },
    '.app-content p': { lineHeight: 1.6 },
    '.app-content': {
      background: `${theme.palette.background.default} !important`,
    },
    '@media (prefers-reduced-motion: reduce)': {
      '*, *::before, *::after': { animation: 'none !important', transition: 'none !important', scrollBehavior: 'auto !important' },
    },
    html: {
      minHeight: "100%",
      backgroundColor: theme.palette.background.default,
    },
    body: {
      minHeight: "100%",
      backgroundColor: theme.palette.background.default,
      color: text,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 1.5,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    "#root": {
      minHeight: "100%",
      backgroundColor: theme.palette.background.default,
    },
    ".mui-systemdesign-system": {
      height: "100dvh",
      minHeight: "100dvh",
      overflow: "hidden",
    },
    ".app-footer": { display: "none !important" },
    h1: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    h2: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    h3: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    h4: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    h5: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    h6: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    button: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    input: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
    },
    select: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
      minHeight: 40,
      borderRadius: "8px !important",
      borderColor: border + " !important",
      backgroundColor: dark ? "#27272a !important" : "#fff !important",
      color: text + " !important",
    },
    textarea: {
      fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif !important',
      minHeight: 96,
      borderRadius: "8px !important",
      borderColor: border + " !important",
      backgroundColor: dark ? "#27272a !important" : "#fff !important",
      color: text + " !important",
    },
    table: { borderCollapse: "separate", borderSpacing: 0 },
    th: {
      padding: "12px 14px !important",
      background: soft + " !important",
      color: muted + " !important",
      fontSize: "11.5px !important",
      letterSpacing: ".05em",
    },
    td: {
      padding: "12px 14px !important",
      borderColor: border + " !important",
      fontSize: "13px !important",
      lineHeight: "1.5 !important",
    },
    "tbody tr": {
      transition: "background-color 140ms ease, box-shadow 140ms ease",
    },
    "tbody tr:hover": {
      backgroundColor: dark
        ? "rgba(63,63,70,.1) !important"
        : "rgba(239,246,255,.88) !important",
    },
    'input:not([type="checkbox"]):not([type="radio"])': {
      minHeight: 40,
      borderRadius: "8px !important",
      borderColor: border + " !important",
      backgroundColor: dark ? "#27272a !important" : "#fff !important",
      color: text + " !important",
    },
    "button:not(.MuiButtonBase-root)": {
      minHeight: "38px",
      padding: "8px 13px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "7px",
      borderRadius: "8px !important",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: border + " !important",
      fontSize: "12.5px !important",
      lineHeight: "1.2",
      fontWeight: "750 !important",
      letterSpacing: "-.005em",
      boxShadow: "none",
      transition:
        "background-color 140ms ease, border-color 140ms ease, color 140ms ease !important",
    },
    "button:not(.MuiButtonBase-root):not(:disabled):hover": {
      boxShadow: "none",
    },
    "button:not(.MuiButtonBase-root):not(:disabled):active": {
      boxShadow: "none",
    },
    "button:not(.MuiButtonBase-root):focus-visible": {
      outline: "3px solid rgba(63,63,70,.24) !important",
      outlineOffset: "2px",
    },
    "button:not(.MuiButtonBase-root):disabled": {
      opacity: 0.48,
      cursor: "not-allowed",
      boxShadow: "none",
      transform: "none",
    },
    "button:not(.MuiButtonBase-root):has(> svg:only-child)": {
      width: 40,
      minWidth: 40,
      padding: "0 !important",
    },
    '[class*="primaryButton"]': {
      color: "#fff !important",
      borderColor: "#3f3f46 !important",
      background: "#3f3f46 !important",
      boxShadow: "none !important",
    },
    '[class*="submitButton"]': {
      color: "#fff !important",
      borderColor: "#3f3f46 !important",
      background: "#3f3f46 !important",
      boxShadow: "none !important",
    },
    '[class*="saveButton"]': {
      color: "#fff !important",
      borderColor: "#3f3f46 !important",
      background: "#3f3f46 !important",
      boxShadow: "none !important",
    },
    '[class*="createButton"]': {
      color: "#fff !important",
      borderColor: "#3f3f46 !important",
      background: "#3f3f46 !important",
      boxShadow: "none !important",
    },
    '[class*="uploadButton"]': {
      color: "#fff !important",
      borderColor: "#3f3f46 !important",
      background: "#3f3f46 !important",
      boxShadow: "none !important",
    },
    ".mui-utilities-u36": {
      color: "#fff !important",
      borderColor: "#3f3f46 !important",
      background: "#3f3f46 !important",
      boxShadow: "none !important",
    },
    '[class*="primaryButton"]:hover': {
      background: "#27272a !important",
      boxShadow: "none !important",
    },
    '[class*="submitButton"]:hover': {
      background: "#27272a !important",
      boxShadow: "none !important",
    },
    '[class*="saveButton"]:hover': {
      background: "#27272a !important",
      boxShadow: "none !important",
    },
    '[class*="createButton"]:hover': {
      background: "#27272a !important",
      boxShadow: "none !important",
    },
    '[class*="uploadButton"]:hover': {
      background: "#27272a !important",
      boxShadow: "none !important",
    },
    ".mui-utilities-u36:hover": {
      background: "#27272a !important",
      boxShadow: "none !important",
    },
    '[class*="deleteButton"]': {
      color: "#be123c !important",
      borderColor: "#fecdd3 !important",
      background: "#fff1f2 !important",
      boxShadow: "none !important",
    },
    '[class*="dangerButton"]': {
      color: "#be123c !important",
      borderColor: "#fecdd3 !important",
      background: "#fff1f2 !important",
      boxShadow: "none !important",
    },
    ".mui-utilities-u63": {
      color: "#be123c !important",
      borderColor: "#fecdd3 !important",
      background: "#fff1f2 !important",
      boxShadow: "none !important",
    },
    ".mui-utilities-u44": {
      color: "#fff !important",
      borderColor: "#059669 !important",
      background: "#059669 !important",
      boxShadow: "0 6px 16px rgba(5,150,105,.2) !important",
    },
    ".mui-utilities-u28": {
      color: "#fff !important",
      borderColor: "#d97706 !important",
      background: "#d97706 !important",
      boxShadow: "0 6px 16px rgba(217,119,6,.2) !important",
    },
    ".mui-utilities-u54": {
      color: "#fff !important",
      borderColor: "#52525b !important",
      background: "#52525b !important",
      boxShadow: "0 6px 16px rgba(79,70,229,.2) !important",
    },
    '[class*="secondaryButton"]': {
      color: text + " !important",
      borderColor: border + " !important",
      background: surface + " !important",
      boxShadow: dark
        ? "0 2px 8px rgba(0,0,0,.15)"
        : "0 2px 8px rgba(24,24,27,.06)",
    },
    '[class*="cancelButton"]': {
      color: text + " !important",
      borderColor: border + " !important",
      background: surface + " !important",
      boxShadow: dark
        ? "0 2px 8px rgba(0,0,0,.15)"
        : "0 2px 8px rgba(24,24,27,.06)",
    },
    '[class*="pageButton"]': {
      color: text + " !important",
      borderColor: border + " !important",
      background: surface + " !important",
      boxShadow: dark
        ? "0 2px 8px rgba(0,0,0,.15)"
        : "0 2px 8px rgba(24,24,27,.06)",
    },
    '[class*="closeButton"]': {
      width: "40px !important",
      minWidth: "40px !important",
      minHeight: "40px !important",
      padding: "0 !important",
      borderRadius: "11px !important",
      boxShadow: "none !important",
    },
    "td button:not(.MuiButtonBase-root)": {
      minHeight: "34px",
      padding: "7px 12px",
      borderRadius: "9px !important",
      fontSize: "11px !important",
    },
    '[class*="pagination"] button:not(.MuiButtonBase-root)': {
      minHeight: "34px",
      padding: "7px 12px",
      borderRadius: "9px !important",
      fontSize: "11px !important",
    },
    '[class*="statusBadge"]': {
      borderRadius: "999px !important",
      paddingInline: "9px !important",
      lineHeight: "1.7 !important",
    },
    '[class*="priorityBadge"]': {
      borderRadius: "999px !important",
      paddingInline: "9px !important",
      lineHeight: "1.7 !important",
    },
    '[class*="directionBadge"]': {
      borderRadius: "999px !important",
      paddingInline: "9px !important",
      lineHeight: "1.7 !important",
    },
    '[class*="roleBadge"]': {
      borderRadius: "999px !important",
      paddingInline: "9px !important",
      lineHeight: "1.7 !important",
    },
    '[class*="pagination"]': {
      padding: "14px 16px !important",
      borderTop: `1px solid ${border}`,
    },
    '[role="dialog"] > div': {
      borderRadius: "14px !important",
    },
    "@media (max-width: 767px)": {
      ".app-content": { padding: "12px 12px 64px !important" },
      td: { padding: "10px 12px !important" },
      th: { padding: "10px 12px !important" },
    },
  };
};
