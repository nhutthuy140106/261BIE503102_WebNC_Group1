import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE, USE_MOCK } from '../config/api.config';
import { User } from '../models/user';

export interface LoginBody {
  username: string;
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
    if (USE_MOCK) {
      const user: User = {
        _id: '000000000000000000000001',
        username: body.username,
        fullName: body.username,
        block: 'Block B',
        xu: 120,
        role: 'user',
      };
      sessionStorage.setItem(MOCK_KEY, JSON.stringify(user));
      this.currentUser.set(user);
      this.rememberUsername(body);
      return of(user);
    }
    return this.http.post<User>(`${API_BASE}/auth/login`, body, { withCredentials: true }).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.rememberUsername(body);
      }),
    );
  }

  register(body: { username: string; fullName: string; password: string }): Observable<void> {
    if (USE_MOCK) return of(void 0);
    return this.http.post<void>(`${API_BASE}/auth/register`, body, { withCredentials: true });
  }

  logout(): Observable<void> {
    this.currentUser.set(null);
    if (USE_MOCK) {
      sessionStorage.removeItem(MOCK_KEY);
      return of(void 0);
    }
    return this.http.post<void>(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
  }

  /** Hỏi server phiên còn hiệu lực không (GET /api/auth/profile: 200 hay 401). */
  checkSession(): Observable<boolean> {
    if (USE_MOCK) {
      const raw = sessionStorage.getItem(MOCK_KEY);
      if (raw) this.currentUser.set(JSON.parse(raw) as User);
      return of(raw !== null);
    }
    return this.http.get<User>(`${API_BASE}/auth/profile`, { withCredentials: true }).pipe(
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
      `${REMEMBER_COOKIE}=${encodeURIComponent(body.rememberMe ? body.username : '')}` +
      `; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  }
}
