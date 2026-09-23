const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testAll() {
  const tempDir = path.join(require('os').tmpdir(), 'cdp_test_' + Date.now());
  const outDir = path.join(__dirname, '..', '.chrome-ui-check');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9498',
    '--window-size=1440,900',
    '--user-data-dir=' + tempDir,
    'http://localhost:3001/'
  ]);

  await new Promise(r => setTimeout(r, 2500));
  try {
    const listRes = await fetch('http://localhost:9498/json');
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

    // Step 1: Login
    console.log('Logging in...');
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

    // Dismiss any modal/dialog
    await send('Runtime.evaluate', {
      expression: `
        document.querySelectorAll('button').forEach(b => {
          if (b.textContent.includes('Close') || b.textContent.includes('Acknowledge')) b.click();
        });
      `
    });
    await new Promise(r => setTimeout(r, 500));

    // Helper to click sidebar item by text
    const clickSidebar = async (label) => {
      const res = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const items = Array.from(document.querySelectorAll('.blgf-sidebar-item'));
            const match = items.find(el => el.textContent.toLowerCase().includes('${label.toLowerCase()}'));
            if (match) {
              match.click();
              return true;
            }
            return false;
          })()
        `
      });
      return res.result.value;
    };

    // 1. Capture Incoming Report
    console.log('Navigating to Incoming Report...');
    const repFound = await clickSidebar('Incoming Report');
    console.log('Incoming Report clicked:', repFound);
    await new Promise(r => setTimeout(r, 1000));
    const repSnap = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(outDir, '01_incoming_report.png'), Buffer.from(repSnap.result.data, 'base64'));
    console.log('Saved 01_incoming_report.png');

    // 2. Capture Detailed Audit Logs
    console.log('Navigating to Detailed Audit Logs...');
    const auditFound = await clickSidebar('Audit Logs');
    console.log('Audit Logs clicked:', auditFound);
    await new Promise(r => setTimeout(r, 1000));
    const auditSnap = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(outDir, '02_audit_logs.png'), Buffer.from(auditSnap.result.data, 'base64'));
    console.log('Saved 02_audit_logs.png');

    // 3. Capture Outgoing Envelope Logs
    console.log('Navigating to Envelope Dispatch Logs...');
    const envFound = await clickSidebar('Envelope Dispatch');
    console.log('Envelope Logs clicked:', envFound);
    await new Promise(r => setTimeout(r, 1000));
    const envSnap = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(outDir, '03_envelope_logs.png'), Buffer.from(envSnap.result.data, 'base64'));
    console.log('Saved 03_envelope_logs.png');

    // 4. Open User Account Menu in Header
    console.log('Opening Header User Menu...');
    const openMenuRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('.head5') || document.querySelector('.header-account button');
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `
    });
    console.log('User menu button clicked:', openMenuRes.result.value);
    await new Promise(r => setTimeout(r, 800));
    const menuSnap = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(outDir, '04_user_menu_open.png'), Buffer.from(menuSnap.result.data, 'base64'));
    console.log('Saved 04_user_menu_open.png');

    // 5. Click the Sign Out button
    console.log('Clicking Sign Out button...');
    const logoutRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const logoutBtn = document.querySelector('.headLogoutActionBtn');
          if (logoutBtn) {
            logoutBtn.click();
            return 'CLICKED_LOGOUT';
          }
          return 'LOGOUT_BTN_NOT_FOUND';
        })()
      `
    });
    console.log('Logout button click result:', logoutRes.result.value);
    await new Promise(r => setTimeout(r, 1200));

    // 6. Verify if on login screen
    const verifyLogout = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const hasLogin = !!document.querySelector('app-login') || !!document.querySelector('input[type="password"]');
          const hasUserInStorage = !!localStorage.getItem('blgf_current_user');
          return { hasLogin, hasUserInStorage };
        })()
      `
    });
    console.log('Logout verification:', verifyLogout.result.value);

    const afterLogoutSnap = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(outDir, '05_after_logout_screen.png'), Buffer.from(afterLogoutSnap.result.data, 'base64'));
    console.log('Saved 05_after_logout_screen.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

testAll().catch(console.error);
