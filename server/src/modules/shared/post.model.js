// Model Post do phía Bán sở hữu — đây là bản tối thiểu để module Mua đọc/đặt đơn. Đổi field phải báo nhóm.
const { Schema, model } = require('mongoose');
const { stripAccents, createSlug } = require('../../utils/text');

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
  status: { type: String, enum: ['open', 'soldout', 'closed', 'hidden'], default: 'open', index: true },
  hiddenReason: { type: String, default: '' },        // Admin gỡ bài: lý do
  statusBeforeHidden: String,                         // để mở lại đúng trạng thái cũ
  searchText: { type: String, select: false, index: true }, // tên+mô tả+danh mục đã bỏ dấu, phục vụ tìm kiếm tương đối
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

postSchema.pre('validate', function buildSearchText() {
  this.searchText = stripAccents([this.title, this.description, this.category].filter(Boolean).join(' '));
});
postSchema.virtual('slug').get(function slug() { return createSlug(this.title, this._id); });

module.exports = model('Post', postSchema);
