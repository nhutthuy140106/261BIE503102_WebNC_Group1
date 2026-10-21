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
        fullName: body.phone,
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

  /** areaId + building + unit (khu, tòa, phòng) dùng làm địa chỉ mặc định — server chưa nhận thì bỏ qua. */
  register(body: { phone: string; name: string; password: string; areaId?: string; building?: string; unit?: string; termsVersion?: string; marketing?: boolean }): Observable<void> {
    if (useMock('auth')) return of(void 0);
    return this.http.post<void>(`${API_BASE}/auth/register`, body, { withCredentials: true }).pipe(catchError(toAppError));
  }

  logout(): Observable<void> {
    this.currentUser.set(null);
    if (useMock('auth')) {
      sessionStorage.removeItem(MOCK_KEY);
      return of(void 0);
    }
    return this.http.post<void>(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
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
