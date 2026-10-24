import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { useMock } from '../config/api.config';
import { AppError } from '../models/api';
import { CreateOfferBody, Offer, OfferAction } from '../models/offer';
import { offerFromApi } from '../utils/api-mappers';
import { applyAction, canDo } from '../utils/offer-state';
import { ApiService } from './api';
import { MockDb } from './mock-db';
import { PostService } from './post';

const COLLECTION = 'offers';
const ACTIVE = ['offered', 'chosen', 'working', 'reported'];

export interface ActionBody {
  /** reportDone: ghi chú bắt buộc */
  note?: string;
  /** cancelRequest: lý do bắt buộc */
  reason?: string;
}

/** Đề nghị nhận việc (docs/api-buyer-job.md mục 6). Máy trạng thái: utils/offer-state.ts. */
@Injectable({ providedIn: 'root' })
export class JobOfferService {
  private readonly api = inject(ApiService);
  private readonly db = inject(MockDb);
  private readonly posts = inject(PostService);

  list(): Observable<Offer[]> {
    return useMock('offer') ? this.db.list<Offer>(COLLECTION) : this.api.get<unknown[]>('/offers', { limit: 100 }).pipe(map((l) => l.map(offerFromApi)));
  }

  get(id: string): Observable<Offer> {
    if (!useMock('offer')) return this.api.get<unknown>(`/offers/${id}`).pipe(map(offerFromApi));
    return this.list().pipe(
      map((rows) => {
        const o = rows.find((r) => r._id === id);
        if (!o) throw new AppError('Không tìm thấy đề nghị.', 404, 'NOT_FOUND');
        return o;
      }),
    );
  }

  /** Đề nghị đang hoạt động của tôi cho một việc (null nếu chưa gửi). */
  findActiveForJob(jobId: string): Observable<Offer | null> {
    if (!useMock('offer')) return this.api.get<Record<string, unknown> & { myOffer?: Record<string, unknown> | null }>(`/jobs/${jobId}`).pipe(
        map((j) => {
          const mine = j.myOffer ? offerFromApi({ ...j.myOffer, job: j }) : null;
          return mine && ACTIVE.includes(mine.state) ? mine : null;
        }),
      );
    return this.list().pipe(map((rows) => rows.find((r) => r.jobId === jobId && ACTIVE.includes(r.state)) ?? null));
  }

  create(jobId: string, body: CreateOfferBody): Observable<Offer> {
    if (!useMock('offer')) return this.api.post<unknown>(`/jobs/${jobId}/offers`, body).pipe(map(offerFromApi));
    return this.posts.getPostById(jobId).pipe(
      switchMap((job) =>
        this.list().pipe(
          map((rows) => {
            if (!job || job.kind !== 'job') throw new AppError('Không tìm thấy việc.', 404, 'NOT_FOUND');
            if (job.job?.status !== 'open') throw new AppError('Việc đã có người nhận.', 409, 'INVALID_STATE');
            if (rows.some((r) => r.jobId === jobId && ACTIVE.includes(r.state))) {
              throw new AppError('Bạn đã gửi đề nghị cho việc này.', 409, 'DUPLICATE');
            }
            const offer: Offer = {
              _id: this.db.newId(),
              code: `AG-J${Math.floor(1000 + Math.random() * 9000)}`,
              jobId,
              jobTitle: job.title,
              posterName: job.sellerName,
              posterAvatar: job.sellerAvatar,
              posterId: job.sellerId,
              pay: job.price,
              block: job.block,
              intro: body.intro,
              slots: body.slots,
              state: 'offered',
              history: [{ state: 'offered', at: new Date().toISOString() }],
            };
            this.db.save(COLLECTION, [offer, ...rows]);
            return offer;
          }),
        ),
      ),
    );
  }

  updateIntro(id: string, intro: string): Observable<Offer> {
    if (!useMock('offer')) return this.api.patch<unknown>(`/offers/${id}`, { intro }).pipe(map(offerFromApi));
    return this.mutate(id, (o) => {
      if (o.state !== 'offered') throw new AppError('Chỉ sửa được khi đề nghị đang chờ.', 409, 'INVALID_STATE');
      return { ...o, intro };
    });
  }

  /** withdraw | start | reportDone | confirmPaid | cancelRequest */
  act(id: string, action: OfferAction, body: ActionBody = {}): Observable<Offer> {
    if (!useMock('offer')) return this.api.post<unknown>(`/offers/${id}/${toPath(action)}`, body).pipe(map(offerFromApi));
    return this.mutate(id, (o) => {
      if (!canDo(o.state, action)) throw new AppError('Thao tác không hợp lệ ở trạng thái hiện tại.', 409, 'INVALID_STATE');
      if (action === 'reportDone' && !body.note?.trim()) {
        throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [{ field: 'note', message: 'Cần ghi chú khi báo hoàn thành.' }]);
      }
      if (action === 'cancelRequest' && !body.reason) {
        throw new AppError('Dữ liệu chưa hợp lệ.', 422, 'VALIDATION_ERROR', [{ field: 'reason', message: 'Hãy chọn lý do.' }]);
      }
      const next = applyAction(o, action);
      return { ...next, reportNote: body.note ?? next.reportNote, cancelReason: body.reason ?? next.cancelReason };
    });
  }

  /**
   * Mock: áp thay đổi tùy ý vào đề nghị — nút "Mô phỏng phía người đăng" (chọn bạn / xác nhận hoàn thành…),
   * xác nhận đã nhận tiền công, đánh giá. Đổi `state` thì ghi thêm một mốc vào `history`.
   * Máy chủ chưa có endpoint cho các bước này (docs/handoff.md).
   */
  patch(id: string, patch: Partial<Offer>, _line?: string): Observable<Offer> {
    if (!useMock('offer')) throw new AppError('Bước này cần máy chủ hỗ trợ, chưa có API.', 501, 'NOT_IMPLEMENTED');
    return this.mutate(id, (o) => ({
      ...o,
      ...patch,
      history: patch.state && patch.state !== o.state ? [...o.history, { state: patch.state, at: new Date().toISOString() }] : o.history,
    }));
  }

  private mutate(id: string, fn: (o: Offer) => Offer): Observable<Offer> {
    return this.list().pipe(
      map((rows) => {
        const cur = rows.find((r) => r._id === id);
        if (!cur) throw new AppError('Không tìm thấy đề nghị.', 404, 'NOT_FOUND');
        const next = fn(cur);
        this.db.save(COLLECTION, rows.map((r) => (r._id === id ? next : r)));
        return next;
      }),
    );
  }
}

function toPath(a: OfferAction): string {
  return { withdraw: 'withdraw', start: 'start', reportDone: 'report-done', confirmPaid: 'confirm-paid', cancelRequest: 'cancel-request' }[a];
}
