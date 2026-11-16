// Chụp hai bảng style guide (#client, #admin) từ design/style-guide.html bằng Edge headless + CDP.
//   node chup-style-guide.mjs <thư mục ra>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const HTML = path.resolve(import.meta.dirname, '../../design/style-guide.html');
const prof = OUT + '/cdp-profile-sg';
const ps = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=9335', '--user-data-dir=' + prof, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9335/json')).json(); if (targets.find(t => t.type === 'page')) break; } catch { } await sleep(500); }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(HTML).href }); await sleep(7000);
for (const [sel, name] of [['#client', 'style-guide-client'], ['#admin', 'style-guide-admin']]) {
  const r = await send('Runtime.evaluate', { expression: `(()=>{const r=document.querySelector('${sel}').getBoundingClientRect();return JSON.stringify({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height})})()`, returnByValue: true });
  const b = JSON.parse(r.result.result.value);
  const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 1 } });
  fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(s.result.data, 'base64')); console.log('ok', name, Math.round(b.w), Math.round(b.h));
}
ws.close(); ps.kill(); process.exit(0);
