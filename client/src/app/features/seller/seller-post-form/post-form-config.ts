import { AREAS } from '../../../core/config/areas';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

/**
 * Cấu hình + dựng form cho 5 loại bài của khu Bán (kế hoạch đã duyệt 24/10):
 * Đồ ăn · Đồ uống (cùng nút "Bán đồ ăn & uống", chọn ở đầu form) · Đồ dùng · Dịch vụ (khung chung, chọn loại chỉ điền sẵn gợi ý) · Việc làm.
 * Đồ dùng / Dịch vụ: chỉ hỏi những gì trang chi tiết phía Mua hiện ra (mô hình 7 khối, core/models/post-template.ts):
 * giá · số lượng · thời gian · địa điểm · tùy chọn cộng giá · câu hỏi riêng · tình trạng bán + 3 ô thông tin nhanh.
 * Việc làm: theo trang chi tiết việc phía Mua (thời gian làm, địa điểm, số người cần, tiền công, thanh toán).
 */
export type FormType = 'food' | 'drink' | 'goods' | 'service' | 'job';

export const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
/** Khu của nền tảng (core/config/areas.ts) — cùng danh sách ô "Khu vực đang xem" ở header */
export const BLOCKS = AREAS.map((a) => a.name);
export const DEFAULT_AREA = 'Bcons';
/** Đơn vị bán đồ ăn; "other" = người bán tự nhập */
export const FOOD_UNITS = ['phần', 'hộp', 'suất', 'kg'];
export const DRINK_UNITS = ['ly', 'chai', 'cốc'];
export const GOODS_UNITS = ['cái', 'chiếc', 'bộ', 'đôi', 'hộp', 'kg'];
export const SVC_UNITS = ['lần', 'giờ', 'buổi', 'lượt', 'kg', 'bộ', 'cái', 'đôi', 'm²', 'đêm'];
/** Lưu trú: tiện nghi khách hay lọc trên các trang đặt phòng (Traveloka, Booking) — chọn nhiều */
export const AMENITIES = ['Wi-Fi', 'Máy lạnh', 'Nước nóng', 'Tủ lạnh', 'Bếp nấu', 'Máy giặt', 'Ti vi', 'Ban công', 'Chỗ để xe máy', 'Thang máy', 'Khăn tắm, dầu gội', 'Tự nhận phòng'];

export const CATS: Record<FormType, string[]> = {
  food: ['Cơm nhà làm', 'Món nước', 'Bánh & tráng miệng', 'Đồ ăn vặt', 'Đồ chay'],
  drink: ['Cà phê', 'Trà sữa', 'Trà trái cây', 'Nước ép', 'Sinh tố', 'Khác'],
  goods: ['Đồ bếp', 'Đồ gia dụng', 'Điện tử', 'Nội thất', 'Quần áo', 'Sách & học tập', 'Đồ trẻ em', 'Thể thao', 'Khác'],
  service: ['Giặt sấy', 'Sửa chữa', 'Dọn dẹp', 'Giao nhận hộ', 'Nấu ăn', 'Chăm sóc', 'Gia sư / lớp học', 'Làm đẹp', 'Lưu trú', 'Khác'],
  job: ['Giao nhận', 'Mua hộ', 'Việc nhà', 'Sửa chữa nhỏ', 'Khuân vác', 'Trông trẻ / thú cưng', 'Gia sư', 'Xếp hàng giữ chỗ', 'Hỗ trợ máy tính', 'Khác'],
};

