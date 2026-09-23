const { execSync } = require('child_process');

try {
  if (process.platform === 'win32') {
    const stdout = execSync('netstat -ano | findstr :3001', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid) && pid !== '0' && pid !== String(process.pid)) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {}
      }
    }
  }
} catch {
  // Port is free or command exited with non-zero (findstr found nothing); safe to continue
}
