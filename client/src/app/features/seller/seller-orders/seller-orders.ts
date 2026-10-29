import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { OFFER_STATE_LABEL } from '../../../core/models/offer';
import { PostKind } from '../../../core/models/post';
import { SellerJobView, SellerOrderView, SellerSpaceService, SellerTask, dayText } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';

type Tab = '' | 'placed' | 'jobs' | 'hist';
/** act = cần bạn làm (cam) · red = khách xin hủy · go = đang chạy (xanh) · wait = chờ bên kia (vàng) · end = đã xong (xám) */
type Dot = 'act' | 'red' | 'go' | 'wait' | 'end';

interface Row {
  key: string;
  job: boolean;
  kind: PostKind;
  link: string[];
  /** null = chưa có ai để nhắn (việc chưa có đề nghị) */
  chat: Record<string, string> | null;
  person: string;
  avatar?: string;
  faces?: string[];
  image?: string;
  title: string;
  when: string;
  code: string;
  amountLabel: string;
  amount: number;
  status: string;
  dot: Dot;
  /** việc trong "Cần bạn xử lý" tương ứng (cùng nhãn với trang Hôm nay) */
  task?: SellerTask;
}

/**
 * Giao dịch — mặt còn lại của trang Đơn hàng phía Mua (features/orders/order-list), cùng bố cục và cùng kiểu thẻ:
 * tab viên Tất cả · Đơn khách đặt · Việc bạn đăng · Lịch sử; nhóm Cần bạn xử lý (khung cam) · Đang diễn ra · Chờ xác nhận.
 * Thẻ: người kia · loại · trạng thái → ảnh · tên bài · ngày giờ · mã đơn · tiền → Nhắn tin + nút chính.
 * Nhãn "Cần bạn xử lý" lấy từ SellerSpaceService.tasks (giống trang Hôm nay); nút chính chỉ "Xác nhận" / "Phản hồi".
 */
