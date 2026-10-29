import { LatLng } from '../models/tracking';

/** Nội suy đường thẳng a → b gồm `n` điểm (kể cả hai đầu), thêm nhiễu nhỏ cố định theo `seed` để tuyến trông tự nhiên. */
export function interpolate(a: LatLng, b: LatLng, n: number, seed = 1): LatLng[] {
  const out: LatLng[] = [];
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  const len = Math.hypot(dLat, dLng) || 1;
  // vuông góc với hướng đi: nhiễu lệch sang hai bên đường chứ không làm xe chạy lùi
  const nx = -dLng / len;
  const ny = dLat / len;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    const edge = Math.sin(Math.PI * t); // hai đầu = 0 để khớp đúng cửa hàng / nhà
    const wob = (Math.sin(i * 1.7 + seed) + 0.5 * Math.sin(i * 3.1 + seed * 2)) * 0.00012 * edge;
    out.push([a[0] + dLat * t + nx * wob, a[1] + dLng * t + ny * wob]);
  }
  return out;
}

/** Khoảng cách xấp xỉ (km) giữa hai điểm — chỉ để ước lượng thời gian. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dy = (b[0] - a[0]) * 111.2;
  const dx = (b[1] - a[1]) * 111.2 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** Tâm bốn Block A–D (mẫu, TP.HCM) — cửa hàng và nhà người mua đặt quanh các tâm này nên mỗi đơn một tuyến khác nhau. */
export const BLOCK_POS: Record<string, LatLng> = {
  A: [10.7873, 106.7052],
  B: [10.7935, 106.7121],
  C: [10.8046, 106.7215],
  D: [10.7981, 106.6988],
};

/** Lấy chữ Block (A–D) trong địa chỉ, ví dụ "Căn C-0912, Block C"; không thấy thì trả `fallback`. */
export function blockOf(text: string | undefined, fallback = 'B'): string {
  const m = /block\s*([A-D])(?![A-Za-z])/i.exec(text ?? '');
  return m ? m[1].toUpperCase() : fallback;
}

/** Chọn Block ổn định theo chuỗi (dùng cho cửa hàng khi đơn chưa ghi Block của người bán). */
export function blockFromSeed(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'ABCD'[h % 4];
}

/** Điểm cụ thể trong Block: lệch nhẹ theo `seed` để hai đơn cùng Block vẫn không trùng điểm. */
export function pointIn(block: string, seed: string): LatLng {
  const c = BLOCK_POS[block] ?? BLOCK_POS['B'];
  let h = 7;
  for (const ch of seed) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return [c[0] + ((h % 21) - 10) * 0.00022, c[1] + (((h >> 5) % 21) - 10) * 0.00022];
}
