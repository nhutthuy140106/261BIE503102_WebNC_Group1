import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MOCK_OVERRIDES } from '../config/api.config';
import { AppError } from '../models/api';
import { Offer } from '../models/offer';
import { Order } from '../models/order';
import { OrderService } from './order';
import { Address } from '../models/user';
import { AddressService } from './address';
import { JobOfferService } from './job-offer';
import { MockDb } from './mock-db';
import { QuestionService } from './question';
import { summarize } from './review';

const addr = (id: string, isDefault: boolean): Address => ({
  _id: id, name: 'A', phone: '0901234567', block: 'B', unit: 'B-1', label: 'home', isDefault,
});

const offer = (state: Offer['state']): Offer => ({
  _id: 'o1', code: 'AG-J1', jobId: 'j1', jobTitle: 't', posterName: 'p', pay: 1000, block: 'B',
  intro: 'xin chào bạn', slots: [], state, history: [{ state: 'offered', at: '2026-10-18T00:00:00Z' }],
});

/** Các service chạy ở chế độ USE_MOCK; dữ liệu nạp sẵn vào localStorage nên không cần HTTP. */
describe('mock services', () => {
  // Mặc định app chạy API thật; các test này kiểm logic mock nên ép mock cho từng service
  const forced = ['address', 'offer', 'question', 'order'] as const;
  beforeAll(() => forced.forEach((k) => (MOCK_OVERRIDES[k] = true)));
  afterAll(() => forced.forEach((k) => delete MOCK_OVERRIDES[k]));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  it('địa chỉ: luôn đúng một mặc định, không xóa được địa chỉ mặc định', async () => {
    TestBed.inject(MockDb).save('addresses', ([addr('a', true), addr('b', false)]));
    const svc = TestBed.inject(AddressService);

    await new Promise<void>((resolve) => svc.setDefault('b').subscribe(() => resolve()));
    const rows = await new Promise<Address[]>((resolve) => svc.list().subscribe(resolve));
    expect(rows.filter((r) => r.isDefault).map((r) => r._id)).toEqual(['b']);

    const err = await new Promise<AppError>((resolve) => svc.remove('b').subscribe({ error: resolve }));
    expect(err.status).toBe(409);
  });

  it('đề nghị: rút được khi "offered", báo xong phải có ghi chú, sai trạng thái trả 409', async () => {
    TestBed.inject(MockDb).save('offers', ([offer('offered')]));
    const svc = TestBed.inject(JobOfferService);

    const bad = await new Promise<AppError>((resolve) => svc.act('o1', 'reportDone', { note: 'x' }).subscribe({ error: resolve }));
    expect(bad.status).toBe(409);

    const done = await new Promise<Offer>((resolve) => svc.act('o1', 'withdraw').subscribe(resolve));
    expect(done.state).toBe('withdrawn');
    expect(done.history.length).toBe(2);
  });

  it('đề nghị: báo hoàn thành thiếu ghi chú trả 422 kèm field', async () => {
    TestBed.inject(MockDb).save('offers', ([offer('working')]));
    const svc = TestBed.inject(JobOfferService);
    const err = await new Promise<AppError>((resolve) => svc.act('o1', 'reportDone', { note: '  ' }).subscribe({ error: resolve }));
    expect(err.status).toBe(422);
    expect(err.details[0].field).toBe('note');
  });

  it('phụ thu: đồng ý thì cộng vào tổng, trả lời lần hai thì 409', async () => {
    const o: Order = {
      _id: 'x', code: 'AG-O1', type: 'placed', postId: 'p', postTitle: 't', counterpartName: 'b', status: 'preparing',
      total: 60000, paymentMethod: 'cash', createdAt: '', surcharge: { amount: 20000, reason: 'Đồ nặng', state: 'pending' },
    };
    TestBed.inject(MockDb).save('orders', [o]);
    const svc = TestBed.inject(OrderService);
    const next = await new Promise<Order>((resolve) => svc.respondSurcharge('x', true).subscribe(resolve));
    expect(next.total).toBe(80000);
    expect(next.surcharge?.state).toBe('approved');
    const err = await new Promise<AppError>((resolve) => svc.respondSurcharge('x', false).subscribe({ error: resolve }));
    expect(err.status).toBe(409);
  });

  it('hỏi đáp: chặn câu hỏi có số điện thoại (422)', async () => {
    TestBed.inject(MockDb).save('questions', []);
    const svc = TestBed.inject(QuestionService);
    const err = await new Promise<AppError>((resolve) => svc.ask('j1', 'Gọi mình 0901234567 nhé').subscribe({ error: resolve }));
    expect(err.status).toBe(422);
    const ok = await new Promise((resolve) => svc.ask('j1', 'Mèo có hiền không ạ?').subscribe(resolve));
    expect(ok).toBeTruthy();
  });
});

describe('summarize (đánh giá)', () => {
  it('tính trung bình và phân bố sao từ dữ liệu thật', () => {
    const mk = (rating: number) => ({ _id: String(rating), targetType: 'order' as const, targetId: 'x', authorName: 'a', rating, comment: '', createdAt: '' });
    const s = summarize([mk(5), mk(4), mk(5)]);
    expect(s.count).toBe(3);
    expect(s.average).toBe(4.7);
    expect(s.distribution[5]).toBe(2);
  });

  it('không có đánh giá thì điểm 0, không bịa số', () => {
    expect(summarize([]).average).toBe(0);
  });
});