export const FOOD_TAGS = ['Cay', 'Có hải sản', 'Có đậu phộng', 'Món chay', 'Không hành'];
/** Tình trạng đồ dùng theo % độ mới: [mã, nhãn (nút + thẻ bài)]; chi tiết ghi ở ô "Mô tả tình trạng" (`flaw`, không bắt buộc) */
export const CONDITIONS: [string, string][] = [
  ['100', '100% (Mới nguyên seal)'],
  ['90', '90% (Bóc seal chưa dùng)'],
  ['80', '80% (Đã dùng 1–3 lần)'],
  ['50', '50% (Đã dùng nhiều lần)'],
];
export const SWEET = ['0%', '30%', '50%', '70%', '100%'];
export const ICE = ['Không đá', 'Ít đá', 'Bình thường', 'Đá để riêng'];
/** Cách báo giá dịch vụ: bảng giá nhiều dịch vụ con (khách chọn nhiều trong một đơn) hoặc báo giá sau khi kiểm tra */
export const PRICE_TYPES: [string, string][] = [['list', 'Bảng giá'], ['quote', 'Báo giá sau']];
export const Q_TYPES: [string, string][] = [['text', 'Chữ'], ['choice', 'Chọn một'], ['multi', 'Chọn nhiều'], ['photo', 'Ảnh']];
/** Khối Địa điểm phía Mua */
export const SVC_PLACES: [string, string][] = [['buyer', 'Tại nhà khách'], ['seller', 'Khách mang tới'], ['choice', 'Khách chọn'], ['ab', 'Lấy ở A, giao tới B']];
/** Khối Thời gian phía Mua: khung giờ trong ngày, hoặc ngày + số giờ */
export const SVC_TIMES: [string, string][] = [['slot', 'Khách chọn giờ hẹn'], ['datedur', 'Khách chọn ngày + số giờ']];
/** Đơn vị tiền công việc làm; ngoài danh sách = tự nhập ("Khác") */
export const JOB_UNITS = ['việc', 'giờ', 'lượt'];

/** Gợi ý theo loại dịch vụ (lấy từ các bài mẫu phía Mua) — chỉ điền sẵn, người bán sửa lại được hết */
export interface SvcPreset {
  priceType: 'list' | 'quote';
  /** bảng giá: [tên dịch vụ con, giá, đơn vị, số lượng (lưu trú: số phòng), khách tối đa] — khách chọn một hoặc nhiều dòng */
  items: [string, number | null, string, (number | null)?, (number | null)?][];
  estimate: boolean;
  inspect: number | null;
  /** stay = lưu trú: khách chọn ngày nhận – trả phòng (tính theo đêm) */
  timeMode: 'slot' | 'datedur' | 'stay';
  dur: [number, number];
  repeat: boolean;
  place: 'buyer' | 'seller' | 'choice' | 'ab';
  homeFee: number;
  options: { name: string; choices: [string, number][]; multi?: boolean }[];
  questions: { type: string; label: string; required: boolean; opts: string }[];
  turnaround: string;
  warranty: string;
  /** mẫu không cần mục Thông tin nhanh / Nơi làm (ví dụ giặt sấy: luôn lấy & trả tận nơi) */
  noQuick?: boolean;
  noPlace?: boolean;
  /** mẫu không cần câu hỏi riêng (giặt sấy: tùy chọn cộng giá đã đủ) */
  noQuestions?: boolean;
  /** mẫu lưu trú: hiện mục "Tiện nghi & nội quy", lịch theo đêm, cột số phòng / khách tối đa */
  stay?: boolean;
}
const P = (o: Partial<SvcPreset>): SvcPreset => ({
  priceType: 'list', items: [['', null, 'lần']], estimate: false, inspect: null,
  timeMode: 'slot', dur: [2, 4], repeat: false, place: 'buyer', homeFee: 0, options: [], questions: [], turnaround: '', warranty: '', ...o,
});
export const SVC_PRESETS: Record<string, SvcPreset> = {
  'Giặt sấy': P({
    items: [['Giặt sấy quần áo', 18000, 'kg'], ['Giặt chăn, ga', 40000, 'bộ'], ['Giặt gối', 25000, 'cái'], ['Giặt thú bông', 30000, 'cái'], ['Vệ sinh giày', 60000, 'đôi']],
    estimate: true, noQuick: true, noPlace: true, noQuestions: true,
    options: [{ name: 'Nước xả', choices: [['Hương nhẹ', 0], ['Không mùi', 0]] }, { name: 'Gấp đồ', choices: [['Gấp gọn', 0], ['Treo móc', 10000]] }],
  }),
  'Sửa chữa': P({
    priceType: 'quote', items: [['Thay pin laptop', 450000, 'cái'], ['Cài lại máy', 150000, 'lần']], inspect: 50000, place: 'choice', homeFee: 30000, turnaround: '1 – 3 ngày tùy lỗi', warranty: '3 tháng cho linh kiện thay',
    questions: [
      { type: 'text', label: 'Hãng / dòng máy', required: true, opts: '' },
      { type: 'text', label: 'Máy bị sao?', required: true, opts: '' },
      { type: 'photo', label: 'Ảnh lỗi (nếu có)', required: false, opts: '' },
      { type: 'choice', label: 'Cần sao lưu dữ liệu trước?', required: false, opts: 'Không, Có' },
    ],
  }),
  'Dọn dẹp': P({
    items: [['Dọn nhà theo giờ', 120000, 'giờ'], ['Lau kính', 50000, 'lần']], timeMode: 'datedur', dur: [2, 6], repeat: true, turnaround: '2 giờ mỗi lần',
    questions: [
      { type: 'choice', label: 'Diện tích nhà', required: false, opts: 'Dưới 50m², 50 – 80m², Trên 80m²' },
      { type: 'multi', label: 'Việc cần làm', required: false, opts: 'Lau nhà, Vệ sinh bếp, Vệ sinh nhà tắm, Gấp đồ' },
      { type: 'choice', label: 'Nhà có nuôi thú cưng?', required: false, opts: 'Không, Có' },
    ],
  }),
  'Giao nhận hộ': P({
    items: [['Lấy đồ trong khu', 15000, 'lượt'], ['Đồ to, nặng từ 10kg', 25000, 'lượt']], place: 'ab', turnaround: 'Thường trong 20 phút',
    questions: [
      { type: 'text', label: 'Lấy món gì?', required: true, opts: '' },
      { type: 'choice', label: 'Kích thước', required: false, opts: 'Nhỏ dưới 10kg, To / nặng từ 10kg' },
      { type: 'choice', label: 'Cần trả tiền giùm?', required: false, opts: 'Không, Có' },
    ],
  }),
  'Nấu ăn': P({
    items: [['Nấu cỗ tại nhà', 1200000, 'buổi']], timeMode: 'datedur', dur: [3, 5],
    questions: [{ type: 'text', label: 'Số người ăn', required: true, opts: '' }, { type: 'choice', label: 'Nguyên liệu', required: true, opts: 'Nhà có sẵn, Nhờ đi chợ giúp' }],
  }),
  'Chăm sóc': P({ items: [['Trông trẻ theo giờ', 60000, 'giờ'], ['Trông thú cưng theo giờ', 40000, 'giờ']], timeMode: 'datedur', dur: [2, 6] }),
  'Gia sư / lớp học': P({ items: [['Buổi học 90 phút', 150000, 'buổi']], repeat: true, place: 'choice', turnaround: '90 phút mỗi buổi' }),
  'Làm đẹp': P({ items: [['Cắt tóc tại nhà', 80000, 'lần'], ['Gội sấy', 50000, 'lần']], turnaround: 'Khoảng 45 phút' }),
  // homestay / cho thuê phòng ngắn ngày trong khu (tham khảo Traveloka, Booking, Airbnb): loại phòng · nhận / trả phòng · tiện nghi · nội quy · hủy & cọc
  'Lưu trú': P({
    stay: true, noQuick: true, noPlace: true, timeMode: 'stay', place: 'seller',
    items: [['Phòng đơn', 350000, 'đêm', 2, 2], ['Phòng đôi', 500000, 'đêm', 1, 4], ['Nguyên căn 2 phòng ngủ', 1200000, 'đêm', 1, 6]],
    options: [{ name: 'Dịch vụ thêm', multi: true, choices: [['Thêm nệm phụ', 80000], ['Bữa sáng', 50000], ['Giặt đồ', 30000]] }],
    questions: [
      { type: 'text', label: 'Số khách (người lớn, trẻ em)', required: true, opts: '' },
      { type: 'text', label: 'Giờ đến dự kiến', required: false, opts: '' },
    ],
  }),
  Khác: P({}),
};

