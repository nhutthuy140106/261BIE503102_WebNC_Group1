// Đổi trạng thái đơn + ghi lịch sử + báo người mua. Dùng chung cho người bán, người mua và bộ tự xử lý quá hạn.
const xu = require('../buyer/xu/xu.service');
const postStats = require('./post-stats');
const { notify } = require('./notify');

const STATE_TEXT = { confirmed: 'đã được xác nhận', picked: 'đã lấy đồ / đã kiểm tra', pricing: 'đã có giá cuối, chờ bạn duyệt', preparing: 'đang được chuẩn bị', delivering: 'đang giao', ready: 'đã sẵn sàng', done: 'đã hoàn thành', declined: 'bị từ chối', cancelled: 'đã được hủy' };

/** `quiet`: không báo người mua (khi chính người mua là người đổi bước) */
async function move(o, to, { quiet = false } = {}) {
  o.state = to;
  o.history.push({ state: to, at: new Date() });
  await o.save();
  if (to === 'done') {
    await xu.award(o.buyer, 'order', o._id, { total: o.total });
    await postStats.refresh(o.post);
  }
  if (!quiet) await notify(o.buyer, { type: 'order_state', title: `Đơn ${o.code} ${STATE_TEXT[to] || to}`, link: { type: 'order', id: o._id } });
}

module.exports = { move, STATE_TEXT };
