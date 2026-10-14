/**
 * Thesis figures 6-8: HIPO, IPO diagram, and entity-relationship diagram.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  C,
  cardinality,
  checkLayout,
  crowFoot,
  elbow,
  fillRoundRect,
  figureTitle,
  fitText,
  getDiagnostics,
  line,
  makeCanvas,
  note,
  resetTextRecords,
  strokeLine,
  strokeRoundRect,
  verticalLabel,
  wrapText,
  writePng,
} from './diagram-lib.mjs';

const OUT = process.argv[2] || path.resolve('output/diagrams');
fs.mkdirSync(OUT, { recursive: true });

function save(canvas, name) {
  fs.writeFileSync(path.join(OUT, name), writePng(canvas));
  console.log(`wrote ${name}`);
}

/** Simple grid table renderer used by the HIPO and IPO figures. */
function table(ctx, x, y, colWidths, rowHeights, options = {}) {
  const { headerFill = C.navy, headerColor = C.white, bodyFill = C.white, grid = C.hair, cellColors = null } = options;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  fillRoundRect(ctx, x, y, totalW, rowHeights.reduce((a, b) => a + b, 0), 8, bodyFill);
  let cy = y;
  rowHeights.forEach((rh, ri) => {
    let cx = x;
    colWidths.forEach((cw, ci) => {
      if (ri === 0) {
        fillRoundRect(ctx, cx, cy, cw, rh, 0, headerFill);
      } else if (cellColors) {
        const cc = cellColors(ri, ci);
        if (cc) fillRoundRect(ctx, cx, cy, cw, rh, 0, cc);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx + 1, cy + 1, cw - 2, rh - 2);
      ctx.clip();
      fitText(
        ctx,
        ri === 0 ? options.headerLabels[ci] : options.cell(ri, ci),
        { x: cx + 7, y: cy + 4, w: cw - 14, h: rh - 8 },
        {
          align: ri === 0 ? 'center' : 'left',
          valign: 'middle',
          color: ri === 0 ? headerColor : C.body,
          maxSize: ri === 0 ? 12.5 : 10,
          minSize: ri === 0 ? 9 : 7,
          weight: ri === 0 ? '700' : '500',
          label: `table r${ri}c${ci}`,
        },
      );
      ctx.restore();
      strokeLine(ctx, cx + cw, cy, cx + cw, cy + rh, grid, 1);
      cx += cw;
    });
    if (ri > 0) strokeLine(ctx, x, cy, x + totalW, cy, grid, 1);
    cy += rh;
  });
  const totalH = rowHeights.reduce((a, b) => a + b, 0);
  strokeRoundRect(ctx, x, y, totalW, totalH, 8, C.navy, 2);
  strokeLine(ctx, x, y + rowHeights[0], x + totalW, y + rowHeights[0], C.navy, 1.6);
  return { w: totalW, h: totalH };
}

/* ------------------------------------------------------------------ *
 * Figure 6 - HIPO Diagram
 * ------------------------------------------------------------------ */
