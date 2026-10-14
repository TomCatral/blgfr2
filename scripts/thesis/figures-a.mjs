/**
 * Thesis figures 1-3: conceptual framework, research paradigm, system architecture.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  C,
  bulletList,
  cardinality,
  checkLayout,
  chip,
  crowFoot,
  elbow,
  figureTitle,
  fillRoundRect,
  flowArrow,
  getDiagnostics,
  fitLine,
  fitText,
  legendRow,
  line,
  makeCanvas,
  panel,
  resetTextRecords,
  strokeLine,
  strokeRoundRect,
  verticalLabel,
  writePng,
} from './diagram-lib.mjs';

const OUT = process.argv[2] || path.resolve('output/diagrams');
fs.mkdirSync(OUT, { recursive: true });

function save(canvas, name) {
  fs.writeFileSync(path.join(OUT, name), writePng(canvas));
  console.log(`wrote ${name}`);
}

/* ------------------------------------------------------------------ *
 * Figure 1 - Conceptual Framework (Input-Process-Output)
 * ------------------------------------------------------------------ */
function figure1() {
  const W = 1720;
  const H = 1080;
  const { canvas, ctx } = makeCanvas(W, H);
  resetTextRecords();
  figureTitle(
    ctx,
    W,
    'CONCEPTUAL FRAMEWORK OF THE STUDY',
    'Input\u2013Process\u2013Output (IPO) Model for the Development of a Web-Based Document Tracking and Records Management System',
  );

  const colW = 500;
  const colX = [40, 610, 1180];
  const colY = 88;
  const colH = 900;

  const heads = [
    { t: 'INPUT', c: C.blue },
    { t: 'PROCESS', c: C.teal },
    { t: 'OUTPUT', c: C.green },
  ];
  heads.forEach((head, i) => {
    fillRoundRect(ctx, colX[i], colY, colW, 38, 8, head.c);
    fitLine(ctx, head.t, colX[i] + colW / 2, colY + 25, colW - 20, {
      align: 'center',
      color: C.white,
      maxSize: 16,
      minSize: 11,
      weight: '700',
      label: 'col-head',
    });
  });

  // --- INPUT column
  const inOrg = panel(ctx, colX[0], colY + 50, colW, 400, 'Existing System and Organizational Data', {
    main: C.navy,
    soft: C.navySoft,
  });
  bulletList(
    ctx,
    [
      'Observed BLGF Regional Office II document workflow, forms, logbooks and reporting practices',
      'Incoming and outgoing document metadata, route numbers and attachments',
      'Routing and transfer history, status changes, target dates and remarks',
      'Authorized personnel roles, designations and functional divisions',
      'Documented delays, misplacements, duplicate entries and status-visibility problems',
    ],
    { x: inOrg.innerX, y: inOrg.innerY, w: inOrg.innerW, h: inOrg.innerH },
    { markerColor: C.navy, label: 'f1-input-org' },
  );

  const inTech = panel(ctx, colX[0], colY + 462, colW, 300, 'Technical and Evaluation Inputs', {
    main: C.violet,
    soft: C.violetSoft,
  });
  bulletList(
    ctx,
    [
      'Functional, security and access-control requirements',
      'Hardware, software, browser and network specifications',
      'File-storage, backup and office retention policies',
      'Selected technologies: Angular, Ionic, TypeScript, Express, Prisma, MySQL',
      'ISO/IEC 25010 product-quality model as evaluation basis',
    ],
    { x: inTech.innerX, y: inTech.innerY, w: inTech.innerW, h: inTech.innerH },
    { markerColor: C.violet, label: 'f1-input-tech' },
  );

  // --- PROCESS column
  const procDev = panel(ctx, colX[1], colY + 50, colW, 500, 'Iterative and Incremental Development (Agile)', {
    main: C.teal,
    soft: C.tealSoft,
  });
  const steps = [
    'Requirements analysis and workflow documentation',
    'System and database design',
    'Interface and prototype construction',
    'Server, database and workflow implementation',
    'Functional and integration testing',
    'Review, refinement and increment acceptance',
  ];
  const stepH = 52;
  steps.forEach((step, i) => {
    const y = procDev.innerY + i * (stepH + 8);
    fillRoundRect(ctx, procDev.innerX, y, procDev.innerW, stepH, 6, C.white);
    strokeRoundRect(ctx, procDev.innerX, y, procDev.innerW, stepH, 6, C.teal, 1.2);
    fitText(ctx, `${i + 1}. ${step}`, { x: procDev.innerX + 8, y: y + 2, w: procDev.innerW - 16, h: stepH - 4 }, {
      color: C.body,
      maxSize: 11.5,
      minSize: 8,
      valign: 'middle',
      label: `f1-dev-${i}`,
    });
    if (i < steps.length - 1) {
      line(ctx, procDev.innerX + procDev.innerW / 2, y + stepH, procDev.innerX + procDev.innerW / 2, y + stepH + 8, {
        color: C.teal,
        width: 1.4,
        headSize: 5,
      });
    }
  });

  const procData = panel(ctx, colX[1], colY + 562, colW, 200, 'Research Data Collection and Analysis', {
    main: C.sky,
    soft: C.skySoft,
  });
  bulletList(
    ctx,
    [
      'Interviews, workflow observation and documentary review',
      'Task-based pilot testing and functional verification',
      'ISO/IEC 25010 structured questionnaire administration',
      'Frequency, percentage, weighted mean and thematic analysis',
    ],
    { x: procData.innerX, y: procData.innerY, w: procData.innerW, h: procData.innerH },
    { markerColor: C.sky, label: 'f1-proc-data' },
  );

  // --- OUTPUT column
  const outSys = panel(ctx, colX[2], colY + 50, colW, 400, 'System Deliverable', {
    main: C.green,
    soft: C.greenSoft,
  });
  bulletList(
    ctx,
    [
      'Centralized incoming and outgoing document register',
      'Controlled routing, multi-routing, transfer and decision functions',
      'Notifications, reminders and target-date alerts',
      'Routing-slip, envelope and QR document-identification tools',
      'Office directory, employee folders and audit/envelope logs',
      'Role-based access control and Excel reporting',
    ],
    { x: outSys.innerX, y: outSys.innerY, w: outSys.innerW, h: outSys.innerH },
    { markerColor: C.green, label: 'f1-out-sys' },
  );

  const outRes = panel(ctx, colX[2], colY + 462, colW, 300, 'Expected Outcomes and Evaluation Results', {
    main: C.amber,
    soft: C.amberSoft,
  });
  bulletList(
    ctx,
    [
      'Faster document processing, retrieval and reporting',
      'Clear accountability through a complete chain of custody',
      'Verified task results from functional testing',
      'ISO/IEC 25010 quality ratings from pilot respondents',
      'Documented user feedback, users\u2019 manual and recommendations',
    ],
    { x: outRes.innerX, y: outRes.innerY, w: outRes.innerW, h: outRes.innerH },
    { markerColor: C.amber, label: 'f1-out-res' },
  );

  // --- Column flow arrows
  for (const y of [colY + 240, colY + 640]) {
    flowArrow(ctx, colX[0] + colW + 6, y, colX[1] - 8, y, null, { color: C.navy, width: 2.6, headSize: 11 });
  }
  for (const y of [colY + 240, colY + 640]) {
    flowArrow(ctx, colX[1] + colW + 6, y, colX[2] - 8, y, null, { color: C.teal, width: 2.6, headSize: 11 });
  }
  verticalLabel(ctx, colX[1] - 18, colY + 340, 190, 'requirements and data', { color: C.navy, label: 'f1-lbl1' });
  verticalLabel(ctx, colX[1] - 34, colY + 340, 210, 'analysis, design, build and test', {
    color: C.navy,
    label: 'f1-lbl1b',
  });
  verticalLabel(ctx, colX[2] - 18, colY + 340, 190, 'the operating system', { color: C.teal, label: 'f1-lbl2' });
  verticalLabel(ctx, colX[2] - 34, colY + 340, 210, 'and the measured outcomes', {
    color: C.teal,
    label: 'f1-lbl2b',
  });


  // --- Iterative feedback arc
  const arcY = colY + colH + 26;
  elbow(
    ctx,
    [
      { x: colX[2] + colW / 2, y: colY + colH },
      { x: colX[2] + colW / 2, y: arcY },
      { x: colX[1] / 2 + 40, y: arcY },
      { x: colX[1] / 2 + 40, y: colY + colH },
    ],
    { color: C.rose, width: 2, dash: [7, 5], headSize: 10 },
  );
  fitLine(ctx, 'Evaluated findings feed back into the next development increment', colX[1] / 2 + 310, arcY + 5, 620, {
    align: 'center',
    color: C.rose,
    maxSize: 11,
    minSize: 8,
    weight: '600',
    label: 'f1-feedback',
  });

  checkLayout(W, H, { scope: 'fig1' });

  return canvas;
}

