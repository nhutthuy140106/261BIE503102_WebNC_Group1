import { postTag } from './post-tag';

describe('nhãn phân loại trên thẻ bài', () => {
  it('danh mục con không thành nhãn', () => {
    expect(postTag({ kind: 'service', category: 'Giặt sấy' })).toBe('Dịch vụ');
    expect(postTag({ kind: 'goods', category: 'Đồ bếp' })).toBe('Đồ dùng');
    expect(postTag({ kind: 'food', category: 'Cơm nhà làm' })).toBe('Đồ ăn');
    expect(postTag({ kind: 'job', category: 'Mua hộ' })).toBe('Việc làm');
  });

  it('đồ uống tách khỏi đồ ăn', () => {
    expect(postTag({ kind: 'food', template: 'drink', category: 'Trà sữa' })).toBe('Đồ uống');
    expect(postTag({ kind: 'food', formType: 'drink', category: 'Cà phê' })).toBe('Đồ uống');
    expect(postTag({ kind: 'food', category: 'Đồ uống' })).toBe('Đồ uống');
  });

  it('combo theo nhóm của bài', () => {
    expect(postTag({ kind: 'food', category: 'Combo' })).toBe('Đồ ăn');
  });
});
