import { Injectable, signal } from '@angular/core';

/**
 * Đồng hồ dùng chung (nhích mỗi giây) cho Giờ vàng: hết giờ thì mọi chỗ hiện giá tự về giá gốc, không cần tải lại.
 * Giả lập giờ để demo/chụp ảnh: thêm `?now=HH:mm` vào địa chỉ (giờ Việt Nam); đồng hồ vẫn chạy tiếp từ mốc đó.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly offset = this.readOffset();
  private readonly _now = signal(Date.now() + this.offset);
  readonly now = this._now.asReadonly();

  constructor() {
    setInterval(() => this._now.set(Date.now() + this.offset), 1000);
  }

  /** Giờ giả lập (nếu có) có đang bật không — để hiện nhãn "Giờ giả lập" */
  get simulated(): boolean {
    return this.offset !== 0;
  }

  private readOffset(): number {
    try {
      const q = new URLSearchParams(location.search).get('now');
      if (q !== null) sessionStorage.setItem('antgo_now', q);
      const v = q ?? sessionStorage.getItem('antgo_now');
      const m = v ? /^(\d{1,2}):(\d{2})$/.exec(v) : null;
      if (!m) return 0;
      const real = new Date(Date.now() + 7 * 3600e3); // giờ VN hiện tại (đọc bằng getUTC*)
      const target = (Number(m[1]) * 60 + Number(m[2])) * 60000;
      const cur = (real.getUTCHours() * 60 + real.getUTCMinutes()) * 60000 + real.getUTCSeconds() * 1000;
      return target - cur;
    } catch {
      return 0;
    }
  }
}
