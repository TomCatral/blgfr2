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

const fs = require('node:fs');

function runDevProcesses(env) {
  return new Promise((resolve, reject) => {
    const children = [
      spawnNpm(['run', 'dev:backend', '--', '--port', env.PORT], env),
      spawnNpm(['run', 'dev:frontend'], env),
    ];

    const caddyExe = path.join(projectRoot, 'caddy.exe');
    const caddyfile = path.join(projectRoot, 'Caddyfile');
    if (fs.existsSync(caddyExe) && fs.existsSync(caddyfile)) {
      try {
        if (process.platform === 'win32') {
          execSync('taskkill /F /IM caddy.exe', { stdio: 'ignore' });
        }
      } catch {}
      const caddy = spawn(caddyExe, ['run', '--config', caddyfile], {
        cwd: projectRoot,
        stdio: 'ignore',
        shell: false,
      });
      children.push(caddy);
    }

    let settled = false;
    const cleanup = (except) => {
      for (const child of children) {
        if (child === except) continue;
        killProcessTree(child.pid);
      }
      try {
        if (process.platform === 'win32') {
          execSync('taskkill /F /IM caddy.exe', { stdio: 'ignore' });
        }
      } catch {}
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
  const portSuffix = port === 80 ? '' : `:${port}`;
  const publicUrl = process.env.PUBLIC_URL || 'https://blgfdts.duckdns.org/login';
  console.log(`=======================================================`);
  console.log(`BLGF REGION II DOCUMENT TRACKING SYSTEM`);
  console.log(`Desktop Local  : http://localhost${portSuffix}/login`);
  console.log(`Public Online  : ${publicUrl}`);
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
