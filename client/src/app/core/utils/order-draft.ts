import { computed, signal } from '@angular/core';
import { PostTemplate } from '../models/post-template';
import type { Voucher } from '../services/xu';

/** "Nhiều cơm|+5.000đ" → { name, add } */
export function parseChoice(raw: string): { name: string; add: number } {
  const [name, tail] = raw.split('|');
  const m = tail?.match(/\+([\d.]+)đ/);
  return { name, add: m ? Number(m[1].replace(/\./g, '')) : 0 };
}

/** Một phần ăn thêm (món/tùy chọn riêng + số lượng riêng) trong cùng một đơn */
export interface Portion {
  opt: Record<string, string>;
  qty: number;
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
  /** Câu hỏi riêng: nhãn → chữ / lựa chọn thô / nhiều lựa chọn thô nối bằng "|||" */
  readonly ans = signal<Record<string, string>>({});
  /** Các phần khác ngoài phần 1 (phần 1 là opt + qty ở trên) — chỉ đồ ăn và đồ uống */
  readonly portions = signal<Portion[]>([]);
  readonly place = signal(0);
  readonly date = signal('');
  readonly time = signal('');
  readonly hours = signal(2);
  readonly repeat = signal(false);
  readonly note = signal('');
  readonly utensils = signal(true);
  readonly pay = signal<PayMethod>('cash');
  readonly addressId = signal('');
  readonly voucher = signal<Voucher | null>(null);
  /** Số tiền người làm ứng trước, người mua trả lại khi nhận (câu hỏi "Cần trả tiền giùm?" = Có) */
  readonly payBack = signal('');

  constructor(readonly tpl: PostTemplate, private readonly stock: number | null = null) {
    this.qty.set(tpl.qty?.min ?? 1);
    const o: Record<string, string> = {};
    for (const g of tpl.opts) o[g.name] = g.choices[0];
    this.opt.set(o);
    this.hours.set(tpl.time.dur?.[0] ?? 2);
    this.time.set(tpl.time.win[0]);
  }

  readonly maxQty = computed(() => Math.min(this.tpl.qty?.max ?? 1, this.stock ?? Infinity));
  /** Tổng số lượng của mọi phần */
  readonly totalQty = computed(() => this.qty() + this.portions().reduce((s, p) => s + p.qty, 0));
  /** Cho phép thêm phần khác (món khác trong cùng đơn): đồ ăn và đồ uống, còn chỗ trong giới hạn */
  readonly canAddPortion = computed(() => !!this.tpl.qty && (this.tpl.key === 'food' || this.tpl.key === 'drink') && this.totalQty() < this.maxQty());

  /** Giá chính (chưa gồm tùy chọn) */
  readonly unit = computed(() => {
    const p = this.tpl.price;
    if (p.type === 'quote') return 0;
    const mult = this.tpl.time.mode === 'datedur' ? this.hours() : this.tpl.qty ? this.totalQty() : 1;
    return (p.amount ?? 0) * mult;
  });

  readonly optAdd = computed(() => this.tpl.opts.reduce((s, g) => s + parseChoice(this.opt()[g.name] ?? '').add, 0));
  readonly qsAdd = computed(() =>
    this.tpl.qs.reduce((s, q) => {
      if (q.type === 'choice') return s + parseChoice(this.ans()[q.label] ?? '').add;
      if (q.type === 'multi') return s + this.picks(q.label).reduce((a, x) => a + parseChoice(x).add, 0);
      return s;
    }, 0),
  );

  /** Phụ giá của tùy chọn/câu hỏi, nhân theo số lượng phần */
  readonly extra = computed(() => {
    const per = (opt: Record<string, string>) => this.tpl.opts.reduce((s, g) => s + parseChoice(opt[g.name] ?? '').add, 0);
    if (!this.tpl.qty) return this.optAdd() + this.qsAdd();
    return per(this.opt()) * this.qty() + this.portions().reduce((s, p) => s + per(p.opt) * p.qty, 0) + this.qsAdd() * this.totalQty();
  });
  readonly subtotal = computed(() => (this.tpl.price.type === 'quote' ? this.tpl.price.inspect ?? 0 : this.unit() + this.extra()));
  readonly placeFee = computed(() => (this.tpl.place.mode === 'choice' ? this.tpl.place.choices?.[this.place()]?.[1] ?? 0 : 0));
  /** Cách nhận có phụ phí (giao tận cửa / thợ đến nhà) thì cần địa chỉ người nhận */
  readonly needsAddress = computed(() => {
    const m = this.tpl.place.mode;
    return m === 'buyer' || m === 'ab' || (m === 'choice' && this.placeFee() > 0);
  });
  readonly discount = computed(() => {
    const v = this.voucher();
    if (!v) return 0;
    if (v.ship) return this.needsAddress() ? this.placeFee() : 0;
    return v.amount && this.subtotal() >= v.min ? v.amount : 0;
  });
  readonly grand = computed(() => Math.max(0, this.subtotal() + this.placeFee() - this.discount()));

