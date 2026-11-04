import { CreateOrderBody, Order } from '../models/order';
import { Post } from '../models/post';
import { SellerOrder, SellerPost } from '../models/seller';
import { applyBuyerChange, buyerPatchOf, flowOf, sellerStateOf, toSellerOrder } from './order-link';

const order = (o: Partial<Order> = {}): Order =>
  ({ _id: 'o1', code: 'AG-O1', type: 'placed', postId: 'p1', postTitle: 'Bếp', counterpartName: 'Cô Lan', status: 'pending', total: 75000, paymentMethod: 'cash', createdAt: '', ...o }) as Order;
const post = { _id: 'p1', kind: 'food', title: 'Bếp', price: 30000, images: ['a.jpg'], items: [{ id: 'i1', name: 'Xôi', price: 30000 }, { id: 'i2', name: 'Bún', price: 35000 }] } as unknown as Post;
const sp = { id: 'n1', buyerPostId: 'p1' } as SellerPost;
const body = (b: Partial<CreateOrderBody> = {}): CreateOrderBody =>
  ({ postId: 'p1', quantity: 1, selections: [], fulfillment: 'delivery', utensils: false, payment: 'cash', ...b }) as CreateOrderBody;
const who = { name: 'Thủy', avatar: '', phone: '0900000000' };
const detail = (fee: number) => ({ lines: [], items: [{ name: 'Xôi', qty: 1 }, { name: 'Bún', qty: 1 }], subtotal: 0, fee, discount: 0, steps: [] });

describe('toSellerOrder', () => {
  it('tổng tiền khớp đơn phía Mua: phần tùy chọn thành một dòng riêng', () => {
    const t = toSellerOrder(order(), post, body({ detail: detail(5000), selections: [{ group: 'Món', choices: ['Xôi', 'Bún'] }, { group: 'Size', choices: ['L'] }] }), sp, who);
    expect(t.ship).toBe(5000);
    expect(t.items.reduce((n, i) => n + i.qty * i.price, 0) + t.ship).toBe(75000);
    expect(t.items[2]).toMatchObject({ name: 'Tùy chọn cộng giá', price: 5000 });
    expect(t.items[0].option).toBe('Size: L');
    expect(t.stockQty).toBe(2);
  });

  it('size riêng: ghi và tính tiền vào đúng dòng món, không có dòng phụ', () => {
    const size = (l: number) => [{ name: 'Size', multi: false, required: true, perDish: true, choices: [{ label: 'M', price: 0 }, { label: 'L', price: l }] }];
    const drink = { ...post, items: [{ id: 'i1', name: 'Trà đào', price: 30000, optionGroups: size(6000) }, { id: 'i2', name: 'Trà sữa', price: 35000, optionGroups: size(8000) }] } as Post;
    const b = body({ detail: { ...detail(5000), items: [{ name: 'Trà đào', qty: 2 }, { name: 'Trà sữa', qty: 1 }] }, selections: [{ group: 'Menu', choices: ['Trà đào', 'Trà sữa'] }, { group: 'Trà đào – Size', choices: ['L'] }, { group: 'Trà sữa – Size', choices: ['M'] }] });
    const t = toSellerOrder(order({ total: 112000 }), drink, b, sp, who);
    expect(t.items).toEqual([
      { name: 'Trà đào', qty: 2, option: 'Size: L', price: 36000 },
      { name: 'Trà sữa', qty: 1, option: 'Size: M', price: 35000 },
    ]);
  });

  it('giảm giá làm tổng thấp hơn giá món thì ghi dòng Giảm giá', () => {
    const t = toSellerOrder(order({ total: 25000 }), post, body(), sp, who);
    expect(t.items[1]).toMatchObject({ name: 'Giảm giá', price: -5000 });
  });

  it('báo giá sau: dòng tiền là phí kiểm tra, không phải tùy chọn', () => {
    const t = toSellerOrder(order({ total: 80000 }), { ...post, kind: 'service', priceType: 'quote', price: 0 } as Post, body({ detail: { ...detail(30000), items: undefined } }), sp, who);
    expect(t.items).toEqual([{ name: 'Phí kiểm tra', qty: 1, option: '', price: 50000 }]);
  });

  it('dịch vụ tại nhà khách và ngày hẹn', () => {
    const now = new Date(2026, 10, 4, 9, 0);
    const t = toSellerOrder(order({ total: 30000 }), { ...post, kind: 'service' } as Post, body({ scheduledAt: new Date(2026, 10, 5, 14, 30).toISOString() }), sp, who, now);
    expect(t.fulfil).toBe('home');
    expect(t.day).toBe(1);
    expect(t.time).toBe('14:30');
  });
});

describe('flowOf', () => {
  it('báo giá sau là sửa chữa, mẫu giặt sấy là giặt sấy', () => {
    expect(flowOf({ form: { spec: { priceType: 'quote', preset: 'Khác' } } } as unknown as SellerPost)).toBe('repair');
    expect(flowOf({ form: { spec: { priceType: 'fixed', preset: 'Giặt sấy' } } } as unknown as SellerPost)).toBe('laundry');
    expect(flowOf({} as SellerPost)).toBeUndefined();
  });
});

describe('hai chiều', () => {
  const seller = (o: Partial<SellerOrder> = {}): SellerOrder => ({ ...toSellerOrder(order({ total: 30000 }), post, body(), sp, who), ...o });

  it('người mua xin hủy và hủy: phía Bán thấy đúng', () => {
    const t = seller({ state: 'confirmed' });
    expect(applyBuyerChange(t, order({ status: 'confirmed', cancelRequested: true, cancelWhy: 'Đặt nhầm' }))).toBe(false);
    expect(t.cancelRequest).toBe('Đặt nhầm');
    expect(applyBuyerChange(t, order({ status: 'cancelled' }))).toBe(true);
    expect(t.state).toBe('cancelled');
    expect(t.cancelRequest).toBeNull();
  });

  it('bước Đã lấy đồ không bị trạng thái phía Mua ghi đè', () => {
    expect(sellerStateOf('confirmed', 'picked')).toBe('picked');
    expect(sellerStateOf('pending', 'waiting')).toBe('waiting');
  });

  it('người mua duyệt giá thì báo giá được đánh dấu đồng ý', () => {
    const t = seller({ state: 'pricing', quote: { lines: [], total: 90000, ok: false } });
    applyBuyerChange(t, order({ status: 'preparing', priceDone: true }));
    expect(t.state).toBe('preparing');
    expect(t.quote?.ok).toBe(true);
  });

  it('người bán đổi bước: đơn phía Mua đổi theo', () => {
    const t = seller();
    expect(buyerPatchOf('confirm', t, order(), 'Cô Lan')?.patch.status).toBe('confirmed');
    expect(buyerPatchOf('complete', t, order(), 'Cô Lan')?.patch.status).toBe('done');
    expect(buyerPatchOf('approveCancel', t, order({ status: 'preparing' }), 'Cô Lan')?.patch).toMatchObject({ status: 'cancelled', cancelFrom: 'preparing', cancelRequested: false });
  });

  it('báo giá gồm cả phí giao', () => {
    const t = seller({ ship: 10000, flow: 'laundry', quote: { lines: [{ name: 'Giặt', qty: 3, price: 20000 }], total: 60000, ok: false } });
    const c = buyerPatchOf('quote', t, order({ status: 'confirmed' }), 'Tiệm');
    expect(c?.patch.newPrice?.total).toBe(70000);
    expect(c?.patch.priceCheck).toBe('estimate');
  });
});
