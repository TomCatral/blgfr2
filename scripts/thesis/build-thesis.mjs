// Builds the final thesis DOCX from the content modules.
// Output: output/CATRAL_TOM_TOM_G_FINAL_DOCUMENTATION.docx

import fs from 'node:fs';
import path from 'node:path';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  LineRuleType,
  NumberFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  SectionType,
  ShadingType,
  SimpleField,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from 'docx';

import { CH1, CH2, CH3, CH5 } from './content/chapters.mjs';
import { CH4 } from './content/ch4.mjs';
import { APPENDIX_A, APPENDIX_B, INSTRUMENT, APPENDIX_E_FILES, refs, VERIFY_NOTE } from './content/backmatter.mjs';

const ROOT = path.resolve(process.argv[3] || '.');
const DIAGRAMS = path.join(ROOT, 'output', 'diagrams');
const SHOTS = path.join(ROOT, 'docs', 'design-review');
const OUT = path.join(ROOT, 'output', 'CATRAL_TOM_TOM_G_FINAL_DOCUMENTATION.docx');

const FONT = 'Times New Roman';
const SZ = 24; // 12 pt
const MARGIN = { top: 1440, right: 1440, bottom: 1440, left: 2160 };
const W_PORTRAIT = 6.0; // inches of usable width, 1.5in binding margin
const W_LANDSCAPE = 8.5;

const problems = [];
const stats = { figures: 0, tables: 0, words: 0, refs: 0 };

// --- PNG dimension reader (IHDR) -------------------------------------------
function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error(`not a png: ${file}`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function resolveImage(src) {
  if (src.startsWith('fig') || src.startsWith('docs/')) {
    const p = src.startsWith('docs/') ? path.join(SHOTS, path.basename(src)) : path.join(DIAGRAMS, src);
    if (!fs.existsSync(p)) {
      problems.push(`MISSING IMAGE: ${src}`);
      return null;
    }
    return p;
  }
  problems.push(`UNKNOWN IMAGE SOURCE: ${src}`);
  return null;
}

// --- primitives -------------------------------------------------------------
const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: SZ, ...opts });

const body = (text, opts = {}) => {
  stats.words += text.split(/\s+/).filter(Boolean).length;
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 0 },
    indent: { firstLine: 720 },
    children: [run(text)],
    ...opts,
  });
};

const centered = (text, opts = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360, lineRule: LineRuleType.AUTO },
    children: [run(text, opts.run || {})],
    ...opts,
  });

const heading = (text, level, { pageBreak = false } = {}) =>
  new Paragraph({
    heading: level,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240, line: 360, lineRule: LineRuleType.AUTO },
    pageBreakBefore: pageBreak,
    keepNext: true,
    children: [run(text, { bold: true })],
  });

// Caption with a real SEQ field so the List of Tables / List of Figures resolve.
function caption(label, text) {
  const clean = text.replace(new RegExp(`^${label}\\s+\\d+\\.?\\s*`, 'i'), '').replace(/:\s*$/, '');
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 240, line: 240, lineRule: LineRuleType.AUTO },
    keepNext: label === 'Table',
    children: [
      run(`${label} `, { bold: false }),
      new SimpleField(`SEQ ${label} \\* ARABIC`),
      run(`. ${clean}`),
    ],
  });
}

function figure(item, usableWidth) {
  const file = resolveImage(item.raw || item.src);
  if (!file) return new Paragraph({ children: [] });
  let dim;
  try {
    dim = pngSize(file);
  } catch (e) {
    problems.push(`UNREADABLE IMAGE: ${file} (${e.message})`);
    return new Paragraph({ children: [] });
  }
  const targetW = Math.min(item.w || usableWidth, usableWidth);
  const targetH = (dim.h / dim.w) * targetW;
  const maxH = 8.6;
  const scale = targetH > maxH ? maxH / targetH : 1;
  const w = targetW * scale;
  const h = targetH * scale;
  stats.figures += 1;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60, line: 240, lineRule: LineRuleType.AUTO },
      keepNext: true,
      children: [
        new ImageRun({
          type: 'png',
          data: fs.readFileSync(file),
          transformation: { width: Math.round(w * 96), height: Math.round(h * 96) },
        }),
      ],
    }),
    caption('Figure', item.cap),
  ];
}

