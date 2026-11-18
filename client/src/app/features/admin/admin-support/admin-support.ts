import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApi, Ticket, msgOf } from '../../../core/services/admin-api';
import { TOPIC } from '../admin-labels';

const STATE: Record<string, string> = { open: 'Chờ trả lời', answered: 'Đã trả lời', closed: 'Đã đóng' };

/** Hộp thư hỗ trợ: danh sách phiếu bên trái, hội thoại + ô trả lời bên phải. Trả lời xong người dùng nhận thông báo. */
@Component({
  selector: 'app-admin-support',
  standalone: false,
  templateUrl: './admin-support.html',
  styleUrls: ['../admin-shared.css', './admin-support.css'],
})
export class AdminSupport implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly tabs = [{ k: 'open', t: 'Chờ trả lời' }, { k: 'answered', t: 'Đã trả lời' }, { k: 'closed', t: 'Đã đóng' }];
  protected readonly tab = signal('open');
  protected readonly rows = signal<Ticket[] | null>(null);
  protected readonly sel = signal<Ticket | null>(null);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected text = '';
  protected textErr = false;

  ngOnInit(): void {
    this.load();
  }

  protected state = (s: string): string => STATE[s] ?? s;
  protected topic = (t: string): string => TOPIC[t] ?? t;
  protected tone = (s: string): string => (s === 'open' ? 'warn' : s === 'answered' ? 'info' : 'mute');
  protected last = (t: Ticket): string => t.messages[t.messages.length - 1]?.text ?? '';

  protected pick(k: string): void {
    this.tab.set(k);
    this.sel.set(null);
    this.load();
  }
  protected open(t: Ticket): void {
    this.api.ticket(t._id).subscribe({ next: (x) => { this.sel.set(x); this.text = ''; this.textErr = false; }, error: (e: unknown) => this.error.set(msgOf(e)) });
  }

  protected send(): void {
    const t = this.sel();
    if (!t) return;
    if (this.text.trim().length < 2) { this.textErr = true; return; }
    this.textErr = false;
    this.busy.set(true);
    this.api.replyTicket(t._id, this.text.trim()).subscribe({
      next: (x) => { this.busy.set(false); this.sel.set(x); this.text = ''; this.load(); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  protected close(): void {
    const t = this.sel();
    if (!t) return;
    this.busy.set(true);
    this.api.closeTicket(t._id).subscribe({
      next: (x) => { this.busy.set(false); this.sel.set(x); this.load(); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  private load(): void {
    this.error.set('');
    this.api.tickets(this.tab(), 1).subscribe({
      next: (r) => this.rows.set(r.data),
      error: (e: unknown) => { this.rows.set([]); this.error.set(msgOf(e, 'Không tải được hộp thư.')); },
    });
  }
}
