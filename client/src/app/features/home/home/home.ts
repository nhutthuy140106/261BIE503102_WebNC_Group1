import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { SavedService } from '../../../core/services/saved';

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

  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly featured = computed(() => this.posts().filter((p) => p.promoted));
  protected readonly nearby = computed(() => this.posts().filter((p) => p.kind !== 'job' && !p.promoted));
  protected readonly jobs = computed(() => this.posts().filter((p) => p.kind === 'job'));

  ngOnInit(): void {
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

  goSearch(kind?: string): void {
    this.router.navigate(['/search'], { queryParams: { kind: kind ?? null } });
  }

  toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }
}
