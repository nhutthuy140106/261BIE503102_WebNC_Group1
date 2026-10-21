import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, retry, throwError } from 'rxjs';
import { API_BASE, useMock } from '../config/api.config';
import { Post, PostKind } from '../models/post';
import { stripAccents } from '../utils/slug-helper';
import { jobFromApi, postFromApi } from '../utils/api-mappers';
import { ApiService } from './api';
import { MockDb } from './mock-db';

export interface PostFilter {
  q?: string;
  kind?: PostKind;
  min?: number;
  max?: number;
  block?: string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);
  private readonly db = inject(MockDb);
  private readonly api = inject(ApiService);

  /** Mock: kho `posts` (nạp từ datasets/posts.json, phía Bán ghi thêm vào đây). Bài đã đóng không hiện. */
  getPosts(): Observable<Post[]> {
    if (useMock('post')) return this.db.list<Post>('posts').pipe(map((l) => l.filter((p) => !p.closed).map(freshen)));
    // API thật: bài (đồ ăn/đồ dùng/dịch vụ) và việc làm ở hai endpoint riêng → gộp lại
    return forkJoin([
      this.api.get<unknown[]>('/posts', { limit: 100 }),
      this.api.get<unknown[]>('/jobs', { limit: 100 }),
    ]).pipe(map(([posts, jobs]) => [...posts.map(postFromApi), ...jobs.map(jobFromApi)]));
  }

  getPostById(id: string): Observable<Post | undefined> {
    if (!useMock('post')) {
      // id có thể là bài hoặc việc: thử /posts/:id rồi /jobs/:id; cả hai không có → undefined (trang "không tồn tại")
      return this.api.get<unknown>(`/posts/${id}`).pipe(
        map(postFromApi),
        catchError(() => this.api.get<unknown>(`/jobs/${id}`).pipe(map(jobFromApi))),
        catchError(() => of(undefined)),
      );
    }
    return this.getPosts().pipe(map((list) => list.find((p) => p._id === id)));
  }

  /** Các bài theo danh sách id, kể cả bài đã đóng (ngăn kéo Đã lưu cần hiện "Tạm ngưng nhận"). */
  getByIds(ids: string[]): Observable<Post[]> {
    if (!ids.length) return of([]);
    if (useMock('post')) return this.db.list<Post>('posts').pipe(map((l) => ids.map((id) => l.find((p) => p._id === id)).filter((p): p is Post => !!p)));
    return forkJoin(ids.map((id) => this.getPostById(id))).pipe(map((l) => l.filter((p): p is Post => !!p)));
  }

  /** Bài của một người bán/người đăng việc (gian hàng). Thật: GET /posts?seller=<id>. */
  getBySeller(sellerId: string): Observable<Post[]> {
    return this.getPosts().pipe(map((list) => list.filter((p) => p.sellerId === sellerId)));
  }

  /** Lọc phía client (mock). Khi có backend: đẩy filter lên query string. */
  search(filter: PostFilter): Observable<Post[]> {
    return this.getPosts().pipe(map((list) => list.filter((p) => matches(p, filter))));
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => new Error(error.message));
  }
}

/** Mock: đổi `agoMin` thành createdAt thật để "đăng 2 giờ trước" đúng theo thời điểm đang xem. */
function freshen(p: Post): Post {
  return p.agoMin == null ? p : { ...p, createdAt: new Date(Date.now() - p.agoMin * 60_000).toISOString() };
}

export function matches(p: Post, f: PostFilter): boolean {
  if (f.kind && p.kind !== f.kind) return false;
  if (f.block && p.block !== f.block) return false;
  if (f.min != null && p.price < f.min) return false;
  if (f.max != null && p.price > f.max) return false;
  if (f.q) {
    const q = stripAccents(f.q);
    if (!stripAccents(p.title).includes(q) && !stripAccents(p.description).includes(q)) {
      return false;
    }
  }
  return true;
}
