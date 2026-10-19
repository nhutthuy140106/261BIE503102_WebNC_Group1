import { TestBed } from '@angular/core/testing';
import { Avatar, initialOf } from './avatar';

describe('Avatar', () => {
  it('chữ cái đầu: viết hoa, có dấu, bỏ khoảng trắng, rỗng thì "?"', () => {
    expect(initialOf('Ngọc Thủy')).toBe('N');
    expect(initialOf('  đức')).toBe('Đ');
    expect(initialOf('')).toBe('?');
    expect(initialOf(null)).toBe('?');
  });

  it('có src thì hiện ảnh; ảnh lỗi thì về chữ cái đầu; đổi src thì thử lại', () => {
    TestBed.configureTestingModule({ declarations: [Avatar] });
    const c = TestBed.createComponent(Avatar).componentInstance;
    c.name = 'Chị Hoa';
    expect(c.showImage).toBe(false);
    c.src = 'https://example.com/a.jpg';
    expect(c.showImage).toBe(true);
    c.onError();
    expect(c.showImage).toBe(false);
    expect(c.initial).toBe('C');
    c.src = 'https://example.com/b.jpg';
    expect(c.showImage).toBe(true);
  });
});
