import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { CreateOrderBody, Order } from '../models/order';
import { orderFromApi } from '../utils/api-mappers';
import { offerToOrder } from '../utils/offer-state';
import { ApiService } from './api';
import { JobOfferService } from './job-offer';
import { MockDb } from './mock-db';
import { PostService } from './post';

const COLLECTION = 'orders';
const MOCK_DELIVERY_FEE = 7000;

/**
 * Đơn hàng = "Đơn đã đặt" (collection orders) + "Việc đã nhận" (đề nghị nhận việc, map sang Order
 * để danh sách chung một kiểu hiển thị). Việc đã nhận đổi trạng thái qua JobOfferService.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);
  private readonly posts = inject(PostService);
  private readonly offers = inject(JobOfferService);

  getOrders(): Observable<Order[]> {
    return forkJoin([this.placed(), this.offers.list()]).pipe(
      map(([placed, offers]) =>
        [...placed, ...offers.map(offerToOrder)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    );
  }

  getOrder(id: string): Observable<Order> {
    return this.getOrders().pipe(
      map((list) => {
        const o = list.find((x) => x._id === id);
        if (!o) throw new AppError('Không tìm thấy đơn.', 404, 'NOT_FOUND');
        return o;
      }),
    );
  }

  /** Tạo đơn. Server tính lại tổng tiền; số ở mock chỉ để thấy luồng chạy. */
  create(body: CreateOrderBody): Observable<Order> {
    if (!useMock('order')) return this.api.post<unknown>('/orders', body).pipe(map(orderFromApi));
    return this.posts.getPostById(body.postId).pipe(
      switchMap((post) =>
        this.placed().pipe(
          map((rows) => {
            if (!post || post.kind === 'job') throw new AppError('Không tìm thấy bài.', 404, 'NOT_FOUND');
            if (body.fulfillment === 'delivery' && !body.addressId && !body.detail) {
              throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [
                { field: 'addressId', message: 'Chọn địa chỉ nhận hàng.' },
              ]);
            }
            const order: Order = {
              _id: this.db.newId(),
              code: `AG-O${Math.floor(1000 + Math.random() * 9000)}`,
              type: 'placed',
              postId: post._id,
              postTitle: post.title,
              counterpartName: post.sellerName,
              counterpartAvatar: post.sellerAvatar,
              counterpartId: post.sellerId,
              image: post.images[0],
              category: post.kind,
              kind: post.kind,
              status: 'pending',
              total: body.total ?? post.price * body.quantity + (body.fulfillment === 'delivery' ? MOCK_DELIVERY_FEE : 0),
              detail: body.detail,
              paymentMethod: body.payment,
              note: body.note,
              createdAt: new Date().toISOString(),
              history: [{ state: 'pending', at: new Date().toISOString() }],
            };
            this.db.save(COLLECTION, [order, ...rows]);
            return order;
          }),
        ),
      ),
    );
  }

  /** Chỉ là YÊU CẦU hủy — người bán xử lý (docs/decisions.md 1.6). */
  requestCancel(id: string, reason: string): Observable<Order> {
    if (!useMock('order')) return this.api.post<unknown>(`/orders/${id}/cancel-request`, { reason }).pipe(map(orderFromApi));
    return this.placed().pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id);
        if (!cur) throw new AppError('Không tìm thấy đơn.', 404, 'NOT_FOUND');
        if (['done', 'cancelled'].includes(cur.status)) {
          throw new AppError('Đơn đã kết thúc, không thể hủy.', 409, 'INVALID_STATE');
        }
        if (!reason.trim()) {
          throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [{ field: 'reason', message: 'Hãy nhập lý do.' }]);
        }
        const next: Order = { ...cur, cancelRequested: true };
        this.db.save(COLLECTION, rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  /** Người mua đồng ý / từ chối phụ thu. Đồng ý thì tổng tiền cộng thêm; từ chối thì đơn giữ nguyên và nên nhắn người bán. */
  respondSurcharge(id: string, approve: boolean): Observable<Order> {
    if (!useMock('order')) return this.api.post<unknown>(`/orders/${id}/approve-surcharge`, { approve }).pipe(map(orderFromApi));
    return this.placed().pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id);
        if (!cur) throw new AppError('Không tìm thấy đơn.', 404, 'NOT_FOUND');
        if (cur.surcharge?.state !== 'pending') throw new AppError('Không có phụ thu nào đang chờ.', 409, 'INVALID_STATE');
        const next: Order = {
          ...cur,
          total: approve ? cur.total + cur.surcharge.amount : cur.total,
          surcharge: { ...cur.surcharge, state: approve ? 'approved' : 'declined' },
        };
        this.db.save(COLLECTION, rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }

  /**
   * Áp một thay đổi vào đơn đã đặt và ghi một dòng vào `history` (dòng hiện dưới thanh bước).
   * Dùng cho các bước người mua bấm (hủy, duyệt giá, đổi lịch, báo vấn đề, đánh giá…) và cho nút
   * "giả lập phía người bán" ở bản mẫu. Máy chủ chưa có endpoint cho các bước này (docs/handoff.md).
   */
  update(id: string, patch: Partial<Order>, line?: string): Observable<Order> {
    if (!useMock('order')) throw new AppError('Bước này cần máy chủ hỗ trợ — chưa có API.', 501, 'NOT_IMPLEMENTED');
    return this.placed().pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id);
        if (!cur) throw new AppError('Không tìm thấy đơn.', 404, 'NOT_FOUND');
        const history = line ? [...(cur.history ?? []), { state: line, at: new Date().toISOString() }] : cur.history;
        const next: Order = { ...cur, ...patch, history };
        this.db.save(COLLECTION, [...(rows.map((r) => (r._id === id ? next : r)))]);
        return next;
      }),
    );
  }

  private placed(): Observable<Order[]> {
    if (!useMock('order')) return this.api.get<unknown[]>('/orders', { role: 'placed', limit: 100 }).pipe(map((l) => l.map(orderFromApi)));
    return this.db.list<Order>(COLLECTION).pipe(
      map((rows) => rows.filter((r) => r.type === 'placed').map((o) => (o.doneAgoH != null && !o.doneAt ? { ...o, doneAt: Date.now() - o.doneAgoH * 3600e3 } : o))),
    );
  }
}
