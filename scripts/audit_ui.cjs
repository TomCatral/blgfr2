const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function audit() {
  const tempDir = path.join(require('os').tmpdir(), 'cdp_audit_' + Date.now());
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9445',
    '--window-size=1440,900',
    '--user-data-dir=' + tempDir,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://localhost:9445/json');
    const list = await listRes.json();
    const target = list.find(p => p.type === 'page') || list[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('BROWSER CONSOLE:', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.log('BROWSER EXCEPTION:', data.params.exceptionDetails?.text, data.params.exceptionDetails?.exception?.description);
      }
      if (callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };

    const send = (method, params = {}) => new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    await new Promise(r => ws.onopen = r);

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // 1. Navigate to 4300
    await send('Page.navigate', { url: 'http://localhost:4300/' });
    await new Promise(r => setTimeout(r, 3000));

    // Read DB to get all documents and acknowledge all overdue alerts
    const db = JSON.parse(fs.readFileSync('backend/data/blgf_doctrack_db.json', 'utf8'));
    const ackStatements = (db.documents || []).filter(d => d.targetCompletionDate).map(d => 
      `localStorage.setItem('blgf_target_alert_${d.id}_${d.targetCompletionDate}', 'acknowledged');`
    ).join(' ');

    // 2. Set user in localStorage and suppress any popups
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('blgf_current_user', 'usr-1785138104157');
        localStorage.setItem('blgf_dismissed_notifications_usr-1785138104157', '["notif-urgent-1", "notif-1", "notif-2"]');
        ${ackStatements}
      `
    });
    // Set all target alerts acknowledged for any document in db
    await send('Runtime.evaluate', {
      expression: `
        fetch('/api/documents').then(r => r.json()).then(docs => {
          docs.forEach(d => {
            if (d.targetCompletionDate) {
              localStorage.setItem('blgf_target_alert_' + d.id + '_' + d.targetCompletionDate, 'acknowledged');
            }
          });
        });
      `
    });
    await new Promise(r => setTimeout(r, 1000));
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 3500));

    // Close any popup (both reminder and deadline)
    await send('Runtime.evaluate', {
      expression: `
        document.querySelector('.deadline-btn-ack')?.click();
        document.querySelector('.deadline-close-btn')?.click();
        document.querySelectorAll('.appCloseRoutingActionBtn2, button').forEach(b => {
          if (b.textContent.includes('Close') || b.textContent.includes('Acknowledge')) b.click();
        });
      `
    });
    await new Promise(r => setTimeout(r, 1200));

    await new Promise(r => setTimeout(r, 1200));

    // Capture Full Dashboard Light
    const snap1 = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/audit-dashboard.png', Buffer.from(snap1.result.data, 'base64'));
    console.log('Saved audit-dashboard.png');

    // Scroll to Recent Document Activity Table
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.app-content')?.scrollTo({ top: 600, behavior: 'instant' });`
    });
    await new Promise(r => setTimeout(r, 600));
    const snapTable = await send('Page.captureScreenshot');
    fs.writeFileSync('.chrome-ui-check/audit-dashboard-table.png', Buffer.from(snapTable.result.data, 'base64'));
    console.log('Saved audit-dashboard-table.png');

    // Scroll back to top
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.app-content')?.scrollTo({ top: 0, behavior: 'instant' });`
    });
    await new Promise(r => setTimeout(r, 300));

    // Toggle Dark Mode
    await send('Runtime.evaluate', {
      expression: `document.documentElement.classList.add('dark'); document.body.classList.add('dark');`
    });
    await new Promise(r => setTimeout(r, 500));
    const snapDark = await send('Page.captureScreenshot', { captureBeyondViewport: true });
    fs.writeFileSync('.chrome-ui-check/audit-dashboard-dark.png', Buffer.from(snapDark.result.data, 'base64'));
    console.log('Saved audit-dashboard-dark.png');

    // Toggle back to Light Mode
    await send('Runtime.evaluate', {
      expression: `document.documentElement.classList.remove('dark'); document.body.classList.remove('dark');`
    });
    await new Promise(r => setTimeout(r, 300));

    // Click Routing Slip from sidebar
    await send('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('app-sidebar .blgf-sidebar-item, app-sidebar button, app-sidebar ion-button')).find(el => el.textContent.includes('Routing Slip'));
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));
    const snap2 = await send('Page.captureScreenshot', { captureBeyondViewport: true });
    fs.writeFileSync('.chrome-ui-check/audit-routing-slip.png', Buffer.from(snap2.result.data, 'base64'));
    console.log('Saved audit-routing-slip.png');

    // Click Incoming Documents from sidebar
    await send('Runtime.evaluate', {
      expression: `
        try {
          const app = window.ng?.getComponent(document.querySelector('app-root'));
          if (app) {
            app.navigateTo('incoming');
            window.ng?.applyChanges(app);
          } else {
            const btn = Array.from(document.querySelectorAll('app-sidebar button, app-sidebar .blgf-sidebar-item')).find(el => el.textContent.includes('Incoming'));
            if (btn) btn.click();
          }
        } catch (e) {
          console.error('Nav error:', e);
        }
      `
    });
    await new Promise(r => setTimeout(r, 2000));
    const snap3 = await send('Page.captureScreenshot', { captureBeyondViewport: true });
    fs.writeFileSync('.chrome-ui-check/audit-incoming.png', Buffer.from(snap3.result.data, 'base64'));
    console.log('Saved audit-incoming.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}
audit().catch(console.error);
