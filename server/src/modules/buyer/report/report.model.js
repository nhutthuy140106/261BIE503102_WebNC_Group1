const { Schema, model } = require('mongoose');

// Q14: bước xử lý do Admin quyết định; ở đây mới có open
const reportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['order', 'offer', 'post', 'job', 'user'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: ['not_received', 'quality', 'payment', 'abuse', 'other'], required: true },
  detail: { type: String, required: true },
  images: [String],
  state: { type: String, enum: ['open', 'reviewing', 'resolved', 'rejected'], default: 'open', index: true },
  action: { type: String, enum: ['', 'hide_post', 'lock_user', 'warn_owner', 'order_ruled', 'other', 'none'], default: '' }, // hướng xử lý admin đã thực hiện
  adminNote: { type: String, default: '' },                 // ghi chú xử lý; người báo cáo đọc được
  handledBy: { type: Schema.Types.ObjectId, ref: 'User' },  // admin phụ trách (không trả cho người báo cáo)
  history: [{ state: String, at: Date, note: String, _id: false }],
}, { timestamps: true });

module.exports = model('Report', reportSchema);
