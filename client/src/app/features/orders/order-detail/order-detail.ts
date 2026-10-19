import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppError } from '../../../core/models/api';
import { OFFER_ACTION_LABEL, OFFER_STEPS, OFFER_STATE_LABEL, Offer, OfferAction, OfferState } from '../../../core/models/offer';
import { useMock } from '../../../core/config/api.config';
import { Order } from '../../../core/models/order';
import { JobOfferService } from '../../../core/services/job-offer';
import { OrderService } from '../../../core/services/order';
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
        if (o.type === 'received') this.offerService.get(id).subscribe((of) => this.offer.set(of));
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.order.set(null);
        this.error.set(e instanceof AppError && e.status === 404 ? null : e.message);
        this.loading.set(false);
      },
    });
  }

  stepTime(state: OfferState): string {
    const h = this.offer()?.history.find((x) => x.state === state);
    return h ? formatDateTime(h.at) : '';
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
        next: () => this.reviewed.set(true),
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
