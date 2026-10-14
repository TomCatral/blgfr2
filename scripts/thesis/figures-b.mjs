/**
 * Thesis figures 4-5: use-case diagram and context data-flow diagram.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  C,
  arrowHead,
  checkLayout,
  fillEllipse,
  fillRoundRect,
  figureTitle,
  fitText,
  getDiagnostics,
  line,
  makeCanvas,
  resetTextRecords,
  strokeLine,
  strokeRoundRect,
  stickFigure,
  strokeRect,
  wrapText,
  writePng,
} from './diagram-lib.mjs';

const OUT = process.argv[2] || path.resolve('output/diagrams');
fs.mkdirSync(OUT, { recursive: true });

function save(canvas, name) {
  fs.writeFileSync(path.join(OUT, name), writePng(canvas));
  console.log(`wrote ${name}`);
}

/**
 * Straight data flow with a white-backed caption.
 *
 * Shallow diagonals get the caption stacked above or below the shaft; steep
 * diagonals and verticals get it pushed along the line normal, automatically
 * toward whichever side is farther from the figure centre so the caption never
 * lands on top of a neighbouring flow.
 */
function flow(ctx, x1, y1, x2, y2, label, options = {}) {
  const {
    color = C.line,
    width = 1.9,
    t = 0.5,
    side = 'above',
    labelW = 210,
    dash = null,
    center = [880, 590],
  } = options;
  line(ctx, x1, y1, x2, y2, { color, width, dash });
  const mx = x1 + (x2 - x1) * t;
  const my = y1 + (y2 - y1) * t;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const horizontal = Math.abs(dx) / len >= 0.72;

  // Measure only; the caption is drawn exactly once so it is recorded once.
  let h = 24;
  for (let size = 10; size >= 7.5; size -= 0.25) {
    const lines = wrapText(ctx, label, labelW - 8, size, '600');
    h = lines.length * 13 + 6;
    if (h <= 30) break;
  }

  let bx;
  let by;
  if (horizontal) {
    bx = mx - labelW / 2;
    by = side === 'above' ? my - h - 6 : my + 6;
  } else {
    const nx = -dy / len;
    const ny = dx / len;
    const outward = (mx - center[0]) * nx + (my - center[1]) * ny >= 0 ? 1 : -1;
    const push = h / 2 + 6;
    bx = mx + outward * nx * push - labelW / 2;
    by = my + outward * ny * push - h / 2;
  }
  fillRoundRect(ctx, bx, by, labelW, h, 4, C.page);
  strokeRoundRect(ctx, bx, by, labelW, h, 4, `${color}55`, 0.9);
  fitText(ctx, label, { x: bx + 4, y: by + 2, w: labelW - 8, h: h - 4 }, {
    align: 'center',
    valign: 'middle',
    color,
    maxSize: 10,
    minSize: 7.5,
    weight: '600',
    label: 'flow',
    maxLines: 3,
  });
}

/* ------------------------------------------------------------------ *
 * Figure 4 - Use-Case Diagram
 * ------------------------------------------------------------------ */
