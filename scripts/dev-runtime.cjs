const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const runtimeFile =
  process.env.BLGF_DEV_RUNTIME_FILE ||
  path.join(os.tmpdir(), 'blgfr2-dev-runtime.json');

function readRuntimePort(fallback = 3001) {
  try {
    const parsed = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
    const port = Number(parsed?.port);
    return Number.isInteger(port) && port > 0 ? port : fallback;
  } catch {
    return fallback;
  }
}

function writeRuntimePort(port) {
  fs.writeFileSync(
    runtimeFile,
    JSON.stringify({ port, updatedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
}

module.exports = { runtimeFile, readRuntimePort, writeRuntimePort };