import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { Offer } from '../models/offer';
import { Order } from '../models/order';
import { Post, PostKind } from '../models/post';
import { PosterAction, SellerOrderAction, applyPoster, applySellerOrder } from '../utils/seller-state';
import { ApiService } from './api';
import { AuthService } from './auth';
import { MockDb } from './mock-db';

export interface PostBody {
  kind: PostKind;
  title: string;
  description: string;
  price: number;
  priceUnit?: string;
  block: string;
  images: string[];
  acceptsXu?: boolean;
  /** Chỉ cho việc làm: khung thời gian làm */
  due?: string;
}

/**
 * Phía Bán & Đăng việc: bài của tôi, đơn khách đặt, đề nghị nhận việc.
 * Mock dùng cùng kho `posts` với phía Mua nên bài vừa đăng hiện ngay ở trang chủ.
 * Endpoint thật do phiên Bán/Planning chốt (chưa có trong api-buyer-job.md) — đường dẫn dưới đây là đề xuất.
 */
@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);
  private readonly auth = inject(AuthService);

  private get me(): string {
    return this.auth.currentUser()?._id ?? '';
  }

  // ---- Bài đăng của tôi ----
  myPosts(): Observable<Post[]> {
    if (!useMock('seller')) return this.api.get<Post[]>('/seller/posts');
    return this.db.list<Post>('posts').pipe(map((l) => l.filter((p) => p.sellerId === this.me).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
  }

  getPost(id: string): Observable<Post> {
    return this.myPosts().pipe(
      map((l) => {
        const p = l.find((x) => x._id === id);
        if (!p) throw new AppError('Không tìm thấy bài của bạn.', 404, 'NOT_FOUND');
        return p;
      }),
    );
  }

  savePost(body: PostBody, id?: string): Observable<Post> {
    if (!useMock('seller')) return id ? this.api.put<Post>(`/seller/posts/${id}`, body) : this.api.post<Post>('/seller/posts', body);
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        const user = this.auth.currentUser();
        if (!user) throw new AppError('Bạn cần đăng nhập.', 401, 'UNAUTHORIZED');
        const fields: Partial<Post> = {
          kind: body.kind, title: body.title.trim(), description: body.description.trim(), price: body.price,
          priceUnit: body.priceUnit || undefined, block: body.block, images: body.images, acceptsXu: !!body.acceptsXu,
          job: body.kind === 'job' ? { due: body.due ?? '', offers: 0, status: 'open' } : undefined,
        };
        if (id) {
          const cur = rows.find((r) => r._id === id && r.sellerId === user._id);
          if (!cur) throw new AppError('Không tìm thấy bài của bạn.', 404, 'NOT_FOUND');
          const next: Post = { ...cur, ...fields, job: body.kind === 'job' ? { ...(cur.job ?? { offers: 0, status: 'open' as const }), due: body.due ?? '' } : undefined };
          this.db.save('posts', rows.map((r) => (r._id === id ? next : r)));
          return next;
        }
        const post = { _id: this.db.newId(), sellerId: user._id, sellerName: user.fullName, sellerAvatar: user.avatar, createdAt: new Date().toISOString(), ...fields } as Post;
        this.db.save('posts', [post, ...rows]);
        return post;
      }),
    );
  }

  /** Ẩn bài khỏi phía Mua (đóng) hoặc mở lại. */
  setClosed(id: string, closed: boolean): Observable<Post> {
    if (!useMock('seller')) return this.api.patch<Post>(`/seller/posts/${id}`, { closed });
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id && r.sellerId === this.me);
        if (!cur) throw new AppError('Không tìm thấy bài của bạn.', 404, 'NOT_FOUND');
        const next = { ...cur, closed };
        this.db.save('posts', rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  removePost(id: string): Observable<void> {
    if (!useMock('seller')) return this.api.delete(`/seller/posts/${id}`);
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        if (!rows.some((r) => r._id === id && r.sellerId === this.me)) throw new AppError('Không tìm thấy bài của bạn.', 404, 'NOT_FOUND');
        this.db.save('posts', rows.filter((r) => r._id !== id));
      }),
    );
  }

  // ---- Đơn khách đặt ----
  incomingOrders(): Observable<Order[]> {
    return useMock('seller') ? this.db.list<Order>('seller-orders') : this.api.get<Order[]>('/seller/orders');
  }

  orderAction(id: string, action: SellerOrderAction): Observable<Order> {
    if (!useMock('seller')) return this.api.post<Order>(`/seller/orders/${id}/${action}`);
    return this.db.list<Order>('seller-orders').pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id);
        if (!cur) throw new AppError('Không tìm thấy đơn.', 404, 'NOT_FOUND');
        let next: Order;
        try {
          next = applySellerOrder(cur, action);
        } catch {
          throw new AppError('Thao tác không hợp lệ ở trạng thái hiện tại.', 409, 'INVALID_STATE');
        }
        this.db.save('seller-orders', rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  // ---- Đề nghị nhận việc của tôi (người đăng việc chọn người) ----
  incomingOffers(): Observable<Offer[]> {
    return useMock('seller') ? this.db.list<Offer>('seller-offers') : this.api.get<Offer[]>('/seller/offers');
  }

  offerAction(id: string, action: PosterAction): Observable<Offer[]> {
    if (!useMock('seller')) return this.api.post<Offer[]>(`/seller/offers/${id}/${action}`);
    return this.db.list<Offer>('seller-offers').pipe(
      map((rows) => {
        let next: Offer[];
        try {
          next = applyPoster(rows, id, action);
        } catch {
          throw new AppError('Thao tác không hợp lệ ở trạng thái hiện tại.', 409, 'INVALID_STATE');
        }
        this.db.save('seller-offers', next);
        return next;
      }),
    );
  }
}
