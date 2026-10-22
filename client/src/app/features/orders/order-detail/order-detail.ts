import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppError } from '../../../core/models/api';
import { OFFER_ACTION_LABEL, OFFER_STEPS, OFFER_STATE_LABEL, Offer, OfferAction, OfferState } from '../../../core/models/offer';
import { useMock } from '../../../core/config/api.config';
import { Order } from '../../../core/models/order';
import { JobOfferService } from '../../../core/services/job-offer';
import { OrderService } from '../../../core/services/order';
import { XuService } from '../../../core/services/xu';
import { Post } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { ReviewService } from '../../../core/services/review';
import { availableActions, canSeeExactAddress } from '../../../core/utils/offer-state';
import { formatDateTime, statusLabel } from '../../../core/utils/status-label';

const CANCEL_REASONS = [
  { value: 'busy', label: 'Mình bận đột xuất' },
  { value: 'sick', label: 'Mình không khỏe' },
  { value: 'other', label: 'Lý do khác' },
];

/** Chi tiết đơn: Đơn đã đặt (yêu cầu hủy) và Việc đã nhận (thanh 5 bước + hành động hợp lệ). */
@Component({
  selector: 'app-order-detail',
  standalone: false,
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly offerService = inject(JobOfferService);
  private readonly reviewService = inject(ReviewService);
  private readonly xu = inject(XuService);
  private readonly postService = inject(PostService);
  protected readonly job = signal<Post | null>(null);

  protected readonly order = signal<Order | null>(null);
  protected readonly offer = signal<Offer | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly reviewed = signal(false);

  /** API thật chỉ có "đồng ý phụ thu" (decisions F7) nên nút từ chối chỉ hiện ở mock */
  protected readonly canDeclineSurcharge = useMock('order');
  protected readonly steps = OFFER_STEPS;
  protected readonly stateLabel = OFFER_STATE_LABEL;
  protected readonly actionLabel = OFFER_ACTION_LABEL;
  protected readonly cancelReasons = CANCEL_REASONS;
  protected readonly label = statusLabel;
  protected readonly fmt = formatDateTime;

  protected readonly actions = computed(() => {
    const o = this.offer();
    return o ? availableActions(o.state) : [];
  });
  protected readonly showAddress = computed(() => {
    const o = this.offer();
    return !!o?.exactAddress && canSeeExactAddress(o.state);
  });

  protected readonly doneForm = new FormGroup({ note: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }) });
  protected readonly cancelForm = new FormGroup({ reason: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });
  protected readonly placedCancelForm = new FormGroup({ reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }) });
  protected readonly reviewForm = new FormGroup({
    rating: new FormControl(0, { nonNullable: true, validators: [Validators.min(1), Validators.max(5)] }),
    comment: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });
  protected openPanel: 'report' | 'cancel' | 'placedCancel' | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => this.load(params.get('id') ?? ''));
  }

  private load(id: string): void {
    this.loading.set(true);
    this.orderService.getOrder(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.job.set(null);
        if (o.type === 'received') {
          this.offerService.get(id).subscribe((of) => {
            this.offer.set(of);
            this.postService.getPostById(of.jobId).subscribe((p) => this.job.set(p ?? null));
          });
        }
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.order.set(null);
        this.error.set(e instanceof AppError && e.status === 404 ? null : e.message);
        this.loading.set(false);
      },
    });
  }

  /** Thanh bước của việc đã nhận: bước đã qua / đang ở / bị cắt (nhánh phụ) kèm ngày giờ */
  receivedSteps(): { label: string; cls: string; time: string; n: number }[] {
    const of = this.offer();
    if (!of) return [];
    const side = ['rejected', 'withdrawn', 'cancelled'].includes(of.state);
    const reached = of.history.map((h) => h.state);
    const last = [...reached].reverse().find((x) => OFFER_STEPS.includes(x)) ?? 'offered';
    const cur = OFFER_STEPS.indexOf(last) + (side ? 1 : 0);
    return OFFER_STEPS.map((s, i) => {
      const cut = side && i === cur;
      const cls = cut ? 'cut' : of.state === 'done' ? 'ok' : i < cur ? 'ok' : i === cur ? 'cur' : '';
      const time = cls === 'ok' || (cls === 'cur' && i === 0) ? this.stepTime(s) : '';
      return { label: cut ? OFFER_STATE_LABEL[of.state] : OFFER_STATE_LABEL[s], cls, time, n: i + 1 };
    });
  }

  /** Tiêu đề + lời giải thích trong bảng hành động (đúng bước hiện tại) */
  panel(o: Order): { h: string; why: string } {
    const n = o.counterpartName;
    if (o.type === 'received') {
      const st = this.offer()?.state ?? (o.status as OfferState);
      const map: Record<OfferState, { h: string; why: string }> = {
        offered: { h: 'Chờ ' + n + ' chọn người', why: 'Bạn sẽ được báo ngay khi ' + n + ' chọn. Gửi đề nghị chưa phải là đã nhận việc.' },
        chosen: { h: 'Bạn đã được chọn!', why: 'Địa chỉ chính xác đã hiện bên trái. Đến giờ làm, bấm Bắt đầu làm để ' + n + ' biết bạn đã tới.' },
        working: { h: 'Đang làm', why: 'Làm xong thì bấm Báo hoàn thành, kèm ghi chú để ' + n + ' dễ kiểm tra.' },
        reported: { h: 'Chờ ' + n + ' xác nhận', why: n + ' sẽ kiểm tra rồi xác nhận hoàn thành. Nếu không phản hồi, đơn tự hoàn thành sau 24 giờ.' },
        done: this.reviewed()
          ? { h: 'Xong việc rồi!', why: 'Đã nhận tiền công và đánh giá. Cảm ơn bạn đã giúp hàng xóm.' }
          : { h: 'Hoàn thành — bạn đã nhận tiền công chưa?', why: n + ' trả trực tiếp (' + (o.paymentMethod === 'cash' ? 'tiền mặt' : 'chuyển khoản') + '). Nhận đủ rồi thì bấm xác nhận. AntGo không giữ tiền.' },
        rejected: { h: 'Chưa được chọn lần này', why: n + ' đã chọn người khác. Đề nghị của bạn không ảnh hưởng gì tới hồ sơ.' },
        withdrawn: { h: 'Bạn đã rút đề nghị', why: n + ' không còn thấy đề nghị của bạn.' },
        cancelled: { h: 'Đơn đã hủy', why: 'Lý do: ' + (this.offer()?.cancelReason ?? '—') + '. ' + n + ' đã được báo để tìm người khác.' },
      };
      return map[st];
    }
    const map: Record<string, { h: string; why: string }> = {
      pending: { h: 'Chờ bên bán xác nhận', why: 'Yêu cầu đã gửi tới ' + n + '. Chưa xác nhận thì bạn hủy được ngay.' },
      confirmed: { h: 'Đơn đã được nhận', why: n + ' đã xác nhận. Theo dõi thời gian và cách giao nhận ở bên trái.' },
      preparing: { h: 'Bên bán đang chuẩn bị', why: n + ' đã bắt đầu nên không tự hủy được nữa. Cần thì gửi yêu cầu hủy — ' + n + ' đồng ý mới hủy.' },
      delivering: { h: 'Đang giao', why: 'Khi đã nhận đủ, hãy xác nhận để đóng đơn.' },
      done: { h: 'Đơn đã hoàn thành', why: this.reviewed() ? 'Cảm ơn bạn đã đánh giá.' : 'Đánh giá có viết nhận xét để nhận thêm +5 Xu.' },
      cancelled: { h: 'Đơn đã hủy', why: 'Đơn đã dừng. Bạn có thể tìm lựa chọn khác trong khu.' },
    };
    return map[o.status as string] ?? map['pending'];
  }

  stepTime(state: OfferState): string {
    const h = this.offer()?.history.find((x) => x.state === state);
    return h ? formatDateTime(h.at) : '';
  }

  /** Các bước theo dõi đơn đã đặt (theo loại bài lúc đặt) kèm bước đang ở */
  placedSteps(o: Order): { label: string; done: boolean; current: boolean }[] {
    const steps = o.detail?.steps ?? ['Đã gửi', 'Chờ xác nhận', 'Đang chuẩn bị', 'Hoàn thành'];
    const last = steps.length - 1;
    const at = o.status === 'done' ? last : o.status === 'cancelled' ? -1 : Math.min(last - 1, { pending: 1, confirmed: 1, preparing: 2, delivering: Math.max(2, last - 1) }[o.status as string] ?? 1);
    return steps.map((label, i) => ({ label, done: i <= at, current: i === at }));
  }

  stepReached(state: OfferState): boolean {
    return this.offer()?.history.some((h) => h.state === state) ?? false;
  }

  run(action: OfferAction): void {
    const o = this.offer();
    if (!o) return;
    if (action === 'reportDone' && this.openPanel !== 'report') return void (this.openPanel = 'report');
    if (action === 'cancelRequest' && this.openPanel !== 'cancel') return void (this.openPanel = 'cancel');
    if (action === 'reportDone' && this.doneForm.invalid) return this.doneForm.markAllAsTouched();
    if (action === 'cancelRequest' && this.cancelForm.invalid) return this.cancelForm.markAllAsTouched();
    this.error.set(null);
    this.offerService
      .act(o._id, action, { note: this.doneForm.getRawValue().note, reason: this.cancelForm.getRawValue().reason })
      .subscribe({
        next: (next) => {
          this.offer.set(next);
          if (action === 'confirmPaid') this.xu.earn(15, 'Hoàn thành việc đã nhận', 'job:' + next._id);
          this.order.update((cur) => (cur ? { ...cur, status: next.state, history: next.history } : cur));
          this.openPanel = null;
        },
        error: (e: Error) => this.error.set(e.message),
      });
  }

  requestCancelPlaced(): void {
    const o = this.order();
    if (!o) return;
    if (this.openPanel !== 'placedCancel') return void (this.openPanel = 'placedCancel');
    if (this.placedCancelForm.invalid) return this.placedCancelForm.markAllAsTouched();
    this.orderService.requestCancel(o._id, this.placedCancelForm.getRawValue().reason).subscribe({
      next: (next) => {
        this.order.set(next);
        this.openPanel = null;
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  setRating(n: number): void {
    this.reviewForm.controls.rating.setValue(n);
  }

  submitReview(): void {
    const o = this.order();
    if (!o || this.reviewForm.invalid) return this.reviewForm.markAllAsTouched();
    this.reviewService
      .create({ targetType: o.type === 'received' ? 'offer' : 'order', targetId: o._id, ...this.reviewForm.getRawValue() })
      .subscribe({
        next: () => {
          this.reviewed.set(true);
          if (this.reviewForm.getRawValue().comment.trim()) this.xu.earn(5, 'Đánh giá có nhận xét', 'review:' + o._id);
        },
        error: (e: Error) => this.error.set(e.message),
      });
  }

  answerSurcharge(approve: boolean): void {
    const o = this.order();
    if (!o) return;
    this.orderService.respondSurcharge(o._id, approve).subscribe({
      next: (n) => this.order.set(n),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  canCancelPlaced(o: Order): boolean {
    return o.type === 'placed' && !['done', 'cancelled'].includes(o.status) && !o.cancelRequested;
  }

  canReview(o: Order): boolean {
    return o.status === 'done' && !this.reviewed();
  }
}
