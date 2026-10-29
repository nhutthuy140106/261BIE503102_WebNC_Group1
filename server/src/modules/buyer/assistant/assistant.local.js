const catalog = require('../catalog/catalog.service');
const { stripAccents } = require('../../../utils/text');
const tools = require('./assistant.tools');

/**
 * Trợ lý tư vấn "cơ bản": không gọi AI bên ngoài, miễn phí, luôn chạy được.
 * Cách làm: (1) hiểu câu hỏi bằng quy tắc — loại bài, khoảng giá, bữa ăn, từ khóa; (2) lấy bài đang mở từ kho dữ liệu
 * bằng chính các hàm tìm kiếm của catalog; (3) chấm điểm theo độ khớp từ khóa và xếp hạng; (4) trả lời bằng mẫu câu.
 * Cùng định dạng trả về với bản Gemini: { reply, cards }.
 */

const TYPE_WORDS = {
  food: ['an', 'com', 'pho', 'bun', 'mi', 'banh', 'chao', 'xoi', 'mon', 'doi', 'bua', 'tra', 'sua', 'nuoc', 'cafe', 'uong', 'mat', 'khat', 'salad', 'canh', 'tra sua', 'ca phe', 'do an', 'do uong', 'thuc an', 'nau'],
  goods: ['mua', 'do dung', 'tai nghe', 'sofa', 'xe dap', 'ghe', 'tu lanh', 'ban ghe', 'quat', 'noi chien', 'dien thoai', 'laptop', 'do cu', 'thanh ly'],
  service: ['dich vu', 'giat', 'say', 'don nha', 've sinh', 'sua', 'tho', 'giao nhan', 'lay ho', 'mua ho', 'may lanh', 'dien nuoc'],
  job: ['viec', 'kiem them', 'lam them', 'nhan viec', 'cong viec', 'dat chung', 'viec vat', 'dat cho', 'dat meo', 'cho meo', 'dan cho', 'khieng', 'tuoi cay'],
};
const MEAL = {
  sang: ['pho', 'banh mi', 'chao', 'xoi', 'ca phe', 'bun'],
  trua: ['com', 'bun', 'mi', 'canh', 'pho'],
  toi: ['com', 'bun', 'mi', 'canh', 'salad'],
  uong: ['tra', 'nuoc', 'ca phe', 'sinh to', 'sua', 'ep'],
};
const STOP = new Set(['toi', 'nay', 'gi', 'co', 'khong', 'cho', 'minh', 'muon', 'can', 'tim', 'nhe', 'a', 'oi', 'la', 'duoc', 'nao', 'nhung', 'cua', 'va', 'o', 'tu', 'den', 'duoi', 'tren', 'khoang', 'tam', 'k', 'nghin', 'ngan', 'dong', 'd', 'tr', 'trieu', 'mot', 'it', 'nhieu', 'hay', 'giup', 'goi', 'y', 'the', 'ban', 'ban oi', 'hom', 'nhi', 'voi', 'thi', 'se', 'dang', 'nhat', 're', 'ngon', 'tot', 'gan', 'quanh', 'khu', 'block', 'o day', 'gium', 'xin', 'chao', 'hi', 'hello', 'mua', 'nguoi', 'nua', 'hon', 'them', 'khac', 'gi do']);

const PICK_STOP = new Set(['chua', 'biet', 'an', 'mon', 'chon', 'giup', 'ho', 'dum', 'dai', 'cho', 'ngau', 'nhien', 'quay', 'random', 'phan', 'van', 'cung', 'duoc', 'khac']);

const num = (n, unit) => {
  const v = parseFloat(String(n).replace(',', '.'));
  if (!isFinite(v)) return undefined;
  if (/^(tr|trieu)$/.test(unit || '')) return Math.round(v * 1e6);
  if (/^(k|nghin|ngan)$/.test(unit || '') || v < 1000) return Math.round(v * 1000);
  return Math.round(v);
};
const NUM = '(\\d+(?:[.,]\\d+)?)\\s*(k|nghin|ngan|tr|trieu|d|dong)?';

