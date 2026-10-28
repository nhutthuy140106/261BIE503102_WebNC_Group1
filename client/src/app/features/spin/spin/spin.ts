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

const ITEM_W = 110; // bề rộng một ô trước khi đo; thực tế tính theo chiều cao rãnh của khung gỗ
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

  @ViewChild('view') private view?: ElementRef<HTMLElement>;

  protected readonly tabs = TABS;
  protected readonly budgets = BUDGETS;
  protected readonly itemW = signal(ITEM_W);
  protected readonly trackH = signal(90);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly foods = signal<Post[]>([]);
  protected readonly tab = signal<SpinTab>('meal');
  protected readonly budget = signal(50000);
  protected readonly reel = signal<Post[]>([]);
  protected readonly offset = signal(0);
  protected readonly instant = signal(true);
  protected readonly spinning = signal(false);
  protected readonly result = signal<Post | null>(null);
  protected readonly spins = signal(0);

  protected readonly pool = computed(() => spinPool(this.foods(), this.tab(), this.budget()));
  private timers: ReturnType<typeof setTimeout>[] = [];
  private raf = 0;
  private scaleUntil = 0;

  @HostListener('window:resize')
  onResize(): void {
    if (this.spinning()) return;
    const vh = this.view?.nativeElement.clientHeight;
    if (vh) {
      this.trackH.set(vh);
      this.itemW.set(vh * (222 / 228.6) + 16); // thẻ cao bằng rãnh, tỉ lệ khung viền món, cộng khoảng cách
      setTimeout(() => this.place());
    }
  }

  ngOnInit(): void {
    this.postService.getPosts().subscribe({
      next: (list) => {
        this.foods.set(list.filter((p) => p.kind === 'food'));
        this.loading.set(false);
        this.preview();
        setTimeout(() => this.onResize());
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
    cancelAnimationFrame(this.raf);
  }

  /** Đặt dải sao cho một thẻ nằm đúng giữa khung ngắm (món trúng nếu đã quay, không thì thẻ thứ 4). */
  private place(): void {
    const view = this.view?.nativeElement;
    if (!view || this.spinning()) return;
    const w = this.itemW();
    const idx = this.result() ? WIN_AT : 3;
    this.instant.set(true);
    this.offset.set(view.clientWidth / 2 - (idx * w + w / 2));
    setTimeout(() => this.applyScale());
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
      const k = Math.max(0, 1 - Math.abs(i * w + w / 2 + tx - cx) / w);
      const s = 1 + 0.34 * (k * k * (3 - 2 * k));
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

  link(p: Post): string[] {
    return ['/posts', createSlug(p.title, p._id)];
  }

  /** Dải xem trước (chưa quay): vài món trong nhóm đang chọn. */
  private preview(): void {
    this.instant.set(true);
    this.offset.set(0);
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
    const winner = pool[Math.floor(Math.random() * pool.length)];
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
    this.spinning.set(true);
    this.spins.update((n) => n + 1);
    this.instant.set(true);
    this.offset.set(0);
    this.reel.set(reel);

    const viewW = this.view?.nativeElement.clientWidth ?? 600;
    const w = this.itemW();
    const target = -(WIN_AT * w + w / 2 - viewW / 2);
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
