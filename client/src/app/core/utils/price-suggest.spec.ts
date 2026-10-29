import { Post } from '../models/post';
import { roundPrice, suggestPrice } from './price-suggest';

const mk = (id: string, title: string, price: number, kind: Post['kind'] = 'food'): Post =>
  ({ _id: id, kind, title, description: '', images: [], sellerId: 's', sellerName: 'S', block: 'Block B', price }) as unknown as Post;

describe('suggestPrice', () => {
  const corpus = [
    mk('1', 'Cơm gà xối mỡ', 40000), mk('2', 'Cơm gà chiên giòn', 45000), mk('3', 'Cơm gà nướng', 50000),
    mk('4', 'Cơm gà teriyaki', 55000), mk('5', 'Cơm gà luộc', 38000), mk('6', 'Trà sữa trân châu', 30000),
    mk('7', 'Sửa máy lạnh', 200000, 'service'),
  ];

  it('gợi ý quanh giá các món giống nhất, đúng thứ tự thấp ≤ gợi ý ≤ cao', () => {
    const s = suggestPrice('food', 'Cơm gà', corpus)!;
    expect(s.low).toBeLessThanOrEqual(s.suggested);
    expect(s.suggested).toBeLessThanOrEqual(s.high);
    expect(s.suggested).toBeGreaterThanOrEqual(38000);
    expect(s.suggested).toBeLessThanOrEqual(55000);
  });

  it('không lẫn loại khác (dịch vụ không ảnh hưởng giá đồ ăn)', () => {
    const s = suggestPrice('food', 'Cơm gà', corpus)!;
    expect(s.high).toBeLessThan(200000);
  });

  it('không có dữ liệu cùng loại thì trả null', () => {
    expect(suggestPrice('job', 'Dọn nhà', corpus)).toBeNull();
  });

  it('làm tròn theo thang giá VN', () => {
    expect(roundPrice(43210)).toBe(43000);
    expect(roundPrice(123400)).toBe(125000);
  });
});
