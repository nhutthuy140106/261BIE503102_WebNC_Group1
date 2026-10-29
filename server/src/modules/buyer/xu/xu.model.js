const { Schema, model } = require('mongoose');

// Sổ Xu: mỗi dòng một lần cộng/trừ. Số dư = tổng delta. `key` duy nhất theo người dùng để một sự kiện không bị ghi hai lần.
const xuEntrySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  delta: { type: Number, required: true },
  title: { type: String, required: true },
  kind: { type: String, enum: ['welcome', 'game', 'redeem', 'other'], default: 'other' },
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

module.exports = {
  XuEntry: model('XuEntry', xuEntrySchema),
  XuVoucher: model('XuVoucher', voucherSchema),
};