// ---------------- dựng form ----------------

const choice = (fb: FormBuilder, label = '', price = 0) => fb.group({ label: [label, Validators.required], price: [price, Validators.min(0)] });
const optGroup = (fb: FormBuilder, name = '', multi = false, required = true, choices: [string, number][] = [['', 0]]) =>
  fb.group({ name: [name, Validators.required], multi: [multi], required: [required], choices: fb.array(choices.map(([l, p]) => choice(fb, l, p))) });
const strList = (fb: FormBuilder, items: string[]) => fb.array(items.map((s) => fb.control(s)));

export function commonGroup(fb: FormBuilder, type: FormType) {
  return fb.group({
    images: fb.control<string[]>([]),
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
    category: [CATS[type][0]],
    area: [DEFAULT_AREA],
    /** đồ ăn & uống bán cho nhiều khu; `area` = khu đầu tiên (lưu bài, điểm tự lấy) */
    areas: fb.control<string[]>([DEFAULT_AREA]),
    desc: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    notes: strList(fb, ['']),
  });
}

/** yyyy-mm-dd theo giờ địa phương */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** 7 ngày tới (mặc định của lịch bán) */
export const nextDays = (n: number) => Array.from({ length: n }, (_, i) => ymd(new Date(Date.now() + i * 86400000)));

