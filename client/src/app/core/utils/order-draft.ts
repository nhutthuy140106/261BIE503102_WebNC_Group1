import { computed, signal } from '@angular/core';
import { CupLine, PostTemplate } from '../models/post-template';
import type { Voucher } from '../services/xu';
import { Promo, discounted } from './promo';

/** "Nhiều cơm|+5.000đ" → { name, add } */
export function parseChoice(raw: string): { name: string; add: number } {
  const [name, tail] = raw.split('|');
  const m = tail?.match(/\+([\d.]+)đ/);
  return { name, add: m ? Number(m[1].replace(/\./g, '')) : 0 };
}

export type PayMethod = 'cash' | 'transfer';

/**
 * Trạng thái "đang chọn" của một đơn — dùng chung cho khung đặt (bước 1) và hộp Xác nhận (bước 2).
 * Tiền tính từ trạng thái này (không đọc lại giao diện); server tính lại khi tạo đơn.
 */
export class OrderDraft {
  readonly qty = signal(1);
  /** Nhóm tùy chọn (chọn 1): tên nhóm → lựa chọn thô ("Tên|+5.000đ"); mặc định chọn mục đầu */
  readonly opt = signal<Record<string, string>>({});
  /** Dọn dẹp: dịch vụ khách đã chọn; chưa chọn thì chỉ hiện tên các dịch vụ */
  readonly service = signal('');
  readonly menuItem = computed(() => this.tpl.menu?.find((m) => m.name === this.service()) ?? null);
  /** Nhóm tùy chọn, câu hỏi đang dùng: của bài và của dịch vụ đang chọn */
  readonly opts = computed(() => [...this.tpl.opts, ...(this.menuItem()?.opts ?? [])]);
  readonly qs = computed(() => [...this.tpl.qs, ...(this.menuItem()?.qs ?? [])]);
  /** Câu hỏi riêng: nhãn → chữ / lựa chọn thô / nhiều lựa chọn thô nối bằng "|||" */
  readonly ans = signal<Record<string, string>>({});
  /** Đồ ăn: nhóm đầu tiên là danh sách MÓN, mỗi món có số lượng riêng (0 = không lấy). Tên món → số lượng. */
  readonly dishes = signal<Record<string, number>>({});
  readonly place = signal(0);
  readonly date = signal('');
  readonly time = signal('');
  readonly hours = signal(2);
  readonly repeat = signal(false);
  readonly note = signal('');
  readonly utensils = signal(true);
  /** Đồ uống đặt theo từng dòng */
  readonly cups = signal<CupLine[]>([]);
  readonly totalCups = computed(() => this.cups().reduce((n, c) => n + c.qty, 0));
  /** Tùy chọn nhanh khách đã tick */
  readonly quickPicks = signal<string[]>([]);
  readonly pay = signal<PayMethod>('cash');
  readonly addressId = signal('');
  readonly voucher = signal<Voucher | null>(null);
  /** Số tiền người làm ứng trước, người mua trả lại khi nhận (câu hỏi "Cần trả tiền giùm?" = Có) */
  readonly payBack = signal('');

  constructor(readonly tpl: PostTemplate, private readonly stock: number | null = null) {
    this.qty.set(tpl.qty?.min ?? 1);
    if (tpl.pays?.length) this.pay.set(tpl.pays[0]);
    const o: Record<string, string> = {};
    // chọn 1 bắt buộc → mặc định mục đầu; không bắt buộc → chưa chọn. Nhóm chọn nhiều không có mặc định (số lượng ở `extras`).
    for (const g of tpl.opts) if (!g.multi) o[g.name] = g.req === false ? '' : g.choices[0];
    for (const [dish, groups] of Object.entries(tpl.dishOpts ?? {})) for (const g of groups) if (!g.multi) o[this.k(dish, g.name)] = g.req === false ? '' : g.choices[0];
    this.opt.set(o);
    // chọn sẵn món đầu tiên còn hàng
    const firstDish = this.dishGroup?.choices.find((c) => (tpl.dishLeft?.[c] ?? 1) > 0);
    if (firstDish) this.dishes.set({ [firstDish]: tpl.qty?.min ?? 1 });
    this.hours.set(tpl.time.dur?.[0] ?? 2);
    this.time.set(tpl.time.win[0]);
  }

