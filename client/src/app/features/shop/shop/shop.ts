import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { Post } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { REVIEW_SAMPLES } from '../../../core/config/review-samples';
import { unsplash } from '../../../core/config/post-templates';
import { TemplateKey } from '../../../core/models/post-template';
import { AuthPromptService } from '../../../core/services/auth-prompt';
import { SavedService } from '../../../core/services/saved';
import { AuthService } from '../../../core/services/auth';
import { SellerSpaceService } from '../../../core/services/seller-space';
import { PublicShop, ShopService } from '../../../core/services/shop';
import { ReviewService } from '../../../core/services/review';
import { SampleReview } from '../../../core/models/post-template';
import { useMock } from '../../../core/config/api.config';

const FOLLOW_KEY = 'antgo_follow';
type Tab = 'selling' | 'jobs' | 'reviews';

/**
 * Gian hàng công khai. Chỉ hiện số liệu tính từ dữ liệu thật của các bài:
 * số bài đang đăng, điểm ★ trung bình (có trọng số theo số đánh giá). Không bịa số đơn/thời gian trả lời.
 */
@Component({
  selector: 'app-shop',
  standalone: false,
  templateUrl: './shop.html',
  styleUrl: './shop.css',
})
export class Shop implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly postService = inject(PostService);
  protected readonly saved = inject(SavedService);
  private readonly prompt = inject(AuthPromptService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly seller = inject(SellerSpaceService);
  private readonly shopService = inject(ShopService);
  private readonly reviewService = inject(ReviewService);
  /** Chế độ thật: hồ sơ, đánh giá, theo dõi lấy từ server (chế độ mẫu giữ cách cũ: từ bài + localStorage) */
  private readonly live = !useMock('seller');
  protected readonly img = unsplash;

  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('selling');
  protected readonly following = signal(false);
  private readonly sellerIdSig = signal('');
  private get sellerId(): string {
    return this.sellerIdSig();
  }

  /** Gian hàng của chính mình: có thêm ảnh bìa, lời giới thiệu, thời gian trả lời… từ hồ sơ bên Bán */
  protected readonly isMe = computed(() => !!this.sellerIdSig() && this.auth.currentUser()?._id === this.sellerIdSig());
  protected readonly own = computed(() => (this.isMe() ? this.seller.shop() ?? null : null));

  /** Chế độ thật */
  private readonly info = signal<PublicShop | null>(null);
  private readonly liveReviews = signal<{ rows: SampleReview[]; bought: string[] } | null>(null);
  /** Hồ sơ hiển thị: của chính mình lấy từ khu Bán, của người khác lấy từ server (chế độ thật); chế độ mẫu người khác không có hồ sơ riêng */
  protected readonly profile = computed(() => this.own() ?? this.info()?.shop ?? null);

  protected readonly name = computed(() => this.posts()[0]?.sellerName ?? '');
  protected readonly block = computed(() => this.posts()[0]?.block ?? '');
  protected readonly area = computed(() => this.posts()[0]?.area ?? '');
  protected readonly selling = computed(() => this.posts().filter((p) => p.kind !== 'job'));
  protected readonly jobs = computed(() => this.posts().filter((p) => p.kind === 'job'));
  protected readonly rating = computed(() => {
    const live = this.info()?.shop;
    if (live) return live.reviewCount ? { avg: Math.round(parseFloat(live.rating.replace(',', '.')) * 10) / 10, count: live.reviewCount } : null;
    const rated = this.posts().filter((p) => p.rating != null && (p.reviewCount ?? 0) > 0);
    const n = rated.reduce((s, p) => s + (p.reviewCount ?? 0), 0);
    if (!n) return null;
    const sum = rated.reduce((s, p) => s + (p.rating ?? 0) * (p.reviewCount ?? 0), 0);
    return { avg: Math.round((sum / n) * 10) / 10, count: n };
  });

  /** Đánh giá mẫu theo loại bài chính của gian hàng (chưa có API đánh giá theo người bán) */
  protected readonly reviews = computed<SampleReview[]>(() => {
    if (this.live) return this.liveReviews()?.rows ?? [];
    const t = (this.selling()[0]?.template ?? (this.jobs().length ? 'trip' : 'food')) as TemplateKey;
    return REVIEW_SAMPLES[t] ?? [];
  });
  /** Dòng "Đã mua: …" dưới mỗi đánh giá (như Shopee): món/dịch vụ khách đã dùng, lấy từ bài đang bán của gian hàng (mock) */
  protected bought(i: number): string {
    if (this.live) {
      const title = this.liveReviews()?.bought[i];
      return title ? 'Đã đặt: ' + title : '';
    }
    const l = this.selling();
    const p = l[i % (l.length || 1)];
    if (!p) return '';
    return (p.kind === 'food' ? 'Đã đặt: ' : p.kind === 'service' ? 'Đã dùng dịch vụ: ' : 'Đã mua: ') + p.title;
  }
  protected readonly done = computed(() => this.posts().reduce((s, p) => s + (p.reviewCount ?? 0), 0));
  /** 4.7 → "4,7" (số thập phân kiểu Việt Nam, giống thẻ bài) */
  protected readonly fmt = (n: number): string => String(n).replace('.', ',');
  protected readonly stars = (n: number) => [1, 2, 3, 4, 5].map((i) => (i <= n ? 1 : 0));

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((p) => {
          this.sellerIdSig.set(p.get('id') ?? '');
          if (this.isMe()) this.seller.load().subscribe({ error: () => undefined });
          this.loading.set(true);
          this.following.set(this.readFollow().includes(this.sellerId));
          if (this.live && this.sellerId) {
            // thật: hồ sơ + trạng thái theo dõi + đánh giá của người bán lấy từ server (lỗi một phần không làm hỏng trang)
            this.info.set(null);
            this.liveReviews.set(null);
            this.shopService.info(this.sellerId).pipe(catchError(() => of(null))).subscribe((i) => { this.info.set(i); if (i) this.following.set(i.following); });
            this.reviewService.forSeller(this.sellerId).pipe(catchError(() => of({ rows: [], bought: [] }))).subscribe((r) => this.liveReviews.set(r));
          }
          return this.postService.getBySeller(this.sellerId);
        }),
      )
      .subscribe({
        next: (list) => {
          this.posts.set(list);
          this.tab.set(list.some((p) => p.kind !== 'job') || !list.length ? 'selling' : 'jobs');
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.error.set(e.message);
          this.loading.set(false);
        },
      });
  }

  toggleFollow(): void {
    if (!this.prompt.require('follow')) return;
    if (this.live) {
      // thật: ghi lên server; số người theo dõi và nút đổi theo kết quả server trả về
      const call = this.following() ? this.shopService.unfollow(this.sellerId) : this.shopService.follow(this.sellerId);
      call.subscribe({
        next: (r) => {
          this.following.set(r.following);
          const cur = this.info();
          if (cur) this.info.set({ ...cur, following: r.following, shop: { ...cur.shop, followers: r.followers } });
        },
        error: () => undefined,
      });
      return;
    }
    const ids = this.readFollow();
    const next = ids.includes(this.sellerId) ? ids.filter((x) => x !== this.sellerId) : [...ids, this.sellerId];
    this.following.set(next.includes(this.sellerId));
    try {
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
    } catch {
      /* chặn lưu trữ: trạng thái vẫn đúng trong phiên */
    }
  }

  message(): void {
    if (this.prompt.require('chat')) this.router.navigate(['/messenger'], { queryParams: { to: this.name(), av: this.posts()[0]?.sellerAvatar } });
  }

  toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }

  private readFollow(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
}
