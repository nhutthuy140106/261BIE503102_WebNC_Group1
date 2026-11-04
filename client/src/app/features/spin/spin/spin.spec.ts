import { Post } from '../../../core/models/post';
import { PROMO_MAX_SHARE, dishGroup, pickWinner, spinPool } from './spin';

const mk = (title: string, price: number, kind: Post['kind'] = 'food', closed = false): Post => ({
  _id: title, kind, title, description: '', images: [], sellerId: 's', sellerName: 'x', block: 'B', price, createdAt: '', closed,
});

describe('quay món', () => {
  it('đoán nhóm theo tên: uống, ăn vặt, bữa ăn', () => {
    expect(dishGroup('Trà sữa trân châu')).toBe('drink');
    expect(dishGroup('Cà phê sữa đá')).toBe('drink');
    expect(dishGroup('Bánh mì que pate')).toBe('snack');
    expect(dishGroup('Cơm nhà làm')).toBe('meal');
    expect(dishGroup('Phở bò tái')).toBe('meal');
  });

  const all = [mk('Cơm gà', 35000), mk('Phở bò', 45000), mk('Cơm sườn', 90000), mk('Trà đào', 25000), mk('Sofa', 500000, 'goods'), mk('Cơm ẩn', 20000, 'food', true)];

  it('chỉ lấy món ăn đang mở, theo nhóm và ngân sách', () => {
    expect(spinPool(all, 'meal', 50000).map((p) => p.title)).toEqual(['Cơm gà', 'Phở bò']);
    expect(spinPool(all, 'drink', 50000).map((p) => p.title)).toEqual(['Trà đào']);
    expect(spinPool(all, 'meal', 0).length).toBe(3);
  });

  describe('món quảng bá vào vòng quay', () => {
    const promo = (title: string): Post => ({ ...mk(title, 30000), spinPromo: true });
    /** Quay đều 10.000 lần trên các số trong [0,1) cách đều nhau → đếm tỉ lệ trúng đúng, không phụ thuộc may rủi. */
    const share = (pool: Post[]) => {
      const N = 10000;
      let hit = 0;
      for (let i = 0; i < N; i++) if (pickWinner(pool, () => (i + 0.5) / N).spinPromo) hit++;
      return hit / N;
    };

    it('gấp đôi cơ hội so với món thường khi chưa vượt trần', () => {
      const pool = [promo('A'), mk('b', 1), mk('c', 1), mk('d', 1), mk('e', 1), mk('f', 1), mk('g', 1), mk('h', 1), mk('i', 1), mk('j', 1)];
      expect(share(pool)).toBeCloseTo(2 / 11, 2); // 1 món quảng bá nặng 2 + 9 món thường nặng 1
    });

    it('tất cả món quảng bá cộng lại không vượt 30%', () => {
      const pool = [promo('A'), promo('B'), promo('C'), mk('d', 1), mk('e', 1)];
      expect(share(pool)).toBeCloseTo(PROMO_MAX_SHARE, 2);
    });

    it('nếu mọi món đều quảng bá thì chia đều, không lỗi', () => {
      expect(pickWinner([promo('A'), promo('B')], () => 0.99).title).toBe('B');
    });
  });

  it('nhóm "Tất cả" gồm mọi món ăn, bỏ đồ dùng và bài đã ẩn', () => {
    const t = spinPool(all, 'all', 0).map((p) => p.title);
    expect(t).not.toContain('Sofa');
    expect(t).not.toContain('Cơm ẩn');
    expect(t.length).toBe(4);
  });
});
