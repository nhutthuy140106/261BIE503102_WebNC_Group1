import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { AppError } from '../../../core/models/api';
import { CreateOrderBody, Order } from '../../../core/models/order';
import { KIND_LABEL, Post } from '../../../core/models/post';
import { Address, BLOCKS } from '../../../core/models/user';
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
import { placedStepNames } from '../../../core/utils/placed-steps';
import { resolveId } from '../../../core/utils/slug-helper';
import { PostView, viewOf } from '../../../core/utils/template-for';

type RvFilter = 'all' | 'photo' | '5' | '4' | '3' | '2' | '1';

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

  protected readonly kindLabel = KIND_LABEL;
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
  protected readonly addrNew = signal(false);
  protected readonly blocks = BLOCKS;
  /** Thêm địa chỉ mới ngay trong hộp chọn địa chỉ (đặt cho người khác = thêm địa chỉ người đó) */
  protected readonly addrForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^0\d{9}$/)] }),
    block: new FormControl<(typeof BLOCKS)[number]>('B', { nonNullable: true }),
    unit: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30)] }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    label: new FormControl<'home' | 'family' | 'other'>('family', { nonNullable: true }),
  });
  protected readonly voucherOpen = signal(false);
  protected readonly lightbox = signal<number | null>(null);
  protected readonly reviewsOpen = signal(false);
  protected readonly rvFilter = signal<RvFilter>('all');
  protected readonly tried = signal(false);

  // ----- đánh giá (điểm và số lượt tính từ dữ liệu) -----
  protected readonly reviews = computed(() => this.view()?.reviews ?? []);
  protected readonly rate = computed(() => {
    const r = this.reviews();
    return r.length ? (r.reduce((s, x) => s + x[4], 0) / r.length).toFixed(1).replace('.', ',') : 'Mới';
  });
  protected readonly avgRound = computed(() => {
    const r = this.reviews();
    return r.length ? Math.round(r.reduce((s, x) => s + x[4], 0) / r.length) : 0;
  });
  /** Nút lọc kiểu Shopee: Tất cả · 5 sao … 1 sao · Có hình ảnh (kèm số đánh giá) */
  protected readonly rvFilters = computed<{ k: RvFilter; label: string; n: number }[]>(() => {
    const r = this.reviews();
    return [
      { k: 'all', label: 'Tất cả', n: r.length },
      ...([5, 4, 3, 2, 1] as const).map((s) => ({ k: String(s) as RvFilter, label: s + ' sao', n: r.filter((x) => x[4] === s).length })),
      { k: 'photo', label: 'Có hình ảnh', n: r.filter((x) => x[6].length).length },
    ];
  });
  protected readonly rvShown = computed(() => {
    const f = this.rvFilter();
    return this.reviews().filter((r) => (f === 'all' ? true : f === 'photo' ? r[6].length > 0 : r[4] === Number(f)));
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
  // ----- lịch chọn ngày (tự vẽ, thay lịch gốc của trình duyệt) -----
  protected readonly calOpen = signal(false);
  protected readonly calMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  private iso(x: Date): string {
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }

  protected todayIso(): string {
    return this.iso(new Date());
  }

  protected readonly calCells = computed(() => {
    const m = this.calMonth();
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // tuần bắt đầu từ Thứ Hai
    const total = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const today = this.todayIso();
    const out: ({ day: number; iso: string; past: boolean; today: boolean } | null)[] = Array(lead).fill(null);
    for (let day = 1; day <= total; day++) {
      const iso = this.iso(new Date(m.getFullYear(), m.getMonth(), day));
      out.push({ day, iso, past: iso < today, today: iso === today });
    }
    return out;
  });

  protected canPrev(): boolean {
    const n = new Date();
    return this.calMonth() > new Date(n.getFullYear(), n.getMonth(), 1);
  }

  protected moveMonth(n: number): void {
    const m = this.calMonth();
    this.calMonth.set(new Date(m.getFullYear(), m.getMonth() + n, 1));
  }

  protected toggleCal(d: OrderDraft): void {
    if (!this.calOpen() && d.date()) {
      const [y, mo] = d.date().split('-').map(Number);
      this.calMonth.set(new Date(y, mo - 1, 1));
    }
    this.calOpen.update((v) => !v);
  }

  protected pickDate(d: OrderDraft, iso: string): void {
    d.date.set(iso);
    this.calOpen.set(false);
  }

  protected dateLabel(iso: string, withYear = false): string {
    if (!iso) return 'Chọn ngày';
    const [y, m, day] = iso.split('-').map(Number);
    const dows = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const t = new Date();
    const tm = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    const dm = String(day).padStart(2, '0') + '/' + String(m).padStart(2, '0');
    const dmy = withYear ? dm + '/' + y : dm;
    if (iso === this.todayIso()) return 'Hôm nay (' + dmy + ')';
    if (iso === this.iso(tm)) return 'Ngày mai (' + dmy + ')';
    return dows[new Date(y, m - 1, day).getDay()] + ' (' + dmy + ')';
  }

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

  protected readonly customTime = signal('');
  protected readonly timeErr = signal('');
  protected readonly timeOpen = signal(false);

  protected pickTime(d: OrderDraft, t: string): void {
    d.time.set(t);
    this.customTime.set('');
    this.timeErr.set('');
    this.timeOpen.set(false);
  }

  /** Giờ tự gõ: tự thêm dấu ":" và chỉ nhận giờ nằm trong khung nhận đặt của bài */
  protected onCustomTime(d: OrderDraft, raw: string): void {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    const txt = digits.length > 2 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits;
    this.customTime.set(txt);
    this.timeErr.set('');
    const m = txt.match(/^(\d{2}):(\d{2})$/);
    if (!m) return;
    const mins = Number(m[1]) * 60 + Number(m[2]);
    const [a, b] = d.tpl.time.win.map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    if (Number(m[1]) > 23 || Number(m[2]) > 59) return void this.timeErr.set('Giờ không hợp lệ.');
    if (mins < a || mins > b) return void this.timeErr.set('Chỉ nhận trong khung ' + d.tpl.time.win[0] + ' – ' + d.tpl.time.win[1] + '.');
    d.time.set(txt);
    this.timeOpen.set(false);
  }

  protected openCheckout(): void {
    const d = this.draft();
    if (d && !d.date()) d.date.set(this.todayIso());
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

  /** Chọn voucher trong hộp: áp ngay, tổng tiền cập nhật liền. Bấm lại voucher đang áp thì bỏ. */
  protected chooseVoucher(d: OrderDraft, v: Voucher): void {
    d.voucher.set(d.voucher()?.id === v.id ? null : v);
  }

  protected voucherWhy(v: Voucher, d: OrderDraft): string {
    if (v.ship) return d.needsAddress() ? 'Chỉ áp dụng khi có phí giao' : 'Chỉ áp dụng khi chọn giao tận nơi';
    return 'Cần đơn từ ' + this.fmt(v.min) + ' (đơn này ' + this.fmt(d.subtotal()) + ')';
  }

  protected dayOf(ms: number): string {
    return new Date(ms).toLocaleDateString('vi-VN');
  }

  /** Đổi Xu lấy voucher ngay trong hộp rồi tự chọn voucher vừa đổi nếu dùng được */
  protected redeem(d: OrderDraft, cid: string): void {
    const before = new Set(this.xu.vouchers().map((x) => x.id));
    if (!this.xu.redeem(cid)) return void this.toast.show('Bạn chưa đủ Xu');
    const fresh = this.xu.vouchers().find((x) => !before.has(x.id));
    if (fresh && this.voucherOk(fresh, d)) d.voucher.set(fresh);
    this.toast.show('Đã đổi voucher');
  }

  protected pickVoucher(d: OrderDraft, v: Voucher | null): void {
    d.voucher.set(v);
    this.voucherOpen.set(false);
  }

  protected addressText(a: Address): string {
    return a.unit + ', ' + (a.block.length === 1 ? 'Block ' + a.block : a.block);
  }

  protected saveAddress(d: OrderDraft): void {
    if (this.addrForm.invalid) return this.addrForm.markAllAsTouched();
    const v = this.addrForm.getRawValue();
    this.addressService.create({ ...v, note: v.note.trim() || undefined }).subscribe({
      next: (a) => {
        this.addresses.update((l) => [...l, a]);
        d.addressId.set(a._id);
        this.addrForm.reset({ name: '', phone: '', block: 'B', unit: '', note: '', label: 'family' });
        this.addrNew.set(false);
        this.addrOpen.set(false);
        this.toast.show('Đã thêm địa chỉ');
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  protected pickAddress(d: OrderDraft, a: Address): void {
    d.addressId.set(a._id);
    this.addrOpen.set(false);
  }

  /** "Hôm nay (23/10) · 11:00", thêm thời lượng với dịch vụ tính theo giờ */
  protected whenLabel(d: OrderDraft): string {
    const t = d.tpl.time;
    const day = this.dateLabel(d.date() || this.todayIso(), true);
    if (t.mode === 'datedur') return day + ' · ' + d.time() + ' · ' + d.hours() + ' giờ' + (d.repeat() ? ' · lặp hằng tuần' : '');
    return day + ' · ' + d.time();
  }

  protected doneSteps(o: Order): string[] {
    return placedStepNames(o.kind, !!o.priceCheck, !!o.detail?.pickup);
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
        address: a ? a.name + ' · ' + a.phone + '\n' + this.addressText(a) : undefined,
        place: placeText,
        when: this.whenLabel(d),
        whenLabel: 'Thời gian dự kiến nhận hàng',
        pickup: !d.needsAddress(),
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

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.datebox')) this.calOpen.set(false);
    if (!t.closest('.timebox')) this.timeOpen.set(false);
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
