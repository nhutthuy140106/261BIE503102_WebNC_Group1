import { Post, PostKind } from '../models/post';
import { AssistantCard, AssistantReply } from '../services/assistant';
import { stripAccents } from './slug-helper';

/**
 * Trợ lý chạy ngay trên trình duyệt khi dùng dữ liệu mẫu (không cần máy chủ): hiểu giá ("dưới 50k"), loại bài, bữa ăn,
 * từ khóa, rồi chấm điểm bài trong dữ liệu mẫu. Cùng định dạng trả về với máy chủ ({ reply, cards }).
 * Bản máy chủ (Gemini/Groq/bộ cơ bản) thông minh hơn — dùng khi mở `?mock=0`.
 */
const TYPE_WORDS: Record<PostKind, string[]> = {
  food: ['an', 'com', 'pho', 'bun', 'mi', 'banh', 'chao', 'xoi', 'mon', 'bua', 'tra', 'sua', 'nuoc', 'cafe', 'uong', 'mat', 'khat', 'salad', 'canh', 'do an', 'do uong', 'ca phe', 'tra sua'],
  goods: ['mua', 'do dung', 'tai nghe', 'sofa', 'xe dap', 'ghe', 'quat', 'noi chien', 'dien thoai', 'laptop', 'do cu', 'thanh ly'],
  service: ['dich vu', 'giat', 'say', 'don nha', 've sinh', 'sua', 'tho', 'giao nhan', 'lay ho', 'mua ho', 'may lanh'],
  job: ['viec', 'kiem them', 'lam them', 'nhan viec', 'cong viec', 'viec vat', 'dat cho', 'dat meo', 'gia su'],
};
const MEAL: Record<string, string[]> = {
  sang: ['pho', 'banh mi', 'chao', 'xoi', 'ca phe', 'bun'],
  trua: ['com', 'bun', 'mi', 'canh', 'pho'],
  toi: ['com', 'bun', 'mi', 'canh', 'salad'],
  uong: ['tra', 'nuoc', 'ca phe', 'sinh to', 'sua'],
};
const STOP = new Set(['toi', 'nay', 'gi', 'co', 'khong', 'cho', 'minh', 'muon', 'can', 'tim', 'nhe', 'a', 'oi', 'la', 'duoc', 'nao', 'va', 'o', 'duoi', 'tren', 'khoang', 'tam', 'k', 'mot', 'hay', 'giup', 'goi', 'y', 'ban', 'voi', 'thi', 're', 'hon', 'ngon', 'mat', 'chon', 'mon', 'xin', 'chao', 'hi']);

const fmt = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

function parsePrice(t: string): { min?: number; max?: number } {
  const num = (v: string, unit?: string) => {
    const x = parseFloat(v.replace(',', '.'));
    if (!isFinite(x)) return undefined;
    if (unit === 'tr' || unit === 'trieu') return Math.round(x * 1e6);
    return unit === 'k' || unit === 'nghin' || unit === 'ngan' || x < 1000 ? Math.round(x * 1000) : Math.round(x);
  };
  const N = '(\\d+(?:[.,]\\d+)?)\\s*(k|nghin|ngan|tr|trieu)?';
  let m = t.match(new RegExp(`tu\\s+${N}\\s+(?:den|toi)\\s+${N}`));
  if (m) return { min: num(m[1], m[2] ?? m[4]), max: num(m[3], m[4]) };
  m = t.match(new RegExp(`(?:duoi|toi da|khong qua|re hon|<)\\s*${N}`));
  if (m) return { max: num(m[1], m[2]) };
  m = t.match(new RegExp(`(?:tren|hon|toi thieu|>)\\s*${N}`));
  if (m) return { min: num(m[1], m[2]) };
  m = t.match(new RegExp(`(?:khoang|tam)\\s*${N}`));
  if (m) {
    const v = num(m[1], m[2]) ?? 0;
    return { min: Math.round(v * 0.6), max: Math.round(v * 1.3) };
  }
  m = t.match(/\b(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu)\b/);
  return m ? { max: num(m[1], m[2]) } : {};
}

function toCard(p: Post): AssistantCard {
  return { id: p._id, kind: p.kind, title: p.title, price: p.price, unit: p.priceUnit, sellerName: p.sellerName, area: p.block.replace('Block ', ''), image: p.images?.[0] };
}

