import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { SELLER_LANE, SELLER_NEW_KINDS, SellerPause, SellerPost, StatsRange } from '../../../core/models/seller';
import { AuthService } from '../../../core/services/auth';
import { SellerSpaceService, SellerTask } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';
import { TaskAction } from '../components/task-card/task-card';

type KindFilter = PostKind | 'all';

const KIND_KEY = 'antgo_seller_kind';
const RANGE_KEY = 'antgo_seller_range';
const read = (k: string, d: string) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* bỏ qua */
  }
};

/**
 * Trang "Hôm nay" của không gian Bán & Đăng việc (design/mockups/seller.html):
 * hồ sơ gian hàng → 4 nút đăng bài → banner AntXu → Cần bạn xử lý → Lịch hôm nay + Hiệu quả → Tình trạng bán.
 * Một người bán nhiều mảng nên mọi khối lọc được theo mảng.
 */
@Component({
  selector: 'app-seller-today',
  standalone: false,
  templateUrl: './seller-today.html',
  styleUrls: ['../seller-ui.css', './seller-today.css'],
})
export class SellerToday implements OnInit {
  protected readonly seller = inject(SellerSpaceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly newKinds = SELLER_NEW_KINDS;
  protected readonly lane = SELLER_LANE;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kinds: PostKind[] = ['food', 'goods', 'service', 'job'];
  protected readonly ranges: StatsRange[] = ['today', '7', '30', '90', 'year'];
  protected readonly myId = computed(() => this.auth.currentUser()?._id ?? '');

  // ---- lọc theo mảng ----
  protected readonly kind = signal<KindFilter>(read(KIND_KEY, 'all') as KindFilter);
  protected setKind(k: KindFilter): void {
    this.kind.set(k);
    write(KIND_KEY, k);
  }
  private readonly match = (k: PostKind) => this.kind() === 'all' || this.kind() === k;

  // ---- Cần bạn xử lý: 4 thẻ một hàng, phần còn lại sau "Xem thêm" ----
  private static readonly PAGE = 4;
  protected readonly showAll = signal(false);
  protected readonly tasks = computed(() => this.seller.tasks().filter((t) => this.match(t.kind)));
  protected readonly shownTasks = computed(() => (this.showAll() ? this.tasks() : this.tasks().slice(0, SellerToday.PAGE)));
  protected readonly hidden = computed(() => Math.max(0, this.tasks().length - SellerToday.PAGE));
  protected count(k: KindFilter): number {
    return this.seller.tasks().filter((t) => k === 'all' || t.kind === k).length;
  }

  // ---- Hiệu quả ----
  protected readonly range = signal<StatsRange>(read(RANGE_KEY, '7') as StatsRange);
  protected readonly stats = computed(() => this.seller.statsFor(this.range()) ?? this.seller.statsFor('7'));
  protected setRange(r: string): void {
    this.range.set(r as StatsRange);
    write(RANGE_KEY, r);
  }

  // ---- Tình trạng bán ----
  protected readonly lanes = computed(() =>
    this.kinds.filter((k) => this.match(k)).map((k) => ({ kind: k, posts: this.seller.posts().filter((p) => p.kind === k) })),
  );

  ngOnInit(): void {
    this.seller.load().subscribe({ error: () => this.toast.show('Không tải được dữ liệu khu Bán') });
  }

  // ---------------- Cần bạn xử lý ----------------
  protected readonly ask = signal<SellerTask | null>(null);
  protected readonly pickJob = computed(() => {
    const id = this.pickId();
    return id ? this.seller.jobs().find((j) => j.id === id) ?? null : null;
  });
  protected readonly pickId = signal<string | null>(null);

  protected readonly askView = computed(() => {
    const t = this.ask();
    if (!t) return null;
    if (t.type === 'done') return this.seller.askView('confirmDone', t.jobId!, t.offerId);
    const a = t.type === 'cancel' ? 'approveCancel' : t.type === 'step' ? t.act : 'confirm';
    return t.orderId && a ? this.seller.askView(a, t.orderId) : null;
  });

  protected onTask(t: SellerTask, a: TaskAction): void {
    if (a === 'chat') {
      this.router.navigate(['/seller/messenger'], { queryParams: t.orderId ? { to: t.person, order: t.orderId } : t.jobId ? { to: t.person, job: t.jobId } : { to: t.person } });
      return;
    }
    if (a === 'decline' && t.orderId) {
      this.toast.show(this.seller.orderAct(t.orderId, 'decline', { reason: 'Bếp không nhận kịp' }));
      return;
    }
    // báo giá giặt sấy cần nhập số cân thực tế: mở chi tiết đơn với khung báo giá
    if (t.type === 'step' && t.act === 'quote' && t.orderId) return void this.router.navigate(['/seller/orders', t.orderId], { queryParams: { quote: 1 } });
    if (t.type === 'pick') this.pickId.set(t.jobId ?? null);
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

  protected onReply(t: SellerTask, text: string): void {
    if (t.type === 'question' && t.jobId && t.questionId) {
      // hỏi đáp công khai: chặn số điện thoại
      if (/\d{9,}/.test(text.replace(/[\s.\-()_,]/g, ''))) {
        this.toast.show('Không ghi số điện thoại ở hỏi đáp công khai — hãy nhắn riêng');
        return;
      }
      this.seller.answer(t.jobId, t.questionId, text);
      this.toast.show('Đã phản hồi — câu trả lời hiện cho mọi người xem việc');
    }
    if (t.type === 'review' && t.reviewId) {
      this.seller.reply(t.reviewId, text);
      this.toast.show('Đã gửi phản hồi — hiện dưới đánh giá ở trang bài');
    }
  }

  /** Bấm vào thẻ mở chi tiết đơn / việc */
  protected openTask(t: SellerTask): void {
    if (t.orderId) this.router.navigate(['/seller/orders', t.orderId]);
    else if (t.jobId) this.router.navigate(['/seller/jobs', t.jobId], { fragment: t.type === 'question' ? 'qa' : undefined });
    else if (t.reviewId) this.router.navigate(['/seller/insights']);
  }

  // ---------------- Tình trạng bán ----------------

  protected toggle(p: SellerPost): void {
    const on = !p.on;
    this.seller.setPost(p.id, { on, ...(on && !p.stock ? { stock: p.max } : {}) });
    const cur = this.seller.posts().find((x) => x.id === p.id)!;
    this.toast.show(on ? `Đã mở lại “${p.title}”` : `Đã tắt “${p.title}” — khách thấy “${this.seller.postState(cur).text}”`);
  }

  protected promote(p: SellerPost): void {
    const msg = this.seller.promote(p.id);
    this.toast.show(msg ?? `Cần ${SELLER_LANE[p.kind].xu[1]} Xu, bạn còn ${this.seller.xu()} Xu`);
  }

  protected pickPromo(lanes: HTMLElement): void {
    lanes.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.toast.show('Chọn bài và bấm nút Xu trên thẻ');
  }

  // ---------------- Tạm nghỉ ----------------
  protected readonly popOpen = signal(false);
  protected readonly popMode = signal<'open' | 'all' | 'some'>('open');
  protected readonly popKinds = signal<PostKind[]>([]);
  protected popUntil = 'sau 1 giờ';
  protected readonly pauseKinds: PostKind[] = ['food', 'goods', 'service'];

  protected readonly pauseText = computed(() => {
    const p = this.seller.pause();
    return !p ? 'Đang nhận đơn' : p.mode === 'all' ? 'Đang tạm nghỉ' : 'Tạm nghỉ một phần';
  });
  protected pauseWhat(p: SellerPause): string {
    return p.mode === 'all' ? 'Gian hàng đang tạm nghỉ' : `Tạm nghỉ: ${p.kinds.map((k) => KIND_LABEL[k]).join(', ')}`;
  }

  protected togglePop(e: Event): void {
    e.stopPropagation();
    const p = this.seller.pause();
    this.popMode.set(p ? p.mode : 'open');
    this.popKinds.set(p ? [...p.kinds] : []);
    this.popUntil = p?.until ?? 'sau 1 giờ';
    this.popOpen.update((v) => !v);
  }

  protected toggleKind(k: PostKind, on: boolean): void {
    this.popKinds.update((l) => (on ? [...l, k] : l.filter((x) => x !== k)));
  }

  protected savePause(): void {
    const mode = this.popMode();
    if (mode === 'some' && !this.popKinds().length) return this.toast.show('Chọn ít nhất một mảng để tạm nghỉ');
    this.seller.setPause(mode === 'open' ? null : { mode, kinds: this.popKinds(), until: this.popUntil });
    this.popOpen.set(false);
    this.toast.show(mode === 'open' ? 'Đang nhận đơn bình thường' : 'Đã tạm nghỉ — khách thấy “Tạm nghỉ” trên bài');
  }

  protected resume(): void {
    this.seller.setPause(null);
    this.toast.show('Đã mở nhận đơn lại');
  }

  @HostListener('document:click', ['$event'])
  onDoc(e: Event): void {
    if (this.popOpen() && !(e.target as HTMLElement).closest('.pop')) this.popOpen.set(false);
  }

  // ---------------- khác ----------------
  /** Bấm vào ô hồ sơ (trừ các nút bên phải) → gian hàng của tôi ở chế độ người bán */
  protected openShop(e: Event): void {
    if (!(e.target as HTMLElement).closest('.acts')) this.router.navigate(['/seller/shop']);
  }

  protected resetData(e: Event): void {
    e.preventDefault();
    this.seller.reset().subscribe(() => this.toast.show('Đã đặt lại dữ liệu mẫu'));
  }

  protected up(v: string): string {
    return v.replace(/^\+/, '');
  }
}
