import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL } from '../../../core/models/post';
import { DayHours, SELLER_KIND_ICON, SellerPost } from '../../../core/models/seller';
import { AuthService } from '../../../core/services/auth';
import { SellerSpaceService, dateOf } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';

type Tab = 'sell' | 'jobs' | 'revs';
const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const REPLY = ['Thường trả lời trong 10 phút', 'Thường trả lời trong 30 phút', 'Thường trả lời trong 1 giờ', 'Thường trả lời trong ngày'];
/** Giờ chọn theo nấc 30 phút 06:00 → 22:00 */
const TIMES = Array.from({ length: 33 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

/**
 * Gian hàng của tôi (design/mockups/seller-shop.html) — xem gian hàng ở chế độ NGƯỜI BÁN, khác "Xem như khách" (/shop/:id):
 * đổi ảnh bìa / đại diện, sửa hồ sơ, số liệu riêng, hồ sơ hoàn thiện, giờ nhận đơn + ngày nghỉ, tab bài / việc / đánh giá (phản hồi được).
 */
@Component({
  selector: 'app-seller-shop',
  standalone: false,
  templateUrl: './seller-shop.html',
  styleUrls: ['../seller-ui.css', './seller-shop.css'],
})
export class SellerShop implements OnInit {
  protected readonly seller = inject(SellerSpaceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly days = DAYS;
  protected readonly replies = REPLY;
  protected readonly times = TIMES;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly myId = computed(() => this.auth.currentUser()?._id ?? '');

  protected readonly tab = signal<Tab>((this.route.snapshot.queryParamMap.get('tab') as Tab) || 'sell');
  protected readonly editing = signal(false);
  protected readonly hoursOpen = signal(false);

  protected readonly sell = computed(() => this.seller.posts().filter((p) => p.kind !== 'job'));
  protected readonly jobs = computed(() => this.seller.posts().filter((p) => p.kind === 'job'));
  protected readonly openCount = computed(() => this.seller.posts().filter((p) => p.on).length);

  /** Danh sách hoàn thiện hồ sơ: [tên, đã có chưa, cách thêm] */
  protected readonly checklist = computed(() => {
    const sh = this.seller.shop();
    if (!sh) return [];
    return [
      { t: 'Ảnh đại diện', ok: !!sh.avatar, how: 'avatar' },
      { t: 'Lời giới thiệu', ok: sh.bio.trim().length >= 20, how: 'edit' },
      { t: 'Ảnh bìa gian hàng', ok: !!sh.cover, how: 'cover' },
      { t: 'Thời gian trả lời', ok: !!sh.reply, how: 'edit' },
    ];
  });
  protected readonly done = computed(() => this.checklist().filter((c) => c.ok).length + 1);

  ngOnInit(): void {
    this.seller.load().subscribe();
  }

  protected postState(p: SellerPost) {
    return this.seller.postState(p);
  }

  protected save(e: Event, f: HTMLFormElement): void {
    e.preventDefault();
    const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
    if (!v('name') || v('bio').length < 10) return this.toast.show('Nhập tên gian hàng và lời giới thiệu (ít nhất 10 ký tự)');
    this.seller.setShop({ name: v('name'), kind: v('kind'), at: v('at'), reply: v('reply'), bio: v('bio') });
    this.editing.set(false);
    this.toast.show('Đã lưu hồ sơ gian hàng');
  }

  /** Ảnh PNG/JPG/WebP ≤ 2 MB, thu nhỏ để lưu được trong trình duyệt */
  protected pickImage(input: HTMLInputElement, which: 'avatar' | 'cover'): void {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 2 * 1024 * 1024) return this.toast.show('Chọn ảnh PNG/JPG/WebP dưới 2 MB');
    const max = which === 'avatar' ? 240 : 1200;
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = im.width * k;
        c.height = im.height * k;
        c.getContext('2d')?.drawImage(im, 0, 0, c.width, c.height);
        this.seller.setShop({ [which]: c.toDataURL('image/jpeg', 0.82) });
        this.toast.show(which === 'avatar' ? 'Đã đổi ảnh đại diện' : 'Đã thêm ảnh bìa gian hàng');
      };
      im.src = r.result as string;
    };
    r.readAsDataURL(f);
  }

  protected sendReply(e: Event, id: string, input: HTMLInputElement): void {
    e.preventDefault();
    if (!input.value.trim()) return;
    this.seller.reply(id, input.value.trim());
    this.toast.show('Đã gửi phản hồi');
  }

  // ---- giờ nhận đơn + ngày nghỉ (dải giờ trên Lịch và trang Hôm nay đọc cùng cài đặt) ----
  protected setDay(i: number, patch: Partial<DayHours>): void {
    const H = this.seller.hours().map((h) => ({ ...h }));
    Object.assign(H[i], patch);
    if (H[i].from >= H[i].to) return this.toast.show('Giờ kết thúc phải sau giờ bắt đầu');
    this.seller.setHours(H);
    this.toast.show(`Đã lưu giờ nhận đơn ${DAYS[i]}`);
  }

  protected addOff(e: Event, date: HTMLInputElement, note: HTMLInputElement): void {
    e.preventDefault();
    if (!date.value) return;
    const d = Math.round((new Date(date.value + 'T00:00').getTime() - dateOf(0).getTime()) / 86400000);
    if (d < 0) return this.toast.show('Chọn ngày từ hôm nay trở đi');
    this.seller.setOff(d, note.value.trim());
    this.toast.show(`Đã đặt ngày nghỉ ${dateOf(d).toLocaleDateString('vi-VN')} — khách thấy “Tạm nghỉ”`);
    date.value = '';
    note.value = '';
  }

  protected offLabel(d: number): string {
    return dateOf(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  /** yyyy-mm-dd theo giờ địa phương (toISOString lệch múi giờ) */
  protected readonly today = ((d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(dateOf(0));

  protected stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
}
