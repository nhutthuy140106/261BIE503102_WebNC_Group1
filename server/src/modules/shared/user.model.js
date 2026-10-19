const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  phone: { type: String, required: true, unique: true, match: [/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0'] },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: null },          // URL ảnh chân dung; null = chưa có (FE hiện chữ cái đầu)
  area: { type: String, default: 'B' },
  role: { type: String, enum: ['enduser', 'admin'], default: 'enduser' },
  status: { type: String, enum: ['active', 'locked'], default: 'active', index: true },
  lockedReason: { type: String, default: '' },
  lockedAt: Date,
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; delete ret.__v; ret.avatar = ret.avatar || null; return ret; },
});

module.exports = model('User', userSchema);
