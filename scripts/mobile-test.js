/* Headless mobile test at 375x812 via Chrome DevTools Protocol.
 * Usage: node scripts/mobile-test.js <file-url> [pageType]
 * pageType: index (default) | about | work | design | contact
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const url = process.argv[2];
if (!url) { console.error('usage: node scripts/mobile-test.js <url> [pageType]'); process.exit(1); }
const pageType = process.argv[3] || 'index';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getWsUrl() {
  const res = await fetch('http://localhost:9222/json/list');
  const tabs = await res.json();
  const page = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome://'));
  if (!page) throw new Error('no page target');
  return page.webSocketDebuggerUrl;
}

async function main() {
  const ws = new WebSocket(await getWsUrl());
  let id = 0;
  const pending = new Map();
  const events = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, (msg) => msg.error ? reject(new Error(method + ': ' + JSON.stringify(msg.error))) : resolve(msg.result));
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await new Promise(r => { ws.onopen = r; });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375, height: 812, deviceScaleFactor: 2, mobile: true
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url });
  await sleep(2500); // let scripts run

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('page eval error: ' + JSON.stringify(r.exceptionDetails.exception));
    return r.result.value;
  };

  const checks = {};
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass, detail });

  // ---- JS errors on the page? ----
  const jsErrors = events.filter(e => e.method === 'Runtime.exceptionThrown');
  check('no JS exceptions', jsErrors.length === 0, jsErrors.map(e => e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description || '')).join(' | ').slice(0, 300));

  // ---- hamburger exists & visible ----
  checks.ham = await evalJs(`(() => {
    const h = document.querySelector('.hamburger');
    if (!h) return { ok: false, why: 'no .hamburger in DOM' };
    const r = h.getBoundingClientRect();
    const cs = getComputedStyle(h);
    return { ok: r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
             why: cs.display === 'none' ? 'display:none' : 'zero rect', rect: { w: r.width, h: r.height, x: r.x, y: r.y } };
  })()`);
  check('hamburger button visible at 375px', checks.ham.ok, JSON.stringify(checks.ham));

  // ---- rail bar geometry ----
  checks.rail = await evalJs(`(() => {
    const rail = document.querySelector('.rail');
    if (!rail) return { ok: false };
    const r = rail.getBoundingClientRect();
    return { ok: r.width >= window.innerWidth - 2, h: Math.round(r.height), w: Math.round(r.width) };
  })()`);
  check('rail is full-width top bar', checks.rail.ok, 'rail ' + checks.rail.w + 'x' + checks.rail.h + ' vs viewport ' + await evalJs('window.innerWidth'));

  // ---- no horizontal overflow of the document ----
  checks.overflow = await evalJs(`(() => {
    const doc = document.documentElement;
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, overflow: doc.scrollWidth > doc.clientWidth + 1 };
  })()`);
  check('no horizontal page overflow', !checks.overflow.overflow, 'scrollWidth=' + checks.overflow.scrollW + ' clientWidth=' + checks.overflow.clientW);

  // ---- body text is not squeezed into a sliver (the original bug) ----
  const contentW = await evalJs(`(() => {
    const main = document.querySelector('main.page');
    if (!main) return -1;
    const r = main.querySelector('section, .container, article, div')?.getBoundingClientRect();
    return r ? Math.round(r.width) : -1;
  })()`);
  check('main content uses full width (>= 250px)', contentW >= 250, 'content width=' + contentW + 'px');

  // ---- tap the hamburger and verify the overlay opens ----
  await evalJs(`document.querySelector('.hamburger')?.click()`);
  await sleep(500);
  checks.overlayOpen = await evalJs(`(() => {
    const o = document.querySelector('.mobile-nav-overlay');
    if (!o) return { ok: false, why: 'no overlay' };
    const cs = getComputedStyle(o);
    const links = o.querySelectorAll('a.rail__link').length;
    const r = o.getBoundingClientRect();
    return { ok: cs.opacity === '1' && cs.pointerEvents !== 'none' && links === 6,
             why: 'opacity=' + cs.opacity + ' links=' + links, rect: Math.round(r.width) + 'x' + Math.round(r.height) };
  })()`);
  check('overlay opens with 6 nav links', checks.overlayOpen.ok, JSON.stringify(checks.overlayOpen));

  // ---- screenshot with menu open ----
  const shot1 = path.join(os.tmpdir(), 'mobile-' + pageType + '-menu-open.png');
  const s1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shot1, Buffer.from(s1.data, 'base64'));
  results.push({ name: 'screenshot(menu-open)', pass: true, detail: shot1 });

  // ---- tap a nav link: overlay must close ----
  await evalJs(`document.querySelector('.mobile-nav-overlay a.rail__link')?.click()`);
  await sleep(400);
  checks.overlayClosed = await evalJs(`(() => {
    const o = document.querySelector('.mobile-nav-overlay');
    return o ? getComputedStyle(o).opacity === '0' : false;
  })()`);
  check('overlay closes after tapping a link', checks.overlayClosed, '');

  // ---- screenshot closed state ----
  await evalJs(`window.scrollTo(0, 0)`);
  await sleep(300);
  const shot2 = path.join(os.tmpdir(), 'mobile-' + pageType + '-closed.png');
  const s2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shot2, Buffer.from(s2.data, 'base64'));
  results.push({ name: 'screenshot(closed)', pass: true, detail: shot2 });

  // ---- page-specific checks ----
  if (pageType === 'index') {
    const wg = await evalJs(`(() => {
      const g = document.querySelector('.work-grid');
      if (!g) return { n: 0 };
      return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, n: 1 };
    })()`);
    check('work-grid is 1 column on mobile', wg.n > 0 && wg.cols === 1, 'cols=' + wg.cols);
  }

  console.log('\n=== ' + pageType.toUpperCase() + ' @ 375x812 ===');
  let failed = 0;
  for (const r of results) {
    console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
    if (!r.pass) failed++;
  }
  console.log(failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED');
  ws.close();
  process.exit(failed === 0 ? 0 : 2);
}

main().catch(e => { console.error('TEST ERROR:', e.message); process.exit(3); });
