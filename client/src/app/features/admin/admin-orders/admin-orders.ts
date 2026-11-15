import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApi, OrderRow, msgOf } from '../../../core/services/admin-api';
import { ISSUE_STATE, ORDER_STATE, issueTone, orderTone } from '../admin-labels';

/** Mọi đơn của khu: lọc theo trạng thái / đang báo vấn đề / mã đơn; bấm một dòng để xem chi tiết và phân xử. */
@Component({
  selector: 'app-admin-orders',
  standalone: false,
  templateUrl: './admin-orders.html',
  styleUrls: ['../admin-shared.css'],
})
export class AdminOrders implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);

  /** Lựa chọn cho ô lọc trạng thái (thêm mục "Mọi trạng thái" ở đầu) */
  protected get stateOptions(): { value: unknown; label: string }[] {
    return [{ value: '', label: 'Mọi trạng thái' }, ...this.states.map((s) => ({ value: s[0], label: s[1] }))];
  }
  protected readonly states = Object.entries(ORDER_STATE);
  protected readonly rows = signal<OrderRow[] | null>(null);
  protected readonly total = signal(0);
  protected readonly error = signal('');
  protected state = '';
  protected issue = '';
  protected q = '';
  protected page = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const p = this.route.snapshot.queryParamMap;
    this.issue = p.get('issue') ?? '';
    this.state = p.get('state') ?? '';
    this.load();
  }

  protected label = (s: string): string => ORDER_STATE[s] ?? s;
  protected tone = orderTone;
  protected issueLabel = (s: string): string => ISSUE_STATE[s] ?? s;
  protected issueTone = issueTone;
  protected pages(): number {
    return Math.max(1, Math.ceil(this.total() / 10));
  }
  protected filter(delay = 0): void {
    this.page = 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(), delay);
  }
  protected go(p: number): void {
    this.page = p;
    this.load();
  }

  protected load(): void {
    this.error.set('');
    this.api.orders({ state: this.state || undefined, issue: this.issue || undefined, q: this.q || undefined, page: this.page }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.meta.total); },
      error: (e: unknown) => { this.rows.set([]); this.error.set(msgOf(e, 'Không tải được danh sách đơn.')); },
    });
  }
}
