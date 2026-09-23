const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function captureReportsAndLogs() {
  const tempDir = path.join(require('os').tmpdir(), 'cdp_rep_log_' + Date.now());
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9497',
    '--window-size=1440,900',
    '--user-data-dir=' + tempDir,
    'http://localhost:3001/'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://localhost:9497/json');
    const list = await listRes.json();
    const target = list.find(t => t.type === 'page' && t.url.includes('3001')) || list.find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();
    ws.onmessage = evt => {
      const data = JSON.parse(evt.data);
      if (callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };
    const send = (method, params = {}) => new Promise(res => {
      const msgId = id++;
      callbacks.set(msgId, res);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // Login as tom
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const res = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'tom', password: 'K@shmir0611' })
          });
          const data = await res.json();
          if (data.user) {
            localStorage.setItem('blgf_current_user', data.user.id);
            sessionStorage.setItem('blgf_current_user', data.user.id);
            localStorage.setItem('blgf_dismissed_notifications_' + data.user.id, '["notif-urgent-1", "notif-1", "notif-2"]');
            const docsRes = await fetch('http://localhost:3001/api/documents', {
              headers: { 'X-User-Id': data.user.id }
            });
            const docs = await docsRes.json();
            docs.forEach(d => {
              if (d.targetCompletionDate) {
                localStorage.setItem('blgf_target_alert_' + d.id + '_' + d.targetCompletionDate, 'acknowledged');
              }
            });
            return 'LOGIN OK';
          }
          return 'FAIL';
        })()
      `,
      awaitPromise: true
    });

    await send('Page.reload');
    await new Promise(r => setTimeout(r, 3500));

    // Dismiss notifications
    await send('Runtime.evaluate', {
      expression: `
        document.querySelectorAll('button').forEach(b => {
          if (b.textContent.includes('Close') || b.textContent.includes('Acknowledge')) b.click();
        });
      `
    });
    await new Promise(r => setTimeout(r, 500));

    // 1. Navigate to Incoming Report
    console.log('Navigating to Incoming Report...');
    await send('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Incoming Report'));
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const repSnap = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/current-report-style.png', Buffer.from(repSnap.result.data, 'base64'));
    console.log('Saved current-report-style.png');

    // 2. Navigate to Audit Logs
    console.log('Navigating to Audit Logs...');
    await send('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Audit Logs'));
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const auditSnap = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/current-audit-style.png', Buffer.from(auditSnap.result.data, 'base64'));
    console.log('Saved current-audit-style.png');

    // 3. Open user menu in header to see logout button
    console.log('Opening header user menu...');
    await send('Runtime.evaluate', {
      expression: `
        const userBtn = document.querySelector('.head5');
        if (userBtn) userBtn.click();
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const menuSnap = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/current-user-menu.png', Buffer.from(menuSnap.result.data, 'base64'));
    console.log('Saved current-user-menu.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}
captureReportsAndLogs().catch(console.error);
