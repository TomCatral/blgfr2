const net = require('node:net');

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

  for (let port = firstPort; port < firstPort + MAX_ATTEMPTS; port += 1) {
    if (await isPortFree(port)) {
      return { port, reuseExisting: false };
    }
    if (await isBlgfServer(port)) {
      return { port, reuseExisting: true };
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

module.exports = { resolveDevPort, waitForBlgfServer, isPortFree, isBlgfServer };

if (require.main === module) {
  resolveDevPort()
    .then(({ port, reuseExisting }) => {
      console.log(
        reuseExisting
          ? `Existing BLGF API detected on port ${port}.`
          : `Port ${port} is available.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}