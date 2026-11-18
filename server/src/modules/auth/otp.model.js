const { Schema, model } = require('mongoose');

// OTP giả lập (thiết kế ở ER01 — OtpChallenge). Mỗi (SĐT, mục đích) chỉ có MỘT bản ghi.
// Không lưu mã gốc, chỉ lưu băm HMAC. Bản ghi tự xóa sau `purgeAt` (TTL) nên không tích rác.
const otpSchema = new Schema({
  phone: { type: String, required: true },
  purpose: { type: String, enum: ['register', 'reset'], required: true },
  codeHash: String,                       // rỗng sau khi xác minh đúng (mã dùng một lần)
  expiresAt: Date,                        // hạn của MÃ (5 phút)
  attempts: { type: Number, default: 0 }, // số lần nhập sai của mã hiện tại
  lastSentAt: Date,
  windowStart: Date,                      // đầu khung 1 giờ đếm số lần gửi
  sendCount: { type: Number, default: 0 },
  verifiedUntil: Date,                    // đã xác minh đúng: được dùng để đăng ký / đặt lại mật khẩu tới lúc này
  purgeAt: { type: Date, index: { expireAfterSeconds: 0 } },
}, { timestamps: true });
otpSchema.index({ phone: 1, purpose: 1 }, { unique: true });

module.exports = model('OtpChallenge', otpSchema);
