import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap, forkJoin } from 'rxjs';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { AppError } from '../../../core/models/api';
import { CreateOrderBody } from '../../../core/models/order';
import { KIND_LABEL, Post } from '../../../core/models/post';
import { Address } from '../../../core/models/user';
import { AddressService } from '../../../core/services/address';
import { OrderService } from '../../../core/services/order';
import { PostService } from '../../../core/services/post';
import { RecommendService } from '../../../core/services/recommend';
import { SavedService } from '../../../core/services/saved';
import { calcOrderTotal } from '../../../core/utils/order-math';
import { resolveId } from '../../../core/utils/slug-helper';

/** Phí giao hiển thị tạm ở mock; server tính phí thật và tổng tiền khi tạo đơn. */
const DELIVERY_FEE = 7000;

/**
 * Chi tiết đồ ăn / đồ dùng / dịch vụ + đặt hàng 2 bước:
 * Bước 1 chọn số lượng → Bước 2 "Xác nhận đơn hàng" (địa chỉ, cách nhận, giờ, ghi chú, thanh toán).
 */
@Component({
  selector: 'app-post-detail',
  standalone: false,
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.css',
})
export class PostDetail implements OnInit, CanComponentDeactivate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly orderService = inject(OrderService);
  private readonly addressService = inject(AddressService);
  private readonly recommend = inject(RecommendService);
  protected readonly saved = inject(SavedService);
  protected readonly similar = signal<Post[]>([]);

  protected readonly kindLabel = KIND_LABEL;
  protected readonly post = signal<Post | null>(null);
  protected readonly addresses = signal<Address[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly step = signal<1 | 2>(1);
  protected readonly submitting = signal(false);
  protected readonly quantity = signal(1);
  protected readonly delivery = signal(true);
  /** Lựa chọn đã chọn: tên nhóm → các nhãn đã chọn */
  protected readonly selections = signal<Record<string, string[]>>({});
  /** Trả lời câu hỏi riêng: nhãn câu hỏi → nội dung */
  protected readonly answers = signal<Record<string, string>>({});

  protected readonly form = new FormGroup({
    addressId: new FormControl('', { nonNullable: true }),
    scheduledAt: new FormControl('', { nonNullable: true }),
    utensils: new FormControl(true, { nonNullable: true }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    voucher: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^[A-Za-z0-9]{0,20}$/)] }),
    payment: new FormControl<'cash' | 'transfer'>('cash', { nonNullable: true }),
  });

  /** Phụ phí của các lựa chọn đang chọn */
  protected readonly extras = computed(() => {
    const p = this.post();
    const sel = this.selections();
    return (p?.optionGroups ?? []).flatMap((g) => g.choices.filter((c) => (sel[g.name] ?? []).includes(c.label)));
  });
  protected readonly deliveryFee = computed(() => this.post()?.deliveryFee ?? DELIVERY_FEE);
  protected readonly total = computed(() => {
    const p = this.post();
    return p
      ? calcOrderTotal({ unitPrice: p.price, quantity: this.quantity(), extras: this.extras(), deliveryFee: this.delivery() ? this.deliveryFee() : 0 })
      : 0;
  });
  protected readonly subtotal = computed(() => {
    const p = this.post();
    return p ? calcOrderTotal({ unitPrice: p.price, quantity: this.quantity(), extras: this.extras() }) : 0;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = resolveId(params.get('slug') ?? '');
          this.loading.set(true);
          return id ? forkJoin({ post: this.postService.getPostById(id), addresses: this.addressService.list() }) : of(null);
        }),
      )
      .subscribe({
        next: (r) => {
          this.post.set(r?.post ?? null);
          this.similar.set([]);
          if (r?.post) this.recommend.similar(r.post._id).subscribe({ next: (l) => this.similar.set(l), error: () => this.similar.set([]) });
          this.addresses.set(r?.addresses ?? []);
          this.selections.set({});
          this.answers.set({});
          // Bài chỉ có một cách nhận thì khóa theo đó
          const modes = r?.post?.fulfillmentModes ?? [];
          if (modes.length === 1) this.delivery.set(modes[0] === 'delivery');
          const def = r?.addresses.find((a) => a.isDefault);
          if (def) this.form.patchValue({ addressId: def._id });
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.error.set(e.message);
          this.loading.set(false);
        },
      });
  }

  hasUnsavedChanges(): boolean {
    return this.step() === 2 && this.form.dirty;
  }

  setQuantity(n: number): void {
    this.quantity.set(Math.min(99, Math.max(1, Math.floor(n) || 1)));
  }

  isChosen(group: string, label: string): boolean {
    return (this.selections()[group] ?? []).includes(label);
  }

  /** Nhóm chọn 1: thay lựa chọn; chọn nhiều: bật/tắt. */
  toggleChoice(group: string, label: string, multi: boolean): void {
    this.selections.update((s) => {
      const cur = s[group] ?? [];
      const next = multi ? (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]) : [label];
      return { ...s, [group]: next };
    });
  }

  setAnswer(question: string, value: string): void {
    this.answers.update((a) => ({ ...a, [question]: value }));
  }

  /** Bước 1 hợp lệ khi mọi nhóm bắt buộc đã chọn. */
  step1Valid(p: Post): boolean {
    return (p.optionGroups ?? []).every((g) => !g.required || (this.selections()[g.name] ?? []).length > 0);
  }

  canToggleDelivery(p: Post): boolean {
    const m = p.fulfillmentModes ?? [];
    return m.length === 0 || m.length > 1;
  }

  answersValid(p: Post): boolean {
    return (p.questions ?? []).every((q) => !q.required || (this.answers()[q.label] ?? '').trim().length > 0);
  }

  next(): void {
    this.step.set(2);
  }

  toggleDelivery(on: boolean): void {
    this.delivery.set(on);
  }

  /** Dịch vụ cần chọn ngày giờ trước khi đặt. */
  needsSchedule(p: Post): boolean {
    return p.needSchedule ?? p.kind === 'service';
  }

  canSubmit(p: Post): boolean {
    if (this.form.invalid || this.submitting()) return false;
    if (this.delivery() && !this.form.controls.addressId.value) return false;
    if (this.needsSchedule(p) && !this.form.controls.scheduledAt.value) return false;
    if (!this.step1Valid(p) || !this.answersValid(p)) return false;
    return true;
  }

  submit(p: Post): void {
    if (!this.canSubmit(p)) return void this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    const body: CreateOrderBody = {
      postId: p._id,
      quantity: this.quantity(),
      selections: Object.entries(this.selections()).filter(([, c]) => c.length).map(([group, choices]) => ({ group, choices })),
      answers: Object.entries(this.answers()).filter(([, v]) => v.trim()).map(([question, value]) => ({ question, value: value.trim() })),
      fulfillment: this.delivery() ? 'delivery' : 'pickup',
      addressId: this.delivery() ? v.addressId : undefined,
      scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : undefined,
      utensils: p.kind === 'food' ? v.utensils : false,
      note: v.note.trim() || undefined,
      voucherCode: p.acceptsXu && v.voucher ? v.voucher.trim().toUpperCase() : undefined,
      payment: v.payment,
    };
    this.submitting.set(true);
    this.error.set(null);
    this.orderService.create(body).subscribe({
      next: (o) => {
        this.form.markAsPristine();
        this.router.navigate(['/orders', o._id]);
      },
      error: (e: Error) => {
        this.error.set(e instanceof AppError && e.details.length ? e.details.map((d) => d.message).join(' ') : e.message);
        this.submitting.set(false);
      },
    });
  }

  toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }

  back(): void {
    this.router.navigate(['/search']);
  }
}