function figure6() {
  const W = 1760;
  const H = 1290;
  const { canvas, ctx } = makeCanvas(W, H);
  resetTextRecords();
  figureTitle(
    ctx,
    W,
    'HIERARCHY INPUT\u2013PROCESS\u2013OUTPUT (HIPO) DIAGRAM',
    'Levels 0 and 1 of the system, with the input, process and output details of each functional module at Level 2',
  );

  // Level 0
  const l0 = { x: 470, y: 84, w: 820, h: 92 };
  fillRoundRect(ctx, l0.x, l0.y, l0.w, l0.h, 10, C.navy);
  fitText(ctx, 'LEVEL 0', { x: l0.x, y: l0.y + 6, w: l0.w, h: 20 }, {
    align: 'center',
    color: '#bcd3e6',
    maxSize: 11,
    minSize: 8.5,
    weight: '700',
    label: 'f6-l0tag',
  });
  fitText(
    ctx,
    'BLGF REGIONAL OFFICE II DOCUMENT TRACKING AND RECORDS MANAGEMENT SYSTEM',
    { x: l0.x + 16, y: l0.y + 26, w: l0.w - 32, h: 58 },
    { align: 'center', color: C.white, maxSize: 17, minSize: 11, weight: '700', label: 'f6-l0' },
  );

  const modules = [
    {
      id: 'M1',
      title: 'Document Registration and Management',
      color: C.teal,
      input:
        'Incoming and outgoing document metadata; attachment files; division, office and employee reference data',
      process:
        'Validate the registration form; generate the route number BLGFR2-YYYY-MM-IN/OUT-NN; persist the document; set the initial status; write the audit entry',
      output: 'Stored document record with route number; audit log entry; confirmation for the recording officer',
    },
    {
      id: 'M2',
      title: 'Routing and Workflow Control',
      color: C.green,
      input:
        'Route assignment, destination office or officer, target date, action requested, instructions and remarks',
      process:
        'Confirm the current status; create the document_routes step; apply approve, disapprove, transfer, multi-route or final-instruction actions; recompute the status',
      output: 'Updated routing history and step number; new document status; action alert for the receiving officer',
    },
    {
      id: 'M3',
      title: 'Access and Account Administration',
      color: C.blue,
      input:
        'Login credentials, temporary password, role selection, profile details, division assignments and portal settings',
      process:
        'Authenticate the account; enforce role, division and account-state rules; apply the visibility policy; record administrative actions',
      output: 'Authenticated session; role-scoped navigation and actions; user, role and settings records',
    },
    {
      id: 'M4',
      title: 'Notification and Reporting Services',
      color: C.violet,
      input:
        'Pending and overdue route transactions, in-app reminder intervals, report filters and date-range criteria',
      process:
        'Derive action-required notifications from transaction history; build report rows; serialise Excel workbooks; perform the monthly auto-save',
      output: 'In-app notification list; incoming, outgoing and envelope Excel reports; monthly archived workbook',
    },
    {
      id: 'M5',
      title: 'Records, QR and Office Services',
      color: C.amber,
      input:
        'Routing-slip template selection, envelope and recipient data, QR payload, office library file and directory filters',
      process:
        'Render routing slips and official PDFs; log envelope dispatch; generate and decode QR payloads; manage the office document library and employee folders',
      output: 'Printable routing slip and PDF; envelope log record; QR image; stored library record and directory listing',
    },
    {
      id: 'M6',
      title: 'Audit, Logging and Maintenance',
      color: C.slate,
      input: 'Audit events, envelope events, log query filters and the administrative health probe',
      process:
        'Persist audit and envelope log rows; query with filters and pagination; verify database and file-storage reachability',
      output: 'Audit and envelope log views with monthly Excel export; system health status for the administrator',
    },
  ];

  // Level 1
  const mW = 274;
  const mH = 96;
  const mGap = 12;
  const mY = 246;
  modules.forEach((m, i) => {
    const mx = 30 + i * (mW + mGap);
    line(ctx, l0.x + l0.w / 2, l0.y + l0.h, mx + mW / 2, mY - 22, { color: C.hair, width: 1.2, head: false });
    strokeLine(ctx, 30, mY - 22, W - 30, mY - 22, C.hair, 1.4, [5, 4]);
    fillRoundRect(ctx, mx, mY, mW, mH, 8, C.white);
    strokeRoundRect(ctx, mx, mY, mW, mH, 8, m.color, 2);
    fillRoundRect(ctx, mx, mY, mW, 22, 8, m.color);
    fitText(ctx, m.id, { x: mx + 6, y: mY + 1, w: mW - 12, h: 20 }, {
      align: 'center',
      valign: 'middle',
      color: C.white,
      maxSize: 11.5,
      minSize: 9,
      weight: '700',
      label: `f6-m${m.id}`,
    });
    fitText(ctx, m.title, { x: mx + 8, y: mY + 24, w: mW - 16, h: mH - 30 }, {
      align: 'center',
      valign: 'middle',
      color: C.ink,
      maxSize: 12,
      minSize: 8,
      weight: '600',
      label: `f6-mt${m.id}`,
    });
    line(ctx, mx + mW / 2, mY + mH, mx + mW / 2, 402, { color: C.hair, width: 1.2, dash: [4, 3], headSize: 6 });
  });

  fitText(ctx, 'LEVEL 1', { x: 30, y: 206, w: 90, h: 20 }, {
    color: C.navy,
    maxSize: 12,
    minSize: 9.5,
    weight: '700',
    label: 'f6-l1tag',
  });
  fitText(ctx, 'LEVEL 0', { x: l0.x, y: 56, w: 90, h: 20 }, {
    color: C.navy,
    maxSize: 12,
    minSize: 9.5,
    weight: '700',
    label: 'f6-l0tagout',
  });

  // Level 2 IPO table
  const ty = 430;
  const colW = [70, 500, 620, 500];
  const rowH = [36, ...modules.map(() => 122)];
  table(ctx, 30, ty, colW, rowH, {
    headerLabels: ['Module', 'Input', 'Process', 'Output'],
    cell: (ri, ci) => {
      const m = modules[ri - 1];
      if (ci === 0) return `${m.id}\n${m.title}`;
      return [null, m.input, m.process, m.output][ci];
    },
    cellColors: (ri, ci) => {
      const m = modules[ri - 1];
      if (ci === 0) return `${m.color}14`;
      if (ri % 2 === 0) return '#fbfcfe';
      return null;
    },
  });
  fitText(ctx, 'LEVEL 2 \u2014 INPUT, PROCESS AND OUTPUT DETAIL OF EACH MODULE', 30, ty - 24, 900, {
    color: C.navy,
    maxSize: 12.5,
    minSize: 9.5,
    weight: '700',
    label: 'f6-l2tag',
  });

  const bottom = ty + rowH.reduce((a, b) => a + b, 0) + 18;
  fitText(
    ctx,
    'Legend:  a downward arrow from Level 0 to Level 1 shows system decomposition; a dashed line from each Level 1 module to the Level 2 table shows the IPO detail of that module.',
    30,
    bottom,
    W - 60,
    { color: C.muted, maxSize: 11, minSize: 8.5, weight: '500', italic: true, label: 'f6-legend' },
  );

  checkLayout(W, H, { scope: 'fig6' });

  return canvas;
}

/* ------------------------------------------------------------------ *
 * Figure 7 - IPO Diagram
 * ------------------------------------------------------------------ */
