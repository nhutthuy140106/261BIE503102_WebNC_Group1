import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { Report, ReportReason } from '../models/social';
import { ApiService } from './api';
import { MockDb } from './mock-db';

const COLLECTION = 'reports';

/** Báo cáo vấn đề với đơn (docs/api-buyer-job.md mục 10). */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);

  create(body: { targetType: Report['targetType']; targetId: string; reason: ReportReason; detail: string }): Observable<Report> {
    if (!useMock('report')) return this.api.post<Report>('/reports', body);
    return this.db.list<Report>(COLLECTION).pipe(
      map((rows) => {
        if (body.detail.trim().length < 10) {
          throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [{ field: 'detail', message: 'Mô tả ít nhất 10 ký tự.' }]);
        }
        const r: Report = { _id: this.db.newId(), ...body, state: 'open', createdAt: new Date().toISOString() };
        this.db.save(COLLECTION, [r, ...rows]);
        return r;
      }),
    );
  }
}
