import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL } from '../../../core/models/post';
import { SELLER_KIND_ICON, SellerPost } from '../../../core/models/seller';
import { AuthService } from '../../../core/services/auth';
import { SellerSpaceService } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';

type Tab = 'sell' | 'jobs' | 'revs';
const REPLY = ['Thường trả lời trong 10 phút', 'Thường trả lời trong 30 phút', 'Thường trả lời trong 1 giờ', 'Thường trả lời trong ngày'];

/**
 * Gian hàng của tôi (design/mockups/seller-shop.html) — xem gian hàng ở chế độ NGƯỜI BÁN, khác "Xem như khách" (/shop/:id):
 * đổi ảnh bìa / đại diện, sửa hồ sơ, số liệu, hồ sơ hoàn thiện, tab bài / việc đang hoạt động / đánh giá (phản hồi được).
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

  protected readonly replies = REPLY;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly myId = computed(() => this.auth.currentUser()?._id ?? '');

  protected readonly tab = signal<Tab>((this.route.snapshot.queryParamMap.get('tab') as Tab) || 'sell');
  protected readonly editing = signal(false);

  /** Chỉ bài đang hoạt động (gồm "Sắp hết"); bài tạm ngưng / nháp không hiện ở gian hàng */
  private readonly live = computed(() => this.seller.posts().filter((p) => this.seller.postState(p).cls !== 'off'));
  protected readonly sell = computed(() => this.live().filter((p) => p.kind !== 'job'));
  protected readonly jobs = computed(() => this.live().filter((p) => p.kind === 'job'));
  protected readonly openCount = computed(() => this.live().length);

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
  protected readonly done = computed(() => this.checklist().filter((c) => c.ok).length);

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

  protected stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
}
