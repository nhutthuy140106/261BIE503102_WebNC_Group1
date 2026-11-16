// Chụp từng khung trong design/wireframes.html (mỗi <section class="wf" id="...">) thành PNG.
//   node chup-wireframes.mjs <thư mục ra>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const HTML = path.resolve(import.meta.dirname, '../../design/wireframes.html');
const prof = OUT + '/cdp-profile-wf';
const ps = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9336', '--user-data-dir=' + prof, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9336/json')).json(); if (targets.find(t => t.type === 'page')) break; } catch { } await sleep(500); }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(HTML).href }); await sleep(5000);
const ids = JSON.parse((await send('Runtime.evaluate', { expression: `JSON.stringify([...document.querySelectorAll('section.wf')].map(s=>s.id))`, returnByValue: true })).result.result.value);
for (const idv of ids) {
  const r = await send('Runtime.evaluate', { expression: `(()=>{const r=document.getElementById('${idv}').getBoundingClientRect();return JSON.stringify({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height})})()`, returnByValue: true });
  const b = JSON.parse(r.result.result.value);
  const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 1 } });
  fs.writeFileSync(OUT + '/wf-' + idv + '.png', Buffer.from(s.result.data, 'base64')); console.log('ok', idv, Math.round(b.w), Math.round(b.h));
}
ws.close(); ps.kill(); process.exit(0);
