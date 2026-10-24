import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

/**
 * Cấu hình + dựng form cho 5 loại bài của khu Bán (kế hoạch đã duyệt 24/10):
 * Đồ ăn · Đồ uống (cùng nút "Bán đồ ăn & uống", chọn ở đầu form) · Đồ dùng · Dịch vụ (khung chung, chọn loại chỉ điền sẵn gợi ý) · Việc làm.
 * Tên trường bám mô hình 7 khối của trang chi tiết phía Mua (core/models/post-template.ts).
 */
export type FormType = 'food' | 'drink' | 'goods' | 'service' | 'job';

export const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const BLOCKS = ['Block A', 'Block B', 'Block C', 'Block D'];

export const CATS: Record<FormType, string[]> = {
  food: ['Cơm nhà làm', 'Món nước', 'Bánh & tráng miệng', 'Đồ ăn vặt', 'Đồ chay'],
  drink: ['Cà phê', 'Trà sữa', 'Trà trái cây', 'Nước ép', 'Sinh tố', 'Khác'],
  goods: ['Đồ bếp', 'Đồ gia dụng', 'Điện tử', 'Nội thất', 'Quần áo', 'Sách & học tập', 'Đồ trẻ em', 'Thể thao', 'Khác'],
  service: ['Giặt sấy', 'Sửa chữa', 'Dọn dẹp', 'Giao nhận hộ', 'Nấu ăn', 'Chăm sóc', 'Gia sư / lớp học', 'Làm đẹp', 'Khác'],
  job: ['Giao nhận', 'Mua hộ', 'Việc nhà', 'Sửa chữa nhỏ', 'Khuân vác', 'Trông trẻ / thú cưng', 'Gia sư', 'Xếp hàng giữ chỗ', 'Hỗ trợ máy tính', 'Khác'],
};

export const FOOD_TAGS = ['Cay', 'Có hải sản', 'Có đậu phộng', 'Món chay', 'Không hành'];
export const CONDITIONS: [string, string][] = [['new', 'Mới nguyên hộp'], ['likeNew', 'Như mới'], ['usedGood', 'Đã dùng – tốt'], ['usedFlaw', 'Đã dùng – có lỗi']];
export const SWEET = ['0%', '30%', '50%', '70%', '100%'];
export const ICE = ['Không đá', 'Ít đá', 'Bình thường', 'Đá để riêng'];
export const PRICE_TYPES: [string, string][] = [['fixed', 'Giá cố định'], ['unit', 'Theo đơn vị'], ['from', 'Giá “từ”'], ['quote', 'Báo giá sau']];
export const Q_TYPES: [string, string][] = [['text', 'Chữ'], ['choice', 'Chọn 1'], ['multi', 'Chọn nhiều'], ['photo', 'Ảnh']];

