const catalog = require('../catalog/catalog.service');
const Order = require('../order/order.model');

/** Công cụ trợ lý dùng chung cho Gemini/LLM và bộ trả lời cơ bản. Mỗi công cụ trả { text (cho mô hình / câu trả lời), cards }. */

const ORDER_LABEL = {
  waiting: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị', delivering: 'Đang giao',
  ready: 'Sẵn sàng nhận', done: 'Hoàn thành', cancelled: 'Đã hủy', declined: 'Người bán từ chối',
};

const fmt = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

const shortCard = (kind, p) => ({
  id: String(p._id),
  kind,
  title: p.title,
  price: kind === 'job' ? p.pay : p.price,
  unit: p.unit || undefined,
  sellerName: (p.seller || p.poster || {}).name || '',
  area: (p.seller || p.poster || {}).area || p.area || '',
  image: kind === 'job' ? undefined : (p.images || [])[0],
  slug: p.slug,
});

const pickInt = (v) => (v !== undefined && v !== null && Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : undefined);

/** Đơn của người đang chat: state = active (mặc định) | history | all. Không bao giờ đọc đơn của người khác. */
async function myOrders(user, state = 'active') {
  if (!user || !user._id) return { text: 'Cần đăng nhập để xem đơn.', cards: [] };
  const filter = { buyer: user._id };
  if (state === 'active') filter.state = { $in: Order.ACTIVE };
  else if (state === 'history') filter.state = { $in: Order.HISTORY };
  const rows = await Order.find(filter).sort({ createdAt: -1 }).limit(8).lean();
  if (!rows.length) {
    return { text: state === 'history' ? 'Bạn chưa có đơn nào đã kết thúc.' : 'Bạn chưa có đơn nào đang diễn ra.', cards: [] };
  }
  const lines = rows.map((o) => `• ${o.code} · ${(o.snapshot && o.snapshot.title) || 'Đơn'} ×${o.quantity} — ${fmt(o.total)} — ${ORDER_LABEL[o.state] || o.state}`);
  return { text: lines.join('\n'), cards: [] };
}

/** "Chọn giúp tôi": một món ăn/uống ngẫu nhiên trong ngân sách (cùng ý với trang Quay món). */
async function pickDish({ q, max_price, min_price, area } = {}) {
  const max = pickInt(max_price);
  const min = pickInt(min_price);
  const items = (await catalog.listPosts({
    type: 'food', area: ['A', 'B', 'C', 'D'].includes(area) ? area : undefined, q: typeof q === 'string' && q.trim() ? q.trim().slice(0, 60) : undefined,
    limit: 100, minPrice: min, maxPrice: max,
  })).items;
  if (!items.length) return { text: 'Không có món nào hợp ngân sách/từ khóa này.', cards: [] };
  const chosen = items[Math.floor(Math.random() * items.length)];
  const card = shortCard('food', chosen);
  return {
    text: `Chọn ngẫu nhiên trong ${items.length} món: ${card.title} — ${fmt(card.price)}${card.unit ? '/' + card.unit : ''}${card.sellerName ? ` (${card.sellerName})` : ''}`,
    cards: [card],
  };
}

module.exports = { ORDER_LABEL, fmt, shortCard, pickInt, myOrders, pickDish };
