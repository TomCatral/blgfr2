const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function auditAllPages() {
  const outDir = path.resolve('.chrome-ui-check/all_pages');
  fs.mkdirSync(outDir, { recursive: true });

  const tempDir = path.join(require('os').tmpdir(), 'cdp_audit_all_' + Date.now());
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-gpu-compositing',
    '--remote-debugging-port=9465',
    '--window-size=1440,900',
    '--user-data-dir=' + tempDir,
    'http://localhost:3001/'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://localhost:9465/json');
    const list = await listRes.json();
    const target = list.find(t => t.type === 'page' && t.url.includes('3001')) || list.find(t => t.type === 'page');
    console.log('Target found:', target.title, target.url);
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = evt => {
      const data = JSON.parse(evt.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        const text = data.params.args.map(a => a.value || a.description).join(' ');
        if (data.params.type === 'error') {
          console.error('BROWSER ERROR:', text);
        }
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('BROWSER EXCEPTION:', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
      }
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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

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
    await new Promise(r => setTimeout(r, 4000));
    await new Promise(r => setTimeout(r, 3500));

    // Dismiss any alerts/modals
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

    const views = [
      { id: 'dashboard', label: 'Dashboard', name: '01-dashboard' },
      { id: 'incoming', label: 'Incoming Documents', name: '02-incoming' },
      { id: 'outgoing', label: 'Outgoing Documents', name: '03-outgoing' },
      { id: 'routing-followup', label: 'Routing Follow-up', name: '04-routing-followup' },
      { id: 'slip', label: 'Document Routing Slip', name: '05-routing-slip' },
      { id: 'envelope', label: 'Outgoing Envelope', name: '06-outgoing-envelope' },
      { id: 'employees', label: 'Office Directory', name: '07-office-directory' },
      { id: 'qr', label: 'QR Code Generator', name: '08-qr-code-generator' },
      { id: 'incoming-report', label: 'Incoming Report', name: '09-incoming-report' },
      { id: 'outgoing-report', label: 'Outgoing Report', name: '10-outgoing-report' },
      { id: 'envelope-report', label: 'Envelope Report', name: '11-envelope-report' },
      { id: 'users', label: 'User Accounts', name: '12-user-accounts' },
      { id: 'audit', label: 'Audit Logs', name: '13-audit-logs' },
      { id: 'settings', label: 'Settings', name: '14-user-settings' }
    ];

    for (const v of views) {
      const clickRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            if ('${v.id}' === 'settings') {
              const footerBtn = document.querySelector('.blgf-sidebar-footer');
              if (footerBtn) {
                footerBtn.click();
                return 'Clicked sidebar footer settings';
              }
            }
            const buttons = Array.from(document.querySelectorAll('.blgf-sidebar-item'));
            const btn = buttons.find(b => {
              const aria = b.getAttribute('aria-label') || '';
              const txt = b.textContent || '';
              return aria.toLowerCase().includes('${v.label.toLowerCase()}') || txt.toLowerCase().includes('${v.label.toLowerCase()}');
            });
            if (btn) {
              btn.click();
              return 'Clicked: ' + (btn.getAttribute('aria-label') || btn.textContent.trim());
            }
            return 'BUTTON NOT FOUND for: ' + '${v.label}';
          })()
        `,
        returnByValue: true
      });
      console.log(`Navigating to ${v.name}:`, clickRes.result.result.value);
      await new Promise(r => setTimeout(r, 1200));

      const snap = await send('Page.captureScreenshot');
      const buf = Buffer.from(snap.result.data, 'base64');
      fs.writeFileSync(path.join(outDir, `${v.name}.png`), buf);
      console.log(`Captured: ${v.name} (${buf.length} bytes)`);
    }

    ws.close();
  } finally {
    chrome.kill();
  }
}

auditAllPages().catch(console.error);
