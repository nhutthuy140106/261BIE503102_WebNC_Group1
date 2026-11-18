import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE, useMock } from '../config/api.config';
import { User } from '../models/user';
import { userFromApi } from '../utils/api-mappers';
import { AppError } from '../models/api';
import { toAppError } from './api';
import { UploadService } from './upload';

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
  private readonly uploads = inject(UploadService);

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

  /** Số điện thoại đã có tài khoản chưa — để form đăng ký báo ngay ở bước nhập số. Mock: số đã đăng ký trong trình duyệt này (antgo_names) */
  phoneExists(phone: string): Observable<boolean> {
    if (useMock('auth')) {
      try {
        return of(phone in (JSON.parse(localStorage.getItem('antgo_names') ?? '{}') as Record<string, string>));
      } catch {
        return of(false);
      }
    }
    return this.http
      .get<{ data: { exists: boolean } }>(`${API_BASE}/auth/phone-exists`, { params: { phone }, withCredentials: true })
      .pipe(map((r) => r.data.exists), catchError(toAppError));
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
    if (!useMock('auth')) {
      // thật: ảnh đang ở dạng data: phải tải lên server trước (server chỉ nhận địa chỉ ảnh của AntGo)
      const avatar$ = body.avatar && /^(data|blob):/.test(body.avatar) ? this.uploads.uploadDataUrl(body.avatar) : of(body.avatar);
      return avatar$.pipe(
        switchMap((avatar) => {
          const send: Record<string, unknown> = {
            ...(body.fullName !== undefined ? { name: body.fullName } : {}),
            ...(body.avatar !== undefined ? { avatar } : {}),
            ...('email' in body ? { email: body.email ?? '' } : {}),
            ...('gender' in body ? { gender: body.gender ?? '' } : {}),
            ...('birthday' in body ? { birthday: body.birthday ?? '' } : {}),
            ...('bio' in body ? { bio: body.bio ?? '' } : {}),
          };
          return this.http.patch<{ data: unknown }>(`${API_BASE}/auth/profile`, send, { withCredentials: true });
        }),
        map((r) => ({ ...userFromApi(r.data), xu: cur.xu })),
        tap((user) => this.currentUser.set(user)),
        catchError(toAppError),
      );
    }
    const user: User = { ...cur, ...body };
    if (body.fullName) this.saveMockName(cur.username, body.fullName);
    sessionStorage.setItem(MOCK_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    return of(user);
  }

  /** Đổi mật khẩu. Mock luôn thành công; API thật chờ máy chủ có điểm cuối. */
  changePassword(current: string, next: string): Observable<void> {
    if (!useMock('auth')) return this.http.post<void>(`${API_BASE}/auth/password/change`, { current, next }, { withCredentials: true }).pipe(catchError(toAppError));
    if (!current || next.length < 8) return throwError(() => new AppError('Mật khẩu chưa hợp lệ.', 422, 'VALIDATION_ERROR'));
    return of(void 0);
  }

  /** Gửi mã OTP tới số điện thoại (đăng ký hoặc quên mật khẩu). Mock: không gửi gì, nhập 6 số bất kỳ. Thật: server giả lập, ngoài production trả thêm `devCode` để thử. */
  sendOtp(phone: string, purpose: 'register' | 'reset'): Observable<{ devCode?: string; resendInSec?: number }> {
    if (useMock('auth')) return of({});
    return this.http
      .post<{ data: { devCode?: string; resendInSec?: number } }>(`${API_BASE}/auth/otp/send`, { phone, purpose }, { withCredentials: true })
      .pipe(map((r) => r.data), catchError(toAppError));
  }

  /** Nhập mã OTP. Mock luôn đúng. Thật: server kiểm mã (hạn 5 phút, sai tối đa 5 lần). */
  verifyOtp(phone: string, purpose: 'register' | 'reset', code: string): Observable<void> {
    if (useMock('auth')) return of(void 0);
    return this.http.post<unknown>(`${API_BASE}/auth/otp/verify`, { phone, purpose, code }, { withCredentials: true }).pipe(map(() => void 0), catchError(toAppError));
  }

  /** Quên mật khẩu: đặt mật khẩu mới sau khi đã nhập đúng mã (verifyOtp, purpose reset). Mock luôn thành công. */
  resetPassword(phone: string, password: string): Observable<void> {
    if (!phone || password.length < 8) return throwError(() => new AppError('Mật khẩu chưa hợp lệ.', 422, 'VALIDATION_ERROR'));
    if (useMock('auth')) return of(void 0);
    return this.http.post<unknown>(`${API_BASE}/auth/password/reset`, { phone, password }, { withCredentials: true }).pipe(map(() => void 0), catchError(toAppError));
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
