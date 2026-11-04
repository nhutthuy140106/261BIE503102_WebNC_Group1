import { FormBuilder } from '@angular/forms';
import { datesBetween, drinkGroup, toGenericSpec, toOrderOptions } from './post-form-config';

describe('toGenericSpec', () => {
  it('chuyển lựa chọn dạng chuỗi thành danh sách lựa chọn', () => {
    const s = toGenericSpec({ questions: [{ type: 'choice', label: 'Có thú cưng?', required: false, opts: 'Không, Có' }] });
    expect(s['questions'][0].choices).toEqual([{ label: 'Không', price: 0 }, { label: 'Có', price: 0 }]);
  });

  it('giữ nguyên câu hỏi đã có danh sách lựa chọn', () => {
    const choices = [{ label: 'Nhanh', price: 20000 }];
    const s = toGenericSpec({ questions: [{ type: 'multi', label: 'Gói', opts: '', choices }] });
    expect(s['questions'][0].choices).toEqual(choices);
  });

  it('chuyển nhóm tùy chọn cộng giá thành câu hỏi, giữ giá', () => {
    const s = toGenericSpec({ questions: [], options: [{ name: 'Gấp đồ', multi: false, required: true, choices: [{ label: 'Treo móc', price: 10000 }] }] });
    expect(s['options']).toEqual([]);
    expect(s['questions'][0]).toMatchObject({ type: 'choice', label: 'Gấp đồ', required: true, choices: [{ label: 'Treo móc', price: 10000 }] });
  });

  it('kiểu lấy ở A giao tới B không còn trong form chung, đổi về tại nhà khách', () => {
    expect(toGenericSpec({ place: 'ab' })['place']).toBe('buyer');
    expect(toGenericSpec({ place: 'seller' })['place']).toBe('seller');
  });
});

describe('toOrderOptions', () => {
  it('gom tùy chọn của từng món ra cả đơn, nhóm trùng tên chỉ giữ một', () => {
    const g = (name: string) => ({ name, choices: [{ label: 'A', price: 1000 }] });
    const s = toOrderOptions({ items: [{ name: 'Xôi', options: [g('Topping')] }, { name: 'Bún', options: [g('Topping'), g('Cỡ')] }] });
    expect(s['options'].map((x: { name: string }) => x.name)).toEqual(['Topping', 'Cỡ']);
    expect(s['items'].every((x: { options: unknown[] }) => x.options.length === 0)).toBe(true);
  });
});

describe('drinkGroup', () => {
  it('tùy chọn cộng giá nằm ở cả đơn, loại nước không có tùy chọn riêng', () => {
    const v = drinkGroup(new FormBuilder()).getRawValue();
    expect(v.options).toEqual([]);
    expect(v.items[0].options).toEqual([]);
  });
});

describe('datesBetween', () => {
  it('tính cả hai đầu và qua được tháng mới', () => {
    expect(datesBetween('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
  });
});
