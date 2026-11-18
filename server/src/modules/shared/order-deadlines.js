// Hạn xử lý của người bán (chốt 11/11/2026, xem client/src/app/core/utils/countdown.ts) — tính LÚC ĐỌC, không cần cron:
//  · đơn chờ xác nhận quá hạn → tự hủy (đồ ăn 10 phút, đồ dùng 12 giờ, dịch vụ 2 giờ nhưng không trễ hơn 1 giờ trước giờ hẹn)
//  · khách xin hủy mà người bán im lặng quá 12 giờ → coi như đồng ý hủy
// Tắt khi thử bằng ORDER_AUTO_CANCEL=0.
const Order = require('../buyer/order/order.model');
const { release } = require('./order-release');
const { move } = require('./order-move');
const { notify } = require('./notify');

const MIN = 60000;
const enabled = () => process.env.ORDER_AUTO_CANCEL !== '0';
const CANCELABLE = ['waiting', 'confirmed', 'picked', 'pricing', 'preparing'];

function confirmDeadline(o) {
  const placed = new Date(o.createdAt).getTime();
  const type = o.snapshot && o.snapshot.type;
  let at = placed + (type === 'food' ? 10 * MIN : type === 'goods' ? 12 * 60 * MIN : 2 * 60 * MIN);
  if (type === 'service' && o.scheduledAt) at = Math.min(at, new Date(o.scheduledAt).getTime() - 60 * MIN);
  return Math.max(at, placed + 10 * MIN); // đặt sát giờ vẫn cho người bán tối thiểu 10 phút
}

async function applyOne(o, now = Date.now()) {
  if (!o || !enabled()) return o;
  if (o.state === 'waiting' && now > confirmDeadline(o)) {
    o.cancelInfo = { by: 'system', reason: 'Người bán chưa xác nhận kịp nên đơn tự hủy' };
    await move(o, 'cancelled');
    await release(o);
    await notify(o.seller, { type: 'order_expired', title: `Đơn ${o.code} đã tự hủy vì quá hạn xác nhận`, link: { type: 'order', id: o._id } });
  } else if (o.cancelRequest && o.cancelRequest.status === 'pending' && CANCELABLE.includes(o.state) && now - new Date(o.cancelRequest.at).getTime() > 12 * 60 * MIN) {
    o.cancelRequest.status = 'accepted';
    o.cancelInfo = { by: 'buyer', reason: `${o.cancelRequest.reason} (người bán không trả lời trong 12 giờ)` };
    await move(o, 'cancelled');
    await release(o);
  }
  return o;
}

/** Xử lý các đơn quá hạn thuộc bộ lọc (danh sách của người mua / người bán) */
async function sweep(filter) {
  if (!enabled()) return;
  const rows = await Order.find({ ...filter, $or: [{ state: 'waiting' }, { 'cancelRequest.status': 'pending' }] });
  for (const o of rows) await applyOne(o);
}

module.exports = { applyOne, sweep, confirmDeadline };
