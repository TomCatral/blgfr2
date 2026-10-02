const net = require('node:net');
const childProcess = require('node:child_process');

const DEFAULT_PORT = 3001;
const MAX_ATTEMPTS = 20;

function isPortFree(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen({ host, port, exclusive: true }, () => {
      probe.close(() => resolve(true));
    });
  });
}

function freePort(port) {
  if (process.platform === 'win32') {
    try {
      const output = childProcess.execSync('netstat -ano -p tcp', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const lines = output.split(/\r?\n/);
      const pids = new Set();
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const match = line.trim().match(/\s+(\d+)$/);
          if (match && match[1] && match[1] !== '0' && Number(match[1]) !== process.pid) {
            pids.add(match[1]);
          }
        }
      }
      for (const pid of pids) {
        try {
          childProcess.execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        } catch {}
      }
    } catch {}
  } else {
    try {
      childProcess.execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    } catch {}
  }
}

async function isBlgfServer(port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const body = await response.json();
    return String(body?.system || '').includes('BLGF');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveDevPort(startPort = Number(process.env.PORT || DEFAULT_PORT)) {
  const firstPort =
    Number.isInteger(startPort) && startPort > 0 ? startPort : DEFAULT_PORT;

  if (await isPortFree(firstPort)) {
    return { port: firstPort };
  }

  // If port is occupied by a lingering instance, kill it to ensure a clean start
  freePort(firstPort);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (await isPortFree(firstPort)) {
    return { port: firstPort };
  }

  for (let port = firstPort + 1; port < firstPort + MAX_ATTEMPTS; port += 1) {
    if (await isPortFree(port)) {
      return { port };
    }
  }

  throw new Error(
    `No usable port found from ${firstPort} to ${firstPort + MAX_ATTEMPTS - 1}.`,
  );
}

async function waitForBlgfServer(port, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await isBlgfServer(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

module.exports = { resolveDevPort, waitForBlgfServer, isPortFree, isBlgfServer, freePort };

if (require.main === module) {
  resolveDevPort()
    .then(({ port }) => {
      console.log(`Port ${port} is available.`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}