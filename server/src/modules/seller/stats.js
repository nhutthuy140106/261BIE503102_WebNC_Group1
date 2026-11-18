// Số liệu "Hiệu quả" của người bán, tính từ dữ liệu thật. Hàm thuần (không đụng DB) để kiểm tra bằng test.
// Trả đúng hình dạng FE đang đọc (SellerStats): 5 mốc today · 7 · 30 · 90 · year.
const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const TYPE_INDEX = { food: 0, goods: 1, service: 2 };

const up = (cur, prev) => {
  if (!prev) return cur ? '+100%' : '0%';
  const d = Math.round(((cur - prev) / prev) * 100);
  return `${d >= 0 ? '+' : '−'}${Math.abs(d)}%`;
};
const decimal = (n) => n.toFixed(1).replace('.', ',');

/** Khoảng [from, to) của mốc hiện tại, mốc liền trước, và các cột biểu đồ */
function windows(range, now, doneHours = []) {
  const S = startOfDay(now);
  if (range === 'today') {
    // biểu đồ mặc định 7–21 giờ; có đơn xong ngoài khung đó thì kéo rộng ra để tổng các cột luôn bằng thu nhập
    const first = Math.min(7, ...doneHours);
    const last = Math.max(21, ...doneHours);
    return {
      label: 'Hôm nay', unit: 'giờ', cur: [S, addDays(S, 1)], prev: [addDays(S, -1), S],
      buckets: Array.from({ length: last - first + 1 }, (_, i) => ({ x: `${first + i}h`, from: new Date(S.getTime() + (first + i) * 3600000), to: new Date(S.getTime() + (first + i + 1) * 3600000) })),
    };
  }
  if (range === '7') {
    return {
      label: '7 ngày qua', unit: 'ngày', cur: [addDays(S, -6), addDays(S, 1)], prev: [addDays(S, -13), addDays(S, -6)],
      buckets: Array.from({ length: 7 }, (_, i) => { const d = addDays(S, -6 + i); return { x: WEEKDAY[d.getDay()], from: d, to: addDays(d, 1) }; }),
    };
  }
  if (range === '30') {
    const A = addDays(S, -29);
    const edges = [0, 7, 14, 21, 28, 30];
    return {
      label: '30 ngày qua', unit: 'tuần', cur: [A, addDays(S, 1)], prev: [addDays(S, -59), A],
      buckets: edges.slice(0, 5).map((e, i) => ({ x: i === 4 ? 'Tuần này' : `Tuần ${i + 1}`, from: addDays(A, e), to: addDays(A, edges[i + 1]) })),
    };
  }
  if (range === '90') {
    const A = addDays(S, -89);
    const buckets = [];
    for (let m = new Date(A.getFullYear(), A.getMonth(), 1); m <= S; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      buckets.push({ x: `Tháng ${m.getMonth() + 1}`, from: m < A ? A : m, to: next > addDays(S, 1) ? addDays(S, 1) : next });
    }
    return { label: '3 tháng qua', unit: 'tháng', cur: [A, addDays(S, 1)], prev: [addDays(S, -179), A], buckets };
  }
  const Y = new Date(now.getFullYear(), 0, 1);
  const buckets = [];
  for (let m = 0; m <= now.getMonth(); m++) buckets.push({ x: `T${m + 1}`, from: new Date(now.getFullYear(), m, 1), to: m === now.getMonth() ? addDays(S, 1) : new Date(now.getFullYear(), m + 1, 1) });
  return { label: 'Năm nay', unit: 'tháng', cur: [Y, addDays(S, 1)], prev: [new Date(now.getFullYear() - 1, 0, 1), new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 1)], buckets };
}

const within = (t, [a, b]) => t >= a && t < b;
const doneAt = (o) => { const h = (o.history || []).filter((x) => x.state === 'done').pop(); return new Date(h ? h.at : o.updatedAt || o.createdAt); };

/**
 * @param {object} d
 * @param {Array} d.orders   đơn của tôi (mọi trạng thái): { state, total, snapshot:{type}, createdAt, updatedAt, history }
 * @param {Array} d.hires    đề nghị đã hoàn thành của việc tôi đăng: { pay, at }
 * @param {Array} d.reviews  đánh giá người ta dành cho tôi: { rating, createdAt }
 * @param {Array} d.views    lượt xem bài của tôi theo ngày: { date: 'yyyy-mm-dd', count }
 * @param {Array} d.saves    thời điểm người ta lưu bài của tôi (Date)
 */
function buildStats({ orders = [], hires = [], reviews = [], views = [], saves = [] }, now = new Date()) {
  const done = orders.filter((o) => o.state === 'done').map((o) => ({ ...o, at: doneAt(o) }));
  const placed = orders.filter((o) => o.state !== 'declined').map((o) => ({ at: new Date(o.createdAt) }));
  const viewDays = views.map((v) => ({ key: v.date, n: v.count }));

  const measure = (win) => {
    const d = done.filter((o) => within(o.at, win));
    const r = reviews.filter((x) => within(new Date(x.createdAt), win));
    const h = hires.filter((x) => within(new Date(x.at), win));
    const keys = new Set(); // các ngày nằm trong khoảng, để cộng lượt xem
    for (let t = new Date(win[0]); t < win[1]; t = addDays(t, 1)) keys.add(dayKey(t));
    const mix = [0, 0, 0];
    for (const o of d) mix[TYPE_INDEX[o.snapshot && o.snapshot.type] ?? 0] += o.total || 0;
    const viewsN = viewDays.filter((v) => keys.has(v.key)).reduce((n, v) => n + v.n, 0);
    const order = placed.filter((o) => within(o.at, win)).length;
    return {
      income: d.reduce((n, o) => n + (o.total || 0), 0), done: d.length, paid: h.reduce((n, x) => n + (x.pay || 0), 0), hired: h.length,
      ratingN: r.length, ratingAvg: r.length ? r.reduce((n, x) => n + x.rating, 0) / r.length : 0,
      views: viewsN, saves: saves.filter((t) => within(new Date(t), win)).length, mix, rate: viewsN ? (order / viewsN) * 100 : 0,
    };
  };

  const out = {};
  for (const range of ['today', '7', '30', '90', 'year']) {
    const w = windows(range, now, done.filter((o) => within(o.at, [startOfDay(now), addDays(startOfDay(now), 1)])).map((o) => o.at.getHours()));
    const c = measure(w.cur);
    const p = measure(w.prev);
    out[range] = {
      label: w.label, income: c.income, incomeUp: up(c.income, p.income), paid: c.paid, paidUp: up(c.paid, p.paid), hired: c.hired, hiredUp: up(c.hired, p.hired),
      done: c.done, doneUp: up(c.done, p.done), rating: c.ratingN ? decimal(c.ratingAvg) : '—', ratingCount: c.ratingN,
      views: c.views, viewsUp: up(c.views, p.views), bookUp: `${c.rate - p.rate >= 0 ? '+' : '−'}${Math.abs(Math.round(c.rate - p.rate))}%`, saves: c.saves,
      unit: w.unit, x: w.buckets.map((b) => b.x), y: w.buckets.map((b) => done.filter((o) => within(o.at, [b.from, b.to])).reduce((n, o) => n + (o.total || 0), 0)), mix: c.mix,
    };
  }
  return out;
}

module.exports = { buildStats, windows, up, DAY };
