import { stripAccents } from './slug-helper';

/** Từ chỉ buổi/mức độ: đi kèm tên món nhưng không nằm trong tên bài ("cơm trưa" = các món cơm), nên không bắt buộc phải khớp. */
const OPTIONAL = new Set(['sang', 'trua', 'toi', 'chieu', 'nay', 'hom', 'ngon', 're', 'gan', 'nhanh', 'moi', 'tot', 'mat', 'cho', 'toi', 'can', 'tim', 'muon']);

const words = (s: string): string[] => stripAccents(s).split(/[^a-z0-9]+/).filter(Boolean);
const squash = (s: string) => s.replace(/(.)\1+/g, '$1');

function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Văn bản `text` có khớp câu tìm `query` không: không phân biệt dấu/hoa thường, mọi từ bắt buộc phải có (từ chỉ buổi như "trưa" thì không),
 * chịu gõ sai nhẹ ("coom", "gaa", sai 1–2 ký tự). Dùng cho trang kết quả tìm kiếm (cả dữ liệu mẫu lẫn API thật).
 */
export function textMatches(text: string, query: string): boolean {
  const all = words(query);
  if (!all.length) return true;
  const need = all.filter((w) => !OPTIONAL.has(w));
  const tokens = need.length ? need : all;
  const bag = words(text);
  return tokens.every((t) => {
    // khớp theo TỪ (tránh "com" dính vào "combo"); từ ≥ 4 ký tự cho phép khớp phần đầu từ ("giat" ~ "giatsay")
    return bag.some((w) => w === t || (t.length >= 4 && w.startsWith(t)) || squash(w) === squash(t) || (t.length >= 4 && w.length >= 3 && lev(t, w, t.length >= 7 ? 2 : 1) <= (t.length >= 7 ? 2 : 1)));
  });
}