  /** Nhóm "món" (chỉ đồ ăn): chọn nhiều món, mỗi món một số lượng */
  get dishGroup(): PostTemplate['opts'][number] | null {
    return this.tpl.dishList && this.tpl.opts.length ? this.tpl.opts[0] : null;
  }

  /** Các món đã chọn (số lượng > 0) */
  readonly dishRows = computed(() => {
    const g = this.dishGroup;
    if (!g) return [] as { raw: string; name: string; qty: number; add: number }[];
    return g.choices.map((raw) => ({ raw, ...parseChoice(raw), qty: this.dishes()[raw] ?? 0 })).filter((r) => r.qty > 0).map((r) => ({ raw: r.raw, name: r.name, qty: r.qty, add: r.add }));
  });

  /** Tổng số phần = tổng số lượng các món (đồ ăn); các loại khác dùng `qty` */
  readonly totalDishes = computed(() => this.dishRows().reduce((s, r) => s + r.qty, 0));

  dishQty(raw: string): number {
    return this.dishes()[raw] ?? 0;
  }

  /** Tick một món = lấy 1 phần; bỏ tick = không lấy (nếu còn chỗ trong giới hạn) */
  toggleDish(raw: string): void {
    this.setDish(raw, this.dishQty(raw) > 0 ? 0 : 1);
  }

  /** Tăng / giảm số lượng một món; tổng không vượt giới hạn của bài */
  setDish(raw: string, n: number): void {
    const others = this.totalDishes() - this.dishQty(raw);
    const q = Math.max(0, Math.min(n, this.maxQty() - others, this.tpl.dishLeft?.[raw] ?? Infinity));
    this.dishes.update((d) => ({ ...d, [raw]: q }));
    this.qty.set(Math.max(this.totalDishes(), 0));
  }

  readonly maxQty = computed(() => Math.min(this.tpl.cups ? 99 : this.tpl.qty?.max ?? 1, this.stock ?? Infinity));

  /** Giá chính (chưa gồm tùy chọn) */
  /** Nhân giá chính với: tổng số món (danh sách món) · số giờ (đặt theo giờ) · số lượng · 1 */
  private mult(): number {
    if (this.dishGroup) return this.qty();
    return this.tpl.time.mode === 'datedur' ? this.hours() : this.tpl.qty ? this.qty() : 1;
  }

  readonly unit = computed(() => {
    const p = this.tpl.price;
    if (p.type === 'quote' || this.tpl.priceInOpts) return 0;
    if (this.tpl.cups) return this.cups().reduce((n, c) => n + c.base * c.qty, 0);
    return (p.amount ?? 0) * this.mult();
  });

  /** Tùy chọn CHỌN 1 dùng chung của cả đơn: phụ giá mỗi phần */
  readonly optAdd = computed(() =>
    this.opts().reduce((s, g) => s + (g === this.dishGroup || g.multi ? 0 : parseChoice(this.opt()[g.name] ?? '').add), 0),
  );
  /** Món thêm (chọn nhiều, có số lượng) dùng chung cho cả đơn: giá × số lượng từng thứ, KHÔNG nhân với số phần */
  readonly sharedExtras = computed(() =>
    this.opts().reduce((s, g) => (g === this.dishGroup || !g.multi ? s : s + this.extrasTotal('', g)), 0),
  );
  /** Tùy chọn riêng của các món đã chọn: chọn 1 nhân số phần của món đó; món thêm tính theo số lượng từng thứ */
  readonly dishOptTotal = computed(() =>
    this.dishRows().reduce(
      (s, r) => s + (this.tpl.dishOpts?.[r.raw] ?? []).reduce((t, g) => t + (g.multi ? this.extrasTotal(r.raw, g) : parseChoice(this.opt()[this.k(r.raw, g.name)] ?? '').add * r.qty), 0),
      0,
    ),
  );
  readonly qsAdd = computed(() =>
    this.qs().reduce((s, q) => {
      if (q.type === 'choice') return s + parseChoice(this.ans()[q.label] ?? '').add;
      if (q.type === 'multi') return s + this.picks(q.label).reduce((a, x) => a + parseChoice(x).add, 0);
      return s;
    }, 0),
  );

