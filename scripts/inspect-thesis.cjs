const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

const root = path.resolve(__dirname, '..');
const docxPath = path.join(root, 'output', 'CATRAL-TOM-TOM-FINAL-TOC-ALIGNED.docx');
const pdfPath = 'C:\\Users\\USER\\Downloads\\Table-Of-Contents.pdf';
const outDir = path.join(root, 'scratch', 'thesis-inspection');
fs.mkdirSync(outDir, { recursive: true });

function decodeXml(value) {
  return value
    .replace(/<w:tab\/?\s*>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function inspectDocx() {
  const zip = new AdmZip(docxPath);
  const xml = zip.readAsText('word/document.xml');
  const body = xml.match(/<w:body[\s\S]*?<\/w:body>/)?.[0] || xml;
  const blocks = body.match(/<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/g) || [];
  const lines = [];
  let paragraphNo = 0;
  let tableNo = 0;
  for (const block of blocks) {
    if (block.startsWith('<w:tbl')) {
      tableNo += 1;
      const rows = block.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
      const textRows = rows.map((row) =>
        (row.match(/<w:tc[\s\S]*?<\/w:tc>/g) || []).map(decodeXml).join(' | '),
      );
      lines.push(`[TABLE ${tableNo}]`);
      lines.push(...textRows.map((row) => `  ${row}`));
      continue;
    }
    paragraphNo += 1;
    const style = block.match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1] || '';
    const numId = block.match(/<w:numId[^>]*w:val="([^"]+)"/)?.[1] || '';
    const drawingCount = (block.match(/<w:drawing/g) || []).length;
    const text = decodeXml(block);
    if (text || drawingCount) {
      lines.push(`[P${paragraphNo}${style ? ` style=${style}` : ''}${numId ? ` num=${numId}` : ''}${drawingCount ? ` images=${drawingCount}` : ''}] ${text}`);
    }
  }
  fs.writeFileSync(path.join(outDir, 'docx-structure.txt'), lines.join('\n'));
  return { paragraphs: paragraphNo, tables: tableNo, blocks: lines.length };
}

async function main() {
  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const pdf = await parser.getText();
  await parser.destroy();
  fs.writeFileSync(path.join(outDir, 'toc-pdf.txt'), pdf.text || String(pdf));
  const html = await mammoth.convertToHtml({ path: docxPath });
  fs.writeFileSync(path.join(outDir, 'docx.html'), html.value);
  const raw = await mammoth.extractRawText({ path: docxPath });
  fs.writeFileSync(path.join(outDir, 'docx-raw.txt'), raw.value);
  console.log(JSON.stringify({ pdfPages: pdf.total, ...inspectDocx(), messages: html.messages }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