/** Lịch bán đồ ăn / đồ uống: chọn từng ngày bán trên lịch (`dates`, chọn nhiều) */
const sellSchedule = (fb: FormBuilder, prep: number) =>
  fb.group({ mode: ['daily'], days: fb.control<number[]>([0, 1, 2, 3, 4, 5]), dates: fb.control<string[]>(nextDays(7)), orderFrom: ['06:00'], orderTo: ['10:30'], prep: [prep, Validators.min(0)], pickFrom: ['11:00'], pickTo: ['13:00'], batchDate: [''] });

/** Thông tin nhận chuyển khoản: bắt buộc khi bật "Chuyển khoản" (kiểm tra ở extraError); `name` = mã ngân hàng (banks.ts) */
const bankGroup = (fb: FormBuilder) => fb.group({ name: [''], no: [''], holder: [''], qr: [''] });
/** Cách nhận (đồ ăn, đồ uống, đồ dùng): giao trong khu + phí / miễn phí từ, khách tự đến lấy */
const fulfil = (fb: FormBuilder, delivery = true, fee = 5000) => fb.group({ delivery: [delivery], fee: [fee, Validators.min(0)], freeFrom: [100000], pickup: [true] });

export function foodGroup(fb: FormBuilder) {
  return fb.group({
    portion: ['1 người'],
    tags: fb.control<string[]>([]),
    /** thực đơn trong bài: mỗi món một giá + đơn vị; khách đặt nhiều món trong một đơn, mỗi món một số lượng */
    items: fb.array([itemGroup(fb, '', null, 'phần', 20)]),
    minOrder: [1, Validators.min(1)],
    spicy: [false],
    kitchenNote: [true],
    /** tùy chọn nhanh người bán tự đặt (khách bật / tắt khi đặt, không tính tiền): lấy dụng cụ, để sốt riêng… */
    quick: fb.array([quickGroup(fb, 'Lấy dụng cụ ăn uống (muỗng, đũa, khăn giấy)')]),
    schedule: sellSchedule(fb, 30),
    fulfil: fulfil(fb),
    pay: fb.control<string[]>(['cash']),
    bank: bankGroup(fb),
    fresh: [false, Validators.requiredTrue],
  });
}

export function drinkGroup(fb: FormBuilder) {
  return fb.group({
    /** thực đơn đồ uống: mỗi loại nước một giá, số ly mỗi ngày (trống = không giới hạn) và tùy chọn riêng (size, topping…) */
    items: fb.array([
      itemGroup(fb, '', null, 'ly', null, [
        optGroup(fb, 'Size', false, true, [['M', 0], ['L', 6000]]),
        optGroup(fb, 'Topping', true, false, [['Trân châu đen', 5000], ['Thạch phô mai', 8000]]),
      ]),
    ]),
    /** khách gõ ghi chú cho quán khi đặt (như "ghi chú cho bếp" của đồ ăn) */
    kitchenNote: [true],
    hotCold: [true],
    sweet: fb.control<string[]>([...SWEET]),
    ice: fb.control<string[]>([...ICE]),
    quick: fb.array([quickGroup(fb, 'Lấy ống hút')]),
    schedule: sellSchedule(fb, 10),
    fulfil: fulfil(fb),
    pay: fb.control<string[]>(['cash']),
    bank: bankGroup(fb),
  });
}

/** Đồ dùng — phía Mua hiện: Tình trạng · Cách nhận · Ngày đăng, giá cố định, hẹn qua lấy (ngày + khung giờ), bán một lần / còn n cái */
export function goodsGroup(fb: FormBuilder) {
  return fb.group({
    condition: ['90'],
    flaw: [''],
    price: [null as number | null, [Validators.required, Validators.min(1000)]],
    unit: ['cái'],
    stock: [1, [Validators.required, Validators.min(1)]],
    dates: fb.control<string[]>(nextDays(7)),
    pickFrom: ['17:00'],
    pickTo: ['21:00'],
    fulfil: fulfil(fb, false, 10000),
    pay: fb.control<string[]>(['cash']),
    bank: bankGroup(fb),
  });
}

