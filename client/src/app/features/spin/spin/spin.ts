import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Post } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { createSlug, stripAccents } from '../../../core/utils/slug-helper';

export type SpinTab = 'meal' | 'drink' | 'snack' | 'all';

export const TABS: { key: SpinTab; label: string }[] = [
  { key: 'meal', label: 'Bữa ăn' },
  { key: 'drink', label: 'Đồ uống' },
  { key: 'snack', label: 'Ăn vặt' },
  { key: 'all', label: 'Tất cả' },
];
export const BUDGETS = [
  { value: 30000, label: 'Dưới 30k' },
  { value: 50000, label: 'Dưới 50k' },
  { value: 100000, label: 'Dưới 100k' },
  { value: 0, label: 'Không giới hạn' },
];

const DRINK = ['tra', 'nuoc', 'ca phe', 'cafe', 'sinh to', 'sua', 'ep ', 'smoothie'];
const SNACK = ['banh', 'che', 'an vat', 'xoi', 'kem', 'trai cay', 'hat'];

/** Món thuộc nhóm nào, đoán theo tên (dữ liệu bài chưa có phân loại con). */
export function dishGroup(title: string): Exclude<SpinTab, 'all'> {
  const t = ` ${stripAccents(title)} `;
  if (DRINK.some((w) => t.includes(` ${w.trim()}`) )) return 'drink';
  if (SNACK.some((w) => t.includes(` ${w}`))) return 'snack';
  return 'meal';
}

/** Lọc các món có thể quay theo nhóm + ngân sách (0 = không giới hạn). */
export function spinPool(posts: Post[], tab: SpinTab, budget: number): Post[] {
  return posts.filter(
    (p) => p.kind === 'food' && !p.closed && (budget === 0 || p.price <= budget) && (tab === 'all' || dishGroup(p.title) === tab),
  );
}

/** Món người bán đã trả Xu "quảng bá vào vòng quay" có cơ hội gấp đôi món thường… */
export const PROMO_WEIGHT = 2;
/** …nhưng tất cả món quảng bá cộng lại không quá 30% số lần trúng, để vòng quay vẫn công bằng. */
export const PROMO_MAX_SHARE = 0.3;

/**
 * Chọn món trúng. Món `spinPromo` nặng gấp đôi; nếu cả nhóm quảng bá vẫn vượt trần 30% thì hạ trọng số
 * xuống cho đúng 30%. `rnd` trả số trong [0,1) (mặc định Math.random; test truyền số cố định).
 */
export function pickWinner(pool: Post[], rnd: () => number = Math.random): Post {
  const promo = pool.filter((p) => p.spinPromo).length;
  const normal = pool.length - promo;
  let wp = PROMO_WEIGHT;
  if (promo > 0 && normal > 0 && (promo * wp) / (promo * wp + normal) > PROMO_MAX_SHARE) {
    wp = (PROMO_MAX_SHARE * normal) / ((1 - PROMO_MAX_SHARE) * promo); // đúng 30% tổng
  }
  const weight = (p: Post) => (p.spinPromo && normal > 0 ? wp : 1);
  let r = rnd() * pool.reduce((s, p) => s + weight(p), 0);
  for (const p of pool) {
    r -= weight(p);
    if (r < 0) return p;
  }
  return pool[pool.length - 1];
}

// Hình học khung 5 ô (frame3.png, 2048×682, đo bằng tools/image/CleanSpinFrame.ps1): lòng 5 ô rộng 1810px (x=119→1929). Tâm các ô cách nhau 370 (ô ngoài↔ô kế) và 375,5 (ô kế↔ô giữa),
// nên các thẻ rộng 370 và riêng thẻ ở giữa rộng 381 → (370+381)/2 = 375,5 : mọi thẻ rơi đúng tâm từng ô khi dừng. Đổi khung thì phải đo lại.
const VIEW_W = 1810;
const SLOT_W = 370;
const CENTER_W = 381;
const CENTER_ZOOM = 0.07; // thẻ ở giữa to thêm 7% (ô giữa của khung rộng và cao hơn các ô khác)
const ITEM_W = 110; // bề rộng một ô trước khi đo; thực tế tính theo bề rộng khung
const REEL_LEN = 40;
const WIN_AT = 33;
const SPIN_MS = 4200;

