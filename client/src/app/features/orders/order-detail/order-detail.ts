import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { useMock } from '../../../core/config/api.config';
import { AppError } from '../../../core/models/api';
import { OFFER_STEPS, OFFER_STATE_LABEL, Offer, OfferState } from '../../../core/models/offer';
import { ISSUE_HOURS, Order, OrderIssue } from '../../../core/models/order';
import { Post } from '../../../core/models/post';
import { JobOfferService } from '../../../core/services/job-offer';
import { OrderService } from '../../../core/services/order';
import { PostService } from '../../../core/services/post';
import { ReviewService } from '../../../core/services/review';
import { ToastService } from '../../../core/services/toast';
import { XuService } from '../../../core/services/xu';
import { placedStepNames } from '../../../core/utils/placed-steps';
import { canSeeExactAddress } from '../../../core/utils/offer-state';
import { formatDateTime, formatTime, statusLabel } from '../../../core/utils/status-label';

/** Một nút trong bảng hành động bên phải: `main` = nút cam chính, `warn` = nút viền đỏ cam, còn lại = nút viền. */
interface Btn {
  id: string;
  label: string;
  kind: 'main' | 'ghost' | 'warn';
}

type DlgType =
  | 'edit' | 'withdraw' | 'start' | 'report' | 'rcancel' | 'unpaid' | 'rate'
  | 'pcancel' | 'received' | 'issue' | 'resched' | 'approve' | 'reject';

const R_REASONS = ['Tôi bận đột xuất', 'Không liên lạc được người đăng', 'Việc khác với mô tả', 'Lý do khác'];
const P_REASONS = {
  service: ['Đặt nhầm / không cần nữa', 'Muốn đổi sang giờ khác', 'Tìm được người làm khác', 'Lý do khác'],
  other: ['Đặt nhầm món / số lượng', 'Không cần nữa', 'Chờ lâu quá', 'Lý do khác'],
};
const ISSUE_TYPES = {
  food: ['Sai món', 'Thiếu món / thiếu phần', 'Món bị hỏng, có vấn đề vệ sinh', 'Khác'],
  goods: ['Có lỗi không được nêu trong bài', 'Không đúng món / mẫu trong ảnh', 'Thiếu phụ kiện đã ghi', 'Khác'],
  service: ['Làm chưa kỹ / còn sót', 'Không đúng việc đã thỏa thuận', 'Làm hư đồ của mình', 'Khác'],
};
const ISSUE_WANTS = { food: ['Làm lại món', 'Hoàn tiền'], goods: ['Trả hàng, nhận lại tiền'], service: ['Làm lại miễn phí', 'Giảm tiền'] };
const ISSUE_LABEL = { food: 'Báo vấn đề với món', goods: 'Yêu cầu trả hàng', service: 'Báo dịch vụ chưa đạt' };
const DAY_SLOTS = ['8:00', '9:00', '10:00', '13:00', '14:00', '15:00', '17:00', '18:00', '19:00', '20:00'];
const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * Chi tiết đơn — bê từ design/mockups/orders.html: Đơn đã đặt (duyệt giá, đổi lịch, hủy, báo vấn đề / trả hàng,
 * đánh giá) và Việc đã nhận (thanh 5 bước, hành động hợp lệ từng bước, nhận tiền công, đánh giá).
 * Các nút "Mô phỏng …" (chỉ ở chế độ mock) thay cho phía người bán / người đăng.
 */
