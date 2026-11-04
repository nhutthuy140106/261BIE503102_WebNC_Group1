import type { CupDrink } from '../models/post-template';
import { buildLine, cupPrice, defaultPicks, missingGroup, putLine, togglePick } from './cup-order';

const dao: CupDrink = {
  name: 'Trà đào',
  price: 30000,
  groups: [
    { name: 'Size', req: true, choices: ['M', 'L|+6.000đ'] },
    { name: 'Độ ngọt', req: false, choices: ['30%', '70%'] },
    { name: 'Topping', multi: true, req: false, choices: ['Sương sáo|+5.000đ', 'Thạch|+7.000đ'] },
  ],
};

describe('một ly đồ uống', () => {
  it('size bắt buộc chọn sẵn mục đầu, còn lại để trống', () => {
    expect(defaultPicks(dao)).toEqual({ Size: ['M'], 'Độ ngọt': [], Topping: [] });
  });

  it('nhóm bắt buộc không bỏ chọn được, nhóm không bắt buộc bấm lại là bỏ', () => {
    let p = defaultPicks(dao);
    p = togglePick(dao, p, 'Size', 'M');
    expect(p['Size']).toEqual(['M']);
    p = togglePick(dao, p, 'Độ ngọt', '70%');
    expect(p['Độ ngọt']).toEqual(['70%']);
    p = togglePick(dao, p, 'Độ ngọt', '70%');
    expect(p['Độ ngọt']).toEqual([]);
  });

  it('nhóm bắt buộc chưa chọn thì báo tên nhóm', () => {
    const d: CupDrink = { ...dao, groups: [{ name: 'Topping', multi: true, req: true, choices: ['Thạch'] }] };
    expect(missingGroup(d, defaultPicks(d))).toBe('Topping');
    expect(missingGroup(d, { Topping: ['Thạch'] })).toBeNull();
  });

  it('giá ly = giá loại nước + size + topping', () => {
    let p = togglePick(dao, defaultPicks(dao), 'Size', 'L|+6.000đ');
    p = togglePick(dao, p, 'Topping', 'Sương sáo|+5.000đ');
    p = togglePick(dao, p, 'Topping', 'Thạch|+7.000đ');
    expect(cupPrice(dao, p)).toBe(48000);
    expect(buildLine(dao, p, 2)).toMatchObject({ drink: 'Trà đào', base: 30000, price: 48000, qty: 2, text: 'L · Sương sáo · Thạch' });
  });
});

describe('dòng trong đơn', () => {
  const m = buildLine(dao, defaultPicks(dao), 1);
  const l = buildLine(dao, togglePick(dao, defaultPicks(dao), 'Size', 'L|+6.000đ'), 1);

  it('cùng tùy chỉnh thì cộng số lượng, khác thì thành dòng mới', () => {
    const lines = putLine(putLine([], m), { ...m, qty: 2 });
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(3);
    expect(putLine(lines, l)).toHaveLength(2);
  });

  it('sửa dòng thì giữ vị trí, trùng dòng khác thì gộp lại', () => {
    const lines = putLine(putLine([], m), l);
    const edited = { ...m, text: 'XL', qty: 4 };
    expect(putLine(lines, edited, lines[0]).map((x) => x.text)).toEqual(['XL', l.text]);
    const merged = putLine(lines, { ...l, qty: 5 }, lines[0]);
    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(6);
  });
});
