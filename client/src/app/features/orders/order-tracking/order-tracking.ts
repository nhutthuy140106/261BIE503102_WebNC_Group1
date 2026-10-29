import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { MARKER_PATH, TRACKING_PHASE_TITLE, TrackingPhase } from '../../../core/models/tracking';
import { firstValueFrom } from 'rxjs';
import { useMock } from '../../../core/config/api.config';
import { ApiService } from '../../../core/services/api';
import { DeliverySimulator } from '../../../core/services/delivery-simulator';
import { LatLng } from '../../../core/models/tracking';
import { blockFromSeed, blockOf, pointIn } from '../../../core/utils/tracking-route';
import { ToastService } from '../../../core/services/toast';

type Leaflet = typeof import('leaflet');

interface RemoteTracking {
  simulated: boolean;
  shop: { lat: number; lng: number };
  home: { lat: number; lng: number };
  courier: { lat: number; lng: number; phase: 'waiting' | 'preparing' | 'delivering' | 'delivered'; etaMin: number; distanceKm: number };
}

const icon = (cls: string, path: string) =>
  `<span class="pin ${cls}"><svg viewBox="0 0 256 256" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg></span>`;

/**
 * Theo dõi giao hàng (DEMO): bản đồ OpenStreetMap + người giao chạy giả lập theo tuyến.
 * Không dùng GPS hay máy chủ; vị trí chỉ là mô phỏng. Leaflet nạp khi cần (dynamic import) và có thông báo nếu lỗi.
 */
