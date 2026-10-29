// Đánh giá OFFLINE gợi ý "bài tương tự" trên dữ liệu seed: Precision@k so với ngẫu nhiên.
// Chạy: npm run eval:recommend   (dùng MongoDB trong bộ nhớ, không đụng DB thật)
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = process.env.SEED_PASSWORD || 'Eval@2026';
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('../src/seeds/seed')();
  const Post = require('../src/modules/shared/post.model');
  const { similar } = require('../src/modules/buyer/recommend/recommend.service');
  const posts = await Post.find({ status: 'open' });
  const N = posts.length;
  const byId = new Map(posts.map((p) => [String(p._id), p]));
  // Nhãn đúng (xấp xỉ): hai bài "liên quan" khi cùng danh mục (Đồ ăn, Đồ uống, Đồ dùng, Dịch vụ)
  const relevant = (a, b) => a.category === b.category;
  const KS = [1, 3, 5];
  const out = {};
  for (const k of KS) {
    let hit = 0; let total = 0; let base = 0;
    for (const p of posts) {
      const recs = await similar(String(p._id), k);
      const list = recs.items || recs.data || recs;
      for (const r of list) { const q = byId.get(String(r._id || r.id || (r.post && r.post._id))); if (q) { total++; if (relevant(p, q)) hit++; } }
      // ngẫu nhiên: tỉ lệ bài còn lại cùng danh mục
      base += (posts.filter((q) => q !== p && relevant(p, q)).length / (N - 1)) * k;
    }
    out[k] = { precision: hit / total, random: base / (posts.length * k) };
  }
  console.log(`Số bài: ${N}. Nhãn đúng = cùng danh mục.`);
  for (const k of KS) console.log(`P@${k}: thuật toán ${(out[k].precision * 100).toFixed(1)}%  |  ngẫu nhiên ${(out[k].random * 100).toFixed(1)}%`);
  await mongoose.disconnect(); await mongod.stop();
})().catch((e) => { console.error(e); process.exit(1); });
