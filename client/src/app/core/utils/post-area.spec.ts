import type { Post } from '../models/post';
import { inArea } from './post-area';

const post = (x: Partial<Post>) => x as Post;

describe('bài theo khu vực', () => {
  it('bài bán nhiều khu thì hiện ở từng khu đó, khu khác không hiện', () => {
    const p = post({ areas: ['Bcons', 'Vinhomes Grand Park'] });
    expect(inArea(p, 'Bcons')).toBe(true);
    expect(inArea(p, 'Vinhomes Grand Park')).toBe(true);
    expect(inArea(p, 'KTX Khu A')).toBe(false);
  });

  it('khu người bán chọn được ưu tiên hơn khu ghi trên bài', () => {
    expect(inArea(post({ area: 'Bcons', areas: ['KTX Khu A'] }), 'Bcons')).toBe(false);
  });

  it('bài mẫu chỉ có một khu', () => {
    expect(inArea(post({ area: 'Bcons' }), 'Bcons')).toBe(true);
    expect(inArea(post({ area: 'Bcons' }), 'KTX Khu B')).toBe(false);
  });

  it('bài không có thông tin khu thì vẫn hiện', () => {
    expect(inArea(post({}), 'KTX Khu A')).toBe(true);
    expect(inArea(post({ areas: [] }), 'KTX Khu A')).toBe(true);
  });
});