function figure7() {
  const W = 1760;
  const H = 1290;
  const { canvas, ctx } = makeCanvas(W, H);
  resetTextRecords();
  figureTitle(
    ctx,
    W,
    'INPUT\u2013PROCESS\u2013OUTPUT (IPO) DIAGRAM',
    'Logical data movement of the developed system from input sources, through the fourteen processing routines, to the output destinations',
  );

  const inputs = [
    ['Login module', 'Username and password credentials; temporary password and password-recovery answers'],
    ['Document registration form', 'Business type, direction, reference and tracking number, dates, parties, priority, subject and category'],
    ['Routing and decision form', 'Destination division, assigned officer, target date, action requested, instructions, remarks and decision attachments'],
    ['Envelope and QR form', 'Envelope number, recipient office and name, purpose, remarks and the QR payload or scanned code'],
    ['Reference and master data', 'Divisions, functional offices, employees, directory sections, roles and system settings'],
    ['Records library upload', 'Office-document file, description and folder assignment'],
    ['Evaluation instruments', 'ISO/IEC 25010 questionnaire ratings, task-test results and user feedback'],
  ];

  const outputs = [
    ['Dashboard and document lists', 'Division workload counts, status summaries and the incoming, outgoing and follow-up lists'],
    ['Document detail and flow', 'Metadata, routing steps, statuses, remarks, attachments and the complete chain of custody'],
    ['Notifications', 'Action-required alerts, transaction activity and in-app routing reminders'],
    ['Reports and workbooks', 'Incoming, outgoing and envelope Excel reports with the monthly automatic archive'],
    ['Printed and downloadable items', 'Routing slip, official PDF, QR code image, attachments and library files'],
    ['Administrative views', 'User accounts, roles, divisions, system settings and system health status'],
    ['Log views', 'Audit log and envelope log with filters, pagination and Excel export'],
  ];

  const processes = [
    'Authenticate the user and load the role, division and profile data',
    'Display the role-scoped dashboard, document lists and pending routes',
    'Validate the registration form and its required fields',
    'Generate the next route number and create the document record',
    'Store uploaded attachments in the managed file directory',
    'Validate the next destination, target date and routing instructions',
    'Create the routing transaction and set the document status to Pending',
    'Apply approve, disapprove, transfer, multi-route or release actions',
    'Derive notifications and issue in-app routing reminders',
    'Generate the routing slip, official PDF and envelope record',
    'Generate QR codes and resolve scanned QR payloads',
    'Compile Excel reports and perform the monthly auto-save',
    'Write audit and envelope log entries and expose log queries',
    'Persist changes to MySQL with Prisma and mirror them to the JSON store',
  ];

  const tableH = 1060;
  const tX = 24;
  const iW = 340;
  const oX = W - 24 - 340;
  const pX = iW + 24 + 46;
  const pW = oX - 46 - pX;

  // INPUT table
  const inRows = [34, ...inputs.map(() => (tableH - 34) / inputs.length)];
  table(ctx, tX, 96, [iW], inRows, {
    headerLabels: ['INPUT SOURCE AND INPUT ITEMS'],
    headerFill: C.blue,
    cell: (ri, ci) => (ri === 0 ? '' : `${inputs[ri - 1][0]}\n${inputs[ri - 1][1]}`),
  });
  // OUTPUT table
  const outRows = [34, ...outputs.map(() => (tableH - 34) / outputs.length)];
  table(ctx, oX, 96, [340], outRows, {
    headerLabels: ['OUTPUT DESTINATION AND OUTPUT ITEMS'],
    headerFill: C.green,
    cell: (ri) => (ri === 0 ? '' : `${outputs[ri - 1][0]}\n${outputs[ri - 1][1]}`),
  });

  // PROCESS column
  const pY = 96;
  const pBoxH = 62;
  const pGap = 8;
  processes.forEach((text, i) => {
    const by = pY + i * (pBoxH + pGap);
    fillRoundRect(ctx, pX, by, pW, pBoxH, 7, C.tealSoft);
    strokeRoundRect(ctx, pX, by, pW, pBoxH, 7, C.teal, 1.4);
    fillRoundRect(ctx, pX + 6, by + 6, 34, pBoxH - 12, 6, C.teal);
    fitText(ctx, `P${i + 1}`, { x: pX + 6, y: by + 8, w: 34, h: pBoxH - 16 }, {
      align: 'center',
      valign: 'middle',
      color: C.white,
      maxSize: 13,
      minSize: 9.5,
      weight: '700',
      label: `f7-p${i + 1}`,
    });
    fitText(ctx, text, { x: pX + 48, y: by + 5, w: pW - 58, h: pBoxH - 10 }, {
      color: C.ink,
      maxSize: 11.5,
      minSize: 8,
      weight: '500',
      valign: 'middle',
      label: `f7-pt${i + 1}`,
    });
    if (i < processes.length - 1) {
      line(ctx, pX + 23, by + pBoxH, pX + 23, by + pBoxH + pGap, { color: C.teal, width: 1.4, headSize: 5 });
    }
    // arrows from input table and to output table
    const inAnchorY = pY + 34 + (inRows.slice(1).reduce((a, b) => a + b, 0) * ((i + 0.5) / processes.length));
    line(ctx, tX + iW + 4, inAnchorY, pX - 6, by + pBoxH / 2, { color: C.blue, width: 1.1, headSize: 7 });
    const outAnchorY = pY + 34 + (outRows.slice(1).reduce((a, b) => a + b, 0) * ((i + 0.5) / processes.length));
    line(ctx, pX + pW + 4, by + pBoxH / 2, oX - 6, outAnchorY, { color: C.green, width: 1.1, headSize: 7 });
  });

  fitText(ctx, 'PROCESS', pX, 76, pW, 18, {
    align: 'center',
    color: C.teal,
    maxSize: 13,
    minSize: 10,
    weight: '700',
    label: 'f7-ph',
  });
  fitText(ctx, 'INPUT', tX, 76, iW, 18, {
    align: 'center',
    color: C.blue,
    maxSize: 13,
    minSize: 10,
    weight: '700',
    label: 'f7-ih',
  });
  fitText(ctx, 'OUTPUT', oX, 76, 340, 18, {
    align: 'center',
    color: C.green,
    maxSize: 13,
    minSize: 10,
    weight: '700',
    label: 'f7-oh',
  });

  fitText(
    ctx,
    'Reading direction: input data enters the process column from the left, is transformed by routines P1 to P14, and leaves the system to the output destinations shown on the right.',
    24,
    tableH + 118,
    W - 48,
    { align: 'center', color: C.muted, maxSize: 11.5, minSize: 8.5, weight: '500', italic: true, label: 'f7-note' },
  );

  checkLayout(W, H, { scope: 'fig7' });

  return canvas;
}

/* ------------------------------------------------------------------ *
 * Figure 8 - Entity-Relationship Diagram
 * ------------------------------------------------------------------ */
const ROW_H = 20;
const HDR_H = 34;