/** Đọc câu hỏi → { type, minPrice, maxPrice, area, meal, tokens, intent } */
function parse(raw) {
  const t = stripAccents(raw).replace(/[^\p{L}\p{N}\s.,]/gu, ' ').replace(/\s+/g, ' ').trim();
  const out = { cheaper: /\b(re hon|re nua|mac qua|re re|giam gia)\b/.test(t), type: undefined, minPrice: undefined, maxPrice: undefined, area: undefined, meal: undefined, tokens: [], intent: 'search' };

  if (/^(xin )?chao\b|^hi\b|^hello\b|^alo\b/.test(t) && t.split(' ').length <= 4) out.intent = 'greet';
  else if (/\b(cam on|thanks|thank)\b/.test(t)) out.intent = 'thanks';
  else if (/(dang giam gia|giam gia gi|khuyen mai|gio vang|uu dai|\bsale\b|\bdeal\b|giam bao nhieu)/.test(t)) out.intent = 'deals';
  else if (/(giup duoc gi|lam duoc gi|ban la ai|huong dan|cach dung)/.test(t)) out.intent = 'help';
  else if (/(don (hang )?(cua )?(toi|minh)|kiem tra don|tra cuu don|don (dang|toi) (dat|giao|den)|don den dau|xem don)/.test(t)) out.intent = 'orders';
  // chưa biết ăn gì / ăn gì cũng được → chuyển sang trang Quay món; "chọn giúp tôi món…" thì chọn ngay một món
  else if (/((chua|khong|ko) biet (hom nay |nay |toi nay |trua nay |bua nay )?an gi|an gi (cung )?duoc|gi cung duoc|an gi day|an gi bay gio|phan van|quay mon|quay (di|giup)|sao cung duoc|tuy (ban|y|co))/.test(t)) out.intent = 'spin';
  else if (/(chon (giup|ho|dum|dai|cho)|ngau nhien|random)/.test(t)) out.intent = 'pick';
  else if (/(ca ngay|1 ngay|mot ngay|3 bua|ba bua|thuc don)/.test(t) && /\d/.test(t)) out.intent = 'plan';

  let m;
  if ((m = t.match(new RegExp(`tu\\s+${NUM}\\s+(?:den|toi)\\s+${NUM}`)))) {
    out.minPrice = num(m[1], m[2] || m[4]); out.maxPrice = num(m[3], m[4]);
  } else if ((m = t.match(new RegExp(`(?:duoi|toi da|khong qua|re hon|<)\\s*${NUM}`)))) out.maxPrice = num(m[1], m[2]);
  else if ((m = t.match(new RegExp(`(?:tren|hon|toi thieu|>)\\s*${NUM}`)))) out.minPrice = num(m[1], m[2]);
  else if ((m = t.match(new RegExp(`(?:khoang|tam|co)\\s*${NUM}`)))) { const v = num(m[1], m[2]); out.minPrice = Math.round(v * 0.6); out.maxPrice = Math.round(v * 1.3); }
  else if ((m = t.match(/\b(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu)\b/))) out.maxPrice = num(m[1], m[2]);

  if ((m = t.match(/\bblock\s*([abcd])\b/))) out.area = m[1].toUpperCase();

  if (/\bsang\b/.test(t)) out.meal = 'sang';
  else if (/\btrua\b/.test(t)) out.meal = 'trua';
  else if (/\b(bua toi|toi nay|an toi|buoi toi|chieu)\b/.test(t)) out.meal = 'toi';
  else if (/\b(uong|mat|giai khat|khat nuoc)\b/.test(t)) out.meal = 'uong';

  const padded = ` ${t} `;
  const score = { food: 0, goods: 0, service: 0, job: 0 };
  for (const [k, words] of Object.entries(TYPE_WORDS)) for (const w of words) if (padded.includes(` ${w} `)) score[k] += w.includes(' ') ? 2 : 1;
  if (out.meal) score.food += 2;
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (best[1] > 0) out.type = best[0];

  out.tokens = t.split(' ').filter((w) => w.length >= 2 && !/^\d/.test(w) && !STOP.has(w));
  return out;
}

