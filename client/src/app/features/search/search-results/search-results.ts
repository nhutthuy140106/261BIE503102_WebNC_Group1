import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { USE_MOCK } from '../../../core/config/api.config';
import { Post, PostKind } from '../../../core/models/post';
import { AreaService } from '../../../core/services/area';
import { PostService, matches } from '../../../core/services/post';
import { SavedService } from '../../../core/services/saved';

type Tab = 'all' | PostKind;
type Sort = 'near' | 'low' | 'high';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'food', label: 'Đồ ăn & uống' },
  { key: 'goods', label: 'Đồ dùng' },
  { key: 'service', label: 'Dịch vụ' },
  { key: 'job', label: 'Việc làm' },
];

/**
 * Kết quả tìm kiếm — bê từ design/mockups/search.html. Bộ lọc nằm trên query params
 * (q, kind, min, max, xu, sort) nên copy URL là giữ nguyên kết quả. Bài trong khu đang xem xếp trước,
 * bài khu khác gom vào "Ở khu gần đó".
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
  protected readonly xuOnly = signal(false);
  protected readonly sort = signal<Sort>('near');

  private readonly byTerm = computed(() => this.all().filter((p) => matches(p, { q: this.term() || undefined })));
  protected readonly counts = computed(() => {
    const list = this.byTerm();
    return Object.fromEntries(TABS.map((t) => [t.key, t.key === 'all' ? list.length : list.filter((p) => p.kind === t.key).length])) as Record<Tab, number>;
  });
  protected readonly isJobs = computed(() => this.kind() === 'job');
  protected readonly sortOptions = computed<{ key: Sort; label: string }[]>(() =>
    this.isJobs()
      ? [{ key: 'near', label: 'Gần nhất' }, { key: 'high', label: 'Tiền công cao nhất' }]
      : [{ key: 'near', label: 'Gần nhất' }, { key: 'low', label: 'Giá thấp đến cao' }, { key: 'high', label: 'Giá cao đến thấp' }],
  );

  protected readonly matched = computed(() => {
    const lo = this.min() ?? 0;
    const hi = this.max() ?? Infinity;
    const k = this.kind();
    const xu = this.xuOnly() && !this.isJobs();
    const far = Number.MAX_SAFE_INTEGER;
    const list = this.byTerm().filter((p) => (k === 'all' || p.kind === k) && p.price >= lo && p.price <= hi && (!xu || p.acceptsXu));
    const s = this.sort();
    return [...list].sort((a, b) => (s === 'low' ? a.price - b.price : s === 'high' ? b.price - a.price : (a.distance ?? far) - (b.distance ?? far)));
  });
  protected readonly local = computed(() => this.matched().filter((p) => p.area === this.area.current()));
  protected readonly nearby = computed(() => this.matched().filter((p) => p.area !== this.area.current()));

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const kind = params.get('kind') as Tab | null;
      const num = (k: string) => (params.get(k) ? Number(params.get(k)) : null);
      this.term.set(params.get('q') ?? '');
      this.kind.set(kind && TABS.some((t) => t.key === kind) ? kind : 'all');
      this.min.set(num('min'));
      this.max.set(num('max'));
      this.xuOnly.set(params.get('xu') === '1');
      const sort = params.get('sort') as Sort | null;
      this.sort.set(sort && ['near', 'low', 'high'].includes(sort) ? sort : 'near');
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
    this.navigate({ kind: k === 'all' ? null : k, sort: null });
  }

  protected setPrice(which: 'min' | 'max', value: string): void {
    this.navigate({ [which]: value || null }, true);
  }

  protected toggleXu(): void {
    this.navigate({ xu: this.xuOnly() ? null : '1' });
  }

  protected setSort(s: string): void {
    this.navigate({ sort: s === 'near' ? null : s });
  }

  protected clear(): void {
    this.navigate({ min: null, max: null, xu: null, sort: null });
  }

  protected toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }

  private navigate(queryParams: Record<string, string | null>, replace = false): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: replace });
  }
}