@Component({
  selector: 'app-seller-orders',
  standalone: false,
  templateUrl: './seller-orders.html',
  styleUrls: ['../seller-ui.css', './seller-orders.css'],
})
export class SellerOrders implements OnInit {
  protected readonly seller = inject(SellerSpaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly tab = toSignal(this.route.queryParamMap.pipe(map((q) => (q.get('f') ?? '') as Tab)), { initialValue: '' as Tab });

  /** việc cần làm theo đơn / việc (một đơn có thể có nhiều việc: lấy việc gấp nhất) */
  private readonly taskOf = computed(() => {
    const m = new Map<string, SellerTask>();
    for (const t of this.seller.tasks()) {
      const k = t.orderId ?? t.jobId;
      if (k && !m.has(k)) m.set(k, t);
    }
    return m;
  });

  private readonly rows = computed<Row[]>(() => [
    ...this.seller.orders().map((o) => this.orderRow(o)),
    ...this.seller.jobs().map((j) => this.jobRow(j)),
  ]);

  protected readonly groups = computed(() => {
    const t = this.tab();
    const list = this.rows().filter((r) => (t === 'hist' ? r.dot === 'end' : r.dot !== 'end' && (!t || (t === 'jobs') === r.job)));
    if (t === 'hist') return [{ key: 'hist', title: '', items: list }].filter((g) => g.items.length);
    return [
      { key: 'todo', title: 'Cần bạn xử lý', items: list.filter((r) => r.task) },
      { key: 'go', title: 'Đang diễn ra', items: list.filter((r) => !r.task && r.dot === 'go') },
      { key: 'wait', title: 'Chờ xác nhận', items: list.filter((r) => !r.task && r.dot === 'wait') },
    ].filter((g) => g.items.length);
  });

  ngOnInit(): void {
    this.seller.load().subscribe();
  }

  protected setTab(t: Tab): void {
    this.router.navigate([], { queryParams: { f: t || null }, replaceUrl: true });
  }

  protected reset(e: Event): void {
    e.preventDefault();
    this.seller.reset().subscribe(() => this.toast.show('Đã đặt lại dữ liệu mẫu'));
  }

  // ---------------- dòng đơn / việc ----------------
  private at(day: number, time: string): string {
    return `${dayText(day, { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${time}`;
  }

  private orderRow(o: SellerOrderView): Row {
    const task = this.taskOf().get(o.id);
    const dot: Dot = task ? (task.type === 'cancel' ? 'red' : 'act') : o.ended ? 'end' : ['delivering', 'ready'].includes(o.state) ? 'wait' : 'go';
    return {
      key: o.id, job: false, kind: o.kind, link: ['/seller/orders', o.id], chat: { to: o.buyer.name, order: o.id },
      person: o.buyer.name, avatar: o.buyer.avatar, image: o.image, title: o.title, when: this.at(o.day, o.time), code: o.code,
      amountLabel: 'Tổng tiền', amount: o.total, status: task?.status ?? o.label, dot, task,
    };
  }

  private jobRow(j: SellerJobView): Row {
    const task = this.taskOf().get(j.id);
    const a = j.active[0];
    const dot: Dot = task ? 'act' : j.closed ? 'end' : a ? 'go' : 'wait';
    const status = task?.status ?? (j.closed ? (a ? 'Hoàn thành' : 'Đã đóng') : a ? OFFER_STATE_LABEL[a.state] : 'Chờ đề nghị');
    return {
      key: j.id, job: true, kind: 'job', link: ['/seller/jobs', j.id], chat: a ? { to: a.worker.name, job: j.id } : null,
      person: a ? a.worker.name : j.waiting.length ? `${j.waiting.length} đề nghị` : 'Chưa có đề nghị',
      avatar: a?.worker.avatar, faces: !a && j.waiting.length ? j.waiting.map((o) => o.worker.avatar) : undefined,
      title: j.title, when: this.at(j.day, j.time), code: j.code, amountLabel: 'Tiền công', amount: j.pay, status, dot, task,
    };
  }

  // ---------------- nút chính: cùng cách xử lý với trang Hôm nay ----------------
  protected readonly ask = signal<SellerTask | null>(null);
  protected readonly pickId = signal<string | null>(null);
  protected readonly pickJob = computed(() => this.seller.jobs().find((j) => j.id === this.pickId()) ?? null);

  protected readonly askView = computed(() => {
    const t = this.ask();
    if (!t) return null;
    if (t.type === 'done') return this.seller.askView('confirmDone', t.jobId!, t.offerId);
    const a = t.type === 'cancel' ? 'approveCancel' : t.type === 'step' ? t.act : 'confirm';
    return t.orderId && a ? this.seller.askView(a, t.orderId) : null;
  });

  protected primary(r: Row): void {
    const t = r.task!;
    if (t.type === 'question') this.router.navigate(['/seller/jobs', t.jobId], { fragment: 'qa' });
    else if (t.type === 'review') this.router.navigate(r.link);
    else if (t.type === 'pick') this.pickId.set(t.jobId ?? null);
    else this.ask.set(t);
  }

  protected confirmAsk(): void {
    const t = this.ask();
    this.ask.set(null);
    if (!t) return;
    let msg = '';
    if (t.type === 'order' && t.orderId) msg = this.seller.orderAct(t.orderId, 'confirm');
    if (t.type === 'cancel' && t.orderId) msg = this.seller.orderAct(t.orderId, 'approveCancel');
    if (t.type === 'step' && t.orderId && t.act) msg = this.seller.orderAct(t.orderId, t.act);
    if (t.type === 'done' && t.jobId && t.offerId) msg = this.seller.offerAct(t.jobId, t.offerId, 'confirmDone');
    if (msg) this.toast.show(msg);
  }

  protected choose(offerId: string): void {
    const j = this.pickJob();
    this.pickId.set(null);
    if (j) this.toast.show(this.seller.offerAct(j.id, offerId, 'choose'));
  }
}
