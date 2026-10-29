const catalog = require('../catalog/catalog.service');
const Order = require('../order/order.model');
const { listDeals } = require('../deals/deals.routes');

/** Công cụ trợ lý dùng chung cho Gemini/LLM và bộ trả lời cơ bản. Mỗi công cụ trả { text (cho mô hình / câu trả lời), cards }. */

const ORDER_LABEL = {
  waiting: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị', delivering: 'Đang giao',
  ready: 'Sẵn sàng nhận', done: 'Hoàn thành', cancelled: 'Đã hủy', declined: 'Người bán từ chối',
};

const fmt = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

// Thẻ bài cho giao diện / mô hình. Bài đang Giờ vàng: `price` là giá người mua THỰC TRẢ, kèm giá gốc, nhãn và giờ hết
const shortCard = (kind, p) => {
  const deal = kind !== 'job' && p.deal ? p.deal : null;
  return {
    id: String(p._id),
    kind,
    title: p.title,
    price: kind === 'job' ? p.pay : (deal ? deal.price : p.price),
    unit: p.unit || undefined,
    sellerName: (p.seller || p.poster || {}).name || '',
    area: (p.seller || p.poster || {}).area || p.area || '',
    image: kind === 'job' ? undefined : (p.images || [])[0],
    slug: p.slug,
    ...(deal ? { originalPrice: deal.original, dealLabel: deal.label, dealEndsAt: deal.endsAt } : {}),
  };
};

// "còn 45 phút" / "còn 2 giờ 10 phút"
const remaining = (endsAt, now = new Date()) => {
  const m = Math.max(1, Math.ceil((new Date(endsAt) - now) / 60000));
  return m >= 60 ? `còn ${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `còn ${m} phút`;
};
const hhmm = (d) => new Date(new Date(d).getTime() + 7 * 3600e3).toISOString().slice(11, 16); // giờ Việt Nam

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

/** Bài đang Giờ vàng (giảm giá theo khung giờ) + bài sắp giảm trong 3 giờ tới. */
async function dealsNow({ area, type, now = new Date() } = {}) {
  const r = await listDeals({ now, area: ['A', 'B', 'C', 'D'].includes(area) ? area : undefined, type: ['food', 'goods', 'service'].includes(type) ? type : undefined });
  const act = r.active.slice(0, 6);
  const cards = act.map((p) => shortCard(p.type, p));
  const lines = cards.map((c) => `• ${c.title} — ${fmt(c.price)} (gốc ${fmt(c.originalPrice)}, ${c.dealLabel}, ${remaining(c.dealEndsAt, now)})`);
  const soon = r.upcoming.slice(0, 3).map((p) => `• ${p.title} — ${p.upcoming.label} từ ${hhmm(p.upcoming.startsAt)}`);
  if (!lines.length && !soon.length) return { text: 'Hiện chưa có món nào đang giảm giá theo giờ vàng.', cards: [] };
  const text = [lines.length ? `Đang giảm giá lúc này:\n${lines.join('\n')}` : 'Hiện chưa có món nào đang giảm.', soon.length ? `Sắp giảm trong 3 giờ tới:\n${soon.join('\n')}` : ''].filter(Boolean).join('\n');
  return { text, cards };
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
  // ưu tiên món đang Giờ vàng (khoảng 70% lần chọn nếu có), vẫn còn ngẫu nhiên để không lặp mãi một món
  const onSale = items.filter((p) => p.deal);
  const pool = onSale.length && Math.random() < 0.7 ? onSale : items;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const card = shortCard('food', chosen);
  return {
    text: `Chọn ngẫu nhiên trong ${items.length} món: ${card.title} — ${fmt(card.price)}${card.unit ? '/' + card.unit : ''}${card.sellerName ? ` (${card.sellerName})` : ''}${card.dealLabel ? ` · đang ${card.dealLabel.toLowerCase()}, giá gốc ${fmt(card.originalPrice)}, ${remaining(card.dealEndsAt)}` : ''}`,
    cards: [card],
  };
}

module.exports = { ORDER_LABEL, fmt, shortCard, remaining, hhmm, pickInt, myOrders, pickDish, dealsNow };
