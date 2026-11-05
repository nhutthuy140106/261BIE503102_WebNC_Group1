import { SelectOption } from '../../../shared/components/select/select';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { Promo, discounted, promoLabel } from '../../../core/utils/promo';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { JOB_STEP_NAMES, SELLER_KIND_ICON, SellerPost, orderStepNames } from '../../../core/models/seller';
import { AuthService } from '../../../core/services/auth';
import { SellerService } from '../../../core/services/seller';
import { formToPostFields } from './post-mapper';
import { SellerSpaceService } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';
import {
  AMENITIES, ASK_QUICK, ASK_TYPES, BLOCKS, GENERIC_PLACES, REPAIR_PLACES, CATS, DRINK_UNITS, FOOD_UNITS, GOODS_UNITS, SVC_UNITS, ymd, CONDITIONS, DAYS, FOOD_TAGS, FormType, ICE, JOB_UNITS, PRICE_TYPES, Q_TYPES, SVC_PLACES, SVC_PRESETS, SVC_TIMES, SWEET,
  choice, commonGroup, drinkGroup, foodGroup, goodsGroup, itemGroup, jobGroup, optGroup, questionGroup, quickGroup, serviceGroup, windowGroup, datesBetween, toDrinkSizes, toGenericSpec, toJobWindows, toOrderOptions,
} from './post-form-config';

/** Ngày bán: 1 ngày → dd/mm/yyyy, nhiều ngày → ngày đầu - ngày cuối */
const dmy = (k: string) => `${k.slice(8)}/${k.slice(5, 7)}/${k.slice(0, 4)}`;
const dateRange = (d: string[] | null | undefined): string => {
  const l = [...(d ?? [])].sort();
  return !l.length ? '' : l.length === 1 ? dmy(l[0]) : `${dmy(l[0])} - ${dmy(l[l.length - 1])}`;
};
type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const TYPES: { t: FormType | 'foodish'; kind: PostKind; icon: string; label: string; sub: string }[] = [
  { t: 'foodish', kind: 'food', icon: 'fork', label: 'Bán đồ ăn & uống', sub: 'Món theo phần, đồ uống theo ly' },
  { t: 'goods', kind: 'goods', icon: 'package', label: 'Bán đồ dùng', sub: 'Đồ mới hoặc đã dùng' },
  { t: 'service', kind: 'service', icon: 'wrench', label: 'Đăng dịch vụ', sub: 'Bạn làm, khách đặt lịch' },
  { t: 'job', kind: 'job', icon: 'hand', label: 'Đăng việc cần người', sub: 'Hàng xóm gửi đề nghị, bạn chọn' },
];

/**
 * Đăng / sửa bài (design/mockups/seller-post-form.html, mở rộng thành 5 form theo kế hoạch 24/10).
 * `?type=food|goods|service|job` · `/seller/posts/:id/edit`. Reactive Forms; cột phải xem trước thẻ bài + đầu trang bài như khách thấy.
 * Đăng xong: lưu vào khu Bán (SellerSpaceService) và gửi bản rút gọn sang kho bài phía Mua (SellerService.savePost) để hiện ở trang chủ.
 */