const fmt = (n) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

const toCard = (kind, p) => ({
  id: String(p._id), kind,
  title: p.title,
  price: kind === 'job' ? p.pay : (p.deal ? p.deal.price : p.price),
  ...(kind !== 'job' && p.deal ? { originalPrice: p.deal.original, dealLabel: p.deal.label, dealEndsAt: p.deal.endsAt } : {}),
  unit: p.unit || undefined,
  sellerName: (p.seller || p.poster || {}).name || '',
  area: (p.seller || p.poster || {}).area || p.area || '',
  image: kind === 'job' ? undefined : (p.images || [])[0],
  slug: p.slug,
});

// Khớp theo TỪ nguyên vẹn (tránh "tai" khớp nhầm trong "nhai"); cụm nhiều từ ("ca phe") khớp theo cụm
function scoreOf(hay, tokens, extra) {
  const padded = ` ${hay.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ')} `;
  const has = (w) => padded.includes(` ${w} `);
  let s = 0;
  for (const w of tokens) if (has(w)) s += 2;
  for (const w of extra) if (has(w)) s += 1;
  return s;
}

async function candidates(q) {
  const common = { limit: 100 };
  if (q.type === 'job') return { posts: [], jobs: (await catalog.listJobs({ ...common, area: q.area })).items };
  if (q.type) return { posts: (await catalog.listPosts({ ...common, type: q.type, area: q.area })).items, jobs: [] };
  const posts = (await catalog.listPosts({ ...common, area: q.area })).items;
  return { posts, jobs: [] };
}

/** "Ngân sách 150k cho cả ngày": chọn một món mỗi bữa sáng/trưa/tối, mỗi bữa không quá 1/3 ngân sách, tổng ≤ ngân sách. */
async function plan(q) {
  const total = q.maxPrice;
  if (!total) return { reply: 'Bạn cho mình biết ngân sách cho cả ngày (ví dụ "ngân sách 150k cho cả ngày") để mình lên thực đơn nhé.', cards: [] };
  const cap = Math.round(total / 3);
  const meals = [['sang', 'Sáng'], ['trua', 'Trưa'], ['toi', 'Tối']];
  const items = (await catalog.listPosts({ type: 'food', limit: 100, maxPrice: cap })).items;
  const cards = []; const lines = []; let sum = 0;
  for (const [m, label] of meals) {
    const hit = items.filter((p) => scoreOf(stripAccents(`${p.title} ${p.description || ''} ${p.category || ''}`), [], MEAL[m]) > 0 && !cards.some((c) => c.id === String(p._id)));
    const pool = hit.length ? hit : items.filter((p) => !cards.some((c) => c.id === String(p._id)));
    if (!pool.length) continue;
    const c = toCard('food', pool[Math.floor(Math.random() * pool.length)]);
    cards.push(c); sum += c.price; lines.push(`• ${label}: ${c.title} — ${fmt(c.price)}`);
  }
  if (!cards.length) return { reply: `Với ngân sách ${fmt(total)} mình chưa tìm được món phù hợp. Bạn thử nâng ngân sách nhé.`, cards: [] };
  return { reply: `Thực đơn cả ngày trong ngân sách ${fmt(total)} (tổng ${fmt(sum)}):\n${lines.join('\n')}\nBấm thẻ để xem và đặt từng món nhé.`, cards };
}

