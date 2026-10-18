import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, of } from 'rxjs';
import { KIND_LABEL, Post } from '../../../core/models/post';
import { CartService } from '../../../core/services/cart';
import { PostService } from '../../../core/services/post';
import { resolveId } from '../../../core/utils/slug-helper';

/** Chi tiết đồ ăn / đồ dùng / dịch vụ. URL: /posts/<slug>-<ObjectId> hoặc /posts/<ObjectId>. */
@Component({
  selector: 'app-post-detail',
  standalone: false,
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.css',
})
export class PostDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly cart = inject(CartService);

  protected readonly kindLabel = KIND_LABEL;
  protected readonly post = signal<Post | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected quantity = 1;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = resolveId(params.get('slug') ?? '');
          this.loading.set(true);
          return id ? this.postService.getPostById(id) : of(undefined);
        }),
      )
      .subscribe({
        next: (p) => {
          this.post.set(p ?? null);
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.error.set(e.message);
          this.loading.set(false);
        },
      });
  }

  addToCart(p: Post): void {
    this.cart.add({ postId: p._id, title: p.title, price: p.price }, this.quantity);
    this.router.navigate(['/orders']);
  }

  back(): void {
    this.router.navigate(['/search']);
  }
}
