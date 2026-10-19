import { Post } from '../models/post';
import { matches } from './post';
import { validateImage } from './upload';

const p = (title: string, extra: Partial<Post> = {}): Post => ({
  _id: '1', kind: 'food', title, description: '', images: [], sellerId: 's', sellerName: 'x', block: 'Block B', price: 30000, createdAt: '', ...extra,
});

describe('PostService.matches', () => {
  it('tìm không dấu: "ca phe" ra "Cà phê"', () => {
    expect(matches(p('Cà phê sữa đá'), { q: 'ca phe' })).toBe(true);
    expect(matches(p('Cà phê sữa đá'), { q: 'bun bo' })).toBe(false);
  });
  it('lọc theo loại và khoảng giá', () => {
    expect(matches(p('A'), { kind: 'goods' })).toBe(false);
    expect(matches(p('A'), { min: 40000 })).toBe(false);
    expect(matches(p('A'), { min: 20000, max: 30000 })).toBe(true);
  });
});

describe('validateImage', () => {
  it('chỉ nhận png/jpg/webp ≤ 2MB', () => {
    expect(validateImage({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateImage({ type: 'image/gif', size: 1000 })).not.toBeNull();
    expect(validateImage({ type: 'image/jpeg', size: 3 * 1024 * 1024 })).not.toBeNull();
  });
});