/** Gợi ý theo loại dịch vụ — chỉ điền sẵn, người bán sửa lại được hết */
export interface SvcPreset {
  packages: { name: string; priceType: string; price: number | null; unit: string; duration: string }[];
  inspect: number | null;
  estimate: boolean;
  qty: { on: boolean; label: string; min: number; max: number };
  schedMode: 'slot' | 'datedur' | 'weekly' | 'request';
  place: 'buyer' | 'seller' | 'pickup' | 'choice';
  questions: { type: string; label: string; required: boolean; opts: string }[];
  addons: { label: string; price: number }[];
  turnaround: string;
  tools: 'mine' | 'customer';
}
const P = (o: Partial<SvcPreset>): SvcPreset => ({
  packages: [{ name: 'Gói cơ bản', priceType: 'fixed', price: null, unit: 'lần', duration: '' }], inspect: null, estimate: false,
  qty: { on: false, label: '', min: 1, max: 1 }, schedMode: 'slot', place: 'buyer', questions: [], addons: [], turnaround: '', tools: 'mine', ...o,
});
export const SVC_PRESETS: Record<string, SvcPreset> = {
  'Giặt sấy': P({
    packages: [{ name: 'Giặt sấy gấp', priceType: 'unit', price: 18000, unit: 'kg', duration: 'Trả trong ngày' }, { name: 'Giặt hấp áo vest', priceType: 'unit', price: 60000, unit: 'bộ', duration: '2 ngày' }],
    estimate: true, qty: { on: true, label: 'Khối lượng ước tính (kg)', min: 3, max: 30 }, place: 'pickup', turnaround: 'Trả đồ sau 24 giờ',
    addons: [{ label: 'Nước xả thơm', price: 5000 }, { label: 'Gấp xếp theo bộ', price: 10000 }],
    questions: [{ type: 'text', label: 'Đồ cần lưu ý (đồ trắng, đồ dễ phai…)', required: false, opts: '' }],
  }),
  'Sửa chữa': P({
    packages: [{ name: 'Kiểm tra & báo giá', priceType: 'quote', price: null, unit: 'lần', duration: '30 phút' }], inspect: 50000, place: 'buyer', schedMode: 'slot',
    questions: [{ type: 'photo', label: 'Ảnh chỗ hỏng', required: true, opts: '' }, { type: 'choice', label: 'Thiết bị', required: true, opts: 'Máy lạnh, Máy giặt, Tủ lạnh, Khác' }],
  }),
  'Dọn dẹp': P({
    packages: [{ name: 'Dọn theo giờ', priceType: 'unit', price: 120000, unit: 'giờ', duration: 'Tối thiểu 2 giờ' }], schedMode: 'datedur', place: 'buyer',
    questions: [{ type: 'choice', label: 'Diện tích', required: true, opts: 'Dưới 40 m², 40–70 m², Trên 70 m²' }], addons: [{ label: 'Lau kính', price: 50000 }],
  }),
  'Giao nhận hộ': P({ packages: [{ name: 'Một lượt trong khu', priceType: 'fixed', price: 15000, unit: 'lượt', duration: 'Khoảng 20 phút' }], place: 'pickup', schedMode: 'request' }),
  'Nấu ăn': P({
    packages: [{ name: 'Nấu cỗ tại nhà', priceType: 'from', price: 1200000, unit: 'buổi', duration: '3–5 giờ' }], schedMode: 'datedur', place: 'buyer', tools: 'customer',
    questions: [{ type: 'text', label: 'Số người ăn', required: true, opts: '' }, { type: 'choice', label: 'Nguyên liệu', required: true, opts: 'Nhà có sẵn, Nhờ đi chợ giúp' }],
  }),
  'Chăm sóc': P({ packages: [{ name: 'Trông theo giờ', priceType: 'unit', price: 60000, unit: 'giờ', duration: '' }], schedMode: 'datedur', place: 'buyer' }),
  'Gia sư / lớp học': P({ packages: [{ name: 'Buổi học 90 phút', priceType: 'fixed', price: 150000, unit: 'buổi', duration: '90 phút' }], schedMode: 'weekly', place: 'choice' }),
  'Làm đẹp': P({ packages: [{ name: 'Cắt tóc tại nhà', priceType: 'fixed', price: 80000, unit: 'lần', duration: '45 phút' }], place: 'buyer' }),
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
    area: ['Block B'],
    desc: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    notes: strList(fb, ['']),
  });
}

/** Lịch bán đồ ăn / đồ uống */
const sellSchedule = (fb: FormBuilder, prep: number) =>
  fb.group({ mode: ['daily'], days: fb.control<number[]>([0, 1, 2, 3, 4, 5]), orderFrom: ['06:00'], orderTo: ['10:30'], prep: [prep, Validators.min(0)], pickFrom: ['11:00'], pickTo: ['13:00'], batchDate: [''] });
const fulfil = (fb: FormBuilder) => fb.group({ delivery: [true], fee: [5000, Validators.min(0)], freeFrom: [100000], pickup: [true] });

export function foodGroup(fb: FormBuilder) {
  return fb.group({
    portion: ['1 người'],
    tags: fb.control<string[]>([]),
    price: [null as number | null, [Validators.required, Validators.min(1000)]],
    unit: ['phần'],
    dailyLimit: [20, Validators.min(1)],
    minOrder: [1, Validators.min(1)],
    options: fb.array([optGroup(fb, 'Phần cơm', false, true, [['Vừa', 0], ['Nhiều cơm', 5000]]), optGroup(fb, 'Thêm', true, false, [['Thêm trứng', 5000]])]),
    spicy: [true],
    kitchenNote: [true],
    schedule: sellSchedule(fb, 30),
    fulfil: fulfil(fb),
    pay: fb.control<string[]>(['cash', 'transfer']),
    fresh: [false, Validators.requiredTrue],
  });
}

