/* Find elements wider than the viewport. Usage: node scripts/overflow-probe.js <url> */
const url = process.argv[2];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getWsUrl() {
  const res = await fetch('http://localhost:9222/json/list');
  const tabs = await res.json();
  const page = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome://'));
  return page.webSocketDebuggerUrl;
}

async function main() {
  const ws = new WebSocket(await getWsUrl());
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, (msg) => msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result));
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await new Promise(r => { ws.onopen = r; });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url });
  await sleep(2000);

  const r = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && (rect.right > vw + 1 || rect.left < -1)) {
          const cs = getComputedStyle(el);
          bad.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 60),
            w: Math.round(rect.width), left: Math.round(rect.left), right: Math.round(rect.right),
            pos: cs.position, ws: cs.whiteSpace, disp: cs.display
          });
        }
      });
      return { vw, docScrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 25), total: bad.length };
    })()`
  });
  const out = r.result.value;
  console.log('viewport:', out.vw, 'docScrollWidth:', out.docScrollW, 'offenders:', out.total);
  out.bad.forEach(b => console.log(`${b.tag}.${b.cls}  w=${b.w} l=${b.left} r=${b.right} pos=${b.pos} ws=${b.ws} disp=${b.disp}`));
  ws.close();
  process.exit(0);
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