/** Trả lời một câu hỏi. `prev` là câu hỏi trước đó của người dùng (để hiểu câu nối tiếp như "rẻ hơn"). */
async function answerCore(text, prev, user) {
  let q = parse(text);

  if (q.intent === 'greet') return { reply: 'Chào bạn! Mình là trợ lý AntGo. Bạn muốn tìm món ăn, đồ uống, đồ dùng, dịch vụ hay việc làm trong khu? Cứ nói ngân sách hoặc món bạn thích nhé.', cards: [] };
  if (q.intent === 'thanks') return { reply: 'Không có chi! Cần tìm gì thêm cứ hỏi mình nhé.', cards: [] };
  if (q.intent === 'help') return { reply: 'Mình gợi ý món ăn, đồ uống, đồ dùng, dịch vụ và việc làm từ các bài đang có trong khu. Thử hỏi: "đang giảm giá gì", "trưa nay ăn gì dưới 50k", "có trà sữa không", "cần người dọn nhà", "việc vặt kiếm thêm".', cards: [] };

  if (q.intent === 'deals') {
    const r = await tools.dealsNow({ type: ['food', 'goods', 'service'].includes(q.type) ? q.type : undefined, area: q.area });
    return { reply: r.cards.length ? `${r.text}
Bấm vào thẻ bên dưới để xem và đặt trong giờ giảm nhé.` : r.text, cards: r.cards };
  }
  if (q.intent === 'spin') {
    return { reply: 'Chưa biết ăn gì à? Để mình đưa bạn sang trang Quay món — bấm quay là AntGo chọn món giúp bạn nhé!', cards: [], action: { type: 'navigate', to: '/quay-mon', label: 'Mở Quay món' } };
  }
  if (q.intent === 'orders') {
    const r = await tools.myOrders(user, /(lich su|da xong|da giao|da huy)/.test(stripAccents(text)) ? 'history' : 'active');
    return { reply: r.cards.length || /•/.test(r.text) ? `Đơn của bạn:
${r.text}
Xem chi tiết ở mục Đơn hàng nhé.` : r.text, cards: [] };
  }
  if (q.intent === 'pick') {
    const kw = q.tokens.filter((w) => !PICK_STOP.has(w)).join(' ') || undefined;
    let r = await tools.pickDish({ q: kw, max_price: q.maxPrice, min_price: q.minPrice, area: q.area });
    if (!r.cards.length && kw) r = await tools.pickDish({ max_price: q.maxPrice, min_price: q.minPrice, area: q.area }); // từ khóa lạ thì bỏ
    return { reply: r.cards.length ? `Hôm nay thử món này nhé:
${r.text.replace(/^Chọn ngẫu nhiên trong \d+ món: /, '• ')}
Chưa ưng thì nói "chọn món khác" hoặc mở trang Quay món.` : r.text, cards: r.cards };
  }
  if (q.intent === 'plan') return plan(q);

  // Câu nối tiếp không có từ khóa/loại ("rẻ hơn", "dưới 30k thôi"): mượn loại + từ khóa của câu trước
  if (prev && !q.type && !q.tokens.length) {  // gồm cả "rẻ hơn", "dưới 30k thôi"
    const p = parse(prev);
    q = { ...p, cheaper: q.cheaper, minPrice: q.minPrice ?? p.minPrice, maxPrice: q.maxPrice ?? p.maxPrice, area: q.area || p.area };
  }

  const extra = q.meal ? MEAL[q.meal] : [];
  const { posts, jobs } = await candidates(q);
  const rows = [
    ...posts.map((p) => ({ kind: p.type, p, price: p.deal ? p.deal.price : p.price })), // giá thực trả (đã Giờ vàng)
    ...jobs.map((j) => ({ kind: 'job', p: j, price: j.pay })),
  ].map((r) => ({ ...r, hay: stripAccents(`${r.p.title} ${r.p.description || r.p.desc || ''} ${r.p.category || ''}`), s: 0 }));
  rows.forEach((r) => { r.s = scoreOf(r.hay, q.tokens, extra) + (q.area && r.p.area === q.area ? 1 : 0); });

  const wantsKeyword = q.tokens.length > 0 || extra.length > 0;
  const priced = rows.filter((r) => (q.minPrice === undefined || r.price >= q.minPrice) && (q.maxPrice === undefined || r.price <= q.maxPrice));
  const rank = (list) => {
    const hit = list.filter((r) => !wantsKeyword || r.s > 0);
    const best = Math.max(0, ...hit.map((r) => r.s));
    // chỉ giữ bài khớp từ ít nhất một nửa bài khớp nhất, tránh lẫn kết quả lạc đề
    return hit
      .filter((r) => !wantsKeyword || r.s >= best / 2)
      .sort((a, b) => (q.cheaper ? a.price - b.price : b.s - a.s || (!!b.p.deal - !!a.p.deal) || a.price - b.price)); // ngang điểm: bài đang giảm lên trước
  };

  let pick = rank(priced);
  let relaxed = false;
  if (!pick.length && (q.minPrice !== undefined || q.maxPrice !== undefined)) { pick = rank(rows); relaxed = pick.length > 0; }
  pick = pick.slice(0, 4);

  if (!pick.length) {
    return {
      reply: wantsKeyword || q.type
        ? 'Hiện chưa có bài nào khớp với yêu cầu này. Bạn thử đổi từ khóa, nâng ngân sách hoặc bỏ bớt điều kiện nhé — hoặc hỏi "món gì đang có" để mình gợi ý.'
        : 'Bạn muốn tìm món ăn, đồ uống, đồ dùng, dịch vụ hay việc làm? Cho mình biết món hoặc ngân sách để gợi ý nhé.',
      cards: [],
      confident: false, // không khớp bài nào: câu lạ hoặc gõ sai, nhường cho AI
    };
  }

  const label = { food: 'món ăn/đồ uống', goods: 'đồ dùng', service: 'dịch vụ', job: 'việc làm' }[q.type] || 'gợi ý';
  const budget = q.maxPrice !== undefined ? (q.minPrice !== undefined ? ` trong khoảng ${fmt(q.minPrice)}–${fmt(q.maxPrice)}` : ` dưới ${fmt(q.maxPrice)}`) : q.minPrice !== undefined ? ` từ ${fmt(q.minPrice)}` : '';
  const cards = pick.map((r) => toCard(r.kind, r.p));
  const lines = cards.map((c) => `• ${c.title} — ${fmt(c.price)}${c.unit ? '/' + c.unit : ''}${c.sellerName ? ` (${c.sellerName})` : ''}`).join('\n');
  const head = relaxed
    ? `Chưa có ${label}${budget} đúng ý, nhưng đây là vài lựa chọn gần nhất:`
    : `Mình tìm được ${pick.length} ${label}${budget} cho bạn:`;
  // "Quen thuộc" = bài khớp phần lớn từ khóa, không phải nới giá, câu không quá dài; còn lại để AI xử lý
  const top = pick[0];
  const hit = q.tokens.filter((w) => scoreOf(top.hay, [w], []) > 0).length;
  const coverage = q.tokens.length ? hit / q.tokens.length : 1;
  const confident = !relaxed && coverage >= 0.6 && q.tokens.length <= 5;
  return { reply: `${head}\n${lines}\nBấm vào thẻ bên dưới để xem chi tiết và đặt nhé.`, cards, confident };
}

const KNOWN_INTENTS = new Set(['greet', 'thanks', 'help', 'orders', 'pick', 'plan', 'spin', 'deals']);

/** Trả lời bằng luật. `confident` = câu quen thuộc, bộ luật tự tin trả lời; false = nên nhờ AI. */
async function answer(text, prev, user) {
  const r = await answerCore(text, prev, user);
  if (KNOWN_INTENTS.has(parse(text).intent)) r.confident = true;
  return { ...r, confident: !!r.confident };
}

module.exports = { parse, answer };
