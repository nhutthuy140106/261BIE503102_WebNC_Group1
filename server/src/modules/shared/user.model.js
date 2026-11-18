const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  phone: { type: String, required: true, unique: true, match: [/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0'] },
  // Tài khoản tạo bằng Google không có mật khẩu (vẫn bắt buộc có SĐT)
  password: { type: String, select: false, required: function () { return !this.googleId; } },
  googleId: { type: String, unique: true, sparse: true }, // sparse: tài khoản thường không có googleId vẫn không bị trùng nhau
  email: { type: String, trim: true, lowercase: true },
  phoneVerifiedAt: Date,                            // xác minh SĐT bằng OTP lúc nào; trống = chưa xác minh (vd. tài khoản Google)
  avatar: { type: String, default: null },          // URL ảnh chân dung; null = chưa có (FE hiện chữ cái đầu)
  area: { type: String, default: 'B' },
  // hồ sơ tự khai (không bắt buộc)
  gender: { type: String, enum: ['male', 'female', 'other'] },
  birthday: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },  // yyyy-MM-dd
  bio: { type: String, maxlength: 300 },
  role: { type: String, enum: ['enduser', 'moderator', 'admin'], default: 'enduser' },
  status: { type: String, enum: ['active', 'locked'], default: 'active', index: true },
  lockedReason: { type: String, default: '' },
  lockedAt: Date,
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; delete ret.__v; ret.avatar = ret.avatar || null; return ret; },
});

module.exports = model('User', userSchema);
