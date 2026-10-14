const fs = require('node:fs');
const path = require('node:path');
const { PDFParse } = require('pdf-parse');

(async () => {
  const file = 'scratch/thesis-inspection/CATRAL-TOM-TOM-FINAL-preview.pdf';
  const parser = new PDFParse({ data: fs.readFileSync(file) });
  const result = await parser.getScreenshot({ partial: [5, 6, 35, 77], desiredWidth: 1400, imageBuffer: true });
  for (const page of result.pages) {
    fs.writeFileSync(path.join('scratch/thesis-inspection', `final-page-${page.pageNumber}.png`), Buffer.from(page.data));
  }
  await parser.destroy();
  console.log(result.pages.map((page) => page.pageNumber));
})().catch((error) => { console.error(error); process.exit(1); });
