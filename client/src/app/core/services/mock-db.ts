import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { DATASET_BASE } from '../config/api.config';

const PREFIX = 'antgo_mock_';
/** Đổi chuỗi này mỗi khi sửa cấu trúc dữ liệu mẫu: dữ liệu cũ lưu trong trình duyệt tự bị xóa để nạp bản mới */
const DATA_VERSION = '2026-10-24-e';

/**
 * Kho dữ liệu giả cho chế độ USE_MOCK: lần đầu đọc public/datasets/<name>.json,
 * sau đó lưu thay đổi vào localStorage để thao tác bấm thử còn nguyên khi tải lại trang.
 * Xóa các khóa `antgo_mock_*` (hoặc gọi reset()) để quay về dữ liệu gốc.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  private readonly http = inject(HttpClient);
  private readonly mem = new Map<string, unknown[]>();

  constructor() {
    try {
      if (localStorage.getItem('antgo_mock_ver') !== DATA_VERSION) {
        this.reset();
        localStorage.setItem('antgo_mock_ver', DATA_VERSION);
      }
    } catch {
      /* bỏ qua */
    }
  }

  list<T>(name: string): Observable<T[]> {
    const cached = this.mem.get(name) ?? this.readStorage<T>(name);
    if (cached) {
      this.mem.set(name, cached);
      return of(cached as T[]);
    }
    return this.http.get<T[]>(`${DATASET_BASE}/${name}.json`).pipe(
      tap((rows) => this.mem.set(name, rows)),
      map((rows) => rows),
    );
  }

  save<T>(name: string, rows: T[]): void {
    this.mem.set(name, rows);
    try {
      localStorage.setItem(PREFIX + name, JSON.stringify(rows));
    } catch {
      /* trình duyệt chặn lưu trữ: dữ liệu vẫn đúng trong phiên */
    }
  }

  reset(): void {
    this.mem.clear();
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* bỏ qua */
    }
  }

  newId(): string {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    return Array.from({ length: 24 }, hex).join('');
  }

  private readStorage<T>(name: string): T[] | null {
    try {
      const raw = localStorage.getItem(PREFIX + name);
      const v = raw ? JSON.parse(raw) : null;
      return Array.isArray(v) ? (v as T[]) : null;
    } catch {
      return null;
    }
  }
}