function dataTable(item, usableWidth) {
  stats.tables += 1;
  const total = item.w.reduce((a, b) => a + b, 0);
  const widths = item.w.map((p) => Math.round((p / total) * usableWidth * 1440));
  const fs_ = item.fs || 20;
  const cell = (text, i, header) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: header ? { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: header ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
          spacing: { line: 240, lineRule: LineRuleType.AUTO },
          children: [run(String(text), { bold: !!header, size: fs_ })],
        }),
      ],
    });

  const rows = [
    new TableRow({
      tableHeader: true,
      children: item.head.map((h, i) => cell(h, i, true)),
    }),
    ...item.rows.map(
      (r) =>
        new TableRow({
          children: r.map((c, i) => cell(c, i, false)),
        }),
    ),
  ];

  const borders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  return [
    caption('Table', item.cap),
    new Table({
      width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders,
      rows,
    }),
    new Paragraph({ spacing: { after: 240, line: 240, lineRule: LineRuleType.AUTO }, children: [] }),
  ];
}

// --- block renderer ---------------------------------------------------------
let listInstance = 0;
let prevKind = null;

function renderBlocks(blocks, usableWidth) {
  const out = [];
  blocks.forEach((b, bi) => {
    if (!b || typeof b !== 'object' || typeof b.t !== 'string') {
      problems.push(`MALFORMED BLOCK at index ${bi}: ${JSON.stringify(b).slice(0, 160)}`);
      return;
    }
    switch (b.t) {
      case 'h1':
        out.push(heading(b.text, HeadingLevel.HEADING_1, { pageBreak: true }));
        prevKind = 'h1';
        break;
      case 'h2':
        out.push(heading(b.text, HeadingLevel.HEADING_2));
        prevKind = 'h2';
        break;
      case 'h3':
        out.push(heading(b.text, HeadingLevel.HEADING_3));
        prevKind = 'h3';
        break;
      case 'h4':
        out.push(heading(b.text, HeadingLevel.HEADING_4));
        prevKind = 'h4';
        break;
      case 'h5':
        out.push(
          new Paragraph({
            spacing: { before: 200, after: 100, line: 360, lineRule: LineRuleType.AUTO },
            keepNext: true,
            children: [run(b.text, { bold: true })],
          }),
        );
        prevKind = 'h5';
        break;
      case 'p':
        out.push(body(b.text));
        prevKind = 'p';
        break;
      case 'b':
        out.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, lineRule: LineRuleType.AUTO },
            indent: { left: 720, hanging: 360 },
            numbering: { reference: 'bullet-list', level: 0 },
            children: [run(b.text)],
          }),
        );
        prevKind = 'b';
        break;
      case 'n':
        if (prevKind !== 'n') listInstance += 1;
        out.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, lineRule: LineRuleType.AUTO },
            indent: { left: 720, hanging: 360 },
            numbering: { reference: 'ordered-list', level: 0, instance: listInstance },
            children: [run(b.text)],
          }),
        );
        prevKind = 'n';
        break;
      case 'fig':
        out.push(...figure(b, usableWidth));
        prevKind = 'fig';
        break;
      case 'tab':
        out.push(...dataTable(b, usableWidth));
        prevKind = 'tab';
        break;
      case 'kv':
        out.push(
          ...dataTable(
            {
              cap: b.cap || 'Operational Definitions',
              head: b.head,
              rows: b.rows,
              w: b.w || [26, 74],
              fs: b.fs,
            },
            usableWidth,
          ),
        );
        prevKind = 'tab';
        break;
      case 'pb':
        out.push(new Paragraph({ children: [new PageBreak()] }));
        prevKind = 'pb';
        break;
      default:
        problems.push(`UNKNOWN BLOCK TYPE: ${b.t}`);
    }
  });
  return out;
}

// Split a chapter into portrait / landscape runs so wide figures get a landscape page.
function chapterRuns(chapter) {
  const runs = [];
  let cur = [];
  let curLand = false;
  const flush = () => {
    if (cur.length) {
      runs.push({ land: curLand, blocks: cur });
      cur = [];
    }
  };
  for (const b of chapter.sections) {
    const land = b.t === 'fig' && !!b.land;
    if (land !== curLand) {
      flush();
      curLand = land;
    }
    cur.push(b);
  }
  flush();
  return runs;
}

// --- front matter -----------------------------------------------------------
const TITLE = 'Development of a Web-Based Document Tracking and Management System for the Regional Bureau of Local Government Finance';
const PROPONENT = 'TOM TOM G. CATRAL';
const ADVISER = 'Dr. Edison D. Bravo';

