import { formToPostFields, jobWindows } from './post-mapper';
import { toJobWindows } from './post-form-config';

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

  it('tùy chọn nhanh chỉ lấy dòng đang bật, ghi chú theo cài đặt', () => {
    const f = formToPostFields('food', { common: {}, spec: { items: [], options: [], kitchenNote: false, quick: [{ on: true, label: 'Để riêng sốt' }, { on: false, label: 'Tắt' }, { on: true, label: ' ' }] } }, 'food');
    expect(f.quickOptions).toEqual(['Để riêng sốt']);
    expect(f.noteEnabled).toBe(false);
    expect(f.template).toBeUndefined();
  });

  it('việc một ngày có giờ kết thúc thì gửi cả giờ kết thúc, không cố định giờ thì không', () => {
    const job = (spec: Record<string, unknown>) => formToPostFields('job', { common: {}, spec: { dates: ['2026-11-14'], ...spec } }, 'job').job;
    expect(job({ from: '08:30', to: '11:00' })).toMatchObject({ start: '2026-11-14T08:30:00', end: '2026-11-14T11:00:00' });
    expect(job({ from: '08:30', to: '' })?.end).toBeUndefined();
    expect(job({ allDay: true, from: '08:30', to: '11:00' })?.end).toBeUndefined();
  });

  it('việc có giờ: giờ chính đứng đầu, thêm khung khác đủ Từ và Đến, không trùng', () => {
    const w = jobWindows({ from: '08:30', to: '11:00', altWindows: [{ from: '14:00', to: '16:00' }, { from: '08:30', to: '11:00' }, { from: '17:00', to: '' }, { from: '', to: '' }] });
    expect(w).toEqual(['08:30 – 11:00', '14:00 – 16:00']);
    expect(jobWindows({ from: '08:30', to: '' })).toEqual(['08:30']);
  });

  it('việc không cố định giờ: không có khung, kể cả khi còn sót giờ trong form', () => {
    expect(jobWindows({ allDay: true, from: '08:30', to: '11:00', altWindows: [{ from: '14:00', to: '16:00' }] })).toEqual([]);
  });

  it('khung giờ gõ tay của bài cũ chuyển thành Từ, Đến', () => {
    const s = toJobWindows({ head: 1, altWindows: ['14:00 – 16:00', '8:30-11:00', 'chiều mát', { from: '17:00', to: '18:00' }] });
    expect(s['altWindows']).toEqual([{ from: '14:00', to: '16:00' }, { from: '08:30', to: '11:00' }, { from: '17:00', to: '18:00' }]);
    expect(s['head']).toBe(1);
    expect(toJobWindows({})['altWindows']).toEqual([]);
  });

  describe('mẫu ẩn mục trong form', () => {
    const svc = (spec: Record<string, unknown>) => formToPostFields('service', { common: {}, spec: { items: [], options: [], questions: [], serviceArea: 'Trong khu', place: 'buyer', safety: true, ...spec } }, 'service');

    it('giặt sấy: không gửi phạm vi phục vụ, nơi làm, lưu ý an toàn mặc định', () => {
      const f = svc({ preset: 'Giặt sấy', from: '08:00', to: '18:00', returnHours: 12, fulfil: { delivery: true, pickup: true, fee: 0 } });
      expect(f.info).toEqual([]);
      expect(f.serviceInfo?.area).toBeUndefined();
    });

    it('giặt sấy: 3 ô đầu bài lấy từ form', () => {
      const f = svc({ preset: 'Giặt sấy', from: '08:00', to: '18:00', returnHours: 12, fulfil: { delivery: true, pickup: true, fee: 10000 } });
      expect(f.highlights?.map((x) => [x.label, x.value])).toEqual([['Giờ nhận đơn', '08:00 – 18:00'], ['Trả đồ', 'Trong khoảng 12 giờ'], ['Cách trả đồ', 'Giao tận tòa, Khách tự đến lấy']]);
      expect(f.info).toEqual([{ label: 'Phí giao khi trả đồ', value: '10.000đ' }]);
    });

    it('lưu trú: 3 ô đầu bài là nhận phòng, trả phòng, ở tối thiểu', () => {
      const f = svc({ preset: 'Lưu trú', place: 'seller', checkIn: '14:00', checkOut: '12:00', minNights: 2, amenities: ['Wi-Fi'], rules: [] });
      expect(f.highlights?.map((x) => x.value)).toEqual(['Từ 14:00', 'Trước 12:00', '2 đêm']);
      expect(f.info?.map((x) => x.label)).not.toContain('Nhận phòng từ');
      expect(f.info?.map((x) => x.label)).not.toContain('Phạm vi phục vụ');
    });

    it('mẫu có đủ mục thì vẫn gửi như người bán điền', () => {
      const f = svc({ preset: 'Dọn dẹp' });
      expect(f.highlights).toBeUndefined();
      expect(f.info?.map((x) => x.label)).toEqual(['Phạm vi phục vụ', 'Lưu ý an toàn']);
    });
  });

  it('đồ dùng, dịch vụ: tắt ghi chú thì khách không ghi được, mặc định theo form', () => {
    expect(formToPostFields('goods', { common: {}, spec: { kitchenNote: false } }, 'goods').noteEnabled).toBe(false);
    expect(formToPostFields('goods', { common: {}, spec: { kitchenNote: true } }, 'goods').noteEnabled).toBe(true);
    expect(formToPostFields('service', { common: {}, spec: { kitchenNote: false, items: [], options: [], questions: [] } }, 'service').noteEnabled).toBe(false);
  });

  it('đồ uống: pha chế thành nhóm chọn một đứng trước tùy chọn, bỏ hết thì không có nhóm', () => {
    const f = formToPostFields('drink', { common: {}, spec: { items: [], options: [{ name: 'Size', multi: false, required: true, choices: [{ label: 'L', price: 6000 }] }], sweet: ['50%'], ice: [], quick: [] } }, 'food');
    expect(f.optionGroups?.map((g) => g.name)).toEqual(['Độ ngọt', 'Size']);
    expect(f.optionGroups?.[0]).toMatchObject({ required: false, choices: [{ label: '50%', price: 0 }] });
    expect(f.template).toBe('drink');
  });

  it('đồ uống: size chung cho mọi loại, đứng đầu và bắt buộc chọn', () => {
    const it2 = (name: string) => ({ name, price: 30000, unit: 'ly', options: [] });
    const f = formToPostFields('drink', { common: {}, spec: { items: [it2('Trà đào'), it2('Trà sữa')], sizes: [{ label: 'M', price: 0 }, { label: 'L', price: 6000 }, { label: ' ', price: 1 }], options: [{ name: 'Topping', multi: true, required: false, choices: [{ label: 'Thạch', price: 5000 }] }], quick: [] } }, 'food');
    expect(f.optionGroups?.map((g) => g.name)).toEqual(['Size', 'Topping']);
    expect(f.optionGroups?.[0]).toMatchObject({ required: true, choices: [{ label: 'M', price: 0 }, { label: 'L', price: 6000 }] });
    expect(f.items?.[0].optionGroups).toBeUndefined();
  });

  it('miễn phí giao chỉ khi có giao tận tòa', () => {
    const f = (delivery: boolean) => formToPostFields('food', { common: {}, spec: { items: [], options: [], quick: [], fulfil: { delivery, fee: 5000, freeFrom: 100000, pickup: true } } }, 'food');
    expect(f(true).freeShipFrom).toBe(100000);
    expect(f(false).freeShipFrom).toBeUndefined();
  });

  it('đồ dùng: gửi giờ hẹn và tình trạng chi tiết', () => {
    const f = formToPostFields('goods', { common: {}, spec: { stock: 1, condition: '90', flaw: 'Xước nhẹ', pickFrom: '17:00', pickTo: '21:00', fulfil: { pickup: true } } }, 'goods');
    expect(f.handover).toEqual({ from: '17:00', to: '21:00' });
    expect(f.info).toEqual([{ label: 'Tình trạng chi tiết', value: 'Xước nhẹ' }]);
  });

  it('dịch vụ: thông tin theo mẫu, ô trống không hiện', () => {
    const spec = { items: [], questions: [], options: [], place: 'seller', serviceArea: 'Trong khu', cancelPolicy: '', customerNote: 'Để sẵn chỗ' };
    const rows = (s: object) => formToPostFields('service', { common: {}, spec: { ...spec, ...s } }, 'service').info;
    expect(rows({})).toEqual([{ label: 'Phạm vi phục vụ', value: 'Trong khu' }, { label: 'Lưu ý cho khách', value: 'Để sẵn chỗ' }]);
    expect(rows({ preset: 'Giặt sấy', returnHours: 24, fulfil: { delivery: true, fee: 0 } })).toEqual([{ label: 'Lưu ý cho khách', value: 'Để sẵn chỗ' }]);
    expect(rows({ preset: 'Lưu trú', rules: [{ on: true, label: 'Không hút thuốc' }, { on: false, label: 'Tắt' }], minNights: 2 })).toContainEqual({ label: 'Nội quy', value: 'Không hút thuốc' });
  });

  it('việc làm: gửi cách trả công và tòa nhà, không gửi địa chỉ chính xác', () => {
    const f = formToPostFields('job', { common: {}, spec: { dates: [], pay: 200000, head: 3, payBy: 'transfer', building: 'S2', exact: '0512' } }, 'job');
    expect(f.job).toMatchObject({ head: 3, payBy: 'transfer', building: 'S2' });
    expect(f.job?.windows).toEqual([]);
    expect(JSON.stringify(f)).not.toContain('0512');
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
