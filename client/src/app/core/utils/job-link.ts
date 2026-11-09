import { Offer } from '../models/offer';
import { SellerOffer, SellerQuestion } from '../models/seller';
import { Question } from '../models/social';
import { initialAvatar } from './order-link';
import { formatDateTime } from './status-label';

/**
 * Đề nghị và hỏi đáp của việc làm chỉ lưu ở MỘT nơi: kho `offers`, `questions` (cùng dạng với API thật).
 * Phía Bán không giữ bản sao, chỉ đổi sang dạng hiển thị của mình bằng hai hàm dưới đây.
 */
export function toSellerOffer(o: Offer): SellerOffer {
  const name = o.workerName ?? 'Người nhận việc';
  const reportedAt = o.history.find((h) => h.state === 'reported')?.at;
  return {
    id: o._id,
    code: o.code,
    worker: { name, avatar: o.workerAvatar || initialAvatar(name), phone: o.workerPhone ?? '', rating: 'Mới', jobs: 0, distance: o.workerBlock ?? '' },
    slot: o.slots.length ? o.slots.join(', ') : 'Thỏa thuận sau',
    intro: o.intro,
    state: o.state,
    report: o.reportNote ? { note: o.reportNote, at: reportedAt ? formatDateTime(reportedAt) : '', photos: 0 } : undefined,
    rated: o.posterRated ?? null,
  };
}

export function toSellerQuestion(q: Question): SellerQuestion {
  return {
    id: q._id,
    by: { name: q.authorName, avatar: q.authorAvatar || initialAvatar(q.authorName), phone: '' },
    at: formatDateTime(q.createdAt),
    text: q.text,
    answer: q.answer ?? undefined,
  };
}
