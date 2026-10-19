const { Schema, model } = require('mongoose');

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: new Schema({ type: { type: String }, id: Schema.Types.ObjectId }, { _id: false }),   // mở đúng đơn/việc/bài liên quan
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = model('Notification', notificationSchema);