@Component({
  selector: 'app-order-detail',
  standalone: false,
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly offerService = inject(JobOfferService);
  private readonly reviewService = inject(ReviewService);
  private readonly postService = inject(PostService);
  private readonly toast = inject(ToastService);
  private readonly xu = inject(XuService);

  protected readonly order = signal<Order | null>(null);
  protected readonly offer = signal<Offer | null>(null);
  protected readonly job = signal<Post | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly isMock = useMock('order');
  protected readonly label = statusLabel;
  protected readonly fmt = formatDateTime;

  // ----- hộp thoại -----
  protected readonly dlg = signal<DlgType | null>(null);
  protected readonly pick = signal('');
  protected readonly pick2 = signal('');
  protected readonly text = signal('');
  protected readonly photos = signal(0);
  protected readonly stars = signal(0);
  protected readonly bad = signal<string>('');
  protected readonly rReasons = R_REASONS;
  protected readonly days = this.buildDays();
  protected readonly daySlots = DAY_SLOTS;
  protected readonly dlgNow = signal(true);

  protected readonly showAddress = computed(() => {
    const o = this.offer();
    return !!o?.exactAddress && canSeeExactAddress(o.state);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => this.load(params.get('id') ?? ''));
  }

  private load(id: string): void {
    this.loading.set(true);
    this.orderService.getOrder(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.job.set(null);
        if (o.type === 'received') {
          this.offerService.get(id).subscribe((of) => {
            this.offer.set(of);
            this.postService.getPostById(of.jobId).subscribe((p) => this.job.set(p ?? null));
          });
        }
        if (o.type === 'placed') this.postService.getPostById(o.postId).subscribe((p) => this.job.set(p ?? null));
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.order.set(null);
        this.error.set(e instanceof AppError && e.status === 404 ? null : e.message);
        this.loading.set(false);
      },
    });
  }

  // =============================================================
  // Chung
  // =============================================================
  private low(n: string): string {
    return n.replace(/^(Chị|Anh|Cô|Chú) /, (m) => m.toLowerCase());
  }

  protected vnd(n: number): string {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  }

  protected date(ms: number): string {
    return new Date(ms).toLocaleDateString('vi-VN');
  }

  private buildDays(): string[] {
    return [0, 1, 2, 3, 4, 5].map((i) => {
      const x = new Date();
      x.setDate(x.getDate() + i);
      return i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : WEEKDAYS[x.getDay()] + ' ' + x.getDate() + '/' + (x.getMonth() + 1);
    });
  }

  private fail(e: Error): void {
    this.error.set(e instanceof AppError && e.details.length ? e.details.map((d) => d.message).join(' ') : e.message);
  }

  protected open(t: DlgType, init: { text?: string } = {}): void {
    this.pick.set('');
    this.pick2.set('');
    this.text.set(init.text ?? '');
    this.photos.set(0);
    this.stars.set(0);
    this.bad.set('');
    this.dlg.set(t);
  }

  protected close(): void {
    this.dlg.set(null);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.close();
  }

  protected go(a: string): void {
    const o = this.order();
    if (!o) return;
    if (a === 'chat') this.router.navigate(['/messenger'], { queryParams: { to: o.counterpartName, av: o.counterpartAvatar } });
    else if (a === 'issue') this.router.navigate(['/orders', o._id, 'report']);
    else if (a === 'more') this.router.navigate(['/search'], { queryParams: o.type === 'received' ? { kind: 'job' } : {} });
    else if (a === 'post') this.router.navigate([o.type === 'received' ? '/posts/job' : '/posts', o.type === 'received' ? this.offer()?.jobId : o.postId]);
  }

  // =============================================================
  // Đơn đã đặt
  // =============================================================
  protected kind(o: Order): 'food' | 'goods' | 'service' {
    return o.kind ?? 'goods';
  }

  /** Dịch vụ có giá chưa chắc và đã tới lúc cần duyệt giá → thêm bước "Duyệt giá" */
  protected priceStep(o: Order): boolean {
    const pc = o.priceCheck;
    return !!pc && (pc !== 'surcharge' || !!o.newPrice || !!o.priceDone || !!o.priceRejected);
  }

  protected placedSteps(o: Order): { label: string; cls: string; time: string; n: number }[] {
    const ps = this.priceStep(o);
    const names = placedStepNames(o.kind, ps);
    const sh = ps ? 1 : 0;
    const posMap: Record<string, number> = { pending: 0, confirmed: 1, pricing: 2, preparing: 2 + sh, delivering: 3 + sh, ready: 3 + sh, done: 4 + sh };
    const pos = posMap[o.status as string] ?? 0;
    const stopped = ['cancelled', 'declined'].includes(o.status as string);
    const cutMap: Record<string, number> = { pending: 0, confirmed: 1, pricing: 2, preparing: 2 + sh, delivering: 3 + sh, ready: 3 + sh };
    const cutAt = o.priceRejected ? 2 : o.cancelFrom ? Math.min(names.length - 1, (cutMap[o.cancelFrom] ?? 0) + 1) : 1;
    if (stopped) names[cutAt] = o.priceRejected ? 'Đã từ chối giá' : this.label(o);
    const times = (o.history ?? []).map((h) => formatTime(h.at));
    return names.map((label, i) => {
      const cls = stopped ? (i < cutAt ? 'ok' : i === cutAt ? 'cut' : '') : i < pos ? 'ok' : i === pos ? 'cur' : '';
      return { label, cls, time: cls === 'ok' || cls === 'cur' ? i === 0 ? '' : times[i] ?? '' : '', n: i + 1 };
    });
  }

  protected issueLeft(o: Order): number {
    const at = o.doneAt ?? (o.doneAgoH != null ? Date.now() - o.doneAgoH * 3600e3 : 0);
    return ISSUE_HOURS[this.kind(o)] - (Date.now() - at) / 3600e3;
  }

  protected issueOpen(o: Order): boolean {
    return !!o.issue && o.issue.st !== 'closed';
  }

  protected leftText(h: number): string {
    return h >= 1 ? 'còn ' + Math.floor(h) + ' giờ' : 'còn ' + Math.max(1, Math.round(h * 60)) + ' phút';
  }

  protected canResched(o: Order): boolean {
    return this.kind(o) === 'service' && ['pending', 'confirmed'].includes(o.status as string) && !!o.detail?.when;
  }

  /** Nội dung bảng hành động của đơn đã đặt: tiêu đề + lời giải thích + các nút */
  protected placedPanel(o: Order): { h: string; why: string; btns: Btn[] } {
    const sl = o.counterpartName;
    const k = this.kind(o);
    const pc = o.priceCheck;
    const rs = o.resched;
    const lateNote = k === 'service' && o.apptIn != null && o.apptIn < 2 ? ' Còn dưới 2 giờ tới giờ hẹn — hủy lúc này sẽ ghi "hủy sát giờ" vào hồ sơ.' : '';
    const reschBtn: Btn[] = this.canResched(o) && !rs ? [{ id: 'resched', label: 'Đổi lịch', kind: 'ghost' }] : [];
    const iss = o.issue;
    if (iss && iss.st !== 'closed') {
      const base: Record<string, { h: string; why: string; btns: Btn[] }> = {
        open: { h: 'Đã gửi cho ' + sl, why: sl + ' sẽ ' + (k === 'food' ? 'chọn làm lại, hoàn một phần hoặc hoàn hết' : k === 'goods' ? 'trả lời có nhận lại hàng không' : 'chọn làm lại miễn phí hoặc giảm tiền') + '. Bạn sẽ nhận thông báo khi có phản hồi.', btns: [] },
        redo: { h: sl + ' sẽ làm lại', why: iss.reply ?? '', btns: [{ id: 'issue-done', label: k === 'food' ? 'Đã nhận món làm lại' : 'Đã làm lại xong', kind: 'main' }] },
        refund: { h: sl + ' hoàn ' + this.vnd(iss.amount ?? 0), why: (iss.reply ?? '') + ' ' + sl + ' chuyển trả trực tiếp cho bạn — AntGo không giữ tiền. Nhận được thì bấm xác nhận.', btns: [{ id: 'issue-paid', label: 'Đã nhận tiền hoàn ' + this.vnd(iss.amount ?? 0), kind: 'main' }, { id: 'issue', label: 'Chưa nhận được tiền?', kind: 'ghost' }] },
        returnAgreed: { h: sl + ' đồng ý nhận lại hàng', why: (iss.reply ?? '') + ' Khi trả hàng, ' + sl + ' trả lại ' + this.vnd(iss.amount ?? 0) + ' trực tiếp cho bạn.', btns: [{ id: 'issue-paid', label: 'Đã trả hàng & nhận ' + this.vnd(iss.amount ?? 0), kind: 'main' }, { id: 'issue', label: 'Có trục trặc khi trả hàng?', kind: 'ghost' }] },
        rejected: { h: sl + ' không đồng ý', why: (iss.reply ?? '') + ' Hai bên chưa thỏa thuận được thì nhờ AntGo xem giúp: AntGo ghi nhận, có thể hạ uy tín hoặc khóa tài khoản vi phạm, nhưng không ép hoàn tiền.', btns: [{ id: 'issue', label: 'Nhờ AntGo hỗ trợ', kind: 'main' }, { id: 'issue-drop', label: 'Thôi, đóng yêu cầu', kind: 'ghost' }] },
      };
      return base[iss.st];
    }
    if (rs?.by === 'seller') {
      return {
        h: sl + ' xin đổi giờ hẹn', why: sl + ' đề nghị giờ mới. Bạn đồng ý thì đơn đổi sang giờ mới; không đồng ý thì vẫn giữ giờ cũ.',
        btns: [{ id: 'resched-yes', label: 'Đồng ý giờ mới', kind: 'main' }, { id: 'resched', label: 'Chọn giờ khác', kind: 'ghost' }, { id: 'resched-no', label: 'Giữ giờ cũ', kind: 'warn' }],
      };
    }
    switch (o.status as string) {
      case 'pricing': {
        const np = o.newPrice;
        return {
          h: pc === 'quote' ? sl + ' đã báo giá sửa' : pc === 'surcharge' ? sl + ' báo phụ thu' : 'Duyệt giá cuối',
          why: sl + ' báo giá sau khi ' + (pc === 'quote' ? 'kiểm tra máy' : pc === 'surcharge' ? 'xem đồ thực tế' : 'cân đồ thực tế') + '. Đơn chỉ làm tiếp khi bạn đồng ý.',
          btns: np ? [{ id: 'approve', label: 'Đồng ý · ' + this.vnd(np.total), kind: 'main' }, { id: 'reject', label: 'Từ chối giá này', kind: 'warn' }] : [],
        };
      }
      case 'pending':
        return { h: 'Chờ bên bán xác nhận', why: sl + ' sẽ phản hồi sớm. Chưa xác nhận thì bạn hủy được ngay.', btns: [...reschBtn, { id: 'cancel', label: 'Hủy đơn', kind: 'warn' }] };
      case 'confirmed':
        return { h: 'Đơn đã được nhận', why: sl + ' đã xác nhận. Theo dõi thời gian và cách giao nhận ở bên trái.' + (k === 'service' && o.apptIn != null ? (o.apptIn >= 2 ? ' Hủy miễn phí tới 2 giờ trước giờ hẹn.' : lateNote) : ''), btns: [...reschBtn, { id: 'cancel', label: 'Hủy đơn', kind: 'warn' }] };
      case 'preparing':
        return { h: k === 'service' ? 'Dịch vụ đang thực hiện' : 'Bên bán đang chuẩn bị', why: sl + ' đã bắt đầu nên không tự hủy được nữa. Cần thì gửi yêu cầu hủy — ' + sl + ' đồng ý mới hủy.', btns: o.cancelRequested ? [] : [{ id: 'cancelreq', label: 'Gửi yêu cầu hủy', kind: 'warn' }] };
      case 'delivering':
        return { h: k === 'service' ? 'Đang trả đồ' : 'Đang giao', why: 'Khi đã nhận đủ, hãy xác nhận để đóng đơn.', btns: [{ id: 'received', label: 'Tôi đã nhận đủ', kind: 'main' }] };
      case 'ready':
        return { h: 'Sẵn sàng nhận', why: 'Kiểm tra hàng hoặc kết quả dịch vụ khi nhận.', btns: [{ id: 'received', label: 'Tôi đã nhận đủ', kind: 'main' }] };
      case 'done': {
        const left = this.issueLeft(o);
        const btns: Btn[] = [];
        if (!o.rated) btns.push({ id: 'rate', label: 'Đánh giá ' + sl, kind: 'main' });
        if (left > 0) btns.push({ id: 'issue-open', label: ISSUE_LABEL[k], kind: 'ghost' });
        return {
          h: 'Đơn đã hoàn thành',
          why: (o.issue?.st === 'closed' ? 'Yêu cầu ' + (k === 'goods' ? 'trả hàng' : 'báo vấn đề') + ' đã xong: ' + o.issue.result + '. ' : '') + (this.xu.has('order:' + o._id) ? 'Đã cộng +10 Xu cho đơn này. ' : '') + (o.rated ? 'Cảm ơn bạn đã đánh giá.' : 'Đánh giá có viết nhận xét để nhận thêm +5 Xu.'),
          btns: o.issue ? btns.filter((b) => b.id !== 'issue-open') : btns,
        };
      }
      case 'cancelled':
        return {
          h: o.priceRejected ? 'Bạn đã từ chối giá mới' : o.cancelBy === 'seller' ? sl + ' đã hủy đơn' : 'Bạn đã hủy đơn',
          why: o.priceRejected ?? (o.cancelWhy ? 'Lý do: ' + o.cancelWhy + '.' + (o.cancelLate ? ' Hủy sát giờ hẹn — đã ghi vào hồ sơ của bạn.' : '') + (o.cancelBy === 'seller' ? ' Bạn không phải trả gì.' : '') : 'Đơn đã dừng. Bạn có thể tìm lựa chọn khác trong khu.'),
          btns: [{ id: 'more', label: 'Khám phá quanh khu', kind: 'ghost' }],
        };
      case 'declined':
        return { h: 'Bên bán không nhận đơn', why: 'Bạn có thể tìm lựa chọn khác trong khu.', btns: [{ id: 'more', label: 'Khám phá quanh khu', kind: 'ghost' }] };
      default:
        return { h: 'Chờ xác nhận', why: 'Đang chờ bên bán phản hồi.', btns: [] };
    }
  }

  /** Các nút "Mô phỏng phía người bán" (chỉ ở bản mẫu) */
  protected placedSims(o: Order): { id: string; label: string }[] {
    const s: { id: string; label: string }[] = [];
    const n = o.counterpartName;
    const st = o.status as string;
    const k = this.kind(o);
    const pc = o.priceCheck;
    if (st === 'pending') s.push({ id: 'sim-confirm', label: 'Mô phỏng bên bán xác nhận' }, { id: 'sim-decline', label: 'Mô phỏng bên bán từ chối' });
    if (st === 'confirmed' && pc && !o.priceDone) s.push({ id: 'sim-quote', label: pc === 'surcharge' ? 'Mô phỏng ' + n + ' báo phụ thu' : 'Mô phỏng bên bán báo giá cuối' });
    if (st === 'confirmed' && (!pc || pc === 'surcharge' || o.priceDone)) s.push({ id: 'sim-prepare', label: 'Mô phỏng bắt đầu thực hiện' + (pc === 'surcharge' && !o.priceDone ? ' (không phụ thu)' : '') });
    if (st === 'preparing') s.push({ id: 'sim-deliver', label: 'Mô phỏng giao/nhận' });
    if (st === 'preparing' && o.cancelRequested) s.push({ id: 'sim-cancel-ok', label: 'Mô phỏng bên bán đồng ý hủy' }, { id: 'sim-cancel-no', label: 'Mô phỏng bên bán không đồng ý' });
    if (['pending', 'confirmed'].includes(st)) s.push({ id: 'sim-seller-cancel', label: 'Mô phỏng bên bán hủy đơn' });
    if (this.canResched(o) && o.resched?.by === 'buyer') s.push({ id: 'sim-resched-ok', label: 'Mô phỏng bên bán đồng ý giờ mới' }, { id: 'sim-resched-other', label: 'Mô phỏng bên bán đề xuất giờ khác' });
    if (this.canResched(o) && !o.resched) s.push({ id: 'sim-resched-seller', label: 'Mô phỏng bên bán xin đổi giờ' });
    if (st === 'confirmed' && k === 'service' && o.apptIn != null) s.push({ id: 'sim-late', label: o.apptIn >= 2 ? 'Mô phỏng: còn dưới 2 giờ tới giờ hẹn' : 'Mô phỏng: còn hơn 2 giờ' });
    if (o.issue?.st === 'open') {
      if (k === 'goods') s.push({ id: 'sim-issue-full', label: 'Mô phỏng bên bán đồng ý nhận lại' });
      else s.push({ id: 'sim-issue-redo', label: 'Mô phỏng bên bán làm lại' }, { id: 'sim-issue-part', label: 'Mô phỏng hoàn 20.000đ' }, ...(k === 'food' ? [{ id: 'sim-issue-full', label: 'Mô phỏng hoàn hết' }] : []));
      s.push({ id: 'sim-issue-no', label: 'Mô phỏng bên bán từ chối' });
    }
    return s;
  }

  /** Cập nhật đơn đã đặt + Xu (cộng khi xong / đánh giá, trả voucher khi hủy, thu lại khi hoàn tiền hết) */
  private move(patch: Partial<Order>, line: string, msg?: string): void {
    const o = this.order();
    if (!o) return;
    const before = o;
    this.orderService.update(o._id, patch, line).subscribe({
      next: (n) => {
        this.order.set(n);
        this.close();
        if (msg) this.toast.show(msg);
        if (patch.status === 'done' && before.status !== 'done' && n.total >= 30000) this.xu.earn(10, 'Hoàn thành đơn ' + n.code, 'order:' + n._id);
        if (patch.rated && patch.rated.t) this.xu.earn(5, 'Đánh giá đơn ' + n.code, 'review:' + n._id);
        if (patch.status === 'cancelled' || patch.status === 'declined') this.xu.returnVoucher(n.code);
        if (patch.issue?.st === 'closed' && before.issue && (before.issue.st === 'returnAgreed' || (before.issue.st === 'refund' && (before.issue.amount ?? 0) >= n.total))) {
          this.xu.revoke('order:' + n._id, 'Thu lại Xu · đơn ' + n.code + ' được hoàn tiền');
        }
      },
      error: (e: Error) => this.fail(e),
    });
  }

  protected pReasons(o: Order): string[] {
    return this.kind(o) === 'service' ? P_REASONS.service : P_REASONS.other;
  }

  protected issueTypes(o: Order): string[] {
    return ISSUE_TYPES[this.kind(o)];
  }

  protected issueWants(o: Order): string[] {
    return ISSUE_WANTS[this.kind(o)];
  }

  protected issueLabel(o: Order): string {
    return ISSUE_LABEL[this.kind(o)];
  }

  protected sendPhotos(n: number): void {
    this.photos.set(Math.min(4, n));
  }

  /** Bấm một nút ở bảng hành động của đơn đã đặt */
  protected actP(a: string): void {
    const o = this.order();
    if (!o) return;
    const n = o.counterpartName;
    if (['chat', 'issue', 'more', 'post'].includes(a)) return this.go(a);
    if (a === 'cancel' || a === 'cancelreq') {
      this.dlgNow.set(a === 'cancel');
      return this.open('pcancel');
    }
    if (a === 'received') return this.open('received');
    if (a === 'rate') return this.open('rate');
    if (a === 'issue-open') {
      this.open('issue');
      this.pick2.set(this.issueWants(o).length === 1 ? this.issueWants(o)[0] : '');
      return;
    }
    if (a === 'resched') return this.open('resched');
    if (a === 'approve') return this.open('approve');
    if (a === 'reject') return this.open('reject');
    const iss = o.issue as OrderIssue | null | undefined;
    if (a === 'issue-paid' || a === 'issue-done') {
      const res = a === 'issue-done' ? (this.kind(o) === 'food' ? 'đã nhận món làm lại' : 'đã được làm lại') : (iss?.st === 'returnAgreed' ? 'đã trả hàng và nhận lại ' : 'đã nhận tiền hoàn ') + this.vnd(iss?.amount ?? 0);
      return this.move({ issue: { ...(iss as OrderIssue), st: 'closed', result: res } }, a === 'issue-done' ? 'Bạn xác nhận đã được làm lại' : 'Bạn xác nhận đã nhận tiền hoàn ' + this.vnd(iss?.amount ?? 0), 'Đã đóng yêu cầu');
    }
    if (a === 'issue-drop') return this.move({ issue: { ...(iss as OrderIssue), st: 'closed', result: 'bạn đã đóng yêu cầu' } }, 'Bạn đóng yêu cầu');
    if (a === 'resched-undo') return this.move({ resched: null }, 'Bạn rút đề nghị đổi lịch', 'Đã rút đề nghị — giữ giờ cũ');
    if (a === 'resched-no') return this.move({ resched: null }, 'Bạn giữ giờ cũ', 'Đã giữ giờ cũ — ' + n + ' nhận được phản hồi');
    if (a === 'resched-yes' || a === 'sim-resched-ok') {
      const to = o.resched?.to ?? '';
      return this.move({ resched: null, detail: o.detail ? { ...o.detail, when: 'Hẹn lúc ' + to } : o.detail }, (a === 'resched-yes' ? 'Bạn đồng ý đổi lịch sang ' : n + ' đồng ý đổi lịch sang ') + to, a === 'resched-yes' ? 'Đã đổi sang giờ mới' : undefined);
    }
    // ----- giả lập phía người bán -----
    const sims: Record<string, () => void> = {
      'sim-confirm': () => this.move({ status: 'confirmed' }, n + ' xác nhận yêu cầu'),
      'sim-decline': () => this.move({ status: 'declined' }, n + ' từ chối yêu cầu'),
      'sim-prepare': () => this.move({ status: 'preparing' }, n + ' bắt đầu thực hiện'),
      'sim-deliver': () => this.move({ status: this.kind(o) === 'goods' && (o.detail?.place ?? '').includes('Tự') ? 'ready' : 'delivering' }, n + ' báo sẵn sàng giao/nhận'),
      'sim-seller-cancel': () => this.move({ status: 'cancelled', cancelFrom: o.status as string, cancelBy: 'seller', cancelWhy: this.kind(o) === 'food' ? 'Hết nguyên liệu hôm nay' : this.kind(o) === 'service' ? 'Có việc đột xuất, không đến được giờ đã hẹn' : 'Món đồ đã có người khác lấy trước' }, n + ' hủy đơn'),
      'sim-cancel-ok': () => this.move({ status: 'cancelled', cancelFrom: o.status as string, cancelBy: 'buyer', cancelWhy: (o.cancelWhy ?? '') + ' (bên bán đồng ý)', cancelRequested: false }, n + ' đồng ý hủy'),
      'sim-cancel-no': () => this.move({ cancelRequested: false, cancelDenied: this.kind(o) === 'food' ? 'món đã nấu xong, đang chuẩn bị giao.' : 'đã bắt đầu làm, nhắn để thỏa thuận thêm nhé.' }, n + ' không đồng ý hủy'),
      'sim-late': () => this.move({ apptIn: (o.apptIn ?? 5) >= 2 ? 1 : 5 }, '(bản mẫu) đổi thời điểm hẹn'),
      'sim-quote': () => {
        const total = o.priceCheck === 'quote' ? 850000 : Math.round((o.total * 1.3) / 1000) * 1000;
        const reason = o.priceCheck === 'quote' ? 'Ổ cứng hỏng — thay SSD 512GB, cài lại máy, bảo hành 3 tháng. Đã trừ 50.000đ phí kiểm tra.' : o.priceCheck === 'surcharge' ? 'Thùng hàng khoảng 20kg — phụ thu đồ to/nặng 10.000đ.' : 'Khối lượng thực tế lớn hơn ước tính lúc đặt.';
        this.move({ status: 'pricing', newPrice: { total, reason, lines: [[reason, total]] } }, n + (o.priceCheck === 'surcharge' ? ' báo phụ thu ' : ' báo giá cuối ') + this.vnd(total), 'Đơn đang chờ bạn duyệt giá');
      },
      'sim-resched-other': () => this.move({ resched: { to: '14:00 ngày mai', by: 'seller', note: 'Giờ bạn chọn mình kín lịch rồi, 14:00 ngày mai được không bạn?' } }, n + ' đề xuất giờ khác'),
      'sim-resched-seller': () => this.move({ resched: { to: '20:30 hôm nay', by: 'seller', note: 'Mình kẹt khách ở Block D, xin lùi 1 tiếng rưỡi nhé.' } }, n + ' xin đổi giờ hẹn'),
      'sim-issue-redo': () => this.simIssue({ st: 'redo', reply: n + ': "' + (this.kind(o) === 'food' ? 'Xin lỗi bạn, 20 phút nữa mình mang phần mới lên.' : 'Chiều mai 15:00 mình qua làm lại phần còn sót nhé.') + '"' }, n + ' nhận làm lại'),
      'sim-issue-part': () => this.simIssue({ st: 'refund', amount: 20000, reply: n + ': "Mình gửi lại 20.000đ cho phần bị thiếu nhé."' }, n + ' hoàn 20.000đ'),
      'sim-issue-full': () => this.simIssue({ st: this.kind(o) === 'goods' ? 'returnAgreed' : 'refund', amount: o.total, reply: n + ': "' + (this.kind(o) === 'goods' ? 'Bạn mang qua Block A tối nay nhé, mình xem rồi gửi lại tiền.' : 'Xin lỗi bạn, mình hoàn lại toàn bộ.') + '"' }, n + (this.kind(o) === 'goods' ? ' đồng ý nhận lại hàng' : ' hoàn toàn bộ')),
      'sim-issue-no': () => this.simIssue({ st: 'rejected', reply: n + ': "' + (this.kind(o) === 'goods' ? 'Lúc bạn lấy mình đã cho chạy thử, máy vẫn bình thường.' : 'Mình đã làm đúng như đã thỏa thuận.') + '"' }, n + ' không đồng ý'),
    };
    sims[a]?.();
  }

  private simIssue(patch: Partial<OrderIssue>, line: string): void {
    const o = this.order();
    if (o?.issue) this.move({ issue: { ...o.issue, ...patch } }, line);
  }

  /** Nút "Xác nhận" trong hộp thoại của đơn đã đặt */
  protected okP(): void {
    const o = this.order();
    const d = this.dlg();
    if (!o || !d) return;
    const n = o.counterpartName;
    if (d === 'pcancel') {
      if (!this.pick()) return void this.bad.set('Chọn một lý do.');
      const why = this.pick() + (this.text().trim() ? ' — ' + this.text().trim() : '');
      const now = this.dlgNow();
      const late = now && this.kind(o) === 'service' && o.status === 'confirmed' && o.apptIn != null && o.apptIn < 2;
      if (now) return this.move({ status: 'cancelled', cancelFrom: o.status as string, cancelBy: 'buyer', cancelWhy: why, cancelLate: late }, 'Bạn hủy đơn: ' + why, 'Đã hủy đơn');
      return this.move({ cancelRequested: true, cancelWhy: why, cancelDenied: null }, 'Bạn gửi yêu cầu hủy: ' + why, 'Đã gửi yêu cầu hủy');
    }
    if (d === 'received') return this.move({ status: 'done', doneAt: Date.now() }, 'Bạn xác nhận đã nhận đủ', 'Đơn đã hoàn thành');
    if (d === 'rate') {
      if (!this.stars()) return void this.bad.set('Chọn số sao.');
      const s = this.stars();
      const t = this.text().trim();
      this.reviewService.create({ targetType: 'order', targetId: o._id, rating: s, comment: t }).subscribe({ error: () => undefined });
      return this.move({ rated: { s, t } }, 'Bạn đánh giá ' + n + ' ' + s + ' sao', 'Cảm ơn bạn đã đánh giá');
    }
    if (d === 'issue') {
      const needPhoto = this.kind(o) !== 'service';
      if (!this.pick()) return void this.bad.set('Chọn vấn đề.');
      if (!this.pick2()) return void this.bad.set('Chọn điều bạn mong muốn.');
      if (!this.text().trim()) return void this.bad.set('Mô tả ngắn giúp bên bán hiểu.');
      if (needPhoto && !this.photos()) return void this.bad.set('Cần ít nhất 1 ảnh để bên bán kiểm tra.');
      return this.move({ issue: { st: 'open', type: this.pick(), want: this.pick2(), text: this.text().trim(), photos: this.photos() } }, (this.kind(o) === 'goods' ? 'Bạn yêu cầu trả hàng: ' : 'Bạn báo vấn đề: ') + this.pick(), 'Đã gửi cho ' + n);
    }
    if (d === 'resched') {
      if (!this.pick() || !this.pick2()) return void this.bad.set('Chọn ngày và giờ.');
      const day = this.pick();
      const to = this.pick2() + ' ' + (day.startsWith('Thứ') || day === 'Chủ nhật' ? day : day.toLowerCase());
      return this.move({ resched: { to, by: 'buyer', note: this.text().trim() } }, 'Bạn đề nghị đổi lịch sang ' + to, 'Đã gửi đề nghị đổi lịch');
    }
    if (d === 'approve') {
      const np = o.newPrice;
      if (!np) return;
      return this.move({ status: 'preparing', oldTotal: o.total, total: np.total, priceDone: true, newPrice: null }, 'Bạn đồng ý giá cuối ' + this.vnd(np.total), 'Đã đồng ý giá mới — đơn làm tiếp');
    }
    if (d === 'reject') {
      const pc = o.priceCheck;
      const after = pc === 'quote' ? 'Bạn chỉ trả phí kiểm tra ' + this.vnd(o.total) + ', ' + n + ' trả lại máy. Đơn kết thúc.' : pc === 'surcharge' ? n + ' không lấy đồ nữa, đơn hủy và bạn không phải trả gì.' : 'Đơn hủy, ' + n + ' trả lại đồ cho bạn và không tính tiền giặt.';
      const why = this.text().trim();
      return this.move({ status: 'cancelled', cancelFrom: 'pricing', priceRejected: after + (why ? ' Lý do bạn gửi: ' + why : ''), newPrice: null }, 'Bạn từ chối giá cuối' + (why ? ': ' + why : ''), 'Đã từ chối giá mới');
    }
  }

  // =============================================================
  // Việc đã nhận
  // =============================================================
  protected receivedSteps(): { label: string; cls: string; time: string; n: number }[] {
    const of = this.offer();
    if (!of) return [];
    const side = ['rejected', 'withdrawn', 'cancelled'].includes(of.state);
    const reached = of.history.map((h) => h.state);
    const last = [...reached].reverse().find((x) => OFFER_STEPS.includes(x)) ?? 'offered';
    const cur = OFFER_STEPS.indexOf(last) + (side ? 1 : 0);
    return OFFER_STEPS.map((s, i) => {
      const cut = side && i === cur;
      const cls = cut ? 'cut' : of.state === 'done' ? 'ok' : i < cur ? 'ok' : i === cur ? 'cur' : '';
      const h = of.history.find((x) => x.state === s);
      const time = cls === 'ok' || (cls === 'cur' && i === 0) ? (h ? formatTime(h.at) : '') : '';
      return { label: cut ? OFFER_STATE_LABEL[of.state] : OFFER_STATE_LABEL[s], cls, time, n: i + 1 };
    });
  }

  protected receivedPanel(o: Order, of: Offer): { h: string; why: string; btns: Btn[] } {
    const n = o.counterpartName;
    const nn = this.low(n);
    const money = this.vnd(o.total);
    const pay = o.paymentMethod === 'cash' ? 'tiền mặt' : 'chuyển khoản';
    switch (of.state) {
      case 'offered':
        return { h: 'Chờ ' + nn + ' chọn người', why: 'Bạn sẽ được báo ngay khi ' + nn + ' chọn. Gửi đề nghị chưa phải là đã nhận việc.', btns: [{ id: 'edit', label: 'Sửa giới thiệu', kind: 'ghost' }, { id: 'withdraw', label: 'Rút đề nghị', kind: 'warn' }] };
      case 'chosen':
        return { h: 'Bạn đã được chọn!', why: 'Địa chỉ chính xác đã hiện bên trái. Đến giờ làm, bấm Bắt đầu làm để ' + nn + ' biết bạn đã tới.', btns: [{ id: 'start', label: 'Bắt đầu làm', kind: 'main' }, { id: 'rcancel', label: 'Xin hủy việc', kind: 'ghost' }] };
      case 'working':
        return { h: 'Đang làm', why: 'Làm xong thì bấm Báo hoàn thành, kèm ảnh nếu có để ' + nn + ' dễ kiểm tra.', btns: [{ id: 'report', label: 'Báo hoàn thành', kind: 'main' }, { id: 'rcancel', label: 'Gặp sự cố, xin hủy', kind: 'ghost' }] };
      case 'reported':
        return { h: 'Chờ ' + nn + ' xác nhận', why: n + ' sẽ kiểm tra rồi xác nhận hoàn thành. Nếu ' + nn + ' không phản hồi, đơn tự hoàn thành sau 24 giờ.', btns: [] };
      case 'done':
        if (!of.paid) return { h: 'Hoàn thành — bạn đã nhận tiền công chưa?', why: n + ' trả bằng ' + pay + '. Nhận đủ ' + money + ' rồi thì bấm xác nhận. AntGo không giữ tiền, hai bên trả trực tiếp cho nhau.', btns: [{ id: 'paid', label: 'Đã nhận ' + money, kind: 'main' }, { id: 'unpaid', label: 'Chưa nhận được tiền công', kind: 'ghost' }] };
        if (!of.rated) return { h: 'Đánh giá ' + nn, why: 'Bạn đã nhận đủ tiền công. Một vài dòng đánh giá giúp hàng xóm khác biết ' + nn + ' có dễ hợp tác không.', btns: [{ id: 'rrate', label: 'Đánh giá ' + nn, kind: 'main' }] };
        return { h: 'Xong việc rồi!', why: 'Đã nhận tiền công và đánh giá. Cảm ơn bạn đã giúp hàng xóm.', btns: [{ id: 'more', label: 'Tìm việc khác gần nhà', kind: 'ghost' }] };
      case 'rejected':
        return { h: 'Chưa được chọn lần này', why: n + ' đã chọn người khác. Đề nghị của bạn không ảnh hưởng gì tới hồ sơ.', btns: [{ id: 'more', label: 'Tìm việc tương tự', kind: 'main' }] };
      case 'withdrawn':
        return { h: 'Bạn đã rút đề nghị', why: n + ' không còn thấy đề nghị của bạn.', btns: [{ id: 'post', label: 'Xem lại bài việc làm', kind: 'ghost' }] };
      default:
        return { h: 'Đơn đã hủy', why: 'Lý do: ' + (of.cancelReason ?? '—') + '. ' + n + ' đã được báo để tìm người khác.', btns: [{ id: 'more', label: 'Tìm việc khác gần nhà', kind: 'ghost' }] };
    }
  }

  protected receivedSims(o: Order, of: Offer): { id: string; label: string }[] {
    const n = o.counterpartName;
    if (of.state === 'reported') return [{ id: 'sim-confirm', label: 'Mô phỏng: ' + n + ' xác nhận hoàn thành' }];
    if (of.state === 'offered') return [{ id: 'sim-pick', label: 'Mô phỏng: ' + n + ' chọn bạn' }, { id: 'sim-reject', label: 'Mô phỏng: ' + n + ' chọn người khác' }];
    return [];
  }

  private applyOffer(next: Offer, msg?: string): void {
    this.offer.set(next);
    this.order.update((cur) => (cur ? { ...cur, status: next.state, history: next.history } : cur));
    this.close();
    if (msg) this.toast.show(msg);
  }

  /** Bấm một nút ở bảng hành động của việc đã nhận */
  protected actR(a: string): void {
    const o = this.order();
    const of = this.offer();
    if (!o || !of) return;
    if (['chat', 'issue', 'more', 'post'].includes(a)) return this.go(a);
    if (a === 'edit') return this.open('edit', { text: of.intro });
    if (a === 'withdraw') return this.open('withdraw');
    if (a === 'start') return this.open('start');
    if (a === 'report') return this.open('report');
    if (a === 'rcancel') return this.open('rcancel');
    if (a === 'unpaid') return this.open('unpaid');
    if (a === 'rrate') return this.open('rate');
    if (a === 'paid') {
      return void this.offerService.patch(of._id, { paid: true }, 'Bạn xác nhận đã nhận ' + this.vnd(o.total) + ' tiền công').subscribe({
        next: (n) => {
          this.applyOffer(n, 'Đã xác nhận tiền công');
          this.xu.earn(15, 'Hoàn thành việc ' + o.code, 'job:' + of._id);
        },
        error: (e: Error) => this.fail(e),
      });
    }
    const nm = o.counterpartName;
    if (a === 'sim-confirm') return void this.offerService.patch(of._id, { state: 'done' }, nm + ' xác nhận hoàn thành').subscribe({ next: (n) => this.applyOffer(n), error: (e: Error) => this.fail(e) });
    if (a === 'sim-pick') return void this.offerService.patch(of._id, { state: 'chosen', exactAddress: of.exactAddress ?? 'Căn C-0912, Block C' }, nm + ' chọn bạn').subscribe({ next: (n) => this.applyOffer(n, 'Bạn đã được chọn!'), error: (e: Error) => this.fail(e) });
    if (a === 'sim-reject') return void this.offerService.patch(of._id, { state: 'rejected' }, nm + ' đã chọn người khác').subscribe({ next: (n) => this.applyOffer(n), error: (e: Error) => this.fail(e) });
  }

  /** Nút "Xác nhận" trong hộp thoại của việc đã nhận */
  protected okR(): void {
    const o = this.order();
    const of = this.offer();
    const d = this.dlg();
    if (!o || !of || !d) return;
    const nm = o.counterpartName;
    const done = (n: Offer, msg: string) => this.applyOffer(n, msg);
    const err = (e: Error) => this.fail(e);
    if (d === 'edit') {
      if (!this.text().trim()) return void this.bad.set('Viết vài dòng để ' + nm + ' biết bạn hợp việc này.');
      return void this.offerService.updateIntro(of._id, this.text().trim()).subscribe({ next: (n) => done(n, 'Đã cập nhật lời giới thiệu'), error: err });
    }
    if (d === 'withdraw') return void this.offerService.act(of._id, 'withdraw').subscribe({ next: (n) => done(n, 'Đã rút đề nghị'), error: err });
    if (d === 'start') return void this.offerService.act(of._id, 'start').subscribe({ next: (n) => done(n, 'Đã báo ' + nm + ' là bạn bắt đầu'), error: err });
    if (d === 'report') {
      if (!this.text().trim()) return void this.bad.set('Ghi một dòng ngắn về việc đã làm.');
      return void this.offerService.act(of._id, 'reportDone', { note: this.text().trim() }).subscribe({ next: (n) => done(n, 'Đã gửi báo hoàn thành cho ' + nm), error: err });
    }
    if (d === 'rcancel') {
      if (!this.pick()) return void this.bad.set('Chọn một lý do.');
      return void this.offerService.act(of._id, 'cancelRequest', { reason: this.pick() }).subscribe({ next: (n) => done(n, 'Đã hủy và báo cho ' + nm), error: err });
    }
    if (d === 'unpaid') {
      this.close();
      return this.go('chat');
    }
    if (d === 'rate') {
      if (!this.stars()) return void this.bad.set('Chọn số sao.');
      const s = this.stars();
      const t = this.text().trim();
      this.reviewService.create({ targetType: 'offer', targetId: of._id, rating: s, comment: t }).subscribe({ error: () => undefined });
      return void this.offerService.patch(of._id, { rated: { s, t } }, 'Bạn đánh giá ' + nm + ' ' + s + ' sao').subscribe({
        next: (n) => {
          done(n, 'Cảm ơn bạn đã đánh giá');
          if (t) this.xu.earn(5, 'Đánh giá việc ' + o.code, 'review:' + of._id);
        },
        error: err,
      });
    }
  }

  /** Bảng hành động không có nút chính (chỉ chữ + liên kết nhỏ): vẽ nhẹ, không khung, không bóng */
  protected lightPanel(o: Order): boolean {
    const of = this.offer();
    const btns = o.type === 'received' ? (of ? this.receivedPanel(o, of).btns : []) : this.placedPanel(o).btns;
    return !btns.some((b) => b.kind === 'main') && o.status !== 'pricing' && !o.newPrice;
  }

  protected kindName(k: string): string {
    return ({ food: 'Đồ ăn', goods: 'Đồ dùng', service: 'Dịch vụ', job: 'Việc làm' } as Record<string, string>)[k] ?? '';
  }

  protected stepTime(state: OfferState): string {
    const h = this.offer()?.history.find((x) => x.state === state);
    return h ? formatDateTime(h.at) : '';
  }
}
