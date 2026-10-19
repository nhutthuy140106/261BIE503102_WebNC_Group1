import { Component, OnInit, inject, signal } from '@angular/core';
import { KIND_LABEL, Post } from '../../../core/models/post';
import { SellerService } from '../../../core/services/seller';
import { createSlug } from '../../../core/utils/slug-helper';

@Component({
  selector: 'app-post-manage',
  standalone: false,
  styleUrl: './post-manage.css',
  templateUrl: './post-manage.html',
})
export class PostManage implements OnInit {
  private readonly seller = inject(SellerService);

  protected readonly kindLabel = KIND_LABEL;
  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmId = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  /** Trả chuỗi (không phải mảng mới mỗi lần) để [routerLink] không bị đổi giá trị liên tục. */
  slugOf(p: Post): string {
    return createSlug(p.title, p._id);
  }

  toggleClosed(p: Post): void {
    this.seller.setClosed(p._id, !p.closed).subscribe({
      next: (n) => this.posts.update((l) => l.map((x) => (x._id === n._id ? n : x))),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  remove(p: Post): void {
    if (this.confirmId() !== p._id) return void this.confirmId.set(p._id);
    this.seller.removePost(p._id).subscribe({
      next: () => {
        this.confirmId.set(null);
        this.posts.update((l) => l.filter((x) => x._id !== p._id));
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  private reload(): void {
    this.seller.myPosts().subscribe({
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
}
