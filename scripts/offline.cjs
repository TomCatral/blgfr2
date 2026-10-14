const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { resolveDevPort } = require('./free_ports.cjs');

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const serverFile = path.join(projectRoot, 'dist', 'backend', 'server.cjs');
  const frontendFile = path.join(projectRoot, 'dist', 'frontend', 'index.html');
  if (!fs.existsSync(serverFile) || !fs.existsSync(frontendFile)) {
    throw new Error(
      'Offline bundle is missing. Run "npm run offline:prepare" once before disconnecting from the internet.',
    );
  }

  const preferredPort = Number(process.env.PORT || 3001);
  const { port } = await resolveDevPort(preferredPort);
  console.log(`Starting BLGF DTS in offline mode on http://localhost:${port}`);
  console.log('Data source: local JSON files (internet and MySQL are not required).');

  const child = spawn(process.execPath, [serverFile, '--port', String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      BLGF_OFFLINE_MODE: '1',
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });
  child.once('error', (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.once('exit', (code) => {
    process.exitCode = code ?? 0;
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
