const { Schema, model } = require('mongoose');

// Đã lưu có thể là Post (food|goods|service) hoặc Job (job); `type` chép sẵn để lọc nhanh
const savedSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetModel: { type: String, enum: ['Post', 'Job'], required: true },
  type: { type: String, enum: ['food', 'goods', 'service', 'job'], required: true },
}, { timestamps: true });

savedSchema.index({ user: 1, targetId: 1 }, { unique: true });

module.exports = model('Saved', savedSchema);