export function drinkGroup(fb: FormBuilder) {
  return fb.group({
    sizes: fb.array([choice(fb, 'M', 30000), choice(fb, 'L', 36000)]),
    defaultSize: [0],
    hotCold: [true],
    sweet: fb.control<string[]>([...SWEET]),
    ice: fb.control<string[]>([...ICE]),
    toppings: fb.array([choice(fb, 'Trân châu đen', 5000), choice(fb, 'Thạch phô mai', 8000)]),
    maxToppings: [3, Validators.min(0)],
    unlimited: [true],
    dailyLimit: [50],
    schedule: sellSchedule(fb, 10),
    fulfil: fulfil(fb),
    pay: fb.control<string[]>(['cash', 'transfer']),
  });
}

export function goodsGroup(fb: FormBuilder) {
  return fb.group({
    brand: [''],
    condition: ['usedGood'],
    flaw: [''],
    usedFor: [''],
    warranty: [''],
    accessories: [''],
    reason: [''],
    price: [null as number | null, [Validators.required, Validators.min(1000)]],
    newPrice: [null as number | null],
    unit: ['cái'],
    stock: [1, [Validators.required, Validators.min(1)]],
    days: fb.control<number[]>([0, 1, 2, 3, 4, 5, 6]),
    pickFrom: ['17:00'],
    pickTo: ['21:00'],
    tryFirst: [true],
    delivery: [false],
    fee: [10000],
    bulky: [false],
    returns: ['none'],
  });
}

export function serviceGroup(fb: FormBuilder, preset: string) {
  const p = SVC_PRESETS[preset] ?? SVC_PRESETS['Khác'];
  return fb.group({
    preset: [preset],
    doList: [''],
    dontList: [''],
    experience: [''],
    tools: [p.tools],
    packages: fb.array(p.packages.map((k) => packageGroup(fb, k))),
    inspect: [p.inspect],
    estimate: [p.estimate],
    qty: fb.group({ on: [p.qty.on], label: [p.qty.label], min: [p.qty.min], max: [p.qty.max] }),
    questions: fb.array(p.questions.map((q) => questionGroup(fb, q))),
    addons: fb.array(p.addons.map((a) => choice(fb, a.label, a.price))),
    schedMode: [p.schedMode],
    days: fb.control<number[]>([0, 1, 2, 3, 4, 5]),
    from: ['08:00'],
    to: ['18:00'],
    notice: [2, Validators.min(0)],
    perSlot: [1, Validators.min(1)],
    turnaround: [p.turnaround],
    place: [p.place],
    serviceArea: ['Block A – D'],
    warranty: [''],
    cancelHours: [6, Validators.min(0)],
    safety: [p.place === 'buyer'],
  });
}

export function packageGroup(fb: FormBuilder, k: SvcPreset['packages'][number] = { name: '', priceType: 'fixed', price: null, unit: 'lần', duration: '' }) {
  return fb.group({ name: [k.name, Validators.required], priceType: [k.priceType], price: [k.price], unit: [k.unit], duration: [k.duration] });
}

export function questionGroup(fb: FormBuilder, q: SvcPreset['questions'][number] = { type: 'text', label: '', required: false, opts: '' }) {
  return fb.group({ type: [q.type], label: [q.label, Validators.required], required: [q.required], opts: [q.opts] });
}

export function jobGroup(fb: FormBuilder) {
  return fb.group({
    checklist: strList(fb, ['']),
    doneCriteria: [''],
    timeMode: ['once'],
    date: [''],
    from: [''],
    to: [''],
    deadline: [''],
    weekDays: fb.control<number[]>([]),
    startDate: [''],
    endDate: [''],
    hours: [1, Validators.min(0.5)],
    altWindows: strList(fb, []),
    offerDate: [''],
    offerTime: [''],
    placeMode: ['one'],
    exact: [''],
    pointA: [''],
    pointB: [''],
    head: [1, [Validators.required, Validators.min(1)]],
    reqs: strList(fb, ['']),
    provide: [''],
    bring: [''],
    payType: ['fixed'],
    pay: [null as number | null, [Validators.required, Validators.min(1000)]],
    payBy: ['cash'],
    payWhen: ['done'],
    advance: [false],
    advanceAmount: [null as number | null],
    allowance: [null as number | null],
    offerQuestions: strList(fb, []),
  });
}

export const asArray = (g: FormGroup, name: string) => g.get(name) as FormArray;
export const asControl = <T>(g: FormGroup, name: string) => g.get(name) as FormControl<T>;
export { choice, optGroup };
