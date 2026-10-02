const path = require('node:path');
const { spawn, execSync } = require('node:child_process');
const { readRuntimePort } = require('./dev-runtime.cjs');

const projectRoot = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = readRuntimePort();

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {}
}

console.log(`Previewing the frontend with the API proxy targeting port ${port}.`);

const child = spawn(npmCommand, ['--prefix', 'frontend', 'run', 'start'], {
  cwd: projectRoot,
  env: { ...process.env, BLGF_API_PORT: String(port) },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const cleanup = () => {
  killProcessTree(child.pid);
  if (!child.killed) {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
};

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    cleanup();
    process.exit(0);
  });
}

process.on('exit', cleanup);

child.on('error', (error) => {
  cleanup();
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  cleanup();
  process.exitCode = signal ? 1 : code ?? 0;
});