import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApi, OrderDetail, msgOf } from '../../../core/services/admin-api';
import { ISSUE_STATE, ORDER_STATE, PAYMENT, issueTone, orderTone } from '../admin-labels';

type Decision = 'refund' | 'redo' | 'reject';
const ACTIVE = ['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'delivering', 'ready'];

/** Chi tiết một đơn: thông tin, tiến trình, tin nhắn (có ghi nhật ký), phân xử báo vấn đề, hủy đơn vi phạm. */
@Component({
  selector: 'app-admin-order-detail',
  standalone: false,
  templateUrl: './admin-order-detail.html',
  styleUrls: ['../admin-shared.css', './admin-order-detail.css'],
})
export class AdminOrderDetail implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private id = '';

  protected readonly o = signal<OrderDetail | null>(null);
  protected readonly error = signal('');
  protected readonly done = signal('');
  protected readonly busy = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly chatOpen = signal(false);

  protected decision: Decision = 'refund';
  protected amount: number | null = null;
  protected note = '';
  protected noteErr = false;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load(false);
  }

  protected label = (s: string): string => ORDER_STATE[s] ?? s;
  protected tone = orderTone;
  protected issueLabel = (s: string): string => ISSUE_STATE[s] ?? s;
  protected issueTone = issueTone;
  protected pay = (p: string): string => PAYMENT[p] ?? p;
  protected isActive = (s: string): boolean => ACTIVE.includes(s);

  /** Chỉ phân xử khi người bán chưa trả lời hoặc đã từ chối */
  protected canJudge(o: OrderDetail): boolean {
    const st = o.full.issue?.st;
    return st === 'open' || st === 'rejected';
  }

  protected showChat(): void {
    this.chatOpen.set(true);
    this.load(true);
  }

  protected judge(o: OrderDetail): void {
    if (this.note.trim().length < 5) { this.noteErr = true; return; }
    this.noteErr = false;
    this.busy.set(true);
    this.api.resolveIssue(o._id, { decision: this.decision, amount: this.decision === 'refund' && this.amount ? Math.round(this.amount) : undefined, note: this.note.trim() }).subscribe({
      next: () => { this.busy.set(false); this.note = ''; this.done.set('Đã ghi nhận quyết định. Cả người mua và người bán đều được thông báo.'); this.load(this.chatOpen()); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  protected cancel(reason: string): void {
    this.busy.set(true);
    this.api.cancelOrder(this.id, reason).subscribe({
      next: () => { this.busy.set(false); this.cancelling.set(false); this.done.set('Đã hủy đơn, kho và voucher được trả lại.'); this.load(this.chatOpen()); },
      error: (e: unknown) => { this.busy.set(false); this.cancelling.set(false); this.error.set(msgOf(e)); },
    });
  }

  private load(chat: boolean): void {
    this.error.set('');
    this.api.order(this.id, chat).subscribe({
      next: (o) => { this.o.set(o); if (this.amount === null) this.amount = o.total; },
      error: (e: unknown) => this.error.set(msgOf(e, 'Không tải được đơn.')),
    });
  }
}
