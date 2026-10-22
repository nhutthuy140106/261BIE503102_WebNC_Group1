import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { USE_MOCK } from '../../../core/config/api.config';
import { Post, PostKind } from '../../../core/models/post';
import { AreaService } from '../../../core/services/area';
import { PostService, matches } from '../../../core/services/post';
import { SavedService } from '../../../core/services/saved';

type Tab = 'all' | PostKind;
type Sort = 'near' | 'new' | 'sold' | 'low' | 'high';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'food', label: 'Đồ ăn & uống' },
  { key: 'goods', label: 'Đồ dùng' },
  { key: 'service', label: 'Dịch vụ' },
  { key: 'job', label: 'Việc làm' },
];

/**
 * Kết quả tìm kiếm — bố cục kiểu Shopee: cột "Bộ lọc tìm kiếm" bên trái (danh mục, khu vực, khoảng giá, đánh giá, ưu đãi),
 * thanh "Sắp xếp theo" phía trên danh sách. Mọi bộ lọc nằm trên query params (q, kind, min, max, rate, xu, sort)
 * nên copy URL là giữ nguyên kết quả. Bài trong khu đang xem xếp trước, bài khu khác gom vào "Ở khu gần đó".
 */
@Component({
  selector: 'app-search-results',
  standalone: false,
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  protected readonly saved = inject(SavedService);
  protected readonly area = inject(AreaService);

  protected readonly tabs = TABS;
  protected readonly isMock = USE_MOCK;
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly all = signal<Post[]>([]);

  // bộ lọc (nguồn là URL)
  protected readonly term = signal('');
  protected readonly kind = signal<Tab>('all');
  protected readonly min = signal<number | null>(null);
  protected readonly max = signal<number | null>(null);
  protected readonly rate = signal(0);
  protected readonly xuOnly = signal(false);
  protected readonly sort = signal<Sort>('near');
  /** Ô nhập khoảng giá (chỉ áp dụng khi bấm "Áp dụng", như Shopee) */
  protected readonly draftMin = signal('');
  protected readonly draftMax = signal('');

  private readonly byTerm = computed(() => this.all().filter((p) => matches(p, { q: this.term() || undefined })));
  protected readonly counts = computed(() => {
    const list = this.byTerm();
    return Object.fromEntries(TABS.map((t) => [t.key, t.key === 'all' ? list.length : list.filter((p) => p.kind === t.key).length])) as Record<Tab, number>;
  });
  protected readonly isJobs = computed(() => this.kind() === 'job');
  /** Mức giá gợi ý (bấm một lần là lọc, không phải gõ số) */
  protected readonly presets = computed<{ label: string; min: number | null; max: number | null }[]>(() =>
    this.isJobs()
      ? [{ label: 'Dưới 50k', min: null, max: 50000 }, { label: '50k – 100k', min: 50000, max: 100000 }, { label: 'Trên 100k', min: 100000, max: null }]
      : [{ label: 'Dưới 50k', min: null, max: 50000 }, { label: '50k – 150k', min: 50000, max: 150000 }, { label: '150k – 300k', min: 150000, max: 300000 }, { label: 'Trên 300k', min: 300000, max: null }],
  );
  protected readonly priceOptions = computed(() => {
    const w = this.isJobs() ? 'Tiền công' : 'Giá';
    return [{ key: 'low', label: w + ': Thấp đến cao' }, { key: 'high', label: w + ': Cao đến thấp' }];
  });

  protected readonly matched = computed(() => {
    const lo = this.min() ?? 0;
    const hi = this.max() ?? Infinity;
    const k = this.kind();
    const xu = this.xuOnly() && !this.isJobs();
    const r = this.rate();
    const far = Number.MAX_SAFE_INTEGER;
    const list = this.byTerm().filter(
      (p) => (k === 'all' || p.kind === k) && p.price >= lo && p.price <= hi && (!xu || p.acceptsXu) && (!r || (p.rating ?? 0) >= r),
    );
    const s = this.sort();
    return [...list].sort((a, b) => {
      switch (s) {
        case 'low':
          return a.price - b.price;
        case 'high':
          return b.price - a.price;
        case 'new':
          return b.createdAt.localeCompare(a.createdAt);
        case 'sold':
          return (b.sold ?? 0) - (a.sold ?? 0);
        default:
          return (a.distance ?? far) - (b.distance ?? far);
      }
    });
  });
  protected readonly local = computed(() => this.matched().filter((p) => p.area === this.area.current()));
  protected readonly nearby = computed(() => this.matched().filter((p) => p.area !== this.area.current()));
  protected readonly hasFilter = computed(() => this.min() != null || this.max() != null || this.rate() > 0 || this.xuOnly() || this.kind() !== 'all');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const kind = params.get('kind') as Tab | null;
      const num = (k: string) => (params.get(k) ? Number(params.get(k)) : null);
      this.term.set(params.get('q') ?? '');
      this.kind.set(kind && TABS.some((t) => t.key === kind) ? kind : 'all');
      this.min.set(num('min'));
      this.max.set(num('max'));
      this.draftMin.set(params.get('min') ?? '');
      this.draftMax.set(params.get('max') ?? '');
      this.rate.set(num('rate') ?? 0);
      this.xuOnly.set(params.get('xu') === '1');
      const sort = params.get('sort') as Sort | null;
      this.sort.set(sort && ['near', 'new', 'sold', 'low', 'high'].includes(sort) ? sort : 'near');
    });
    this.postService.getPosts().subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  protected setKind(k: Tab): void {
    this.navigate({ kind: k === 'all' ? null : k, sort: this.sort() === 'sold' && k === 'job' ? null : this.sortParam() });
  }

  protected isPreset(p: { min: number | null; max: number | null }): boolean {
    return this.min() === p.min && this.max() === p.max;
  }

  protected setPreset(p: { min: number | null; max: number | null }): void {
    const off = this.isPreset(p);
    this.navigate({ min: off || p.min == null ? null : String(p.min), max: off || p.max == null ? null : String(p.max) });
  }

  protected applyPrice(): void {
    this.navigate({ min: this.draftMin().trim() || null, max: this.draftMax().trim() || null });
  }

  protected setRate(r: number): void {
    this.navigate({ rate: this.rate() === r ? null : String(r) });
  }

  protected toggleXu(): void {
    this.navigate({ xu: this.xuOnly() ? null : '1' });
  }

  protected setSort(s: Sort): void {
    this.navigate({ sort: s === 'near' ? null : s });
  }

  protected clear(): void {
    this.navigate({ kind: null, min: null, max: null, rate: null, xu: null, sort: null });
  }

  protected toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }

  protected stars(n: number): number[] {
    return [1, 2, 3, 4, 5].map((i) => (i <= n ? 1 : 0));
  }

  private sortParam(): string | null {
    return this.sort() === 'near' ? null : this.sort();
  }

  private navigate(queryParams: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
