// Điền thông tin còn thiếu cho các bài mẫu trong MongoDB đang chạy (không cần seed lại).
//   node scripts/enrich-posts.js            → chỉ xem trước (không ghi)
//   node scripts/enrich-posts.js --apply    → sao lưu bảng posts ra server/backups/ rồi ghi
// Quy tắc: chỉ điền trường đang TRỐNG (không có / rỗng); trường người bán đã điền thì giữ nguyên. Dữ liệu ở seeds/post-enrich.js.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { ENRICH, BANK_BY_NAME, IMAGE_BY_TITLE } = require('../src/seeds/post-enrich');

const APPLY = process.argv.includes('--apply');
const isEmpty = (v) => v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

(async () => {
  await mongoose.connect(env.mongoUri);
  const db = mongoose.connection.db;
  const posts = db.collection('posts');
  const all = await posts.find({}).toArray();
  const users = await db.collection('users').find({}).project({ name: 1 }).toArray();
  const nameOf = Object.fromEntries(users.map((u) => [String(u._id), u.name]));

  if (APPLY) {
    const dir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `posts-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(all));
    if (!fs.existsSync(file) || fs.statSync(file).size < 100) throw new Error('Sao lưu thất bại, dừng lại');
    console.log(`Đã sao lưu ${all.length} bài → ${file}`);
  }

  const used = new Set();
  let touched = 0;
  for (const p of all) {
    const add = ENRICH[p.title] || {};
    const image = IMAGE_BY_TITLE[p.title];
    if (!ENRICH[p.title] && !image) continue;
    used.add(p.title);
    const set = {};
    for (const [k, v] of Object.entries(add)) if (v !== undefined && isEmpty(p[k])) set[k] = v;
    const bank = BANK_BY_NAME[nameOf[String(p.seller)]];
    if (ENRICH[p.title] && bank && isEmpty(p.bank) && (add.payMethods || p.payMethods || []).includes('transfer')) set.bank = bank;
    if (image && !((p.images || []).length === 1 && p.images[0] === image)) set.images = [image]; // ảnh thì ghi đè (đổi ảnh trùng)
    if (!Object.keys(set).length) continue;
    touched++;
    console.log(`${APPLY ? 'GHI' : 'sẽ ghi'}: ${p.title.slice(0, 50)} ← ${Object.keys(set).join(', ')}`);
    if (APPLY) await posts.updateOne({ _id: p._id }, { $set: set });
  }
  const missing = [...Object.keys(ENRICH), ...Object.keys(IMAGE_BY_TITLE)].filter((t) => !used.has(t));
  console.log(`\n${touched} bài ${APPLY ? 'đã cập nhật' : 'sẽ cập nhật'}.${missing.length ? ` Không thấy trong DB: ${missing.join(' | ')}` : ''}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
