import { formToPostFields } from './post-mapper';

const service = (questions: unknown[]) =>
  formToPostFields('service', { common: { category: 'Khác' }, spec: { items: [], questions, options: [], place: 'buyer' } }, 'service').questions ?? [];

describe('formToPostFields', () => {
  it('đồ uống: tùy chọn cho cả đơn nằm ở cấp bài', () => {
    const f = formToPostFields('drink', { common: {}, spec: { items: [{ name: 'Trà', price: 30000, unit: 'ly', qty: null, options: [] }], options: [{ name: 'Size', multi: false, required: true, choices: [{ label: 'L', price: 6000, qty: null }] }] } }, 'food');
    expect(f.optionGroups?.[0]).toMatchObject({ name: 'Size', choices: [{ label: 'L', price: 6000 }] });
  });

  it('tài khoản chỉ gửi khi bài nhận chuyển khoản, ngân hàng hiện tên ngắn', () => {
    const spec = (pay: string[]) => ({ common: {}, spec: { items: [], options: [], pay, bank: { name: 'VCB', no: '0123', holder: 'A', qr: 'data:x' } } });
    expect(formToPostFields('food', spec(['transfer']), 'food').bank).toEqual({ bankName: 'Vietcombank', no: '0123', holder: 'A', qr: 'data:x' });
    expect(formToPostFields('food', spec(['cash']), 'food').bank).toBeUndefined();
  });

  it('form chung: lựa chọn có giá được giữ lại', () => {
    const [q] = service([{ type: 'choice', label: 'Gói', required: true, opts: '', hint: '', choices: [{ label: 'Nhanh', price: 20000 }, { label: 'Thường', price: 0 }] }]);
    expect(q.opts).toEqual(['Nhanh|+20.000đ', 'Thường']);
  });

  it('mẫu dịch vụ khác: lựa chọn dạng chuỗi vẫn đọc được', () => {
    const [q] = service([{ type: 'choice', label: 'Có thú cưng?', opts: 'Không, Có', choices: [] }]);
    expect(q.opts).toEqual(['Không', 'Có']);
  });

  it('kiểu riêng của form chung thành ô chữ, không có ô trống phía Mua', () => {
    const [a, b] = service([{ type: 'long', label: 'Mô tả', hint: 'Nói rõ', choices: [] }, { type: 'address', label: 'Nơi lấy đồ', choices: [] }]);
    expect(a).toMatchObject({ type: 'text', long: true, hint: 'Nói rõ' });
    expect(b.type).toBe('text');
  });
});