  private defaults(): Record<string, string> {
    const o: Record<string, string> = {};
    for (const g of this.tpl.opts) o[g.name] = g.choices[0];
    return o;
  }

  addPortion(): void {
    if (this.canAddPortion()) this.portions.update((l) => [...l, { opt: this.defaults(), qty: 1 }]);
  }

  removePortion(i: number): void {
    this.portions.update((l) => l.filter((_, k) => k !== i));
  }

  setPortionOpt(i: number, group: string, raw: string): void {
    this.portions.update((l) => l.map((p, k) => (k === i ? { ...p, opt: { ...p.opt, [group]: raw } } : p)));
  }

  setPortionQty(i: number, n: number): void {
    const others = this.totalQty() - (this.portions()[i]?.qty ?? 0);
    const q = Math.max(1, Math.min(n, this.maxQty() - others));
    this.portions.update((l) => l.map((p, k) => (k === i ? { ...p, qty: q } : p)));
  }

  /** Số lượng tối đa cho phần 1 (trừ phần đã chọn ở các phần khác) */
  mainCap(): number {
    return this.maxQty() - (this.totalQty() - this.qty());
  }

  setOpt(group: string, raw: string): void {
    this.opt.update((o) => ({ ...o, [group]: raw }));
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

  /** Các dòng "Nhóm: lựa chọn" của một bộ tùy chọn; lựa chọn mặc định (không phụ phí, trong nhóm có lựa chọn nâng cấp trả thêm) thì bỏ qua */
  private optLines(opt: Record<string, string>): string[] {
    const out: string[] = [];
    for (const g of this.tpl.opts) {
      const c = parseChoice(opt[g.name] ?? '');
      const isBase = c.add === 0 && g.choices.some((x) => parseChoice(x).add > 0);
      if (!isBase) out.push(g.name + ': ' + c.name);
    }
    return out;
  }

  /** Các lựa chọn đã chọn, dạng "Nhóm: lựa chọn" để hiện trong hộp xác nhận và ghi vào đơn. Có nhiều phần thì phần tùy chọn nằm ở `portionRows`. */
  readonly lines = computed(() => {
    const out: string[] = this.portions().length ? [] : this.optLines(this.opt());
    for (const q of this.tpl.qs) {
      const a = this.ans()[q.label] ?? '';
      const v = q.type === 'multi' ? this.picks(q.label).map((x) => parseChoice(x).name).join(', ') : q.type === 'choice' ? parseChoice(a).name : a;
      if (v) out.push(q.label + ': ' + v);
    }
    if (this.paying() && this.payBack()) out.push('Số tiền cần trả giùm: ' + Number(this.payBack()).toLocaleString('vi-VN') + 'đ');
    return out;
  });

  /** Khi đơn có nhiều phần: từng phần một dòng ("Phần 1" · "Sườn ram · Nhiều cơm" · số lượng). Một phần thì rỗng. */
  readonly portionRows = computed(() => {
    if (!this.portions().length) return [] as { title: string; qty: number; text: string }[];
    const text = (opt: Record<string, string>) => this.optLines(opt).map((l) => l.split(': ').slice(1).join(': ')).join(' · ') || 'Mặc định';
    return [{ title: 'Phần 1', qty: this.qty(), text: text(this.opt()) }, ...this.portions().map((p, i) => ({ title: 'Phần ' + (i + 2), qty: p.qty, text: text(p.opt) }))];
  });

  /** Đã chọn "Có" ở câu hỏi trả tiền giùm */
  paying(): boolean {
    return this.tpl.qs.some((q) => q.pay && this.ans()[q.label] === 'Có');
  }

  /** Thiếu gì để sang bước tiếp / đặt đơn (rỗng = đủ) */
  missing(checkout: boolean): string {
    for (const q of this.tpl.qs) {
      if (q.req && !(this.ans()[q.label] ?? '').trim()) return 'Hãy điền “' + q.label + '”.';
    }
    if (this.paying() && !this.payBack()) return 'Hãy nhập số tiền cần trả giùm.';
    if (!checkout) return '';
    if (this.tpl.time.mode === 'datedur' && !this.date()) return 'Hãy chọn ngày giờ.';
    if (this.tpl.price.type !== 'quote' && this.tpl.time.mode === 'slot' && !this.time()) return 'Hãy chọn giờ.';
    if (this.needsAddress() && !this.addressId()) return 'Hãy chọn địa chỉ nhận.';
    return '';
  }
}
