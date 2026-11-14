// Lượt xem bài theo ngày và lượt theo dõi gian hàng — nguồn số liệu thật cho mục Hiệu quả của người bán.
const { Schema, model } = require('mongoose');

// Mỗi (bài, ngày) một dòng, mỗi lần có người khác mở bài thì cộng 1: đủ để tính lượt xem theo ngày / tuần / tháng mà không phình dữ liệu
const postViewSchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, required: true },   // yyyy-mm-dd, giờ máy chủ
  count: { type: Number, default: 0, min: 0 },
});
postViewSchema.index({ post: 1, date: 1 }, { unique: true });

// Người dùng theo dõi gian hàng của một người bán
const shopFollowSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  shop: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },   // chủ gian hàng
}, { timestamps: true });
shopFollowSchema.index({ user: 1, shop: 1 }, { unique: true });

const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

module.exports = { PostView: model('PostView', postViewSchema), ShopFollow: model('ShopFollow', shopFollowSchema), dayKey };