const ENTITIES = {
  divisions: {
    x: 30,
    y: 88,
    w: 470,
    color: C.navy,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['UQ', 'code', 'VARCHAR(20)'],
      ['', 'name', 'VARCHAR(255)'],
      ['', 'chief_name', 'VARCHAR(255)'],
      ['', 'email', 'VARCHAR(150) NULL'],
    ],
  },
  users: {
    x: 30,
    y: 268,
    w: 470,
    color: C.blue,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['UQ', 'username', 'VARCHAR(50)'],
      ['', 'source_username', 'VARCHAR(50)'],
      ['', 'password', 'TEXT NULL'],
      ['', 'temporary_password_expires_at', 'DATETIME(3) NULL'],
      ['', 'full_name', 'VARCHAR(150)'],
      ['', 'email', 'VARCHAR(150)'],
      ['', 'role', 'VARCHAR(50)'],
      ['LR', 'division_code', 'VARCHAR(20)'],
      ['', 'designation', 'VARCHAR(150) NULL'],
      ['', 'contact_no', 'VARCHAR(50) NULL'],
      ['', 'avatar_url', 'TEXT NULL'],
      ['', 'permissions', 'JSON NULL'],
      ['', 'active', 'BOOLEAN'],
      ['', 'created_at', 'DATETIME(3)'],
    ],
  },
  employee_profiles: {
    x: 30,
    y: 648,
    w: 470,
    color: C.sky,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['FK,UQ', 'user_id', 'VARCHAR(64) NULL'],
      ['', 'full_name', 'VARCHAR(255)'],
      ['', 'position', 'VARCHAR(255)'],
      ['', 'office', 'VARCHAR(255)'],
      ['', 'office_type', 'VARCHAR(50)'],
      ['LR', 'division_code', 'VARCHAR(20) NULL'],
      ['', 'email', 'VARCHAR(150)'],
      ['', 'contact_no', 'VARCHAR(50) NULL'],
      ['', 'address', 'TEXT NULL'],
      ['', 'active', 'BOOLEAN'],
      ['', 'created_at', 'DATETIME(3)'],
      ['', 'folders', 'JSON NULL'],
    ],
  },
  directory_sections: {
    x: 30,
    y: 988,
    w: 470,
    color: C.teal,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['', 'label', 'VARCHAR(255)'],
      ['', 'office_types', 'JSON'],
      ['', 'color', 'VARCHAR(50) NULL'],
    ],
  },
  documents: {
    x: 640,
    y: 88,
    w: 760,
    color: C.green,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['UQ', 'tracking_number', 'VARCHAR(100)'],
      ['', 'direction', 'VARCHAR(20)'],
      ['', 'title', 'VARCHAR(255)'],
      ['', 'subject', 'TEXT NULL'],
      ['', 'category', 'VARCHAR(100)'],
      ['', 'originating_office', 'VARCHAR(255)'],
      ['', 'destination_office', 'VARCHAR(255)'],
      ['', 'sender_name', 'VARCHAR(150) NULL'],
      ['', 'sender_position', 'VARCHAR(150) NULL'],
      ['', 'sender_address', 'TEXT NULL'],
      ['', 'recipient_name', 'VARCHAR(150) NULL'],
      ['', 'recipient_position', 'VARCHAR(150) NULL'],
      ['', 'recipient_office', 'VARCHAR(255) NULL'],
      ['', 'recipient_address', 'TEXT NULL'],
      ['', 'route_no', 'VARCHAR(100) NULL'],
      ['', 'priority', 'VARCHAR(30)'],
      ['', 'current_status', 'VARCHAR(30)'],
      ['', 'current_division', 'VARCHAR(20)'],
      ['', 'assigned_user', 'VARCHAR(150) NULL'],
      ['FK', 'assigned_user_id', 'VARCHAR(64) NULL'],
      ['', 'date_received', 'DATETIME(3)'],
      ['', 'target_completion_date', 'DATETIME(3) NULL'],
      ['', 'completed_date', 'DATETIME(3) NULL'],
      ['', 'created_by', 'VARCHAR(150)'],
      ['FK', 'created_by_user_id', 'VARCHAR(64) NULL'],
      ['', 'created_at', 'DATETIME(3)'],
      ['', 'updated_at', 'DATETIME(3)'],
    ],
  },
  document_routes: {
    x: 640,
    y: 728,
    w: 760,
    color: C.teal,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['FK', 'document_id', 'VARCHAR(64)'],
      ['', 'step_number', 'INT'],
      ['', 'from_division', 'VARCHAR(20)'],
      ['FK', 'from_user_id', 'VARCHAR(64) NULL'],
      ['', 'from_user', 'VARCHAR(150)'],
      ['', 'to_division', 'VARCHAR(20)'],
      ['', 'to_user', 'VARCHAR(150) NULL'],
      ['FK', 'to_user_id', 'VARCHAR(64) NULL'],
      ['', 'action_requested', 'VARCHAR(255)'],
      ['', 'remarks', 'TEXT NULL'],
      ['', 'status_before', 'VARCHAR(50)'],
      ['', 'status_after', 'VARCHAR(50)'],
      ['', 'created_at', 'DATETIME(3)'],
    ],
  },
  document_attachments: {
    x: 1530,
    y: 88,
    w: 440,
    color: C.amber,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['FK', 'document_id', 'VARCHAR(64)'],
      ['', 'file_name', 'VARCHAR(255)'],
      ['', 'file_size', 'VARCHAR(50) NULL'],
      ['', 'file_type', 'VARCHAR(100) NULL'],
      ['', 'upload_date', 'DATETIME(3)'],
      ['', 'file_data', 'LONGTEXT NULL'],
      ['', 'attachment_scope', 'VARCHAR(20) NULL'],
      ['LR', 'uploaded_by_user_id', 'VARCHAR(64) NULL'],
      ['LR', 'uploaded_for_route_id', 'VARCHAR(64) NULL'],
    ],
  },
  audit_logs: {
    x: 1530,
    y: 372,
    w: 440,
    color: C.slate,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['', 'timestamp', 'DATETIME(3)'],
      ['LR', 'user_id', 'VARCHAR(64)'],
      ['', 'user_name', 'VARCHAR(150)'],
      ['', 'user_role', 'VARCHAR(50)'],
      ['', 'action', 'VARCHAR(100)'],
      ['LR', 'document_tracking_number', 'VARCHAR(100) NULL'],
      ['', 'details', 'TEXT'],
      ['', 'ip_address', 'VARCHAR(45) NULL'],
    ],
  },
  envelope_logs: {
    x: 1530,
    y: 630,
    w: 440,
    color: C.violet,
    fields: [
      ['PK', 'id', 'VARCHAR(64)'],
      ['', 'timestamp', 'DATETIME(3)'],
      ['LR', 'user_id', 'VARCHAR(64)'],
      ['', 'user_name', 'VARCHAR(150)'],
      ['', 'user_role', 'VARCHAR(50)'],
      ['', 'action', 'VARCHAR(100)'],
      ['LR', 'document_tracking_number', 'VARCHAR(100) NULL'],
      ['', 'details', 'TEXT'],
      ['', 'ip_address', 'VARCHAR(45) NULL'],
    ],
  },
  system_settings: {
    x: 1530,
    y: 888,
    w: 440,
    color: C.rose,
    fields: [
      ['PK', 'setting_key', 'VARCHAR(64)'],
      ['', 'setting_value', 'TEXT NULL'],
      ['', 'updated_at', 'DATETIME(3)'],
    ],
  },
  notifications: {
    x: 2030,
    y: 88,
    w: 340,
    color: C.blue,
    derived: true,
    fields: [
      ['DV', 'id', 'derived key'],
      ['DV', 'userId', 'recipient'],
      ['DV', 'title', 'derived text'],
      ['DV', 'message', 'derived text'],
      ['DV', 'trackingNumber', 'from document'],
      ['DV', 'documentId', 'from document'],
      ['DV', 'type', 'INFO | URGENT'],
      ['DV', 'requiresDecision', 'BOOLEAN'],
      ['DV', 'decisionStatus', 'APPROVED | DISAPPROVED'],
      ['DV', 'createdAt', 'from log timestamp'],
    ],
  },
};

