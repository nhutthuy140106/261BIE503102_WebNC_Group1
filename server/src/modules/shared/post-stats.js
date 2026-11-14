// Số liệu hiển thị trên bài: điểm sao trung bình, số đánh giá, số đã bán. Tính từ đánh giá và đơn hoàn thành rồi LƯU SẴN lên Post,
// nên mọi API trả bài (danh sách, tìm kiếm, gợi ý, đã lưu, chi tiết) đều có số mà không phải tính lại từng chỗ.
const Post = require('./post.model');
const Review = require('../buyer/review/review.model');
const Order = require('../buyer/order/order.model');

/** Tính lại số liệu của một bài rồi ghi lên Post. Trả về { rating, reviewCount, sold } */
async function refresh(postId) {
  const [rv] = await Review.aggregate([{ $match: { post: postId, targetType: 'order' } }, { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$rating' } } }]);
  const [sd] = await Order.aggregate([{ $match: { post: postId, state: 'done' } }, { $group: { _id: null, n: { $sum: '$quantity' } } }]);
  const stats = { reviewCount: rv ? rv.n : 0, sold: sd ? sd.n : 0 };
  const set = rv ? { ...stats, rating: Math.round(rv.avg * 10) / 10 } : stats;
  await Post.collection.updateOne({ _id: postId }, rv ? { $set: set } : { $set: stats, $unset: { rating: 1 } });
  return { rating: rv ? set.rating : undefined, ...stats };
}

/** Tính lại cho mọi bài (dùng khi nạp dữ liệu mẫu) */
async function refreshAll() {
  const ids = (await Post.find({}).select('_id')).map((p) => p._id);
  for (const id of ids) await refresh(id);
  return ids.length;
}

module.exports = { refresh, refreshAll };
