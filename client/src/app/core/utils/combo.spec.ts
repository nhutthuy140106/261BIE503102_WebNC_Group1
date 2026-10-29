import { Post } from '../models/post';
import { buildComboDetail, comboSaving } from './combo';

const vn = (h: number, m = 0) => Date.UTC(2026, 9, 29, h - 7, m);
const base = { price: 75000, combo: { items: [{ postId: 'a', qty: 2 }, { postId: 'b', qty: 1 }], comboPrice: 75000, listPrice: 85000 } };

describe('combo', () => {
  it('tiết kiệm = giá lẻ − giá đang trả; Giờ vàng làm tiết kiệm nhiều hơn', () => {
    expect(comboSaving(base, vn(12))).toBe(10000);
    const gold = { ...base, promo: { kind: 'percent' as const, value: 10, from: '15:00', to: '18:00', days: [] } };
    expect(comboSaving(gold, vn(16))).toBe(17500);
    expect(comboSaving(gold, vn(12))).toBe(10000);
    expect(comboSaving({ price: 5 }, vn(12))).toBe(0);
  });

  it('mock: ghép chi tiết từ các bài thành phần, món thiếu/đóng thì không còn bán', () => {
    const mk = (id: string, price: number, closed = false) => ({ _id: id, title: id, price, images: ['x.jpg'], closed }) as unknown as Post;
    const d = buildComboDetail({ ...base } as unknown as Post, [mk('a', 30000), mk('b', 25000, true)], vn(12))!;
    expect(d.items.map((i) => [i.title, i.qty, i.available])).toEqual([['a', 2, true], ['b', 1, false]]);
    expect(d.saving).toBe(10000);
  });
});
