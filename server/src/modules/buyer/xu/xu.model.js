const { Schema, model } = require('mongoose');

// Sổ Xu: mỗi dòng một lần cộng/trừ. Số dư = tổng delta. `key` duy nhất theo người dùng để một sự kiện không bị ghi hai lần.
const xuEntrySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  delta: { type: Number, required: true },
  title: { type: String, required: true },
  kind: { type: String, enum: ['welcome', 'game', 'redeem', 'order', 'review', 'job', 'other'], default: 'other' },
  key: { type: String, required: true },
  day: { type: String, index: true },        // yyyy-mm-dd theo giờ Việt Nam, dùng đếm lượt/trần mỗi ngày
}, { timestamps: { createdAt: true, updatedAt: false } });
xuEntrySchema.index({ user: 1, key: 1 }, { unique: true });
xuEntrySchema.index({ user: 1, kind: 1, day: 1 });

const voucherSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cid: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false } });

// Voucher đổi bằng Xu do admin quản lý. Chưa có dòng nào thì dùng bộ mặc định trong xu.service (CATALOG).
const voucherDefSchema = new Schema({
  cid: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 30 },
  title: { type: String, required: true, trim: true, maxlength: 80 },
  cond: { type: String, default: '', maxlength: 120 },
  amount: { type: Number, default: 0, min: 0 },       // giảm bao nhiêu đồng
  ship: { type: Boolean, default: false },            // true = miễn phí giao
  min: { type: Number, default: 0, min: 0 },          // đơn tối thiểu
  cost: { type: Number, required: true, min: 1 },     // giá đổi bằng Xu
  active: { type: Boolean, default: true },           // tắt = không đổi mới được, voucher đã đổi vẫn dùng
}, { timestamps: true });

module.exports = {
  VoucherDefinition: model('VoucherDefinition', voucherDefSchema),
  XuEntry: model('XuEntry', xuEntrySchema),
  XuVoucher: model('XuVoucher', voucherSchema),
};
