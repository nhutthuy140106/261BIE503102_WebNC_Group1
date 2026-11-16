import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';
import { USE_MOCK, API_BASE } from '../config/api.config';
import { ApiList, AppError } from '../models/api';
import { ApiService } from './api';

/** API khu Quản trị phần mở rộng (docs: /api-docs → Admin). Chỉ chạy với máy chủ thật; dữ liệu mẫu không có khu này. */

export interface Person { _id: string; name: string; phone?: string; avatar?: string | null; area?: string; status?: string }

export interface Todo { verifications: number; reports: number; issues: number; cancelRequests: number; tickets: number }

export interface Dashboard {
  days: string[];
  series: { newUsers: number[]; newOrders: number[]; doneOrders: number[]; revenue: number[] };
  todo: Todo;
  totals: { users: number; lockedUsers: number; posts: number; openPosts: number; hiddenPosts: number; orders: number; doneOrders: number; gmv: number; completionRate: number; cancelRate: number };
  ordersByState: Record<string, number>;
  topSellers: { id: string; name: string; revenue: number; orders: number }[];
}

export interface OrderRow {
  _id: string; code: string; state: string; total: number; payment: string; createdAt: string; updatedAt: string;
  title?: string; type?: string; buyer: Person; seller: Person; issue?: { st: string; type?: string; at?: string }; cancelPending: boolean;
}

export interface OrderIssue { st: string; type?: string; text?: string; photos?: number; images?: string[]; reply?: string; amount?: number; result?: string; at?: string }

export interface OrderDetail extends OrderRow {
  full: {
    history: { state: string; at: string }[]; quantity: number; fulfillment: string; note?: string; address?: { name?: string; phone?: string; block?: string; unit?: string };
    breakdown?: { items: number; deliveryFee: number; discount: number; surcharge: number }; issue?: OrderIssue; cancelInfo?: { by: string; reason: string };
    selections?: { group: string; choices: { label: string }[] }[]; voucherCode?: string; scheduledAt?: string;
  };
  messages?: { at: string; sender: string; senderId: string; text: string; media?: string }[];
}

export interface AuditRow { _id: string; at: string; action: string; targetType: string; targetId: string; note: string; actor: { _id: string; name: string; role: string } | null }

export interface ReportContext {
  found: boolean; targetType: string; targetId: string; reportsAboutTarget: number; title?: string; status?: string; price?: number; image?: string;
  owner?: Person; buyer?: Person; seller?: Person; orderId?: string;
}
export interface ReportDetail { _id: string; context: ReportContext }

export interface UserProfile {
  user: { _id: string; name: string; phone: string; area: string; role: 'enduser' | 'moderator' | 'admin'; status: 'active' | 'locked'; avatar: string | null; createdAt: string; lockedReason?: string; email?: string; phoneVerifiedAt?: string };
  counts: { ordersPlaced: number; ordersReceived: number; posts: number; jobs: number; reportsAgainst: number };
  verification: { status: string; submittedAt?: string; rejectReason?: string; body?: { shopName?: string; shopType?: string } };
  xu: { balance: number; ledger: { id: string; delta: number; title: string; kind: string; at: string }[] };
  recentOrders: { _id: string; code: string; state: string; total: number; title?: string; role: 'buyer' | 'seller'; createdAt: string }[];
}

export interface Verification {
  _id: string; status: 'pending' | 'approved' | 'rejected'; submittedAt: string; reviewedAt?: string; rejectReason?: string;
  user: Person;
  body: { fullName: string; idNumber: string; idFront: string; idBack: string; selfie: string; shopName: string; shopType: string; intro?: string };
}

export interface TicketMsg { by: 'user' | 'staff'; text: string; at: string }
export interface Ticket { _id: string; code: string; topic: string; state: 'open' | 'answered' | 'closed'; user: Person; messages: TicketMsg[]; createdAt: string; updatedAt: string }

export interface VoucherDef { _id: string; cid: string; title: string; cond: string; amount: number; ship: boolean; min: number; cost: number; active: boolean; redeemed: number }
export interface Announcement { _id: string; title: string; body: string; area: string; recipients: number; at: string; sentBy?: { name: string } }
export interface Settings { bannedKeywords: string[]; areas: string[]; categories: string[] }

