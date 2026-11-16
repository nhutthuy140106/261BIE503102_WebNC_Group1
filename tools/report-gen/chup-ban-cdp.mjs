// Chụp ảnh qua Edge headless + CDP. Đặt sessionStorage để vào chế độ đã đăng nhập (dữ liệu mẫu).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const EDGE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT=process.argv[2]; const shots=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const prof=OUT+'/cdp-profile'; fs.mkdirSync(OUT,{recursive:true});
const ps=spawn(EDGE,['--headless=new','--disable-gpu','--hide-scrollbars','--remote-debugging-port=9333','--user-data-dir='+prof,'--window-size=1440,900','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let targets; for(let i=0;i<40;i++){ try{ targets=await (await fetch('http://127.0.0.1:9333/json')).json(); if(targets.find(t=>t.type==='page')) break;}catch{} await sleep(500); }
const page=targets.find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m); pend.delete(m.id);}};
const send=(method,params={})=>new Promise(r=>{const i=++id; pend.set(i,r); ws.send(JSON.stringify({id:i,method,params}));});
const USER={_id:'000000000000000000000002',username:'0900000002',fullName:'Bếp Cô Lan',block:'Block B',avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces&q=70',xu:120,role:'user'};
await send('Page.enable'); await send('Runtime.enable');
const base='http://localhost:4200';
await send('Page.navigate',{url:base+'/welcome?mock=1'}); await sleep(4000);
await send('Runtime.evaluate',{expression:`sessionStorage.setItem('antgo_mock_user', ${JSON.stringify(JSON.stringify(USER))}); localStorage.setItem('antgo_mock_seller_verify_000000000000000000000002', JSON.stringify({status:'approved',submittedAt:new Date().toISOString(),reviewedAt:new Date().toISOString()}));`});
for(const s of shots){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:s.h||900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base+s.url}); await sleep(s.wait||6000);
  if(s.js){ await send('Runtime.evaluate',{expression:s.js,awaitPromise:true}); await sleep(s.wait2||2500); }
  const r=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(OUT+'/'+s.name+'.png',Buffer.from(r.result.data,'base64')); console.log('ok',s.name);
}
ws.close(); ps.kill();
process.exit(0);
