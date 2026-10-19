import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE, useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { toAppError } from './api';

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Kiểm tra phía client để báo lỗi sớm; server (D2) vẫn kiểm tra lại loại + dung lượng. */
export function validateImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!UPLOAD_TYPES.includes(file.type)) return 'Chỉ nhận ảnh PNG, JPG hoặc WebP.';
  if (file.size > UPLOAD_MAX_BYTES) return 'Ảnh tối đa 2 MB.';
  return null;
}

/** Upload ảnh (POST /uploads, multipart). Mock trả về blob URL tạm của trình duyệt. */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  upload(file: File): Observable<string> {
    const problem = validateImage(file);
    if (problem) return throwError(() => new AppError(problem, 422, 'VALIDATION_ERROR', [{ field: 'file', message: problem }]));
    if (useMock('upload')) return of(URL.createObjectURL(file));
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ data: { url: string } }>(`${API_BASE}/uploads`, form).pipe(
      map((r) => r.data.url),
      catchError(toAppError),
    );
  }
}