function figure4() {
  const W = 1760;
  const H = 1250;
  const { canvas, ctx } = makeCanvas(W, H);
  resetTextRecords();

  fillRoundRect(ctx, 300, 74, W - 336, 1080, 14, '#f8fbfe');
  strokeRoundRect(ctx, 300, 74, W - 336, 1080, 14, C.navy, 2.4);
  fitText(
    ctx,
    'BLGF REGIONAL OFFICE II \u2014 DOCUMENT TRACKING AND RECORDS MANAGEMENT SYSTEM',
    { x: 320, y: 80, w: W - 376, h: 26 },
    { align: 'center', color: C.navy, maxSize: 15, minSize: 9.5, weight: '700', label: 'f4-sysname' },
  );

  const actors = [
    { id: 'SA', name: 'System\nAdministrator', y: 126 },
    { id: 'AD', name: 'Administrative\nOfficer', y: 316 },
    { id: 'RO', name: 'Records\nOfficer', y: 506 },
    { id: 'DC', name: 'Division Chief /\nApproving Officer', y: 696 },
    { id: 'AO', name: 'Action\nOfficer', y: 886 },
    { id: 'ST', name: 'Staff /\nRegular User', y: 1052 },
  ];

  const groups = [
    {
      id: 'A',
      title: 'Account and Access Management',
      color: C.blue,
      cases: [
        ['Login System', ['SA', 'AD', 'RO', 'DC', 'AO', 'ST']],
        ['Set / Complete Temporary Password', ['SA', 'ST']],
        ['Recover Forgotten Password', ['SA', 'ST']],
        ['Update Own Profile', ['AD', 'RO', 'DC', 'AO', 'ST']],
        ['Manage User Accounts', ['SA']],
        ['Manage System Settings', ['SA']],
        ['View Role Access Matrix', ['SA']],
      ],
    },
    {
      id: 'B',
      title: 'Document Registration and Management',
      color: C.teal,
      cases: [
        ['Register Incoming Document', ['RO', 'AO', 'AD']],
        ['Register Outgoing Document', ['RO', 'AO', 'AD']],
        ['Generate Route Number', ['RO', 'AO', 'AD']],
        ['View Document List and Dashboard', ['AD', 'RO', 'DC', 'AO', 'ST']],
        ['View Document Details and Flow', ['AD', 'RO', 'DC', 'AO', 'ST']],
        ['Upload and Download Attachment', ['RO', 'AO', 'ST']],
        ['Delete Transaction', ['SA', 'RO']],
      ],
    },
    {
      id: 'C',
      title: 'Routing and Workflow Control',
      color: C.green,
      cases: [
        ['Route Document to Next Office', ['RO', 'AO', 'AD']],
        ['Multi-Route Document', ['RO', 'AD']],
        ['Transfer Document to Another Office', ['RO', 'AD']],
        ['Approve Document', ['DC', 'AD']],
        ['Disapprove Document', ['DC', 'AD']],
        ['Release Final Instructions', ['DC', 'RO']],
        ['Remove Mistaken Route Entry', ['RO', 'AD']],
        ['Set On-Hold and Other Status', ['RO', 'AD']],
        ['Monitor Routing and Follow-up', ['DC', 'AD', 'RO']],
      ],
    },
    {
      id: 'D',
      title: 'Notifications and Reports',
      color: C.violet,
      cases: [
        ['View Action Notifications', ['AD', 'RO', 'DC', 'AO', 'ST']],
        ['Receive In-App Routing Reminder', ['AO', 'DC']],
        ['Generate Incoming Report', ['AD', 'RO', 'DC']],
        ['Generate Outgoing Report', ['AD', 'RO', 'DC']],
        ['Generate Envelope Report', ['AD', 'RO']],
        ['Monthly Excel Auto-Save', ['AD', 'SA']],
      ],
    },
    {
      id: 'E',
      title: 'Records, QR and Office Tools',
      color: C.amber,
      cases: [
        ['Generate Routing Slip', ['RO', 'AO']],
        ['Log Outgoing Envelope', ['RO', 'AO']],
        ['Scan QR Code for Document Details', ['RO', 'AO', 'ST']],
        ['Generate QR Code', ['RO', 'AO']],
        ['Browse Office and Employee Directory', ['AD', 'RO', 'DC', 'AO', 'ST']],
        ['Open Document Folder', ['RO', 'AO', 'ST']],
        ['Upload Office-Document Library Record', ['RO', 'AD']],
      ],
    },
    {
      id: 'F',
      title: 'Audit Trail and System Administration',
      color: C.slate,
      cases: [
        ['View Audit Logs', ['SA', 'AD']],
        ['View Envelope Logs', ['SA', 'AD', 'RO']],
        ['View Divisions and Functional Offices', ['SA']],
        ['Check System Health Status', ['SA']],
      ],
    },
  ];

  const panelW = 692;
  const panelH = 330;
  const colX = [316, 1028];
  const rowY = [112, 452, 792];
  const geo = [];

  groups.forEach((group, gi) => {
    const px = colX[gi % 2];
    const py = rowY[Math.floor(gi / 2)];
    fillRoundRect(ctx, px, py, panelW, panelH, 10, C.white);
    strokeRoundRect(ctx, px, py, panelW, panelH, 10, group.color, 1.8);
    fillRoundRect(ctx, px, py, panelW, 28, 10, group.color);
    strokeLine(ctx, px, py + 28, px + panelW, py + 28, group.color, 1.2);
    fitText(ctx, group.title, { x: px + 8, y: py + 2, w: panelW - 16, h: 24 }, {
      align: 'center',
      valign: 'middle',
      color: C.white,
      maxSize: 12.5,
      minSize: 8.5,
      weight: '700',
      label: `f4-grp-${group.id}`,
    });

    const cols = group.cases.length > 6 ? 3 : 2;
    const rows = Math.ceil(group.cases.length / cols);
    const innerX = px + 14;
    const innerY = py + 42;
    const innerW = panelW - 28;
    const innerH = panelH - 56;
    const rx = 108;
    const ry = 31;
    const vGap = (innerH - rows * ry * 2) / Math.max(1, rows - 1);
    group.cases.forEach(([label, users], i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const perRow = Math.min(cols, group.cases.length - r * cols);
      const cellW = innerW / perRow;
      const cx = innerX + cellW * c + cellW / 2;
      const cy = innerY + r * (ry * 2 + vGap) + ry;
      geo.push({ cx, cy, rx, ry, users, group });
      fillEllipse(ctx, cx, cy, rx, ry, group.color === C.slate ? '#f2f6fa' : `${group.color}14`, group.color, 1.4);
      fitText(ctx, label, { x: cx - rx + 7, y: cy - ry + 3, w: (rx - 7) * 2, h: (ry - 3) * 2 }, {
        align: 'center',
        valign: 'middle',
        color: C.ink,
        maxSize: 10.5,
        minSize: 7.5,
        weight: '600',
        label: `f4-case-${group.id}-${i}`,
      });
    });
  });

  // association lines
  ctx.save();
  ctx.strokeStyle = '#a8bccd';
  ctx.lineWidth = 0.85;
  geo.forEach((info) => {
    info.users.forEach((uid) => {
      const actor = actors.find((a) => a.id === uid);
      if (!actor) return;
      ctx.beginPath();
      ctx.moveTo(182, actor.y + 46);
      ctx.lineTo(info.cx - info.rx, info.cy);
      ctx.stroke();
    });
  });
  ctx.restore();

  actors.forEach((actor) => {
    stickFigure(ctx, 182, actor.y, 1, actor.name, { labelWidth: 226, labelSize: 10.5 });
  });

  // legend (two rows of three so the captions stay inside the canvas)
  const lgX = 316;
  const lgY = H - 74;
  fillRoundRect(ctx, lgX, lgY, W - 368, 62, 8, C.slateSoft);
  strokeRoundRect(ctx, lgX, lgY, W - 368, 62, 8, C.hair, 1.2);
  groups.forEach((g, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = lgX + 18 + col * 560;
    const ly = lgY + 22 + row * 24;
    fillEllipse(ctx, lx + 13, ly - 4, 12, 7, `${g.color}18`, g.color, 1.3);
    fitText(ctx, g.title, { x: lx + 32, y: ly - 15, w: 500, h: 22 }, {
      color: C.body,
      maxSize: 10.5,
      minSize: 8,
      weight: '600',
      valign: 'middle',
      label: `f4-leg-${g.id}`,
    });
  });

  void strokeRect;
  checkLayout(W, H, { scope: 'fig4' });
  return canvas;
}

