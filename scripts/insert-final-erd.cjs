const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'output', 'CATRAL-TOM-TOM-FINAL-REVISED.docx');
const output = path.join(root, 'output', 'CATRAL-TOM-TOM-FINAL.docx');
const image = path.join(root, 'output', 'diagrams', 'final-physical-erd.png');
const zip = new AdmZip(source);
let xml = zip.readAsText('word/document.xml');

const marker = '<a:blip r:embed="rId59"/>';
const at = xml.lastIndexOf(marker);
if (at < 0) throw new Error('The detailed physical ERD relationship (rId59) was not found.');
const start = Math.max(0, at - 1500);
const end = Math.min(xml.length, at + 1500);
let drawing = xml.slice(start, end);
const width = 5669280;
const height = Math.round(width * 1320 / 1800);
drawing = drawing
  .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${width}" cy="${height}"/>`)
  .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${width}" cy="${height}"/>`)
  .replace(/name="physical-data-model-2\.png"/, 'name="final-physical-erd.png"');
xml = xml.slice(0, start) + drawing + xml.slice(end);

zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
zip.updateFile('word/media/image52.png', fs.readFileSync(image));
zip.writeZip(output);
console.log(JSON.stringify({ output, relationship: 'rId59', media: 'word/media/image52.png', width, height }, null, 2));