function titlePage() {
  const blank = () => new Paragraph({ spacing: { after: 0, line: 240 }, children: [] });
  return [
    ...Array(3).fill(blank()),
    centered('A THESIS PROPOSAL', { run: { bold: true, size: 32 } }),
    ...Array(2).fill(blank()),
    centered(TITLE.toUpperCase(), { run: { bold: true, size: 32 } }),
    ...Array(3).fill(blank()),
    centered('Submitted in Partial Fulfillment', { run: { italics: true } }),
    centered('of the Requirements for the Degree', { run: { italics: true } }),
    centered('Master of Science in Information Technology', { run: { italics: true } }),
    ...Array(3).fill(blank()),
    centered('CAGAYAN STATE UNIVERSITY', { run: { bold: true, size: 28 } }),
    centered('GRADUATE SCHOOL', { run: { bold: true } }),
    centered('Carig Campus, Tuguegarao City', {}),
    ...Array(3).fill(blank()),
    centered('PROPONENT', { run: { bold: true } }),
    ...Array(4).fill(blank()),
    centered(PROPONENT, { run: { bold: true } }),
    ...Array(2).fill(blank()),
    centered('ADVISER', { run: { bold: true } }),
    ...Array(4).fill(blank()),
    centered(ADVISER, { run: { bold: true } }),
    ...Array(2).fill(blank()),
    centered('April 2025', { run: { bold: true } }),
  ];
}

function approvalSheet() {
  const sig = (label) => [
    ...Array(4).fill(new Paragraph({ children: [] })),
    centered('______________________________'),
    centered(label),
    new Paragraph({ children: [] }),
  ];
  return [
    heading('APPROVAL SHEET', HeadingLevel.HEADING_1, { pageBreak: true }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 360, lineRule: LineRuleType.AUTO },
      indent: { firstLine: 720 },
      children: [
        run(
          'This thesis proposal entitled “' + TITLE + '” prepared by ' + PROPONENT +
            ' is submitted in partial fulfillment of the requirements for the degree Master of Science in Information Technology of Cagayan State University, Graduate School, Carig Campus, Tuguegarao City. The proposal has been examined and accepted as complying with the requirements of the Graduate School.',
        ),
      ],
    }),
    ...sig('Arthur G. Ibanez, ASEAN Engr., Ph.D.'),
    centered('Thesis Panel Chair'),
    ...sig('Dr. Edison D. Bravo'),
    centered('Thesis Adviser'),
    ...sig('Engr. Roger P. Rumpon'),
    centered('Panel Member'),
    ...sig('Generino P. Siddayao, DIT'),
    centered('Panel Member'),
    ...sig('Charmie S. Calvo, DIT'),
    centered('Panel Member'),
    ...sig('Dr. Dennis Bacuyag'),
    centered('Panel Member'),
  ];
}

function acknowledgement() {
  return [
    heading('ACKNOWLEDGEMENT', HeadingLevel.HEADING_1, { pageBreak: true }),
    body(
      'The researcher wishes to express his sincere gratitude to the persons and institutions whose assistance made this study possible.',
    ),
    body(
      'First, to Dr. Edison D. Bravo, thesis adviser, for the guidance, correction, and patience extended throughout the study, and for insisting that a claim in this work must always be supported by the evidence that produces it.',
    ),
    body(
      'To the members of the thesis panel — Arthur G. Ibanez, Engr. Roger P. Rumpon, Generino P. Siddayao, Charmie S. Calvo, and Dr. Dennis Bacuyag — for the comments and corrections given during the proposal defense of April 12, 2025, which reshaped the scope and methodology of this work.',
    ),
    body(
      'To the Regional Director and the personnel of the Regional Bureau of Local Government Finance Region II, for the opportunity to document the office’s real document handling practice, for the permission to examine its records, and for the cooperation of the records and division personnel who took time from their work to be interviewed. This study would not have been possible without their assistance, and the researcher acknowledges them formally here.',
    ),
    body(
      'To the Graduate School and the faculty of Cagayan State University, Carig Campus, for the academic guidance and the research support provided throughout the program.',
    ),
    body(
      'Finally, to the researcher’s family and colleagues, whose encouragement sustained the work during the periods when the system refused to behave as designed.',
    ),
  ];
}

function dedication() {
  return [
    heading('DEDICATION', HeadingLevel.HEADING_1, { pageBreak: true }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 360, lineRule: LineRuleType.AUTO, before: 720, after: 720 },
      indent: { left: 1440, right: 1440 },
      children: [
        run(
          'This work is dedicated to my family, whose support carried the parts of this project that software cannot: the late nights, the printed drafts, and the patience required to finish what was started.',
          { italics: true },
        ),
      ],
    }),
  ];
}