const q = (o: Record<string, string | number | undefined | null>) => o;

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  /** Số việc cần xử lý cho dấu chấm trên thanh bên; các trang gọi `refreshTodo()` sau khi xử lý xong */
  readonly todo = signal<Todo | null>(null);

  /** Khu Quản trị chỉ có ở máy chủ thật */
  readonly needsServer = USE_MOCK;
  private guard<T>(fn: () => Observable<T>): Observable<T> {
    return USE_MOCK ? throwError(() => new AppError('Khu Quản trị cần máy chủ thật (mở trang với ?mock=0).', 0, 'MOCK')) : fn();
  }

  dashboard(days: number): Observable<Dashboard> {
    return this.guard(() => this.api.get<Dashboard>('/admin/dashboard', q({ days })).pipe(tap((d) => this.todo.set(d.todo))));
  }
  refreshTodo(): void {
    if (!USE_MOCK) this.api.get<Dashboard>('/admin/dashboard', q({ days: 7 })).subscribe({ next: (d) => this.todo.set(d.todo), error: () => undefined });
  }

  // đơn & tranh chấp
  orders(f: { state?: string; issue?: string; q?: string; page: number }): Observable<ApiList<OrderRow>> {
    return this.guard(() => this.api.getList<OrderRow>('/admin/orders', q({ ...f, limit: 8 })));
  }
  order(id: string, chat = false): Observable<OrderDetail> {
    return this.guard(() => this.api.get<OrderDetail>(`/admin/orders/${id}`, q({ chat: chat ? '1' : '0' })));
  }
  resolveIssue(id: string, body: { decision: 'refund' | 'redo' | 'reject'; amount?: number; note: string }): Observable<unknown> {
    return this.guard(() => this.api.post(`/admin/orders/${id}/issue`, body).pipe(tap(() => this.refreshTodo())));
  }
  cancelOrder(id: string, reason: string): Observable<unknown> {
    return this.guard(() => this.api.post(`/admin/orders/${id}/cancel`, { reason }).pipe(tap(() => this.refreshTodo())));
  }

  audit(f: { action?: string; targetType?: string; page: number }): Observable<ApiList<AuditRow>> {
    return this.guard(() => this.api.getList<AuditRow>('/admin/audit', q({ ...f, limit: 10 })));
  }

  reportDetail(id: string): Observable<ReportDetail> {
    return this.guard(() => this.api.get<ReportDetail>(`/admin/reports/${id}`));
  }

  // người dùng
  profile(id: string): Observable<UserProfile> {
    return this.guard(() => this.api.get<UserProfile>(`/admin/users/${id}/profile`));
  }
  setRole(id: string, role: string): Observable<unknown> {
    return this.guard(() => this.api.patch(`/admin/users/${id}/role`, { role }));
  }
  lock(id: string, reason: string): Observable<unknown> {
    return this.guard(() => this.api.post(`/admin/users/${id}/lock`, { reason }));
  }
  unlock(id: string): Observable<unknown> {
    return this.guard(() => this.api.post(`/admin/users/${id}/unlock`, {}));
  }
  adjustXu(id: string, delta: number, reason: string): Observable<{ balance: number }> {
    return this.guard(() => this.api.post<{ balance: number }>(`/admin/users/${id}/xu`, { delta, reason }));
  }

  // xác minh người bán
  verifications(status: string, page: number): Observable<ApiList<Verification>> {
    return this.guard(() => this.api.getList<Verification>('/admin/seller-verifications', q({ status, page, limit: 10 })));
  }
  approve(id: string): Observable<unknown> {
    return this.guard(() => this.api.post(`/admin/seller-verifications/${id}/approve`, {}).pipe(tap(() => this.refreshTodo())));
  }
  reject(id: string, reason: string): Observable<unknown> {
    return this.guard(() => this.api.post(`/admin/seller-verifications/${id}/reject`, { reason }).pipe(tap(() => this.refreshTodo())));
  }

  // hỗ trợ
  tickets(state: string, page: number): Observable<ApiList<Ticket>> {
    return this.guard(() => this.api.getList<Ticket>('/admin/support', q({ state, page, limit: 15 })));
  }
  ticket(id: string): Observable<Ticket> {
    return this.guard(() => this.api.get<Ticket>(`/admin/support/${id}`));
  }
  replyTicket(id: string, text: string): Observable<Ticket> {
    return this.guard(() => this.api.post<Ticket>(`/admin/support/${id}/reply`, { text }).pipe(tap(() => this.refreshTodo())));
  }
  closeTicket(id: string): Observable<Ticket> {
    return this.guard(() => this.api.post<Ticket>(`/admin/support/${id}/close`, {}).pipe(tap(() => this.refreshTodo())));
  }

  // voucher
  vouchers(): Observable<VoucherDef[]> {
    return this.guard(() => this.api.get<VoucherDef[]>('/admin/vouchers'));
  }
  createVoucher(v: Partial<VoucherDef>): Observable<VoucherDef> {
    return this.guard(() => this.api.post<VoucherDef>('/admin/vouchers', v));
  }
  updateVoucher(id: string, v: Partial<VoucherDef>): Observable<VoucherDef> {
    return this.guard(() => this.api.patch<VoucherDef>(`/admin/vouchers/${id}`, v));
  }

  // thông báo hệ thống
  announcements(): Observable<Announcement[]> {
    return this.guard(() => this.api.get<Announcement[]>('/admin/announcements'));
  }
  announce(body: { title: string; body: string; area: string }): Observable<Announcement> {
    return this.guard(() => this.api.post<Announcement>('/admin/announcements', body));
  }

  // cài đặt
  settings(): Observable<Settings> {
    return this.guard(() => this.api.get<Settings>('/admin/settings'));
  }
  saveSettings(s: Partial<Settings>): Observable<Settings> {
    return this.guard(() => this.api.put<Settings>('/admin/settings', s));
  }

  /** Tải CSV: lấy về dạng blob rồi bấm một liên kết tạm để trình duyệt lưu file */
  exportCsv(what: 'users' | 'orders' | 'reports'): Observable<void> {
    return this.guard(() =>
      this.http.get(`${API_BASE}/admin/export/${what}`, { responseType: 'blob' }).pipe(
        map((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `antgo-${what}.csv`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }),
      ),
    );
  }
}

export const msgOf = (e: unknown, fallback = 'Chưa thực hiện được, bạn thử lại sau nhé.'): string => (e instanceof AppError ? e.message : fallback);