@Component({
  selector: 'app-spin',
  standalone: false,
  templateUrl: './spin.html',
  styleUrl: './spin.css',
})
export class Spin implements OnInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly doc = inject(DOCUMENT);

  @ViewChild('view') private view?: ElementRef<HTMLElement>;

  protected readonly tabs = TABS;
  protected readonly budgets = BUDGETS;
  protected readonly itemW = signal(ITEM_W);
  /** Thẻ nằm giữa khung (món trúng, hoặc thẻ thứ 4 khi chưa quay) rộng hơn các thẻ khác để khớp ô giữa. */
  protected readonly centerIdx = signal(3);
  protected readonly centerW = computed(() => (this.itemW() * CENTER_W) / SLOT_W);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  /** Lỗi do mất kết nối (không phải lỗi máy chủ) → màn hình chờ nói rõ đang chờ có mạng */
  protected readonly offline = signal(false);
  protected readonly foods = signal<Post[]>([]);
  protected readonly tab = signal<SpinTab>('meal');
  protected readonly budget = signal(50000);
  protected readonly reel = signal<Post[]>([]);
  protected readonly offset = signal(0);
  protected readonly instant = signal(true);
  protected readonly spinning = signal(false);
  protected readonly result = signal<Post | null>(null);
  /** Popup món trúng: hiện khi quay xong, đóng bằng nút X / Esc / bấm nền / Quay lại */
  protected readonly showResult = signal(false);
  /** hạt vàng bung quanh con kiến khi popup hiện (cùng kiểu trang giới thiệu); số cố định để mỗi lần bung giống nhau */
  protected readonly dust = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * 6.283 + Math.sin(i * 12.9898) * 0.5;
    const r = 46 + ((i * 37) % 70);
    return {
      vx: Math.round(Math.cos(a) * r), vy: Math.round(Math.sin(a) * r - 12), size: 3 + ((i * 5) % 7),
      color: ['255,214,107', '255,200,92', '255,232,160', '250,180,90', '255,255,255', '255,220,200'][i % 6],
      dur: +(0.6 + ((i * 13) % 45) / 100).toFixed(2), delay: +(((i * 7) % 8) / 100).toFixed(2),
    };
  });
  protected readonly spins = signal(0);

  protected readonly pool = computed(() => spinPool(this.foods(), this.tab(), this.budget()));
  /** Nhãn ngân sách trên popup (không hiện khi "Không giới hạn") */
  protected readonly budgetChip = computed(() => (this.budget() ? (BUDGETS.find((b) => b.value === this.budget())?.label ?? '') : ''));
  private timers: ReturnType<typeof setTimeout>[] = [];
  private raf = 0;
  private scaleUntil = 0;

  @HostListener('window:resize')
  onResize(): void {
    if (this.spinning()) return;
    const vw = this.view?.nativeElement.clientWidth;
    if (vw) {
      this.itemW.set(vw * (SLOT_W / VIEW_W)); // mỗi thẻ chiếm đúng một ô của khung (đo trên ảnh khung gốc)
      setTimeout(() => this.place());
    }
  }

  ngOnInit(): void {
    // sân khấu tràn hết chiều ngang (100vw, tính cả thanh cuộn) → chặn thanh cuộn ngang chỉ trong lúc ở trang này
    this.doc.documentElement.style.overflowX = 'clip';
    this.load();
  }

  /** Tải danh sách món. Lỗi (nhất là rớt mạng) thì hiện màn hình chờ có con kiến; có mạng lại sẽ tự thử lại. */
  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.postService.getPosts().subscribe({
      next: (list) => {
        this.foods.set(list.filter((p) => p.kind === 'food'));
        this.offline.set(false);
        this.loading.set(false);
        this.preview();
        setTimeout(() => this.onResize());
      },
      error: (e: Error & { status?: number }) => {
        this.offline.set(!navigator.onLine || e.status === 0);
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    if (!this.loading()) this.load();
  }

  @HostListener('window:online')
  onOnline(): void {
    if (this.error()) this.retry();
  }

  ngOnDestroy(): void {
    this.doc.documentElement.style.overflowX = '';
    this.timers.forEach(clearTimeout);
    cancelAnimationFrame(this.raf);
  }

  /** Đặt dải sao cho một thẻ nằm đúng giữa khung ngắm (món trúng nếu đã quay, không thì thẻ thứ 4). */
  private place(): void {
    const view = this.view?.nativeElement;
    if (!view || this.spinning()) return;
    this.instant.set(true);
    this.offset.set(view.clientWidth / 2 - this.centerOf(this.centerIdx()));
    setTimeout(() => this.applyScale());
  }

  /** Vị trí tâm thẻ thứ i trên dải (các thẻ rộng itemW, riêng thẻ giữa rộng centerW). */
  private centerOf(i: number): number {
    const w = this.itemW();
    const c = this.centerIdx();
    if (i < c) return i * w + w / 2;
    if (i === c) return c * w + this.centerW() / 2;
    return c * w + this.centerW() + (i - c - 1) * w + w / 2;
  }

  /** Thẻ càng gần giữa càng to (khớp lòng khung ngắm); tính theo vị trí thật của dải mỗi khung hình. */
  private applyScale(): void {
    const view = this.view?.nativeElement;
    const strip = view?.firstElementChild as HTMLElement | null;
    if (!view || !strip) return;
    const tx = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41;
    const w = this.itemW();
    const cx = view.clientWidth / 2;
    const items = strip.children;
    for (let i = 0; i < items.length; i++) {
      const el = items[i] as HTMLElement;
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) continue;
      const k = Math.max(0, 1 - Math.abs(this.centerOf(i) + tx - cx) / w);
      const s = 1 + CENTER_ZOOM * (k * k * (3 - 2 * k));
      card.style.transform = s > 1.001 ? `scale(${s.toFixed(3)})` : '';
      el.style.zIndex = k > 0.4 ? '2' : '';
    }
  }

  private runScale(ms: number): void {
    this.scaleUntil = performance.now() + ms;
    cancelAnimationFrame(this.raf);
    const tick = () => {
      this.applyScale();
      if (performance.now() < this.scaleUntil) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  setTab(t: SpinTab): void {
    if (this.spinning()) return;
    this.tab.set(t);
    this.reset();
  }

  setBudget(v: string): void {
    if (this.spinning()) return;
    this.budget.set(Number(v));
    this.reset();
  }

  groupLabel(p: Post): string {
    return TABS.find((t) => t.key === dishGroup(p.title))?.label ?? 'Món ăn';
  }

  closeResult(): void {
    this.showResult.set(false);
  }

  /** "Quay lại" trên popup: đóng rồi quay luôn lần nữa */
  again(): void {
    this.closeResult();
    this.spin();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeResult();
  }

  link(p: Post): string[] {
    return ['/posts', createSlug(p.title, p._id)];
  }

  /** Dải xem trước (chưa quay): vài món trong nhóm đang chọn. */
  private preview(): void {
    this.instant.set(true);
    this.offset.set(0);
    this.centerIdx.set(3);
    this.reel.set(shuffle(this.pool()).slice(0, 12));
    setTimeout(() => this.place());
  }

  private reset(): void {
    this.result.set(null);
    this.preview();
  }

  spin(): void {
    const pool = this.pool();
    if (!pool.length || this.spinning()) return;
    this.onResize();
    const winner = pickWinner(pool);
    // Dải quay: toàn món trong nhóm, món trúng đặt ở vị trí WIN_AT; không để hai ô liền kề giống nhau
    const reel: Post[] = [];
    for (let i = 0; i < REEL_LEN; i++) {
      let pick = i === WIN_AT ? winner : pool[Math.floor(Math.random() * pool.length)];
      if (i !== WIN_AT && pool.length > 1 && (reel[i - 1] === pick || (i + 1 === WIN_AT && pick === winner))) {
        pick = pool.find((p) => p !== reel[i - 1] && p !== winner) ?? pick;
      }
      reel.push(pick);
    }
    this.result.set(null);
    this.showResult.set(false);
    this.spinning.set(true);
    this.spins.update((n) => n + 1);
    this.instant.set(true);
    this.offset.set(0);
    this.centerIdx.set(WIN_AT);
    this.reel.set(reel);

    const viewW = this.view?.nativeElement.clientWidth ?? 600;
    const target = -(this.centerOf(WIN_AT) - viewW / 2);
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // một nhịp để trình duyệt ghi nhận vị trí 0 rồi mới bật chuyển động
    this.timers.push(setTimeout(() => {
      this.instant.set(false);
      this.offset.set(target);
      this.runScale(reduce ? 200 : SPIN_MS + 500);
    }, 40));
    this.timers.push(setTimeout(() => {
      this.spinning.set(false);
      this.result.set(winner);
      this.showResult.set(true);
      // đưa tiêu điểm vào nút chính của popup (người dùng bàn phím bấm Enter là đặt món)
      setTimeout(() => this.doc.querySelector<HTMLElement>('app-spin .popcard .btn')?.focus(), 80);
    }, reduce ? 80 : SPIN_MS + 120));
  }
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
