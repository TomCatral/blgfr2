const fs = require('node:fs');
const AdmZip = require('adm-zip');

const docx = process.argv[2] || 'output/CATRAL-TOM-TOM-FINAL-REVISED.docx';
const rawPath = process.argv[3] || 'scratch/thesis-inspection/revised-raw.txt';
const raw = fs.readFileSync(rawPath, 'utf8');
const zip = new AdmZip(docx);
const documentXml = zip.readAsText('word/document.xml');
const rels = zip.readAsText('word/_rels/document.xml.rels');
const embeds = [...documentXml.matchAll(/r:embed="([^"]+)"/g)].map((match) => match[1]);
const relationshipIds = new Set([...rels.matchAll(/Id="([^"]+)"/g)].map((match) => match[1]));

console.log(JSON.stringify({
  tableCaptions: [...raw.matchAll(/^Table 4\.\d+\./gm)].length,
  chapterFigureCaptions: [...raw.matchAll(/^Figure 4\.\d+\./gm)].length,
  appendixCFigureCaptions: [...raw.matchAll(/^Figure C\.\d+\./gm)].length,
  correctedTableDesignOccurrences: [...raw.matchAll(/4\.2\.4 Table Design/g)].length,
  oldTableDesignOccurrences: [...raw.matchAll(/4\.2\.3 Table Design/g)].length,
  drawingEmbeds: embeds.length,
  uniqueEmbeds: new Set(embeds).size,
  missingRelationships: [...new Set(embeds.filter((id) => !relationshipIds.has(id)))],
}, null, 2));