  /** Phụ giá của tùy chọn/câu hỏi: nhân theo số phần; dịch vụ thì tính một lần cho cả đơn */
  readonly extra = computed(() => this.tpl.cups ? this.cups().reduce((n, c) => n + (c.price - c.base) * c.qty, 0) : (this.optAdd() + this.qsAdd()) * (this.tpl.qty && !this.tpl.optsOnce ? this.qty() : 1) + this.dishRows().reduce((s, r) => s + r.add * r.qty, 0) + this.sharedExtras() + this.dishOptTotal());
  /** Giờ vàng đang áp (null khi hết giờ / không có) — do trang chi tiết cập nhật theo đồng hồ */
  readonly promo = signal<Promo | null>(null);
  /** Số tiền được giảm nhờ Giờ vàng: chỉ giảm giá chính (không giảm tùy chọn cộng giá), nhân theo số lượng/giờ */
  readonly promoOff = computed(() => {
    const p = this.promo();
    const price = this.tpl.price;
    if (!p || price.type === 'quote' || this.tpl.priceInOpts) return 0;
    if (this.tpl.cups) return this.cups().reduce((n, c) => n + (c.base - discounted(c.base, p)) * c.qty, 0);
    return ((price.amount ?? 0) - discounted(price.amount ?? 0, p)) * this.mult();
  });
  /** Thành tiền trước khi trừ Giờ vàng và voucher */
  readonly gross = computed(() => (this.tpl.price.type === 'quote' ? this.tpl.price.inspect ?? 0 : this.unit() + this.extra()));
  /** Đơn đạt mức miễn phí giao người bán đã đặt */
  readonly freeShip = computed(() => !!this.tpl.freeShipFrom && this.subtotal() >= this.tpl.freeShipFrom);
  /** Sau Giờ vàng; voucher Xu tính trên số này (voucher tính SAU) */
  readonly subtotal = computed(() => Math.max(0, this.gross() - this.promoOff()));
  readonly placeFee = computed(() => {
    const pl = this.tpl.place;
    if (pl.mode === 'choice') {
      const fee = pl.choices?.[this.place()]?.[1] ?? 0;
      return this.freeShip() ? 0 : fee;
    }
    return pl.mode === 'buyer' || pl.mode === 'ab' ? pl.fee ?? 0 : 0;
  });
  /** Cách nhận có phụ phí (giao tận cửa / thợ đến nhà): làm hoặc giao tới tận nơi khách */
  readonly toBuyer = computed(() => {
    const m = this.tpl.place.mode;
    // cách nhận tên "Giao…" luôn cần địa chỉ, kể cả khi người bán miễn phí giao
    const delivers = /^(giao|đến nhà)/i.test(this.tpl.place.choices?.[this.place()]?.[0] ?? '');
    return m === 'buyer' || m === 'ab' || (m === 'choice' && (this.placeFee() > 0 || delivers));
  });
  /** Cần địa chỉ khách: giao tới nơi, hoặc người làm qua nhà lấy đồ (giặt sấy) dù khách tự đến nhận lại */
  readonly needsAddress = computed(() => this.toBuyer() || !!this.tpl.place.alwaysAddress);
  readonly discount = computed(() => {
    const v = this.voucher();
    if (!v) return 0;
    if (v.ship) return this.needsAddress() ? this.placeFee() : 0;
    return v.amount && this.subtotal() >= v.min ? v.amount : 0;
  });
  readonly grand = computed(() => Math.max(0, this.subtotal() + this.placeFee() - this.discount()));

  /** Khóa trạng thái của một nhóm: nhóm dùng chung lấy tên nhóm; nhóm riêng của món thêm tên món phía trước */
  k(scope: string, group: string): string {
    return scope ? scope + '::' + group : group;
  }

  /** Chọn 1 (scope = '' cho nhóm dùng chung, hoặc lựa chọn thô của món). Bấm lại mục đang chọn của nhóm không bắt buộc thì bỏ chọn. */
  setOpt(group: string, raw: string, scope = ''): void {
    const g = (scope ? this.tpl.dishOpts?.[scope] : this.opts())?.find((x) => x.name === group);
    const key = this.k(scope, group);
    const off = g?.req === false && this.opt()[key] === raw;
    this.opt.update((o) => ({ ...o, [key]: off ? '' : raw }));
  }

