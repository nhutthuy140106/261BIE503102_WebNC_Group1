import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { AppError } from '../../../core/models/api';
import { CreateOrderBody, Order } from '../../../core/models/order';
import { Post } from '../../../core/models/post';
import { Address } from '../../../core/models/user';
import { unsplash } from '../../../core/config/post-templates';
import { AddressService } from '../../../core/services/address';
import { AuthPromptService } from '../../../core/services/auth-prompt';
import { DrawerService } from '../../../core/services/drawer';
import { OrderService } from '../../../core/services/order';
import { PostService } from '../../../core/services/post';
import { RecommendService } from '../../../core/services/recommend';
import { SavedService } from '../../../core/services/saved';
import { ToastService } from '../../../core/services/toast';
import { Voucher, XuService } from '../../../core/services/xu';
import { OrderDraft, parseChoice } from '../../../core/utils/order-draft';
import { resolveId } from '../../../core/utils/slug-helper';
import { PostView, viewOf } from '../../../core/utils/template-for';

type RvFilter = 'all' | 'photo' | '5' | '4' | 'low';
type RvSort = 'new' | 'high' | 'low';

/**
 * Chi tiết đồ ăn / đồ dùng / dịch vụ — bê từ design/mockups/detail.html.
 * Bài = ghép từ 7 khối (viewOf). Đặt 2 bước kiểu ShopeeFood: khung phải chỉ chọn món → hộp "Xác nhận đơn hàng".
 */
