import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { Review, ReviewSummary } from '../models/social';
import { ApiService } from './api';
import { AuthService } from './auth';
import { MockDb } from './mock-db';

const COLLECTION = 'reviews';

/** Tính điểm trung bình + phân bố sao từ danh sách đánh giá (không số liệu giả). */
export function summarize(items: Review[]): ReviewSummary {
  const distribution: ReviewSummary['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of items) distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
  const count = items.length;
  const average = count ? Math.round((items.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return { average, count, distribution, items };
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);
  private readonly auth = inject(AuthService);

  list(filter: { targetId?: string; rating?: number }): Observable<ReviewSummary> {
    if (!useMock('review')) return this.api.get<ReviewSummary>('/reviews', filter);
    return this.db.list<Review>(COLLECTION).pipe(
      map((rows) =>
        summarize(
          rows.filter((r) => (!filter.targetId || r.targetId === filter.targetId) && (!filter.rating || r.rating === filter.rating)),
        ),
      ),
    );
  }

  create(body: { targetType: 'order' | 'offer'; targetId: string; rating: number; comment: string }): Observable<Review> {
    if (!useMock('review')) return this.api.post<Review>('/reviews', body);
    return this.db.list<Review>(COLLECTION).pipe(
      map((rows) => {
        if (body.rating < 1 || body.rating > 5) {
          throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [{ field: 'rating', message: 'Chọn từ 1 đến 5 sao.' }]);
        }
        if (rows.some((r) => r.targetId === body.targetId)) {
          throw new AppError('Bạn đã đánh giá đơn này.', 409, 'DUPLICATE');
        }
        const review: Review = {
          _id: this.db.newId(),
          ...body,
          authorName: this.auth.currentUser()?.fullName ?? 'Bạn',
          createdAt: new Date().toISOString(),
        };
        this.db.save(COLLECTION, [review, ...rows]);
        return review;
      }),
    );
  }
}