function abstractPage() {
  return [
    heading('ABSTRACT', HeadingLevel.HEADING_1, { pageBreak: true }),
    body(
      'This study presents the analysis, design, development, and evaluation of a web-based document tracking and management system for the Regional Bureau of Local Government Finance Region II. It responds to an operational problem in which the location and completion of a document were confirmed by locating the paper or by asking the person holding it, rather than by consulting a record, and in which a routing reference could be altered or reused when a paper was endorsed outside the originating office.',
    ),
    body(
      'The application registers incoming and outgoing documents with a permanent tracking number and a controlled route number, and records routing, multi-routing, transfer, receipt, decision, and completion as retained events that together form the chain of custody for each document. It supports attachments, derived notifications, routing slips, outgoing-envelope dispatch logs, the office directory with employee folders, QR code generation, three reports, audit logging, configurable storage, and database export. Access is defined across seven organizational roles, and document visibility is restricted in the query layer to the creator, the current recipient, and the users who routed the document, with no role bypass.',
    ),
    body(
      'Development followed an iterative and incremental model, and the resulting data model comprises nine entities declared in the schema and a tenth created at runtime. Referential integrity is mixed by design: document and account relations are enforced by database foreign keys, while log and attachment attribution is logical so that audit evidence survives the deletion of the document or account it describes.',
    ),
    body(
      'Evaluation against the ISO/IEC 25010 product-quality characteristics established conformance for functional suitability, maintainability, and flexibility for the matters inspected, and conformance within a stated scope for compatibility. Reliability and security are reported as partially established, because no backup and restore has been exercised, authorization is not enforced at every endpoint, and passwords are stored and compared in plaintext. Performance efficiency and interaction capability await measurement. No user-acceptance score is reported because the ISO/IEC 25010 instrument has not yet been administered; the instrument, the respondent classification, and the task-timing procedure are provided so that the outstanding measurement can be completed. The study records this boundary rather than estimating the result, and recommends endpoint authorization, password hashing with a memory-hard algorithm, restriction of the export function, and reconciliation of the deployment configuration.',
    ),
    new Paragraph({ children: [] }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 360, lineRule: LineRuleType.AUTO },
      indent: { hanging: 720, left: 720 },
      children: [
        run('Keywords: ', { bold: true, italics: true }),
        run(
          'document tracking, records management, workflow automation, role-based access control, audit trail, QR code, ISO/IEC 25010, BLGF Region II',
          { italics: true },
        ),
      ],
    }),
  ];
}

function tocPages() {
  const dot = (label, toc) => [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240, line: 360, lineRule: LineRuleType.AUTO },
      children: [run(label, { bold: true, size: 28 })],
    }),
    toc,
  ];
  return [
    ...dot(
      'TABLE OF CONTENTS',
      new TableOfContents('Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-5',
        useAppliedParagraphOutlineLevel: false,
      }),
    ),
    ...dot(
      'LIST OF TABLES',
      new TableOfContents('List of Tables', { hyperlink: true, captionLabelIncludingNumbers: 'Table' }),
    ),
    ...dot(
      'LIST OF FIGURES',
      new TableOfContents('List of Figures', { hyperlink: true, captionLabelIncludingNumbers: 'Figure' }),
    ),
  ];
}

