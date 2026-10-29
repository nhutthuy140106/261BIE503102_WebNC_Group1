const { Schema, model } = require('mongoose');

// Q6 chưa chốt: bộ trạng thái này là bản thử, sửa ở ORDER_STATES là đủ
const ORDER_STATES = ['waiting', 'confirmed', 'preparing', 'delivering', 'ready', 'done', 'cancelled', 'declined'];

const orderSchema = new Schema({
  code: { type: String, required: true, unique: true },               // AG-O####
  buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  // bản chụp lúc đặt: sửa/xóa bài sau đó không làm đổi đơn
  snapshot: new Schema({
    title: String, type: { type: String }, image: String, sellerName: String, sellerAvatar: { type: String, default: null }, unitPrice: Number, originalPrice: Number, promoLabel: String, unit: String,
    // combo: chụp từng món (cho MỘT combo) và tổng giá lẻ lúc đặt
    combo: [{ postId: Schema.Types.ObjectId, title: String, qty: Number, unitPrice: Number, _id: false }], listPrice: Number,
  }, { _id: false }),
  quantity: { type: Number, required: true, min: 1 },
  selections: [{ group: String, choices: [{ label: String, price: Number, _id: false }], _id: false }],
  answers: [{ question: String, value: String, _id: false }],
  fulfillment: { type: String, enum: ['delivery', 'pickup'], required: true },
  address: { name: String, phone: String, block: String, unit: String, note: String, label: String }, // chụp từ sổ địa chỉ
  scheduledAt: Date,
  utensils: { type: Boolean, default: false },
  note: { type: String, default: '' },
  voucherCode: String,
  payment: { type: String, enum: ['cash', 'transfer'], required: true },
  breakdown: { items: Number, deliveryFee: Number, discount: Number, surcharge: { type: Number, default: 0 }, promoSaved: { type: Number, default: 0 }, _id: false },
  total: { type: Number, required: true },
  state: { type: String, enum: ORDER_STATES, default: 'waiting', index: true },
  history: [{ state: String, at: Date, _id: false }],
  cancelRequest: { reason: String, at: Date, status: { type: String, enum: ['pending', 'accepted', 'rejected'] }, _id: false },
  returnRequest: { reason: String, at: Date, status: { type: String, enum: ['pending', 'accepted', 'rejected'] }, _id: false },
  surcharge: { amount: Number, reason: String, status: { type: String, enum: ['pending', 'approved'] }, _id: false },
  reviewed: { type: Boolean, default: false },
}, { timestamps: true });

orderSchema.statics.STATES = ORDER_STATES;
orderSchema.statics.ACTIVE = ['waiting', 'confirmed', 'preparing', 'delivering', 'ready'];
orderSchema.statics.HISTORY = ['done', 'cancelled', 'declined'];

module.exports = model('Order', orderSchema);
