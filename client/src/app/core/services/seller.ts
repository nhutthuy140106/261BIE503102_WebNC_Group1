import { Injectable, inject } from '@angular/core';
import type { Promo } from '../utils/promo';
import type { OrderWindow } from '../utils/order-window';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { Offer } from '../models/offer';
import { Order } from '../models/order';
import { DayHours, SellerChat, SellerOrder, SellerPause, SellerReview, SellerStats, StatsRange } from '../models/seller';
import { PayMethod, Post, PostItem, PostKind, PostQuestion, PostStatus, OptionGroup, PriceType } from '../models/post';
import { jobFromApi, postFromApi } from '../utils/api-mappers';
import { ServerShop, chatContextToApi, jobBodyToApi, sellerChatFromApi, postBodyToApi, posterOfferFromApi, sellerOrderFromApi, sellerReviewFromApi } from '../utils/seller-mappers';
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
  /** Giờ vàng (khuyến mãi theo khung giờ); null = tắt */
  promo?: Promo | null;
  /** Khung giờ nhận đơn của bài (người bán đặt); null = không giới hạn */
  orderWindow?: OrderWindow | null;
  /** Combo: các món cùng người bán + giá combo (server tự tính giá lẻ và kiểm hợp lệ) */
  combo?: { items: { postId: string; qty: number }[]; comboPrice: number } | null;
  // ---- hợp đồng Post đủ 7 khối (docs/post-contract.md); form Bán → formToPostBody() điền ----
  category?: string;
  status?: PostStatus;
  priceType?: PriceType;
  estimate?: boolean;
  inspectFee?: number;
  items?: PostItem[];
  optionGroups?: OptionGroup[];
  questions?: PostQuestion[];
  fulfillmentModes?: ('delivery' | 'pickup')[];
  deliveryFee?: number;
  needSchedule?: boolean;
  payMethods?: PayMethod[];
  bank?: Post['bank'];
  quickOptions?: string[];
  noteEnabled?: boolean;
  template?: string;
  freeShipFrom?: number;
  areas?: string[];
  info?: Post['info'];
  dates?: string[];
  timeMode?: Post['timeMode'];
  duration?: Post['duration'];
  repeat?: boolean;
  place?: Post['place'];
  stock?: Post['stock'];
  prepMinutes?: number;
  handover?: Post['handover'];
  condition?: Post['condition'];
  serviceInfo?: Post['serviceInfo'];
  highlights?: Post['highlights'];
  pickupAtBuyer?: boolean;
  bookOnce?: boolean;
  serviceMenu?: Post['serviceMenu'];
  timeLabel?: string;
  noSchedule?: boolean;
  /** Dữ liệu form đăng bài (để mở lại đúng từng ô khi sửa); chỉ gửi ở chế độ thật */
  formData?: { type: string; form: Record<string, unknown> };
  /** Chỉ việc làm */
  job?: { start?: string; end?: string; allDay?: boolean; head?: number; payUnit?: string; due?: string; payBy?: 'cash' | 'transfer'; building?: string; windows?: string[] };
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

  /** Bài / việc server trả về chỉ có id người bán: điền tên, ảnh của tôi để hiển thị giống bài đọc từ phía Mua */
  private mine<T extends Post>(p: T): T {
    const u = this.auth.currentUser();
    return { ...p, sellerId: this.me, sellerName: u?.fullName ?? p.sellerName, sellerAvatar: u?.avatar ?? p.sellerAvatar };
  }

  /** Thử đường dẫn bài; không có thì thử đường dẫn việc (cùng một id không thể nằm ở cả hai) */
  private postOrJob<T>(call: (base: 'posts' | 'jobs') => Observable<T>): Observable<T> {
    return call('posts').pipe(catchError((e: unknown) => (e instanceof AppError && e.status === 404 ? call('jobs') : throwError(() => e))));
  }

  // ---- Bài đăng của tôi ----
  myPosts(): Observable<Post[]> {
    if (!useMock('seller')) {
      return forkJoin([this.api.get<unknown[]>('/seller/posts'), this.api.get<unknown[]>('/seller/jobs')]).pipe(
        map(([posts, jobs]) => [...posts.map((x) => this.mine(postFromApi(x))), ...jobs.map((x) => this.mine(jobFromApi(x)))].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
      );
    }
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
    if (!useMock('seller')) {
      const job = body.kind === 'job';
      const path = `/seller/${job ? 'jobs' : 'posts'}`;
      const data = job ? jobBodyToApi(body) : postBodyToApi(body);
      const saved = id ? this.api.put<unknown>(`${path}/${id}`, data) : this.api.post<unknown>(path, data);
      return saved.pipe(map((x) => this.mine(job ? jobFromApi(x) : postFromApi(x))));
    }
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        const user = this.auth.currentUser();
        if (!user) throw new AppError('Bạn cần đăng nhập.', 401, 'UNAUTHORIZED');
        const fields: Partial<Post> = {
          kind: body.kind, title: body.title.trim(), description: body.description.trim(), price: body.price,
          priceUnit: body.priceUnit || undefined, block: body.block, images: body.images, acceptsXu: !!body.acceptsXu, promo: body.promo ?? undefined, orderWindow: body.orderWindow ?? undefined,
          ...(body.combo
            ? {
                category: 'Combo', priceUnit: body.priceUnit || 'combo',
                combo: { items: body.combo.items, comboPrice: body.combo.comboPrice, listPrice: body.combo.items.reduce((t, i) => t + (rows.find((r) => r._id === i.postId)?.price ?? 0) * i.qty, 0) },
              }
            : {}),
          category: body.combo ? 'Combo' : body.category, status: body.status ?? 'open', closed: (body.status ?? 'open') !== 'open',
          priceType: body.priceType, estimate: body.estimate, inspectFee: body.inspectFee, items: body.items?.length ? body.items : undefined,
          optionGroups: body.optionGroups, questions: body.questions, fulfillmentModes: body.fulfillmentModes, deliveryFee: body.deliveryFee,
          needSchedule: body.needSchedule, payMethods: body.payMethods, bank: body.bank, quickOptions: body.quickOptions, noteEnabled: body.noteEnabled, template: body.template, freeShipFrom: body.freeShipFrom, areas: body.areas, info: body.info, dates: body.dates, timeMode: body.timeMode, duration: body.duration,
          repeat: body.repeat, place: body.place, highlights: body.highlights, pickupAtBuyer: body.pickupAtBuyer, bookOnce: body.bookOnce, serviceMenu: body.serviceMenu, timeLabel: body.timeLabel, noSchedule: body.noSchedule, stock: body.stock, prepMinutes: body.prepMinutes, handover: body.handover, condition: body.condition, serviceInfo: body.serviceInfo,
          job: body.kind === 'job' ? { ...body.job, due: body.job?.due ?? body.due ?? '', offers: 0, status: 'open' } : undefined,
        };
        if (id) {
          const cur = rows.find((r) => r._id === id && r.sellerId === user._id);
          if (!cur) throw new AppError('Không tìm thấy bài của bạn.', 404, 'NOT_FOUND');
          const next: Post = { ...cur, ...fields, job: body.kind === 'job' ? { ...(cur.job ?? { offers: 0, status: 'open' as const }), ...body.job, due: body.job?.due ?? body.due ?? '' } : undefined };
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
    if (!useMock('seller')) return this.postOrJob((b) => this.api.patch<unknown>(`/seller/${b}/${id}`, { closed })).pipe(map((x) => this.mine((x as { type?: string }).type ? postFromApi(x) : jobFromApi(x))));
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id && r.sellerId === this.me);
        if (!cur) throw new AppError('Không tìm thấy bài của bạn.', 404, 'NOT_FOUND');
        const next = { ...cur, closed, status: closed ? ('closed' as const) : ('open' as const) };
        this.db.save('posts', rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  /** Số còn lại của bài có giới hạn số lượng: đơn trừ đi hoặc trả lại thì phía Mua thấy số mới */
  setStockLeft(id: string, left: number): Observable<Post> {
    if (!useMock('seller')) return this.api.patch<unknown>(`/seller/posts/${id}`, { stockLeft: left }).pipe(map((x) => this.mine(postFromApi(x))));
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id);
        if (!cur) throw new AppError('Không tìm thấy bài.', 404, 'NOT_FOUND');
        const next: Post = cur.stock?.mode === 'limit' ? { ...cur, stock: { ...cur.stock, left } } : cur;
        this.db.save('posts', rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  /** Trừ / trả số lượng của từng món trong bài (món để trống số lượng thì không đổi) */
  moveItemsLeft(id: string, deltas: { name: string; delta: number }[]): Observable<Post> {
    // thật: server đã tự trừ / trả số lượng theo từng đơn, không cần đổi thêm
    if (!useMock('seller')) return this.getPost(id);
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id);
        if (!cur) throw new AppError('Không tìm thấy bài.', 404, 'NOT_FOUND');
        const items = cur.items?.map((it) => {
          // một món có thể nằm ở nhiều dòng của đơn (cùng loại, khác tùy chỉnh)
          const d = deltas.filter((x) => x.name === it.name).reduce((n, x) => n + x.delta, 0);
          return d && it.dailyQty !== undefined ? { ...it, dailyQty: Math.max(0, it.dailyQty + d) } : it;
        });
        const next: Post = { ...cur, items };
        this.db.save('posts', rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  /** Đổi nhanh giá đại diện của bài (sửa giá ngay trên thẻ bài phía Bán). */
  setPrice(id: string, price: number): Observable<Post> {
    if (!useMock('seller')) return this.api.patch<unknown>(`/seller/posts/${id}`, { price }).pipe(map((x) => this.mine(postFromApi(x))));
    return this.db.list<Post>('posts').pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id && r.sellerId === this.me);
        if (!cur) throw new AppError('Không tìm thấy bài của bạn.', 404, 'NOT_FOUND');
        const next = { ...cur, price };
        this.db.save('posts', rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  removePost(id: string): Observable<void> {
    if (!useMock('seller')) return this.postOrJob((b) => this.api.delete(`/seller/${b}/${id}`));
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

  /** Sửa nhanh (chế độ thật): chỉ gửi các trường chính đã sửa, phần còn lại của bài giữ nguyên. Bài việc làm: tên, mô tả, tiền công, đơn vị. */
  quickEdit(post: Post, f: { title: string; description: string; price: number; unit: string; images: string[]; open: boolean; left?: number }): Observable<unknown> {
    if (post.kind === 'job') {
      return this.api.put<unknown>(`/seller/jobs/${post._id}`, { title: f.title, desc: f.description, pay: f.price, unit: f.unit }).pipe(
        switchMap(() => this.api.patch<unknown>(`/seller/jobs/${post._id}`, { closed: !f.open })),
      );
    }
    return this.api.put<unknown>(`/seller/posts/${post._id}`, { title: f.title, description: f.description, price: f.price, unit: f.unit, images: f.images }).pipe(
      switchMap(() => this.api.patch<unknown>(`/seller/posts/${post._id}`, { closed: !f.open, ...(f.left !== undefined ? { stockLeft: f.left } : {}) })),
    );
  }

  // ---- Gian hàng (chỉ chế độ thật): hồ sơ, giờ nhận đơn, ngày nghỉ, tạm ngưng, thống kê, đánh giá ----
  shopInfo(): Observable<ServerShop> {
    return this.api.get<ServerShop>('/seller/shop');
  }

  updateShop(body: { name?: string; kind?: string; address?: string; bio?: string; cover?: string | null; replyTime?: string }): Observable<ServerShop> {
    return this.api.put<ServerShop>('/seller/shop', body);
  }

  saveHours(hours: DayHours[]): Observable<ServerShop> {
    return this.api.put<ServerShop>('/seller/shop/hours', { hours });
  }

  /** `date` = yyyy-mm-dd; note null = bỏ ngày nghỉ */
  saveOff(date: string, note: string | null): Observable<ServerShop> {
    return note === null ? this.api.delete(`/seller/shop/offs/${date}`).pipe(switchMap(() => this.shopInfo())) : this.api.put<ServerShop>('/seller/shop/offs', { date, note });
  }

  savePause(pause: SellerPause | null): Observable<ServerShop> {
    return pause ? this.api.put<ServerShop>('/seller/shop/pause', { until: pause.until }) : this.api.delete('/seller/shop/pause').pipe(switchMap(() => this.shopInfo()));
  }

  serverStats(): Observable<Record<StatsRange, SellerStats>> {
    return this.api.get<Record<StatsRange, SellerStats>>('/seller/stats');
  }

  serverReviews(): Observable<SellerReview[]> {
    return this.api.get<unknown[]>('/seller/reviews').pipe(map((l) => l.map((r) => sellerReviewFromApi(r))));
  }

  replyToReview(id: string, text: string): Observable<unknown> {
    return this.api.post<unknown>(`/seller/reviews/${id}/reply`, { text });
  }

  // ---- Messenger (chỉ chế độ thật): dùng chung kho hội thoại với phía Mua ----
  serverChats(jobOfOffer: (offerId: string) => string | undefined): Observable<SellerChat[]> {
    return this.api.get<{ _id: string }[]>('/conversations').pipe(
      switchMap((list) => {
        const top = list.slice(0, 30);
        return top.length ? forkJoin(top.map((c) => this.api.get<unknown[]>(`/conversations/${c._id}/messages`, { limit: 100 }).pipe(map((m) => sellerChatFromApi(c, m as never[], this.me, jobOfOffer))))) : of([] as SellerChat[]);
      }),
    );
  }

  /** Mở (hoặc lấy lại) hội thoại với một người, gắn đơn / việc đang nói tới. Trả về id hội thoại ở server */
  openConversation(withUser: string, ctx: SellerChat['ctx']): Observable<string> {
    return this.api.post<{ _id: string }>('/conversations', { withUser, context: chatContextToApi(ctx) }).pipe(map((c) => c._id));
  }

  sendChat(conversationId: string, text: string, media?: { kind: string; url: string; name?: string; size?: number; sec?: number }): Observable<unknown> {
    return this.api.post<unknown>(`/conversations/${conversationId}/messages`, { text, ...(media ? { media: { kind: media.kind, url: media.url, name: media.name, size: media.size, sec: media.sec } } : {}) });
  }

  readChat(conversationId: string): Observable<unknown> {
    return this.api.post<unknown>(`/conversations/${conversationId}/read`);
  }

  /** Chỉ chế độ thật: đơn khách đặt ở server, đã đổi sang dạng hiển thị của khu Bán */
  incomingSellerOrders(): Observable<SellerOrder[]> {
    return this.api.get<unknown[]>('/seller/orders').pipe(map((l) => l.map((o) => sellerOrderFromApi(o))));
  }

  /** Chỉ chế độ thật: người bán xử lý đơn (confirm · prepare · deliver · ready · complete · decline · approveCancel · keepOrder · surcharge) */
  sellerOrderAct(id: string, action: string, data: { amount?: number; reason?: string; reply?: string; lines?: { name: string; qty: number; price: number }[] } = {}): Observable<SellerOrder> {
    return this.api.post<unknown>(`/seller/orders/${id}/${action}`, data).pipe(map((o) => sellerOrderFromApi(o)));
  }

  // ---- Đề nghị nhận việc của tôi (người đăng việc chọn người) ----
  incomingOffers(): Observable<Offer[]> {
    return useMock('seller') ? this.db.list<Offer>('seller-offers') : this.api.get<unknown[]>('/seller/offers').pipe(map((l) => l.map(posterOfferFromApi)));
  }

  offerAction(id: string, action: PosterAction): Observable<Offer[]> {
    if (!useMock('seller')) return this.api.post<unknown>(`/seller/offers/${id}/${action}`).pipe(switchMap(() => this.incomingOffers()));
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
