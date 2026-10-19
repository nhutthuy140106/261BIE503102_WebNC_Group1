import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Post, PostKind } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { RecommendService } from '../../../core/services/recommend';
import { SavedService } from '../../../core/services/saved';

type FeedFilter = 'all' | PostKind;
type FeedSort = 'newest' | 'priceAsc' | 'priceDesc';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly postService = inject(PostService);
  private readonly router = inject(Router);
  protected readonly saved = inject(SavedService);
  private readonly recommend = inject(RecommendService);
  protected readonly forYou = signal<Post[]>([]);

  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly popular = ['cơm trưa', 'trà sữa', 'giặt sấy', 'dọn nhà', 'sửa điện nước', 'mua hộ', 'trông thú cưng'];

  protected readonly featured = computed(() => this.posts().filter((p) => p.promoted));
  protected readonly nearby = computed(() => this.posts().filter((p) => p.kind !== 'job' && !p.promoted));
  protected readonly jobs = computed(() => this.posts().filter((p) => p.kind === 'job'));

  /** Khối Khám phá: lọc theo nhóm + sắp xếp, bài ở các khối trên không lặp lại. */
  protected readonly feedFilters: { key: FeedFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'food', label: 'Đồ ăn & uống' },
    { key: 'goods', label: 'Đồ dùng' },
    { key: 'service', label: 'Dịch vụ' },
    { key: 'job', label: 'Việc làm' },
  ];
  protected readonly feedSorts: { key: FeedSort; label: string }[] = [
    { key: 'newest', label: 'Mới nhất' },
    { key: 'priceAsc', label: 'Giá thấp → cao' },
    { key: 'priceDesc', label: 'Giá cao → thấp' },
  ];
  protected readonly feedFilter = signal<FeedFilter>('all');
  protected readonly feedSort = signal<FeedSort>('newest');
  protected readonly feed = computed(() => {
    const shown = new Set([...this.featured(), ...this.nearby().slice(0, 4), ...this.jobs().slice(0, 4)].map((p) => p._id));
    const f = this.feedFilter();
    const list = this.posts().filter((p) => (f === 'all' || p.kind === f) && !shown.has(p._id));
    const pool = list.length ? list : this.posts().filter((p) => f === 'all' || p.kind === f);
    const by = this.feedSort();
    return [...pool].sort((a, b) =>
      by === 'priceAsc' ? a.price - b.price : by === 'priceDesc' ? b.price - a.price : b.createdAt.localeCompare(a.createdAt),
    );
  });

  ngOnInit(): void {
    // Gợi ý theo bài đã lưu/đã đặt; chưa có dữ liệu thì khối tự ẩn
    this.recommend.forYou().subscribe({ next: (l) => this.forYou.set(l), error: () => this.forYou.set([]) });
    this.postService.getPosts().subscribe({
      // Lỗi -> về "Safe State": danh sách rỗng + thông báo, không để spinner quay mãi
      next: (list) => {
        this.posts.set(list);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.posts.set([]);
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  search(q: string): void {
    this.router.navigate(['/search'], { queryParams: { q: q.trim() || null } });
  }

  goSearch(kind?: string): void {
    this.router.navigate(['/search'], { queryParams: { kind: kind ?? null } });
  }

  toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }
}
