// Hồ sơ xác minh người bán (thực thể SellerVerification trong ER01): người dùng nộp, quản trị AntGo duyệt / từ chối.
// Chỉ người đã được duyệt mới đăng bài / đăng việc. Ảnh giấy tờ chỉ đội AntGo xem — không bao giờ trả ra API công khai.
const { Schema, model } = require('mongoose');

const STATUSES = ['pending', 'approved', 'rejected'];

const verificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: STATUSES, default: 'pending', index: true },
  body: {
    fullName: { type: String, required: true, trim: true },
    idNumber: { type: String, required: true, match: [/^\d{12}$/, 'Số CCCD gồm 12 chữ số'] },
    idFront: { type: String, required: true },
    idBack: { type: String, required: true },
    selfie: { type: String, required: true },
    shopName: { type: String, required: true, trim: true },
    shopType: { type: String, enum: ['food', 'goods', 'service'], required: true },
    intro: { type: String, default: '' },
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectReason: { type: String, default: '' },
}, { timestamps: true });

verificationSchema.statics.STATUSES = STATUSES;

module.exports = model('SellerVerification', verificationSchema);
