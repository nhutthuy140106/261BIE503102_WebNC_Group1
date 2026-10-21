import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Post, PostKind } from '../../../core/models/post';
import { AuthPromptService } from '../../../core/services/auth-prompt';
import { AuthService } from '../../../core/services/auth';
import { PostService } from '../../../core/services/post';
import { RecommendService } from '../../../core/services/recommend';
import { SavedService } from '../../../core/services/saved';
import { SearchUiService } from '../../../core/services/search-ui';

type FeedFilter = 'all' | PostKind;
type FeedSort = 'near' | 'new' | 'cheap' | 'dear' | 'pay';

const BATCH = 8;
const MAX_AUTO_LOADS = 3;

/** Trang chủ không gian Mua — bê từ design/mockups/home-v5.html (khối đầu trang giữ bản đã duyệt: kiến người nhện). */
@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly router = inject(Router);
  private readonly prompt = inject(AuthPromptService);
  protected readonly auth = inject(AuthService);
  protected readonly saved = inject(SavedService);
  protected readonly search = inject(SearchUiService);
  private readonly recommend = inject(RecommendService);

  private readonly bigSearch = viewChild.required<ElementRef<HTMLElement>>('bigSearch');
  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');
  private observers: IntersectionObserver[] = [];

  protected readonly forYou = signal<Post[]>([]);
  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly dragging = signal(false);

  protected readonly popular = ['cơm trưa', 'trà sữa', 'giặt sấy', 'dọn nhà', 'sửa điện nước', 'mua hộ', 'trông thú cưng'];

  /**
   * Các khối chọn bài theo thứ tự Nổi bật → Gợi ý → Gần bạn → Việc mới → Khám phá,
   * mỗi khối bỏ những bài khối trước đã hiện, nên một bài chỉ xuất hiện một lần.
   */
  protected readonly featured = computed(() => this.posts().filter((p) => p.promoted).slice(0, 4));
  protected readonly forYouShown = computed(() => {
    const taken = new Set(this.featured().map((p) => p._id));
    return this.forYou().filter((p) => !taken.has(p._id)).slice(0, 4);
  });
  protected readonly nearby = computed(() => {
    const taken = new Set([...this.featured(), ...this.forYouShown()].map((p) => p._id));
    return this.posts().filter((p) => p.kind !== 'job' && !p.promoted && !taken.has(p._id)).slice(0, 4);
  });
  protected readonly jobs = computed(() => {
    const taken = new Set([...this.featured(), ...this.forYouShown()].map((p) => p._id));
    return this.posts().filter((p) => p.kind === 'job' && !taken.has(p._id)).slice(0, 4);
  });

  // ----- Khám phá quanh khu: lọc + sắp xếp, tự tải thêm khi cuộn (8 bài × 3 lần rồi nút "Xem thêm") -----
  protected readonly feedFilters: { key: FeedFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'food', label: 'Đồ ăn & uống' },
    { key: 'goods', label: 'Đồ dùng' },
    { key: 'service', label: 'Dịch vụ' },
    { key: 'job', label: 'Việc làm' },
  ];
  private readonly sortLabels: Record<FeedSort, string> = {
    near: 'Gần nhất',
    new: 'Mới nhất',
    cheap: 'Giá thấp → cao',
    dear: 'Giá cao → thấp',
    pay: 'Tiền công cao nhất',
  };
  private readonly sortOptions: Record<FeedFilter, FeedSort[]> = {
    all: ['near', 'new', 'cheap', 'dear'],
    food: ['near', 'new', 'cheap', 'dear'],
    goods: ['near', 'new', 'cheap', 'dear'],
    service: ['near', 'new', 'cheap', 'dear'],
    job: ['new', 'near', 'pay'],
  };
  protected readonly feedFilter = signal<FeedFilter>('all');
  protected readonly feedSort = signal<FeedSort>('near');
  protected readonly sortMenuOpen = signal(false);
  protected readonly sortMenu = computed(() => this.sortOptions[this.feedFilter()].map((k) => ({ key: k, label: this.sortLabels[k] })));
  protected readonly sortLabel = computed(() => this.sortLabels[this.feedSort()]);

  private readonly feedAll = computed(() => {
    const shown = new Set([...this.featured(), ...this.forYouShown(), ...this.nearby(), ...this.jobs()].map((p) => p._id));
    const f = this.feedFilter();
    // hết bài chưa hiện thì để trống (có thông báo), không lấy lại bài đã hiện ở trên
    const pool = this.posts().filter((p) => (f === 'all' || p.kind === f) && !shown.has(p._id));
    const by = this.feedSort();
    const far = Number.MAX_SAFE_INTEGER;
    return [...pool].sort((a, b) => {
      switch (by) {
        case 'near':
          return (a.distance ?? far) - (b.distance ?? far);
        case 'cheap':
          return a.price - b.price;
        case 'dear':
        case 'pay':
          return b.price - a.price;
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  });
  protected readonly shownCount = signal(0);
  protected readonly loads = signal(0);
  protected readonly loadingMore = signal(false);
  protected readonly feed = computed(() => this.feedAll().slice(0, this.shownCount()));
  protected readonly showMoreButton = computed(() => this.loads() >= MAX_AUTO_LOADS && this.shownCount() < this.feedAll().length);

  /** Kiến người nhện chào hàng xóm: các câu đổi dần, bấm vào kiến để nghe câu khác (giống kiến ở trang giới thiệu). */
  protected readonly greeting = signal('');
  protected readonly greetingShown = signal(false);
  private readonly chat = ['Chào <i>hàng xóm</i>!', 'Cần gì <i>cứ gọi</i>!', 'Có <i>mình</i> đây!', 'Ghé chơi <i>nha</i>!'];
  private chatIndex = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];

  /** Nói một câu rồi tự ẩn sau vài giây. */
  protected say(html: string, ms = 2600): void {
    this.greeting.set(html);
    this.greetingShown.set(true);
    this.timers.push(setTimeout(() => this.greetingShown.set(false), ms));
  }

  protected nextGreeting(): void {
    this.say(this.chat[this.chatIndex++ % this.chat.length]);
  }

  ngOnInit(): void {
    // kiến thả xuống xong (~2,6 giây) mới chào, rồi cứ 10 giây nói thêm một câu
    this.timers.push(setTimeout(() => this.nextGreeting(), 2800));
    const loop = setInterval(() => !document.hidden && this.nextGreeting(), 10000);
    this.timers.push(loop as unknown as ReturnType<typeof setTimeout>);
    // Gợi ý theo bài đã lưu/đã đặt; chưa có dữ liệu thì khối tự ẩn
    this.recommend.forYou().subscribe({ next: (l) => this.forYou.set(l), error: () => this.forYou.set([]) });
    this.postService.getPosts().subscribe({
      // Lỗi -> về "Safe State": danh sách rỗng + thông báo, không để spinner quay mãi
      next: (list) => {
        this.posts.set(list);
        this.loading.set(false);
        this.resetFeed();
      },
      error: (e: Error) => {
        this.posts.set([]);
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    // cuộn qua ô tìm kiếm lớn → ô gọn trượt lên giữa header
    const big = new IntersectionObserver(([e]) => this.search.hideCompact.set(e.isIntersecting || e.boundingClientRect.top >= 64), { rootMargin: '-64px 0px 0px 0px' });
    big.observe(this.bigSearch().nativeElement);
    // cuộn gần tới cuối khối Khám phá → tự tải thêm (tối đa 3 lần, sau đó hiện nút "Xem thêm")
    const feed = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && this.loads() > 0 && this.loads() < MAX_AUTO_LOADS) this.loadMore();
    }, { rootMargin: '300px' });
    feed.observe(this.sentinel().nativeElement);
    this.observers.push(big, feed);
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
    this.observers.forEach((o) => o.disconnect());
    this.search.hideCompact.set(false);
    this.search.clearImage();
  }

  // ----- tìm kiếm -----
  /** Bấm một mục "Phổ biến" → điền vào ô tìm kiếm (không đi ngay). */
  protected fill(word: string, input: HTMLInputElement): void {
    this.search.text.set(word);
    input.focus();
  }

  protected submitSearch(): void {
    this.router.navigate(['/search'], { queryParams: { q: this.search.text().trim() || null } });
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) this.search.useImage(f);
  }

  protected onPickImage(): void {
    this.search.pickImage();
    this.bigSearch().nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  protected scrollTo(el: HTMLElement): void {
    el.scrollIntoView({ behavior: 'smooth' });
  }

  // ----- Khám phá -----
  protected setFilter(f: FeedFilter): void {
    this.feedFilter.set(f);
    if (!this.sortOptions[f].includes(this.feedSort())) this.feedSort.set(this.sortOptions[f][0]);
    this.resetFeed();
  }

  protected setSort(s: FeedSort): void {
    this.feedSort.set(s);
    this.sortMenuOpen.set(false);
    this.resetFeed();
  }

  private resetFeed(): void {
    this.shownCount.set(0);
    this.loads.set(0);
    this.loadMore();
  }

  protected loadMore(): void {
    if (this.loadingMore()) return;
    if (!this.feedAll().length || this.shownCount() >= this.feedAll().length) return; // hết bài thì dừng, không lặp lại bài đã hiện
    this.loadingMore.set(true);
    this.timers.push(
      setTimeout(() => {
        this.shownCount.update((n) => n + BATCH);
        this.loads.update((n) => n + 1);
        this.loadingMore.set(false);
      }, 450),
    );
  }

  protected loadMoreClick(): void {
    this.loads.set(0);
    this.loadMore();
  }

  @HostListener('document:click')
  closeSortMenu(): void {
    this.sortMenuOpen.set(false);
  }

  // ----- khác -----
  protected toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }

  /** "Đăng việc cần người": khách → đăng nhập trước; đã đăng nhập → màn đăng việc phía Bán. */
  protected postJob(): void {
    if (this.prompt.require('post')) this.router.navigate(['/seller/posts/new']);
  }
}
