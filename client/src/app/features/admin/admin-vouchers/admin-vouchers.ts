import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { AdminApi, VoucherDef, msgOf } from '../../../core/services/admin-api';
import { AuthService } from '../../../core/services/auth';

interface Form { cid: string; title: string; cond: string; kind: 'amount' | 'ship'; amount: number | null; min: number | null; cost: number | null }
const blank = (): Form => ({ cid: '', title: '', cond: '', kind: 'amount', amount: null, min: null, cost: null });

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
  /** Hộp thoại tạo / sửa voucher đang mở */
  protected readonly open = signal(false);
  protected f: Form = blank();
  protected formErr = '';
  /** Các ô bắt buộc đang thiếu hoặc sai (viền đỏ sau khi bấm Tạo) */
  protected bad = new Set<string>();

  ngOnInit(): void {
    this.load();
  }

  protected isAdmin(): boolean { return this.me()?.role === 'admin'; }

  protected openNew(): void {
    this.reset();
    this.open.set(true);
  }

  protected close(): void {
    this.reset();
    this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }

  protected edit(v: VoucherDef): void {
    this.open.set(true);
    this.editing.set(v);
    this.f = { cid: v.cid, title: v.title, cond: v.cond, kind: v.ship ? 'ship' : 'amount', amount: v.amount || null, min: v.min, cost: v.cost };
    this.formErr = '';
  }
  /** Mũi tên gốc của trình duyệt (ô số vô hình ở mép phải ô tiền): mỗi lần bấm cộng hoặc trừ 1.000đ rồi trả ô về 0 */
  protected spin(key: 'amount' | 'min', e: Event): void {
    const el = e.target as HTMLInputElement;
    const dir = +el.value > 0 ? 1 : -1;
    el.value = '0';
    const floor = key === 'amount' ? 1000 : 0;
    this.f[key] = Math.max(floor, (this.f[key] ?? 0) + dir * 1000);
  }

  /** Bấm vào ô tiền (trừ vùng mũi tên bên phải): chuyển con trỏ sang ô tiền thật để gõ; phần mũi tên vẫn là của ô số gốc */
  protected grab(e: MouseEvent, wrap: HTMLElement): void {
    const el = e.target as HTMLElement;
    if (e.offsetX >= el.clientWidth - 26) return; // vùng mũi tên: để trình duyệt tự xử lý
    e.preventDefault();
    wrap.classList.add('editing');
    (wrap.querySelector('input:not(.spin)') as HTMLInputElement).focus();
  }

  protected reset(): void {
    this.editing.set(null);
    this.f = blank();
    this.formErr = '';
    this.bad = new Set<string>();
  }

  protected save(): void {
    const f = this.f;
    // mọi ô đều bắt buộc điền: mã (2–30 ký tự, giữ đúng như nhập), tên, số tiền giảm (voucher giảm tiền), đơn tối thiểu (nhập 0 nếu không có), giá đổi
    const cid = f.cid.trim();
    const bad = new Set<string>();
    if (cid.length < 2) bad.add('cid');
    if (f.title.trim().length < 3) bad.add('title');
    if (f.kind === 'amount' && !(f.amount && f.amount > 0)) bad.add('amount');
    if (f.min === null || f.min === undefined || !(f.min >= 0)) bad.add('min');
    if (!f.cost || f.cost < 1) bad.add('cost');
    this.bad = bad;
    if (bad.size) { this.formErr = 'Vui lòng điền đầy đủ các ô có dấu *.'; return; }
    this.formErr = '';
    const body = { title: f.title.trim(), cond: this.condText(f), ship: f.kind === 'ship', amount: f.kind === 'ship' ? 0 : Math.round(f.amount ?? 0), min: Math.round(f.min ?? 0), cost: Math.round(f.cost ?? 0) };
    const cur = this.editing();
    this.run(cur ? this.api.updateVoucher(cur._id, { ...body, cid }) : this.api.createVoucher({ ...body, cid }), cur ? 'Đã lưu voucher.' : 'Đã tạo voucher, người dùng đổi được ngay.', () => this.close());
  }

  /** Dòng điều kiện khách đọc: tự sinh từ "Đơn tối thiểu" để không bao giờ lệch với luật thật; voucher miễn phí giao giữ ghi chú cũ khi sửa */
  private condText(f: Form): string {
    if (f.kind === 'amount') return f.min && f.min > 0 ? `Đơn từ ${Math.round(f.min).toLocaleString('vi-VN')}đ` : '';
    return f.cond.trim() || 'Đơn có giao tận cửa';
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
