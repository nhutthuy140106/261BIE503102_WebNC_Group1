const { Schema, model } = require('mongoose');

// Q6 chưa chốt: bộ trạng thái này là bản thử, sửa ở ORDER_STATES là đủ
// picked / pricing: chỉ có ở đơn có bước báo giá (giặt sấy: đã lấy đồ → báo giá sau khi cân; sửa chữa: đã kiểm tra → báo giá)
const ORDER_STATES = ['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'delivering', 'ready', 'done', 'cancelled', 'declined'];

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
    // tài khoản nhận chuyển khoản của người bán, chụp lúc đặt (chỉ đơn trả bằng chuyển khoản). Bài công khai không lộ `bank`; người mua chỉ thấy nó qua đơn của mình
    bank: new Schema({ bankName: String, no: String, holder: String, qr: String }, { _id: false }),
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
  // Đơn có bước báo giá (xem shared/order-release.js › flowOf): người bán báo giá cuối, người mua đồng ý hoặc từ chối
  flow: { type: String, enum: ['laundry', 'repair'] },
  quote: new Schema({
    lines: [{ name: String, qty: Number, price: Number, _id: false }],
    total: Number,                                        // giá cuối chưa gồm phí giao
    at: Date,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectReason: String,
  }, { _id: false }),
  // ai hủy và vì sao (người mua hủy ngay / người bán từ chối hoặc hủy / hệ thống tự hủy khi quá hạn)
  cancelInfo: { by: { type: String, enum: ['buyer', 'seller', 'system'] }, reason: String, late: Boolean, _id: false },
  // báo vấn đề sau khi nhận (đồ ăn 2 giờ, đồ dùng / dịch vụ 24 giờ): người bán chọn làm lại / hoàn tiền / nhận lại hàng / từ chối
  issue: new Schema({ st: { type: String, enum: ['open', 'redo', 'refund', 'returnAgreed', 'rejected', 'closed'] }, type: { type: String }, text: String, photos: Number, images: [String], reply: String, amount: Number, result: String, at: Date }, { _id: false }),
  oldTotal: Number,                                       // tổng tiền lúc đặt, giữ lại khi giá cuối được duyệt
  reviewed: { type: Boolean, default: false },
}, { timestamps: true });

orderSchema.statics.STATES = ORDER_STATES;
orderSchema.statics.ACTIVE = ['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'delivering', 'ready'];
orderSchema.statics.HISTORY = ['done', 'cancelled', 'declined'];

module.exports = model('Order', orderSchema);
