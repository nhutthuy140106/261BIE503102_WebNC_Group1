// Chụp ảnh khu Quản trị (bản tối) bằng Edge headless + CDP. Cần: server cổng 3000, ng serve cổng 4200, dữ liệu mẫu admin đã seed.
//   node chup-admin-cdp.mjs <thư mục ra> <mật khẩu admin>
// Đăng nhập thật ở /admin/login?mock=0 rồi bấm link trong thanh bên (tải lại cả trang sẽ mất phiên FE).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = process.argv[2]; const PASS = process.argv[3];
const prof = OUT + '/cdp-profile'; fs.mkdirSync(OUT, { recursive: true });
const ps = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9334', '--user-data-dir=' + prof, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets; for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9334/json')).json(); if (targets.find(t => t.type === 'page')) break; } catch { } await sleep(500); }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name, h = 900) => {
  // chiều cao theo nội dung thật của trang (tối thiểu 700, tối đa h), khỏi thừa nền trống phía dưới
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1600, deviceScaleFactor: 1, mobile: false });
  await sleep(900);
  const need = await ev(`Math.ceil((document.querySelector('.content')||document.body).getBoundingClientRect().bottom + 40)`);
  h = Math.max(700, Math.min(h, need || h));
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(1000);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(r.result.data, 'base64')); console.log('ok', name);
};
// bấm link trong thanh bên theo đường dẫn
const go = async (href, wait = 3500) => { await ev(`(document.querySelector('.side a[href="${href}"]')||{click(){}}).click()`); await sleep(wait); };
// nhập vào ô theo cách Angular nhận (gán value + bắn input)
const type = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const base = 'http://localhost:4200';
await send('Page.navigate', { url: base + '/admin/login?mock=0' }); await sleep(5000);
await type('#alP', '0900000099'); await type('#alW', PASS); await sleep(600);
await shot('00-dang-nhap');
await ev(`document.querySelector('button.go').click()`); await sleep(5000);
console.log('url sau đăng nhập:', await ev('location.pathname'));

