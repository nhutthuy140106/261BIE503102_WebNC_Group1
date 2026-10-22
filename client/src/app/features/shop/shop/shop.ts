import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { Post } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { REVIEW_SAMPLES } from '../../../core/config/review-samples';
import { unsplash } from '../../../core/config/post-templates';
import { TemplateKey } from '../../../core/models/post-template';
import { AuthPromptService } from '../../../core/services/auth-prompt';
import { SavedService } from '../../../core/services/saved';

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
  protected readonly img = unsplash;

  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('selling');
  protected readonly following = signal(false);
  private sellerId = '';

  protected readonly name = computed(() => this.posts()[0]?.sellerName ?? '');
  protected readonly block = computed(() => this.posts()[0]?.block ?? '');
  protected readonly selling = computed(() => this.posts().filter((p) => p.kind !== 'job'));
  protected readonly jobs = computed(() => this.posts().filter((p) => p.kind === 'job'));
  protected readonly rating = computed(() => {
    const rated = this.posts().filter((p) => p.rating != null && (p.reviewCount ?? 0) > 0);
    const n = rated.reduce((s, p) => s + (p.reviewCount ?? 0), 0);
    if (!n) return null;
    const sum = rated.reduce((s, p) => s + (p.rating ?? 0) * (p.reviewCount ?? 0), 0);
    return { avg: Math.round((sum / n) * 10) / 10, count: n };
  });

  /** Đánh giá mẫu theo loại bài chính của gian hàng (chưa có API đánh giá theo người bán) */
  protected readonly reviews = computed(() => {
    const t = (this.selling()[0]?.template ?? (this.jobs().length ? 'trip' : 'food')) as TemplateKey;
    return REVIEW_SAMPLES[t] ?? [];
  });
  protected readonly done = computed(() => this.posts().reduce((s, p) => s + (p.reviewCount ?? 0), 0));
  protected readonly stars = (n: number) => [1, 2, 3, 4, 5].map((i) => (i <= n ? 1 : 0));

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((p) => {
          this.sellerId = p.get('id') ?? '';
          this.loading.set(true);
          this.following.set(this.readFollow().includes(this.sellerId));
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
