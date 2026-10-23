import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppError } from '../../../core/models/api';
import { REPORT_REASON_LABEL, ReportReason } from '../../../core/models/social';
import { Order } from '../../../core/models/order';
import { OrderService } from '../../../core/services/order';
import { ReportService } from '../../../core/services/report';

/** Báo cáo vấn đề với đơn (/orders/:id/report). */
@Component({
  selector: 'app-report-form',
  standalone: false,
  templateUrl: './report-form.html',
  styleUrl: './report-form.css',
})
export class ReportForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly reports = inject(ReportService);

  protected readonly order = signal<Order | null>(null);
  protected readonly pics = signal<string[]>([]);
  protected readonly orderId = signal('');
  protected readonly title = signal('');
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    reason: new FormControl<ReportReason | ''>('', { nonNullable: true, validators: [Validators.required] }),
    detail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)] }),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.orderId.set(id);
    this.orders.getOrder(id).subscribe({ next: (o) => { this.order.set(o); this.title.set(`${o.code} · ${o.postTitle}`); }, error: () => this.title.set('') });
  }

  /** Lý do báo cáo gửi AntGo, câu chữ theo danh mục của đơn (mã gửi lên vẫn là bộ chung) */
  protected reasons(): [ReportReason, string][] {
    const o = this.order();
    const k = o?.type === 'received' ? 'job' : (o?.kind ?? 'goods');
    const m: Record<string, Record<ReportReason, string>> = {
      food: { not_received: 'Không nhận được món', quality: 'Món không đúng mô tả / có vấn đề vệ sinh', payment: 'Vấn đề thanh toán', abuse: 'Bên bán có hành vi không phù hợp', other: 'Khác' },
      goods: { not_received: 'Không nhận được hàng', quality: 'Hàng không đúng mô tả', payment: 'Vấn đề thanh toán', abuse: 'Bên bán có hành vi không phù hợp', other: 'Khác' },
      service: { not_received: 'Người làm không đến / không thực hiện', quality: 'Làm không đúng thỏa thuận', payment: 'Vấn đề thanh toán / tính thêm tiền', abuse: 'Người làm có hành vi không phù hợp', other: 'Khác' },
      job: { not_received: 'Người đăng không xuất hiện / hủy sát giờ', quality: 'Công việc không đúng như đã đăng', payment: 'Không được trả công đúng hẹn', abuse: 'Người đăng có hành vi không phù hợp', other: 'Khác' },
    };
    return Object.entries(m[k] ?? REPORT_REASON_LABEL) as [ReportReason, string][];
  }

  protected addPics(input: HTMLInputElement): void {
    const urls = Array.from(input.files ?? []).map((f) => URL.createObjectURL(f));
    this.pics.update((l) => [...l, ...urls].slice(0, 4));
    input.value = '';
  }

  protected dropPic(u: string): void {
    this.pics.update((l) => l.filter((x) => x !== u));
  }

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    this.reports.create({ targetType: 'order', targetId: this.orderId(), reason: v.reason as ReportReason, detail: v.detail }).subscribe({
      next: () => this.sent.set(true),
      error: (e: Error) => {
        // 422 từ server: gắn lỗi vào đúng field
        if (e instanceof AppError && e.status === 422) {
          for (const d of e.details) this.form.get(d.field)?.setErrors({ server: d.message });
        }
        this.error.set(e.message);
      },
    });
  }
}
