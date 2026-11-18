// Đơn bị hủy / từ chối / khách từ chối giá: trả lại số lượng đã trừ trên bài và voucher đã dùng
const Post = require('./post.model');
const xu = require('../buyer/xu/xu.service');

async function release(o) {
  const give = async (id, n) => {
    const p = await Post.findById(id).select('stock status');
    if (!p) return;
    if (p.stock && p.stock.mode === 'limit' && typeof p.stock.left === 'number') {
      await Post.updateOne({ _id: id }, { $inc: { 'stock.left': n }, ...(p.status === 'soldout' ? { status: 'open' } : {}) });
    } else if (p.stock && p.stock.mode === 'once' && p.status === 'soldout') {
      await Post.updateOne({ _id: id }, { status: 'open' });
    }
  };
  if (o.snapshot && o.snapshot.combo && o.snapshot.combo.length) for (const c of o.snapshot.combo) await give(c.postId, c.qty * o.quantity);
  else await give(o.post, o.quantity);
  await xu.restoreVoucher(o.buyer, o.voucherCode);
}

/** Dịch vụ có bước báo giá: sửa chữa (báo giá sau khi kiểm tra) hoặc giặt sấy (giá chốt sau khi cân). Bài khác: không có. */
function flowOf(post) {
  if (post.type !== 'service') return undefined;
  if (post.priceType === 'quote') return 'repair';
  if (post.estimate || /giặt/i.test(`${post.category || ''} ${post.title || ''}`)) return 'laundry';
  return undefined;
}

module.exports = { release, flowOf };
