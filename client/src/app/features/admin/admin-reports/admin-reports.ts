import { Component, OnInit, inject, signal } from '@angular/core';
import { AppError } from '../../../core/models/api';
import { REPORT_REASON_LABEL, ReportReason } from '../../../core/models/social';
import { AdminReport, AdminService, ReportState } from '../../../core/services/admin';

const TARGET: Record<string, string> = { order: 'Đơn hàng', offer: 'Đề nghị', post: 'Bài đăng', job: 'Việc làm', user: 'Người dùng' };

/** Báo cáo vi phạm: tab theo trạng thái (mở → đang xem xét → đã xử lý / từ chối), ghi chú admin, "Ẩn bài này". */
@Component({
  selector: 'app-admin-reports',
  standalone: false,
  templateUrl: './admin-reports.html',
  styleUrls: ['../admin-shared.css', './admin-reports.css'],
})
export class AdminReports implements OnInit {
  private readonly admin = inject(AdminService);

  protected readonly tabs: { key: ReportState; label: string }[] = [
    { key: 'open', label: 'Mới' },
    { key: 'reviewing', label: 'Đang xem xét' },
    { key: 'resolved', label: 'Đã xử lý' },
    { key: 'rejected', label: 'Từ chối' },
  ];
  protected readonly all = signal<AdminReport[] | null>(null);
  protected readonly tab = signal<ReportState>('open');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly hideFor = signal<AdminReport | null>(null);
  /** Ghi chú đang soạn theo từng báo cáo */
  protected notes: Record<string, string> = {};
  protected noteErr = '';

  ngOnInit(): void {
    this.load();
  }

  protected list(): AdminReport[] {
    return (this.all() ?? []).filter((r) => r.state === this.tab());
  }

  protected count(s: ReportState): number {
    return (this.all() ?? []).filter((r) => r.state === s).length;
  }

  protected reason(r: string): string {
    return REPORT_REASON_LABEL[r as ReportReason] ?? r;
  }

  protected target(t: string): string {
    return TARGET[t] ?? t;
  }

  /** Chuyển trạng thái; kết thúc (xử lý/từ chối) bắt buộc có ghi chú, giống server. */
  protected move(r: AdminReport, to: ReportState): void {
    const note = (this.notes[r._id] ?? r.adminNote ?? '').trim();
    if ((to === 'resolved' || to === 'rejected') && note.length < 3) {
      this.noteErr = r._id;
      return;
    }
    this.noteErr = '';
    this.run(this.admin.transition(r._id, to, note), () => {
      this.tab.set(to);
    });
  }

  protected confirmHide(reason: string): void {
    const r = this.hideFor();
    if (r) this.run(this.admin.hidePost(r.targetId, reason), () => this.hideFor.set(null));
  }

  private run(req: ReturnType<AdminService['hidePost']>, done: () => void): void {
    this.busy.set(true);
    req.subscribe({
      next: () => {
        this.busy.set(false);
        done();
        this.load();
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.hideFor.set(null);
        this.error.set(e instanceof AppError ? e.message : 'Chưa thực hiện được, bạn thử lại sau nhé.');
      },
    });
  }

  private load(): void {
    this.admin.listReports().subscribe({
      next: (r) => this.all.set(r),
      error: () => {
        this.all.set([]);
        this.error.set('Không tải được báo cáo.');
      },
    });
  }
}
