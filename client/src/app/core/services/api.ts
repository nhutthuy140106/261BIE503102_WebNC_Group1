import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, retry, throwError } from 'rxjs';
import { API_BASE } from '../config/api.config';
import { ApiList, AppError } from '../models/api';

type Query = Record<string, string | number | boolean | undefined | null>;

/**
 * Lớp bọc HttpClient cho API thật: gắn base URL, bỏ lớp `{ data }`,
 * chuẩn hóa lỗi thành AppError. Chỉ GET được retry (POST/PATCH không an toàn để gửi lại).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, query?: Query): Observable<T> {
    return this.http.get<{ data: T }>(API_BASE + path, { params: toParams(query) }).pipe(
      retry({ count: 2, delay: (e) => (isRetryable(e) ? [null] : throwError(() => e)) }),
      map((r) => r.data),
      catchError(toAppError),
    );
  }

  getList<T>(path: string, query?: Query): Observable<ApiList<T>> {
    return this.http.get<ApiList<T>>(API_BASE + path, { params: toParams(query) }).pipe(
      retry({ count: 2, delay: (e) => (isRetryable(e) ? [null] : throwError(() => e)) }),
      catchError(toAppError),
    );
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<{ data: T }>(API_BASE + path, body).pipe(map((r) => r.data), catchError(toAppError));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<{ data: T }>(API_BASE + path, body).pipe(map((r) => r.data), catchError(toAppError));
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<{ data: T }>(API_BASE + path, body).pipe(map((r) => r.data), catchError(toAppError));
  }

  delete(path: string): Observable<void> {
    return this.http.delete<unknown>(API_BASE + path).pipe(map(() => void 0), catchError(toAppError));
  }
}

function toParams(q?: Query): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(q ?? {})) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

/** Chỉ thử lại khi lỗi mạng hoặc 5xx; 4xx là lỗi của người dùng, thử lại vô nghĩa. */
function isRetryable(e: unknown): boolean {
  return e instanceof HttpErrorResponse && (e.status === 0 || e.status >= 500);
}

export function toAppError(e: unknown): Observable<never> {
  if (e instanceof AppError) return throwError(() => e);
  if (e instanceof HttpErrorResponse) {
    const body = (e.error as { error?: { code?: string; message?: string; details?: AppError['details'] } } | null)?.error;
    const fallback: Record<number, string> = {
      0: 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
      401: 'Phiên đăng nhập đã hết hạn.',
      403: 'Bạn không có quyền thực hiện thao tác này.',
      404: 'Không tìm thấy dữ liệu.',
      409: 'Thao tác không hợp lệ ở trạng thái hiện tại.',
      422: 'Dữ liệu chưa hợp lệ.',
    };
    return throwError(
      () => new AppError(body?.message ?? fallback[e.status] ?? 'Có lỗi xảy ra, thử lại sau.', e.status, body?.code ?? 'ERROR', body?.details ?? []),
    );
  }
  return throwError(() => (e instanceof Error ? new AppError(e.message, 0, 'ERROR') : new AppError('Có lỗi xảy ra.', 0, 'ERROR')));
}
