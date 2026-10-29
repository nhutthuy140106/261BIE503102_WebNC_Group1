import { countdown, dealAt, discounted, upcomingAt, Promo } from './promo';

// Mốc giờ VN (UTC+7) → ms epoch. 2026-10-29 là Thứ năm (dow = 4).
const vn = (h: number, m = 0, day = 29) => Date.UTC(2026, 9, day, h - 7, m);
const post = (promo: Partial<Promo>) => ({ price: 40000, promo: { kind: 'percent', value: 20, from: '10:00', to: '13:00', days: [], ...promo } as Promo });

describe('Giờ vàng', () => {
  it('giảm % làm tròn đồng, giảm tiền không xuống dưới 0', () => {
    expect(discounted(45000, { kind: 'percent', value: 15 })).toBe(38250);
    expect(discounted(10000, { kind: 'amount', value: 15000 })).toBe(0);
  });

  it('trong khung thì giảm và có mốc kết thúc; ngoài khung thì không', () => {
    const d = dealAt(post({}), vn(11, 30))!;
    expect(d.price).toBe(32000);
    expect(d.label).toBe('Giờ vàng −20%');
    expect(d.endsAt).toBe(vn(13));
    expect(dealAt(post({}), vn(13))).toBeNull();
    expect(dealAt(post({}), vn(9, 59))).toBeNull();
  });

  it('khung vắt qua nửa đêm; ngày trong tuần tính theo ngày bắt đầu khung', () => {
    const p = post({ from: '22:00', to: '02:00', days: [4] }); // chỉ thứ năm
    expect(dealAt(p, vn(23))!.endsAt).toBe(vn(2, 0, 30));
    expect(dealAt(p, vn(1, 0, 30))!.endsAt).toBe(vn(2, 0, 30)); // sáng thứ sáu vẫn thuộc khung của thứ năm
    expect(dealAt(p, vn(23, 0, 30))).toBeNull(); // tối thứ sáu: không có trong days
  });

  it('active=false thì không giảm; sắp tới trong 3 giờ', () => {
    expect(dealAt(post({ active: false }), vn(11))).toBeNull();
    expect(upcomingAt(post({}), vn(8, 30))).toEqual({ inMin: 90, from: '10:00' });
    expect(upcomingAt(post({}), vn(6))).toBeNull();
  });

  it('đếm ngược hh:mm:ss', () => {
    expect(countdown((3600 + 23 * 60 + 45) * 1000)).toBe('01:23:45');
    expect(countdown(45 * 1000)).toBe('00:45');
  });
});
