import { TestBed } from '@angular/core/testing';
import { OrderThumb } from './order-thumb';

describe('OrderThumb', () => {
  const make = () => {
    TestBed.configureTestingModule({ declarations: [OrderThumb] });
    return TestBed.createComponent(OrderThumb).componentInstance;
  };

  it('có ảnh thì hiện ảnh; ảnh lỗi thì về ô kem + icon', () => {
    const c = make();
    c.category = 'food';
    c.image = 'https://example.com/a.jpg';
    expect(c.showImage).toBe(true);
    c.onError();
    expect(c.showImage).toBe(false);
    expect(c.icon).toBe('bellhop');
    expect(c.label).toBe('Đồ ăn & uống');
  });

  it('việc làm không có ảnh: icon bàn tay + nhãn Việc làm; nhóm lạ thì icon biên lai', () => {
    const c = make();
    c.category = 'job';
    expect(c.showImage).toBe(false);
    expect(c.icon).toBe('hand');
    expect(c.label).toBe('Việc làm');
    c.category = undefined;
    expect(c.icon).toBe('receipt');
  });
});
