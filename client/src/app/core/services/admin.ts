import { Injectable, inject } from '@angular/core';
import { Observable, map, of, throwError } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { ApiService } from './api';

export interface AdminUser {
  _id: string;
  name: string;
  phone: string;
  block: string;
  role: 'user' | 'admin';
  status: 'active' | 'locked';
  avatar: string | null;
  createdAt: string;
  lockedReason?: string;
}

export interface AdminPost {
  _id: string;
  title: string;
  type: 'food' | 'goods' | 'service';
  sellerName: string;
  price: number;
  status: 'open' | 'soldout' | 'closed' | 'hidden';
  image: string | null;
  hiddenReason?: string;
  createdAt: string;
}

export type ReportState = 'open' | 'reviewing' | 'resolved' | 'rejected';

export interface AdminReport {
  _id: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  reason: string;
  detail: string;
  state: ReportState;
  adminNote: string;
  createdAt: string;
}

export interface AdminStats {
  users: { total: number; active: number; locked: number; admins: number };
  posts: { total: number; open: number; hidden: number };
  orders: { total: number; byState: Record<string, number> };
  reports: { total: number; pending: number; byState: Record<ReportState, number> };
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
}

export const PAGE_SIZE = 8;

const T = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const pick = (s: string, q: string) => s.toLowerCase().includes(q.trim().toLowerCase());

/** Dữ liệu mẫu cho chế độ mock (chỉ để dựng giao diện; mất khi tải lại trang). */
const MOCK_USERS: AdminUser[] = [
  { _id: 'u1', name: 'Quản trị AntGo', phone: '0900000099', block: 'A', role: 'admin', status: 'active', avatar: null, createdAt: T(120) },
  { _id: 'u2', name: 'Ngọc Thủy', phone: '0900000001', block: 'B', role: 'user', status: 'active', avatar: null, createdAt: T(60) },
  { _id: 'u3', name: 'Cô Lan', phone: '0900000002', block: 'A', role: 'user', status: 'active', avatar: null, createdAt: T(55) },
  { _id: 'u4', name: 'Quốc Anh', phone: '0900000003', block: 'C', role: 'user', status: 'active', avatar: null, createdAt: T(40) },
  { _id: 'u5', name: 'Chị Hoa', phone: '0900000004', block: 'D', role: 'user', status: 'locked', avatar: null, createdAt: T(33), lockedReason: 'Nhiều báo cáo lừa đảo' },
  { _id: 'u6', name: 'Minh Khoa', phone: '0900000005', block: 'B', role: 'user', status: 'active', avatar: null, createdAt: T(21) },
  { _id: 'u7', name: 'Thu Hà', phone: '0900000006', block: 'C', role: 'user', status: 'active', avatar: null, createdAt: T(14) },
  { _id: 'u8', name: 'Anh Tuấn', phone: '0900000007', block: 'A', role: 'user', status: 'active', avatar: null, createdAt: T(9) },
  { _id: 'u9', name: 'Phương', phone: '0900000008', block: 'D', role: 'user', status: 'active', avatar: null, createdAt: T(5) },
  { _id: 'u10', name: 'Chị Ngân', phone: '0900000009', block: 'B', role: 'user', status: 'active', avatar: null, createdAt: T(2) },
];

const MOCK_POSTS: AdminPost[] = [
  { _id: 'p1', title: 'Cơm nhà làm, thực đơn đổi mỗi ngày', type: 'food', sellerName: 'Cô Lan', price: 35000, status: 'open', image: null, createdAt: T(20) },
  { _id: 'p2', title: 'Giặt sấy gấp, lấy và trả tận cửa', type: 'service', sellerName: 'Giặt sấy Mỹ Linh', price: 18000, status: 'open', image: null, createdAt: T(18) },
  { _id: 'p3', title: 'Tai nghe chụp tai gần như mới', type: 'goods', sellerName: 'Minh Khoa', price: 450000, status: 'soldout', image: null, createdAt: T(12) },
  { _id: 'p4', title: 'Trà sữa trân châu đường đen', type: 'food', sellerName: 'Quán Nhà Mây', price: 32000, status: 'open', image: null, createdAt: T(11) },
  { _id: 'p5', title: 'Sofa da 2 chỗ cần pass gấp', type: 'goods', sellerName: 'Chị Hoa', price: 1500000, status: 'hidden', image: null, createdAt: T(8), hiddenReason: 'Hình ảnh không đúng sản phẩm' },
  { _id: 'p6', title: 'Dọn nhà theo giờ', type: 'service', sellerName: 'Thu Hà', price: 120000, status: 'open', image: null, createdAt: T(6) },
  { _id: 'p7', title: 'Bánh kem dâu nhà làm', type: 'food', sellerName: 'Bếp Cô Lan', price: 280000, status: 'open', image: null, createdAt: T(4) },
  { _id: 'p8', title: 'Xe đạp thể thao cũ', type: 'goods', sellerName: 'Anh Tuấn', price: 900000, status: 'closed', image: null, createdAt: T(3) },
];

