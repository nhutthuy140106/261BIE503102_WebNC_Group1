import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { KIND_LABEL } from '../../../core/models/post';
import { SELLER_FLOW, SELLER_KIND_ICON, SELLER_STEPS, SellerOrderState } from '../../../core/models/seller';
import { SellerOrderAct, SellerSpaceService, dayLabel } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';
import { StepCut } from '../components/steps/steps';

/** Câu hướng dẫn ở khung hành động, theo bước hiện tại */
const GUIDE: Record<SellerOrderState, string> = {
  waiting: 'Khách đang chờ bạn xác nhận. Đơn không được xác nhận trước hạn sẽ tự hủy để khách đặt nơi khác.',
  confirmed: 'Bạn đã nhận đơn. Bấm bắt đầu khi bắt tay vào chuẩn bị để khách theo dõi được.',
  preparing: 'Đơn đang được chuẩn bị. Xong thì báo giao hoặc báo khách đến lấy.',
  delivering: 'Đơn đang trên đường tới khách. Thu tiền mặt khi giao (nếu khách trả tiền mặt).',
  ready: 'Khách được báo đến lấy tại bếp. Bấm khi khách đã nhận.',
  done: 'Đơn đã hoàn thành. Tiền khách trả trực tiếp cho bạn; AntGo không giữ tiền.',
  declined: 'Bạn đã từ chối đơn này. Khách đã được báo.',
  cancelled: 'Đơn đã hủy theo yêu cầu của khách.',
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
  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });

  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly dayLabel = dayLabel;
  protected readonly guide = GUIDE;
  protected readonly reasons = DECLINE_REASONS;
  protected readonly ready = this.seller.ready;

  protected readonly o = computed(() => this.seller.orders().find((x) => x.id === this.id()) ?? null);
  protected readonly steps = computed(() => (this.o() ? SELLER_STEPS[this.o()!.fulfil] : []));
  protected readonly cut = computed<StepCut | null>(() => {
    const o = this.o();
    if (!o) return null;
    const at = (s: string) => o.history.find((h) => h[0] === s)?.[1] ?? '';
    if (o.state === 'declined') return { at: 1, label: 'Đã từ chối', time: at('declined') };
    if (o.state === 'cancelled') {
      const flow = SELLER_STEPS[o.fulfil];
      return { at: Math.max(1, o.history.filter((h) => flow.some((s) => s[0] === h[0])).length), label: 'Đã hủy', time: at('cancelled') };
    }
    return null;
  });
  protected readonly actions = computed(() => (this.o() ? this.seller.orderActions(this.o()!) : []));
  protected readonly review = computed(() => {
    const o = this.o();
    return o?.reviewId ? this.seller.reviews().find((r) => r.id === o.reviewId) ?? null : null;
  });

  /** Khung hành động đang mở form nào */
  protected readonly form = signal<'decline' | 'surcharge' | null>(null);
  protected reason = DECLINE_REASONS[0];

  ngOnInit(): void {
    this.seller.load().subscribe();
  }

  protected whenText(): string {
    const o = this.o()!;
    return `${o.fulfil === 'pickup' ? 'Tự lấy' : o.fulfil === 'home' ? 'Làm tại nhà' : 'Giao'} ${o.time} · ${dayLabel(o.day).toLowerCase()}`;
  }

  /** Hộp hỏi lại trước khi xác nhận đơn / xác nhận hủy (giống trang Hôm nay) */
  protected readonly ask = signal<SellerOrderAct | null>(null);
  protected readonly askView = computed(() => {
    const a = this.ask(), o = this.o();
    if (!a || !o) return null;
    const cancel = a === 'approveCancel';
    const flow = cancel ? SELLER_FLOW.cancel : SELLER_FLOW[o.fulfil];
    return {
      heading: cancel ? 'Bạn chắc chắn xác nhận hủy?' : `Xác nhận chuyển sang “${flow[2]}”?`,
      message: cancel ? `Đơn ${o.code} sẽ chuyển sang <b>Đã hủy</b>, ${o.buyer.name} được báo.` : `Đơn chuyển sang <b>${flow[2]}</b>, ${o.buyer.name} được báo ngay.`,
      flow, step: cancel ? 0 : 1, ok: cancel ? 'Xác nhận hủy' : 'Xác nhận',
      sub: [o.code, `${o.total.toLocaleString('vi-VN')}đ`, `${o.buyer.name} (${o.buyer.phone})`].join(' · '),
    };
  });

  protected confirmAsk(): void {
    const a = this.ask();
    this.ask.set(null);
    if (a) this.toast.show(this.seller.orderAct(this.o()!.id, a));
  }

  protected act(a: SellerOrderAct): void {
    if (a === 'decline' || a === 'surcharge') return this.form.set(a);
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
