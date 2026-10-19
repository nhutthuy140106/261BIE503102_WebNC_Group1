import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { KIND_LABEL, Post, PostKind } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { SavedService } from '../../../core/services/saved';

type Filter = 'all' | PostKind;

/** Bài đã lưu (cùng danh sách với tim ở header), lọc theo 4 nhóm. */
@Component({
  selector: 'app-saved-list',
  standalone: false,
  templateUrl: './saved-list.html',
  styleUrl: './saved-list.css',
})
export class SavedList implements OnInit {
  private readonly postService = inject(PostService);
  protected readonly saved = inject(SavedService);

  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<Filter>('all');
  protected readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    ...(['food', 'goods', 'service', 'job'] as PostKind[]).map((k) => ({ key: k as Filter, label: KIND_LABEL[k] })),
  ];

  protected readonly items = computed(() => {
    const ids = this.saved.ids();
    const f = this.filter();
    return this.posts().filter((p) => ids.includes(p._id) && (f === 'all' || p.kind === f));
  });

  ngOnInit(): void {
    this.postService.getPosts().subscribe({
      next: (l) => {
        this.posts.set(l);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  toggle(p: Post): void {
    this.saved.toggle(p._id);
  }
}
