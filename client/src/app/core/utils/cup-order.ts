import type { CupDrink, CupLine } from '../models/post-template';
import { parseChoice } from './order-draft';

/** Lựa chọn của một ly: tên nhóm → các lựa chọn thô ("L|+6.000đ") */
export type CupPicks = Record<string, string[]>;

/** Mở popup: nhóm chọn một bắt buộc (size) chọn sẵn mục đầu, còn lại để trống */
export function defaultPicks(d: CupDrink): CupPicks {
  const out: CupPicks = {};
  for (const g of d.groups) out[g.name] = !g.multi && g.req !== false && g.choices[0] ? [g.choices[0]] : [];
  return out;
}

/** Đổi lựa chọn: chọn một thì bấm lại mục đang chọn để bỏ (nếu không bắt buộc), chọn nhiều thì bật / tắt */
export function togglePick(d: CupDrink, picks: CupPicks, group: string, raw: string): CupPicks {
  const g = d.groups.find((x) => x.name === group);
  if (!g) return picks;
  const cur = picks[group] ?? [];
  if (g.multi) return { ...picks, [group]: cur.includes(raw) ? cur.filter((x) => x !== raw) : [...cur, raw] };
  if (cur.includes(raw)) return g.req === false ? { ...picks, [group]: [] } : picks;
  return { ...picks, [group]: [raw] };
}

/** Nhóm chọn nhiều bắt buộc mà chưa chọn gì: trả về tên nhóm */
export function missingGroup(d: CupDrink, picks: CupPicks): string | null {
  return d.groups.find((g) => g.req !== false && !(picks[g.name] ?? []).length)?.name ?? null;
}

/** Giá một ly theo lựa chọn hiện tại */
export function cupPrice(d: CupDrink, picks: CupPicks): number {
  return d.price + d.groups.reduce((n, g) => n + (picks[g.name] ?? []).reduce((m, raw) => m + parseChoice(raw).add, 0), 0);
}

export function buildLine(d: CupDrink, picks: CupPicks, qty: number): CupLine {
  const labels = d.groups.flatMap((g) => (picks[g.name] ?? []).map((raw) => parseChoice(raw).name));
  return { drink: d.name, base: d.price, price: cupPrice(d, picks), qty, picks, text: labels.join(' · ') };
}

/** Thêm dòng vào đơn: cùng loại và cùng tùy chỉnh thì cộng số lượng. `replacing`: dòng đang sửa được thay bằng dòng mới */
export function putLine(lines: CupLine[], line: CupLine, replacing?: CupLine): CupLine[] {
  const rest = replacing ? lines.filter((x) => x !== replacing) : lines;
  const same = rest.find((x) => x.drink === line.drink && x.text === line.text);
  if (same) return rest.map((x) => (x === same ? { ...x, qty: x.qty + line.qty } : x));
  if (!replacing) return [...lines, line];
  // sửa dòng: giữ đúng vị trí cũ trong đơn
  return lines.map((x) => (x === replacing ? line : x));
}