@Component({
  selector: 'app-seller-post-form',
  standalone: false,
  templateUrl: './seller-post-form.html',
  styleUrls: ['../seller-ui.css', './seller-post-form.css'],
})
export class SellerPostForm implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly seller = inject(SellerSpaceService);
  private readonly sellerApi = inject(SellerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);

  protected readonly types = TYPES;
  protected readonly days = DAYS;
  protected readonly blocks = BLOCKS;
  // ô chọn dùng app-select chung (không dùng <select> của trình duyệt)
  protected readonly foodUnits = FOOD_UNITS;
  protected readonly drinkUnits = DRINK_UNITS;
  protected readonly amenities = AMENITIES;
  protected readonly goodsUnits = GOODS_UNITS;
  protected readonly svcUnits = SVC_UNITS;
  protected readonly qTypeOpts: SelectOption[] = Q_TYPES.map(([value, label]) => ({ value, label }));
  protected readonly jobUnits = JOB_UNITS;
  protected readonly svcPlaces = SVC_PLACES;
  protected readonly repairPlaces = REPAIR_PLACES;
  protected readonly genericPlaces = GENERIC_PLACES;
  protected readonly askTypeOpts: SelectOption[] = ASK_TYPES.map(([value, label]) => ({ value, label }));
  protected readonly askQuick = ASK_QUICK;
  protected readonly svcTimes = SVC_TIMES;

  // ---- ô chọn ngày trên lịch (Ngày bán, Ngày hẹn lấy, Ngày nhận lịch, Ngày làm): chọn nhiều ngày, từ hôm nay trở đi ----
  /** đường dẫn ô ngày đang mở lịch */
  protected readonly calOpen = signal<string | null>(null);

  /** Chữ trong ô ngày: 1 ngày → dd/mm/yyyy, nhiều ngày → ngày đầu - ngày cuối */
  protected datesText(path: string, label: string): string {
    return dateRange(this.c(path).value) || 'Chọn ' + label.toLowerCase();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (this.calOpen() && !(e.target as HTMLElement).closest('.datefld')) this.calOpen.set(null);
  }

  protected readonly calMonth = signal(((d) => new Date(d.getFullYear(), d.getMonth(), 1))(new Date()));
  protected readonly calTitle = computed(() => `Tháng ${this.calMonth().getMonth() + 1}, ${this.calMonth().getFullYear()}`);
  protected readonly calCanBack = computed(() => this.calMonth() > new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  /** Ô ngày của tháng đang xem, tuần bắt đầu thứ Hai; null = ô trống đầu tháng */
  protected readonly calCells = computed(() => {
    const m = this.calMonth();
    const lead = (m.getDay() + 6) % 7;
    const n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const today = ymd(new Date());
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: n }, (_, i) => {
        const key = ymd(new Date(m.getFullYear(), m.getMonth(), i + 1));
        return { key, d: i + 1, past: key < today, today: key === today };
      }),
    ];
  });

  protected moveMonth(d: number): void {
    const m = this.calMonth();
    this.calMonth.set(new Date(m.getFullYear(), m.getMonth() + d, 1));
  }

  /** Bấm ngày ngoài khoảng đang chọn: chọn luôn các ngày ở giữa. Bấm ngày trong khoảng: bật / tắt riêng ngày đó */
  protected toggleDate(path: string, key: string): void {
    const ctrl = this.form.get(path)!;
    const cur = [...((ctrl.value as string[]) ?? [])].sort();
    const [first, last] = [cur[0], cur[cur.length - 1]];
    const add = !cur.length ? [key] : key > last ? datesBetween(last, key) : key < first ? datesBetween(key, first) : [key];
    ctrl.setValue(cur.includes(key) ? cur.filter((x) => x !== key) : [...new Set([...cur, ...add])].sort());
    ctrl.markAsDirty();
  }

  protected clearDates(path: string): void {
    this.set(path, []);
  }

  /** Mã QR nhận chuyển khoản: ảnh PNG/JPG/WebP ≤ 2MB */
  protected pickQr(input: HTMLInputElement): void {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 2 * 1024 * 1024) return this.toast.show('Chỉ nhận ảnh PNG/JPG/WebP ≤ 2MB');
    const r = new FileReader();
    r.onload = () => this.set('spec.bank.qr', r.result as string);
    r.readAsDataURL(f);
  }

  // ---- đơn vị (đồ ăn, đồ dùng, dịch vụ): chọn trong danh sách hoặc "Khác" rồi tự nhập ----
  private readonly unitOptCache = new Map<string[], SelectOption[]>();
  protected unitOpts(list: string[]): SelectOption[] {
    if (!this.unitOptCache.has(list)) this.unitOptCache.set(list, [...list.map((u) => ({ value: u, label: u })), { value: 'other', label: 'khác' }]);
    return this.unitOptCache.get(list)!;
  }

  /** giá trị ngoài danh sách = đang tự nhập */
  protected unitSel(path: string, list: string[]): string {
    const u = this.c(path).value;
    return list.includes(u) ? u : 'other';
  }

  protected pickUnit(path: string, v: string): void {
    this.set(path, v === 'other' ? '' : v);
  }
  protected readonly foodTags = FOOD_TAGS;
  protected readonly conditions = CONDITIONS;

  protected readonly sweetLevels = SWEET;
  protected readonly iceLevels = ICE;
  protected readonly priceTypes = PRICE_TYPES;
  protected readonly qTypes = Q_TYPES;
  protected readonly svcPresets = Object.keys(SVC_PRESETS);
  protected readonly maxImages = 6;

  protected readonly type = signal<FormType>('food');
  protected readonly editId = signal<string | null>(null);
  protected readonly cats = computed(() => CATS[this.type()]);
  protected readonly tried = signal(false);
  private saved = false;

  protected form: FormGroup = this.build('food');
  /** Giá trị form hiện tại (để vẽ cột xem trước) */
  protected readonly v = signal<V>(this.form.getRawValue());

  // ---------------- Giờ vàng (logic dùng lại từ core) ----------------

  protected readonly promoWeek = [{ d: 1, l: 'T2' }, { d: 2, l: 'T3' }, { d: 3, l: 'T4' }, { d: 4, l: 'T5' }, { d: 5, l: 'T6' }, { d: 6, l: 'T7' }, { d: 0, l: 'CN' }];
  /** giá dùng để xem trước / kiểm Giờ vàng: bài nhiều giá → giá rẻ nhất */
  private basePrice(): { price: number; from: boolean } {
    const s = this.v()['spec'] as V;
    if (this.type() === 'goods') return { price: +s['price'] || 0, from: false };
    const { low, from } = this.lowest(this.items(s));
    return { price: low ? +low['price'] : 0, from };
  }
  protected promoError(): string | null {
    const p = (this.v()['common'] as V)['promo'] as V;
    if (!p?.['on'] || this.type() === 'job') return null;
    const { price } = this.basePrice();
    if (!(+p['value'] > 0)) return 'Giờ vàng: nhập mức giảm lớn hơn 0.';
    if (p['kind'] === 'percent' && +p['value'] > 90) return 'Giờ vàng: giảm tối đa 90%.';
    if (p['kind'] === 'amount' && price > 0 && +p['value'] >= price) return 'Giờ vàng: số tiền giảm phải nhỏ hơn giá bán.';
    if (!p['from'] || !p['to'] || p['from'] === p['to']) return 'Giờ vàng: giờ bắt đầu và kết thúc phải khác nhau (khung có thể qua nửa đêm).';
    return null;
  }
  protected promoPreview(): { price: number; off: number; from: boolean } | null {
    const p = (this.v()['common'] as V)['promo'] as V;
    const { price, from } = this.basePrice();
    if (!p?.['on'] || !(+p['value'] > 0) || !(price > 0)) return null;
    const now = discounted(price, { kind: p['kind'], value: +p['value'] });
    return { price: now, off: price - now, from };
  }
  /** Promo gửi lên server (null = tắt) */
  private promoOf(c: V, kind: PostKind): Promo | null {
    const p = c['promo'] as V | undefined;
    if (!p?.['on'] || kind === 'job') return null;
    return { kind: p['kind'], value: +p['value'], from: p['from'], to: p['to'], days: [...((p['days'] as number[]) ?? [])].sort(), active: true };
  }

  ngOnInit(): void {
    this.seller.load().subscribe(() => {
      const id = this.route.snapshot.paramMap.get('id');
      const p = id ? this.seller.posts().find((x) => x.id === id) : undefined;
      if (p) {
        this.editId.set(p.id);
        this.setType(p.formType ?? (p.kind === 'food' ? 'food' : p.kind), false);
        this.restore(p);
      } else {
        const q = this.route.snapshot.queryParamMap.get('type');
        this.setType(q === 'goods' || q === 'service' || q === 'job' || q === 'drink' ? q : 'food', false);
      }
    });
  }

  // ---------------- dựng / đổi loại form ----------------

  private build(t: FormType, preset = 'Giặt sấy'): FormGroup {
    const spec = t === 'food' ? foodGroup(this.fb) : t === 'drink' ? drinkGroup(this.fb) : t === 'goods' ? goodsGroup(this.fb) : t === 'service' ? serviceGroup(this.fb, preset) : jobGroup(this.fb);
    const g = this.fb.group({ common: commonGroup(this.fb, t), spec });
    g.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.v.set(g.getRawValue()));
    return g;
  }

  protected setType(t: FormType, ask = true): void {
    if (this.editId() && ask) return;
    if (ask && this.form.dirty && !window.confirm('Đổi loại bài sẽ xóa nội dung đang nhập. Tiếp tục?')) return;
    const keep = this.form.get('common')?.getRawValue();
    this.type.set(t);
    this.form = this.build(t);
    // giữ ảnh, tên, mô tả, khu khi chỉ đổi Đồ ăn ↔ Đồ uống
    if (keep && (t === 'food' || t === 'drink')) this.form.get('common')?.patchValue({ ...keep, category: CATS[t][0] });
    this.v.set(this.form.getRawValue());
    this.tried.set(false);
  }

  protected readonly foodish = () => this.type() === 'food' || this.type() === 'drink';

  /** Khu hiện ở phần xem trước: bài bán ghi mọi khu đã chọn, việc làm một khu */
  protected areaText(): string {
    const c = this.v()['common'] as V;
    return this.type() !== 'job' && (c['areas'] as string[])?.length ? (c['areas'] as string[]).join(', ') : c['area'];
  }

  /** Bật / tắt một khu bán (giữ ít nhất 1 khu), `area` đi theo khu đầu tiên */
  protected toggleArea(b: string): void {
    const cur = (this.form.get('common.areas')!.value as string[]) ?? [];
    if (cur.length === 1 && cur[0] === b) return;
    this.toggleIn('common.areas', b);
    const next = this.form.get('common.areas')!.value as string[];
    this.form.get('common.area')!.setValue([...next].sort()[0]);
  }

  protected pickType(t: FormType | 'foodish'): void {
    this.setType(t === 'foodish' ? 'food' : t);
  }

  protected isOn(t: FormType | 'foodish'): boolean {
    return t === 'foodish' ? this.type() === 'food' || this.type() === 'drink' : this.type() === t;
  }

  /** Chọn loại dịch vụ: điền lại gợi ý (gói, câu hỏi, lịch, nơi làm…) nhưng giữ phần chung */
  protected applyPreset(name: string): void {
    const keep = this.form.get('common')!.getRawValue();
    this.form = this.build('service', name);
    this.form.get('common')!.patchValue({ ...keep, category: name });
    this.v.set(this.form.getRawValue());
  }

  // ---------------- tiện ích cho template ----------------

  protected c(path: string): AbstractControl {
    return this.form.get(path)!;
  }

  protected arr(path: string): FormArray {
    return this.form.get(path) as FormArray;
  }

  protected grp(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  protected bad(path: string): boolean {
    const x = this.form.get(path);
    return !!x && x.invalid && (x.touched || this.tried());
  }

  /** Bật / tắt một giá trị trong ô dạng danh sách (ngày, nhãn, mức pha…) */
  protected toggleIn(path: string, v: string | number): void {
    const ctrl = this.form.get(path) as FormControl<(string | number)[]>;
    const cur = ctrl.value ?? [];
    ctrl.setValue(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].sort((a, b) => (typeof a === 'number' ? (a as number) - (b as number) : 0)));
    ctrl.markAsDirty();
  }

  protected has(path: string, v: string | number): boolean {
    return ((this.form.get(path)?.value as (string | number)[]) ?? []).includes(v);
  }

  protected set(path: string, v: unknown): void {
    const ctrl = this.form.get(path)!;
    ctrl.setValue(v);
    ctrl.markAsDirty();
  }

  protected addWindow(): void {
    this.arr('spec.altWindows').push(windowGroup(this.fb));
  }

  protected addStr(path: string): void {
    this.arr(path).push(this.fb.control(''));
  }

  protected addChoice(path: string): void {
    this.arr(path).push(choice(this.fb));
  }

  /** thêm nhóm tùy chọn cộng giá (`spec.options`) */
  protected addOptGroup(path = 'spec.options'): void {
    this.arr(path).push(optGroup(this.fb, '', false, true));
  }

  protected addItem(): void {
    const t = this.type();
    const stay = t === 'service' && this.svcPreset().stay;
    this.arr('spec.items').push(t === 'food' ? itemGroup(this.fb, '', null, 'phần') : t === 'drink' ? itemGroup(this.fb, '', null, 'ly') : stay ? itemGroup(this.fb, '', null, 'đêm', 1, [], 2) : itemGroup(this.fb));
  }

  /** thêm dòng tick: tùy chọn nhanh (`spec.quick`) hoặc nội quy lưu trú (`spec.rules`) */
  protected addQuick(path = 'spec.quick'): void {
    this.arr(path).push(quickGroup(this.fb));
  }

  /** mẫu dịch vụ đang chọn (để ẩn mục không cần, ví dụ giặt sấy không có Thông tin nhanh / Nơi làm) */
  protected svcPreset() {
    return SVC_PRESETS[(this.v()['spec'] as V)['preset'] as string] ?? SVC_PRESETS['Khác'];
  }

  /** số thứ tự mục của form dịch vụ, bỏ qua mục bị ẩn */
  protected svcNo(key: 'quick' | 'price' | 'stay' | 'ask' | 'time' | 'recv' | 'place' | 'pay' | 'policy'): number {
    const p = this.svcPreset();
    if (p.generic) return ['price', 'time', 'place', 'ask', 'pay', 'policy'].indexOf(key) + 2;
    const keys: string[] = (['quick', 'price', 'stay', 'ask', 'time', 'recv', 'place', 'pay'] as const).filter(
      (k) => !(k === 'quick' && p.noQuick) && !(k === 'place' && p.noPlace) && !(k === 'stay' && !p.stay) && !(k === 'recv' && !p.laundry),
    );
    return keys.indexOf(key) + 2;
  }

  /** các dòng bảng giá / thực đơn đã điền đủ tên + giá */
  private items(s: V): V[] {
    return ((s['items'] as V[]) ?? []).filter((it) => String(it['name'] ?? '').trim() && +it['price'] > 0);
  }

  /** dòng rẻ nhất + có nhiều mức giá không (thẻ bài ghi "từ …") */
  private lowest(its: V[]): { low: V | null; from: boolean } {
    const low = its.length ? its.reduce((a, b) => (+b['price'] < +a['price'] ? b : a)) : null;
    return { low, from: new Set(its.map((x) => +x['price'])).size > 1 };
  }

  protected itemsOk(): boolean {
    return this.items(this.v()['spec'] as V).length > 0;
  }

  protected addQuestion(): void {
    this.arr('spec.questions').push(questionGroup(this.fb));
  }

  // ---------------- form chung (mẫu Khác): câu hỏi người bán tự tạo ----------------

  protected addAsk(q: (typeof ASK_QUICK)[number] | null = null): void {
    this.arr('spec.questions').push(questionGroup(this.fb, q ? { ...q, opts: '' } : undefined));
    this.form.markAsDirty();
  }

  /** nút thêm nhanh ẩn đi khi câu hỏi đã có */
  protected askUsed(label: string): boolean {
    return ((this.v()['spec'] as V)['questions'] as V[]).some((q) => q['label'] === label);
  }

  /** đổi kiểu trả lời: chọn một / chọn nhiều mới có danh sách lựa chọn */
  protected setAskType(q: AbstractControl, t: string): void {
    const g = q as FormGroup;
    const list = g.get('choices') as FormArray;
    const pick = t === 'choice' || t === 'multi';
    if (pick && !list.length) { list.push(choice(this.fb)); list.push(choice(this.fb)); }
    if (!pick) list.clear();
    g.get('type')!.setValue(t);
    g.markAsDirty();
  }

  /** những gì khách luôn phải điền, người bán không cần tạo */
  protected readonly askFixed = computed(() => {
    const s = this.v()['spec'] as V;
    return [
      ...(s['priceType'] === 'quote' ? [] : ['Dịch vụ và số lượng']),
      'Ngày giờ hẹn',
      ...(s['place'] === 'choice' ? ['Nơi làm', 'Địa chỉ, nếu làm tại nhà'] : s['place'] === 'buyer' ? ['Địa chỉ'] : []),
      'Cách thanh toán',
      'Ghi chú',
    ];
  });

  /** chữ mờ trong khung xem trước theo kiểu trả lời */
  protected askPh(t: string): string {
    return ({ text: 'Khách nhập chữ', long: 'Khách nhập đoạn dài', number: 'Khách nhập số', date: 'Khách chọn ngày', range: 'Khách chọn từ ngày đến ngày', photo: 'Khách thêm ảnh', address: 'Khách nhập địa chỉ' } as Record<string, string>)[t] ?? '';
  }

  protected removeAt(path: string, i: number): void {
    const a = this.arr(path);
    a.removeAt(i);
    a.markAsDirty();
  }

  // ---------------- ảnh ----------------

  protected get images(): string[] {
    return (this.c('common.images').value as string[]) ?? [];
  }

  /** PNG/JPG/WebP ≤ 2 MB, thu nhỏ còn cạnh dài 480px để lưu được trong trình duyệt */
  protected addImages(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []).slice(0, this.maxImages - this.images.length);
    input.value = '';
    for (const f of files) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 2 * 1024 * 1024) {
        this.toast.show('Chỉ nhận ảnh PNG/JPG/WebP dưới 2 MB');
        continue;
      }
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, 480 / Math.max(im.width, im.height));
          const cv = document.createElement('canvas');
          cv.width = im.width * k;
          cv.height = im.height * k;
          cv.getContext('2d')?.drawImage(im, 0, 0, cv.width, cv.height);
          this.set('common.images', [...this.images, cv.toDataURL('image/jpeg', 0.82)].slice(0, this.maxImages));
        };
        im.src = r.result as string;
      };
      r.readAsDataURL(f);
    }
  }

  protected removeImage(i: number): void {
    this.set('common.images', this.images.filter((_, k) => k !== i));
  }

  // ---------------- xem trước ----------------

  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly myName = computed(() => this.seller.shop()?.name ?? 'Gian hàng của bạn');
  protected readonly myAvatar = computed(() => this.seller.shop()?.avatar);

  protected readonly preview = computed(() => {
    const t = this.type();
    const val = this.v();
    const c = val['common'] as V;
    const s = val['spec'] as V;
    const money = (n: unknown) => (n ? `${Number(n).toLocaleString('vi-VN')}đ` : '—');
    const dateList = (d: string[]) => dateRange(d) || 'chưa chọn ngày';
    const how = (f: V) => [f['delivery'] ? `Giao tận tòa${f['fee'] ? ` · ${money(f['fee'])}` : ' miễn phí'}` : '', f['pickup'] ? 'Khách tự đến lấy' : ''].filter(Boolean).join(' hoặc ') || 'Chưa chọn hình thức nhận';
    switch (t) {
      case 'food': {
        const sc = s['schedule'] as V;
        const its = this.items(s);
        const { low, from } = this.lowest(its);
        return {
          price: low ? `${from ? 'từ ' : ''}${money(low['price'])}` : '—', unit: low?.['unit'] ?? 'phần', kind: 'Đồ ăn', action: `Đặt món · ${money(low?.['price'])}`, xu: (s['pay'] ?? []).includes('xu'),
          facts: [
            ['clock', 'Giờ nhận đặt', `${sc['orderFrom']} – ${sc['orderTo']}, ${dateList(sc['dates'])}`],
            ['pin', 'Hình thức nhận', how(s['fulfil'])],
            ['bolt', 'Thời gian chuẩn bị', `Khoảng ${sc['prep']} phút · nhận ${sc['pickFrom']} – ${sc['pickTo']}`],
            ...(its.length > 1 ? [['fork', 'Thực đơn', `${its.map((x) => x['name']).slice(0, 3).join(', ')}${its.length > 3 ? ` +${its.length - 3}` : ''}`] as [string, string, string]] : []),
          ],
          sched: this.promoText(), steps: orderStepNames('food'),
        };
      }
      case 'drink': {
        const its = this.items(s);
        const { low, from } = this.lowest(its);
        const mix = [s['sweet']?.length ? `Ngọt ${s['sweet'].join('·')}` : '', s['ice']?.length ? `${s['ice'].length} mức đá` : ''].filter(Boolean).join(' · ');
        return {
          price: low ? `${from ? 'từ ' : ''}${money(low['price'])}` : '—', unit: low?.['unit'] ?? 'ly', kind: 'Đồ uống', action: `Đặt đồ uống · ${money(low?.['price'])}`, xu: (s['pay'] ?? []).includes('xu'),
          facts: [
            ['check', 'Pha chế', mix || 'Không tùy chọn'],
            ['bolt', 'Thời gian pha', `Khoảng ${(s['schedule'] as V)['prep']} phút · ${how(s['fulfil'])}`],
            ...(its.length > 1 ? [['fork', 'Thực đơn', `${its.map((x) => x['name']).slice(0, 3).join(', ')}${its.length > 3 ? ` +${its.length - 3}` : ''}`] as [string, string, string]] : []),
          ],
          sched: this.promoText(), steps: orderStepNames('food'),
        };
      }
      case 'goods': {
        const cond = CONDITIONS.find((x) => x[0] === s['condition'])?.[1] ?? '';
        return {
          price: money(s['price']), unit: s['unit'], kind: 'Đồ dùng', action: `Mua · ${money(s['price'])}`, xu: (s['pay'] ?? []).includes('xu'),
          facts: [
            ['check', 'Tình trạng', `${cond}${String(s['flaw'] ?? '').trim() ? ' · ' + s['flaw'] : ''}`],
            ['pin', 'Hình thức nhận', how(s['fulfil'])],
            ['clock', 'Ngày đăng', 'Vừa đăng'],
          ],
          sched: this.promoText(), steps: orderStepNames('goods'),
        };
      }
      case 'service': {
        const pt = s['priceType'] as string;
        const its = this.items(s);
        const { low, from } = this.lowest(its);
        const pr = pt === 'quote' ? 'Báo giá sau' : low ? `${from ? 'từ ' : ''}${money(low['price'])}` : '—';
        const quick = !this.svcPreset().noQuick;
        if (this.svcPreset().generic) {
          const fee = +s['homeFee'] ? ` (+${money(s['homeFee'])})` : '';
          const mine = String(s['where'] ?? '').trim();
          return {
            price: pr, unit: pt === 'quote' || !low ? '' : low['unit'], kind: 'Dịch vụ', action: 'Đặt lịch', xu: (s['pay'] ?? []).includes('xu'),
            facts: [
              ['pin', 'Nơi làm', s['place'] === 'seller' ? mine || 'Tại chỗ người bán' : s['place'] === 'choice' ? `Tại nhà khách${fee} hoặc ${mine || 'tại chỗ người bán'}` : `Tại nhà khách${fee}`],
              pt === 'quote'
                ? ['receipt', 'Phí kiểm tra', `${+s['inspect'] ? money(s['inspect']) : 'Miễn phí'} · báo giá trước khi làm`]
                : ['receipt', 'Bảng giá', its.length ? `${its.map((x) => x['name']).slice(0, 3).join(', ')}${its.length > 3 ? ` +${its.length - 3}` : ''}` : 'Chưa có dịch vụ'],
              String(s['turnaround'] ?? '').trim() ? ['clock', 'Thời gian làm', s['turnaround']] : ['clock', 'Giờ nhận lịch', `${s['from']} – ${s['to']}, ${dateList(s['dates'])}`],
            ] as [string, string, string][],
            sched: this.promoText(), steps: orderStepNames('service'),
          };
        }
        if (this.svcPreset().laundry) {
          return {
            price: pr, unit: pt === 'quote' || !low ? '' : low['unit'], kind: 'Dịch vụ', action: 'Đặt lấy đồ', xu: (s['pay'] ?? []).includes('xu'),
            facts: [
              ['clock', 'Giờ nhận đơn', `${s['from']} – ${s['to']}, ${dateList(s['dates'])}`],
              ['bolt', 'Trả đồ', `Trong khoảng ${s['returnHours'] || 24} giờ${s['estimate'] ? ' · giá theo cân thực tế' : ''}`],
              ['pin', 'Hình thức nhận', how(s['fulfil'])],
            ] as [string, string, string][],
            sched: this.promoText(), steps: orderStepNames('service'),
          };
        }
        if (this.svcPreset().repair) {
          const place = REPAIR_PLACES.find((m) => m[0] === s['place'])?.[1] ?? '';
          return {
            price: pr, unit: pt === 'quote' || !low ? '' : low['unit'], kind: 'Dịch vụ', action: 'Đặt lịch sửa', xu: (s['pay'] ?? []).includes('xu'),
            facts: [
              ['pin', 'Nơi sửa', s['place'] === 'choice' ? `Thợ đến nhà${+s['homeFee'] ? ` (+${money(s['homeFee'])})` : ''} hoặc khách mang tới` : place],
              ['receipt', 'Phí kiểm tra', `${+s['inspect'] ? money(s['inspect']) : 'Miễn phí'} · báo giá trước khi sửa`],
              ['clock', 'Thời gian hoàn thành', s['turnaround'] || 'Báo sau khi kiểm tra'],
            ] as [string, string, string][],
            sched: this.promoText(), steps: orderStepNames('service'),
          };
        }
        if (this.svcPreset().stay) {
          const am = (s['amenities'] as string[]) ?? [];
          return {
            price: pr, unit: low ? low['unit'] : 'đêm', kind: 'Dịch vụ', action: 'Đặt phòng', xu: (s['pay'] ?? []).includes('xu'),
            facts: [
              ['clock', 'Nhận / trả phòng', `Nhận từ ${s['checkIn']} · trả trước ${s['checkOut']}${+s['minNights'] > 1 ? ` · ở tối thiểu ${s['minNights']} đêm` : ''}`],
              ['check', 'Tiện nghi', am.length ? `${am.slice(0, 3).join(', ')}${am.length > 3 ? ` +${am.length - 3}` : ''}` : 'Chưa chọn'],
              ['shield', 'Hủy & cọc', `${+s['freeCancelDays'] ? `Hủy miễn phí trước ${s['freeCancelDays']} ngày` : 'Không hoàn tiền khi hủy'}${+s['deposit'] ? ` · cọc ${s['deposit']}%` : ''}`],
            ] as [string, string, string][],
            sched: this.promoText(), steps: orderStepNames('service'),
          };
        }
        // 3 ô thông tin nhanh: lấy 3 ô đầu có nội dung
        const facts = ([
          ['receipt', 'Phí kiểm tra', pt === 'quote' ? `${money(s['inspect'])} · trừ vào tiền sửa` : ''],
          ['clock', 'Thời gian hoàn thành', quick ? s['turnaround'] : ''],
          ['pin', 'Phạm vi phục vụ', quick ? s['serviceArea'] : ''],
          ['shield', 'Bảo hành', quick ? s['warranty'] : ''],
          ['receipt', 'Bảng giá', pt === 'list' && its.length ? `${its.map((x) => x['name']).slice(0, 3).join(', ')}${its.length > 3 ? ` +${its.length - 3}` : ''}${s['estimate'] ? ' · giá ước tính' : ''}` : ''],
        ] as [string, string, string][]).filter((x) => String(x[2] ?? '').trim()).slice(0, 3);
        return {
          price: pr, unit: pt === 'quote' || !low ? '' : low['unit'], kind: 'Dịch vụ', action: 'Đặt lịch', xu: (s['pay'] ?? []).includes('xu'),
          facts, sched: this.promoText(), steps: orderStepNames('service'),
        };
      }
      default: {
        const day = dateRange(s['dates']).replace(' - ', ' – ') || 'chưa chọn ngày';
        // không cố định giờ: chỉ hiện ngày
        const when = s['allDay'] ? day : `${day} · ${s['from'] || '--:--'}${s['to'] ? ' – ' + s['to'] : ''}`;
        return {
          price: money(s['pay']), unit: s['payUnit'] || 'việc', kind: 'Việc làm', action: 'Đề nghị nhận việc', xu: false,
          facts: [
            ['clock', 'Thời gian làm', when],
            ['pin', 'Địa điểm', `${c['area']}${s['building'] ? ' · ' + s['building'] : ''}`],
            ['users', 'Số người cần', `${s['head'] || 1} người`],
            ['receipt', 'Thanh toán', s['payBy'] === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'],
          ],
          sched: '', steps: JOB_STEP_NAMES,
        };
      }
    }
  });

  /** "Giờ vàng −20% · 11:00 – 13:00 · T2, T3" ở đầu trang bài xem trước */
  private promoText(): string {
    const p = (this.v()['common'] as V)['promo'] as V;
    if (!p?.['on'] || !(+p['value'] > 0) || this.type() === 'job') return '';
    const days = ((p['days'] as number[]) ?? []).map((d) => this.promoWeek.find((w) => w.d === d)?.l).filter(Boolean);
    return `${promoLabel({ kind: p['kind'], value: +p['value'] })} · ${p['from']} – ${p['to']}${days.length ? ' · ' + days.join(', ') : ''}`;
  }

  // ---------------- lưu ----------------

  /** Kiểm tra thêm ngoài validator của từng ô; trả về câu báo lỗi đầu tiên */
  private extraError(): string | null {
    const t = this.type();
    const s = this.form.get('spec')!.getRawValue() as V;
    if (t !== 'job' && !this.images.length) return 'Thêm ít nhất 1 ảnh để khách tin hơn';
    if (t === 'drink' && !this.items(s).length) return 'Menu: nhập ít nhất một đồ uống có tên và giá';
    if (t === 'food' && !this.items(s).length) return 'Menu: nhập ít nhất một món có tên và giá';
    const promoErr = this.promoError();
    if (promoErr) return promoErr;
    if (t === 'service' && s['priceType'] !== 'quote' && !this.items(s).length) return 'Bảng giá: nhập ít nhất một dịch vụ có tên và giá (hoặc chọn “Báo giá sau”)';
    if (t === 'service' && this.svcPreset().stay && !String(s['building']).trim()) return 'Lưu trú: nhập tòa nhà';
    if (t === 'service' && !this.svcPreset().noPlace && (s['place'] === 'seller' || s['place'] === 'choice') && !String(s['where']).trim()) return this.svcPreset().generic ? 'Nhập địa chỉ của bạn' : 'Nhập nơi khách mang tới';
    if (t === 'service' && this.svcPreset().generic) {
      const q = ((s['questions'] as V[]) ?? []).find((x) => (x['type'] === 'choice' || x['type'] === 'multi') && !(x['choices'] as V[])?.length);
      if (q) return `Câu hỏi “${q['label']}”: thêm ít nhất một lựa chọn`;
    }
    if (t !== 'food' && t !== 'drink' && !(s['dates'] as string[])?.length) return t === 'job' ? 'Chọn ngày làm trên lịch' : 'Chọn ít nhất một ngày trên lịch';
    if (s['fulfil'] && !(s['fulfil'] as V)['delivery'] && !(s['fulfil'] as V)['pickup']) return t === 'goods' ? 'Chọn ít nhất một cách nhận hàng' : 'Chọn ít nhất một cách nhận món';
    if ((t === 'food' || t === 'drink') && !((s['schedule'] as V)['dates'] as string[])?.length) return 'Chọn ít nhất một ngày bán trên lịch';
    if (t !== 'job' && !(s['pay'] as string[])?.length) return 'Chọn ít nhất một cách nhận tiền';
    if (t !== 'job' && (s['pay'] as string[]).includes('transfer')) {
      const b = s['bank'] as V;
      if (!b['name'] || !String(b['no']).trim() || !String(b['holder']).trim()) return 'Chuyển khoản: nhập ngân hàng, số tài khoản và tên chủ tài khoản';
      if (!b['qr']) return 'Chuyển khoản: thêm ảnh mã QR';
    }
    if (t === 'job') {
      if (!s['allDay'] && !s['from']) return 'Chọn giờ bắt đầu làm';
      if (!s['allDay'] && s['to'] && s['to'] <= s['from']) return 'Giờ kết thúc phải sau giờ bắt đầu';
      if (!s['allDay'] && ((s['altWindows'] as V[]) ?? []).some((w) => (w['from'] || w['to']) && !(w['from'] && w['to'] && w['to'] > w['from']))) return 'Khung giờ khác: chọn đủ Từ, Đến và giờ kết thúc phải sau giờ bắt đầu';
      if (!String(s['building']).trim()) return 'Nhập tòa nhà';
      if (!String(s['exact']).trim()) return 'Nhập số nhà, tầng (chỉ gửi cho người được chọn)';
    }
    return null;
  }

  protected submit(draft = false): void {
    this.tried.set(true);
    this.form.markAllAsTouched();
    const err = this.form.invalid ? 'Còn ô chưa điền đúng — xem các ô viền đỏ' : this.extraError();
    if (err && !draft) {
      this.toast.show(err);
      setTimeout(() => document.querySelector('.bad, .ng-invalid.ng-touched')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      return;
    }
    const post = this.toPost(draft);
    const prevTitle = this.seller.posts().find((x) => x.id === post.id)?.title;
    this.seller.upsertPost(post);
    if (post.kind === 'job') this.saveJob(post);
    // cùng một Post sang phía Mua: đăng mới, sửa, hoặc lưu nháp (nháp = ẩn bài đã đăng, chưa đăng thì không gửi)
    this.publishToBuyers(post, draft, prevTitle);
    this.saved = true;
    this.toast.show(draft ? 'Đã lưu nháp — bài đang tạm ẩn, chưa hiện cho khách' : this.editId() ? 'Đã lưu thay đổi' : 'Đã đăng — hàng xóm trong khu thấy ngay ở “Gần bạn”');
    this.router.navigate(['/seller/posts']);
  }

  private priceOf(s: V): { price: number; unit: string; stock: number; max: number; priceFrom?: boolean } {
    switch (this.type()) {
      case 'food': {
        const its = this.items(s);
        const { low, from } = this.lowest(its);
        // món nào để trống số lượng = bán đến khi đóng bài → cả bài 99
        const total = its.some((x) => !(+x['qty'] > 0)) ? 99 : its.reduce((n, x) => n + +x['qty'], 0);
        return { price: low ? +low['price'] : 0, unit: `/ ${low?.['unit'] || 'phần'}`, priceFrom: from, stock: total, max: total || 20 };
      }
      case 'drink': {
        const its = this.items(s);
        const { low, from } = this.lowest(its);
        // món nào để trống số lượng = bán đến khi đóng bài → cả bài 99
        const total = its.some((x) => !(+x['qty'] > 0)) ? 99 : its.reduce((n, x) => n + +x['qty'], 0);
        return { price: low ? +low['price'] : 0, unit: `/ ${low?.['unit'] || 'ly'}`, priceFrom: from, stock: total, max: total || 50 };
      }
      case 'goods': return { price: +s['price'] || 0, unit: `/ ${s['unit']}`, stock: +s['stock'] || 1, max: Math.max(+s['stock'] || 1, 20) };
      case 'service': {
        const { low, from } = this.lowest(s['priceType'] === 'quote' ? [] : this.items(s));
        return { price: low ? +low['price'] : 0, unit: low?.['unit'] ? `/ ${low['unit']}` : '', priceFrom: from, stock: 1, max: 5 };
      }
      default: return { price: +s['pay'] || 0, unit: `/ ${s['payUnit'] || 'việc'}`, stock: +s['head'] || 1, max: 10 };
    }
  }

  private toPost(draft: boolean): SellerPost {
    const t = this.type();
    const raw = this.form.getRawValue() as V;
    const c = raw['common'] as V;
    const cur = this.editId() ? this.seller.posts().find((p) => p.id === this.editId()) : undefined;
    const kind: PostKind = t === 'drink' ? 'food' : t;
    const id = cur?.id ?? 'n' + Date.now();
    return {
      ...(cur ?? { views: 0, saves: 0, sold: 0 }),
      id, kind, title: String(c['title']).trim() || 'Bài nháp chưa đặt tên', image: c['images'][0], icon: c['images'][0] ? undefined : SELLER_KIND_ICON[kind],
      ...this.priceOf(raw['spec'] as V), on: draft ? false : (cur?.on ?? true), category: c['category'],
      jobId: kind === 'job' ? cur?.jobId ?? 'j-' + id : undefined, form: raw, formType: t,
    };
  }

  private saveJob(p: SellerPost): void {
    const cur = this.seller.jobs().find((x) => x.id === p.jobId);
    const s = (p.form as V)['spec'] as V;
    const c = (p.form as V)['common'] as V;
    const when = this.preview().facts[0][2];
    const mins = (t: string) => (t ? +t.slice(0, 2) * 60 + +t.slice(3) : 0);
    const dur = s['to'] && s['from'] ? mins(s['to']) - mins(s['from']) : 0;
    this.seller.upsertJob({
      id: p.jobId!, code: 'AG-J' + String(Date.now()).slice(-4), postId: p.id, title: p.title, category: c['category'], pay: p.price, unit: p.unit ?? '',
      when, day: 0, time: s['from'] || '8:00', duration: dur > 0 ? dur : 60, head: +s['head'] || 1, area: c['area'],
      exact: [s['building'], s['exact']].filter((x) => String(x ?? '').trim()).join(', '), desc: c['desc'], reqs: cur?.reqs ?? [], closed: !p.on,
    });
  }

  /**
   * Gửi Post đủ 7 khối sang kho phía Mua (formToPostFields là hàm duy nhất dựng các khối).
   * Lần đầu: nhớ `_id` bên Mua vào `buyerPostId` để sau này sửa / tạm ngưng / xóa ghi vào CÙNG một Post.
   */
  private publishToBuyers(p: SellerPost, draft: boolean, prevTitle?: string): void {
    const c = (p.form as V)['common'] as V;
    const user = this.auth.currentUser();
    if (!user) return;
    // nháp chưa đăng, hoặc bài mẫu có sẵn của khu Bán (f1, g1…) chưa có bản bên Mua: không gửi
    if (!p.buyerPostId && (draft || (this.editId() && !p.id.startsWith('n')))) return;
    const spec = (p.form as V)['spec'] as V;
    const fields = formToPostFields(this.type(), p.form as V, p.kind, p.kind === 'job' ? this.preview().facts[0][2] : '');
    const areas = p.kind !== 'job' && (c['areas'] as string[])?.length ? (c['areas'] as string[]) : [c['area'] as string];
    const body = {
      kind: p.kind, title: p.title, description: c['desc'], price: p.price, priceUnit: p.unit?.replace('/ ', ''), images: c['images'],
      // khu người bán chọn: lọc và hiện trên thẻ bài theo đúng khu này
      block: this.areaText(), areas,
      acceptsXu: p.kind !== 'job' && ((spec['pay'] as string[]) ?? []).includes('xu'),
      due: p.kind === 'job' ? this.preview().facts[0][2] : undefined,
      status: draft || !p.on ? ('closed' as const) : ('open' as const),
      promo: this.promoOf(c, p.kind),
      ...fields,
      orderWindow: fields.orderWindow ?? null,
    };
    // bài đăng từ trước khi có liên kết: ghi đè bản cũ bên Mua (cùng tên) thay vì tạo bài trùng
    const target = p.buyerPostId || !this.editId() ? of(p.buyerPostId) : this.sellerApi.myPosts().pipe(map((l) => l.find((x) => x.title === prevTitle)?._id));
    target.pipe(switchMap((id) => this.sellerApi.savePost(body, id))).subscribe({
      next: (saved) => {
        if (!p.buyerPostId) this.seller.setPost(p.id, { buyerPostId: saved._id });
      },
      error: () => undefined,
    });
  }

  // ---------------- sửa bài cũ ----------------

  /** Mở lại bài: có dữ liệu form thì dựng đúng từng ô, bài mẫu cũ thì điền những gì có */
  private restore(p: SellerPost): void {
    let spec0 = (p.form as V | undefined)?.['spec'] as V | undefined;
    // bản rất cũ có `spec.sizes` là giá tuyệt đối: đã đổi thành nhóm Size ở dưới nên không dùng làm bộ size chung
    if (p.form && p.formType === 'food' && spec0 && !spec0['items']) {
      p = { ...p, form: { ...p.form, spec: { ...spec0, items: [{ name: p.title, price: spec0['price'], unit: spec0['unit'] || 'phần', qty: spec0['dailyLimit'] ?? 20 }] } } };
    }
    if (p.form && p.formType === 'drink' && spec0 && !spec0['items']) {
      const sizes = ((spec0['sizes'] as V[]) ?? []).filter((z) => +z['price'] > 0);
      const base = sizes.length ? Math.min(...sizes.map((z) => +z['price'])) : 0;
      const options = [
        ...(sizes.length > 1 ? [{ name: 'Size', multi: false, required: true, choices: sizes.map((z) => ({ label: z['label'], price: +z['price'] - base })) }] : []),
        ...((spec0['toppings'] as V[])?.length ? [{ name: 'Topping', multi: true, required: false, choices: spec0['toppings'] }] : []),
      ];
      const { sizes: _absolute, ...rest } = spec0;
      spec0 = rest;
      p = { ...p, form: { ...p.form, spec: { ...rest, items: [{ name: p.title, price: base, unit: 'ly', qty: rest['unlimited'] ? null : rest['dailyLimit'], options }] } } };
    }
    const spec1 = (p.form as V | undefined)?.['spec'] as V | undefined;
    if (p.form && (p.formType === 'food' || p.formType === 'drink') && spec1) p = { ...p, form: { ...p.form, spec: toOrderOptions(spec1) } };
    if (p.form && p.formType === 'drink') p = { ...p, form: { ...p.form, spec: toDrinkSizes((p.form as V)['spec'] as V) } };
    if (p.form && p.formType === 'job') p = { ...p, form: { ...p.form, spec: toJobWindows((p.form as V)['spec'] as V) } };
    if (p.form) {
      let saved = p.form;
      if (this.type() === 'service') {
        this.applyPreset((saved['spec'] as V)['preset'] ?? 'Khác');
        if (this.svcPreset().generic) saved = { ...saved, spec: toGenericSpec(saved['spec'] as V) };
      }
      this.fit(this.form, saved);
      this.form.patchValue(saved);
    } else {
      this.form.get('common')!.patchValue({ title: p.title, images: p.image ? [p.image] : [], category: CATS[this.type()].includes(p.category) ? p.category : CATS[this.type()][0] });
      const spec = this.form.get('spec')!;
      if (p.kind === 'food') {
        (spec.get('items') as FormArray).at(0)?.patchValue({ name: p.title, price: p.price, unit: p.unit?.replace('/ ', '') ?? 'phần', qty: p.max });
      }
      if (p.kind === 'goods') spec.patchValue({ price: p.price, unit: p.unit?.replace('/ ', '') ?? 'cái', stock: p.stock });
      if (p.kind === 'service') (spec.get('items') as FormArray).at(0)?.patchValue({ name: p.title, price: p.price, unit: p.unit?.replace('/ ', '') ?? 'lần' });
      if (p.kind === 'job') {
        const j = this.seller.jobs().find((x) => x.id === p.jobId);
        spec.patchValue({ pay: p.price, head: p.stock, from: j?.time.padStart(5, '0') ?? '', exact: j?.exact ?? '' });
        if (j) this.form.get('common')!.patchValue({ desc: j.desc });
      }
    }
    this.form.markAsPristine();
    this.v.set(this.form.getRawValue());
  }

  /** Cho các FormArray đủ số phần tử để patchValue khớp dữ liệu đã lưu */
  private fit(ctrl: AbstractControl, val: unknown): void {
    if (ctrl instanceof FormGroup && val && typeof val === 'object') {
      for (const [k, sub] of Object.entries(val as V)) {
        const child = ctrl.get(k);
        if (child instanceof FormArray && Array.isArray(sub)) {
          child.clear();
          sub.forEach((item) => {
            const made = this.itemFor(k, item);
            child.push(made);
            this.fit(made, item);
          });
        } else if (child) this.fit(child, sub);
      }
    }
  }

  private itemFor(key: string, item: unknown): AbstractControl {
    switch (key) {
      case 'options': return optGroup(this.fb, '', false, true, []);
      case 'choices': case 'sizes': case 'toppings': case 'addons': return choice(this.fb);
      case 'questions': return questionGroup(this.fb);
      case 'items': return itemGroup(this.fb);
      case 'rules': return quickGroup(this.fb);
      case 'quick': return quickGroup(this.fb);
      case 'altWindows': return windowGroup(this.fb);
      default: return this.fb.control(typeof item === 'string' ? '' : item, key === 'notes' ? [] : [Validators.nullValidator]);
    }
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && this.form.dirty;
  }
}
