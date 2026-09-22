const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testDashboardScreenshot() {
  const tempDir = path.join(require('os').tmpdir(), 'cdp_dash_' + Date.now());
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9498',
    '--window-size=1440,900',
    '--user-data-dir=' + tempDir,
    'http://localhost:3001/'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://localhost:9498/json');
    const list = await listRes.json();
    const target = list.find(t => t.type === 'page' && t.url.includes('3001')) || list.find(t => t.type === 'page');
    console.log('Target found:', target.title, target.url);
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
    const loginRes = await send('Runtime.evaluate', {
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
            return 'LOGIN SUCCESS: ' + data.user.fullName;
          }
          return 'LOGIN FAILED: ' + JSON.stringify(data);
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Login result:', loginRes.result?.result?.value);

    await send('Page.reload');
    await new Promise(r => setTimeout(r, 3500));

    // Dismiss any alerts
    await send('Runtime.evaluate', {
      expression: `
        document.querySelector('.deadline-btn-ack')?.click();
        document.querySelector('.deadline-close-btn')?.click();
        document.querySelectorAll('button').forEach(b => {
          if (b.textContent.includes('Close') || b.textContent.includes('Acknowledge')) b.click();
        });
      `
    });
    await new Promise(r => setTimeout(r, 800));

    const snap = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/dashboard-verified.png', Buffer.from(snap.result.data, 'base64'));
    console.log('Saved dashboard-verified.png');

    await send('Runtime.evaluate', { expression: `document.querySelector('.dashboard-transactions')?.scrollIntoView({ block: 'start' });` });
    await new Promise(r => setTimeout(r, 600));
    const snapTable = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/dashboard-table.png', Buffer.from(snapTable.result.data, 'base64'));
    console.log('Saved dashboard-table.png');
    ws.close();
  } finally {
    chrome.kill();
  }
}
testDashboardScreenshot().catch(console.error);
