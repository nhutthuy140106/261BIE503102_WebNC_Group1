import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { SELLER_LANE, SELLER_NEW_KINDS, SellerPost } from '../../../core/models/seller';
import { SellerSpaceService } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';

type Status = 'all' | 'open' | 'low' | 'off' | 'promo';
const strip = (s: string) => s.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Bài đăng (design/mockups/seller-posts.html): mọi bài của gian hàng, mỗi mảng một hàng thẻ.
 * Lọc mảng / trạng thái / tìm không dấu; trên thẻ sửa giá tại chỗ, ± số lượng, bật/tắt, Xu, nhân bản, xóa.
 * `?kind=food` · `?status=promo` mở sẵn bộ lọc (link "Quảng bá bằng AntXu" ở footer).
 */
@Component({
  selector: 'app-seller-posts',
  standalone: false,
  templateUrl: './seller-posts.html',
  styleUrls: ['../seller-ui.css', './seller-posts.css'],
})
export class SellerPosts implements OnInit {
  protected readonly seller = inject(SellerSpaceService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly newKinds = SELLER_NEW_KINDS;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly lane = SELLER_LANE;
  protected readonly kinds: PostKind[] = ['food', 'goods', 'service', 'job'];

  protected readonly kind = signal<PostKind | 'all'>((this.route.snapshot.queryParamMap.get('kind') as PostKind) ?? 'all');
  protected readonly status = signal<Status>((this.route.snapshot.queryParamMap.get('status') as Status) ?? 'all');
  protected readonly q = signal('');
  protected readonly newOpen = signal(false);

  private matchStatus(p: SellerPost): boolean {
    const st = this.seller.postState(p).cls;
    switch (this.status()) {
      case 'open': return st === 'go';
      case 'low': return st === 'wait';
      case 'off': return st === 'off';
      case 'promo': return !!p.promo;
      default: return true;
    }
  }

  protected readonly shown = computed(() =>
    this.seller.posts().filter((p) => (this.kind() === 'all' || p.kind === this.kind()) && this.matchStatus(p) && (!this.q() || strip(p.title).includes(strip(this.q())))),
  );
  protected readonly groups = computed(() =>
    this.kinds.map((k) => ({ kind: k, posts: this.shown().filter((p) => p.kind === k) })).filter((g) => g.posts.length),
  );
  protected readonly openCount = computed(() => this.seller.posts().filter((p) => this.seller.postState(p).cls !== 'off').length);
  protected readonly views = computed(() => this.shown().reduce((s, p) => s + p.views, 0));
  protected readonly saves = computed(() => this.shown().reduce((s, p) => s + p.saves, 0));

  protected count(k: PostKind | 'all'): number {
    return this.seller.posts().filter((p) => k === 'all' || p.kind === k).length;
  }

  ngOnInit(): void {
    this.seller.load().subscribe();
  }


  protected toggle(p: SellerPost): void {
    const on = !p.on;
    this.seller.setPost(p.id, { on, ...(on && !p.stock ? { stock: p.max } : {}) });
    this.toast.show(on ? `Đã mở lại “${p.title}”` : `Đã tạm ẩn “${p.title}” — khách vẫn thấy bài nhưng chưa đặt được`);
  }

  protected promote(p: SellerPost): void {
    this.toast.show(this.seller.promote(p.id) ?? `Cần ${SELLER_LANE[p.kind].xu[1]} Xu, bạn còn ${this.seller.xu()} Xu`);
  }

  protected price(p: SellerPost, v: number): void {
    this.seller.setPost(p.id, { price: v });
    this.toast.show(`Đã đổi giá thành ${v.toLocaleString('vi-VN')}đ`);
  }

  protected duplicate(p: SellerPost): void {
    this.seller.duplicatePost(p.id);
    this.toast.show('Đã nhân bản — bản sao đang tạm ẩn, sửa xong thì bật lên');
  }

  protected remove(p: SellerPost): void {
    this.seller.removePost(p.id);
    this.toast.show(`Đã xóa “${p.title}”`);
  }

  protected reset(e: Event): void {
    e.preventDefault();
    this.seller.reset().subscribe(() => this.toast.show('Đã đặt lại dữ liệu mẫu'));
  }

  @HostListener('document:click', ['$event'])
  onDoc(e: Event): void {
    if (this.newOpen() && !(e.target as HTMLElement).closest('.newwrap')) this.newOpen.set(false);
  }
}
