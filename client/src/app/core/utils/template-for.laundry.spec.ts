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

  it('dịch vụ: tùy chọn cộng giá tính một lần cho cả đơn, không ghi số lượng', () => {
    const items = [{ id: 'a', name: 'Vệ sinh máy lạnh', price: 150000, unit: 'máy' }, { id: 'b', name: 'Đi dây điện', price: 90000, unit: 'lần' }];
    const opt = { name: 'Bộ đồ dùng', multi: false, required: true, choices: [{ label: 'Thường', price: 0 }, { label: 'Cao cấp', price: 100000 }] };
    const d = new OrderDraft(viewOf(post({ place: { mode: 'buyer' }, price: 90000, items, optionGroups: [opt] })).tpl);
    const dishes = d.dishGroup!.choices;
    d.setDish(dishes[0], 2);
    d.setDish(dishes[1], 1);
    d.setOpt('Bộ đồ dùng', 'Cao cấp|+100.000đ');
    expect(d.subtotal()).toBe(150000 * 2 + 90000 + 100000);
    expect(d.lines()).toContain('Bộ đồ dùng: Cao cấp');
  });

  it('dịch vụ: mỗi câu trả lời là một dòng riêng', () => {
    const d = new OrderDraft(viewOf(post({ place: { mode: 'buyer' }, questions: [{ type: 'text', label: 'Bộ phận', required: false }, { type: 'text', label: 'Mô tả lỗi', required: false }] })).tpl);
    d.setAns('Bộ phận', 'Máy lạnh');
    d.setAns('Mô tả lỗi', 'Không lạnh');
    expect(d.lines()).toEqual(['Bộ phận: Máy lạnh', 'Mô tả lỗi: Không lạnh']);
  });

  it('dịch vụ theo nơi làm thì giữ như cũ', () => {
    expect(viewOf(post({ place: { mode: 'buyer' }, deliveryFee: 30000 })).tpl.place).toMatchObject({ mode: 'buyer', fee: 30000 });
  });
});