  isOpt(scope: string, group: string, raw: string): boolean {
    return this.opt()[this.k(scope, group)] === raw;
  }

  /** Món thêm (nhóm chọn nhiều): số lượng từng thứ, khóa "nhóm::lựa chọn" */
  readonly extras = signal<Record<string, number>>({});

  extraQty(scope: string, group: string, raw: string): number {
    return this.extras()[this.k(scope, group) + '::' + raw] ?? 0;
  }

  setExtra(scope: string, group: string, raw: string, n: number): void {
    const key = this.k(scope, group) + '::' + raw;
    this.extras.update((e) => ({ ...e, [key]: Math.max(0, Math.min(10, n)) }));
  }

  toggleExtra(scope: string, group: string, raw: string): void {
    this.setExtra(scope, group, raw, this.extraQty(scope, group, raw) > 0 ? 0 : 1);
  }

  private extrasTotal(scope: string, g: { name: string; choices: string[] }): number {
    return g.choices.reduce((s, raw) => s + parseChoice(raw).add * this.extraQty(scope, g.name, raw), 0);
  }

  /** Các lựa chọn đã chọn của một nhóm, dạng chữ: "Bò ×2", "Dưa" (số lượng 1 không ghi) */
  chosen(scope: string, g: { name: string; multi?: boolean; choices: string[] }): string[] {
    if (g.multi) {
      return g.choices.filter((raw) => this.extraQty(scope, g.name, raw) > 0).map((raw) => {
        const n = this.extraQty(scope, g.name, raw);
        return parseChoice(raw).name + (n > 1 ? ' ×' + n : '');
      });
    }
    const v = this.opt()[this.k(scope, g.name)] ?? '';
    return v ? [parseChoice(v).name] : [];
  }

  /** Lựa chọn để hiện cho khách, luôn ghi số lượng khi có tính tiền: "Thêm chả x 1". Chọn một có phụ giá thì nhân theo số phần */
  private chosenText(scope: string, g: { name: string; multi?: boolean; choices: string[] }, portions: number): string[] {
    // dịch vụ: tùy chọn chung cho cả đơn, khách không chọn số lượng nên không ghi "x n"
    const once = !!this.tpl.optsOnce;
    if (g.multi) return g.choices.filter((raw) => this.extraQty(scope, g.name, raw) > 0).map((raw) => parseChoice(raw).name + (once ? '' : ' x ' + this.extraQty(scope, g.name, raw)));
    const c = parseChoice(this.opt()[this.k(scope, g.name)] ?? '');
    return c.name ? [c.add > 0 && !once ? c.name + ' x ' + portions : c.name] : [];
  }

  /** Tùy chọn riêng của từng món đã chọn, để ghi vào đơn: "Cơm rang – Đồ ăn thêm" → ["Bò ×2"] */
  dishOptSelections(): { group: string; choices: string[] }[] {
    return this.dishRows().flatMap((r) => (this.tpl.dishOpts?.[r.raw] ?? []).map((g) => ({ group: r.name + ' – ' + g.name, choices: this.chosen(r.raw, g) })).filter((x) => x.choices.length));
  }

  /** Chọn dịch vụ: lựa chọn và câu trả lời của dịch vụ trước bỏ đi, nhóm chọn một bắt buộc chọn sẵn mục đầu */
  setService(name: string): void {
    if (this.service() === name) return;
    this.service.set(name);
    const o: Record<string, string> = {};
    for (const g of this.tpl.opts) if (!g.multi) o[g.name] = this.opt()[g.name] ?? '';
    for (const g of this.menuItem()?.opts ?? []) if (!g.multi) o[g.name] = g.req === false ? '' : g.choices[0];
    this.opt.set(o);
    this.extras.set({});
    this.ans.set({});
  }

  setAns(label: string, v: string): void {
    this.ans.update((a) => ({ ...a, [label]: v }));
  }