// --- back matter ------------------------------------------------------------
function appendixC() {
  const steps = [
    ['Signing in', 'Open the application address in a current browser. The sign-in panel appears over the login background. Enter your username and password. If your account is on first use, the system requires you to set a new password and will not proceed until you do.'],
    ['Finding a document', 'Use Incoming Documents or Outgoing Documents. Search by tracking number, title, or reference; or filter by status, priority, office, or person. A document is visible to you if you created it, currently hold it, or routed it at some point.'],
    ['Registering a document', 'Open the registration control on the appropriate list. Enter the direction, title, subject, category, originating and destination office, sender or recipient, and priority. The system assigns the tracking number. Supply the route number only if the paper already carries one, and follow the pattern BLGFR2-YYYY-MM-IN|OUT-NN.'],
    ['Routing to one person', 'Open the document, choose Route, and select the receiving person. Enter the action requested and any remarks. The system records the movement, advances the step number, and updates the document status.'],
    ['Routing to several people', 'Choose the multiple-recipient option and add each recipient with the action required of that person. Review the order before confirming; the sequence you set is the sequence that will be recorded.'],
    ['Transferring custody', 'Choose Transfer when the document moves without a requested action, for example when it is forwarded for information only. Record the receiving person and the reason.'],
    ['Recording a decision', 'Choose the decision control when an action has been completed or the document must be returned. State the decision, then the next action if the document continues. A returned document records a decision rather than a new number.'],
    ['Completing a document', 'Complete the document when it has been released, filed, or otherwise finished. The completion date is recorded and the document leaves the pending lists.'],
    ['Attaching a file', 'Open the document and use the attachment control. Attach the file to the document as a whole, or to the routing step that required it, so that the file can be located with the step.'],
    ['Following up pending documents', 'Open Routing Follow-up to see documents still inside the routing chain, the elapsed time, and the current holder. From there a reminder can be sent to the holder.'],
    ['Printing a routing slip or envelope', 'Use the Document Routing Slip view to produce the printable slip for a document. Use the Outgoing Envelope view to record a dispatch and produce the printable envelope record. Both are generated from the stored data, so the printed copy cannot differ from the record.'],
    ['Using the directory', 'The Office Directory lists personnel and offices grouped by office type. A profile may be added or edited if your role permits it, and employee folders may be maintained through the Employee Folder Manager.'],
    ['Generating a QR code', 'Open the QR Code Generator and enter a tracking number. The code may be printed onto the routing slip or the folder label so that the physical document can be located from its digital identity.'],
    ['Reading reports', 'The Incoming, Outgoing, and Envelope reports accept a date range and filters and report totals computed from the stored records rather than from a hand-compiled list.'],
    ['Changing your account', 'In User Settings you may complete the forced password setup, change your password, change the login background, and switch between the light and dark themes.'],
  ];
  return [
    { t: 'h1', text: 'APPENDIX C. USER’S MANUAL' },
    { t: 'p', text:
      'This manual describes the operations of the system as they are presented in the interface. Screens referred to are shown in Section 4.2.3.1. The manual assumes that your account has been created and that your role determines which options appear; if an option is missing, your role does not include it, and the System Administrator can grant it.' },
    { t: 'p', text:
      'Two rules apply throughout. First, the tracking number assigned at registration is permanent and is never reissued; if a document is returned, record a decision rather than registering a new document under a new number. Second, custody is confirmed in the system, so a handoff made outside the system leaves no record and will appear as pending.' },
    ...steps.flatMap(([h, t], i) => [
      { t: 'h3', text: `C.${i + 1} ${h}` },
      { t: 'p', text: t },
    ]),
    { t: 'p', text:
      'Responsive and dark-theme states. The interface reflows for narrow viewports, including phone widths, and provides a dark theme. These states are shown in the interface figures in Section 4.2.3.1 for the Dashboard, Directory, Monitoring, Routing, and Recipient Tracking views. The system is an administrative instrument and is not designed to be the primary working device of an office; the responsive layout exists so that a supervisor reviewing pending work is not blocked by being away from a desk.' },
  ];
}

function appendixD() {
  const out = [
    { t: 'h1', text: 'APPENDIX D. ISO/IEC 25010 QUESTIONNAIRE' },
    { t: 'p', text:
      'Purpose. This instrument collects ratings of the developed system against the eight ISO/IEC 25010 product-quality characteristics. It is administered to the respondents classified in Table 3 of the study, following the pilot test requested in Appendix B.' },
    { t: 'p', text:
      'Instructions to respondents. Each item is a statement about the system as you actually use it. Please read the statement and select the response that matches your experience. If a statement does not apply to the duties you perform, or you have not used the part of the system it concerns, mark it Not Applicable rather than guessing. There are no right answers; the purpose is to identify where the system does not yet meet its purpose. The survey takes approximately twenty to thirty minutes.' },
  ];
  out.push({
    t: 'kv',
    cap: 'Rating Scale Used in This Instrument',
    head: ['Value', 'Response', 'Meaning'],
    rows: INSTRUMENT.scale,
    w: [10, 26, 64],
    fs: 19,
  });
  let n = 1;
  for (const sec of INSTRUMENT.sections) {
    out.push({ t: 'h2', text: `D.${n} ${sec.characteristic}` });
    out.push({
      t: 'p',
      text: `Respondent group and weight: ${sec.weight}. Rate each applicable item on the five-point scale. Sub-characteristics excluded from rating, with the reason, are stated after the rated items.`,
    });
    out.push({
      t: 'tab',
      cap: `Items for ${sec.characteristic}`,
      head: ['No.', 'Sub-characteristic', 'Statement'],
      rows: sec.items.map(([sc, s], i) => [`${n}.${i + 1}`, sc, s]),
      w: [8, 26, 66],
      fs: 19,
    });
    if (sec.excluded.length) {
      out.push({
        t: 'tab',
        cap: `Excluded sub-characteristics for ${sec.characteristic}`,
        head: ['Sub-characteristic', 'Reason for exclusion'],
        rows: sec.excluded,
        w: [26, 74],
        fs: 19,
      });
    }
    n += 1;
  }
  out.push({ t: 'h2', text: 'D.9 Open-Ended Items' });
  out.push({ t: 'n', text: 'Which part of the system made your work easiest, and why?' });
  out.push({ t: 'n', text: 'Which part of the system caused you the most difficulty, and what happened?' });
  out.push({ t: 'n', text: 'Is there any document you could not register, route, or locate using the system? If yes, please describe.' });
  out.push({ t: 'n', text: 'What one change to the system would most improve the way you work?' });
  out.push({ t: 'n', text: 'Any other comment on the system:' });
  out.push({ t: 'h2', text: 'D.10 Respondent Profile' });
  out.push({
    t: 'p',
    text:
      'Only the following items are requested. No name, employee number, or other identifying information is collected, and responses are reported only in aggregate, in accordance with Republic Act No. 10173.',
  });
  out.push({
    t: 'tab',
    cap: 'Respondent Profile Items',
    head: ['No.', 'Item', 'Response'],
    rows: [
      ['1', 'System role (System Administrator, Administrative Officer, Records Officer, Records Section Head, Division Chief, Action Officer, or Staff)', ''],
      ['2', 'Division or unit', ''],
      ['3', 'How long you have used the system', ''],
      ['4', 'How often you use the system (daily, weekly, occasionally)', ''],
    ],
    w: [8, 62, 30],
    fs: 19,
  });
  out.push({ t: 'h2', text: 'D.11 Task Timing Record' });
  out.push({
    t: 'p',
    text:
      'Completed by the researcher, not by the respondent. Each task is performed the stated number of times and the elapsed time is recorded in seconds. The measurements support the performance-efficiency findings in Section 4.3.2.',
  });
  out.push({
    t: 'tab',
    cap: 'Task Timing Record Sheet',
    head: ['Task', 'Repetitions', 'Minimum', 'Median', 'Maximum'],
    rows: [
      ['Register an incoming document', '', '', '', ''],
      ['Route a document to one recipient', '', '', '', ''],
      ['Route a document to multiple recipients', '', '', '', ''],
      ['Record a decision', '', '', '', ''],
      ['Transfer custody of a document', '', '', '', ''],
      ['Locate a document from the list by tracking number', '', '', '', ''],
      ['Locate a document by scanning its QR code', '', '', '', ''],
    ],
    w: [46, 14, 13, 14, 13],
    fs: 19,
  });
  return out;
}

