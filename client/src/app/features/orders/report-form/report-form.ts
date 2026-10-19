import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppError } from '../../../core/models/api';
import { REPORT_REASON_LABEL, ReportReason } from '../../../core/models/social';
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

  protected readonly reasons = Object.entries(REPORT_REASON_LABEL) as [ReportReason, string][];
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
    this.orders.getOrder(id).subscribe({ next: (o) => this.title.set(`${o.code} · ${o.postTitle}`), error: () => this.title.set('') });
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