@Component({
  selector: 'app-post-detail',
  standalone: false,
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.css',
})
export class PostDetail implements OnInit, CanComponentDeactivate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(PostService);
  private readonly orderService = inject(OrderService);
  private readonly addressService = inject(AddressService);
  private readonly recommend = inject(RecommendService);
  private readonly prompt = inject(AuthPromptService);
  private readonly toast = inject(ToastService);
  protected readonly xu = inject(XuService);
  protected readonly drawer = inject(DrawerService);
  protected readonly saved = inject(SavedService);

  protected readonly parse = parseChoice;
  protected readonly img = unsplash;
  protected readonly post = signal<Post | null>(null);
  protected readonly view = signal<PostView | null>(null);
  protected readonly draft = signal<OrderDraft | null>(null);
  protected readonly similar = signal<Post[]>([]);
  protected readonly addresses = signal<Address[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  // hộp thoại
  protected readonly checkout = signal(false);
  protected readonly placed = signal<Order | null>(null);
  protected readonly submitting = signal(false);
  protected readonly addrOpen = signal(false);
  protected readonly voucherOpen = signal(false);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly reviewsOpen = signal(false);
  protected readonly rvFilter = signal<RvFilter>('all');
  protected readonly rvSort = signal<RvSort>('new');
  protected readonly rvQuery = signal('');
  protected readonly tried = signal(false);

  // ----- đánh giá (điểm và số lượt tính từ dữ liệu) -----
  protected readonly reviews = computed(() => this.view()?.reviews ?? []);
  protected readonly rate = computed(() => {
    const r = this.reviews();
    return r.length ? (r.reduce((s, x) => s + x[4], 0) / r.length).toFixed(1).replace('.', ',') : 'Mới';
  });
  protected readonly bars = computed(() => [5, 4, 3, 2, 1].map((n) => ({ n, c: this.reviews().filter((r) => r[4] === n).length })));
  protected readonly rvShown = computed(() => {
    const q = this.rvQuery().trim().toLowerCase();
    const f = this.rvFilter();
    const list = this.reviews().filter((r) => {
      if (f === 'photo' && !r[6].length) return false;
      if (f === '5' && r[4] !== 5) return false;
      if (f === '4' && r[4] !== 4) return false;
      if (f === 'low' && r[4] > 3) return false;
      return !q || (r[5] + r[1]).toLowerCase().includes(q);
    });
    const s = this.rvSort();
    return s === 'new' ? list : [...list].sort((a, b) => (s === 'high' ? b[4] - a[4] : a[4] - b[4]));
  });
  protected readonly doneTag = computed(() => {
    const k = this.view()?.tpl.kind ?? '';
    return /Đồ ăn|Đồ uống/.test(k) ? 'Đã đặt món' : k === 'Hàng hóa' ? 'Đã mua' : 'Đã dùng dịch vụ';
  });

  /** Khung giờ chọn được, bước 30 phút */
  protected readonly slots = computed(() => {
    const t = this.view()?.tpl;
    if (!t) return [];
    const [a, b] = t.time.win.map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const out: string[] = [];
    for (let m = a; m <= b; m += 30) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    return out;
  });
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly address = computed(() => {
    const d = this.draft();
    return this.addresses().find((a) => a._id === d?.addressId()) ?? null;
  });
  protected readonly usable = computed(() => {
    const d = this.draft();
    return d ? this.xu.vouchers().filter((v) => this.voucherOk(v, d)) : [];
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = resolveId(params.get('slug') ?? '');
          this.loading.set(true);
          return id ? forkJoin({ post: this.postService.getPostById(id), addresses: this.addressService.list() }) : of(null);
        }),
      )
      .subscribe({
        next: (r) => {
          const p = r?.post ?? null;
          this.post.set(p);
          this.addresses.set(r?.addresses ?? []);
          this.similar.set([]);
          this.checkout.set(false);
          this.placed.set(null);
          if (p) {
            const v = viewOf(p);
            this.view.set(v);
            const d = new OrderDraft(v.tpl, v.tpl.stock.mode === 'limit' ? v.tpl.stock.left ?? null : null);
            const def = r?.addresses.find((a) => a.isDefault);
            if (def) d.addressId.set(def._id);
            this.draft.set(d);
            this.recommend.similar(p._id).subscribe({ next: (l) => this.similar.set(l), error: () => this.similar.set([]) });
            this.restore(d);
          }
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.error.set(e.message);
          this.loading.set(false);
        },
      });
  }

  hasUnsavedChanges(): boolean {
    return this.checkout() && !this.placed();
  }

  /** Khách đăng nhập xong quay lại: điền lại những gì đã chọn và mở tiếp hộp xác nhận. */
  private restore(d: OrderDraft): void {
    const r = this.prompt.takeResume<{ postId: string; qty: number; opt: Record<string, string>; ans: Record<string, string> }>('order');
    if (!r || r.postId !== this.post()?._id) return;
    d.qty.set(r.qty);
    d.opt.set(r.opt);
    d.ans.set(r.ans);
    this.openCheckout();
  }

  // ----- bước 1: khung phải -----
  protected stockLine(): { text: string; sub: string; off: boolean } {
    const s = this.view()!.tpl.stock;
    if (this.post()?.closed) return { text: 'Tạm ngưng nhận', sub: 'Người bán đang tạm dừng bài này.', off: true };
    if (s.mode === 'once') return { text: 'Còn hàng', sub: 'Bán một lần — ai đặt trước được trước.', off: false };
    if (s.mode === 'limit') return { text: 'Còn ' + s.left + ' phần hôm nay', sub: s.sched ?? '', off: false };
    return { text: 'Đang nhận đặt', sub: s.sched ?? '', off: false };
  }

  protected priceLabel(): string {
    const p = this.view()!.tpl.price;
    if (p.type === 'quote') return 'Báo giá sau';
    return (p.type === 'from' ? 'từ ' : '') + this.fmt(p.amount ?? 0);
  }

  protected priceSub(): string {
    const p = this.view()!.tpl.price;
    if (p.type === 'quote') return 'Phí kiểm tra ' + this.fmt(p.inspect ?? 0) + ' · trừ vào tiền sửa nếu đồng ý';
    return p.estimate ? 'Giá ước tính — tính theo ' + (p.unit ?? 'đơn vị') + ' thực tế' : '';
  }

  protected fmt(n: number): string {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
  }

  protected actionLabel(): string {
    return this.view()!.tpl.action;
  }

  protected setQty(d: OrderDraft, n: number): void {
    d.qty.set(Math.min(d.maxQty(), Math.max(d.tpl.qty?.min ?? 1, n)));
  }

  protected onPhoto(d: OrderDraft, label: string, e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    d.setAns(label, f ? f.name : '');
  }

  protected next(d: OrderDraft): void {
    this.tried.set(true);
    if (d.missing(false)) return;
    if (this.post()?.closed) return;
    const p = this.post()!;
    if (!this.prompt.require('order', { type: 'order', payload: { postId: p._id, qty: d.qty(), opt: d.opt(), ans: d.ans() } })) return;
    this.openCheckout();
  }

  protected openCheckout(): void {
    this.checkout.set(true);
    this.tried.set(false);
    this.error.set(null);
  }

  protected closeCheckout(): void {
    this.checkout.set(false);
    this.placed.set(null);
  }

  // ----- bước 2: xác nhận -----
  protected voucherOk(v: Voucher, d: OrderDraft): boolean {
    if (!d.tpl.xuOk) return false;
    if (v.ship) return d.needsAddress() && d.placeFee() > 0;
    return d.subtotal() >= v.min;
  }

  protected pickVoucher(d: OrderDraft, v: Voucher | null): void {
    d.voucher.set(v);
    this.voucherOpen.set(false);
  }

  protected addressText(a: Address): string {
    return a.unit + ', ' + (a.block.length === 1 ? 'Block ' + a.block : a.block);
  }

  protected pickAddress(d: OrderDraft, a: Address): void {
    d.addressId.set(a._id);
    this.addrOpen.set(false);
  }

  protected whenLabel(d: OrderDraft): string {
    const t = d.tpl.time;
    if (t.mode === 'datedur') return d.date() ? d.date().split('-').reverse().join('/') + ' · ' + d.time() + ' · ' + d.hours() + ' giờ' + (d.repeat() ? ' · lặp hằng tuần' : '') : '';
    return (d.date() ? d.date().split('-').reverse().join('/') : 'Hôm nay') + ' · ' + d.time();
  }

  protected submit(): void {
    const p = this.post();
    const d = this.draft();
    if (!p || !d || this.submitting()) return;
    this.tried.set(true);
    if (d.missing(true)) return;
    const a = this.address();
    const place = d.tpl.place;
    const placeText = place.mode === 'choice' ? place.choices?.[d.place()]?.[0] : place.mode === 'seller' ? place.where : place.label;
    const body: CreateOrderBody = {
      postId: p._id,
      quantity: d.qty(),
      selections: d.tpl.opts.map((g) => ({ group: g.name, choices: [parseChoice(d.opt()[g.name] ?? '').name] })),
      answers: d.tpl.qs.map((q) => ({ question: q.label, value: d.lines().find((l) => l.startsWith(q.label + ': '))?.slice(q.label.length + 2) ?? '' })).filter((x) => x.value),
      fulfillment: d.needsAddress() ? 'delivery' : 'pickup',
      addressId: d.needsAddress() ? d.addressId() : undefined,
      scheduledAt: d.date() ? new Date(d.date() + 'T' + d.time()).toISOString() : undefined,
      utensils: d.tpl.key === 'food' && d.utensils(),
      note: d.note().trim() || undefined,
      voucherCode: d.voucher()?.id,
      payment: d.pay(),
      total: d.grand(),
      detail: {
        lines: d.lines(),
        quantity: d.tpl.qty ? d.qty() : undefined,
        address: a ? a.name + ' · ' + a.phone + ' — ' + this.addressText(a) : undefined,
        place: placeText,
        when: this.whenLabel(d),
        utensils: d.tpl.key === 'food' ? d.utensils() : undefined,
        voucher: d.voucher()?.title,
        subtotal: d.subtotal(),
        fee: d.placeFee(),
        discount: d.discount(),
        steps: d.tpl.steps,
        template: d.tpl.key,
      },
    };
    this.submitting.set(true);
    this.error.set(null);
    this.orderService.create(body).subscribe({
      next: (o) => {
        const v = d.voucher();
        if (v) this.xu.useVoucher(v.id, o.code);
        this.placed.set(o);
        this.submitting.set(false);
      },
      error: (e: Error) => {
        this.error.set(e instanceof AppError && e.details.length ? e.details.map((x) => x.message).join(' ') : e.message);
        this.submitting.set(false);
      },
    });
  }

  protected goOrder(o: Order): void {
    this.checkout.set(false);
    this.router.navigate(['/orders', o._id]);
  }

  // ----- khác -----
  protected toggleSave(p: Post): void {
    this.saved.toggle(p._id);
  }

  protected share(): void {
    navigator.clipboard?.writeText(location.href).then(
      () => this.toast.show('Đã chép liên kết bài'),
      () => this.toast.show('Không chép được liên kết'),
    );
  }

  protected message(p: Post): void {
    if (this.prompt.require('chat')) this.router.navigate(['/messenger'], { queryParams: { to: p.sellerName, av: p.sellerAvatar } });
  }

  protected stars(n: number): number[] {
    return [1, 2, 3, 4, 5].map((i) => (i <= n ? 1 : 0));
  }

  protected openLightbox(i: number): void {
    this.lightbox.set(i);
  }

  protected step(n: number): void {
    const len = this.view()?.images.length ?? 1;
    this.lightbox.update((i) => (i === null ? null : (i + n + len) % len));
  }

  back(): void {
    history.length > 1 ? history.back() : this.router.navigate(['/search']);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.lightbox() !== null) this.lightbox.set(null);
      else if (this.addrOpen() || this.voucherOpen()) {
        this.addrOpen.set(false);
        this.voucherOpen.set(false);
      } else if (this.reviewsOpen()) this.reviewsOpen.set(false);
      else if (this.checkout()) this.closeCheckout();
    }
    if (this.lightbox() !== null && e.key === 'ArrowRight') this.step(1);
    if (this.lightbox() !== null && e.key === 'ArrowLeft') this.step(-1);
  }
}
