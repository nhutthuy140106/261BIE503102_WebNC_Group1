// Đánh giá OFFLINE tìm kiếm trên dữ liệu seed: gõ không dấu, gõ sai ký tự, gõ lặp kiểu Telex, từ đồng nghĩa.
// Chạy: npm run eval:search   (MongoDB trong bộ nhớ, không đụng DB thật)
// Mỗi truy vấn đi qua đúng hàm listPosts của API: tìm thường trước, không ra gì mới tìm gần đúng.
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = process.env.SEED_PASSWORD || 'Eval@2026';
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const STOPWORDS = new Set(['theo', 'cho', 'nha', 'giao', 'tan', 'cua', 'tai', 'gio', 'ngay', 'moi', 'dat', 'truoc']);

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('../src/seeds/seed')();
  const Post = require('../src/modules/shared/post.model');
  const { listPosts } = require('../src/modules/buyer/catalog/catalog.service');
  const posts = await Post.find({ status: 'open' });
  const N = posts.length;
  const ask = async (q) => {
    const r = await listPosts({ q, page: 1, limit: 10 });
    return { ids: r.items.map((x) => String(x._id)), smart: !!(r.meta && r.meta.smart), titles: r.items.map((x) => x.title) };
  };

  // Từ khóa thật của bài: hai từ đầu của tên (>=4 chữ, không phải từ phổ thông)
  const keyOf = (p) => strip(p.title).split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  const cases = posts.map((p) => ({ p, keys: keyOf(p) })).filter((c) => c.keys.length >= 1);

  // A. không dấu (đúng chữ, chỉ bỏ dấu)
  let aHit = 0; let aTot = 0;
  for (const { p, keys } of cases) {
    const q = keys.slice(0, 2).join(' ');
    const r = await ask(q); aTot++;
    if (r.ids.includes(String(p._id))) aHit++;
  }

  // B. sai ký tự: xóa / thay một chữ, hoặc gõ lặp một nguyên âm (kiểu Telex "coom"), trên từ dài nhất
  const mutate = (w, kind, i) => {
    const pos = 1 + (i % (w.length - 2));
    if (kind === 'xoa') return w.slice(0, pos) + w.slice(pos + 1);
    if (kind === 'thay') return w.slice(0, pos) + (w[pos] === 'x' ? 'z' : 'x') + w.slice(pos + 1);
    const v = [...w].findIndex((c) => 'aeiou'.includes(c)); const at = v < 0 ? pos : v;
    return w.slice(0, at + 1) + w[at] + w.slice(at + 1);
  };
  const B = { xoa: { n: 0, smart: 0, h1: 0, h3: 0 }, thay: { n: 0, smart: 0, h1: 0, h3: 0 }, lap: { n: 0, smart: 0, h1: 0, h3: 0 } };
  let i = 0;
  for (const { p, keys } of cases) {
    const w = [...keys].sort((a, b) => b.length - a.length)[0];
    if (w.length < 5) continue; i++;
    for (const kind of Object.keys(B)) {
      const q = mutate(w, kind, i);
      const r = await ask(q); const b = B[kind]; b.n++;
      if (r.smart) b.smart++;
      const at = r.ids.indexOf(String(p._id));
      // tính "đúng" nếu bài gốc, hoặc bài cùng từ khóa, nằm trong top
      const okAt = (k) => r.titles.slice(0, k).some((t) => strip(t).includes(w));
      if (okAt(1)) b.h1++; if (okAt(3)) b.h3++;
    }
  }

  // C. đồng nghĩa: truy vấn người dùng hay gõ, bài mong đợi khớp biểu thức
  const SYN = [['lau nha', /don nha/], ['cf', /ca phe|cafe/], ['say do', /giat/], ['tho sua', /sua/], ['day kem', /gia su|day|kem/],
    ['di cho ho', /cho|mua ho/], ['headphone', /tai nghe/], ['noi that', /ghe|sofa/], ['bubble tea', /tra sua/], ['ship ho', /giao|lay/]];
  const C = [];
  for (const [q, re] of SYN) {
    const exists = posts.some((p) => re.test(strip(p.title + ' ' + (p.description || ''))));
    if (!exists) { C.push({ q, skip: true }); continue; }
    const r = await ask(q);
    C.push({ q, smart: r.smart, top1: r.titles[0] || '(rỗng)', ok1: !!r.titles[0] && re.test(strip(r.titles[0])), ok3: r.titles.slice(0, 3).some((t) => re.test(strip(t))) });
  }

  const pc = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
  console.log(`Số bài đang mở: ${N}`);
  console.log(`A. Không dấu: ${aHit}/${aTot} có bài gốc trong 10 kết quả đầu (${pc(aHit, aTot)})`);
  for (const k of Object.keys(B)) {
    const b = B[k];
    console.log(`B. Sai ký tự (${k}): ${b.n} truy vấn; chuyển sang tìm gần đúng ${b.smart}; đúng ở top1 ${b.h1} (${pc(b.h1, b.n)}); top3 ${b.h3} (${pc(b.h3, b.n)})`);
  }
  for (const c of C) console.log('C.', c.skip ? `${c.q}: bỏ qua (seed không có bài tương ứng)` : `${c.q}: smart=${c.smart} top1="${c.top1}" top1 đúng=${c.ok1} top3 đúng=${c.ok3}`);
  await mongoose.disconnect(); await mongod.stop();
})().catch((e) => { console.error(e); process.exit(1); });
