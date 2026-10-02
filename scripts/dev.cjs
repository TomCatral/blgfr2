const path = require('node:path');
const { spawn, spawnSync, execSync } = require('node:child_process');
const { resolveDevPort } = require('./free_ports.cjs');
const { writeRuntimePort } = require('./dev-runtime.cjs');

const projectRoot = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const useShell = process.platform === 'win32';

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

function runNpm(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: projectRoot,
      env,
      stdio: 'inherit',
      shell: useShell,
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

    child.on('error', (err) => {
      cleanup();
      reject(err);
    });

    child.on('exit', (code, signal) => {
      cleanup();
      if (signal) {
        process.exitCode = 1;
        resolve();
        return;
      }
      process.exitCode = code ?? 0;
      resolve();
    });
  });
}

async function main() {
  const preferredPort = Number(process.env.PORT || 3001);
  const { port } = await resolveDevPort(preferredPort);
  const env = {
    ...process.env,
    PORT: String(port),
    BLGF_API_PORT: String(port),
  };

  writeRuntimePort(port);

  console.log(`Starting the BLGF API and Frontend on http://localhost:${port}...`);

  const build = spawnSync(npmCommand, ['run', 'build:frontend:dev'], {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: useShell,
  });

  if (build.error) {
    console.error('Initial build error:', build.error);
    process.exitCode = 1;
    return;
  }

  if (build.status !== 0) {
    process.exitCode = build.status ?? 1;
    return;
  }

  await runNpm(['run', 'dev:concurrent'], env);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});