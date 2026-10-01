const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { resolveDevPort } = require('./free_ports.cjs');
const { writeRuntimePort } = require('./dev-runtime.cjs');

const projectRoot = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpm(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
    });

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () => {
        if (!child.killed) child.kill(signal);
      });
    }

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        process.exitCode = 1;
        resolve();
        return;
      }
      process.exitCode = code ?? 1;
      resolve();
    });
  });
}

async function main() {
  const preferredPort = Number(process.env.PORT || 3001);
  const { port, reuseExisting } = await resolveDevPort(preferredPort);
  const env = {
    ...process.env,
    PORT: String(port),
    BLGF_API_PORT: String(port),
  };

  writeRuntimePort(port);

  console.log(
    reuseExisting
      ? `Existing BLGF API detected on port ${port}; starting the frontend watcher only.`
      : `Starting the BLGF API on http://localhost:${port}.`,
  );

  const build = spawnSync(npmCommand, ['run', 'build:frontend:dev'], {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  });

  if (build.status !== 0) {
    process.exitCode = build.status ?? 1;
    return;
  }

  await runNpm(
    ['run', reuseExisting ? 'dev:frontend' : 'dev:concurrent'],
    env,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});