  togglePick(label: string, raw: string): void {
    const cur = this.picks(label);
    const next = cur.includes(raw) ? cur.filter((x) => x !== raw) : [...cur, raw];
    this.ans.update((a) => ({ ...a, [label]: next.join('|||') }));
  }

  picks(label: string): string[] {
    return (this.ans()[label] ?? '').split('|||').filter(Boolean);
  }

  /** Các lựa chọn đã chọn, dạng "Nhóm: lựa chọn" để hiện trong hộp xác nhận và ghi vào đơn */
  /** Combo: các món trong một combo (hiện thành dòng "Gồm: …" ở hộp xác nhận và ghi vào đơn) */
  readonly comboItems = signal<string[]>([]);
  readonly lines = computed(() => {
    const out: string[] = this.comboItems().length ? ['Gồm: ' + this.comboItems().join(', ')] : [];
    if (this.service()) out.push('Dịch vụ: ' + this.service());
    for (const g of this.opts()) {
      if (g === this.dishGroup) continue;
      const v = this.chosenText('', g, this.dishGroup ? this.totalDishes() : this.qty());
      if (!v.length) continue;
      // Lựa chọn mặc định (không tính thêm tiền, trong khi nhóm có lựa chọn nâng cấp trả thêm) không cần ghi vào đơn
      const isBase = !g.multi && parseChoice(this.opt()[g.name] ?? '').add === 0 && g.choices.some((x) => parseChoice(x).add > 0);
      if (!isBase) out.push(g.name + ': ' + v.join(', '));
    }
    for (const r of this.dishRows()) {
      for (const g of this.tpl.dishOpts?.[r.raw] ?? []) {
        const v = this.chosenText(r.raw, g, r.qty);
        if (v.length) out.push(r.name + ' – ' + g.name + ': ' + v.join(', '));
      }
    }
    if (this.quickPicks().length) out.push('Tùy chọn thêm: ' + this.quickPicks().join(', '));
    for (const q of this.qs()) {
      const a = this.ans()[q.label] ?? '';
      const v = q.type === 'multi' ? this.picks(q.label).map((x) => parseChoice(x).name).join(', ') : q.type === 'choice' ? parseChoice(a).name : q.type === 'photo' && a ? 'Đã gửi ảnh' : a;
      if (v) out.push(q.label + ': ' + v);
    }
    if (this.paying() && this.payBack()) out.push('Số tiền cần trả giùm: ' + Number(this.payBack()).toLocaleString('vi-VN') + 'đ');
    return out;
  });

  toggleQuick(label: string, on: boolean): void {
    this.quickPicks.update((l) => (on ? [...l, label] : l.filter((x) => x !== label)));
  }

  /** Đã chọn "Có" ở câu hỏi trả tiền giùm */
  paying(): boolean {
    return this.qs().some((q) => q.pay && this.ans()[q.label] === 'Có');
  }

  /** Thiếu gì để sang bước tiếp / đặt đơn (rỗng = đủ) */
  missing(checkout: boolean): string {
    if (this.tpl.menu?.length && !this.service()) return 'Hãy chọn một dịch vụ.';
    for (const q of this.qs()) {
      if (q.req && !(this.ans()[q.label] ?? '').trim()) return 'Hãy điền “' + q.label + '”.';
    }
    if (this.dishGroup && this.totalDishes() < 1) return 'Hãy chọn ít nhất 1 món.';
    if (this.tpl.cups && !this.cups().length) return 'Hãy thêm ít nhất 1 ly vào đơn.';
    for (const g of this.opts()) {
      // nhóm chọn nhiều người bán đánh dấu bắt buộc
      if (g.multi && g.req === true && !this.chosen('', g).length) return 'Hãy chọn “' + g.name + '”.';
    }
    if (this.paying() && !this.payBack()) return 'Hãy nhập số tiền cần trả giùm.';
    if (!checkout) return '';
    if (this.tpl.time.mode === 'datedur' && !this.date()) return 'Hãy chọn ngày giờ.';
    if (this.tpl.price.type !== 'quote' && this.tpl.time.mode === 'slot' && !this.time()) return 'Hãy chọn giờ.';
    if (this.needsAddress() && !this.addressId()) return 'Hãy chọn địa chỉ nhận.';
    return '';
  }
}
