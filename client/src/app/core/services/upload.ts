import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, throwError } from 'rxjs';
import { API_BASE, useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { toAppError } from './api';

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Tệp đính kèm tin nhắn (cùng dạng Message.media / SellerMsg.media) */
export interface ChatMedia { kind: 'image' | 'video' | 'audio' | 'file'; url: string; name?: string; size?: number; sec?: number }

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
    form.append('images', file); // server nhận field `images`, trả mảng [{ url }]
    return this.http.post<{ data: { url: string }[] }>(`${API_BASE}/uploads`, form).pipe(
      map((r) => r.data[0].url),
      catchError(toAppError),
    );
  }

  /** Ảnh đang ở dạng data: / blob: (ảnh người bán vừa chọn) → tải lên server, trả địa chỉ thật; đã là địa chỉ thật thì giữ nguyên */
  uploadDataUrl(url: string): Observable<string> {
    if (!/^(data|blob):/.test(url)) return of(url);
    return from(fetch(url).then((r) => r.blob())).pipe(switchMap((blob) => this.upload(new File([blob], 'anh.jpg', { type: blob.type || 'image/jpeg' }))));
  }

  /**
   * Tệp đính kèm tin nhắn (ảnh, video, ghi âm, PDF / Office). Địa chỉ đã là của server thì giữ nguyên;
   * địa chỉ tạm của trình duyệt (blob: / data:) thì tải nội dung lên server rồi đổi sang địa chỉ thật.
   */
  uploadMedia(media: ChatMedia): Observable<ChatMedia> {
    if (useMock('upload') || /^(\/images\/|https?:)/.test(media.url)) return of(media);
    return from(fetch(media.url).then((r) => r.blob())).pipe(
      switchMap((blob) => {
        const form = new FormData();
        if (media.kind === 'audio') form.append('hint', 'audio');
        form.append('file', blob, media.name || `${media.kind}-${Date.now()}`);
        return this.http.post<{ data: { kind: ChatMedia['kind']; url: string; name?: string; size?: number } }>(`${API_BASE}/uploads/media`, form);
      }),
      map((r) => ({ ...media, kind: media.kind === 'audio' ? 'audio' : r.data.kind, url: r.data.url, name: r.data.name ?? media.name, size: r.data.size ?? media.size })),
      catchError(toAppError),
    );
  }
}
