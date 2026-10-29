import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { MARKER_PATH } from '../../../core/models/tracking';
import { DeliverySimulator } from '../../../core/services/delivery-simulator';
import { LatLng } from '../../../core/models/tracking';
import { blockFromSeed, blockOf, pointIn } from '../../../core/utils/tracking-route';
import { ToastService } from '../../../core/services/toast';

type Leaflet = typeof import('leaflet');

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

  @ViewChild('map', { static: true }) private mapEl!: ElementRef<HTMLElement>;

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
      if (!this.L || !this.map) return;
      const path = this.sim.path;
      this.courierMarker?.setLatLng(path[c]);
      this.done?.setLatLngs(path.slice(0, c + 1));
      this.flow?.setLatLngs(path.slice(0, c + 1));
      this.rest?.setLatLngs(path.slice(c));
    });
  }

  ngOnInit(): void {
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

  async ngAfterViewInit(): Promise<void> {
    if (this.finished) return;
    try {
      this.L = await import('leaflet');
      this.drawMap(this.L);
    } catch {
      this.mapError.set(true);
    }
  }

  ngOnDestroy(): void {
    this.sim.stop();
    this.map?.remove();
  }

  protected stepState(key: string): 'ok' | 'cur' | '' {
    const order = this.steps.map((s) => s.key as string);
    const cur = order.indexOf(this.sim.phase());
    const i = order.indexOf(key);
    return this.sim.phase() === 'done' || i < cur ? 'ok' : i === cur ? 'cur' : '';
  }

  protected demo(): void {
    this.toast.show('Tính năng demo');
  }

  private drawMap(L: Leaflet): void {
    const path = this.sim.path;
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
    this.courierMarker = L.marker(this.sim.position(), { icon: mk('courier', MARKER_PATH.courier), title: 'Người giao', zIndexOffset: 500 }).addTo(map);
    map.fitBounds(L.latLngBounds(path), { padding: [32, 32] }); // thấy đủ ba điểm ngay khi tải
    this.map = map;
    map.invalidateSize();
  }
}
