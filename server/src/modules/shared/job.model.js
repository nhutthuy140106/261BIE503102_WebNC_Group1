// Model Job do phía Đăng việc sở hữu — bản tối thiểu (Q3). Số người cần là `headcount` (tránh trùng `slots` của Offer).
const { Schema, model } = require('mongoose');
const { stripAccents, createSlug } = require('../../utils/text');

const jobSchema = new Schema({
  title: { type: String, required: true, trim: true },
  category: String,
  desc: String,
  pay: { type: Number, required: true, min: 0 },
  unit: String,
  workTime: String,                                   // chuỗi hiển thị: "Hôm nay · 11:30"
  windows: [Date],                                    // các khung giờ người nhận được chọn (rỗng = tự do)
  area: { type: String, required: true, index: true },
  distance: { type: Number, default: 0 },
  exactAddress: { type: String, default: '' },        // CHỈ lộ khi đề nghị ở chosen trở đi
  headcount: { type: Number, default: 1, min: 1 },
  poster: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['open', 'closed', 'done', 'cancelled'], default: 'open', index: true },
  offerCount: { type: Number, default: 0 },           // số đề nghị đang chờ chọn
  searchText: { type: String, select: false, index: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

jobSchema.pre('validate', function buildSearchText() {
  this.searchText = stripAccents([this.title, this.desc, this.category].filter(Boolean).join(' '));
});
jobSchema.virtual('slug').get(function slug() { return createSlug(this.title, this._id); });

module.exports = model('Job', jobSchema);
