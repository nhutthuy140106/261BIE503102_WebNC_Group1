import { Injectable, computed, signal } from '@angular/core';
import { LatLng, TRACKING_PHASE_TITLE, TrackingPhase, TrackingSnapshot } from '../models/tracking';
import { distanceKm, interpolate } from '../utils/tracking-route';

// Toạ độ mẫu ở TP.HCM: cửa hàng và nhà người mua cách nhau khoảng 2,5 km
export const SHOP_POS: LatLng = [10.7873, 106.7052];
export const HOME_POS: LatLng = [10.8046, 106.7215];
const COURIER_OFFSET: LatLng = [-0.0044, -0.0049];

const TO_SHOP_POINTS = 8;
const TO_HOME_POINTS = 25;
const SLOW_MS = 1200;
const FAST_MS = 110;
const HOLD_TICKS = 3;
/** Mỗi điểm trên tuyến ≈ 0,3 phút (xe máy ~20 km/h trên 2,5 km chia 25 điểm) */
const KMH = 20;

/**
 * Mô phỏng người giao chạy theo tuyến giả lập (KHÔNG GPS, không máy chủ).
 * Mỗi nhịp đi một điểm: người giao → cửa hàng → chờ lấy hàng → nhà người mua.
 * Tiến trình lưu theo mã đơn ở localStorage để tải lại trang không mất. Cấp riêng cho từng component (providers).
 */
@Injectable()
export class DeliverySimulator {
  /** Toàn tuyến: đoạn tới cửa hàng rồi đoạn giao tới nhà (điểm cửa hàng chỉ tính một lần) */
  path: LatLng[] = this.build(SHOP_POS, HOME_POS);
  /** Km còn lại tới nhà tại từng điểm của `path` */
  private left: number[] = this.leftKm();
  readonly shopIndex = TO_SHOP_POINTS - 1;
  lastIndex = this.path.length - 1;

  private readonly state = signal<TrackingSnapshot>({ cursor: 0, hold: 0, picked: false });
  private readonly fastMode = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;
  private key = '';

  readonly cursor = computed(() => this.state().cursor);
  readonly fast = this.fastMode.asReadonly();
  readonly position = computed<LatLng>(() => this.path[this.state().cursor]);
  readonly phase = computed<TrackingPhase>(() => {
    const s = this.state();
    if (s.cursor >= this.lastIndex) return 'done';
    if (s.hold > 0) return 'pickedUp';
    return s.cursor < this.shopIndex || !s.picked ? 'toShop' : 'delivering';
  });
  readonly title = computed(() => TRACKING_PHASE_TITLE[this.phase()]);
  readonly etaMinutes = computed(() => (this.phase() === 'done' ? 0 : Math.max(1, Math.ceil((this.remainingKm() / KMH) * 60))));
  /** Khoảng cách còn lại từ người giao tới nhà người mua (km) */
  readonly remainingKm = computed(() => this.left[this.state().cursor] ?? 0);

  /** Bắt đầu cho đơn `orderId` với cửa hàng/nhà cụ thể; khôi phục tiến trình đã lưu nếu có. */
  start(orderId: string, shop: LatLng = SHOP_POS, home: LatLng = HOME_POS): void {
    this.stop();
    this.path = this.build(shop, home);
    this.left = this.leftKm();
    this.lastIndex = this.path.length - 1;
    this.key = 'antgo_track_' + orderId;
    this.state.set(this.read());
    this.run();
  }

  /** Tua nhanh để xem hết luồng trong vài giây. */
  toggleFast(): void {
    this.fastMode.update((v) => !v);
    this.run();
  }

  /** Chạy lại từ đầu. */
  reset(): void {
    this.state.set({ cursor: 0, hold: 0, picked: false });
    this.persist();
    this.run();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private build(shop: LatLng, home: LatLng): LatLng[] {
    const start: LatLng = [shop[0] + COURIER_OFFSET[0], shop[1] + COURIER_OFFSET[1]];
    return [...interpolate(start, shop, TO_SHOP_POINTS, 3), ...interpolate(shop, home, TO_HOME_POINTS, 7).slice(1)];
  }

  private leftKm(): number[] {
    const out = new Array<number>(this.path.length).fill(0);
    for (let i = this.path.length - 2; i >= 0; i--) out[i] = out[i + 1] + distanceKm(this.path[i], this.path[i + 1]);
    return out;
  }

  private run(): void {
    this.stop();
    if (this.phase() === 'done') return;
    this.timer = setInterval(() => this.tick(), this.fastMode() ? FAST_MS : SLOW_MS);
  }

  private tick(): void {
    const s = this.state();
    if (s.hold > 0) {
      this.state.set({ ...s, hold: s.hold - 1, picked: s.hold === 1 ? true : s.picked });
    } else if (s.cursor === this.shopIndex && !s.picked) {
      this.state.set({ ...s, hold: HOLD_TICKS }); // tới cửa hàng: đứng chờ lấy hàng vài nhịp
    } else {
      this.state.set({ ...s, cursor: Math.min(s.cursor + 1, this.lastIndex) });
    }
    this.persist();
    if (this.phase() === 'done') this.stop();
  }

  private read(): TrackingSnapshot {
    try {
      const s = JSON.parse(localStorage.getItem(this.key) ?? 'null') as TrackingSnapshot | null;
      if (s && Number.isInteger(s.cursor) && s.cursor >= 0 && s.cursor <= this.lastIndex) return { cursor: s.cursor, hold: Math.max(0, s.hold | 0), picked: !!s.picked };
    } catch {
      /* dữ liệu hỏng: chạy lại từ đầu */
    }
    return { cursor: 0, hold: 0, picked: false };
  }

  private persist(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.state()));
    } catch {
      /* trình duyệt chặn lưu: bỏ qua */
    }
  }
}
