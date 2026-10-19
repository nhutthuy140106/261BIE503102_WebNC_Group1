const { Schema, model } = require('mongoose');

// Máy trạng thái: xem docs/decisions.md Mục 2
const ACTIVE = ['offered', 'chosen', 'working', 'reported'];
const FINAL = ['done', 'rejected', 'withdrawn', 'cancelled'];
const REVEAL_ADDRESS = ['chosen', 'working', 'reported', 'done'];

const offerSchema = new Schema({
  code: { type: String, required: true, unique: true },               // AG-J####
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  worker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  intro: { type: String, required: true, trim: true },
  slots: [Date],                                                      // khung giờ người nhận làm được
  state: { type: String, enum: [...ACTIVE, ...FINAL], default: 'offered', index: true },
  history: [{ state: String, at: Date, _id: false }],
  report: { note: String, images: [String], at: Date, _id: false },
  cancel: { reason: String, detail: String, at: Date, _id: false },
  paidAt: Date,                                                       // người nhận đã bấm "Đã nhận tiền công"
  reviewed: { type: Boolean, default: false },
}, { timestamps: true });

// mỗi (job, worker) chỉ có một đề nghị đang hoạt động
offerSchema.index({ job: 1, worker: 1 }, { unique: true, partialFilterExpression: { state: { $in: ACTIVE } } });

offerSchema.statics.ACTIVE = ACTIVE;
offerSchema.statics.FINAL = FINAL;
offerSchema.statics.REVEAL_ADDRESS = REVEAL_ADDRESS;

module.exports = model('Offer', offerSchema);
