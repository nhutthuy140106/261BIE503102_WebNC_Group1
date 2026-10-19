// Gợi ý dựa trên NỘI DUNG (content-based), tự cài bằng Node, không dịch vụ ngoài. Mô tả: docs/thuat-toan-goi-y.md
const Post = require('../../shared/post.model');
const Saved = require('../saved/saved.model');
const Order = require('../order/order.model');
const ApiError = require('../../../utils/ApiError');
const { stripAccents, resolveId } = require('../../../utils/text');

const W = { text: 0.6, type: 0.15, price: 0.15, area: 0.1 };
const STOPWORDS = new Set(['va', 'la', 'cua', 'co', 'cho', 'cac', 'nhung', 'mot', 'nay', 'theo', 'den', 'tu', 'voi', 'duoc', 'o', 'ma', 'de', 'khi', 'se', 'rat', 'hay', 'cung']);
const CORPUS_LIMIT = 500;

const postText = (p) => [p.title, p.description, p.category].filter(Boolean).join(' ');

function tokenize(text) {
  return stripAccents(text).split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/** Xây vector TF-IDF thưa cho từng bài. idf = ln((N+1)/(df+1)) + 1 (làm mượt để từ xuất hiện ở mọi bài vẫn > 0). */
function buildVectors(posts) {
  const docs = posts.map((p) => tokenize(postText(p)));
  const df = new Map();
  for (const toks of docs) for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1);
  const N = posts.length;
  const vectors = new Map();
  posts.forEach((p, i) => {
    const toks = docs[i];
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    const v = new Map();
    for (const [t, c] of tf) v.set(t, (c / toks.length) * (Math.log((N + 1) / (df.get(t) + 1)) + 1));
    vectors.set(String(p._id), v);
  });
  return vectors;
}

function cosine(a, b) {
  let dot = 0; let na = 0; let nb = 0;
  for (const [, x] of a) na += x * x;
  for (const [, y] of b) nb += y * y;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, x] of small) if (big.has(t)) dot += x * big.get(t);
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const priceSim = (a, b) => (a === 0 && b === 0 ? 1 : Math.min(a, b) / Math.max(a, b, 1));

const round = (n) => Math.round(n * 1000) / 1000;

async function corpus() {
  return Post.find({ status: 'open' }).limit(CORPUS_LIMIT).populate('seller', 'name avatar area');
}

async function similar(identity, limit = 6) {
  const id = resolveId(identity);
  if (!id) throw ApiError.badRequest('Mã hoặc slug bài sai định dạng');
  const base = await Post.findById(id);
  if (!base || base.status === 'hidden') throw ApiError.notFound('Không tìm thấy bài');

  const posts = await corpus();
  if (!posts.some((p) => String(p._id) === id)) posts.push(base); // bài gốc đã hết hàng vẫn cần có vector
  const vectors = buildVectors(posts);
  const bv = vectors.get(id);

  return posts
    .filter((p) => String(p._id) !== id)
    .map((p) => {
      const score = W.text * cosine(bv, vectors.get(String(p._id)))
        + W.type * (p.type === base.type ? 1 : 0)
        + W.price * priceSim(p.price, base.price)
        + W.area * (p.area === base.area ? 1 : 0);
      return { post: p, score: round(score) };
    })
    .filter((x) => x.post.status === 'open')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function recommendations(user, limit = 8) {
  const [saved, ordered] = await Promise.all([
    Saved.find({ user: user._id, targetModel: 'Post' }).select('targetId').lean(),
    Order.find({ buyer: user._id }).select('post').lean(),
  ]);
  // đơn đã đặt thể hiện sở thích mạnh hơn bài chỉ lưu
  const weight = new Map();
  for (const s of saved) weight.set(String(s.targetId), (weight.get(String(s.targetId)) || 0) + 1);
  for (const o of ordered) weight.set(String(o.post), (weight.get(String(o.post)) || 0) + 2);

  const posts = await corpus();
  const owned = (p) => p.seller && String(p.seller._id) === String(user._id);

  if (!weight.size) {
    // chưa có lịch sử: không bịa sở thích, chỉ đưa bài mới trong khu của người dùng
    const fresh = posts.filter((p) => !owned(p) && p.area === user.area).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    return fresh.map((p) => ({ post: p, score: 0, reason: 'new_in_area' }));
  }

  const history = await Post.find({ _id: { $in: [...weight.keys()] } });
  const all = posts.concat(history.filter((h) => !posts.some((p) => String(p._id) === String(h._id))));
  const vectors = buildVectors(all);

  // hồ sơ người dùng = tổng có trọng số các vector bài đã quan tâm
  const profile = new Map();
  let wSum = 0; let priceAvg = 0; const typeCount = {};
  for (const h of history) {
    const w = weight.get(String(h._id));
    wSum += w; priceAvg += h.price * w; typeCount[h.type] = (typeCount[h.type] || 0) + w;
    for (const [t, x] of vectors.get(String(h._id))) profile.set(t, (profile.get(t) || 0) + x * w);
  }
  priceAvg /= wSum;

  return posts
    .filter((p) => !weight.has(String(p._id)) && !owned(p))
    .map((p) => ({
      post: p,
      reason: 'based_on_history',
      score: round(W.text * cosine(profile, vectors.get(String(p._id)))
        + W.type * ((typeCount[p.type] || 0) / wSum)
        + W.price * priceSim(p.price, priceAvg)
        + W.area * (p.area === user.area ? 1 : 0)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { similar, recommendations, tokenize, buildVectors, cosine };
