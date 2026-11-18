import { dueText } from './countdown';

describe('đếm ngược thời hạn xử lý', () => {
  const now = Date.parse('2026-11-11T10:00:00');
  const at = (min: number, sec = 0) => now + min * 60_000 + sec * 1000;

  it('dưới 1 giờ ghi kiểu đồng hồ, dưới 5 phút tô đỏ', () => {
    expect(dueText({ at: at(9, 42), mode: 'cancel' }, now)).toEqual({ text: 'Còn 9:42', hot: false });
    expect(dueText({ at: at(4, 5), mode: 'cancel' }, now)).toEqual({ text: 'Còn 4:05', hot: true });
  });

  it('lâu hơn ghi giờ, ngày', () => {
    expect(dueText({ at: at(135), mode: 'cancel' }, now).text).toBe('Còn 2 giờ 15 phút');
    expect(dueText({ at: at(27 * 60), mode: 'auto' }, now).text).toBe('Còn 1 ngày 3 giờ');
  });

  it('giờ hẹn: còn / trễ hẹn kèm chữ đứng trước', () => {
    expect(dueText({ at: at(25), mode: 'late', prefix: 'Giao lúc 10:25' }, now).text).toBe('Giao lúc 10:25 · còn 25:00');
    expect(dueText({ at: at(-12), mode: 'late', prefix: 'Giao lúc 9:48' }, now)).toEqual({ text: 'Giao lúc 9:48 · trễ hẹn 12 phút', hot: true });
  });

  it('quá hạn: nhắc hoặc đang tự xử lý', () => {
    expect(dueText({ at: at(-65), mode: 'remind' }, now).text).toBe('Quá hạn 1 giờ 5 phút');
    expect(dueText({ at: at(-1), mode: 'cancel' }, now).text).toBe('Hết hạn, đang xử lý…');
  });
});
