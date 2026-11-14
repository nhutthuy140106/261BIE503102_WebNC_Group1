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

// Câu hỏi riêng. type: text = ô chữ · choice = chọn 1 · multi = chọn nhiều · photo = ảnh
const question = new Schema({
  type: { type: String, enum: ['text', 'choice', 'multi', 'photo'], default: 'text' },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  opts: [String], ph: String, long: Boolean, hint: String,
  pay: Boolean,                                     // câu "Cần trả tiền giùm?"
}, { _id: false });

// Món trong thực đơn / dòng trong bảng giá dịch vụ — bài nhiều món gom vào MỘT Post
const item = new Schema({
  id: String, name: { type: String, required: true }, price: { type: Number, default: 0, min: 0 }, unit: String,
  dailyQty: Number,                                 // số phần/ngày; bỏ trống = không giới hạn
  optionGroups: [optionGroup],
}, { _id: false });

const sub = (def) => ({ type: new Schema(def, { _id: false }), default: undefined });

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
  // Khối 6 — câu hỏi riêng (docs/post-contract.md)
  questions: [question],
  fulfillmentModes: { type: [String], enum: ['delivery', 'pickup'], default: ['pickup'] },
  deliveryFee: { type: Number, default: 0 },
  needSchedule: { type: Boolean, default: false },
  // Khối 7 — tình trạng bán: open = không giới hạn · limit = còn `left` · once = bán một lần (xong thì soldout)
  stock: {
    mode: { type: String, enum: ['open', 'limit', 'once'], default: 'open' },
    left: { type: Number, min: 0 },
  },
  areas: [String],                                    // các khu người bán phục vụ (bài đăng từ form khu Bán); `area` là khu chính
  payMethods: { type: [String], enum: ['cash', 'transfer', 'xu'], default: undefined },
  // Tài khoản nhận chuyển khoản của bài: KHÔNG trả ra API công khai (select: false); chỉ người đã đặt đơn mới được thấy
  bank: { type: new Schema({ bankName: String, no: String, holder: String, qr: String }, { _id: false }), select: false },
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
  // ---- Các khối còn lại theo docs/post-contract.md (phía Bán điền, phía Mua đọc) ----
  priceType: { type: String, enum: ['fixed', 'unit', 'from', 'quote'] },   // khối 1: cách tính giá (`price` là giá đại diện)
  estimate: Boolean,                                  // giá theo đơn vị chỉ là ước tính
  inspectFee: { type: Number, min: 0 },               // phí kiểm tra khi báo giá sau
  items: [item],                                      // thực đơn nhiều món / bảng giá
  serviceMenu: [{ name: { type: String, required: true }, optionGroups: [optionGroup], questions: [question], _id: false }], // dọn dẹp: mỗi dịch vụ có tùy chọn + câu hỏi riêng
  bookOnce: Boolean, noSchedule: Boolean, repeat: Boolean, pickupAtBuyer: Boolean, noteEnabled: Boolean,
  quickOptions: [String],                             // đồ ăn/uống: tùy chọn nhanh khách tick, không tính tiền
  freeShipFrom: { type: Number, min: 0 },
  timeLabel: String,                                  // tên dòng giờ trong khung đặt ("Giờ giao hàng")
  timeMode: { type: String, enum: ['slot', 'datedur', 'stay'] },           // khối 3
  dates: [String],                                    // yyyy-mm-dd: ngày bán / ngày làm
  duration: sub({ min: Number, max: Number }),
  orderWindow: sub({ from: String, to: String, days: [Number] }),          // khung giờ nhận đơn
  prepMinutes: Number,                                // đồ ăn/uống: thời gian chuẩn bị
  handover: sub({ from: String, to: String }),        // khung giờ khách chọn hẹn
  place: sub({ mode: { type: String, enum: ['buyer', 'seller', 'choice', 'ab', 'none'] }, where: String }), // khối 4
  serviceInfo: sub({ turnaround: String, warranty: String, area: String }),
  condition: sub({ level: String, note: String }),    // đồ dùng: độ mới + mô tả lỗi
  highlights: [{ icon: { type: String, enum: ['clock', 'bolt', 'pin', 'check', 'receipt'] }, label: String, value: String, _id: false }], // 3 ô đầu bài
  info: [{ label: String, value: String, _id: false }],                    // thông tin người bán điền, hiện dưới Mô tả
  // Số liệu do HỆ THỐNG cập nhật (shared/post-stats.js) mỗi khi có đánh giá mới hoặc đơn hoàn thành; người bán không tự đặt được
  rating: { type: Number, min: 0, max: 5 },           // điểm sao trung bình; trống = chưa có đánh giá
  reviewCount: { type: Number, default: 0, min: 0 },
  sold: { type: Number, default: 0, min: 0 },         // tổng số lượng ở các đơn đã hoàn thành
  promoted: { type: Boolean, default: false },        // do HỆ THỐNG gán khi trả Xu, người bán không nhập
  spinPromo: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'open', 'soldout', 'closed', 'hidden'], default: 'open', index: true },
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
  const comps = await mongoose.model('Post').find({ _id: { $in: ids } }).select('seller price status combo stock title');
  if (comps.length !== ids.length) return bad('Có món trong combo không tồn tại');
  for (const p of comps) {
    if (String(p.seller) !== String(this.seller)) return bad(`"${p.title}" không phải của người bán này`);
    if (p.combo && p.combo.items && p.combo.items.length) return bad(`"${p.title}" đã là combo, không đưa vào combo khác`);
    if (p.stock && p.stock.mode === 'once') return bad(`"${p.title}" là hàng bán một lần, không đưa vào combo`);
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