function appendixE() {
  return [
    { t: 'h1', text: 'APPENDIX E. SOURCE CODE' },
    { t: 'p', text:
      'The listing below identifies the source files that implement the system described in Chapter IV, with the responsibility of each. It is provided so that the design decisions recorded in this study can be verified against the implementation. The complete source tree of the repository is the authoritative listing; the browser-bundled API file shipped with the repository is deliberately excluded, because it duplicates the server surface and is not the source of truth.' },
    {
      t: 'tab',
      cap: 'Source Files Implementing the Developed System',
      head: ['File', 'Responsibility'],
      rows: APPENDIX_E_FILES,
      w: [46, 54],
      fs: 18,
    },
    { t: 'p', text:
      'The three files that determine the data model and the permission scheme are prisma/mysql/schema.prisma, which declares the nine relational entities, frontend/src/app/types.ts, which declares the roles, statuses, priorities, and default permission set, and backend/documents.ts, which implements the workflow rules and the number assignment. A reviewer seeking to verify the findings in Section 4.3 should read these three files first.' },
    { t: 'p', text:
      'The two findings that a reviewer can confirm quickly are located as follows. The plaintext password storage and comparison appear in the login and password-verification routines in backend/server.ts and in the reset routine in backend/users.ts, against the users.password column declared as nullable Text in prisma/mysql/schema.prisma. The incomplete endpoint authorization appears in the route registrations of backend/server.ts and backend/documents.ts, where the records, storage, statistics, employee, directory-section, and log-deletion handlers do not each verify the caller permission that the corresponding user, division, and deletion handlers do verify.' },
  ];
}

function cv() {
  return [
    { t: 'h1', text: 'CURRICULUM VITAE' },
    { t: 'kv', cap: 'Personal Details', head: ['Field', 'Value'], rows: [
      ['Name', 'TOM TOM G. CATRAL'],
      ['Address', ''],
      ['Contact number', ''],
      ['Electronic mail', ''],
      ['Civil status', ''],
      ['Date and place of birth', ''],
    ], w: [30, 70] },
    { t: 'kv', cap: 'Education', head: ['Institution', 'Degree', 'Year'], rows: [
      ['Cagayan State University, Carig Campus', 'Master of Science in Information Technology', ''],
      ['', '', ''],
      ['', '', ''],
    ], w: [40, 42, 18] },
    { t: 'kv', cap: 'Work Experience', head: ['Position', 'Office', 'Years'], rows: [
      ['', '', ''],
      ['', '', ''],
    ], w: [40, 40, 20] },
    { t: 'kv', cap: 'Training and Certifications', head: ['Title', 'Conducted by', 'Year'], rows: [
      ['', '', ''],
      ['', '', ''],
    ], w: [40, 42, 18] },
    { t: 'p', text:
      'Note: the personal details, educational history, and employment entries above must be completed by the proponent before submission. They are left blank rather than approximated, because a curriculum vitae is a sworn statement about the person named on the title page.' },
  ];
}

