import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { Address, AddressBody } from '../models/user';
import { ApiService } from './api';
import { MockDb } from './mock-db';

const COLLECTION = 'addresses';

/** Sổ địa chỉ của tôi (docs/api-buyer-job.md mục 2). Luôn có đúng 1 địa chỉ mặc định. */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);

  list(): Observable<Address[]> {
    return useMock('address') ? this.db.list<Address>(COLLECTION) : this.api.get<Address[]>('/me/addresses');
  }

  create(body: AddressBody): Observable<Address> {
    if (!useMock('address')) return this.api.post<Address>('/me/addresses', body);
    return this.mutate((rows) => {
      const first = rows.length === 0;
      const row: Address = { ...body, _id: this.db.newId(), isDefault: first || !!body.isDefault };
      const next = row.isDefault ? rows.map((r) => ({ ...r, isDefault: false })) : rows;
      return { rows: [...next, row], result: row };
    });
  }

  update(id: string, body: AddressBody): Observable<Address> {
    if (!useMock('address')) return this.api.put<Address>(`/me/addresses/${id}`, body);
    return this.mutate((rows) => {
      const cur = rows.find((r) => r._id === id);
      if (!cur) throw new AppError('Không tìm thấy địa chỉ.', 404, 'NOT_FOUND');
      const row: Address = { ...cur, ...body, isDefault: cur.isDefault };
      return { rows: rows.map((r) => (r._id === id ? row : r)), result: row };
    });
  }

  remove(id: string): Observable<void> {
    if (!useMock('address')) return this.api.delete(`/me/addresses/${id}`);
    return this.mutate((rows) => {
      const cur = rows.find((r) => r._id === id);
      if (!cur) throw new AppError('Không tìm thấy địa chỉ.', 404, 'NOT_FOUND');
      if (cur.isDefault) throw new AppError('Hãy đặt địa chỉ khác làm mặc định trước khi xóa.', 409, 'INVALID_STATE');
      return { rows: rows.filter((r) => r._id !== id), result: void 0 };
    });
  }

  setDefault(id: string): Observable<void> {
    if (!useMock('address')) return this.api.patch<void>(`/me/addresses/${id}/default`);
    return this.mutate((rows) => {
      if (!rows.some((r) => r._id === id)) throw new AppError('Không tìm thấy địa chỉ.', 404, 'NOT_FOUND');
      return { rows: rows.map((r) => ({ ...r, isDefault: r._id === id })), result: void 0 };
    });
  }

  /** Đọc → biến đổi → lưu. Lỗi ném trong `fn` thành lỗi của Observable. */
  private mutate<T>(fn: (rows: Address[]) => { rows: Address[]; result: T }): Observable<T> {
    return this.db.list<Address>(COLLECTION).pipe(
      map((rows) => {
        const out = fn(rows);
        this.db.save(COLLECTION, out.rows);
        return out.result;
      }),
    );
  }
}
