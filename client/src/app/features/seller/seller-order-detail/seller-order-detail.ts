import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { KIND_LABEL } from '../../../core/models/post';
import { SELLER_KIND_ICON, SellerOrderState } from '../../../core/models/seller';
import { SellerOrderAct, SellerSpaceService, dayLabel } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';

/** Câu hướng dẫn ở khung hành động, theo bước hiện tại */
const GUIDE: Record<SellerOrderState, string> = {
  waiting: 'Khách đang chờ bạn xác nhận. Đơn không được xác nhận trước hạn sẽ tự hủy để khách đặt nơi khác.',
  picked: 'Đã lấy đồ. Cân / đếm thực tế rồi báo giá để khách duyệt.',
  pricing: 'Đã gửi báo giá, chờ khách đồng ý. Khách đồng ý xong mới bắt đầu giặt.',
  confirmed: 'Bạn đã nhận đơn. Bấm bắt đầu khi bắt tay vào chuẩn bị để khách theo dõi được.',
  preparing: 'Đơn đang được chuẩn bị. Xong thì báo giao hoặc báo khách đến lấy.',
  delivering: 'Đơn đang trên đường tới khách. Thu tiền mặt khi giao (nếu khách trả tiền mặt).',
  ready: 'Khách được báo đến lấy tại bếp. Bấm khi khách đã nhận.',
  done: 'Đơn đã hoàn thành. Tiền khách trả trực tiếp cho bạn; AntGo không giữ tiền.',
  declined: 'Bạn đã từ chối đơn này. Khách đã được báo.',
  cancelled: 'Đơn đã hủy theo yêu cầu của khách.',
};
/** Giặt sấy: câu hướng dẫn riêng ở các bước dùng chung tên trạng thái */
const LAUNDRY_GUIDE: Partial<Record<SellerOrderState, string>> = {
  confirmed: 'Bạn đã nhận đơn. Qua lấy đồ đúng giờ khách hẹn rồi bấm xác nhận đã lấy đồ.',
  preparing: 'Khách đã đồng ý giá, đồ đang giặt. Giặt xong trả đồ theo hình thức khách chọn rồi bấm xác nhận.',
  done: 'Đã trả đồ. Tiền khách trả trực tiếp cho bạn; AntGo không giữ tiền.',
};
const DECLINE_REASONS = ['Hết món / hết hàng', 'Không kịp giờ khách hẹn', 'Ngoài khu vực giao', 'Khác'];