// --- assemble ---------------------------------------------------------------
const chapters = [CH1, CH2, CH3, CH4, CH5];

const frontChildren = [
  ...titlePage(),
  ...approvalSheet(),
  ...acknowledgement(),
  ...dedication(),
  ...abstractPage(),
  ...tocPages(),
];

const bodyRuns = [];
for (const ch of chapters) {
  const runs = chapterRuns({ sections: [{ t: 'h1', text: ch.title }, ...ch.sections] });
  for (const r of runs) bodyRuns.push(r);
}
const backRuns = [];
for (const blk of [
  { t: 'h1', text: 'APPENDIX A. REQUEST LETTER FOR GATHERING DATA' },
  ...APPENDIX_A.body.map((b) => ({ t: 'p', text: b.text })),
  { t: 'h1', text: APPENDIX_B.title },
  ...APPENDIX_B.body.map((b) => ({ t: 'p', text: b.text })),
  ...appendixC(),
  ...appendixD(),
  ...appendixE(),
  ...cv(),
]) {
  backRuns.push({ land: false, blocks: [blk] });
}

const sections = [];

// Section 1: front matter, roman numerals, no number on the title page.
sections.push({
  properties: {
    page: {
      size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
      margin: MARGIN,
      pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN },
    },
    titlePage: true,
  },
  children: [
    ...frontChildren,
  ],
});

// Section 2..: body, arabic restart.
let first = true;
for (const r of [...bodyRuns, ...backRuns]) {
  const landscape = r.land;
  const usable = landscape ? W_LANDSCAPE : W_PORTRAIT;
  sections.push({
    properties: {
      page: {
        size: landscape
          ? { width: convertInchesToTwip(11), height: convertInchesToTwip(8.5), orientation: 'landscape' }
          : { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
        margin: MARGIN,
        pageNumbers: first ? { start: 1, formatType: NumberFormat.DECIMAL } : undefined,
      },
      type: SectionType.NEXT_PAGE,
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ })],
          }),
        ],
      }),
    },
    children: renderBlocks(r.blocks, usable),
  });
  first = false;
}

const doc = new Document({
  creator: 'Tom Tom G. Catral',
  title: TITLE,
  description: 'Thesis proposal and documentation for the Web-Based Document Tracking and Management System of BLGF Region II.',
  styles: {
    default: {
      document: { run: { font: FONT, size: SZ } },
      heading1: { run: { font: FONT, size: 28, bold: true }, paragraph: { alignment: AlignmentType.CENTER } },
      heading2: { run: { font: FONT, size: 26, bold: true }, paragraph: { alignment: AlignmentType.CENTER } },
      heading3: { run: { font: FONT, size: 24, bold: true }, paragraph: { alignment: AlignmentType.CENTER } },
      heading4: { run: { font: FONT, size: 24, bold: true, italics: true }, paragraph: { alignment: AlignmentType.LEFT } },
      heading5: { run: { font: FONT, size: 24, bold: true }, paragraph: { alignment: AlignmentType.LEFT } },
    },
    paragraphStyles: [
      { id: 'Caption', name: 'caption', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22 }, paragraph: { spacing: { line: 240, lineRule: LineRuleType.AUTO } } },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullet-list',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: 'ordered-list',
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  settings: { updateFields: true },
  sections,
});

const buffer = await Packer.toBuffer(doc);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buffer);

// --- QA ---------------------------------------------------------------------
const referenceList = refs();
stats.refs = referenceList.length;

// --- citation cross-check ----------------------------------------------------
// Handles both narrative form "Sandhu et al. (1996)" and parenthetical form
// "(Sandhu et al., 1996)" / "(Republic Act No. 10173, 2012)".
const bodyText = [CH1, CH2, CH3, CH4, CH5]
  .map((c) => c.sections.map((b) => b.text || (b.rows || []).map((r) => r.join(' | ')).join(' || ')).join('\n'))
  .join('\n');

const refsText = referenceList.join('\n');
const warnings = [];

const seen = new Map();
const record = (label, year) => {
  const key = `${label}||${year}`;
  if (!seen.has(key)) seen.set(key, 0);
  seen.set(key, seen.get(key) + 1);
};

