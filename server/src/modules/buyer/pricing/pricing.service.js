// Gợi ý giá khi đăng bài/việc: k láng giềng gần nhất (kNN) theo độ giống văn bản TF-IDF. Mô tả: docs/thuat-toan-goi-y.md (mục Gợi ý giá).
const Post = require('../../shared/post.model');
const Job = require('../../shared/job.model');
const { buildVectors, cosine } = require('../recommend/recommend.service');

const K = 7;
const MIN_SIM = 0.12;

// Trung vị có trọng số: giá nào cộng dồn trọng số tới một nửa tổng
function weightedQuantile(items, q) {
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const total = sorted.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (const x of sorted) { acc += x.w; if (acc >= total * q) return x.price; }
  return sorted[sorted.length - 1].price;
}

// Làm tròn theo thang giá VN: <100k → nghìn; còn lại → 5 nghìn
const roundPrice = (n) => (n < 100000 ? Math.round(n / 1000) * 1000 : Math.round(n / 5000) * 5000);

/**
 * input: { kind: 'food'|'goods'|'service'|'job', title, category }
 * Trả { low, suggested, high, samples, confidence: 'high'|'medium'|'low', basis: [{title, price}] } hoặc null khi chưa có dữ liệu.
 */
async function suggest({ kind, title, category }) {
  const isJob = kind === 'job';
  const rows = isJob
    ? await Job.find({ status: { $ne: 'cancelled' } }).limit(500).lean()
    : await Post.find({ type: kind, status: { $ne: 'hidden' } }).limit(500).lean();
  const docs = rows.map((r) => ({ _id: r._id, title: r.title, description: isJob ? r.desc : r.description, category: r.category, price: isJob ? r.pay : r.price }))
    .filter((d) => Number.isFinite(d.price) && d.price > 0);
  if (!docs.length) return null;

  const query = { _id: 'query', title: title || '', description: '', category: category || '' };
  const vectors = buildVectors([query, ...docs]);
  const qv = vectors.get('query');
  const scored = docs.map((d) => ({ ...d, sim: cosine(qv, vectors.get(String(d._id))) })).sort((a, b) => b.sim - a.sim);

  let near = scored.filter((d) => d.sim >= MIN_SIM).slice(0, K);
  let confidence = near.length >= 5 ? 'high' : near.length >= 3 ? 'medium' : 'low';
  if (near.length < 3) { near = scored.slice(0, Math.max(near.length, 5)); confidence = 'low'; } // ít mẫu giống: dùng mặt bằng chung của loại, báo độ tin thấp
  const w = near.map((d) => ({ price: d.price, w: Math.max(d.sim, 0.05) }));
  return {
    low: roundPrice(weightedQuantile(w, 0.25)),
    suggested: roundPrice(weightedQuantile(w, 0.5)),
    high: roundPrice(weightedQuantile(w, 0.75)),
    samples: near.length,
    confidence,
    basis: near.slice(0, 3).map((d) => ({ title: d.title, price: d.price })),
  };
}

module.exports = { suggest, roundPrice };
