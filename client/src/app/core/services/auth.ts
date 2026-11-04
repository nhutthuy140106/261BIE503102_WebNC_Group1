import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { API_BASE, useMock } from '../config/api.config';
import { User } from '../models/user';
import { userFromApi } from '../utils/api-mappers';
import { AppError } from '../models/api';
import { toAppError } from './api';

export interface LoginBody {
  phone: string;
  password: string;
  rememberMe: boolean;
}

const MOCK_KEY = 'antgo_mock_user';
const REMEMBER_COOKIE = 'antgo_remember_username';

/**
 * Xác thực. Quyền thật nằm ở server (session cookie httpOnly) — guard chỉ hỏi
 * `checkSession()`. Chế độ mock chỉ để dựng giao diện khi chưa có backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  login(body: LoginBody): Observable<User> {
    if (useMock('auth')) {
      const user: User = {
        _id: '000000000000000000000001',
        username: body.phone,
        fullName: this.mockName(body.phone),
        block: 'Block B',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces&q=70',
        xu: 120,
        role: 'user',
      };
      sessionStorage.setItem(MOCK_KEY, JSON.stringify(user));
      this.currentUser.set(user);
      this.rememberUsername(body);
      return of(user);
    }
    return this.http.post<{ data: unknown }>(`${API_BASE}/auth/login`, { phone: body.phone, password: body.password }, { withCredentials: true }).pipe(
      map((r) => userFromApi(r.data)),
      tap((user) => {
        this.currentUser.set(user);
        this.rememberUsername(body);
      }),
      // Lỗi thô của HttpClient ("Http failure response…") đổi thành thông báo dễ hiểu
      catchError((e: unknown) =>
        toAppError(e).pipe(
          catchError((err: AppError) =>
            throwError(() => (err.status === 401 ? new AppError('Số điện thoại hoặc mật khẩu không đúng.', 401, 'UNAUTHORIZED') : err)),
          ),
        ),
      ),
    );
  }

  /** Tên Google đang chờ nhập số điện thoại (lần đầu đăng nhập Google); null = không có bước chờ. */
  readonly googlePending = signal<string | null>(null);

  /**
   * Đăng nhập Google bước 1: gửi ID token cho server xác thực. Tài khoản đã có → vào luôn;
   * lần đầu → `needPhone` (đã ghi `googlePending`) để chuyển sang trang nhập số điện thoại.
   * Mock (chưa có server): chỉ đọc tên/ảnh trong token để dựng người dùng mẫu, không xác thực.
   */
  loginWithGoogle(credential: string): Observable<{ user: User } | { needPhone: true }> {
    if (useMock('auth')) {
      const p = this.decodeJwt(credential);
      const user: User = {
        _id: '000000000000000000000001',
        username: '',
        fullName: p['name'] || 'Hàng xóm',
        block: 'Block B',
        avatar: p['picture'] || undefined,
        xu: 120,
        role: 'user',
      };
      sessionStorage.setItem(MOCK_KEY, JSON.stringify(user));
      this.currentUser.set(user);
      return of({ user });
    }
    return this.http.post<{ data?: unknown; needPhone?: boolean; name?: string }>(`${API_BASE}/auth/google`, { credential }, { withCredentials: true }).pipe(
      map((r) => {
        if (r.needPhone) {
          this.googlePending.set(r.name ?? '');
          return { needPhone: true as const };
        }
        const user = userFromApi(r.data);
        this.currentUser.set(user);
        return { user };
      }),
      catchError(toAppError),
    );
  }

  /** Đăng nhập Google bước 2: nhập số điện thoại để tạo tài khoản. */
  completeGoogle(phone: string): Observable<User> {
    return this.http.post<{ data: unknown }>(`${API_BASE}/auth/google/complete`, { phone }, { withCredentials: true }).pipe(
      map((r) => userFromApi(r.data)),
      tap((user) => {
        this.googlePending.set(null);
        this.currentUser.set(user);
      }),
      catchError(toAppError),
    );
  }

  private decodeJwt(token: string): Record<string, string> {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, string>;
    } catch {
      return {};
    }
  }

  /** areaId + building + unit (khu, tòa, phòng) dùng làm địa chỉ mặc định — server chưa nhận thì bỏ qua. */
  register(body: { phone: string; name: string; password: string; areaId?: string; building?: string; unit?: string; termsVersion?: string; marketing?: boolean }): Observable<void> {
    if (useMock('auth')) {
      this.saveMockName(body.phone, body.name);
      return of(void 0);
    }
    return this.http.post<void>(`${API_BASE}/auth/register`, body, { withCredentials: true }).pipe(catchError(toAppError));
  }

  /** Mock: họ và tên nhập lúc đăng ký được nhớ theo số điện thoại để lần đăng nhập sau hiện đúng tên (chưa đăng ký thì dùng tên mẫu) */
  private mockName(phone: string): string {
    try {
      return (JSON.parse(localStorage.getItem('antgo_names') ?? '{}') as Record<string, string>)[phone] || 'Ngọc Thủy';
    } catch {
      return 'Ngọc Thủy';
    }
  }

  private saveMockName(phone: string, name: string): void {
    try {
      const m = JSON.parse(localStorage.getItem('antgo_names') ?? '{}') as Record<string, string>;
      m[phone] = name;
      localStorage.setItem('antgo_names', JSON.stringify(m));
    } catch {
      /* bỏ qua */
    }
  }

  logout(): Observable<void> {
    this.currentUser.set(null);
    if (useMock('auth')) {
      sessionStorage.removeItem(MOCK_KEY);
      return of(void 0);
    }
    return this.http.post<void>(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
  }

  /** Cập nhật hồ sơ (tên, ảnh). Mock lưu trong phiên; API thật chờ máy chủ có điểm cuối. */
  updateProfile(body: Partial<Pick<User, 'fullName' | 'avatar' | 'email' | 'gender' | 'birthday' | 'bio'>>): Observable<User> {
    const cur = this.currentUser();
    if (!cur) return throwError(() => new AppError('Bạn cần đăng nhập.', 401, 'UNAUTHORIZED'));
    if (!useMock('auth')) return throwError(() => new AppError('Chức năng này chờ máy chủ.', 501, 'NOT_IMPLEMENTED'));
    const user: User = { ...cur, ...body };
    if (body.fullName) this.saveMockName(cur.username, body.fullName);
    sessionStorage.setItem(MOCK_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    return of(user);
  }

  /** Đổi mật khẩu. Mock luôn thành công; API thật chờ máy chủ có điểm cuối. */
  changePassword(current: string, next: string): Observable<void> {
    if (!useMock('auth')) return throwError(() => new AppError('Chức năng này chờ máy chủ.', 501, 'NOT_IMPLEMENTED'));
    if (!current || next.length < 8) return throwError(() => new AppError('Mật khẩu chưa hợp lệ.', 422, 'VALIDATION_ERROR'));
    return of(void 0);
  }

  /** Quên mật khẩu: đặt mật khẩu mới sau khi xác nhận mã. Mock luôn thành công; API thật chờ máy chủ có điểm cuối. */
  resetPassword(phone: string, password: string): Observable<void> {
    if (!useMock('auth')) return throwError(() => new AppError('Chức năng này chờ máy chủ.', 501, 'NOT_IMPLEMENTED'));
    if (!phone || password.length < 8) return throwError(() => new AppError('Mật khẩu chưa hợp lệ.', 422, 'VALIDATION_ERROR'));
    return of(void 0);
  }

  /** Hỏi server phiên còn hiệu lực không (GET /api/auth/profile: 200 hay 401). */
  checkSession(): Observable<boolean> {
    if (useMock('auth')) {
      const raw = sessionStorage.getItem(MOCK_KEY);
      if (raw) this.currentUser.set(JSON.parse(raw) as User);
      return of(raw !== null);
    }
    return this.http.get<{ data: unknown }>(`${API_BASE}/auth/profile`, { withCredentials: true }).pipe(
      map((r) => userFromApi(r.data)),
      tap((user) => this.currentUser.set(user)),
      map(() => true),
      catchError(() => {
        this.currentUser.set(null);
        return of(false);
      }),
    );
  }

  /** "Nhớ tên đăng nhập" — chỉ tên, KHÔNG dùng để xác thực. */
  getRememberedUsername(): string {
    const m = document.cookie.match(new RegExp(`(?:^|; )${REMEMBER_COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : '';
  }

  private rememberUsername(body: LoginBody): void {
    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 : 0;
    document.cookie =
      `${REMEMBER_COOKIE}=${encodeURIComponent(body.rememberMe ? body.phone : '')}` +
      `; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  }
}