/* ------------------------------------------------------------------ *
 * Figure 2 - Research Paradigm
 * ------------------------------------------------------------------ */
function figure2() {
  const W = 1720;
  const H = 1000;
  const { canvas, ctx } = makeCanvas(W, H);
  resetTextRecords();
  figureTitle(
    ctx,
    W,
    'RESEARCH PARADIGM OF THE STUDY',
    'Evidence, implementation activities, measurement procedures and intended outcomes of the research',
  );

  const bands = [
    { x: 40, w: 360, t: 'RESEARCH INPUTS', c: C.blue },
    { x: 440, w: 400, t: 'SYSTEM DEVELOPMENT', c: C.teal },
    { x: 880, w: 360, t: 'EVALUATION PROCEDURES', c: C.violet },
    { x: 1280, w: 400, t: 'INTENDED OUTCOMES', c: C.green },
  ];
  const top = 96;
  const h = 700;

  bands.forEach((band) => {
    fillRoundRect(ctx, band.x, top, band.w, 36, 8, band.c);
    fitLine(ctx, band.t, band.x + band.w / 2, top + 24, band.w - 14, {
      align: 'center',
      color: C.white,
      maxSize: 14,
      minSize: 9.5,
      weight: '700',
      label: `f2-band-${band.t}`,
    });
    fillRoundRect(ctx, band.x, top + 36, band.w, h, 10, C.slateSoft);
    strokeRoundRect(ctx, band.x, top + 36, band.w, h, 10, band.c, 1.8);
  });

  bulletList(
    ctx,
    [
      'Existing BLGF Regional Office II workflow and office rules',
      'Document forms, route numbers and metadata requirements',
      'Routing, attachment and log information',
      'User roles, designations and division responsibilities',
      'Observed delays, errors and retrieval problems',
      'Functional, access-control and notification requirements',
      'Hardware, software, storage and network resources',
      'ISO/IEC 25010 product-quality criteria',
    ],
    { x: bands[0].x + 16, y: top + 58, w: bands[0].w - 32, h: h - 44 },
    { markerColor: C.blue, label: 'f2-inputs' },
  );

  bulletList(
    ctx,
    [
      'Increment 1 \u2014 Authentication, roles and document registration',
      'Increment 2 \u2014 Routing, multi-routing and transfer workflow',
      'Increment 3 \u2014 Notifications, attachments and history',
      'Increment 4 \u2014 Routing slip, envelope studio and QR tools',
      'Increment 5 \u2014 Office directory, employee records and folders',
      'Increment 6 \u2014 Reports, audit logs, envelope logs and administration',
    ],
    { x: bands[1].x + 16, y: top + 58, w: bands[1].w - 32, h: h - 44 },
    { markerColor: C.teal, label: 'f2-dev' },
  );
  fitText(
    ctx,
    'Each increment passes through requirements analysis, design, coding, testing, integration and acceptance review before the next increment begins.',
    { x: bands[1].x + 16, y: top + h - 76, w: bands[1].w - 32, h: 60 },
    {
      color: C.teal,
      italic: true,
      maxSize: 11,
      minSize: 8.5,
      align: 'center',
      valign: 'middle',
      label: 'f2-dev-note',
    },
  );

  bulletList(
    ctx,
    [
      'Functional verification of every documented module',
      'Role and access-control testing',
      'Task-based user testing of relevant modules',
      'Administration of the 30-item ISO/IEC 25010 questionnaire',
      'Analysis of open-ended comments and observed issues',
    ],
    { x: bands[2].x + 16, y: top + 58, w: bands[2].w - 32, h: h - 44 },
    { markerColor: C.violet, label: 'f2-eval' },
  );

  bulletList(
    ctx,
    [
      'An operational web-based document tracking and records management system',
      'Centralized, searchable and traceable document records',
      'Verified task results for registration, routing and retrieval',
      'Measured ISO/IEC 25010 quality characteristic ratings',
      'Documented user feedback and identified usability issues',
      'Users\u2019 manual, source code and improvement recommendations',
    ],
    { x: bands[3].x + 16, y: top + 58, w: bands[3].w - 32, h: h - 44 },
    { markerColor: C.green, label: 'f2-out' },
  );

  const midY = top + h / 2 + 18;
  for (let i = 0; i < bands.length - 1; i += 1) {
    const x1 = bands[i].x + bands[i].w + 5;
    const x2 = bands[i + 1].x - 7;
    flowArrow(ctx, x1, midY, x2, midY, null, { color: bands[i].c, width: 2.6, headSize: 11 });
  }
  fitLine(ctx, 'analysed', (bands[0].x + bands[0].w + bands[1].x) / 2, midY - 12, 70, {
    align: 'center',
    color: C.blue,
    maxSize: 10,
    minSize: 7.5,
    weight: '600',
    label: 'f2-a1',
  });
  fitLine(ctx, 'built', (bands[1].x + bands[1].w + bands[2].x) / 2, midY - 12, 70, {
    align: 'center',
    color: C.teal,
    maxSize: 10,
    minSize: 7.5,
    weight: '600',
    label: 'f2-a2',
  });
  fitLine(ctx, 'measured', (bands[2].x + bands[2].w + bands[3].x) / 2, midY - 12, 70, {
    align: 'center',
    color: C.violet,
    maxSize: 10,
    minSize: 7.5,
    weight: '600',
    label: 'f2-a3',
  });

  // feedback loop
  const fy = top + h + 62;
  elbow(
    ctx,
    [
      { x: bands[2].x + bands[2].w / 2, y: top + h + 36 },
      { x: bands[2].x + bands[2].w / 2, y: fy },
      { x: bands[1].x + bands[1].w / 2, y: fy },
      { x: bands[1].x + bands[1].w / 2, y: top + h + 36 },
    ],
    { color: C.rose, width: 2, dash: [7, 5], headSize: 10 },
  );
  fitLine(
    ctx,
    'Defects, usability issues and evaluation ratings are corrected in the next increment',
    (bands[1].x + bands[1].w / 2 + bands[2].x + bands[2].w / 2) / 2,
    fy + 5,
    700,
    { align: 'center', color: C.rose, maxSize: 11.5, minSize: 8, weight: '600', label: 'f2-feedback' },
  );

  legendRow(
    ctx,
    W / 2 - 320,
    fy + 40,
    [
      { color: C.blue, label: 'Research inputs' },
      { color: C.teal, label: 'Development activities' },
      { color: C.violet, label: 'Evaluation procedures' },
      { color: C.green, label: 'Intended outcomes' },
      { color: C.rose, style: 'dash', label: 'Iterative feedback' },
    ],
    { size: 10.5 },
  );

  checkLayout(W, H, { scope: 'fig2' });

  return canvas;
}

