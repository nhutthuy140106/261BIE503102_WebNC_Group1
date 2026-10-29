// Model Post do phía Bán sở hữu — đây là bản tối thiểu để module Mua đọc/đặt đơn. Đổi field phải báo nhóm.
const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const { stripAccents, createSlug } = require('../../utils/text');
const { effectivePrice } = require('../../utils/promo');

const optionGroup = new Schema({
  name: { type: String, required: true },
  multi: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  choices: [{ label: { type: String, required: true }, price: { type: Number, default: 0 }, _id: false }],
}, { _id: false });

const postSchema = new Schema({
  type: { type: String, enum: ['food', 'goods', 'service'], required: true, index: true },
  category: String,
  title: { type: String, required: true, trim: true },
  description: String,
  images: [String],
  price: { type: Number, required: true, min: 0 },
  unit: String,
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  area: { type: String, required: true, index: true },
  distance: { type: Number, default: 0 },          // mét, dữ liệu mẫu (Q8)
  acceptsXu: { type: Boolean, default: false },
  // 7 khối (rút gọn) — Q2
  optionGroups: [optionGroup],
  questions: [{ label: String, required: Boolean, _id: false }],
  fulfillmentModes: { type: [String], enum: ['delivery', 'pickup'], default: ['pickup'] },
  deliveryFee: { type: Number, default: 0 },
  needSchedule: { type: Boolean, default: false },
  stock: { type: Number, default: null },           // null = không giới hạn
  oneTime: { type: Boolean, default: false },       // bán một lần
  // Giờ vàng: giảm giá theo khung giờ lặp hằng tuần (xem utils/promo.js). Khung from > to là vắt qua nửa đêm; days = ngày BẮT ĐẦU khung (0 = Chủ nhật)
  promo: {
    type: new Schema({
      kind: { type: String, enum: ['percent', 'amount'], required: true },
      value: { type: Number, required: true, min: 1 },
      from: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      to: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
      days: { type: [Number], validate: { validator: (a) => a.length > 0 && a.every((d) => Number.isInteger(d) && d >= 0 && d <= 6), message: 'days gồm các số 0-6' } },
      active: { type: Boolean, default: true },
    }, { _id: false }),
    default: undefined,
  },
  // Combo: gói nhiều món CÙNG người bán với giá rẻ hơn mua lẻ. `price` của bài = comboPrice (để lọc/sắp giá như bài thường);
  // `listPrice` = tổng giá lẻ lúc lưu (server tự tính, FE hiện "Tiết kiệm"). Giờ vàng áp lên combo như bài thường.
  combo: {
    type: new Schema({
      items: [{ postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true }, qty: { type: Number, required: true, min: 1, max: 10 }, _id: false }],
      comboPrice: { type: Number, required: true, min: 1 },
      listPrice: { type: Number, default: 0 },
    }, { _id: false }),
    default: undefined,
  },
  status: { type: String, enum: ['open', 'soldout', 'closed', 'hidden'], default: 'open', index: true },
  hiddenReason: { type: String, default: '' },        // Admin gỡ bài: lý do
  statusBeforeHidden: String,                         // để mở lại đúng trạng thái cũ
  searchText: { type: String, select: false, index: true }, // tên+mô tả+danh mục đã bỏ dấu, phục vụ tìm kiếm tương đối
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

postSchema.pre('validate', function buildSearchText() {
  this.searchText = stripAccents([this.title, this.description, this.category].filter(Boolean).join(' '));
});
// Kiểm combo ở MỌI đường tạo/sửa bài: >= 2 món khác nhau, cùng người bán, còn bán, giá combo thấp hơn tổng lẻ (CẦN CHỐT: decisions F12)
postSchema.pre('validate', async function validateCombo() {
  const c = this.combo;
  if (!c || !c.items || !c.items.length) { this.combo = undefined; return; }
  const bad = (msg) => this.invalidate('combo', msg);
  this.price = c.comboPrice;
  const ids = c.items.map((i) => String(i.postId));
  if (ids.length < 2 || new Set(ids).size !== ids.length) return bad('Combo cần ít nhất 2 món khác nhau');
  if (ids.includes(String(this._id))) return bad('Combo không được chứa chính nó');
  const comps = await mongoose.model('Post').find({ _id: { $in: ids } }).select('seller price status combo oneTime title');
  if (comps.length !== ids.length) return bad('Có món trong combo không tồn tại');
  for (const p of comps) {
    if (String(p.seller) !== String(this.seller)) return bad(`"${p.title}" không phải của người bán này`);
    if (p.combo && p.combo.items && p.combo.items.length) return bad(`"${p.title}" đã là combo, không đưa vào combo khác`);
    if (p.oneTime) return bad(`"${p.title}" là hàng bán một lần, không đưa vào combo`);
    if (p.status !== 'open') return bad(`"${p.title}" hiện không bán`);
  }
  const byId = new Map(comps.map((p) => [String(p._id), p]));
  c.listPrice = c.items.reduce((n, i) => n + byId.get(String(i.postId)).price * i.qty, 0);
  if (c.comboPrice >= c.listPrice) return bad(`Giá combo phải thấp hơn tổng giá lẻ (${c.listPrice}đ)`);
});
// Giá đang áp dụng lúc đọc: { price, original, label, endsAt } khi có Giờ vàng đang chạy, ngược lại null
postSchema.virtual('deal').get(function deal() {
  const e = effectivePrice(this);
  return e.promo ? { price: e.price, original: e.original, label: e.promo.label, endsAt: e.promo.endsAt } : null;
});
postSchema.virtual('slug').get(function slug() { return createSlug(this.title, this._id); });

module.exports = model('Post', postSchema);