function entityBox(ctx, name, def) {
  const h = HDR_H + def.fields.length * ROW_H + 14;
  const { x, y, w } = def;
  fillRoundRect(ctx, x, y, w, h, 8, C.white);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = def.color;
  ctx.fillRect(x, y, w, HDR_H);
  ctx.restore();
  strokeRoundRect(ctx, x, y, w, h, 8, def.color, 2);
  if (def.derived) strokeRoundRect(ctx, x, y, w, h, 8, def.color, 2, [7, 4]);
  fitText(ctx, `${name}${def.derived ? '  (derived, not stored)' : ''}`, { x: x + 8, y: y + 4, w: w - 16, h: HDR_H - 8 }, {
    color: C.white,
    maxSize: 13,
    minSize: 9,
    weight: '700',
    label: `f8-name-${name}`,
  });
  def.fields.forEach(([key, field, type], i) => {
    const ry = y + HDR_H + i * ROW_H;
    if (i % 2 === 1) {
      ctx.save();
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(x + 1, ry, w - 2, ROW_H);
      ctx.restore();
    }
    if (key) {
      const badgeW = 14 + key.length * 5.6;
      fillRoundRect(ctx, x + 6, ry + 4, badgeW, ROW_H - 8, 3, key === 'LR' || key === 'DV' ? C.amberSoft : C.navySoft);
      fitText(ctx, key, { x: x + 6, y: ry + 4, w: badgeW, h: ROW_H - 8 }, {
        align: 'center',
        valign: 'middle',
        color: key === 'LR' || key === 'DV' ? C.amber : C.navy,
        maxSize: 8,
        minSize: 6.5,
        weight: '700',
        label: `f8-key-${name}-${field}`,
      });
    }
    const typeW = textW(ctx, type, 8.5);
    fitText(ctx, field, { x: x + 64, y: ry + 3, w: w - 74 - typeW - 8, h: ROW_H - 6 }, {
      color: C.ink,
      maxSize: 9.5,
      minSize: 7,
      weight: '500',
      valign: 'middle',
      label: `f8-field-${name}-${field}`,
    });
    fitText(ctx, type, { x: x + w - typeW - 10, y: ry + 3, w: typeW + 4, h: ROW_H - 6 }, {
      align: 'right',
      color: C.muted,
      maxSize: 8.5,
      minSize: 6.5,
      weight: '400',
      valign: 'middle',
      label: `f8-type-${name}-${field}`,
    });
  });
  return { ...def, h, right: x + w, bottom: y + h };
}

