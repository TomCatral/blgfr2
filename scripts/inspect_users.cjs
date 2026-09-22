const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const tempDir = path.join(os.tmpdir(), 'cdp_inspect_' + Date.now());
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9495',
  '--window-size=1440,900',
  '--user-data-dir=' + tempDir,
  'http://localhost:4200/'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://localhost:9495/json');
    const list = await listRes.json();
    const target = list.find(t => t.type === 'page' && t.url.includes('4200')) || list[0];
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
    await send('Runtime.enable');
    
    // Login
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
          }
        })()
      `,
      awaitPromise: true
    });
    
    await send('Page.enable');
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 3500));
    
    // Click users menu
    await send('Runtime.evaluate', {
      expression: `
        const btns = Array.from(document.querySelectorAll('.blgf-sidebar-item'));
        const btn = btns.find(b => (b.getAttribute('aria-label') || b.textContent || '').toLowerCase().includes('user'));
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));
    
    const info = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const container = document.querySelector('.ua-table-responsive');
          const table = document.querySelector('.ua-table');
          return {
            containerWidth: container?.clientWidth,
            containerScrollWidth: container?.scrollWidth,
            tableWidth: table?.offsetWidth,
            hasHorizontalScroll: container?.scrollWidth > container?.clientWidth
          };
        })()
      `,
      returnByValue: true
    });
    console.log('CONTAINER STATUS:', JSON.stringify(info.result?.result?.value, null, 2));
    ws.close();
  } catch (e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}, 2500);
