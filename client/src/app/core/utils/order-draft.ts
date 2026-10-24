import { computed, signal } from '@angular/core';
import { PostTemplate } from '../models/post-template';
import type { Voucher } from '../services/xu';

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
  /** Câu hỏi riêng: nhãn → chữ / lựa chọn thô / nhiều lựa chọn thô nối bằng "|||" */
  readonly ans = signal<Record<string, string>>({});
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

  /** Giá chính (chưa gồm tùy chọn) */
  readonly unit = computed(() => {
    const p = this.tpl.price;
    if (p.type === 'quote') return 0;
    const mult = this.tpl.time.mode === 'datedur' ? this.hours() : this.tpl.qty ? this.qty() : 1;
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
  readonly extra = computed(() => (this.optAdd() + this.qsAdd()) * (this.tpl.qty ? this.qty() : 1));
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

  /** Các lựa chọn đã chọn, dạng "Nhóm: lựa chọn" để hiện trong hộp xác nhận và ghi vào đơn */
  readonly lines = computed(() => {
    const out: string[] = [];
    for (const g of this.tpl.opts) {
      const c = parseChoice(this.opt()[g.name] ?? '');
      // Lựa chọn mặc định (không tính thêm tiền, trong khi nhóm có lựa chọn nâng cấp trả thêm) không cần ghi vào đơn
      const isBase = c.add === 0 && g.choices.some((x) => parseChoice(x).add > 0);
      if (!isBase) out.push(g.name + ': ' + c.name);
    }
    for (const q of this.tpl.qs) {
      const a = this.ans()[q.label] ?? '';
      const v = q.type === 'multi' ? this.picks(q.label).map((x) => parseChoice(x).name).join(', ') : q.type === 'choice' ? parseChoice(a).name : a;
      if (v) out.push(q.label + ': ' + v);
    }
    if (this.paying() && this.payBack()) out.push('Số tiền cần trả giùm: ' + Number(this.payBack()).toLocaleString('vi-VN') + 'đ');
    return out;
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
