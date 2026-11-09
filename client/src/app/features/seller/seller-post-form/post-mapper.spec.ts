import { cleaningPrice, formToPostFields, jobWindows, menuOf, unpricedService } from './post-mapper';
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

  describe('dọn dẹp: mỗi dịch vụ có tùy chọn và câu hỏi riêng, mỗi đơn một dịch vụ', () => {
    const area = { name: 'Diện tích', multi: false, required: true, choices: [{ label: 'Dưới 50m²', price: 150000 }, { label: 'Trên 80m²', price: 350000 }] };
    const glass = { name: 'Số ô cửa', multi: false, required: true, choices: [{ label: 'Dưới 5 ô', price: 100000 }] };
    const pet = { type: 'choice', label: 'Nhà có nuôi thú cưng?', required: false, opts: 'Không, Có' };
    const menu = [{ name: 'Dọn nhà', options: [area], questions: [pet] }, { name: ' ', options: [], questions: [] }, { name: 'Lau kính', options: [glass], questions: [] }];
    const f = formToPostFields('service', { common: {}, spec: { preset: 'Dọn dẹp', menu, items: [{ name: 'cũ', price: 1, unit: 'giờ' }], options: [area], questions: [pet], estimate: true, repeat: true, place: 'seller', homeFee: 30000 } }, 'service');

    it('gửi danh sách dịch vụ kèm tùy chọn, câu hỏi riêng; không có tùy chọn chung hay bảng giá', () => {
      expect(f.serviceMenu?.map((m) => [m.name, m.optionGroups.map((g) => g.name), m.questions.map((q) => q.label)])).toEqual([['Dọn nhà', ['Diện tích'], ['Nhà có nuôi thú cưng?']], ['Lau kính', ['Số ô cửa'], []]]);
      expect(f.optionGroups).toEqual([]);
      expect(f.questions).toEqual([]);
      expect(f.items).toBeUndefined();
      expect(formToPostFields('service', { common: {}, spec: { preset: 'Dọn dẹp', menu, timeMode: 'datedur' } }, 'service').timeMode).toBe('slot');
      expect(f).toMatchObject({ bookOnce: true, estimate: undefined, repeat: false, priceType: 'from', deliveryFee: 0, place: { mode: 'buyer' } });
    });

    it('giá trên bài là giá thấp nhất trong các dịch vụ; dịch vụ chưa có giá thì báo tên', () => {
      expect(cleaningPrice({ menu })).toEqual({ price: 100000, from: true });
      expect(cleaningPrice({ menu: [{ name: 'A', options: [{ ...glass }], questions: [] }] })).toEqual({ price: 100000, from: false });
      expect(unpricedService({ menu: [...menu, { name: 'Hút bụi', options: [], questions: [] }] })).toBe('Hút bụi');
      expect(unpricedService({ menu })).toBeNull();
    });

    it('bản cũ lưu tên dịch vụ dạng chữ: dùng tùy chọn, câu hỏi chung cũ cho từng dịch vụ', () => {
      expect(menuOf({ menu: ['Dọn nhà', ''], options: [area], questions: [pet] })).toEqual([{ name: 'Dọn nhà', options: [area], questions: [pet] }]);
    });
  });


  describe('giao nhận: không báo giá sau, khách chọn giờ nhận hàng', () => {
    const f = formToPostFields('service', { common: {}, spec: { preset: 'Giao nhận', priceType: 'quote', inspect: 30000, estimate: true, repeat: true, timeMode: 'datedur', place: 'seller', homeFee: 20000, from: '08:00', to: '20:00', pay: ['cash'], items: [{ name: 'Lấy đồ', price: 15000, unit: 'lượt' }], options: [], questions: [{ type: 'text', label: 'Lấy ở đâu?', required: true }] } }, 'service');

    it('bỏ báo giá sau, giá ước tính, lặp hằng tuần; giờ là giờ giao hàng', () => {
      expect(f).toMatchObject({ priceType: 'fixed', inspectFee: undefined, estimate: undefined, repeat: false, timeMode: 'slot', timeLabel: 'Giờ giao hàng', place: { mode: 'ab' }, deliveryFee: 0 });
      expect(f.highlights?.slice(0, 2).map((x) => [x.label, x.value])).toEqual([['Giờ giao hàng', '08:00 – 20:00'], ['Nơi làm', 'Giao tới nhà bạn']]);
    });

    it('ô tick nhận ứng trước tiền hàng thay cho câu hỏi theo tên', () => {
      const q = (spec: Record<string, unknown>) => formToPostFields('service', { common: {}, spec: { preset: 'Giao nhận', items: [], options: [], ...spec } }, 'service').questions;
      const old = [{ type: 'choice', label: 'Cần trả tiền giùm?', required: false, opts: 'Không, Có' }];
      expect(q({ advancePay: true, questions: old })).toEqual([{ type: 'choice', label: 'Cần ứng trước tiền hàng?', required: false, opts: ['Không', 'Có'], pay: true }]);
      expect(q({ advancePay: false, questions: old })).toEqual([]);
      // mẫu khác: câu hỏi có chữ "trả tiền giùm" chỉ là câu hỏi thường
      expect(formToPostFields('service', { common: {}, spec: { preset: 'Khác', items: [], options: [], questions: old } }, 'service').questions?.[0].pay).toBeUndefined();
    });

    it('giặt sấy cũng không còn báo giá sau', () => {
      expect(formToPostFields('service', { common: {}, spec: { preset: 'Giặt sấy', priceType: 'quote', inspect: 30000, items: [{ name: 'Giặt', price: 18000, unit: 'kg' }], options: [], questions: [] } }, 'service').priceType).not.toBe('quote');
    });
  });

  describe('3 ô đầu bài của dịch vụ: giờ nhận lịch, nơi làm, thanh toán', () => {
    const svc = (spec: Record<string, unknown>) =>
      formToPostFields('service', { common: {}, spec: { items: [], options: [], questions: [], serviceArea: 'Trong khu', place: 'buyer', pay: ['cash', 'transfer'], from: '08:00', to: '18:00', ...spec } }, 'service');
    const cells = (f: ReturnType<typeof svc>) => f.highlights?.map((x) => [x.label, x.value]);

    it('mẫu thường: theo nơi làm người bán chọn', () => {
      expect(cells(svc({ preset: 'Dọn dẹp' }))).toEqual([['Giờ nhận lịch', '08:00 – 18:00'], ['Nơi làm', 'Tại nhà bạn'], ['Thanh toán', 'Tiền mặt, Chuyển khoản']]);
      expect(cells(svc({ preset: 'Gia sư', place: 'choice', pay: ['cash', 'xu'] }))?.slice(1)).toEqual([['Nơi làm', 'Tại nhà bạn hoặc bạn mang tới'], ['Thanh toán', 'Tiền mặt, AntXu']]);
      expect(cells(svc({ preset: 'Khác', place: 'seller', where: 'Tòa S2, tầng 3' }))?.[1]).toEqual(['Nơi làm', 'Tòa S2, tầng 3']);
    });

    it('giặt sấy: tiệm lấy đồ tại nhà, trả đồ và cách trả đồ xuống phần thông tin', () => {
      const f = svc({ preset: 'Giặt sấy', returnHours: 12, fulfil: { delivery: true, pickup: true, fee: 10000 } });
      expect(cells(f)).toEqual([['Giờ nhận lịch', '08:00 – 18:00'], ['Nơi làm', 'Lấy đồ tại nhà bạn'], ['Thanh toán', 'Tiền mặt, Chuyển khoản']]);
      expect(f.info).toEqual([{ label: 'Trả đồ', value: 'Trong khoảng 12 giờ' }, { label: 'Cách trả đồ', value: 'Giao tận nơi, Tự đến lấy' }]);
      expect(f).toMatchObject({ fulfillmentModes: ['delivery', 'pickup'], deliveryFee: 10000, pickupAtBuyer: true });
    });

    it('lưu trú: giờ nhận phòng, tòa nhà; trả phòng và ở tối thiểu xuống phần thông tin', () => {
      const f = svc({ preset: 'Lưu trú', place: 'seller', building: 'Tòa S2', checkIn: '14:00', checkOut: '12:00', minNights: 2, amenities: ['Wi-Fi'], rules: [] });
      expect(cells(f)?.slice(0, 2)).toEqual([['Giờ nhận lịch', 'Nhận phòng từ 14:00'], ['Nơi làm', 'Tòa S2']]);
      expect(f.info).toEqual(expect.arrayContaining([{ label: 'Trả phòng trước', value: '12:00' }, { label: 'Ở tối thiểu', value: '2 đêm' }]));
    });

    it('sửa chữa bảng giá: không có phí kiểm tra, không lấy nơi sửa và phụ phí cũ còn lưu', () => {
      const f = svc({ preset: 'Sửa chữa', priceType: 'list', inspect: 50000, place: 'seller', homeFee: 30000, turnaround: 'còn sót', warranty: 'còn sót' });
      expect(cells(f)?.[1]).toEqual(['Nơi làm', 'Tại nhà bạn']);
      expect(f.info?.map((x) => x.label)).not.toContain('Phí kiểm tra');
      expect(f).toMatchObject({ place: { mode: 'buyer' }, deliveryFee: 0, inspectFee: undefined });
      expect(f.serviceInfo).toMatchObject({ turnaround: undefined, warranty: undefined, area: undefined });
    });

    it('báo giá sau: phí kiểm tra xuống phần thông tin', () => {
      const f = svc({ preset: 'Sửa chữa', priceType: 'quote', inspect: 50000 });
      expect(f.inspectFee).toBe(50000);
      expect(f.info).toContainEqual({ label: 'Phí kiểm tra', value: '50.000đ, trừ vào tiền làm nếu bạn đồng ý giá' });
    });

    it('không mẫu nào còn phạm vi phục vụ hay lưu ý an toàn', () => {
      for (const preset of ['Giặt sấy', 'Sửa chữa', 'Dọn dẹp', 'Giao nhận', 'Chăm sóc', 'Gia sư', 'Làm đẹp', 'Lưu trú', 'Khác', 'Nấu ăn']) {
        const labels = svc({ preset, safety: true }).info?.map((x) => x.label) ?? [];
        expect(labels).not.toContain('Phạm vi phục vụ');
        expect(labels).not.toContain('Lưu ý an toàn');
      }
    });

    it('mẫu Khác: thời gian làm dự kiến và bảo hành xuống phần thông tin', () => {
      const f = svc({ preset: 'Khác', turnaround: '2 giờ', warranty: '1 tháng' });
      expect(f.info).toEqual(expect.arrayContaining([{ label: 'Thời gian làm dự kiến', value: '2 giờ' }, { label: 'Bảo hành', value: '1 tháng' }]));
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
    expect(rows({})).toEqual([{ label: 'Lưu ý cho khách', value: 'Để sẵn chỗ' }]);
    expect(rows({ preset: 'Giặt sấy', returnHours: 24, fulfil: { delivery: true, fee: 0 } })).toContainEqual({ label: 'Lưu ý cho khách', value: 'Để sẵn chỗ' });
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
