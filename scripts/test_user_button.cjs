const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testUserButton() {
  const outDir = path.join(__dirname, '..', '.chrome-ui-check');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9505',
    '--window-size=1440,900',
    'http://localhost:3001/'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://localhost:9505/json');
    const list = await listRes.json();
    const target = list.find(t => t.type === 'page');
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

    // Login as tom and acknowledge alerts
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
          }
        })()
      `,
      awaitPromise: true
    });
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 3500));

    // Measure button and check computed styles
    const buttonInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const b = document.querySelector('.header-account-btn') || document.querySelector('.head5');
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        const nameEl = b.querySelector('.head103');
        const imgEl = b.querySelector('.head10');
        const chevronEl = b.querySelector('.headChevronDownIcon');
        return {
          width: r.width,
          height: r.height,
          x: r.x,
          y: r.y,
          display: cs.display,
          flexDirection: cs.flexDirection,
          alignItems: cs.alignItems,
          whiteSpace: cs.whiteSpace,
          nameText: nameEl ? nameEl.innerText : null,
          nameRect: nameEl ? nameEl.getBoundingClientRect() : null,
          imgRect: imgEl ? imgEl.getBoundingClientRect() : null,
          chevronRect: chevronEl ? chevronEl.getBoundingClientRect() : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Button Computed Layout:', JSON.stringify(buttonInfo.result?.result?.value, null, 2));

    // Capture closed state
    const snapClosed = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(outDir, 'user_button_closed.png'), Buffer.from(snapClosed.result.data, 'base64'));
    console.log('Saved user_button_closed.png');

    // Click button using real mouse event
    const b = buttonInfo.result?.result?.value;
    const clickX = Math.round(b.x + b.width / 2);
    const clickY = Math.round(b.y + b.height / 2);
    console.log('Simulating mouse click at:', clickX, clickY);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: clickX, y: clickY, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: clickX, y: clickY, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 800));

    // Check dropdown menu state
    const menuState = await send('Runtime.evaluate', {
      expression: `(() => {
        const menu = document.querySelector('.head14');
        return {
          isOpen: !!menu,
          rect: menu ? menu.getBoundingClientRect() : null,
          hasSignOutBtn: menu ? !!menu.querySelector('.headLogoutActionBtn') : false
        };
      })()`,
      returnByValue: true
    });
    console.log('Menu State After Click:', JSON.stringify(menuState.result?.result?.value, null, 2));

    // Capture open state
    const snapOpen = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(outDir, 'user_button_open.png'), Buffer.from(snapOpen.result.data, 'base64'));
    console.log('Saved user_button_open.png');

    // Click again to close
    console.log('Clicking again to close...');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: clickX, y: clickY, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: clickX, y: clickY, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 800));

    const menuClosedState = await send('Runtime.evaluate', {
      expression: `(() => ({ isClosed: !document.querySelector('.head14') }))()`,
      returnByValue: true
    });
    console.log('Menu State After Second Click:', JSON.stringify(menuClosedState.result?.result?.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
}
testUserButton().catch(console.error);
