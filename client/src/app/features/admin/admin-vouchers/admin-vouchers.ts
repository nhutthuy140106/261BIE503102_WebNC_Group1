import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApi, VoucherDef, msgOf } from '../../../core/services/admin-api';
import { AuthService } from '../../../core/services/auth';

interface Form { cid: string; title: string; cond: string; kind: 'amount' | 'ship'; amount: number | null; min: number | null; cost: number | null }
const blank = (): Form => ({ cid: '', title: '', cond: '', kind: 'amount', amount: null, min: 0, cost: null });

/** Voucher đổi bằng Xu: admin tạo, sửa giá đổi, bật/tắt. Tắt thì không đổi mới được, voucher người dùng đã đổi vẫn dùng bình thường. */
@Component({
  selector: 'app-admin-vouchers',
  standalone: false,
  templateUrl: './admin-vouchers.html',
  styleUrls: ['../admin-shared.css'],
})
export class AdminVouchers implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly me = inject(AuthService).currentUser;
  protected readonly rows = signal<VoucherDef[] | null>(null);
  protected readonly error = signal('');
  protected readonly ok = signal('');
  protected readonly busy = signal(false);
  protected readonly editing = signal<VoucherDef | null>(null);
  protected f: Form = blank();
  protected formErr = '';

  ngOnInit(): void {
    this.load();
  }

  protected isAdmin(): boolean { return this.me()?.role === 'admin'; }

  protected edit(v: VoucherDef): void {
    this.editing.set(v);
    this.f = { cid: v.cid, title: v.title, cond: v.cond, kind: v.ship ? 'ship' : 'amount', amount: v.amount || null, min: v.min, cost: v.cost };
    this.formErr = '';
  }
  protected reset(): void {
    this.editing.set(null);
    this.f = blank();
    this.formErr = '';
  }

  protected save(): void {
    const f = this.f;
    if (!this.editing() && !/^[a-z0-9-]{2,20}$/.test(f.cid)) { this.formErr = 'Mã gồm chữ thường, số, gạch ngang (2–20 ký tự).'; return; }
    if (f.title.trim().length < 3) { this.formErr = 'Cần tên voucher (ít nhất 3 ký tự).'; return; }
    if (!f.cost || f.cost < 1) { this.formErr = 'Giá đổi tối thiểu 1 Xu.'; return; }
    if (f.kind === 'amount' && !(f.amount && f.amount > 0)) { this.formErr = 'Nhập số tiền giảm (lớn hơn 0).'; return; }
    this.formErr = '';
    const body = { title: f.title.trim(), cond: f.cond.trim(), ship: f.kind === 'ship', amount: f.kind === 'ship' ? 0 : Math.round(f.amount ?? 0), min: Math.round(f.min ?? 0), cost: Math.round(f.cost) };
    const cur = this.editing();
    this.run(cur ? this.api.updateVoucher(cur._id, body) : this.api.createVoucher({ ...body, cid: f.cid }), cur ? 'Đã lưu voucher.' : 'Đã tạo voucher, người dùng đổi được ngay.', () => this.reset());
  }

  protected toggle(v: VoucherDef): void {
    this.run(this.api.updateVoucher(v._id, { active: !v.active }), v.active ? 'Đã tắt voucher: không đổi mới được nữa.' : 'Đã bật lại voucher.');
  }

  private run(req: ReturnType<AdminApi['createVoucher']>, msg: string, after?: () => void): void {
    this.busy.set(true);
    this.ok.set('');
    this.error.set('');
    req.subscribe({
      next: () => { this.busy.set(false); this.ok.set(msg); after?.(); this.load(); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  private load(): void {
    this.api.vouchers().subscribe({ next: (r) => this.rows.set(r), error: (e: unknown) => { this.rows.set([]); this.error.set(msgOf(e, 'Không tải được voucher.')); } });
  }
}