/** Dịch vụ — các khối của trang chi tiết phía Mua + 3 ô thông tin nhanh; giá là bảng nhiều dịch vụ con */
export function serviceGroup(fb: FormBuilder, preset: string) {
  const p = SVC_PRESETS[preset] ?? SVC_PRESETS['Khác'];
  return fb.group({
    preset: [preset],
    // thông tin nhanh (3 ô dưới tên bài)
    turnaround: [p.turnaround],
    serviceArea: ['Trong khu'],
    warranty: [p.warranty],
    // giá: bảng giá các dịch vụ con hoặc báo giá sau
    priceType: [p.priceType],
    items: fb.array(p.items.map(([n, pr, u, q, g]) => itemGroup(fb, n, pr, u, q ?? null, [], g ?? null))),
    estimate: [p.estimate],
    inspect: [p.inspect, Validators.min(0)],
    // khách chọn khi đặt
    options: fb.array(p.options.map((g) => optGroup(fb, g.name, !!g.multi, !g.multi, g.choices))),
    questions: fb.array(p.questions.map((q) => questionGroup(fb, q))),
    // lịch hẹn
    timeMode: [p.timeMode],
    dates: fb.control<string[]>(nextDays(7)),
    from: ['08:00'],
    to: ['18:00'],
    durMin: [p.dur[0], Validators.min(1)],
    durMax: [p.dur[1], Validators.min(1)],
    repeat: [p.repeat],
    // lưu trú: nhận / trả phòng, ở tối thiểu, tiện nghi, nội quy, hủy & cọc, địa chỉ (tòa hiện trên bài, số phòng ẩn)
    checkIn: ['14:00'],
    checkOut: ['12:00'],
    minNights: [1, Validators.min(1)],
    amenities: fb.control<string[]>(p.stay ? ['Wi-Fi', 'Máy lạnh', 'Nước nóng', 'Chỗ để xe máy'] : []),
    rules: fb.array(p.stay ? ['Không hút thuốc trong phòng', 'Không mang thú cưng', 'Giữ yên lặng sau 22:00'].map((r) => quickGroup(fb, r)) : []),
    freeCancelDays: [2, Validators.min(0)],
    deposit: [30, [Validators.min(0), Validators.max(100)]],
    idRequired: [true],
    building: [''],
    room: [''],
    // nơi làm
    place: [p.place],
    where: [''],
    homeFee: [p.homeFee, Validators.min(0)],
    safety: [p.place === 'buyer'],
    pay: fb.control<string[]>(['cash']),
    bank: bankGroup(fb),
  });
}

/** Một dòng thực đơn / bảng giá: tên, giá, đơn vị tính; đồ ăn có thêm số phần mỗi ngày + tùy chọn cộng giá riêng của món */
export function itemGroup(fb: FormBuilder, name = '', price: number | null = null, unit = 'lần', qty: number | null = null, options: FormGroup[] = [], guests: number | null = null) {
  return fb.group({ name: [name], price: [price, Validators.min(0)], unit: [unit], qty: [qty, Validators.min(0)], options: fb.array(options), guests: [guests, Validators.min(1)] });
}

/** Một tùy chọn nhanh: bật thì khách thấy dòng này để tick khi đặt */
export function quickGroup(fb: FormBuilder, label = '', on = true) {
  return fb.group({ on: [on], label: [label] });
}

export function questionGroup(fb: FormBuilder, q: SvcPreset['questions'][number] = { type: 'text', label: '', required: false, opts: '' }) {
  return fb.group({ type: [q.type], label: [q.label, Validators.required], required: [q.required], opts: [q.opts] });
}

/** Việc làm — phía Mua hiện: thời gian làm (các ngày làm + giờ / cả ngày) · khu · số người cần · tiền công · thanh toán */
export function jobGroup(fb: FormBuilder) {
  return fb.group({
    dates: fb.control<string[]>([]),
    allDay: [false],
    from: [''],
    to: [''],
    altWindows: strList(fb, []),
    /** tòa nhà: hiện trên bài; số nhà, tầng (exact) chỉ gửi cho người được chọn */
    building: [''],
    exact: [''],
    head: [1, [Validators.required, Validators.min(1)]],
    payUnit: ['việc'],
    pay: [null as number | null, [Validators.required, Validators.min(1000)]],
    payBy: ['cash'],
  });
}

export const asArray = (g: FormGroup, name: string) => g.get(name) as FormArray;
export const asControl = <T>(g: FormGroup, name: string) => g.get(name) as FormControl<T>;
export { choice, optGroup };