function textW(ctx, text, size) {
  ctx.save();
  ctx.font = `400 ${size}px "Segoe UI", Tahoma, Arial, sans-serif`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** Y coordinate of the centre of a named field row inside an entity box. */
function fieldY(box, field) {
  const i = box.fields.findIndex((f) => f[1] === field);
  if (i < 0) {
    note('missing-field', `${box.name}.${field} not found`);
    return box.y + HDR_H + 10;
  }
  return box.y + HDR_H + i * ROW_H + ROW_H / 2;
}

function figure8() {
  const W = 2400;
  const H = 1290;
  const { canvas, ctx } = makeCanvas(W, H, '#ffffff');
  resetTextRecords();
  figureTitle(
    ctx,
    W,
    'ENTITY\u2013RELATIONSHIP DIAGRAM (ERD)',
    'Physical data model of the BLGF Region II document tracking system: ten MySQL 8 tables, one derived notification view, and the enforced foreign-key relationships',
  );

  const boxes = {};
  Object.entries(ENTITIES).forEach(([name, def]) => {
    boxes[name] = entityBox(ctx, name, { ...def, name });
  });

  const solid = C.navy;
  const dashed = C.amber;

  // divisions.code (1) -> users.division_code (0..N)  [logical]
  elbow(
    ctx,
    [
      { x: boxes.divisions.x + 300, y: boxes.divisions.y },
      { x: boxes.divisions.x + 300, y: boxes.divisions.y - 16 },
      { x: boxes.users.x + 300, y: boxes.users.y - 16 },
      { x: boxes.users.x + 300, y: boxes.users.y },
    ],
    { color: dashed, width: 1.6, dash: [6, 4], headSize: 8 },
  );
  crowFoot(ctx, boxes.divisions.x + 300, boxes.divisions.y - 1, -Math.PI / 2, 'one', dashed);
  crowFoot(ctx, boxes.users.x + 300, boxes.users.y + 1, Math.PI / 2, 'many', dashed);
  cardinality(ctx, boxes.divisions.x + 250, boxes.divisions.y - 22, '1', dashed);
  cardinality(ctx, boxes.users.x + 250, boxes.users.y - 22, '0..N', dashed);
  fitText(ctx, 'divisions.code = users.division_code (logical reference, no FK constraint)', boxes.users.x + 60, boxes.users.y - 44, 460, {
    color: dashed,
    maxSize: 9.5,
    minSize: 7.5,
    weight: '600',
    label: 'f8-r1',
  });

  // users.id (1) -> documents.assigned_user_id (0..N)
  line(ctx, boxes.users.right, fieldY(boxes.users, 'id'), boxes.documents.x, fieldY(boxes.documents, 'assigned_user_id'), {
    color: solid,
    width: 1.7,
  });
  crowFoot(ctx, boxes.users.right, fieldY(boxes.users, 'id'), 0, 'one', solid);
  crowFoot(ctx, boxes.documents.x, fieldY(boxes.documents, 'assigned_user_id'), Math.PI, 'many', solid);
  cardinality(ctx, (boxes.users.right + boxes.documents.x) / 2, fieldY(boxes.users, 'id') - 13, '1', solid);
  cardinality(ctx, (boxes.users.right + boxes.documents.x) / 2, fieldY(boxes.documents, 'assigned_user_id') - 13, '0..N', solid);

  // users.id (1) -> documents.created_by_user_id (0..N)
  line(ctx, boxes.users.right, fieldY(boxes.users, 'created_at'), boxes.documents.x, fieldY(boxes.documents, 'created_by_user_id'), {
    color: solid,
    width: 1.7,
  });
  crowFoot(ctx, boxes.users.right, fieldY(boxes.users, 'created_at'), 0, 'one', solid);
  crowFoot(ctx, boxes.documents.x, fieldY(boxes.documents, 'created_by_user_id'), Math.PI, 'many', solid);
  cardinality(ctx, (boxes.users.right + boxes.documents.x) / 2, fieldY(boxes.users, 'created_at') - 13, '1', solid);
  cardinality(ctx, (boxes.users.right + boxes.documents.x) / 2, fieldY(boxes.documents, 'created_by_user_id') - 13, '0..N', solid);

  // users.id (1) -> document_routes.from_user_id (0..N)
  line(ctx, boxes.users.right, fieldY(boxes.users, 'role'), boxes.document_routes.x, fieldY(boxes.document_routes, 'from_user_id'), {
    color: solid,
    width: 1.7,
  });
  crowFoot(ctx, boxes.users.right, fieldY(boxes.users, 'role'), 0, 'one', solid);
  crowFoot(ctx, boxes.document_routes.x, fieldY(boxes.document_routes, 'from_user_id'), Math.PI, 'many', solid);
  cardinality(ctx, (boxes.users.right + boxes.document_routes.x) / 2, fieldY(boxes.users, 'role') - 13, '1', solid);
  cardinality(ctx, (boxes.users.right + boxes.document_routes.x) / 2, fieldY(boxes.document_routes, 'from_user_id') - 13, '0..N', solid);

  // users.id (1) -> document_routes.to_user_id (0..N)
  line(ctx, boxes.users.right, fieldY(boxes.users, 'designation'), boxes.document_routes.x, fieldY(boxes.document_routes, 'to_user_id'), {
    color: solid,
    width: 1.7,
  });
  crowFoot(ctx, boxes.users.right, fieldY(boxes.users, 'designation'), 0, 'one', solid);
  crowFoot(ctx, boxes.document_routes.x, fieldY(boxes.document_routes, 'to_user_id'), Math.PI, 'many', solid);
  cardinality(ctx, (boxes.users.right + boxes.document_routes.x) / 2, fieldY(boxes.users, 'designation') - 13, '1', solid);
  cardinality(ctx, (boxes.users.right + boxes.document_routes.x) / 2, fieldY(boxes.document_routes, 'to_user_id') - 13, '0..N', solid);

  // users.id (1) -> employee_profiles.user_id (0..1)
  const epMid = fieldY(boxes.employee_profiles, 'user_id');
  elbow(
    ctx,
    [
      { x: boxes.users.right, y: boxes.users.y + boxes.users.h - 6 },
      { x: boxes.users.right + 26, y: boxes.users.y + boxes.users.h - 6 },
      { x: boxes.users.right + 26, y: epMid },
      { x: boxes.employee_profiles.right, y: epMid },
    ],
    { color: solid, width: 1.7 },
  );
  crowFoot(ctx, boxes.users.right, boxes.users.y + boxes.users.h - 6, 0, 'one', solid);
  crowFoot(ctx, boxes.employee_profiles.right, epMid, Math.PI, 'zeroOne', solid);
  cardinality(ctx, boxes.users.right + 26, (boxes.users.y + boxes.users.h + epMid) / 2, '1', solid);
  cardinality(ctx, boxes.users.right + 26, epMid - 20, '0..1', solid);

  // documents.id (1) -> document_routes.document_id (0..N) cascade
  const docIdY = fieldY(boxes.documents, 'id');
  const routeDocY = fieldY(boxes.document_routes, 'document_id');
  elbow(
    ctx,
    [
      { x: boxes.documents.right, y: docIdY },
      { x: boxes.documents.right + 34, y: docIdY },
      { x: boxes.documents.right + 34, y: routeDocY },
      { x: boxes.document_routes.right, y: routeDocY },
    ],
    { color: solid, width: 1.9 },
  );
  crowFoot(ctx, boxes.documents.right, docIdY, 0, 'one', solid);
  crowFoot(ctx, boxes.document_routes.right, routeDocY, Math.PI, 'many', solid);
  cardinality(ctx, boxes.documents.right + 34, (docIdY + routeDocY) / 2, '1', solid);
  cardinality(ctx, boxes.documents.right + 34, routeDocY - 20, '0..N', solid);
  fitText(
    ctx,
    'ON DELETE CASCADE',
    boxes.document_routes.right + 6,
    (docIdY + routeDocY) / 2 + 26,
    84,
    { color: solid, maxSize: 8.5, minSize: 7, weight: '700', label: 'f8-cascade1' },
  );

  // documents.id (1) -> document_attachments.document_id (0..N) cascade
  const attDocY = fieldY(boxes.document_attachments, 'document_id');
  const attLaneX = boxes.document_attachments.x - 42;
  elbow(
    ctx,
    [
      { x: boxes.documents.right, y: fieldY(boxes.documents, 'tracking_number') },
      { x: boxes.documents.right + 58, y: fieldY(boxes.documents, 'tracking_number') },
      { x: attLaneX, y: fieldY(boxes.documents, 'tracking_number') },
      { x: attLaneX, y: attDocY },
      { x: boxes.document_attachments.x, y: attDocY },
    ],
    { color: solid, width: 1.9 },
  );
  crowFoot(ctx, boxes.documents.right, fieldY(boxes.documents, 'tracking_number'), 0, 'one', solid);
  crowFoot(ctx, boxes.document_attachments.x, attDocY, Math.PI, 'many', solid);
  cardinality(ctx, attLaneX, (fieldY(boxes.documents, 'tracking_number') + attDocY) / 2, '1', solid);
  cardinality(ctx, attLaneX, attDocY - 20, '0..N', solid);
  verticalLabel(
    ctx,
    attLaneX + 14,
    (fieldY(boxes.documents, 'tracking_number') + attDocY) / 2,
    200,
    'ON DELETE CASCADE',
    { color: solid, maxSize: 8.5, minSize: 7, weight: '700', label: 'f8-cascade2' },
  );

  // audit_logs -> notifications (derived)
  line(ctx, boxes.audit_logs.right, fieldY(boxes.audit_logs, 'timestamp'), boxes.notifications.x, fieldY(boxes.notifications, 'id'), {
    color: dashed,
    width: 1.7,
    dash: [6, 4],
  });
  crowFoot(ctx, boxes.audit_logs.right, fieldY(boxes.audit_logs, 'timestamp'), 0, 'many', dashed);
  crowFoot(ctx, boxes.notifications.x, fieldY(boxes.notifications, 'id'), Math.PI, 'many', dashed);
  fitText(ctx, 'derived at request time', boxes.notifications.x + 6, boxes.notifications.y - 20, 320, {
    color: dashed,
    maxSize: 9,
    minSize: 7.5,
    weight: '600',
    label: 'f8-derived',
  });

  // document_routes -> notifications (derived)
  elbow(
    ctx,
    [
      { x: boxes.document_routes.right, y: fieldY(boxes.document_routes, 'action_requested') },
      { x: boxes.document_routes.right + 18, y: fieldY(boxes.document_routes, 'action_requested') },
      { x: boxes.document_routes.right + 18, y: boxes.notifications.y + 40 },
      { x: boxes.notifications.x, y: boxes.notifications.y + 40 },
    ],
    { color: dashed, width: 1.5, dash: [6, 4] },
  );

  // Notation legend
  const lgX = 2030;
  const lgY = 380;
  fillRoundRect(ctx, lgX, lgY, 340, 320, 8, C.slateSoft);
  strokeRoundRect(ctx, lgX, lgY, 340, 320, 8, C.hair, 1.4);
  fillRoundRect(ctx, lgX, lgY, 340, 26, 8, C.slate);
  fitText(ctx, 'ERD NOTATION', { x: lgX + 8, y: lgY + 2, w: 324, h: 22 }, {
    align: 'center',
    valign: 'middle',
    color: C.white,
    maxSize: 11.5,
    minSize: 9,
    weight: '700',
    label: 'f8-legendtitle',
  });
  const badge = (text, x, y) => {
    const bw = 14 + text.length * 5.6;
    fillRoundRect(ctx, x, y, bw, 13, 3, text === 'LR' || text === 'DV' ? C.amberSoft : C.navySoft);
    fitText(ctx, text, { x, y, w: bw, h: 13 }, {
      align: 'center',
      valign: 'middle',
      color: text === 'LR' || text === 'DV' ? C.amber : C.navy,
      maxSize: 8,
      minSize: 6.5,
      weight: '700',
      label: 'f8-lbadge',
    });
    return bw;
  };
  const legendItems = [
    ['PK', 'Primary key'],
    ['FK', 'Foreign key enforced by a Prisma relation'],
    ['UQ', 'Unique constraint'],
    ['LR', 'Logical reference only, no foreign-key constraint'],
    ['DV', 'Derived value, not stored in a table'],
  ];
  legendItems.forEach(([k, text], i) => {
    const y = lgY + 38 + i * 26;
    const bw = badge(k, lgX + 12, y);
    fitText(ctx, text, { x: lgX + 14 + bw + 8, y: y - 3, w: 300 - bw, h: 20 }, {
      color: C.body,
      maxSize: 10,
      minSize: 7.5,
      weight: '500',
      valign: 'middle',
      label: `f8-legitem-${i}`,
    });
  });
  // cardinality samples
  const sy = lgY + 38 + legendItems.length * 26 + 6;
  crowFoot(ctx, lgX + 22, sy, 0, 'one', C.navy);
  strokeLine(ctx, lgX + 22, sy, lgX + 92, sy, C.navy, 1.6);
  crowFoot(ctx, lgX + 92, sy, Math.PI, 'many', C.navy);
  fitText(ctx, 'exactly one  to  zero or many', { x: lgX + 100, y: sy - 10, w: 230, h: 20 }, {
    color: C.body,
    maxSize: 10,
    minSize: 7.5,
    weight: '500',
    valign: 'middle',
    label: 'f8-legcrow',
  });
  strokeLine(ctx, lgX + 12, sy + 26, lgX + 92, sy + 26, C.amber, 1.6, [6, 4]);
  arrowHeadLocal(ctx, lgX + 92, sy + 26, C.amber);
  fitText(ctx, 'logical reference (no FK)', { x: lgX + 100, y: sy + 16, w: 230, h: 20 }, {
    color: C.amber,
    maxSize: 10,
    minSize: 7.5,
    weight: '500',
    valign: 'middle',
    label: 'f8-legdash',
  });

  // Relationship index
  const rX = 2030;
  const rY = 728;
  const rels = [
    ['divisions.code \u2192 users.division_code', '1 : 0..N  (logical)'],
    ['users.id \u2192 documents.assigned_user_id', '1 : 0..N  (SET NULL)'],
    ['users.id \u2192 documents.created_by_user_id', '1 : 0..N  (SET NULL)'],
    ['users.id \u2192 document_routes.from_user_id', '1 : 0..N  (SET NULL)'],
    ['users.id \u2192 document_routes.to_user_id', '1 : 0..N  (SET NULL)'],
    ['users.id \u2192 employee_profiles.user_id', '1 : 0..1  (SET NULL)'],
    ['documents.id \u2192 document_routes.document_id', '1 : 0..N  (CASCADE)'],
    ['documents.id \u2192 document_attachments.document_id', '1 : 0..N  (CASCADE)'],
    ['users.id \u2194 audit_logs.user_id', '1 : 0..N  (logical)'],
    ['users.id \u2194 envelope_logs.user_id', '1 : 0..N  (logical)'],
    ['documents.tracking_number \u2194 audit_logs', '1 : 0..N  (logical)'],
    ['documents.tracking_number \u2194 envelope_logs', '1 : 0..N  (logical)'],
    ['document_attachments.uploaded_by_user_id', '\u2192 users.id  (logical)'],
    ['document_attachments.uploaded_for_route_id', '\u2192 document_routes.id  (logical)'],
  ];
  const rH = 330;
  fillRoundRect(ctx, rX, rY, 340, rH, 8, C.slateSoft);
  strokeRoundRect(ctx, rX, rY, 340, rH, 8, C.hair, 1.4);
  fillRoundRect(ctx, rX, rY, 340, 26, 8, C.navy);
  fitText(ctx, 'RELATIONSHIP INDEX', { x: rX + 8, y: rY + 2, w: 324, h: 22 }, {
    align: 'center',
    valign: 'middle',
    color: C.white,
    maxSize: 11.5,
    minSize: 9,
    weight: '700',
    label: 'f8-reltitle',
  });
  rels.forEach(([a, b], i) => {
    const y = rY + 32 + i * 21;
    if (i % 2 === 1) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.fillRect(rX + 1, y - 1, 338, 21);
      ctx.restore();
    }
    fitText(ctx, a, { x: rX + 8, y, w: 236, h: 19 }, {
      color: C.ink,
      maxSize: 9,
      minSize: 6.5,
      weight: '500',
      valign: 'middle',
      label: `f8-rel-a-${i}`,
    });
    fitText(ctx, b, { x: rX + 246, y, w: 88, h: 19 }, {
      align: 'right',
      color: b.includes('logical') ? C.amber : C.navy,
      maxSize: 8.5,
      minSize: 6.5,
      weight: '700',
      valign: 'middle',
      label: `f8-rel-b-${i}`,
    });
  });

  // Bottom notes
  const nY = 1150;
  const notes = [
    'Ten physical tables are created in MySQL 8: the nine Prisma models (divisions, users, documents, document_routes, document_attachments, audit_logs, envelope_logs, employee_profiles, directory_sections) plus system_settings, which the replica manager creates with CREATE TABLE IF NOT EXISTS because it has no Prisma model.',
    'notifications is a derived view assembled at request time from audit_logs and document_routes and returned to the client with an X-Notification-Source response header; it is not a stored table and has no foreign keys.',
    'LR columns (users.division_code, employee_profiles.division_code, audit_logs.user_id, envelope_logs.user_id, document_attachments.uploaded_by_user_id, document_attachments.uploaded_for_route_id, audit_logs.document_tracking_number and envelope_logs.document_tracking_number) are enforced in application code only; the schema declares them as plain string columns.',
  ];
  fillRoundRect(ctx, 30, nY, W - 60, 108, 8, '#fbfcfe');
  strokeRoundRect(ctx, 30, nY, W - 60, 108, 8, C.hair, 1.4);
  fitText(
    ctx,
    notes.map((n, i) => `${i + 1}.  ${n}`).join('\n'),
    { x: 44, y: nY + 8, w: W - 88, h: 92 },
    { color: C.body, maxSize: 10, minSize: 7.5, weight: '500', label: 'f8-notes' },
  );

  void wrapText;
  checkLayout(W, H, { scope: 'fig8' });
  return canvas;
}

function arrowHeadLocal(ctx, x, y, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 9, y - 4);
  ctx.lineTo(x - 9, y + 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

save(figure6(), 'fig6-hipo-diagram.png');
save(figure7(), 'fig7-ipo-diagram.png');
save(figure8(), 'fig8-entity-relationship-diagram.png');

const diagnostics = getDiagnostics();
if (diagnostics.length) {
  console.log('\n--- layout diagnostics ---');
  for (const d of diagnostics) console.log(`${d.kind}: ${d.message}`);
  process.exitCode = 1;
} else {
  console.log('\nno layout diagnostics');
}
