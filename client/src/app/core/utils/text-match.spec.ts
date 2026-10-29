import { textMatches } from './text-match';

describe('textMatches (tìm kiếm chịu gõ sai)', () => {
  const rice = 'Cơm nhà làm, thực đơn đổi mỗi ngày — Bếp Cô Lan';
  it('"cơm trưa" ra món cơm (từ chỉ buổi không bắt buộc)', () => expect(textMatches(rice, 'cơm trưa')).toBe(true));
  it('không phân biệt dấu/hoa thường', () => expect(textMatches('Trà sữa trân châu', 'TRA SUA')).toBe(true));
  it('gõ sai nhẹ vẫn khớp', () => {
    expect(textMatches('Trà sữa trân châu', 'tra suaa')).toBe(true);
    expect(textMatches(rice, 'coom')).toBe(true);
  });
  it('mọi từ chính phải có: "trà sữa" không ra món cơm', () => expect(textMatches(rice, 'trà sữa')).toBe(false));
  it('truy vấn rỗng khớp tất cả', () => expect(textMatches(rice, '  ')).toBe(true));
});

describe('textMatches theo từ', () => {
  it('"com" không dính vào "combo"', () => expect(textMatches('Rau củ sạch theo combo', 'cơm')).toBe(false));
});
