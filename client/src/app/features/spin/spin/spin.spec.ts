import { Post } from '../../../core/models/post';
import { dishGroup, spinPool } from './spin';

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

  it('nhóm "Tất cả" gồm mọi món ăn, bỏ đồ dùng và bài đã ẩn', () => {
    const t = spinPool(all, 'all', 0).map((p) => p.title);
    expect(t).not.toContain('Sofa');
    expect(t).not.toContain('Cơm ẩn');
    expect(t.length).toBe(4);
  });
});
