const path = require('node:path');
const { spawn, spawnSync, execSync } = require('node:child_process');
const { resolveDevPort } = require('./free_ports.cjs');
const { writeRuntimePort } = require('./dev-runtime.cjs');

const projectRoot = path.join(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmCli = process.env.npm_execpath;

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

function spawnNpm(args, env) {
  const command = npmCli ? process.execPath : npmCommand;
  const commandArgs = npmCli ? [npmCli, ...args] : args;
  return spawn(command, commandArgs, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: false,
  });
}

function spawnNpmSync(args, env) {
  const command = npmCli ? process.execPath : npmCommand;
  const commandArgs = npmCli ? [npmCli, ...args] : args;
  return spawnSync(command, commandArgs, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: false,
  });
}

function runDevProcesses(env) {
  return new Promise((resolve, reject) => {
    // Spawn both services here instead of nesting them under `concurrently`.
    // On Windows the extra shell layer can drop runtime environment overrides,
    // making the API bind to 3001 even after the launcher selected another port.
    const children = [
      spawnNpm(['run', 'dev:backend', '--', '--port', env.PORT], env),
      spawnNpm(['run', 'dev:frontend'], env),
    ];

    let settled = false;
    const cleanup = (except) => {
      for (const child of children) {
        if (child === except) continue;
        killProcessTree(child.pid);
      }
    };

    const finish = (code, child) => {
      if (settled) return;
      settled = true;
      cleanup(child);
      process.exitCode = code ?? 1;
      resolve();
    };

    for (const child of children) {
      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        cleanup(child);
        reject(error);
      });
      child.on('exit', (code, signal) => finish(signal ? 1 : code, child));
    }

    const stopAll = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      process.once(signal, stopAll);
    }
    process.once('exit', () => cleanup());
  });
}

function runNpm(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawnNpm(args, env);

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

  const os = require('node:os');
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  const preferredIp =
    addresses.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) ||
    addresses[0] ||
    'localhost';
  const hostname = os.hostname().toLowerCase();

  const portSuffix = port === 80 ? '' : `:${port}`;
  console.log(`=======================================================`);
  console.log(`Starting the BLGF API and Frontend...`);
  console.log(`Desktop Local  : http://localhost${portSuffix}/login (Webcam Ready)`);
  console.log(`Custom Domain  : http://blgf.local${portSuffix}/login`);
  console.log(`Local Hostname : http://${hostname}.local${portSuffix}/login`);
  console.log(`Direct Wi-Fi IP: http://${preferredIp}${portSuffix}/login`);
  console.log(`=======================================================`);

  const build = spawnNpmSync(['run', 'build:frontend:dev'], env);

  if (build.error) {
    console.error('Initial build error:', build.error);
    process.exitCode = 1;
    return;
  }

  if (build.status !== 0) {
    process.exitCode = build.status ?? 1;
    return;
  }

  await runDevProcesses(env);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