export function localAssistant(text: string, prev: string | undefined, posts: Post[], orderLines: string[]): AssistantReply {
  const t = stripAccents(text).replace(/[^a-z0-9\s.,<>]/g, ' ').replace(/\s+/g, ' ').trim();
  const padded = ` ${t} `;

  if (/^(xin )?chao\b|^hi\b|^hello\b/.test(t) && t.split(' ').length <= 4) {
    return { reply: 'Chào bạn! Mình là trợ lý AntGo. Bạn muốn tìm món ăn, đồ uống, đồ dùng, dịch vụ hay việc làm trong khu? Cứ nói món hoặc ngân sách nhé.', cards: [] };
  }
  if (/\b(cam on|thanks)\b/.test(t)) return { reply: 'Không có chi! Cần tìm gì thêm cứ hỏi mình nhé.', cards: [] };
  if (/(don (hang )?(cua )?(toi|minh)|kiem tra don|xem don)/.test(t)) {
    return { reply: orderLines.length ? `Đơn của bạn:\n${orderLines.join('\n')}\nXem chi tiết ở mục Đơn hàng nhé.` : 'Bạn chưa có đơn nào đang diễn ra.', cards: [] };
  }

  let { min, max } = parsePrice(t);
  const wantsCheaper = /\b(re hon|re nua|mac qua)\b/.test(t);
  const pick = /(chon (giup|ho|dum|dai)|quay mon|ngau nhien|an gi cung duoc|(chua|khong) biet an gi|phan van)/.test(t);

  // phân loại bài
  const score: Record<PostKind, number> = { food: 0, goods: 0, service: 0, job: 0 };
  for (const [k, words] of Object.entries(TYPE_WORDS) as [PostKind, string[]][]) for (const w of words) if (padded.includes(` ${w} `)) score[k] += w.includes(' ') ? 2 : 1;
  const meal = /\bsang\b/.test(t) ? 'sang' : /\btrua\b/.test(t) ? 'trua' : /(bua toi|toi nay|buoi toi)/.test(t) ? 'toi' : /(uong|mat|giai khat)/.test(t) ? 'uong' : undefined;
  if (meal) score.food += 2;
  if (pick) score.food += 3;
  const best = (Object.entries(score) as [PostKind, number][]).sort((a, b) => b[1] - a[1])[0];
  let kind: PostKind | undefined = best[1] > 0 ? best[0] : undefined;
  let tokens = t.split(' ').filter((w) => w.length >= 2 && !/^\d/.test(w) && !STOP.has(w));

  // câu nối tiếp ("rẻ hơn", "dưới 30k thôi"): mượn loại + từ khóa của câu trước
  if (prev && !kind && !tokens.length) {
    const p = localParse(prev);
    kind = p.kind;
    tokens = p.tokens;
    min = min ?? p.min;
    max = max ?? p.max;
  }

  const extra = meal ? MEAL[meal] : [];
  const rows = posts
    .filter((p) => !p.closed && (!kind || p.kind === kind))
    .map((p) => {
      const hay = ` ${stripAccents(`${p.title} ${p.description} ${p.category ?? ''}`).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
      let s = 0;
      for (const w of tokens) if (hay.includes(` ${w} `)) s += 2;
      for (const w of extra) if (hay.includes(` ${w} `)) s += 1;
      return { p, s };
    });
  const wantsKeyword = !pick && (tokens.length > 0 || extra.length > 0);
  const inBudget = rows.filter(({ p }) => (min === undefined || p.price >= min) && (max === undefined || p.price <= max));
  const rank = (list: typeof rows) => {
    const hit = list.filter((r) => !wantsKeyword || r.s > 0);
    const top = Math.max(0, ...hit.map((r) => r.s));
    return hit.filter((r) => !wantsKeyword || r.s >= top / 2).sort((a, b) => (wantsCheaper ? a.p.price - b.p.price : b.s - a.s || a.p.price - b.p.price));
  };

  let list = rank(inBudget);
  let relaxed = false;
  if (!list.length && (min !== undefined || max !== undefined)) {
    list = rank(rows);
    relaxed = list.length > 0;
  }
  if (pick && list.length) list = [list[Math.floor(Math.random() * list.length)]];
  list = list.slice(0, 4);

  if (!list.length) {
    return {
      reply: wantsKeyword || kind
        ? 'Hiện chưa có bài nào khớp với yêu cầu này. Bạn thử đổi từ khóa, nâng ngân sách hoặc bỏ bớt điều kiện nhé.'
        : 'Bạn muốn tìm món ăn, đồ uống, đồ dùng, dịch vụ hay việc làm? Cho mình biết món hoặc ngân sách để gợi ý nhé.',
      cards: [],
    };
  }
  const cards = list.map((r) => toCard(r.p));
  const label = { food: 'món ăn/đồ uống', goods: 'đồ dùng', service: 'dịch vụ', job: 'việc làm' }[kind ?? 'food'] ?? 'gợi ý';
  const budget = max !== undefined ? (min !== undefined ? ` trong khoảng ${fmt(min)}–${fmt(max)}` : ` dưới ${fmt(max)}`) : min !== undefined ? ` từ ${fmt(min)}` : '';
  const lines = cards.map((c) => `• ${c.title} — ${fmt(c.price)}${c.unit ? '/' + c.unit : ''}${c.sellerName ? ` (${c.sellerName})` : ''}`).join('\n');
  const head = pick ? 'Hôm nay thử món này nhé:' : relaxed ? `Chưa có ${label}${budget} đúng ý, nhưng đây là vài lựa chọn gần nhất:` : `Mình tìm được ${cards.length} ${label}${budget} cho bạn:`;
  return { reply: `${head}\n${lines}\nBấm vào thẻ bên dưới để xem chi tiết và đặt nhé.`, cards };
}

/** Đọc nhanh câu hỏi trước để mượn loại/từ khóa/giá. */
function localParse(text: string): { kind?: PostKind; tokens: string[]; min?: number; max?: number } {
  const t = stripAccents(text).replace(/[^a-z0-9\s.,<>]/g, ' ').replace(/\s+/g, ' ').trim();
  const padded = ` ${t} `;
  const score: Record<PostKind, number> = { food: 0, goods: 0, service: 0, job: 0 };
  for (const [k, words] of Object.entries(TYPE_WORDS) as [PostKind, string[]][]) for (const w of words) if (padded.includes(` ${w} `)) score[k] += 1;
  const best = (Object.entries(score) as [PostKind, number][]).sort((a, b) => b[1] - a[1])[0];
  return { kind: best[1] > 0 ? best[0] : undefined, tokens: t.split(' ').filter((w) => w.length >= 2 && !/^\d/.test(w) && !STOP.has(w)), ...parsePrice(t) };
}
