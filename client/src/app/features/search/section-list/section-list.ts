import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Post } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { SavedService } from '../../../core/services/saved';

type Key = 'featured' | 'nearby' | 'jobs';
type Sort = 'near' | 'new' | 'low' | 'high';

const TITLES: Record<Key, string> = {
  featured: 'Nổi bật trong khu',
  nearby: 'Gần bạn',
  jobs: 'Việc mới quanh bạn',
};

/**
 * "Xem tất cả" của một khối ở trang chủ: chỉ liệt kê đúng những bài của khối đó
 * (không phải trang tìm kiếm có bộ lọc). URL: /search/section/:key.
 */
@Component({
  selector: 'app-section-list',
  standalone: false,
  templateUrl: './section-list.html',
  styleUrl: './section-list.css',
})
export class SectionList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly postService = inject(PostService);
  protected readonly saved = inject(SavedService);

  protected readonly key = signal<Key>('featured');
  protected readonly all = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly sort = signal<Sort>('near');

  protected readonly title = computed(() => TITLES[this.key()]);
  protected readonly isJobs = computed(() => this.key() === 'jobs');

  protected readonly items = computed(() => {
    const k = this.key();
    const far = Number.MAX_SAFE_INTEGER;
    const list = this.all().filter((p) => (k === 'jobs' ? p.kind === 'job' : k === 'featured' ? !!p.promoted : p.kind !== 'job' && !p.promoted));
    const s = this.sort();
    return [...list].sort((a, b) =>
      s === 'low' ? a.price - b.price : s === 'high' ? b.price - a.price : s === 'new' ? b.createdAt.localeCompare(a.createdAt) : (a.distance ?? far) - (b.distance ?? far),
    );
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      const k = p.get('key') as Key;
      this.key.set(k in TITLES ? k : 'featured');
    });
    this.postService.getPosts().subscribe({
      next: (l) => {
        this.all.set(l);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  protected toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }
}
