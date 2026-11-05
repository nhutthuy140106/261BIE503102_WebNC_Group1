import type { Post } from '../models/post';
import { OrderDraft } from './order-draft';
import { viewOf } from './template-for';

const post = (x: Partial<Post>) => ({ _id: 'a', kind: 'service', title: 'Giặt sấy thử', description: 'x', price: 18000, images: [], block: 'Bcons', sellerName: 'A', createdAt: '2026-11-05T08:00:00Z', timeMode: 'slot', ...x }) as unknown as Post;

describe('cách nhận của dịch vụ', () => {
  it('có cách nhận thì chọn như đồ ăn, đồ dùng', () => {
    const { tpl } = viewOf(post({ fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 10000, freeShipFrom: 100000 }));
    expect(tpl.place.mode).toBe('choice');
    expect(tpl.place.choices).toEqual([['Giao tận nơi', 10000], ['Tự đến lấy', 0]]);
    expect(tpl.freeShipFrom).toBe(100000);
  });

  it('giặt sấy: tiệm qua nhà lấy đồ nên luôn cần địa chỉ, tắt giao chỉ đổi cách trả đồ', () => {
    const d = new OrderDraft(viewOf(post({ pickupAtBuyer: true, fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 10000 })).tpl);
    expect([d.needsAddress(), d.toBuyer(), d.placeFee()]).toEqual([true, true, 10000]);
    d.place.set(1);
    expect([d.needsAddress(), d.toBuyer(), d.placeFee()]).toEqual([true, false, 0]);
  });

  it('bài khác tắt giao thì không cần địa chỉ', () => {
    const d = new OrderDraft(viewOf(post({ kind: 'goods', fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 10000 })).tpl);
    d.place.set(1);
    expect(d.needsAddress()).toBe(false);
  });

  it('dịch vụ đăng từ form dùng chung một bộ chữ', () => {
    const a = viewOf(post({ place: { mode: 'buyer' } })).tpl;
    expect(a.action).toBe('Đặt lịch');
    expect(a.notePh).toContain('người làm');
    expect(viewOf(post({ place: { mode: 'buyer' }, priceType: 'quote' })).tpl.action).toBe('Gửi yêu cầu');
  });

  it('dịch vụ theo nơi làm thì giữ như cũ', () => {
    expect(viewOf(post({ place: { mode: 'buyer' }, deliveryFee: 30000 })).tpl.place).toMatchObject({ mode: 'buyer', fee: 30000 });
  });
});
