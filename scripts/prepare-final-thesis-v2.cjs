const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'output', 'CATRAL-TOM-TOM-FINAL.docx');
const output = path.join(root, 'output', 'CATRAL-TOM-TOM-FINAL-PREPARED.docx');
const useCaseJpeg = path.join(root, 'output', 'diagrams', 'final-use-case-v2.jpeg');
const erdPng = path.join(root, 'output', 'diagrams', 'final-physical-erd-v2.png');
const zip = new AdmZip(source);
let xml = zip.readAsText('word/document.xml');

function resizeDrawing(relationshipId, name, width, imageWidth, imageHeight) {
  const marker = `r:embed="${relationshipId}"`;
  const at = xml.lastIndexOf(marker);
  if (at < 0) throw new Error(`Drawing relationship ${relationshipId} was not found.`);
  const start = Math.max(0, at - 1700);
  const end = Math.min(xml.length, at + 1700);
  const height = Math.round(width * imageHeight / imageWidth);
  let drawing = xml.slice(start, end)
    .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${width}" cy="${height}"/>`)
    .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${width}" cy="${height}"/>`)
    .replace(/name="[^"]+"/, `name="${name}"`);
  xml = xml.slice(0, start) + drawing + xml.slice(end);
}

resizeDrawing('rId11', 'final-use-case-v2.jpeg', 5669280, 1800, 1250);
resizeDrawing('rId59', 'final-physical-erd-v2.png', 5669280, 1800, 1250);
zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
zip.updateFile('word/media/image4.jpeg', fs.readFileSync(useCaseJpeg));
zip.updateFile('word/media/image52.png', fs.readFileSync(erdPng));
zip.writeZip(output);
console.log(output);
