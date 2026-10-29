import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { useMock } from '../config/api.config';
import { SellerVerification, VerifyBody } from '../models/seller-verification';
import { ApiService } from './api';
import { AuthService } from './auth';

const KEY = 'antgo_mock_seller_verify_';

/**
 * Xác minh người bán. Mock lưu theo từng tài khoản ở localStorage (khu Bán chưa có endpoint thật).
 * Endpoint đề xuất cho phía server: GET /seller/verification · POST /seller/verification (nộp / nộp lại);
 * việc duyệt / từ chối là của quản trị AntGo, KHÔNG phải của chính người dùng.
 */
@Injectable({ providedIn: 'root' })
export class SellerVerificationService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly state = signal<SellerVerification>({ status: 'none' });
  readonly current = this.state.asReadonly();
  readonly isApproved = computed(() => this.state().status === 'approved');

  private get storageKey(): string {
    return KEY + (this.auth.currentUser()?._id ?? 'guest');
  }

  /** Lấy trạng thái mới nhất (guard và trang xác minh đều gọi). */
  load(): Observable<SellerVerification> {
    if (!useMock('seller')) return this.api.get<SellerVerification>('/seller/verification').pipe(tap((v) => this.state.set(v)));
    const v = this.read();
    this.state.set(v);
    return of(v);
  }

  submit(body: VerifyBody): Observable<SellerVerification> {
    if (!useMock('seller')) return this.api.post<SellerVerification>('/seller/verification', body).pipe(tap((v) => this.state.set(v)));
    return this.write({ status: 'pending', submittedAt: new Date().toISOString(), body });
  }

  // ---- Chỉ dùng cho thanh "Bản mẫu": giả lập phía AntGo duyệt hồ sơ ----
  simulateApprove(): Observable<SellerVerification> {
    return this.write({ ...this.read(), status: 'approved', reviewedAt: new Date().toISOString(), rejectReason: undefined });
  }

  simulateReject(reason: string): Observable<SellerVerification> {
    return this.write({ ...this.read(), status: 'rejected', reviewedAt: new Date().toISOString(), rejectReason: reason });
  }

  /** Xóa hồ sơ mẫu để thử lại từ đầu. */
  simulateReset(): Observable<SellerVerification> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      /* bỏ qua */
    }
    this.state.set({ status: 'none' });
    return of({ status: 'none' });
  }

  private read(): SellerVerification {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as SellerVerification) : { status: 'none' };
    } catch {
      return { status: 'none' };
    }
  }

  private write(v: SellerVerification): Observable<SellerVerification> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(v));
    } catch {
      /* trình duyệt chặn lưu trữ: trạng thái vẫn đúng trong phiên */
    }
    this.state.set(v);
    return of(v);
  }
}
