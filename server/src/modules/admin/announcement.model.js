// Thông báo hệ thống do admin gửi tới người dùng (toàn khu hoặc theo khu vực); lưu lại để xem lịch sử.
const { Schema, model } = require('mongoose');

module.exports = model('Announcement', new Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  body: { type: String, default: '', maxlength: 500 },
  area: { type: String, default: 'all' },                  // 'all' hoặc tên khu (A, B, C, D…)
  sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipients: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'at', updatedAt: false } }));
