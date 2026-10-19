import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { Question } from '../models/social';
import { questionFromApi } from '../utils/api-mappers';
import { containsPhone } from '../utils/validators';
import { ApiService } from './api';
import { AuthService } from './auth';
import { MockDb } from './mock-db';

const COLLECTION = 'questions';

/** Hỏi đáp công khai của việc làm (docs/api-buyer-job.md mục 7). */
@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);
  private readonly auth = inject(AuthService);

  list(jobId: string): Observable<Question[]> {
    if (!useMock('question')) return this.api.get<unknown[]>(`/jobs/${jobId}/questions`).pipe(map((l) => l.map(questionFromApi)));
    return this.db.list<Question>(COLLECTION).pipe(map((rows) => rows.filter((q) => q.jobId === jobId)));
  }

  /** Server mới là nơi chặn SĐT bắt buộc; mock mô phỏng lại để thấy lỗi 422. */
  ask(jobId: string, text: string): Observable<Question> {
    if (!useMock('question')) return this.api.post<unknown>(`/jobs/${jobId}/questions`, { text }).pipe(map(questionFromApi));
    return this.db.list<Question>(COLLECTION).pipe(
      map((rows) => {
        const t = text.trim();
        if (t.length < 5 || t.length > 500 || containsPhone(t)) {
          throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [
            { field: 'text', message: containsPhone(t) ? 'Không ghi số điện thoại ở hỏi đáp công khai.' : 'Câu hỏi dài 5–500 ký tự.' },
          ]);
        }
        const q: Question = {
          _id: this.db.newId(),
          jobId,
          text: t,
          authorName: this.auth.currentUser()?.fullName ?? 'Bạn',
          answer: null,
          createdAt: new Date().toISOString(),
        };
        this.db.save(COLLECTION, [...rows, q]);
        return q;
      }),
    );
  }
}