const MOCK_REPORTS: AdminReport[] = [
  { _id: 'r1', reporterName: 'Ngọc Thủy', targetType: 'post', targetId: 'p5', reason: 'Hình ảnh không đúng sản phẩm', detail: 'Ảnh sofa lấy từ trang khác, nhận hàng không giống.', state: 'open', adminNote: '', createdAt: T(3) },
  { _id: 'r2', reporterName: 'Quốc Anh', targetType: 'order', targetId: 'AG-O3012', reason: 'Không nhận được hàng', detail: 'Đã chờ quá 2 tiếng, người bán không trả lời tin nhắn.', state: 'open', adminNote: '', createdAt: T(2) },
  { _id: 'r3', reporterName: 'Thu Hà', targetType: 'user', targetId: 'u5', reason: 'Hành vi không phù hợp', detail: 'Nhắn tin lời lẽ khó chịu khi từ chối giảm giá.', state: 'reviewing', adminNote: 'Đang đối chiếu tin nhắn.', createdAt: T(5) },
  { _id: 'r4', reporterName: 'Minh Khoa', targetType: 'post', targetId: 'p1', reason: 'Chất lượng không đúng mô tả', detail: 'Món giao khác hình đăng.', state: 'resolved', adminNote: 'Đã nhắc người bán cập nhật ảnh.', createdAt: T(9) },
  { _id: 'r5', reporterName: 'Phương', targetType: 'order', targetId: 'AG-O2987', reason: 'Vấn đề thanh toán', detail: 'Người bán đòi chuyển khoản trước dù đã chọn tiền mặt.', state: 'rejected', adminNote: 'Hai bên đã thỏa thuận xong.', createdAt: T(12) },
];

const MOCK_ORDERS: Record<string, number> = { pending: 4, confirmed: 3, preparing: 5, delivering: 2, done: 18, cancelled: 3 };