/* ------------------------------------------------------------------ *
 * Figure 5 - Context Data-Flow Diagram
 * ------------------------------------------------------------------ */
function figure5() {
  const W = 1760;
  const H = 1180;
  const { canvas, ctx } = makeCanvas(W, H);
  resetTextRecords();
  figureTitle(
    ctx,
    W,
    'CONTEXT DATA-FLOW DIAGRAM',
    'Level 0 view of the BLGF Regional Office II document tracking and records management system and its external entities',
  );

  const sys = { x: 650, y: 330, w: 460, h: 370 };
  const sysL = sys.x;
  const sysR = sys.x + sys.w;
  const sysB = sys.y + sys.h;

  fillRoundRect(ctx, sys.x, sys.y, sys.w, sys.h, 18, C.blueSoft);
  strokeRoundRect(ctx, sys.x, sys.y, sys.w, sys.h, 18, C.blue, 3);
  fitText(
    ctx,
    '0\n\nBLGF REGIONAL OFFICE II\nDOCUMENT TRACKING AND\nRECORDS MANAGEMENT SYSTEM',
    { x: sys.x + 18, y: sys.y + 18, w: sys.w - 36, h: 190 },
    {
      align: 'center',
      color: C.navy,
      maxSize: 18,
      minSize: 10,
      weight: '700',
      label: 'f5-sysname',
    },
  );
  strokeLine(ctx, sys.x + 44, sys.y + 196, sys.x + sys.w - 44, sys.y + 196, C.blue, 1.4);
  fitText(
    ctx,
    'Registration \u00b7 Routing \u00b7 Multi-routing \u00b7 Transfer\nDecision \u00b7 Notifications \u00b7 Reports\nQR and routing-slip tools \u00b7 Records library\nAudit and envelope logging',
    { x: sys.x + 22, y: sys.y + 202, w: sys.w - 44, h: 150 },
    { align: 'center', color: C.body, maxSize: 13, minSize: 9, weight: '500', label: 'f5-sysdetail' },
  );

  const entities = [
    {
      id: 'E1',
      x: 30,
      y: 140,
      w: 310,
      h: 132,
      title: 'Authorized BLGF Personnel',
      body: 'Records officers, administrative officers, division chiefs, action officers and staff',
      color: C.teal,
    },
    {
      id: 'E3',
      x: 30,
      y: 440,
      w: 310,
      h: 132,
      title: 'Records and Administrative Office',
      body: 'Research client and evaluating office; defines requirements and receives the delivered system',
      color: C.navy,
    },
    {
      id: 'E2',
      x: 1420,
      y: 140,
      w: 310,
      h: 132,
      title: 'System Administrator',
      body: 'Maintains accounts, roles, divisions, system settings and technical configuration',
      color: C.violet,
    },
    {
      id: 'E4',
      x: 1420,
      y: 440,
      w: 310,
      h: 132,
      title: 'External Offices and Recipients',
      body: 'LGU treasuries, other agencies and private recipients of outgoing records',
      color: C.green,
    },
    {
      id: 'E5',
      x: 610,
      y: 880,
      w: 540,
      h: 150,
      title: 'Managed Data and File Storage',
      body: 'MySQL 8 database (ten tables) with JSON fallback store, plus managed file directories for attachments, profile pictures, login background and office records',
      color: C.amber,
    },
  ];

  entities.forEach((e) => {
    fillRoundRect(ctx, e.x, e.y, e.w, e.h, 10, `${e.color}12`);
    strokeRoundRect(ctx, e.x, e.y, e.w, e.h, 10, e.color, 2.4);
    fitText(ctx, `${e.id}  ${e.title}`, { x: e.x + 10, y: e.y + 5, w: e.w - 20, h: 24 }, {
      color: e.color,
      maxSize: 13,
      minSize: 8.5,
      weight: '700',
      label: `f5-ent-${e.id}`,
    });
    fitText(ctx, e.body, { x: e.x + 10, y: e.y + 28, w: e.w - 20, h: e.h - 36 }, {
      color: C.body,
      maxSize: 11,
      minSize: 8,
      weight: '500',
      label: `f5-entb-${e.id}`,
    });
  });

  const L = 200;
  const CENTER = [W / 2, 600];
  // E1 -> system
  flow(ctx, 340, 152, sysL, 360, 'Credentials, roles and profile data', { color: C.teal, t: 0.46, labelW: L, center: CENTER });
  flow(ctx, 340, 175, sysL, 420, 'Document metadata and attachments', { color: C.teal, t: 0.44, labelW: L, center: CENTER });
  flow(ctx, 340, 198, sysL, 480, 'Routing actions and decisions', { color: C.teal, t: 0.42, labelW: L, center: CENTER });
  flow(ctx, 340, 221, sysL, 540, 'QR scans, office records and evaluation feedback', { color: C.teal, t: 0.4, labelW: L, center: CENTER });
  flow(ctx, sysL - 4, 660, 346, 252, 'Document lists, status, logs and reports', { color: C.slate, t: 0.5, labelW: L, center: CENTER });

  // E3 -> system, system -> E3
  flow(ctx, 340, 462, sysL, 620, 'Approved requirements and office policies', { color: C.navy, t: 0.46, labelW: L, center: CENTER });
  flow(ctx, 340, 500, sysL, 672, 'Acceptance and endorsement documents', { color: C.navy, t: 0.42, labelW: L, center: CENTER });
  flow(ctx, sysL - 4, 694, 346, 556, 'Delivered system, documentation, training and evaluation summary', {
    color: C.slate,
    t: 0.44,
    labelW: L,
    center: CENTER,
  });

  // E2 -> system, system -> E2
  flow(ctx, 1420, 152, sysR, 360, 'Accounts, roles and division master data', { color: C.violet, t: 0.46, labelW: L, center: CENTER });
  flow(ctx, 1420, 182, sysR, 430, 'System and login settings', { color: C.violet, t: 0.44, labelW: L, center: CENTER });
  flow(ctx, 1420, 212, sysR, 500, 'Account maintenance actions', { color: C.violet, t: 0.42, labelW: L, center: CENTER });
  flow(ctx, sysR + 4, 640, 1414, 252, 'User list, health status and administrative reports', {
    color: C.slate,
    t: 0.5,
    labelW: L,
    center: CENTER,
  });

  // E4 -> system, system -> E4
  flow(ctx, 1420, 560, sysR, 690, 'Acknowledged receipts and returned documents', { color: C.green, t: 0.42, labelW: L, center: CENTER });
  flow(ctx, sysR + 4, 600, 1414, 462, 'Outgoing records for dispatch', { color: C.slate, t: 0.46, labelW: L, center: CENTER });
  flow(ctx, sysR + 4, 650, 1414, 510, 'Envelope and routing-slip details', { color: C.slate, t: 0.5, labelW: L, center: CENTER });

  // E5 <-> system (captions staggered in two rows so they never collide)
  flow(ctx, 700, 880, 700, sysB + 4, 'Retrieved records and reference data', {
    color: C.amber,
    t: 0.25,
    labelW: 190,
    center: CENTER,
  });
  flow(ctx, 820, 880, 820, sysB + 4, 'Stored registration, routing and log records', {
    color: C.amber,
    t: 0.75,
    labelW: 190,
    center: CENTER,
  });
  flow(ctx, 940, 880, 940, sysB + 4, 'Stored file content and settings', {
    color: C.amber,
    t: 0.25,
    labelW: 175,
    center: CENTER,
  });
  flow(ctx, 1040, 880, 1040, sysB + 4, 'Retrieved attachment and library file content', {
    color: C.amber,
    t: 0.75,
    labelW: 180,
    center: CENTER,
  });

  // legend
  const ly = H - 30;
  fillRoundRect(ctx, 30, ly - 34, W - 60, 52, 8, C.slateSoft);
  strokeRoundRect(ctx, 30, ly - 34, W - 60, 52, 8, C.hair, 1.2);
  fitText(ctx, 'Legend:', 46, ly - 12, 62, {
    color: C.muted,
    maxSize: 11.5,
    minSize: 9,
    weight: '700',
    valign: 'middle',
    label: 'f5-leglabel',
  });
  let lx = 124;
  [
    ['Flow from an entity to the system', C.teal],
    ['Flow from the system to an entity', C.slate],
    ['Flows to and from managed storage', C.amber],
  ].forEach(([label, color]) => {
    line(ctx, lx, ly - 8, lx + 36, ly - 8, { color, width: 2.2 });
    arrowHead(ctx, lx + 36, ly - 8, 0, 9, color);
    fitText(ctx, label, { x: lx + 48, y: ly - 20, w: 420, h: 24 }, {
      color: C.body,
      maxSize: 11.5,
      minSize: 9,
      weight: '500',
      valign: 'middle',
      label: `f5-leg-${label}`,
    });
    lx += 48 + textW(ctx, label, 11.5) + 46;
  });

  checkLayout(W, H, { scope: 'fig5' });
  return canvas;
}

function textW(ctx, text, size) {
  ctx.save();
  ctx.font = `600 ${size}px "Segoe UI", Tahoma, Arial, sans-serif`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

save(figure4(), 'fig4-use-case-diagram.png');
save(figure5(), 'fig5-context-dfd.png');

const diagnostics = getDiagnostics();
if (diagnostics.length) {
  console.log('\n--- layout diagnostics ---');
  for (const d of diagnostics) console.log(`${d.kind}: ${d.message}`);
  process.exitCode = 1;
} else {
  console.log('\nno layout diagnostics');
}