/** Chi tiết một đơn khách đặt: thanh bước + thông tin + thanh toán + khung hành động theo bước + thẻ khách. */
@Component({
  selector: 'app-seller-order-detail',
  standalone: false,
  templateUrl: './seller-order-detail.html',
  styleUrls: ['../seller-ui.css', '../seller-detail.css', './seller-order-detail.css'],
})
export class SellerOrderDetail implements OnInit {
  private readonly seller = inject(SellerSpaceService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });

  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly dayLabel = dayLabel;
  protected readonly guide = GUIDE;
  protected readonly reasons = DECLINE_REASONS;
  protected readonly ready = this.seller.ready;

  protected readonly o = computed(() => this.seller.orders().find((x) => x.id === this.id()) ?? null);
  protected readonly steps = computed(() => (this.o() ? this.seller.orderSteps(this.o()!) : []));
  protected readonly actions = computed(() => (this.o() ? this.seller.orderActions(this.o()!) : []));
  protected readonly review = computed(() => {
    const o = this.o();
    return o?.reviewId ? this.seller.reviews().find((r) => r.id === o.reviewId) ?? null : null;
  });

  /** Khung hành động đang mở form nào */
  protected readonly form = signal<'decline' | 'surcharge' | 'quote' | null>(null);
  /** Báo giá giặt sấy: số cân / đếm thực tế từng dòng */
  protected readonly quoteQty = signal<number[]>([]);
  protected readonly quoteTotal = computed(() => {
    const o = this.o();
    return o ? Math.round(o.items.reduce((n, it, i) => n + (this.quoteQty()[i] ?? it.qty) * it.price, 0)) : 0;
  });
  protected reason = DECLINE_REASONS[0];

  ngOnInit(): void {
    // ?quote=1 (bấm "Báo giá" trên thẻ Cần xử lý): mở sẵn khung báo giá
    const openQuote = this.route.snapshot.queryParamMap.get('quote') === '1';
    this.seller.load().subscribe(() => {
      if (openQuote && this.o()?.state === 'picked') this.act('quote');
    });
  }

  protected guideText(): string {
    const o = this.o()!;
    return (o.flow === 'laundry' ? LAUNDRY_GUIDE[o.state] : undefined) ?? this.guide[o.state];
  }

  protected setQuoteQty(i: number, v: string): void {
    this.quoteQty.update((l) => l.map((x, k) => (k === i ? Math.max(0, +v || 0) : x)));
  }

  protected sendQuote(e: Event): void {
    e.preventDefault();
    const o = this.o()!;
    const lines = o.items.map((it, i) => ({ name: it.name, qty: this.quoteQty()[i] ?? it.qty, price: it.price }));
    if (lines.some((l) => !(l.qty > 0))) return this.toast.show('Nhập số lượng thực tế cho từng dịch vụ');
    this.form.set(null);
    this.toast.show(this.seller.orderAct(o.id, 'quote', { lines }));
  }

  protected whenText(): string {
    const o = this.o()!;
    return `${o.flow === 'laundry' ? 'Hẹn lấy đồ' : o.fulfil === 'pickup' ? 'Tự lấy' : o.fulfil === 'home' ? 'Làm tại nhà' : 'Giao'} ${o.time} · ${dayLabel(o.day).toLowerCase()}`;
  }

  /** Hộp hỏi lại trước khi xác nhận đơn / xác nhận hủy (giống trang Hôm nay) */
  protected readonly ask = signal<SellerOrderAct | null>(null);
  protected readonly askView = computed(() => {
    const a = this.ask(), o = this.o();
    return a === 'confirm' || a === 'approveCancel' || a === 'pickUp' || a === 'returned' ? (o ? this.seller.askView(a, o.id) : null) : null;
  });

  protected confirmAsk(): void {
    const a = this.ask();
    this.ask.set(null);
    if (a) this.toast.show(this.seller.orderAct(this.o()!.id, a));
  }

  protected act(a: SellerOrderAct): void {
    if (a === 'decline' || a === 'surcharge') return this.form.set(a);
    if (a === 'quote') {
      this.quoteQty.set(this.o()!.items.map((i) => i.qty));
      return this.form.set('quote');
    }
    if (a === 'pickUp' || a === 'returned') return this.ask.set(a);
    if (a === 'confirm' || a === 'approveCancel') return this.ask.set(a);
    this.toast.show(this.seller.orderAct(this.o()!.id, a));
  }

  protected decline(e: Event): void {
    e.preventDefault();
    this.form.set(null);
    this.toast.show(this.seller.orderAct(this.o()!.id, 'decline', { reason: this.reason }));
  }

  protected surcharge(e: Event, amount: string, reason: string): void {
    e.preventDefault();
    if (!+amount || !reason.trim()) return this.toast.show('Nhập số tiền và lý do phụ thu');
    this.form.set(null);
    this.toast.show(this.seller.orderAct(this.o()!.id, 'surcharge', { amount: +amount, reason: reason.trim() }));
  }

  protected sendReply(e: Event, text: string): void {
    e.preventDefault();
    const r = this.review();
    if (!r || !text.trim()) return;
    this.seller.reply(r.id, text.trim());
    this.toast.show('Đã gửi phản hồi — hiện dưới đánh giá ở trang bài');
  }

  protected tel(phone: string): string {
    return 'tel:' + phone.replace(/\s/g, '');
  }

  protected stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
}
