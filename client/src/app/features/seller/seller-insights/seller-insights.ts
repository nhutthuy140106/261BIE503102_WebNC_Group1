import { AfterViewInit, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { SELLER_KIND_ICON, StatsRange } from '../../../core/models/seller';
import { SellerSpaceService } from '../../../core/services/seller-space';

const RANGE_KEY = 'antgo_seller_range';
const short = (n: number) =>
  n >= 1e6 ? (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tr' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n);

/**
 * Hiệu quả (design/mockups/seller-insights.html) — chỉ để theo dõi, không thao tác:
 * 2 ô tiền đồng cấp (đã bán / đã thuê) + 4 ô số, biểu đồ đã thu (một chuỗi, một màu, có dạng bảng),
 * thu theo mảng, hành trình khách, bài bán chạy, việc đã thuê, đánh giá.
 */
@Component({
  selector: 'app-seller-insights',
  standalone: false,
  templateUrl: './seller-insights.html',
  styleUrls: ['../seller-ui.css', './seller-insights.css'],
})
export class SellerInsights implements OnInit, AfterViewInit {
  protected readonly seller = inject(SellerSpaceService);
  private readonly route = inject(ActivatedRoute);

  protected readonly ranges: StatsRange[] = ['today', '7', '30', '90', 'year'];
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly short = short;
  protected readonly range = signal<StatsRange>(this.readRange());
  protected readonly table = signal(false);
  protected readonly d = computed(() => this.seller.statsFor(this.range()));

  protected setRange(r: StatsRange): void {
    this.range.set(r);
    try {
      localStorage.setItem(RANGE_KEY, r);
    } catch {
      /* bỏ qua */
    }
  }

  private readRange(): StatsRange {
    try {
      return (localStorage.getItem(RANGE_KEY) as StatsRange) || '7';
    } catch {
      return '7';
    }
  }

  protected readonly bookRate = computed(() => {
    const d = this.d();
    return d ? ((d.done / d.views) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '0';
  });

  protected readonly mix = computed(() => {
    const d = this.d();
    if (!d) return [];
    const tot = d.mix.reduce((a, b) => a + b, 0) || 1;
    return (['food', 'goods', 'service'] as PostKind[]).map((k, i) => ({ kind: k, v: d.mix[i], pct: (d.mix[i] / tot) * 100 }));
  });

  protected readonly funnel = computed(() => {
    const d = this.d();
    if (!d) return [];
    return [['eye', 'Xem bài', d.views], ['heart', 'Lưu bài', d.saves], ['receipt', 'Đặt đơn', d.done]].map(([ic, t, v]) => ({
      ic: ic as string, t: t as string, v: v as number, pct: ((v as number) / d.views) * 100,
    }));
  });

  protected readonly topPosts = computed(() =>
    this.seller.posts().filter((p) => p.kind !== 'job').sort((a, b) => b.sold * b.price - a.sold * a.price).slice(0, 5),
  );
  protected readonly hired = computed(() => this.seller.jobs().flatMap((j) => j.active.map((o) => ({ j, o }))));
  protected readonly dist = computed(() => {
    const r = this.seller.reviews();
    return [5, 4, 3, 2, 1].map((n) => ({ n, c: r.filter((x) => x.stars === n).length, pct: r.length ? (r.filter((x) => x.stars === n).length / r.length) * 100 : 0 }));
  });

  // ---- biểu đồ cột: cột bo 4px phía trên neo vào trục, lưới mờ, nhãn cột cao nhất, rê chuột xem số ----
  protected readonly W = 760;
  protected readonly H = 240;
  private readonly L = 44;
  private readonly B = 26;
  private readonly T = 18;
  protected readonly hover = signal<number | null>(null);
  protected readonly chart = computed(() => {
    const d = this.d();
    if (!d) return null;
    const { W, H, L, B, T } = this;
    const max = Math.max(...d.y, 1);
    const nice = Math.ceil(max / 4 / 50000) * 50000 * 4 || 200000;
    const n = d.y.length;
    const slot = (W - L) / n;
    const bw = Math.min(56, Math.max(10, slot * 0.56));
    const y = (v: number) => T + (H - T - B) * (1 - v / nice);
    const peak = d.y.indexOf(max);
    const path = (x: number, top: number, w: number, h: number) => {
      if (h <= 0) return '';
      const r = Math.min(4, h);
      return `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${top + h}Z`;
    };
    return {
      ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: y(f * nice), label: short(f * nice) })),
      bars: d.y.map((v, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const top = y(v);
        return { i, v, label: d.x[i], hitX: L + slot * i, slot, cx: x + bw / 2, top, d: path(x, top, bw, H - B - top), peak: i === peak && v > 0 };
      }),
      L, T, plotH: H - T - B,
    };
  });

  ngOnInit(): void {
    this.seller.load().subscribe();
  }

  ngAfterViewInit(): void {
    if (this.route.snapshot.fragment === 'reviews') setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ block: 'start' }), 80);
  }

  protected stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  protected up(v: string): string {
    return v.replace(/^\+/, '');
  }

  protected cap(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
