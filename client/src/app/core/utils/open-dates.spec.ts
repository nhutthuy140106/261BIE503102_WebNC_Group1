import { canPickDate, firstOpenDate, lastOpenDate } from './open-dates';

const dates = ['2026-11-07', '2026-11-05', '2026-11-12'];

describe('ngày khách được chọn', () => {
  it('chỉ chọn được ngày người bán đã đặt', () => {
    expect(canPickDate(dates, '2026-11-05', '2026-11-05')).toBe(true);
    expect(canPickDate(dates, '2026-11-12', '2026-11-05')).toBe(true);
    expect(canPickDate(dates, '2026-11-22', '2026-11-05')).toBe(false);
    expect(canPickDate(dates, '2026-11-06', '2026-11-05')).toBe(false);
  });

  it('ngày đã qua không chọn được, kể cả ngày người bán đã đặt', () => {
    expect(canPickDate(dates, '2026-11-05', '2026-11-06')).toBe(false);
  });

  it('bài không đặt ngày thì mở mọi ngày từ hôm nay', () => {
    expect(canPickDate([], '2026-12-30', '2026-11-05')).toBe(true);
    expect(canPickDate(undefined, '2026-11-04', '2026-11-05')).toBe(false);
  });

  it('chọn sẵn ngày gần nhất còn mở', () => {
    expect(firstOpenDate(dates, '2026-11-01')).toBe('2026-11-05');
    expect(firstOpenDate(dates, '2026-11-06')).toBe('2026-11-07');
    expect(firstOpenDate([], '2026-11-06')).toBe('2026-11-06');
  });

  it('hết ngày thì trả về rỗng', () => {
    expect(firstOpenDate(dates, '2026-11-13')).toBe('');
  });

  it('ngày cuối theo thứ tự thời gian', () => {
    expect(lastOpenDate(dates)).toBe('2026-11-12');
    expect(lastOpenDate([])).toBe('');
  });
});
