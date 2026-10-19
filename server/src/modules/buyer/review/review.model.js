const { Schema, model } = require('mongoose');

const reviewSchema = new Schema({
  reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },   // người được đánh giá
  targetType: { type: String, enum: ['order', 'offer'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', index: true },                      // chỉ có với đơn mua
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  images: [String],
  reply: { text: String, at: Date, _id: false },                                        // phản hồi của người bán (phía Bán làm)
}, { timestamps: true });

// mỗi đơn/việc chỉ được đánh giá một lần
reviewSchema.index({ targetType: 1, targetId: 1 }, { unique: true });

module.exports = model('Review', reviewSchema);
