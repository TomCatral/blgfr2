# BLGF Ionic Angular Migration - Porting Conventions

Convert a React+MUI component from `frontend/src/components/...` into an Angular 19 standalone component in this project.
READ the React source file first, then translate it faithfully: same behavior, same layout structure, same labels, same
design system classes. Do NOT change features, flow, or architecture.

## Target location / naming
- Pages: `src/app/components/pages/<kebab-name>/<kebab-name>.component.ts` (one file per component, keep the component
  TS + template inline; add a `styleUrl` SCSS only for custom CSS the React file contains as a CSS-module string,
  otherwise use template inline styles / cx utility classes only).
- Modals: `src/app/components/modals/<kebab-name>/<kebab-name>.component.ts`.
- Class names stay PascalCase identical to the React named export (e.g. `DashboardView` -> `DashboardComponent`; use
  `<kebab-name>.component` selector like `app-dashboard`).

## Imports to use
- `import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';`
- `import { CommonModule, DatePipe } from '@angular/common';`
- `import { FormsModule } from '@angular/forms';`
- Design classes: use the `cls` pipe: `import { ClsPipe } from '../../../../shared/cls.pipe';` (adjust depth per folder)
  and bind classes as `[class]="'flex items-center gap-2 ...' | cls"`. For a leading static class list you can also use
  `class="..."` when no Tailwind-style tokens are involved. `cls` pipes the React `cx(...)` equivalents, so utility
  classes like `p-4`, `bg-slate-50`, `dark:bg-slate-950`, `text-sm`, `flex`, `grid`, `rounded-xl` etc. must go through
  `| cls` (they are obfuscated at runtime).
- `import { cx } from '../../../../shared/class-utils';` when you need to compute classes in TS (returns resolved string).
- Types: `import { ... } from '../../../../types';`
- Utils: `import { ... } from '../../../../utils/<kebab-file>';` (status-utils -> status-utils, document-visibility,
  attachment-visibility, routing-recipients, recipient-flow, progress, document-files, routing-popup-snooze).
- Services (Angular DI): `import { SessionService } from '../../../../services/session.service';`
  `import { StateService } from '../../../../services/state.service';` `import { ApiService } from '../../../../services/api.service';`
  `import { UiService } from '../../../../services/ui.service';`
  `import { DialogService, showConfirm, showPrompt } from '../../../../services/dialog.service';`
- Modals use `app-modal-layer` (AppModalLayerComponent, with `[isOpen]`, `[onClose]="fn"`, `[maxWidth]="'40rem'"`) to
  reproduce MUI `<Dialog>` overlays, plus `app-autocomplete-field` and `app-dialog-host` / showConfirm+showPrompt.

## Data access (vital)
- Do NOT call ApiService directly for shared data. Read shared state from signals: `inject(StateService)` then
  `state.documents()`, `state.stats()`, `state.users()`, `state.divisions()`, `state.auditLogs()`,
  `state.envelopeLogs()`, `state.notifications()`. Current user: `inject(SessionService).currentUser()`.
- UiService exposes `showSuccess(message)` and `showError(message)` (replaces React alert()/popups).
- `window.alert(x)` works in TS (AppComponent overrides it to show the app popup) - you may call `alert(...)` directly.

## Props mapping (parent -> child)
The parent (AppComponent) passes React-style props. Map them in your component as follows:
- simple values: `@Input() documents: DocumentRecord[] = [];` (etc.)
- callback props: `@Input() onSelectDoc: (doc: DocumentRecord) => void = () => {};`
  (functions passed as @Input - identical names and signatures to the React props, so behavior stays identical)
- EventEmitter is NOT used for callbacks in pages/modals; only function @Inputs, matching App.tsx wiring.

## Design token facts
- Dark mode toggles class `dark` on `<html>` + `<body>` (already done globally). Use `dark:` variants.
- CSS variables available: `var(--ui-surface)`, `var(--ui-soft)`, `var(--ui-border)`, `var(--ui-muted)`,
  `var(--ui-text)`, `var(--ui-blue)`, `var(--ui-green)` etc. Usage: `text-[color:var(--ui-text)]`,
  `bg-[color:var(--ui-soft)]`, `border-[color:var(--ui-border)]`. (These go through `| cls` too.)
- Global design CSS is injected once (`_header_`, `_menu_`, `_sidebar_`, `app-content`, `global-document-search`,
  `modal-reminder-panel`, etc.). If the React component uses its own CSS-module string (e.g. `notificationDrawerCss`,
  `qrCodeGeneratorCss`, `outgoingEnvelopeCss`), port it verbatim into a `.scss` file next to the component and reference
  `styleUrl: './<name>.scss'`. Plain CSS is valid SCSS.
- Status/priority badges: reuse `STATUS_CONFIGS`, `PRIORITY_CONFIGS` from `status-utils` () `.badgeClass`.
- Icons: use Ionic `ion-icon` with `name="..."` mapping. Common mapping from lucide-react:
  Plus->add, Search->search, Bell->notifications, Sun->sunny, Moon->moon, X->close, ArrowLeft->arrow-back,
  ArrowRight->arrow-forward, Menu->menu, Trash2->trash, Pencil->create, Eye->eye, QrCode->qr-code, Users->people,
  Download->download, Camera->camera, ScanLine->scan, FileText->document-text, Send->paper-plane, CheckCircle2->checkmark-circle,
  XCircle->close-circle, ChevronDown->chevron-down, Upload->cloud-upload, Printer->print, Mail->mail, LayoutDashboard->grid,
  ClipboardList->clipboard, FileSpreadsheet->file-tray, BellRing->notifications, UserCircle->person-circle,
  Settings->settings, Shield->shield-checkmark, Lock->lock-closed, KeyRound->key, LogIn->log-in, LogOut->log-out,
  EyeOff->eye-off, AlertTriangle->alert-circle, Clock->time, Calendar->calendar, Filter->funnel, RefreshCw->refresh,
  Paperclip->attach, ExternalLink->open, Video/History->history, Pallete->color-palette.

## Forms
- `[(ngModel)]` needs `FormsModule` imported. `<form (ngSubmit)="...">` for submit buttons.
- File uploads: `(change)="onFilePicked($event)"` with `HTMLInputElement` from `$event.target`.
- The global input autocomplete provider is already mounted at the root - no need to add it.

## Do NOT
- Do not change logic/decisions/validation rules/UX flow.
- Do not rename fields or add/remove features.
- Do not call/restructure services. Keep signatures of util helpers identical to the React versions they port.
- Do not create new shared components unless required; prefer existing ones.
- Do not add comments to the code. Only the file-top header comment style from React may be dropped.

## Verification
- Run `npx tsc --noEmit -p src/tsconfig.app.json` won't work from this subdir; instead rely on self-review: ensure
  imports resolve, all imports used, no MUI/React imports remain, methods referenced in the template exist.