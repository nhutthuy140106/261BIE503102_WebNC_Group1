import { FormControl } from '@angular/forms';
import { containsPhone, phoneValidator } from './validators';
import { calcOrderTotal } from './order-math';

describe('validators', () => {
  it('SĐT hợp lệ 10 số bắt đầu bằng 0', () => {
    expect(phoneValidator(new FormControl('0901234567'))).toBeNull();
    expect(phoneValidator(new FormControl('090123456'))).toEqual({ phone: true });
    expect(phoneValidator(new FormControl('1901234567'))).toEqual({ phone: true });
  });

  it('phát hiện SĐT trong hỏi đáp, kể cả viết cách nhau', () => {
    expect(containsPhone('gọi 0901234567 nhé')).toBe(true);
    expect(containsPhone('0901 234 567')).toBe(true);
    expect(containsPhone('mèo nặng 4 kg, 2 buổi/ngày')).toBe(false);
  });
});

describe('calcOrderTotal', () => {
  it('cộng tùy chọn, phí giao, trừ giảm giá', () => {
    expect(
      calcOrderTotal({ unitPrice: 35000, quantity: 2, extras: [{ price: 5000 }], deliveryFee: 7000, discount: 10000 }),
    ).toBe((35000 + 5000) * 2 + 7000 - 10000);
  });

  it('không âm', () => {
    expect(calcOrderTotal({ unitPrice: 1000, quantity: 1, discount: 5000 })).toBe(0);
  });
});