@Component({
  selector: 'app-order-tracking',
  standalone: false,
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.css',
  providers: [DeliverySimulator],
})
export class OrderTracking implements OnInit, AfterViewInit, OnDestroy {
  protected readonly sim = inject(DeliverySimulator);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);

  /** Máy chủ thật (?mock=0): lấy vị trí từ GET /orders/:id/tracking; ngược lại chạy giả lập tại trình duyệt */
  protected readonly real = !useMock('order');
  protected readonly remote = signal<RemoteTracking | null>(null);
  /** Đơn tự lấy / dịch vụ / đã hủy: server trả 404 NO_TRACKING → ẩn khối theo dõi */
  protected readonly noTracking = signal(false);
  private poll: ReturnType<typeof setInterval> | null = null;

  @Input({ required: true }) orderId!: string;
  @Input() shopName = 'Cửa hàng';
  @Input() address = '';
  /** Khối Block (A–D) của cửa hàng — không có thì suy ra ổn định từ tên cửa hàng */
  @Input() shopBlock = '';
  /** Trạng thái đơn: 'done' → chỉ hiện thẻ "Đã giao" thu gọn */
  @Input() status = '';

  protected shopPos: LatLng = [0, 0];
  protected homePos: LatLng = [0, 0];
  protected shopLabel = '';
  protected homeLabel = '';

  @ViewChild('map') private mapEl?: ElementRef<HTMLElement>;

  protected readonly mapError = signal(false);
  protected readonly courier = { name: 'Anh Minh', plate: '59X1-123.45' };
  protected readonly steps = [
    { key: 'toShop', label: 'Đang đến cửa hàng lấy hàng' },
    { key: 'pickedUp', label: 'Đã lấy hàng' },
    { key: 'delivering', label: 'Đang giao đến bạn' },
    { key: 'done', label: 'Hoàn tất' },
  ] as const;

  private L?: Leaflet;
  private map?: import('leaflet').Map;
  private courierMarker?: import('leaflet').Marker;
  private done?: import('leaflet').Polyline;
  private rest?: import('leaflet').Polyline;
  private flow?: import('leaflet').Polyline;

  constructor() {
    // Mỗi lần người giao nhích một điểm: cập nhật marker và hai đoạn đường (đã đi / còn lại)
    effect(() => {
      const c = this.sim.cursor();
      if (!this.L || !this.map || this.real) return;
      const path = this.sim.path;
      this.moveCourier(path[c]);
      this.done?.setLatLngs(path.slice(0, c + 1));
      this.flow?.setLatLngs(path.slice(0, c + 1));
      this.rest?.setLatLngs(path.slice(c));
    });
  }

  private tween = 0;
  private lastPos?: [number, number];

  /** Xe trượt mượt tới điểm kế (như Grab) thay vì nhảy từng điểm; lật hình xe theo hướng đi trái/phải. */
  private moveCourier(to: [number, number]): void {
    const m = this.courierMarker;
    if (!m) return;
    const from = this.lastPos ?? to;
    this.lastPos = to;
    m.getElement()?.classList.toggle('west', to[1] < from[1]);
    cancelAnimationFrame(this.tween);
    const ms = this.sim.fast() ? 100 : 1150;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      m.setLatLng([from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k]);
      if (k < 1) this.tween = requestAnimationFrame(step);
    };
    this.tween = requestAnimationFrame(step);
  }

  ngOnInit(): void {
    if (this.real) {
      this.shopLabel = 'Cửa hàng';
      this.homeLabel = 'Nhà bạn';
      return;
    }
    const sb = this.shopBlock || blockFromSeed(this.shopName);
    let hb = blockOf(this.address, 'C');
    if (hb === sb) hb = 'ABCD'[('ABCD'.indexOf(sb) + 2) % 4]; // cùng Block thì vẫn cho tuyến đủ dài để xem
    this.shopPos = pointIn(sb, this.orderId + 's');
    this.homePos = pointIn(hb, this.orderId + 'h');
    this.shopLabel = 'Block ' + sb;
    this.homeLabel = 'Block ' + hb;
    this.sim.start(this.orderId, this.shopPos, this.homePos);
  }

  protected get finished(): boolean {
    return this.status === 'done';
  }

  /** Giai đoạn hiển thị (mock: từ bộ giả lập; thật: đổi từ phase của server) */
  protected phase(): TrackingPhase {
    const r = this.remote();
    if (!this.real || !r) return this.sim.phase();
    const p = r.courier.phase;
    return p === 'delivered' ? 'done' : p === 'delivering' ? 'delivering' : 'toShop';
  }

  protected title(): string {
    return TRACKING_PHASE_TITLE[this.phase()];
  }

  protected eta(): number {
    return this.real ? (this.remote()?.courier.etaMin ?? 0) : this.sim.etaMinutes();
  }

  protected km(): number {
    return this.real ? (this.remote()?.courier.distanceKm ?? 0) : this.sim.remainingKm();
  }

  private async fetchRemote(): Promise<boolean> {
    try {
      this.remote.set(await firstValueFrom(this.api.get<RemoteTracking>('/orders/' + this.orderId + '/tracking')));
      return true;
    } catch {
      this.noTracking.set(true); // 404 NO_TRACKING hoặc lỗi mạng: ẩn khối, không làm hỏng trang đơn
      return false;
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.finished) return;
    try {
      if (this.real) {
        if (!(await this.fetchRemote())) return;
        const r = this.remote()!;
        this.shopPos = [r.shop.lat, r.shop.lng];
        this.homePos = [r.home.lat, r.home.lng];
        this.poll = setInterval(() => void this.fetchRemote().then(() => { const c = this.remote()?.courier; if (c) this.moveCourier([c.lat, c.lng]); }), 15000);
      }
      this.L = await import('leaflet');
      this.drawMap(this.L);
    } catch (e) {
      console.error('[order-tracking] không dựng được bản đồ', e);
      this.mapError.set(true);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.tween);
    this.sim.stop();
    this.map?.remove();
  }

  protected stepState(key: string): 'ok' | 'cur' | '' {
    const order = this.steps.map((s) => s.key as string);
    const cur = order.indexOf(this.phase());
    const i = order.indexOf(key);
    return this.phase() === 'done' || i < cur ? 'ok' : i === cur ? 'cur' : '';
  }

  protected demo(): void {
    this.toast.show('Tính năng demo');
  }

  private drawMap(L: Leaflet): void {
    const rc = this.remote()?.courier;
    const path: LatLng[] = this.real ? [this.shopPos, this.homePos] : this.sim.path;
    if (!this.mapEl) throw new Error('chưa có khung bản đồ');
    const map = L.map(this.mapEl.nativeElement, { zoomControl: true, attributionControl: true });
    // Nền Esri World Street Map: miễn phí cho demo, không cần khóa (tile OSM chính thức hay bị chặn khi chạy thử); ghi nguồn theo yêu cầu
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles © Esri' }).addTo(map);
    const mk = (cls: string, p: string) => L.divIcon({ className: 'pin-wrap', html: icon(cls, p), iconSize: [36, 36], iconAnchor: [18, 18] });
    // Đường còn lại: xám mờ, nét đứt trôi về phía nhà. Đường đã đi: cam sáng + vệt trắng chạy dọc (CSS ở order-tracking.css)
    this.rest = L.polyline(path, { color: '#8b8f98', weight: 4, dashArray: '4 10', opacity: 0.45, className: 'trk-rest' }).addTo(map);
    this.done = L.polyline([path[0]], { color: '#D85A1C', weight: 6, opacity: 1, className: 'trk-done' }).addTo(map);
    this.flow = L.polyline([path[0]], { color: '#fff', weight: 2, dashArray: '2 14', opacity: 0.85, className: 'trk-flow' }).addTo(map);
    L.marker(this.shopPos, { icon: mk('shop', MARKER_PATH.shop), title: this.shopName }).addTo(map);
    L.marker(this.homePos, { icon: mk('home', MARKER_PATH.home), title: 'Nhà bạn' }).addTo(map);
    this.courierMarker = L.marker(rc ? [rc.lat, rc.lng] : this.sim.position(), { icon: mk('courier', MARKER_PATH.courier), title: 'Người giao', zIndexOffset: 500 }).addTo(map);
    map.fitBounds(L.latLngBounds(rc ? [...path, [rc.lat, rc.lng] as LatLng] : path), { padding: [32, 32] }); // thấy đủ ba điểm ngay khi tải
    this.map = map;
    map.invalidateSize();
  }
}
