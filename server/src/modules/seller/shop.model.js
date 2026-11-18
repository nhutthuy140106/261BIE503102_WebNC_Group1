// Hồ sơ gian hàng của người bán (thực thể Shop): tên gian hàng, giới thiệu, giờ nhận đơn, ngày nghỉ, tạm ngưng.
// Số liệu (đánh giá, đơn hoàn thành, lượt xem…) KHÔNG lưu ở đây — luôn tính từ đơn, đánh giá, lượt xem thật (xem shop.service.js).
const { Schema, model } = require('mongoose');

const hhmm = { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ };

const shopSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, trim: true, maxlength: 60 },
  kind: { type: String, trim: true, maxlength: 40, default: '' },        // "Bếp nhà làm", "Giặt sấy"…
  address: { type: String, trim: true, maxlength: 80, default: '' },     // "Block B, tầng 5"
  bio: { type: String, trim: true, maxlength: 600, default: '' },
  avatar: { type: String, default: null },                              // ảnh đại diện riêng của gian hàng; trống = dùng ảnh tài khoản
  cover: { type: String, default: null },
  replyTime: { type: String, trim: true, maxlength: 60, default: '' },   // chữ hiển thị: "Thường trả lời trong 10 phút"
  // 7 ngày, [0] = Thứ Hai … [6] = Chủ nhật
  hours: {
    type: [new Schema({ on: { type: Boolean, default: true }, from: { ...hhmm, default: '08:00' }, to: { ...hhmm, default: '20:00' } }, { _id: false })],
    default: () => Array.from({ length: 7 }, () => ({ on: true, from: '08:00', to: '20:00' })),
    validate: { validator: (a) => a.length === 7, message: 'Cần đủ giờ của 7 ngày trong tuần' },
  },
  offs: [new Schema({ date: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, required: true }, note: { type: String, default: '' } }, { _id: false })],
  pause: { type: new Schema({ until: { type: String, required: true } }, { _id: false }), default: null },
}, { timestamps: true });

module.exports = model('Shop', shopSchema);
