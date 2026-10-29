const Post = require('../../shared/post.model');
const Job = require('../../shared/job.model');
const Offer = require('../offer/offer.model');
const ApiError = require('../../../utils/ApiError');
const { parsePaging, escapeRegex } = require('../../../utils/pagination');
const { stripAccents, resolveId } = require('../../../utils/text');
const smart = require('../../../utils/smart-search');

const SELLER_FIELDS = 'name avatar area';

// Tìm tương đối, không phân biệt dấu/hoa thường: 'bun bo' ra 'Bún bò'. Khớp trên searchText đã bỏ dấu.
const searchRegex = (q) => new RegExp(escapeRegex(stripAccents(q).trim()), 'i');

// Tìm thường không ra gì thì thử lại thông minh (gõ sai, đồng nghĩa), xếp theo độ liên quan. meta.smart = true để giao diện báo.
async function smartFallback(Model, filter, q, { page, limit, skip }, populateField, select) {
  const { searchText: _drop, ...rest } = filter;
  let query = Model.find(rest).select('+searchText').limit(500); // searchText mặc định bị ẩn
  if (select) query = query.select(select);
  const pool = await query.populate(populateField, SELLER_FIELDS);
  const ranked = smart.rank(pool, q.q);
  return { items: ranked.slice(skip, skip + limit).map((x) => x.doc), meta: { page, limit, total: ranked.length, smart: true } };
}

async function listPosts(q) {
  const { page, limit, skip } = parsePaging(q);
  const filter = { status: 'open' };
  if (q.type) filter.type = q.type;
  if (q.area) filter.area = q.area;
  if (q.q) filter.searchText = searchRegex(q.q);
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.price = {};
    if (q.minPrice !== undefined) filter.price.$gte = q.minPrice;
    if (q.maxPrice !== undefined) filter.price.$lte = q.maxPrice;
  }
  if (q.acceptsXu) filter.acceptsXu = true;

  const sort = { nearest: { distance: 1 }, newest: { createdAt: -1 }, price: { price: 1 }, '-price': { price: -1 } }[q.sort || 'newest'];
  const [items, total] = await Promise.all([
    Post.find(filter).sort({ ...sort, _id: 1 }).skip(skip).limit(limit).populate('seller', SELLER_FIELDS),
    Post.countDocuments(filter),
  ]);
  if (total === 0 && q.q) return smartFallback(Post, filter, q, { page, limit, skip }, 'seller');
  return { items, meta: { page, limit, total } };
}

// Nhận id hoặc slug-có-id. Bài bị admin ẩn chỉ admin xem được, người khác thấy 404.
async function getPost(identity, user) {
  const id = resolveId(identity);
  if (!id) throw ApiError.badRequest('Mã hoặc slug bài sai định dạng');
  const post = await Post.findById(id).populate('seller', SELLER_FIELDS);
  if (!post || (post.status === 'hidden' && !(user && user.role === 'admin'))) throw ApiError.notFound('Không tìm thấy bài');
  if (!(post.combo && post.combo.items && post.combo.items.length)) return post;
  // combo: kèm danh sách món (tên, giá lẻ, ảnh) và số tiền tiết kiệm so với mua lẻ (tính trên giá đang áp dụng, cả Giờ vàng)
  const comps = await Post.find({ _id: { $in: post.combo.items.map((i) => i.postId) } }).select('title price unit images status');
  const byId = new Map(comps.map((p) => [String(p._id), p]));
  const out = post.toJSON();
  const pay = post.deal ? post.deal.price : post.price;
  out.comboDetail = {
    items: post.combo.items.map((i) => { const p = byId.get(String(i.postId)); return { postId: String(i.postId), qty: i.qty, title: p && p.title, unitPrice: p && p.price, unit: p && p.unit, image: p && p.images[0], available: !!p && p.status === 'open' }; }),
    listPrice: post.combo.listPrice,
    saving: Math.max(0, post.combo.listPrice - pay),
  };
  return out;
}

async function listJobs(q) {
  const { page, limit, skip } = parsePaging(q);
  const filter = { status: 'open' };
  if (q.area) filter.area = q.area;
  if (q.q) filter.searchText = searchRegex(q.q);
  if (q.minPay !== undefined) filter.pay = { $gte: q.minPay };

  const sort = { newest: { createdAt: -1 }, nearest: { distance: 1 }, '-pay': { pay: -1 } }[q.sort || 'newest'];
  const [items, total] = await Promise.all([
    Job.find(filter).select('-exactAddress').sort({ ...sort, _id: 1 }).skip(skip).limit(limit).populate('poster', SELLER_FIELDS),
    Job.countDocuments(filter),
  ]);
  if (total === 0 && q.q) return smartFallback(Job, filter, q, { page, limit, skip }, 'poster', '-exactAddress');
  return { items, meta: { page, limit, total } };
}

// Địa chỉ chính xác không bao giờ có trong chi tiết công khai; chỉ lộ qua /offers/:id khi đề nghị đã được chọn
async function getJob(identity, user) {
  const id = resolveId(identity);
  if (!id) throw ApiError.badRequest('Mã hoặc slug việc sai định dạng');
  const job = await Job.findById(id).select('-exactAddress').populate('poster', SELLER_FIELDS);
  if (!job) throw ApiError.notFound('Không tìm thấy việc');
  const out = job.toJSON();
  out.myOffer = null;
  if (user) {
    const mine = await Offer.findOne({ job: job._id, worker: user._id }).sort({ createdAt: -1 }).select('state intro slots createdAt');
    out.myOffer = mine;
  }
  return out;
}

async function search({ q, type, area, limit = 20 }) {
  const wantPosts = type !== 'job';
  const wantJobs = !type || type === 'job';
  const [posts, jobs] = await Promise.all([
    wantPosts ? listPosts({ q, area, type: type && type !== 'job' ? type : undefined, limit }) : { items: [], meta: { total: 0 } },
    wantJobs ? listJobs({ q, area, limit }) : { items: [], meta: { total: 0 } },
  ]);
  return { posts: posts.items, jobs: jobs.items, totals: { posts: posts.meta.total, jobs: jobs.meta.total } };
}

module.exports = { listPosts, getPost, listJobs, getJob, search };
