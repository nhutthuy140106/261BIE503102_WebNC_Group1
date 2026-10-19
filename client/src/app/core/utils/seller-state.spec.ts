import { Offer } from '../models/offer';
import { Order } from '../models/order';
import { applyPoster, applySellerOrder, posterActions, sellerOrderActions } from './seller-state';

const order = (status: Order['status'], extra: Partial<Order> = {}): Order => ({
  _id: 'o', code: 'AG-O1', type: 'placed', postId: 'p', postTitle: 't', counterpartName: 'b', status, total: 1,
  paymentMethod: 'cash', createdAt: '', ...extra,
});
const offer = (id: string, jobId: string, state: Offer['state']): Offer => ({
  _id: id, code: id, jobId, jobTitle: 't', posterName: 'p', pay: 1, block: 'B', intro: '', slots: [], state, history: [],
});

describe('seller-state', () => {
  it('đơn đi đúng chuỗi confirm → prepare → deliver → complete', () => {
    let o = order('pending');
    for (const a of ['confirm', 'prepare', 'deliver', 'complete'] as const) o = applySellerOrder(o, a);
    expect(o.status).toBe('done');
    expect(o.history?.map((h) => h.state)).toEqual(['confirmed', 'preparing', 'delivering', 'done']);
  });

  it('chỉ từ chối được khi đơn đang chờ xác nhận', () => {
    expect(sellerOrderActions(order('pending'))).toContain('decline');
    expect(sellerOrderActions(order('preparing'))).not.toContain('decline');
    expect(sellerOrderActions(order('done'))).toEqual([]);
  });

  it('khách xin hủy thì người bán thấy "Đồng ý hủy" và đơn chuyển cancelled', () => {
    const o = order('preparing', { cancelRequested: true });
    expect(sellerOrderActions(o)[0]).toBe('approveCancel');
    expect(applySellerOrder(o, 'approveCancel').status).toBe('cancelled');
  });

  it('chuyển sai bước thì ném lỗi', () => {
    expect(() => applySellerOrder(order('pending'), 'deliver')).toThrow();
  });

  it('chọn một người thì các đề nghị chờ khác của cùng việc bị loại, việc khác không ảnh hưởng', () => {
    const list = [offer('a', 'j1', 'offered'), offer('b', 'j1', 'offered'), offer('c', 'j2', 'offered')];
    const next = applyPoster(list, 'a', 'choose');
    expect(next.map((o) => o.state)).toEqual(['chosen', 'rejected', 'offered']);
  });

  it('xác nhận hoàn thành chỉ khi người làm đã báo xong', () => {
    expect(posterActions({ state: 'reported' })).toEqual(['confirmDone']);
    expect(posterActions({ state: 'working' })).toEqual([]);
    expect(() => applyPoster([offer('a', 'j', 'working')], 'a', 'confirmDone')).toThrow();
  });
});
