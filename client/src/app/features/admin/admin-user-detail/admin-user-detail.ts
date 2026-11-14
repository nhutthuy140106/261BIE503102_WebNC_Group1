import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminApi, UserProfile, msgOf } from '../../../core/services/admin-api';
import { AuthService } from '../../../core/services/auth';
import { ORDER_STATE, ROLE, orderTone } from '../admin-labels';

const VERIF: Record<string, string> = { none: 'Chưa nộp hồ sơ', pending: 'Chờ duyệt', approved: 'Đã xác minh', rejected: 'Bị từ chối' };

/** Hồ sơ đầy đủ của một người dùng: số liệu, xác minh người bán, sổ Xu (admin cộng/trừ được), đơn gần đây, khóa/vai trò. */
@Component({
  selector: 'app-admin-user-detail',
  standalone: false,
  templateUrl: './admin-user-detail.html',
  styleUrls: ['../admin-shared.css', './admin-user-detail.css'],
})
export class AdminUserDetail implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly me = inject(AuthService).currentUser;
  private id = '';

  protected readonly p = signal<UserProfile | null>(null);
  protected readonly error = signal('');
  protected readonly ok = signal('');
  protected readonly busy = signal(false);
  protected readonly lockDlg = signal<boolean | null>(null); // true = khóa, false = mở khóa

  protected delta: number | null = null;
  protected reason = '';
  protected xuErr = '';
  protected role = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  protected isAdmin(): boolean { return this.me()?.role === 'admin'; }
  protected isSelf(): boolean { return this.me()?._id === this.id; }
  protected roleName = (r: string): string => ROLE[r] ?? r;
  protected verif = (s: string): string => VERIF[s] ?? s;
  protected state = (s: string): string => ORDER_STATE[s] ?? s;
  protected tone = orderTone;

  protected adjust(): void {
    const d = Math.round(Number(this.delta));
    if (!d || Math.abs(d) > 1000) { this.xuErr = 'Nhập số Xu từ 1 đến 1000 (số âm = trừ).'; return; }
    if (this.reason.trim().length < 5) { this.xuErr = 'Vui lòng ghi lý do (ít nhất 5 ký tự).'; return; }
    this.xuErr = '';
    this.run(this.api.adjustXu(this.id, d, this.reason.trim()), 'Đã cập nhật Xu và thông báo cho người dùng.', () => { this.delta = null; this.reason = ''; });
  }

  protected saveRole(): void {
    this.run(this.api.setRole(this.id, this.role), 'Đã đổi vai trò.');
  }

  protected lock(reason: string): void {
    const lock = this.lockDlg();
    this.lockDlg.set(null);
    this.run(lock ? this.api.lock(this.id, reason) : this.api.unlock(this.id), lock ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
  }

  private run(req: ReturnType<AdminApi['unlock']>, msg: string, after?: () => void): void {
    this.busy.set(true);
    this.ok.set('');
    this.error.set('');
    req.subscribe({
      next: () => { this.busy.set(false); this.ok.set(msg); after?.(); this.load(); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  private load(): void {
    this.api.profile(this.id).subscribe({
      next: (p) => { this.p.set(p); this.role = p.user.role; },
      error: (e: unknown) => this.error.set(msgOf(e, 'Không tải được hồ sơ.')),
    });
  }
}
