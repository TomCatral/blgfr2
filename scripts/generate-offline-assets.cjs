const fs = require('node:fs');
const path = require('node:path');

const frontendDir = path.resolve(__dirname, '..', 'dist', 'frontend');
if (!fs.existsSync(frontendDir)) {
  console.error('Frontend build output was not found:', frontendDir);
  process.exitCode = 1;
  return;
}

const includedExtensions = new Set([
  '.css', '.html', '.ico', '.jpg', '.jpeg', '.js', '.json', '.png', '.svg', '.webmanifest', '.woff', '.woff2',
]);
const assets = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collect(absolutePath);
      continue;
    }
    if (entry.name === 'offline-assets.json') continue;
    if (!includedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    assets.push(`/${path.relative(frontendDir, absolutePath).split(path.sep).join('/')}`);
  }
}

collect(frontendDir);
assets.sort();
fs.writeFileSync(
  path.join(frontendDir, 'offline-assets.json'),
  `${JSON.stringify(assets, null, 2)}\n`,
  'utf8',
);
console.log(`Offline asset manifest generated with ${assets.length} files.`);
