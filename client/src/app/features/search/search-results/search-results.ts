import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KIND_LABEL, Post, PostKind } from '../../../core/models/post';
import { PostFilter, PostService } from '../../../core/services/post';
import { SavedService } from '../../../core/services/saved';

const KINDS: PostKind[] = ['food', 'goods', 'service', 'job'];

/** Bộ lọc nằm trên query params nên copy URL là giữ nguyên kết quả lọc. */
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

  protected readonly kinds = KINDS;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly results = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected filter: PostFilter = {};

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const kind = params.get('kind') as PostKind | null;
      const num = (k: string) => (params.get(k) ? Number(params.get(k)) : undefined);
      this.filter = {
        q: params.get('q') ?? undefined,
        kind: kind && KINDS.includes(kind) ? kind : undefined,
        min: num('min'),
        max: num('max'),
      };
      this.load();
    });
  }

  setKind(kind: PostKind | null): void {
    this.navigate({ kind });
  }

  applyPrice(min: string, max: string): void {
    this.navigate({ min: min || null, max: max || null });
  }

  toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }

  private navigate(queryParams: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }

  private load(): void {
    this.loading.set(true);
    this.postService.search(this.filter).subscribe({
      next: (list) => {
        this.results.set(list);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.results.set([]);
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }
}
