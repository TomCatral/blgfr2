// Design for shared resets and responsive layout.
export const baseCss = `/* index.css */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

img,
svg {
  display: block;
}
@page {
  size: letter portrait;
  margin: 0;
}

@media print {
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
  }
}

/* Phone layout: compact, readable, and touch friendly without scaling the
   desktop interface up. */
@media screen and (max-width: 767px) {
  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
  }

  body {
    line-height: 1.4;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
  }

  #root {
    width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  

  

  

  

  

  

  .global-document-search {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    max-width: none !important;
    margin: 0 !important;
  }

  .global-document-search input {
    height: 2.65rem;
    font-size: 1rem !important;
  }

  .app-content {
    padding: 0.75rem !important;
    min-width: 0 !important;
    -webkit-overflow-scrolling: touch;
  }

  .employee-office-name {
    font-size: 0.8125rem !important;
    line-height: 1.15rem !important;
  }

  

  

  

  

  

  

  

  

  /* Modals should use nearly the full phone width and remain scrollable. */
  .fixed.inset-0 {
    padding: 0.5rem !important;
  }

  .fixed.inset-0 > div:not(.absolute) {
    max-width: calc(100vw - 1rem) !important;
  }

  [role='dialog'] > div,
  [role='alertdialog'] > div {
    max-width: calc(100vw - 1rem) !important;
    max-height: calc(100dvh - 1rem);
    overflow-y: auto;
  }

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  input:not([type='checkbox']):not([type='radio']):not([type='file']),
  select,
  textarea {
    font-size: 1rem !important;
  }

  button,
  a {
    touch-action: manipulation;
  }

  button,
  input,
  select,
  textarea {
    max-width: 100%;
  }

  button {
    min-height: 2.5rem;
  }

  input[type='range'] {
    min-height: 2.75rem;
  }

  table {
    display: block;
    max-width: 100%;
    min-width: 48rem;
    font-size: 0.75rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  th,
  td {
    white-space: nowrap;
  }
}


`;
