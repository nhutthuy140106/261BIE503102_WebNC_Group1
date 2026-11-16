import { Component, OnInit, inject, signal } from '@angular/core';
import { AppError } from '../../../core/models/api';
import { REPORT_REASON_LABEL, ReportReason } from '../../../core/models/social';
import { AdminReport, AdminService, ReportState } from '../../../core/services/admin';
import { AdminApi, ReportContext } from '../../../core/services/admin-api';
import { ORDER_STATE } from '../admin-labels';

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
  private readonly api = inject(AdminApi);
  /** Bối cảnh đã tải theo từng báo cáo (bài/đơn/người bị báo, số báo cáo cùng đối tượng) */
  protected readonly ctx = signal<Record<string, ReportContext | 'loading' | 'none'>>({});

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

  /** Nút xử lý theo loại đối tượng bị báo cáo (mỗi nút làm thật rồi đóng báo cáo) */
  protected actionsFor(r: AdminReport): { key: string; label: string; danger?: boolean }[] {
    const type = r.targetType;
    const st = r.target?.status ?? '';
    const ACTIVE = ['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'delivering', 'ready'];
    // đơn: có báo vấn đề chờ phân xử → mở trang phân xử; đơn còn đang chạy → hủy đơn; đơn đã xong và không có gì để phân xử → chỉ nhắc nhở / không vi phạm
    const order = r.target?.issueSt === 'open' || r.target?.issueSt === 'rejected'
      ? [{ key: 'order_ruled', label: 'Phân xử đơn', danger: true }]
      : ACTIVE.includes(st) ? [{ key: 'cancel_order', label: 'Hủy đơn', danger: true }] : [];
    const first: Record<string, { key: string; label: string; danger?: boolean }[]> = {
      post: [{ key: 'hide_post', label: 'Ẩn bài', danger: true }],
      user: [{ key: 'lock_user', label: 'Khóa tài khoản', danger: true }],
      order,
      job: [{ key: 'close_job', label: 'Đóng việc', danger: true }],
    };
    return [...(first[type] ?? []), { key: 'warn_owner', label: 'Nhắc nhở' }];
  }

  protected msgFor(key: string): string {
    const m: Record<string, string> = {
      hide_post: 'Bài sẽ không còn hiện với người dùng khác.',
      lock_user: 'Người này sẽ không đăng nhập được nữa.',
      close_job: 'Việc sẽ đóng, không nhận thêm đề nghị.',
      cancel_order: 'Đơn bị hủy, kho và voucher được trả lại; cả hai bên nhận thông báo.',
      warn_owner: 'Người bị báo cáo nhận một thông báo nhắc nhở; không ẩn hay khóa gì.',
      none: 'Báo cáo được đóng; người báo cáo nhận thông báo là chưa được chấp nhận.',
    };
    return m[key] ?? '';
  }

  protected actionLabel(a?: string): string {
    const all: Record<string, string> = { hide_post: 'Đã ẩn bài', lock_user: 'Đã khóa tài khoản', warn_owner: 'Đã nhắc nhở người bị báo cáo', order_ruled: 'Đã phân xử đơn', close_job: 'Đã đóng việc', none: 'Không vi phạm — không xử lý' };
    return a ? all[a] ?? a : 'Chưa ghi nhận';
  }

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

  /** Trạng thái đối tượng bị báo cáo, viết tiếng Việt theo loại đối tượng */
  protected objStatus(type: string, st: string): string {
    const map: Record<string, Record<string, string>> = {
      order: ORDER_STATE,
      post: { open: 'Đang mở', soldout: 'Hết hàng', closed: 'Đã đóng', hidden: 'Bị ẩn', draft: 'Bản nháp' },
      user: { active: 'Hoạt động', locked: 'Đã khóa' },
      job: { open: 'Đang mở', closed: 'Đã đóng', done: 'Hoàn thành', cancelled: 'Đã hủy' },
      offer: { pending: 'Chờ chọn', chosen: 'Được chọn', rejected: 'Không được chọn', done: 'Hoàn thành' },
    };
    return map[type]?.[st] ?? st;
  }

  protected target(t: string): string {
    return TARGET[t] ?? t;
  }

  protected readonly pick = signal<{ r: AdminReport; a: { key: string; label: string; danger?: boolean } } | null>(null);

  protected move(r: AdminReport, to: ReportState, note: string, action: string): void {
    this.run(this.admin.transition(r._id, to, note, action), () => {
      this.tab.set(to);
    });
  }

  /** Bấm nút xử lý → xác nhận kèm lý do → (đang xem xét) → đóng báo cáo với hướng xử lý đó */
  protected confirmPick(reason: string): void {
    const p = this.pick();
    if (!p) return;
    if (p.a.key === 'cancel_order') {
      // hủy đơn ở server sẽ tự đóng báo cáo về đơn này
      this.busy.set(true);
      this.api.cancelOrder(p.r.targetId, reason).subscribe({
        next: () => { this.busy.set(false); this.pick.set(null); this.tab.set('resolved'); this.load(); },
        error: (e: unknown) => { this.busy.set(false); this.pick.set(null); this.error.set(e instanceof AppError ? e.message : 'Chưa hủy được đơn, bạn thử lại sau nhé.'); },
      });
      return;
    }
    const none = p.a.key === 'none';
    this.run(this.admin.transition(p.r._id, none ? 'rejected' : 'resolved', reason, none ? '' : p.a.key), () => {
      this.pick.set(null);
      this.tab.set(none ? 'rejected' : 'resolved');
    });
  }

  protected toggleCtx(r: AdminReport): void {
    const cur = this.ctx()[r._id];
    if (cur) {
      const { [r._id]: _drop, ...rest } = this.ctx();
      this.ctx.set(rest);
      return;
    }
    this.ctx.update((c) => ({ ...c, [r._id]: 'loading' }));
    this.api.reportDetail(r._id).subscribe({
      next: (d) => this.ctx.update((c) => ({ ...c, [r._id]: d.context })),
      error: () => this.ctx.update((c) => ({ ...c, [r._id]: 'none' })),
    });
  }

  protected c(r: AdminReport): ReportContext | null {
    const v = this.ctx()[r._id];
    return v && v !== 'loading' && v !== 'none' ? v : null;
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
        this.pick.set(null);
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
