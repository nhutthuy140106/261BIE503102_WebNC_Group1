import { formatMoney, parseMoney } from './money-input';

describe('formatMoney', () => {
  it('thêm dấu chấm hàng nghìn', () => {
    expect(formatMoney(100000)).toBe('100.000');
    expect(formatMoney(1200000)).toBe('1.200.000');
    expect(formatMoney(500)).toBe('500');
    expect(formatMoney(0)).toBe('0');
  });

  it('ô trống vẫn trống', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney('')).toBe('');
  });
});

describe('parseMoney', () => {
  it('đọc lại thành số, trống là null', () => {
    expect(parseMoney('100.000')).toBe(100000);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
});
