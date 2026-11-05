import { Offer } from '../models/offer';
import { Question } from '../models/social';
import { toSellerOffer, toSellerQuestion } from './job-link';

const offer: Offer = {
  _id: 'o1', code: 'AG-J1', jobId: 'j1', jobTitle: 'Việc', posterName: 'A', pay: 1000, block: 'Bcons', intro: 'Mình làm được', slots: ['08:30 – 11:00', '14:00 – 16:00'],
  state: 'offered', history: [{ state: 'offered', at: '2026-11-06T08:00:00' }], workerName: 'Minh', workerAvatar: 'a.png', workerPhone: '0900000000', workerBlock: 'Block B',
};

describe('đề nghị nhận việc phía Bán', () => {
  it('đọc từ đề nghị người nhận việc đã gửi', () => {
    expect(toSellerOffer(offer)).toMatchObject({
      id: 'o1', intro: 'Mình làm được', slot: '08:30 – 11:00, 14:00 – 16:00', state: 'offered', rated: null,
      worker: { name: 'Minh', avatar: 'a.png', phone: '0900000000', distance: 'Block B' },
    });
  });

  it('không chọn giờ thì ghi thỏa thuận sau', () => {
    expect(toSellerOffer({ ...offer, slots: [] }).slot).toBe('Thỏa thuận sau');
  });

  it('báo xong thì có ghi chú và giờ báo', () => {
    const r = toSellerOffer({ ...offer, state: 'reported', reportNote: 'Đã giao', history: [...offer.history, { state: 'reported', at: '2026-11-06T10:00:00' }] });
    expect(r.report).toEqual({ note: 'Đã giao', at: '06/11/2026 · 10:00', photos: 0 });
  });

  it('đề nghị cũ thiếu tên vẫn hiện được', () => {
    const r = toSellerOffer({ ...offer, workerName: undefined, workerAvatar: undefined });
    expect(r.worker.name).toBe('Người nhận việc');
    expect(r.worker.avatar).toContain('data:image');
  });
});

describe('hỏi đáp phía Bán', () => {
  const q: Question = { _id: 'q1', jobId: 'j1', text: 'Có cần xe không?', authorName: 'Lan', answer: null, createdAt: '2026-11-06T08:00:00' };

  it('chưa trả lời thì không có câu trả lời', () => {
    expect(toSellerQuestion(q)).toMatchObject({ id: 'q1', text: 'Có cần xe không?', answer: undefined, by: { name: 'Lan' } });
  });

  it('đã trả lời thì đọc cùng câu trả lời trong kho', () => {
    expect(toSellerQuestion({ ...q, answer: 'Có' }).answer).toBe('Có');
  });
});
