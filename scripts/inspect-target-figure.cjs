const AdmZip = require('adm-zip');

const file = process.argv[2] || 'output/CATRAL-TOM-TOM-FINAL-REVISED.docx';
const targetCaption = process.argv[3] || 'Detailed Physical Entity-Relationship Diagram';
const zip = new AdmZip(file);
const xml = zip.readAsText('word/document.xml');
const rels = zip.readAsText('word/_rels/document.xml.rels');
const blocks = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>|<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>|<w:sectPr[\s\S]*?<\/w:sectPr>/g) || [];
const text = (value) => (value.match(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g) || [])
  .map((node) => node.replace(/^<w:t(?: [^>]*)?>|<\/w:t>$/g, '')).join('');
const index = blocks.findIndex((block) => text(block).includes(targetCaption));
const nearby = blocks.slice(Math.max(0, index - 5), index + 2);
const ids = [...nearby.join('').matchAll(/r:embed="([^"]+)"/g)].map((match) => match[1]);
const relationships = [...rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)]
  .map((match) => ({ id: match[1], target: match[2] }));
const marker = xml.lastIndexOf(targetCaption);
const preceding = xml.slice(Math.max(0, marker - 30000), marker);
const precedingIds = [...preceding.matchAll(/r:embed="([^"]+)"/g)].map((match) => match[1]).slice(-5);
console.log(JSON.stringify({ index, nearby: nearby.map(text), ids, precedingIds, media: relationships.filter((rel) => [...ids, ...precedingIds].includes(rel.id)) }, null, 2));