/**
 * Dữ liệu cho khu Quản trị (docs/api-buyer-job.md mục Admin). Mock: bản sao trong bộ nhớ; thật: /admin/*.
 * Quyền thật do server kiểm tra (401/403), FE chỉ ẩn lối vào.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);
  private users = MOCK_USERS.map((u) => ({ ...u }));
  private posts = MOCK_POSTS.map((p) => ({ ...p }));
  private reports = MOCK_REPORTS.map((r) => ({ ...r }));

  private get mock(): boolean {
    return useMock('admin');
  }

  // ---------------- Tổng quan ----------------
  stats(): Observable<AdminStats> {
    if (this.mock) {
      const rb = (s: ReportState) => this.reports.filter((r) => r.state === s).length;
      const byState = { open: rb('open'), reviewing: rb('reviewing'), resolved: rb('resolved'), rejected: rb('rejected') };
      return of({
        users: { total: this.users.length, active: this.users.filter((u) => u.status === 'active').length, locked: this.users.filter((u) => u.status === 'locked').length, admins: this.users.filter((u) => u.role === 'admin').length },
        posts: { total: this.posts.length, open: this.posts.filter((p) => p.status === 'open').length, hidden: this.posts.filter((p) => p.status === 'hidden').length },
        orders: { total: Object.values(MOCK_ORDERS).reduce((a, b) => a + b, 0), byState: MOCK_ORDERS },
        reports: { total: this.reports.length, pending: byState.open + byState.reviewing, byState },
      });
    }
    return this.api.get<{ users: AdminStats['users']; posts: AdminStats['posts']; orders: AdminStats['orders']; reports: AdminStats['reports'] }>('/admin/stats');
  }

  // ---------------- Người dùng ----------------
  listUsers(f: { q: string; role: string; status: string; page: number }): Observable<Paged<AdminUser>> {
    if (this.mock) {
      const rows = this.users.filter((u) => (!f.q || pick(u.name + ' ' + u.phone, f.q)) && (!f.role || u.role === f.role) && (!f.status || u.status === f.status));
      return of({ items: rows.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE), total: rows.length, limit: PAGE_SIZE });
    }
    return this.api.getList<Record<string, unknown>>('/admin/users', { q: f.q || null, role: f.role === 'user' ? 'enduser' : f.role || null, status: f.status || null, page: f.page, limit: PAGE_SIZE }).pipe(
      map((r) => ({
        items: r.data.map((u) => ({
          _id: String(u['_id']),
          name: String(u['name'] ?? ''),
          phone: String(u['phone'] ?? ''),
          block: String(u['area'] ?? ''),
          role: u['role'] === 'admin' ? ('admin' as const) : ('user' as const),
          status: u['status'] === 'locked' ? ('locked' as const) : ('active' as const),
          avatar: (u['avatar'] as string | null) ?? null,
          createdAt: String(u['createdAt'] ?? ''),
          lockedReason: (u['lockedReason'] as string) || undefined,
        })),
        total: r.meta.total,
        limit: r.meta.limit,
      })),
    );
  }

  lockUser(id: string, reason: string): Observable<void> {
    if (this.mock) {
      const u = this.users.find((x) => x._id === id);
      if (!u) return throwError(() => new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND'));
      if (u.role === 'admin') return throwError(() => new AppError('Không thể khóa tài khoản quản trị', 409, 'INVALID_STATE'));
      u.status = 'locked';
      u.lockedReason = reason;
      return of(undefined);
    }
    return this.api.post<unknown>(`/admin/users/${id}/lock`, { reason }).pipe(map(() => undefined));
  }

  unlockUser(id: string): Observable<void> {
    if (this.mock) {
      const u = this.users.find((x) => x._id === id);
      if (u) {
        u.status = 'active';
        u.lockedReason = undefined;
      }
      return of(undefined);
    }
    return this.api.post<unknown>(`/admin/users/${id}/unlock`, {}).pipe(map(() => undefined));
  }

  // ---------------- Bài đăng ----------------
  listPosts(f: { q: string; type: string; status: string; page: number }): Observable<Paged<AdminPost>> {
    if (this.mock) {
      const rows = this.posts.filter((p) => (!f.q || pick(p.title + ' ' + p.sellerName, f.q)) && (!f.type || p.type === f.type) && (!f.status || p.status === f.status));
      return of({ items: rows.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE), total: rows.length, limit: PAGE_SIZE });
    }
    return this.api.getList<Record<string, unknown>>('/admin/posts', { q: f.q || null, type: f.type || null, status: f.status || null, page: f.page, limit: PAGE_SIZE }).pipe(
      map((r) => ({
        items: r.data.map((p) => ({
          _id: String(p['_id']),
          title: String(p['title'] ?? ''),
          type: p['type'] as AdminPost['type'],
          sellerName: String((p['seller'] as { name?: string } | null)?.name ?? ''),
          price: Number(p['price'] ?? 0),
          status: p['status'] as AdminPost['status'],
          image: ((p['images'] as string[] | undefined) ?? [])[0] ?? null,
          hiddenReason: (p['hiddenReason'] as string) || undefined,
          createdAt: String(p['createdAt'] ?? ''),
        })),
        total: r.meta.total,
        limit: r.meta.limit,
      })),
    );
  }

  hidePost(id: string, reason: string): Observable<void> {
    if (this.mock) {
      const p = this.posts.find((x) => x._id === id);
      if (p) {
        p.status = 'hidden';
        p.hiddenReason = reason;
      }
      return of(undefined);
    }
    return this.api.post<unknown>(`/admin/posts/${id}/hide`, { reason }).pipe(map(() => undefined));
  }

  unhidePost(id: string): Observable<void> {
    if (this.mock) {
      const p = this.posts.find((x) => x._id === id);
      if (p) {
        p.status = 'open';
        p.hiddenReason = undefined;
      }
      return of(undefined);
    }
    return this.api.post<unknown>(`/admin/posts/${id}/unhide`, {}).pipe(map(() => undefined));
  }

  // ---------------- Báo cáo ----------------
  listReports(state?: ReportState): Observable<AdminReport[]> {
    if (this.mock) return of(this.reports.filter((r) => !state || r.state === state).map((r) => ({ ...r })));
    return this.api.getList<Record<string, unknown>>('/admin/reports', { state: state ?? null, limit: 100 }).pipe(
      map((r) =>
        r.data.map((x) => ({
          _id: String(x['_id']),
          reporterName: String((x['reporter'] as { name?: string } | null)?.name ?? 'Ẩn danh'),
          targetType: String(x['targetType'] ?? ''),
          targetId: String(x['targetId'] ?? ''),
          reason: String(x['reason'] ?? ''),
          detail: String(x['detail'] ?? ''),
          state: x['state'] as ReportState,
          adminNote: String(x['adminNote'] ?? ''),
          createdAt: String(x['createdAt'] ?? ''),
        })),
      ),
    );
  }

  transition(id: string, to: ReportState, note: string): Observable<void> {
    if (this.mock) {
      const r = this.reports.find((x) => x._id === id);
      if (r) {
        r.state = to;
        if (note) r.adminNote = note;
      }
      return of(undefined);
    }
    return this.api.post<unknown>(`/admin/reports/${id}/transition`, { to, note }).pipe(map(() => undefined));
  }
}
