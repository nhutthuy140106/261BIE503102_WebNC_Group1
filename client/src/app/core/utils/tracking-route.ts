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
