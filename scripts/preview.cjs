const path = require('node:path');
const { spawn } = require('node:child_process');
const { readRuntimePort } = require('./dev-runtime.cjs');

const projectRoot = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = readRuntimePort();

console.log(`Previewing the frontend with the API proxy targeting port ${port}.`);

const child = spawn(npmCommand, ['--prefix', 'frontend', 'run', 'start'], {
  cwd: projectRoot,
  env: { ...process.env, BLGF_API_PORT: String(port) },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 0;
});