if (process.env.ONLY === 'small') {   // cửa sổ nhỏ: danh sách thả xuống không bị cắt
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 520, deviceScaleFactor: 1, mobile: false });
  await go('/admin/orders'); await sleep(1500);
  await ev(`(document.querySelectorAll('th app-admin-select .trigger')[0]||{click(){}}).click()`); await sleep(500);
  await ev(`([...document.querySelectorAll('.menu li')].find(l=>l.textContent.includes('Chờ xác nhận'))||{click(){}}).click()`); await sleep(1800);
  for (const [i, n] of [[1, 's-trangthai'], [2, 's-ngay']]) {
    await ev(`(document.querySelectorAll('th app-admin-select .trigger')[${i}]||{click(){}}).click()`); await sleep(700);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(OUT + '/' + n + '.png', Buffer.from(r.result.data, 'base64')); console.log('ok', n);
    await ev(`document.body.click()`); await sleep(300);
  }
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'ruling') {
  await go('/admin/reports'); await sleep(1500);
  await ev(`([...document.querySelectorAll('.tabs button')].find(b=>b.textContent.includes('Đang xem xét'))||{click(){}}).click()`); await sleep(1200);
  await ev(`(document.querySelector('a.solid-danger')||{click(){}}).click()`); await sleep(3500);
  console.log('url:', await ev('location.pathname'));
  await shot('ruling', 1300);
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'stuck') {   // mở danh sách rồi rời trang: không được còn sót danh sách trên màn hình
  await go('/admin/users'); await sleep(1500);
  await ev(`(document.querySelector('app-admin-select .trigger')||{click(){}}).click()`); await sleep(500);
  console.log('menu khi mở:', await ev(`document.querySelectorAll('ul.menu').length`));
  await go('/admin/reports'); await sleep(1500);
  console.log('menu sau khi rời trang:', await ev(`document.querySelectorAll('ul.menu').length`));
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'ordd') {
  await go('/admin/orders'); await sleep(1500);
  await ev(`(document.querySelector('tbody tr.click, tbody tr a')||{click(){}}).click()`); await sleep(3500); await shot('o-chi-tiet', 1500);
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'xu') {
  await go('/admin/users'); await sleep(1500);
  await type('input[type=search]', 'Cô Lan'); await sleep(2500);
  await ev(`(document.querySelector('tbody tr a')||{click(){}}).click()`); await sleep(3500); await shot('u-xu', 1500);
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'verif') {
  await go('/admin/verifications'); await sleep(2500); await shot('v-xac-minh', 1400);
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'reports') {   // chỉ chụp trang Báo cáo (kiểm bố cục thẻ)
  await go('/admin/reports'); await shot('r-moi', 1300);
  await ev(`([...document.querySelectorAll('.tabs button')].find(b=>b.textContent.includes('Đang xem xét'))||{click(){}}).click()`); await sleep(1200);
  await ev(`(document.querySelector('.ctxbtn')||{click(){}}).click()`); await sleep(1800); await shot('r-dang-xem-xet', 1500);
  await ev(`([...document.querySelectorAll('.tabs button')].find(b=>b.textContent.includes('Đã xử lý'))||{click(){}}).click()`); await sleep(1200); await shot('r-da-xu-ly', 1300);
  await ev(`([...document.querySelectorAll('.tabs button')].find(b=>b.textContent.includes('Từ chối'))||{click(){}}).click()`); await sleep(1200); await shot('r-tu-choi', 900);
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'debug') {
  await go('/admin/orders'); await sleep(2500);
  console.log(await ev(`(()=>{const ths=[...document.querySelectorAll('thead th')];const out=[];ths.forEach((t,i)=>{ths.forEach(o=>o.style.display=(o===t?'table-cell':'none'));out.push(Math.round(document.querySelector('thead tr').getBoundingClientRect().height))});ths.forEach(o=>o.style.display='');return JSON.stringify(out)+' now='+Math.round(document.querySelector('thead tr').getBoundingClientRect().height)})()`));
  ws.close(); ps.kill(); process.exit(0);
}
if (process.env.ONLY === 'tables') {   // kiểm cột bảng cố định khi lật trang
  await go('/admin/orders'); await shot('t-don-1', 1000);
  await ev(`(document.querySelectorAll('th app-admin-select .trigger')[1]||{click(){}}).click()`); await sleep(800); await shot('t-don-menu', 1000);
  await ev(`([...document.querySelectorAll('th app-admin-select .menu li')].find(l=>l.textContent.includes('Đang báo vấn đề'))||{click(){}}).click()`); await sleep(1800); await shot('t-don-loc', 1000);
  await ev(`(document.querySelectorAll('th app-admin-select .trigger')[2]||{click(){}}).click()`); await sleep(500);
  await ev(`([...document.querySelectorAll('th app-admin-select .menu li')].find(l=>l.textContent.includes('Hôm nay'))||{click(){}}).click()`); await sleep(1800); await shot('t-don-rong', 1000);
  await go('/admin/orders');
  await ev(`([...document.querySelectorAll('.pager .btn')].find(b=>b.textContent.includes('Sau'))||{click(){}}).click()`); await sleep(1800); await shot('t-don-2', 1000);
  await go('/admin/users'); await shot('t-user-1', 1000);
  await go('/admin/audit'); await shot('t-audit', 1000);
  ws.close(); ps.kill(); process.exit(0);
}
await shot('01-tong-quan', 1000);
await go('/admin/verifications'); await shot('02-xac-minh', 1000);
await go('/admin/reports'); await shot('03-bao-cao', 1100);
// mở "Xem bối cảnh" của báo cáo đầu tiên
await ev(`(document.querySelector('.ctxbtn')||{click(){}}).click()`); await sleep(2000); await shot('03b-bao-cao-boi-canh', 1100);
await go('/admin/orders'); await shot('04-don', 1000);
await ev(`(document.querySelector('tbody tr.click, tbody tr a')||{click(){}}).click()`); await sleep(3500); await shot('05-chi-tiet-don', 1300);
await go('/admin/users'); await shot('06-nguoi-dung', 1000);
await type('input[type=search]', 'Cô Lan'); await sleep(2500);
await ev(`(document.querySelector('tbody tr a')||{click(){}}).click()`); await sleep(3500); await shot('07-ho-so-nguoi-dung', 1300);
await go('/admin/posts'); await shot('08-bai-dang', 1000);
await ev(`(document.querySelector('td.act .btn.danger')||{click(){}}).click()`); await sleep(1500); await shot('08b-hop-xac-nhan-an-bai', 1000);
await ev(`(document.querySelector('.dlg button.btn:not(.danger), [role=dialog] button.btn')||{click(){}}).click()`); await sleep(800);
await go('/admin/support');
await ev(`(document.querySelector('button.it')||{click(){}}).click()`); await sleep(1500);
await shot('09-ho-tro', 1000);
await go('/admin/vouchers'); await shot('10-voucher', 1000);
await ev(`([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Tạo voucher'))||{click(){}}).click()`); await sleep(1500); await shot('10b-tao-voucher', 1000);
await ev(`([...document.querySelectorAll('.vdlg button, [role=dialog] button')].find(b=>b.textContent.trim()==='Hủy'||b.textContent.trim()==='Đóng')||{click(){}}).click()`); await sleep(800);
await go('/admin/announcements'); await shot('11-thong-bao', 1000);
await go('/admin/settings'); await shot('12-cai-dat', 1100);
await go('/admin/audit'); await shot('13-nhat-ky', 1000);
ws.close(); ps.kill();
process.exit(0);