// parenthetical: ( ... 2016 ) — split on ";" so that "(A, 2016; B, 2020)" yields both.
for (const m of bodyText.matchAll(/\(([^()]{4,200}?)\)/g)) {
  const inner = m[1];
  if (!/\d{4}/.test(inner)) continue;
  if (/;\s*[A-Z]/.test(inner)) {
    for (const part of inner.split(';')) {
      const pm = part.match(/(.+?)[,]?\s*(\d{4}[a-z]?)$/);
      if (pm) record(pm[1].trim(), pm[2]);
    }
  } else {
    const pm = inner.match(/(.+?)[,]?\s*(\d{4}[a-z]?)$/);
    if (pm) record(pm[1].trim(), pm[2]);
  }
}
// parenthetical with no comma before the year: (ISO/IEC 25010 2023)
for (const m of bodyText.matchAll(/\((ISO(?:\/IEC)?\s*[\d.\-]+(?:[: ]\d{4})?)\)/g)) {
  record(m[1].trim(), (m[1].match(/\d{4}/) || ['n.d.'])[0]);
}
// narrative: Surname et al. (1996) / Organisation (2016)
for (const m of bodyText.matchAll(/([A-Z][A-Za-zÀ-ÿ.'\-]+(?:\s+[a-z]+){0,4}(?:\s+et al\.)?)\s*\((\d{4}[a-z]?)\)/g)) {
  record(m[1].trim(), m[2]);
}
for (const m of bodyText.matchAll(/\b(ISO(?:\/IEC)?\s*[\d.\-]+)\b/g)) {
  record(m[1].trim(), 'n.d.');
}

const stop = new Set(['Figure', 'Table', 'Chapter', 'Section', 'Appendix', 'Republic Act No']);
const norm = (s) => s.replace(/[’']/g, '').replace(/\s+/g, ' ').trim();

for (const [key, count] of seen) {
  const [label, year] = key.split('||');
  const L = norm(label);
  if (!L || stop.has(L.split(' ')[0])) continue;
  if (/^(ISO|ISO\/IEC)/.test(L)) {
    // ISO citations: accept if any ISO reference carries that standard number
    const num = L.replace(/^ISO(\/IEC)?\s*/, '').replace(/[: ].*$/, '');
    if (!refsText.includes(num)) warnings.push(`ISO citation not in references: ${L}`);
    continue;
  }
  // Statute form: "Republic Act No. 10173" -> look for the number
  const raMatch = L.match(/(\d{3,5})/);
  if (/^Republic Act/.test(L)) {
    if (raMatch && !refsText.includes(raMatch[1])) warnings.push(`Statute not in references: ${L}`);
    continue;
  }
  const surname = L.split(' ')[0].replace(/[^A-Za-zÀ-ÿ\-]/g, '');
  if (!surname || surname.length < 3) continue;
  const hit = referenceList.some((r) => norm(r).includes(surname) && (year === 'n.d.' || norm(r).includes(year)));
  if (!hit) warnings.push(`CITATION WITHOUT REFERENCE: ${L} (${year}) x${count}`);
}

// References that are never cited in the body.
for (const r of referenceList) {
  const first = norm(r).split(',')[0].trim();
  const surname = first.split(' ')[0];
  if (surname.length < 3) continue;
  const cited = [...seen.keys()].some((k) => norm(k.split('||')[0]).includes(surname));
  if (!cited) warnings.push(`REFERENCE NOT CITED IN TEXT: ${first}`);
}

stats.citations = seen.size;

if (stats.refs < 25) problems.push(`TOO FEW REFERENCES: ${stats.refs} (panel requires at least 25)`);
for (const bad of ['[NAME]', 'Lorem ipsum', 'TODO', 'TBD', 'XXX', 'PLACEHOLDER', 'FIXME', 'Mc soft', 'unite Nations']) {
  if (bodyText.includes(bad) || JSON.stringify(frontChildren).includes(bad)) {
    problems.push(`PLACEHOLDER TOKEN PRESENT: ${bad}`);
  }
}
if (JSON.stringify(frontChildren).includes('[Date]')) {
  warnings.push('APPENDIX LETTERS contain [Date] — fill in before printing.');
}

console.log('--- build report ---');
console.log(`file        : ${OUT}`);
console.log(`size        : ${(buffer.length / 1024).toFixed(0)} KB`);
console.log(`sections    : ${sections.length}`);
console.log(`figures     : ${stats.figures}`);
console.log(`tables      : ${stats.tables}`);
console.log(`references  : ${stats.refs}`);
console.log(`body words  : ${stats.words}`);
console.log(`citations   : ${stats.citations} distinct forms`);
if (warnings.length) {
  console.log(`\n--- ${warnings.length} warning(s) ---`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}
if (problems.length) {
  console.log(`\n--- ${problems.length} problem(s) ---`);
  for (const p of problems) console.log(`  ! ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nno blocking problems detected');
}
