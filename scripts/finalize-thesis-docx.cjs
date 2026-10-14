const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'output', 'CATRAL-TOM-TOM-FINAL-TOC-ALIGNED.docx');
const outputPath = path.join(root, 'output', 'CATRAL-TOM-TOM-FINAL-REVISED.docx');

const xmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const plainText = (xml) => (xml.match(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g) || [])
  .map((node) => node.replace(/^<w:t(?: [^>]*)?>|<\/w:t>$/g, ''))
  .join('')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/\s+/g, ' ').trim();

function paragraph(text, options = {}) {
  const { style, bold = false, italic = false, center = false, before = 80, after = 80, size = 22 } = options;
  const pPr = [
    style ? `<w:pStyle w:val="${style}"/>` : '',
    center ? '<w:jc w:val="center"/>' : '',
    `<w:spacing w:before="${before}" w:after="${after}" w:line="276" w:lineRule="auto"/>`,
  ].join('');
  const rPr = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  return `<w:p><w:pPr>${pPr}</w:pPr><w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function replaceParagraphText(xml, text) {
  const pPr = xml.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] || '<w:pPr/>';
  return `<w:p>${pPr}<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function bodyBlocks(body) {
  return body.match(/<w:tbl[\s\S]*?<\/w:tbl>|<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>|<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
}

function scaleDrawing(xml, maxCx = 3000000) {
  const extent = xml.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/);
  if (!extent) return xml;
  const cx = Number(extent[1]);
  const cy = Number(extent[2]);
  if (cx <= maxCx) return xml;
  const ratio = maxCx / cx;
  const nextCy = Math.round(cy * ratio);
  return xml
    .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${maxCx}" cy="${nextCy}"/>`)
    .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${maxCx}" cy="${nextCy}"/>`);
}

function extractDrawingParagraphs(xml) {
  return (xml.match(/<w:r(?: [^>]*)?>[\s\S]*?<w:drawing\b[\s\S]*?<\/w:drawing>[\s\S]*?<\/w:r>/g) || [])
    .map((run) => `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${run}</w:p>`);
}

function manualTable(leftBlocks, rightTitle, procedure, caption) {
  const left = leftBlocks.length
    ? leftBlocks.map((block) => scaleDrawing(block)).join('')
    : paragraph('Refer to the document details screen.', { italic: true, center: true, size: 19 });
  const steps = procedure.split(/\n+/).map((step) => step.trim()).filter(Boolean);
  const right = [
    paragraph(rightTitle, { bold: true, size: 22, before: 20, after: 100 }),
    paragraph('Procedure', { bold: true, size: 20, before: 20, after: 40 }),
    ...steps.map((step) => paragraph(step, { size: 20, before: 20, after: 55 })),
  ].join('');
  const cap = paragraph(caption, { style: 'Caption', italic: true, center: true, size: 18, before: 60, after: 30 });
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9E2F3"/><w:left w:val="single" w:sz="4" w:color="D9E2F3"/><w:bottom w:val="single" w:sz="4" w:color="D9E2F3"/><w:right w:val="single" w:sz="4" w:color="D9E2F3"/><w:insideV w:val="single" w:sz="4" w:color="D9E2F3"/></w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5200"/><w:gridCol w:w="4000"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="5200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${left}${cap}</w:tc><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${right}</w:tc></w:tr></w:tbl>`;
}

const conciseReplacements = new Map([
  ['This chapter documents the system output already verifiable from the implemented application. Survey-dependent tables remain explicitly marked for completion after formal pilot testing; no respondent score is fabricated in this proposal draft.', 'This chapter presents the identified workflow problems, the developed system, its implemented data structure, and the framework used to evaluate compliance with ISO/IEC 25010.'],
  ['The developed WDTMP is a permission-controlled Angular/Ionic and Express application connected to MySQL through Prisma. It supports the complete BLGF Region II document lifecycle: authentication; incoming and outgoing registration; permanent route-number issuance; Register Only and Register and Route; search; access-scoped monitoring; route, multi-route, transfer, receive, action recording, approval/disapproval, Step Reply, completion, final instruction, and continued routing; recipient-scoped notes and files; and retained transaction history.', 'The developed WDTMP is an Angular/Ionic and Express application with a MySQL database. It manages authentication, document registration, routing, status monitoring, scoped attachments, notifications, reports, QR lookup, printing, and audit history according to user permissions.'],
  ['The extent of compliance of the WDTMP shall be evaluated using the researcher-supplied Software Effectiveness Questionnaire based on ISO/IEC 25010:2011. The instrument measures Functionality, Reliability, Usability, Efficiency, Maintainability, Portability, Compatibility, and Security using a five-point scale: 5 - compliant to a very high extent; 4 - compliant to a high extent; 3 - compliant to a moderate extent; 2 - compliant to a low extent; and 1 - compliant to a very low extent.', 'The WDTMP is evaluated through the validated questionnaire in Appendix D. The instrument covers functionality, reliability, usability, efficiency, maintainability, portability, compatibility, and security using the five-point scale defined in Chapter III.'],
  ['The Weighted Mean and Verbal Interpretation columns shall contain only values computed from accomplished and validated questionnaires. They intentionally remain marked as actual-result fields in this manuscript copy because no respondent dataset was supplied. This prevents unsupported or fabricated findings. The complete respondent questionnaire appears in Appendix D.', 'Compliance results must be computed only from validated responses. Weighted means are interpreted using the five-point scale in Chapter III; the complete instrument is provided in Appendix D.'],
  ['This manual provides simple step-by-step procedures for navigating and using the important functions of the Web-Based Document Tracking and Management Platform. Each procedure is followed by an unaltered screenshot from the running system.', 'This manual provides concise procedures for the main WDTMP functions. Screenshots are paired with the corresponding instructions for quick reference.'],
  ['The intended users are System Administrators, records or originating personnel, document recipients or approving personnel, and other authorized BLGF employees. Available menus and commands depend on the permissions of the signed-in account.', 'This manual is intended for administrators, records personnel, document originators, recipients, approvers, and other authorized BLGF employees. Available functions depend on account permissions.'],
  ['The manual covers system access, application installation, account settings, dashboard, search, notifications, document registration, incoming and outgoing monitoring, routing flow, recipient conversation, scoped attachments, reminders, completion, QR generation, routing slips, envelopes, reports, directory records, accounts, roles, divisions, and audit logs.', 'It covers access, account settings, registration, monitoring, routing, reminders, QR and print outputs, reports, directory records, administration, and troubleshooting.'],
]);

function revise() {
  const zip = new AdmZip(sourcePath);
  let documentXml = zip.readAsText('word/document.xml');
  const bodyMatch = documentXml.match(/<w:body[\s\S]*?<\/w:body>/);
  if (!bodyMatch) throw new Error('The DOCX body could not be read.');
  let blocks = bodyBlocks(bodyMatch[0]);

  let inChapter4 = false;
  let inAppendixC = false;
  let chapterFigure = 0;
  let appendixFigure = 0;
  let chapterTable = 0;
  const chapterFigureEntries = [];
  const appendixFigureEntries = [];
  const tableEntries = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const text = plainText(blocks[i]);
    if (text === 'CHAPTER IV') inChapter4 = true;
    if (/^CHAPTER V\b/.test(text)) inChapter4 = false;
    if (/^Appendix C\. Users Manual$/i.test(text)) inAppendixC = true;
    if (/^Appendix D\./i.test(text)) inAppendixC = false;

    if (conciseReplacements.has(text)) blocks[i] = replaceParagraphText(blocks[i], conciseReplacements.get(text));
    if (text === '4.2.3 Table Design') blocks[i] = replaceParagraphText(blocks[i], '4.2.4 Table Design');

    if (inChapter4 && /^Figure(?: SEQ Figure \\?\* ARABIC)? \d+\./i.test(text)) {
      chapterFigure += 1;
      const title = text.replace(/^Figure(?: SEQ Figure \\?\* ARABIC)? \d+\.\s*/i, '');
      const caption = `Figure 4.${chapterFigure}. ${title}`;
      blocks[i] = replaceParagraphText(blocks[i], caption);
      chapterFigureEntries.push(caption);
    }
    if (inAppendixC && /^.*Figure(?: SEQ Figure \\?\* ARABIC)? \d+\./i.test(text)) {
      appendixFigure += 1;
      const title = text.replace(/^.*?Figure(?: SEQ Figure \\?\* ARABIC)? \d+\.\s*/i, '');
      const caption = `Figure C.${appendixFigure}. ${title}`;
      blocks[i] = replaceParagraphText(blocks[i], caption);
      appendixFigureEntries.push(caption);
    }
    if (inChapter4 && /^Table 4\.\d+\./i.test(text)) {
      chapterTable += 1;
      const title = text.replace(/^Table 4\.\d+\.\s*/i, '');
      const caption = `Table 4.${chapterTable}. ${title}`;
      blocks[i] = replaceParagraphText(blocks[i], caption);
      tableEntries.push(caption);
    }
  }

  // Remove repetitive AI-like notes and generic descriptions in the User's View section.
  blocks = blocks.filter((block) => {
    const text = plainText(block);
    if (text === 'Notes:') return false;
    if (text.startsWith('Commands, documents, attachments, recipient notes, and transaction branches remain subject to role-based access control')) return false;
    if (text.startsWith('The diagram identifies the principal persistent entities or runtime records involved in this module.')) return false;
    return true;
  });

  // Replace the inaccurate List of Tables with the actual Chapter IV table sequence.
  let lotStart = blocks.findIndex((block) => plainText(block) === 'LIST OF TABLES');
  let lofStart = blocks.findIndex((block) => plainText(block) === 'LIST OF FIGURES');
  if (lotStart >= 0 && lofStart > lotStart) {
    const list = tableEntries.map((entry) => paragraph(entry, { size: 22, before: 20, after: 20 }));
    blocks.splice(lotStart + 1, lofStart - lotStart - 1, ...list);
  }

  // Replace the stale List of Figures with actual Chapter IV and Appendix C captions.
  lofStart = blocks.findIndex((block) => plainText(block) === 'LIST OF FIGURES');
  const abstractStart = blocks.findIndex((block, index) => index > lofStart && /^ABSTRACT$/i.test(plainText(block)));
  if (lofStart >= 0 && abstractStart > lofStart) {
    const earlier = [
      'Figure 1. Conceptual Framework',
      'Figure 2. Research Paradigm',
      'Figure 3.1. System Architecture',
      'Figure 3.2. Use-Case Diagram of the Implemented WDTMP',
      'Figure 3.3. Context-Level Data Flow Diagram',
      'Figure 3.4. Efficiency Formula',
      'Figure 3.5. Likert Scale for Manual Tracking and WDTMP',
      'Figure 3.6. Likert Scale for ISO 25010 Compliance',
    ];
    const list = [...earlier, ...chapterFigureEntries, ...appendixFigureEntries]
      .map((entry) => paragraph(entry, { style: 'TableofFigures', size: 22, before: 20, after: 20 }));
    blocks.splice(lofStart + 1, abstractStart - lofStart - 1, ...list);
  }

  // Turn Appendix C modules into consistent screenshot/procedure side-by-side cards.
  const appendixStart = blocks.findIndex((block) => /^Appendix C\. Users Manual$/i.test(plainText(block)));
  const appendixEnd = blocks.findIndex((block, index) => index > appendixStart && /^Appendix D\./i.test(plainText(block)));
  if (appendixStart >= 0 && appendixEnd > appendixStart) {
    const before = blocks.slice(0, appendixStart + 1);
    const source = blocks.slice(appendixStart + 1, appendixEnd);
    const after = blocks.slice(appendixEnd);
    const rebuilt = [];
    let i = 0;
    let currentSection = '';
    const pendingDrawings = [];
    while (i < source.length) {
      const text = plainText(source[i]);
      if (/^User Manual for /i.test(text) || /^\d\.\d?\s/.test(text) || /^C\.\d\s/.test(text)) {
        const cleanText = text.replace(/^-?\d+(?:-\d+)*/, '').trim();
        rebuilt.push(/<w:drawing\b/.test(source[i]) ? replaceParagraphText(source[i], cleanText) : source[i]);
        if (/^C\.\d\s/.test(cleanText)) currentSection = cleanText;
        pendingDrawings.push(...extractDrawingParagraphs(source[i]));
        i += 1;
        continue;
      }
      const style = source[i].match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1] || '';
      if (style === 'Heading5') {
        const title = text.replace(/^-?\d+/, '').trim() || 'System Function';
        if (title === 'System Function') {
          pendingDrawings.push(...extractDrawingParagraphs(source[i]));
          i += 1;
          continue;
        }
        const group = [source[i]];
        i += 1;
        while (i < source.length) {
          const nextText = plainText(source[i]);
          const nextStyle = source[i].match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1] || '';
          if (nextStyle === 'Heading5' || nextStyle === 'Heading3' || /^C\.\d\s/.test(nextText) || /^Appendix D\./i.test(nextText)) break;
          group.push(source[i]);
          i += 1;
          if (/^Figure C\.\d+\./i.test(nextText)) break;
        }
        const procedureBlock = group.find((block) => /^(Steps to follow:|Procedure:)/i.test(plainText(block)));
        const procedure = (procedureBlock ? plainText(procedureBlock) : 'Review the screen and use only the actions allowed for the signed-in account.')
          .replace(/^(Steps to follow:|Procedure:)\s*/i, '')
          .replace(/(\d+)\.\s*/g, '\n$1. ')
          .trim();
        const captionBlock = group.find((block) => /^Figure C\.\d+\./i.test(plainText(block)));
        const caption = captionBlock ? plainText(captionBlock) : `${currentSection}: ${title}`;
        const drawings = group.flatMap(extractDrawingParagraphs);
        if (!drawings.length && pendingDrawings.length) drawings.push(pendingDrawings.shift());
        rebuilt.push(manualTable(drawings, title, procedure, caption));
        rebuilt.push(paragraph('', { before: 40, after: 40 }));
        continue;
      }
      rebuilt.push(source[i]);
      i += 1;
    }
    blocks = [...before, ...rebuilt, ...after];
  }

  let body = `<w:body>${blocks.join('')}</w:body>`;
  documentXml = documentXml.replace(bodyMatch[0], () => body);

  // Clarify ISO table headings and remove placeholder-looking results.
  documentXml = documentXml
    .replace(/4\.2\.3 Table Design/g, '4.2.4 Table Design')
    .replace(/ISO 25010 Compliance Evaluation and Results Framework/g, 'ISO 25010 Compliance Evaluation Framework')
    .replace(/Questionnaire Indicators/g, 'Evaluation Criteria')
    .replace(/Weighted Mean/g, 'Data Source')
    .replace(/Verbal Interpretation/g, 'Interpretation Method')
    .replace(/\[Actual result\]/g, 'Validated questionnaire responses')
    .replace(/\[Based on scale\]/g, 'Weighted mean and five-point scale')
    .replace(/participantâ€”not the System Administratorâ€”uses/g, 'participant—not the System Administrator—uses')
    .replace(/â€™/g, '’')
    .replace(/â€œ/g, '“')
    .replace(/â€/g, '”')
    .replace(/â€“/g, '–');

  zip.updateFile('word/document.xml', Buffer.from(documentXml, 'utf8'));
  let settings = zip.readAsText('word/settings.xml');
  if (!/<w:updateFields\b/.test(settings)) {
    settings = settings.replace('</w:settings>', '<w:updateFields w:val="true"/></w:settings>');
    zip.updateFile('word/settings.xml', Buffer.from(settings, 'utf8'));
  }
  zip.writeZip(outputPath);
  console.log(JSON.stringify({ outputPath, chapterTables: chapterTable, chapterFigures: chapterFigure, appendixFigures: appendixFigure }, null, 2));
}

revise();
