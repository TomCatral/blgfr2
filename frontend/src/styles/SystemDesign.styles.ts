// Design for SystemDesign.
export const systemDesignCss = `/* SystemDesign.module.css */
.mui-systemdesign-system {
  --ui-blue: #3f3f46;
  --ui-blue-dark: #27272a;
  --ui-border: #e4e4e7;
  --ui-surface: #ffffff;
  --ui-soft: #fafafa;
  --ui-text: #27272a;
  --ui-muted: #71717a;
  --ui-radius: 0.85rem;
  --ui-shadow: 0 0.35rem 1.1rem rgb(15 23 42 / 6%);
  min-height: 100vh;
  color: var(--ui-text);
  text-rendering: optimizeLegibility;
}







.mui-systemdesign-system .global-document-search input {
  min-height: 2.65rem;
  background: #fafafa !important;
  border-color: #d9e2ee !important;
  border-radius: 0.8rem !important;
}

.mui-systemdesign-system .global-document-search input:hover {
  border-color: #b8c6d9 !important;
}



.mui-systemdesign-system .app-content {
  background: #f7f7f8 !important;
}

.mui-systemdesign-system .app-content > * {
  animation: content-enter 120ms ease-out;
}

.mui-systemdesign-system .app-content > section,
.mui-systemdesign-system .app-content > div { width: 100%; }

.mui-systemdesign-system .app-content h1,
.mui-systemdesign-system .app-content h2,
.mui-systemdesign-system .app-content h3 { text-wrap: balance; }











.mui-systemdesign-system button {
  font-family: inherit;
  font-weight: 700;
  letter-spacing: -0.006em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.mui-systemdesign-system button:not(:disabled):hover { transform: none; }
.mui-systemdesign-system button:not(:disabled):active { transform: none; }

.mui-systemdesign-system button:focus-visible {
  outline: 3px solid rgb(63 63 70 / 24%);
  outline-offset: 2px;
}

.mui-systemdesign-system button:disabled {
  cursor: not-allowed;
  filter: saturate(0.7);
  opacity: 0.55;
  transform: none !important;
  box-shadow: none !important;
}

.mui-systemdesign-system :global([class*="_Button_"]) {
  border-radius: 0.65rem;
}

.mui-systemdesign-system :global([class*="_Button_"]) svg {
  flex-shrink: 0;
}

.mui-systemdesign-system :global([class*="_primaryButton_"]),
.mui-systemdesign-system :global([class*="_createButton_"]),
.mui-systemdesign-system :global([class*="_submitButton_"]),
.mui-systemdesign-system :global([class*="_saveButton_"]) {
  box-shadow: 0 0.35rem 0.9rem rgb(63 63 70 / 18%);
}

.mui-systemdesign-system :global([class*="_primaryButton_"]):not(:disabled):hover,
.mui-systemdesign-system :global([class*="_createButton_"]):not(:disabled):hover,
.mui-systemdesign-system :global([class*="_submitButton_"]):not(:disabled):hover,
.mui-systemdesign-system :global([class*="_saveButton_"]):not(:disabled):hover {
  box-shadow: 0 0.55rem 1.2rem rgb(63 63 70 / 23%);
}

.mui-systemdesign-system :global([class*="_deleteButton_"]),
.mui-systemdesign-system :global([class*="_dangerButton_"]) {
  box-shadow: 0 0.25rem 0.7rem rgb(225 29 72 / 10%);
}

.mui-systemdesign-system :global([class*="_closeButton_"]) {
  min-width: 2.25rem;
  min-height: 2.25rem;
}

.mui-systemdesign-system :global([class*="_header_"]),
.mui-systemdesign-system :global([class*="_toolbar_"]),
.mui-systemdesign-system :global([class*="_filters_"]),
.mui-systemdesign-system :global([class*="_tableCard_"]),
.mui-systemdesign-system :global([class*="_panel_"]),
.mui-systemdesign-system :global([class*="_previewCard_"]) {
  border-color: var(--ui-border);
  box-shadow: var(--ui-shadow);
}

.mui-systemdesign-system :global([class*="_header_"]) {
  padding-block: 1.05rem;
}

.mui-systemdesign-system :global([class*="_title_"]) {
  color: var(--ui-text);
  letter-spacing: -0.025em;
}

.mui-systemdesign-system :global([class*="_subtitle_"]),
.mui-systemdesign-system :global([class*="_description_"]),
.mui-systemdesign-system :global([class*="_helpText_"]) {
  color: var(--ui-muted);
  line-height: 1.55;
}

.mui-systemdesign-system :global([class*="_tableCard_"]),
.mui-systemdesign-system :global([class*="_panel_"]),
.mui-systemdesign-system :global([class*="_previewCard_"]) {
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}

.mui-systemdesign-system :global([class*="_toolbar_"]),
.mui-systemdesign-system :global([class*="_filters_"]) {
  gap: 0.75rem;
  background: color-mix(in srgb, var(--ui-soft) 70%, transparent);
}

.mui-systemdesign-system input:not([type="checkbox"]):not([type="radio"]),
.mui-systemdesign-system select,
.mui-systemdesign-system textarea {
  font-family: inherit;
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}

.mui-systemdesign-system input:not([type="checkbox"]):not([type="radio"]):hover,
.mui-systemdesign-system select:hover,
.mui-systemdesign-system textarea:hover {
  border-color: #a1a1aa;
}

.mui-systemdesign-system label {
  letter-spacing: 0.005em;
}

.mui-systemdesign-system input:not([type="checkbox"]):not([type="radio"]):focus,
.mui-systemdesign-system select:focus,
.mui-systemdesign-system textarea:focus {
  border-color: #71717a !important;
  outline: none;
  box-shadow: 0 0 0 3px rgb(63 63 70 / 13%) !important;
}

.mui-systemdesign-system table {
  font-variant-numeric: tabular-nums;
  border-spacing: 0;
}

.mui-systemdesign-system thead {
  background: #fafafa;
}

.mui-systemdesign-system tbody tr { transition: background-color 130ms ease; }

.mui-systemdesign-system tbody tr:nth-child(even) {
  background-color: rgb(248 250 252 / 48%);
}

.mui-systemdesign-system tbody tr:hover {
  background-color: rgb(239 246 255 / 72%) !important;
}

.mui-systemdesign-system th {
  color: var(--ui-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.mui-systemdesign-system td { color: var(--ui-text); }

.mui-systemdesign-system :global([class*="_statusBadge_"]),
.mui-systemdesign-system :global([class*="_priorityBadge_"]),
.mui-systemdesign-system :global([class*="_directionBadge_"]),
.mui-systemdesign-system :global([class*="_badge_"]) {
  letter-spacing: 0.02em;
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 4%);
}

.mui-systemdesign-system :global([class*="_tabs_"]),
.mui-systemdesign-system :global([class*="_directionTabs_"]) {
  padding: 0.3rem;
  border-radius: 0.7rem;
}

.mui-systemdesign-system :global([class*="_empty_"]) {
  border-radius: var(--ui-radius);
}

.mui-systemdesign-system :global([class*="_emptyIcon_"]) {
  filter: drop-shadow(0 0.3rem 0.5rem rgb(15 23 42 / 8%));
}



.mui-systemdesign-system :global([class*="_overlay_"]),
.mui-systemdesign-system :global([class*="_backdrop_"]) {
  backdrop-filter: blur(6px);
}

.mui-systemdesign-system :global([class*="_dialog_"]) {
  border-radius: 1rem;
  box-shadow: 0 1.75rem 4.5rem rgb(15 23 42 / 25%);
}

.mui-systemdesign-system :global([class*="_drawer_"]) {
  box-shadow: -1.5rem 0 4rem rgb(15 23 42 / 18%);
}

.mui-systemdesign-system :global([class*="_pagination_"]) {
  padding-top: 0.8rem;
}

.mui-systemdesign-system :global([class*="_pageButton_"]) {
  min-width: 5.5rem;
  border-radius: 0.6rem;
}

.mui-systemdesign-system * {
  scrollbar-color: #a9b8cc transparent;
  scrollbar-width: thin;
}

.mui-systemdesign-system ::selection {
  color: #fff;
  background: #3f3f46;
}

.dark.mui-systemdesign-system {
  --ui-border: #303036;
  --ui-surface: #18181b;
  --ui-soft: #162033;
  --ui-text: #e5edf8;
  --ui-muted: #a1a1aa;
  --ui-shadow: 0 0.4rem 1.2rem rgb(0 0 0 / 18%);
}



.dark.mui-systemdesign-system .app-content {
  background: #101012 !important;
}

.dark.mui-systemdesign-system .global-document-search input {
  background: #27272a !important;
  border-color: #2a3a52 !important;
}

.dark.mui-systemdesign-system thead {
  background: #27272a;
}

.dark.mui-systemdesign-system tbody tr:nth-child(even) {
  background-color: rgb(30 41 59 / 25%);
}

.dark.mui-systemdesign-system tbody tr:hover {
  background-color: rgb(30 58 138 / 18%) !important;
}

.dark.mui-systemdesign-system :global([class*="_statusBadge_"]),
.dark.mui-systemdesign-system :global([class*="_priorityBadge_"]),
.dark.mui-systemdesign-system :global([class*="_directionBadge_"]),
.dark.mui-systemdesign-system :global([class*="_badge_"]) {
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 5%);
}

@keyframes content-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes blgf-logo-loading {
  from { opacity: .55; transform: scale(.94); }
  to { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .mui-systemdesign-system [role="status"] img { animation: none !important; }
}

@media (max-width: 767px) {
  .mui-systemdesign-system .app-content { padding: 0.85rem 0.75rem 4rem !important; }
  .mui-systemdesign-system button { min-height: 2.5rem; }
  .mui-systemdesign-system td button { min-height: 2rem; }
}

@media (prefers-reduced-motion: reduce) {
  .mui-systemdesign-system button,
  .mui-systemdesign-system input,
  .mui-systemdesign-system select,
  .mui-systemdesign-system textarea,
  .mui-systemdesign-system tbody tr { transition: none; }
}


`;
export const systemDesignStyles = {
  system: "mui-systemdesign-system",
} as const;
