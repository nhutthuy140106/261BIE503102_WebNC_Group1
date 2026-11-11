// Đổi Post.stock / Post.oneTime kiểu cũ sang stock { mode, left } (docs/post-contract.md, khối 7).
//   node scripts/migrate-stock.js          → chỉ đếm, KHÔNG ghi
//   node scripts/migrate-stock.js --apply  → ghi thật
// Chạy lại nhiều lần vẫn an toàn (chỉ đụng bài còn kiểu cũ).
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config/env');

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(mongoUri);
  const posts = mongoose.connection.db.collection('posts');
  // kiểu cũ: stock là số hoặc null, hoặc còn cờ oneTime
  const legacy = await posts.find({ $or: [{ stock: { $type: 'number' } }, { stock: null }, { oneTime: { $exists: true } }] }).toArray();
  const plan = legacy.map((p) => {
    const stock = p.oneTime ? { mode: 'once' } : typeof p.stock === 'number' ? { mode: 'limit', left: p.stock } : { mode: 'open' };
    return { _id: p._id, title: p.title, stock };
  });
  const by = (m) => plan.filter((x) => x.stock.mode === m).length;
  console.log(`Bài kiểu cũ: ${plan.length} (once ${by('once')} · limit ${by('limit')} · open ${by('open')}) — ${apply ? 'ĐANG GHI' : 'chạy thử, chưa ghi'}`);
  if (apply) {
    for (const x of plan) await posts.updateOne({ _id: x._id }, { $set: { stock: x.stock }, $unset: { oneTime: '' } });
    console.log('Xong.');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
