const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function debugDashboard() {
  const tempDir = path.join(require('os').tmpdir(), 'cdp_dash2_' + Date.now());
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9486',
    '--window-size=1440,900',
    '--user-data-dir=' + tempDir,
    'http://localhost:3001/'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://localhost:9486/json');
    const list = await listRes.json();
    const pageTarget = list.find(t => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let id = 1;
    const send = (method, params = {}) => new Promise(res => {
      const msgId = id++;
      const handler = evt => {
        const d = JSON.parse(evt.data);
        if (d.id === msgId) {
          ws.removeEventListener('message', handler);
          res(d);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // Set localStorage before navigating
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('blgf_current_user', 'usr-1785138104157');
        sessionStorage.setItem('blgf_current_user', 'usr-1785138104157');
        localStorage.setItem('blgf_target_alert_doc-1785138104157_2026-09-12T00:00:00.000Z', 'acknowledged');
      `
    });

    await send('Page.navigate', { url: 'http://localhost:3001/' });
    await new Promise(r => setTimeout(r, 3000));

    // Acknowledge all alerts by finding elements with text 'Acknowledge'
    const clickRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const els = Array.from(document.querySelectorAll('*')).filter(el => 
            el.children.length === 0 && (el.textContent.includes('Acknowledge') || el.textContent.includes('Close'))
          );
          els.forEach(el => el.click());
          return 'Clicked ' + els.length + ' elements';
        })()
      `,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result?.result?.value);
    await new Promise(r => setTimeout(r, 1000));

    // Capture screenshot of dashboard
    const snap = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/dashboard-clean.png', Buffer.from(snap.result.data, 'base64'));
    console.log('Saved dashboard-clean.png');
    ws.close();
  } finally {
    chrome.kill();
  }
}
debugDashboard().catch(console.error);