/* ------------------------------------------------------------------ *
 * Figure 3 - System Architecture
 * ------------------------------------------------------------------ */
function figure3() {
  const W = 1760;
  const H = 1160;
  const { canvas, ctx } = makeCanvas(W, H);
  resetTextRecords();
  figureTitle(
    ctx,
    W,
    'SYSTEM ARCHITECTURE OF THE DEVELOPED SYSTEM',
    'Three-tier web architecture: Angular/Ionic presentation layer, Express application programming interface, and MySQL data layer with file storage',
  );

  const x0 = 150;
  const w = W - x0 - 150;
  const layers = [
    { y: 92, h: 172, t: 'PRESENTATION LAYER  \u2014  Angular 19 + Ionic 8 single-page client (browser)', c: C.blue },
    { y: 284, h: 96, t: 'CLIENT FRAMEWORK LAYER  \u2014  Angular Signals, RxJS, HttpClient, X-User-Id interceptor', c: C.sky },
    { y: 400, h: 224, t: 'APPLICATION / API LAYER  \u2014  Express 4 + TypeScript REST endpoints (Node.js)', c: C.teal },
    { y: 644, h: 128, t: 'DATA ACCESS LAYER  \u2014  Prisma ORM 6 and JSON fallback store', c: C.violet },
    { y: 792, h: 214, t: 'STORAGE LAYER  \u2014  MySQL 8 relational database and managed file directories', c: C.amber },
  ];

  layers.forEach((layer) => {
    fillRoundRect(ctx, x0, layer.y, w, layer.h, 10, C.slateSoft);
    strokeRoundRect(ctx, x0, layer.y, w, layer.h, 10, layer.c, 2);
    fillRoundRect(ctx, x0, layer.y, w, 30, 10, layer.c);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, layer.y + 16, w, 16);
    ctx.clip();
    ctx.fillStyle = layer.c;
    ctx.fillRect(x0, layer.y, w, 30);
    ctx.restore();
    fitLine(ctx, layer.t, x0 + w / 2, layer.y + 20, w - 24, {
      align: 'center',
      color: C.white,
      maxSize: 13,
      minSize: 9,
      weight: '700',
      label: `f3-layer-${layer.t}`,
    });
  });

  // Presentation layer contents
  const layerInner = (layer, padX = 14, padTop = 40, padBottom = 12) => ({
    x: x0 + padX,
    y: layer.y + padTop,
    w: w - padX * 2,
    h: layer.h - padTop - padBottom,
  });

  const views = [
    'Login &\nTemporary\nPassword Setup',
    'Dashboard &\nDivision Workload',
    'Incoming &\nOutgoing Lists',
    'Routing\nFollow-up',
    'Document\nDetail & Flow',
    'Create /\nRoute /\nDecision',
    'Routing Slip\nWorkspace',
    'Outgoing\nEnvelope Studio',
    'Office\nDirectory',
    'QR Code\nGenerator',
    'Incoming / Outgoing /\nEnvelope Reports',
    'Audit & Envelope Logs,\nUser Accounts, Settings',
  ];
  const viewColors = [
    { main: C.blue, soft: C.blueSoft },
    { main: C.blue, soft: C.blueSoft },
    { main: C.blue, soft: C.blueSoft },
    { main: C.sky, soft: C.skySoft },
    { main: C.sky, soft: C.skySoft },
    { main: C.sky, soft: C.skySoft },
    { main: C.green, soft: C.greenSoft },
    { main: C.green, soft: C.greenSoft },
    { main: C.green, soft: C.greenSoft },
    { main: C.green, soft: C.greenSoft },
    { main: C.violet, soft: C.violetSoft },
    { main: C.violet, soft: C.violetSoft },
  ];
  const cols = 6;
  const gapX = 12;
  const gapY = 12;
  const inner = layerInner(layers[0]);
  const bw = (inner.w - gapX * (cols - 1)) / cols;
  const bh = (inner.h - gapY) / 2;
  views.forEach((label, i) => {
    const r = Math.floor(i / cols);
    const cIdx = i % cols;
    const bx = inner.x + cIdx * (bw + gapX);
    const by = inner.y + r * (bh + gapY);
    const col = viewColors[i];
    fillRoundRect(ctx, bx, by, bw, bh, 6, col.soft);
    strokeRoundRect(ctx, bx, by, bw, bh, 6, col.main, 1.2);
    fitText(ctx, label, { x: bx + 4, y: by + 2, w: bw - 8, h: bh - 4 }, {
      align: 'center',
      valign: 'middle',
      color: C.ink,
      maxSize: 10,
      minSize: 7,
      weight: '600',
      label: `f3-view-${i}`,
    });
  });

  // Client framework contents
  const fwInner = layerInner(layers[1]);
  const frameworks = [
    'Angular standalone components, signals and computed state',
    'Ionic 8 UI components, Ionicons and responsive SCSS theme',
    'RxJS observables with interval polling for live updates',
    'Document-visibility, attachment-visibility and status policy utilities',
  ];
  const fwGap = 12;
  const fwW = (fwInner.w - fwGap * 3) / 4;
  frameworks.forEach((label, i) => {
    const bx = fwInner.x + i * (fwW + fwGap);
    fillRoundRect(ctx, bx, fwInner.y, fwW, fwInner.h, 6, C.white);
    strokeRoundRect(ctx, bx, fwInner.y, fwW, fwInner.h, 6, C.sky, 1.2);
    fitText(ctx, label, { x: bx + 5, y: fwInner.y + 2, w: fwW - 10, h: fwInner.h - 4 }, {
      align: 'center',
      valign: 'middle',
      color: C.body,
      maxSize: 10,
      minSize: 7.5,
      weight: '500',
      label: `f3-fw-${i}`,
    });
  });

  // API layer contents
  const apis = [
    ['Authentication and role-authorization service', 'Login, active-account check, temporary-password completion, password recovery, self-service profile update', C.blue],
    ['Document workflow service', 'Register, next route number, read, update, attach file, delete transaction', C.teal],
    ['Routing and decision engine', 'Route, multi-route, transfer, approve/disapprove, remove mistaken route, final instructions', C.teal],
    ['Notification and reminder engine', 'Derived action-required alerts, transaction activity feed, in-app routing reminders', C.violet],
    ['Records, storage and file service', 'Managed folders, records library upload/read/rename/delete, document and profile storage', C.amber],
    ['Output and reporting services', 'Routing-slip templates, envelope dispatch logging, official PDF generation, Excel report export', C.green],
    ['Audit, accountability and export', 'Audit log and envelope log writing, retrieval, monthly Excel save, system health check', C.slate],
  ];
  const apiCols = 4;
  const apiGap = 12;
  const apiInner = layerInner(layers[2]);
  const abw = (apiInner.w - apiGap * (apiCols - 1)) / apiCols;
  const abh = (apiInner.h - apiGap) / 2;
  apis.forEach(([title, body, col], i) => {
    const r = Math.floor(i / apiCols);
    const cIdx = i % apiCols;
    const bx = apiInner.x + cIdx * (abw + apiGap);
    const by = apiInner.y + r * (abh + apiGap);
    const height = i === apis.length - 1 ? abh : abh;
    fillRoundRect(ctx, bx, by, abw, height, 6, C.white);
    strokeRoundRect(ctx, bx, by, abw, height, 6, col, 1.3);
    fillRoundRect(ctx, bx, by, abw, 20, 6, col);
    fitText(ctx, title, { x: bx + 5, y: by + 1, w: abw - 10, h: 18 }, {
      align: 'center',
      valign: 'middle',
      color: C.white,
      maxSize: 10,
      minSize: 7.5,
      weight: '700',
      label: `f3-api-t-${i}`,
    });
    fitText(ctx, body, { x: bx + 6, y: by + 23, w: abw - 12, h: height - 27 }, {
      align: 'center',
      valign: 'middle',
      color: C.body,
      maxSize: 9.5,
      minSize: 7,
      weight: '500',
      label: `f3-api-b-${i}`,
    });
  });

  // Data access layer contents
  const dal = [
    ['Prisma Client 6', 'Typed data access, index definitions, referential actions and upsert writes for all ten MySQL tables'],
    ['MySQL 8 database', 'divisions, users, documents, document_routes, document_attachments, audit_logs, envelope_logs, employee_profiles, directory_sections, system_settings'],
    ['JSON fallback store', 'File-backed mirror used when the managed MySQL service is unavailable, preserving continuity of service'],
  ];
  const dalGap = 14;
  const dalInner = layerInner(layers[3]);
  const dalW = (dalInner.w - dalGap * 2) / 3;
  dal.forEach(([title, body], i) => {
    const bx = dalInner.x + i * (dalW + dalGap);
    fillRoundRect(ctx, bx, dalInner.y, dalW, dalInner.h, 6, C.white);
    strokeRoundRect(ctx, bx, dalInner.y, dalW, dalInner.h, 6, C.violet, 1.3);
    fitText(ctx, title, { x: bx + 6, y: dalInner.y + 3, w: dalW - 12, h: 22 }, {
      align: 'center',
      valign: 'middle',
      color: C.violet,
      maxSize: 11.5,
      minSize: 8.5,
      weight: '700',
      label: `f3-dal-t-${i}`,
    });
    fitText(ctx, body, { x: bx + 8, y: dalInner.y + 26, w: dalW - 16, h: dalInner.h - 30 }, {
      align: 'center',
      valign: 'middle',
      color: C.body,
      maxSize: 9.5,
      minSize: 7,
      weight: '500',
      label: `f3-dal-b-${i}`,
    });
  });

  // Storage layer contents
  const stores = [
    ['documents', 'Transactional data: registration, routing, decisions, notifications, audit and envelope logs', C.teal],
    ['storage/attachments', 'Uploaded document attachments and reply files', C.blue],
    ['storage/profile-pictures', 'User avatar images', C.sky],
    ['storage/login-background', 'Custom login page background image', C.violet],
    ['records-management', 'Office record folders and office-document library', C.amber],
    ['system_settings', 'Key/value application settings (login background and similar)', C.green],
  ];
  const storeCols = 3;
  const storeGap = 12;
  const storeInner = layerInner(layers[4]);
  const sbw = (storeInner.w - storeGap * (storeCols - 1)) / storeCols;
  const sbh = (storeInner.h - storeGap) / 2;
  stores.forEach(([title, body, col], i) => {
    const r = Math.floor(i / storeCols);
    const cIdx = i % storeCols;
    const bx = storeInner.x + cIdx * (sbw + storeGap);
    const by = storeInner.y + r * (sbh + storeGap);
    fillRoundRect(ctx, bx, by, sbw, sbh, 6, C.white);
    strokeRoundRect(ctx, bx, by, sbw, sbh, 6, col, 1.3);
    fitText(ctx, title, { x: bx + 6, y: by + 2, w: sbw - 12, h: 20 }, {
      align: 'center',
      valign: 'middle',
      color: col,
      maxSize: 11,
      minSize: 8,
      weight: '700',
      label: `f3-store-t-${i}`,
    });
    fitText(ctx, body, { x: bx + 8, y: by + 22, w: sbw - 16, h: sbh - 26 }, {
      align: 'center',
      valign: 'middle',
      color: C.body,
      maxSize: 9.5,
      minSize: 7,
      weight: '500',
      label: `f3-store-b-${i}`,
    });
  });

  // Layer flow arrows
  const mid = x0 + w / 2;
  const arrows = [
    [layers[0].y + layers[0].h, layers[1].y],
    [layers[1].y + layers[1].h, layers[2].y],
    [layers[2].y + layers[2].h, layers[3].y],
    [layers[3].y + layers[3].h, layers[4].y],
  ];
  arrows.forEach(([y1, y2], i) => {
    flowArrow(ctx, mid, y1 + 2, mid, y2 - 4, null, { color: C.line, width: 2.2, headSize: 10 });
  });
  // return path
  const rx = x0 + w - 26;
  elbow(
    ctx,
    [
      { x: rx, y: layers[4].y + layers[4].h / 2 },
      { x: rx + 22, y: layers[4].y + layers[4].h / 2 },
      { x: rx + 22, y: layers[0].y + layers[0].h / 2 },
      { x: rx + 4, y: layers[0].y + layers[0].h / 2 },
    ],
    { color: C.green, width: 2, dash: [6, 4], headSize: 9 },
  );
  fitLine(ctx, 'queries and results', rx + 22, layers[0].y + layers[0].h + 16, 150, {
    align: 'center',
    color: C.green,
    maxSize: 9.5,
    minSize: 7,
    weight: '600',
    label: 'f3-return',
  });

  // side annotations
  const leftLabels = [
    [layers[0].y + layers[0].h / 2, 'Supported web browser\n(Chromium, Firefox, Edge)'],
    [layers[1].y + layers[1].h / 2, 'Client-side policy\nand interaction rules'],
    [layers[2].y + layers[2].h / 2, 'Validation, workflow\nand authorization'],
    [layers[3].y + layers[3].h / 2, 'Persistence\nand fallback'],
    [layers[4].y + layers[4].h / 2, 'Durable records\nand file content'],
  ];
  leftLabels.forEach(([y, label], i) => {
    fillRoundRect(ctx, 8, y - 32, x0 - 30, 64, 8, C.white);
    strokeRoundRect(ctx, 8, y - 32, x0 - 30, 64, 8, C.hair, 1.2, [4, 3]);
    fitText(ctx, label, { x: 14, y: y - 28, w: x0 - 42, h: 56 }, {
      align: 'center',
      valign: 'middle',
      color: C.muted,
      maxSize: 10,
      minSize: 7.5,
      weight: '600',
      label: `f3-side-${i}`,
    });
    line(ctx, x0 - 4, y, x0 + 6, y, { color: C.hair, width: 1.2, head: false });
  });

  // deployment footer
  const dy = layers[4].y + layers[4].h + 26;
  let cx = x0;
  const deploy = [
    'Development:  npm run dev (Angular live-reload proxy)',
    'Production:   npm run build  \u2192  npm start',
    'Container:    Docker Compose (MySQL 8.4 + app)',
    'Hosting:      Vercel serverless handler (api/index.js)',
  ];
  deploy.forEach((label) => {
    cx += chip(ctx, cx, dy, label, { main: C.navy, soft: C.navySoft }, { size: 10, h: 24 }) + 12;
  });

  legendRow(
    ctx,
    x0,
    dy + 44,
    [
      { color: C.blue, label: 'Presentation' },
      { color: C.sky, label: 'Client framework' },
      { color: C.teal, label: 'Application / API' },
      { color: C.violet, label: 'Data access' },
      { color: C.amber, label: 'Storage' },
      { color: C.green, style: 'dash', label: 'Query and result flow' },
    ],
    { size: 10.5 },
  );

  // unused-import guard for helpers kept for parity with the shared library
  void cardinality;
  void crowFoot;
  checkLayout(W, H, { scope: 'fig3' });
  return canvas;
}

save(figure1(), 'fig1-conceptual-framework.png');
save(figure2(), 'fig2-research-paradigm.png');
save(figure3(), 'fig3-system-architecture.png');

const diagnostics = getDiagnostics();
if (diagnostics.length) {
  console.log('\n--- layout diagnostics ---');
  for (const d of diagnostics) console.log(`${d.kind}: ${d.message}`);
  process.exitCode = 1;
} else {
  console.log('\nno layout diagnostics');
}