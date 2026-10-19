import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { Post } from '../models/post';
import { postFromApi } from '../utils/api-mappers';
import { rankSimilar } from '../utils/recommend';
import { ApiService } from './api';
import { OrderService } from './order';
import { PostService } from './post';
import { SavedService } from './saved';

/** Gợi ý (planning 3.8). Mock: content-based ở FE; thật: /posts/:id/similar, /me/recommendations. */
@Injectable({ providedIn: 'root' })
export class RecommendService {
  private readonly api = inject(ApiService);
  private readonly posts = inject(PostService);
  private readonly orders = inject(OrderService);
  private readonly saved = inject(SavedService);

  similar(postId: string, limit = 4): Observable<Post[]> {
    if (!useMock('recommend')) return this.api.get<unknown[]>(`/posts/${postId}/similar`, { limit }).pipe(map((l) => l.map(postFromApi)));
    return this.posts.getPosts().pipe(
      map((all) => {
        const seed = all.find((p) => p._id === postId);
        // Việc làm và đồ ăn/dịch vụ không gợi ý lẫn nhau
        return seed ? rankSimilar([seed], all.filter((p) => (p.kind === 'job') === (seed.kind === 'job')), limit) : [];
      }),
    );
  }

  /** Gợi ý theo bài đã lưu + bài đã đặt; chưa có dữ liệu thì trả rỗng để ẩn khối. */
  forYou(limit = 4): Observable<Post[]> {
    if (!useMock('recommend')) return this.api.get<unknown[]>('/me/recommendations', { limit }).pipe(map((l) => l.map(postFromApi)));
    return forkJoin({ all: this.posts.getPosts(), orders: this.orders.getOrders() }).pipe(
      map(({ all, orders }) => {
        const ids = new Set([...this.saved.ids(), ...orders.filter((o) => o.type === 'placed').map((o) => o.postId)]);
        const seeds = all.filter((p) => ids.has(p._id));
        return rankSimilar(seeds, all.filter((p) => p.kind !== 'job'), limit);
      }),
    );
  }
}
