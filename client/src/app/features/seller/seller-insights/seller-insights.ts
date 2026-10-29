import { AfterViewInit, Component, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { SELLER_KIND_ICON, SellerStats, StatsRange } from '../../../core/models/seller';
import { SellerSpaceService } from '../../../core/services/seller-space';

const RANGE_KEY = 'antgo_seller_range';
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dmy = (k: string) => `${k.slice(8)}/${k.slice(5, 7)}/${k.slice(0, 4)}`;
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
  /** khoảng ngày tự chọn (yyyy-mm-dd); có thì thay cho các mốc gợi ý */
  protected readonly custom = signal<{ from: string; to: string } | null>(null);
  protected readonly d = computed(() => {
    const c = this.custom();
    return c ? this.customStats(c.from, c.to) : this.seller.statsFor(this.range());
  });

  protected setRange(r: StatsRange): void {
    this.custom.set(null);
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

  // ---- chọn khoảng thời gian: lịch, bấm ngày đầu rồi ngày cuối (không chọn ngày tương lai) ----
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  protected readonly pickOpen = signal(false);
  protected readonly pickA = signal<string | null>(null);
  protected readonly pickB = signal<string | null>(null);
  protected readonly calMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly calTitle = computed(() => `Tháng ${this.calMonth().getMonth() + 1}, ${this.calMonth().getFullYear()}`);
  protected readonly calCanNext = computed(() => this.calMonth() < new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly calCells = computed(() => {
    const m = this.calMonth();
    const today = ymd(new Date());
    const a = this.pickA(), b = this.pickB() ?? a;
    const n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: (m.getDay() + 6) % 7 }, () => null),
      ...Array.from({ length: n }, (_, i) => {
        const key = ymd(new Date(m.getFullYear(), m.getMonth(), i + 1));
        return { key, d: i + 1, today: key === today, future: key > today, end: key === a || key === b, in: !!a && !!b && key > a && key < b };
      }),
    ];
  });

  protected togglePick(): void {
    if (!this.pickOpen()) {
      this.pickA.set(this.custom()?.from ?? null);
      this.pickB.set(this.custom()?.to ?? null);
    }
    this.pickOpen.set(!this.pickOpen());
  }

  protected moveMonth(n: number): void {
    const m = this.calMonth();
    this.calMonth.set(new Date(m.getFullYear(), m.getMonth() + n, 1));
  }

  protected pickDay(key: string): void {
    const a = this.pickA();
    if (!a || this.pickB()) {
      this.pickA.set(key);
      this.pickB.set(null);
    } else if (key < a) {
      this.pickA.set(key);
      this.pickB.set(a);
    } else this.pickB.set(key);
  }

  protected pickText(): string {
    const a = this.pickA(), b = this.pickB();
    return !a ? 'Chọn ngày bắt đầu' : !b ? `Từ ${dmy(a)} · chọn ngày kết thúc` : `${dmy(a)} – ${dmy(b)}`;
  }

  protected applyPick(): void {
    const a = this.pickA();
    if (!a) return;
    this.custom.set({ from: a, to: this.pickB() ?? a });
    this.pickOpen.set(false);
  }

  protected customText(): string {
    const c = this.custom()!;
    return c.from === c.to ? dmy(c.from) : `${dmy(c.from)} – ${dmy(c.to)}`;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.pickOpen() && !(e.target as HTMLElement).closest('.rpick')) this.pickOpen.set(false);
  }

  /** Mock: số liệu khoảng tự chọn suy từ mốc gợi ý gần nhất, nhân theo số ngày; ≤ 31 ngày thì vẽ từng ngày */
  private customStats(from: string, to: string): SellerStats | undefined {
    const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
    const key: StatsRange = days <= 1 ? 'today' : days <= 7 ? '7' : days <= 30 ? '30' : days <= 90 ? '90' : 'year';
    const base = this.seller.statsFor(key);
    if (!base) return undefined;
    const baseDays = { today: 1, '7': 7, '30': 30, '90': 90, year: 365 }[key];
    const k = days / baseDays;
    const r = (n: number) => Math.round(n * k);
    let x = base.x, y = base.y.map(r), unit = base.unit;
    if (days > 1 && days <= 31) {
      unit = 'ngày';
      x = Array.from({ length: days }, (_, i) => dmy(ymd(new Date(Date.parse(from) + i * 86400000))).slice(0, 5));
      const tot = base.y.reduce((s, v) => s + v, 0) * k;
      const w = x.map((_, i) => base.y[i % base.y.length] || 1);
      const ws = w.reduce((s, v) => s + v, 0);
      y = w.map((v) => Math.round((tot * v) / ws));
    }
    return {
      ...base, label: from === to ? dmy(from) : `${dmy(from)} – ${dmy(to)}`, unit, x, y,
      income: Math.round((base.income * k) / 1000) * 1000, paid: Math.round((base.paid * k) / 1000) * 1000, hired: r(base.hired), done: Math.max(0, r(base.done)), views: r(base.views), saves: r(base.saves),
      mix: base.mix.map(r) as [number, number, number],
    };
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
