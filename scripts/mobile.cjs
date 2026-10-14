const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { resolveDevPort, waitForBlgfServer } = require('./free_ports.cjs');

const projectRoot = path.resolve(__dirname, '..');
const cloudflaredCandidates = process.platform === 'win32'
  ? [
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
      'cloudflared.exe',
    ]
  : ['cloudflared'];

function findCloudflared() {
  return cloudflaredCandidates.find((candidate) =>
    candidate.includes(path.sep) ? fs.existsSync(candidate) : true,
  );
}

function stop(child) {
  if (!child?.pid || child.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child.kill('SIGTERM');
    }
  } catch {}
}

async function writeQr(url) {
  const qrModulePath = path.join(projectRoot, 'frontend', 'node_modules', 'qrcode');
  const QRCode = require(qrModulePath);
  const outputDir = path.join(projectRoot, 'output');
  const qrPath = path.join(outputDir, 'mobile-install-qr.png');
  fs.mkdirSync(outputDir, { recursive: true });
  await QRCode.toFile(qrPath, url, {
    width: 720,
    margin: 3,
    errorCorrectionLevel: 'H',
    color: { dark: '#0f2d59', light: '#ffffff' },
  });
  return qrPath;
}

async function main() {
  const serverFile = path.join(projectRoot, 'dist', 'backend', 'server.cjs');
  const frontendFile = path.join(projectRoot, 'dist', 'frontend', 'index.html');
  if (!fs.existsSync(serverFile) || !fs.existsSync(frontendFile)) {
    throw new Error('Mobile bundle is missing. Run "npm run offline:prepare" first.');
  }
  const cloudflared = findCloudflared();
  if (!cloudflared) throw new Error('cloudflared is not installed on this laptop.');

  const { port } = await resolveDevPort(Number(process.env.PORT || 3001));
  const server = spawn(process.execPath, [serverFile, '--port', String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      BLGF_OFFLINE_MODE: '1',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (!(await waitForBlgfServer(port, 60))) {
    stop(server);
    throw new Error(`The local BLGF server did not start on port ${port}.`);
  }

  console.log(`Local laptop server ready: http://localhost:${port}`);
  console.log('Creating the secure mobile installation link...');
  const tunnel = spawn(
    cloudflared,
    ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'],
    { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );

  let announced = false;
  const inspectOutput = async (chunk) => {
    const message = chunk.toString();
    const match = message.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (!match || announced) return;
    announced = true;
    const mobileUrl = match[0];
    const qrPath = await writeQr(mobileUrl);
    console.log('\n=======================================================');
    console.log('BLGF DTS MOBILE INSTALL LINK');
    console.log(mobileUrl);
    console.log(`QR image: ${qrPath}`);
    console.log('Keep this window open while phones use or sync the app.');
    console.log('=======================================================\n');
  };
  tunnel.stdout.on('data', (chunk) => void inspectOutput(chunk));
  tunnel.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    void inspectOutput(chunk);
  });

  const cleanup = () => {
    stop(tunnel);
    stop(server);
  };
  process.once('exit', cleanup);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => {
      cleanup();
      process.exit(0);
    });
  }
  tunnel.once('exit', (code) => {
    cleanup();
    if (!announced) console.error('The secure mobile tunnel stopped before creating a URL.');
    process.exitCode = code ?? 1;
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
