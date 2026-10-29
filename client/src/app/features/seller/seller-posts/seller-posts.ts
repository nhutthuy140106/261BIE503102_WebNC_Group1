import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { SELLER_LANE, SELLER_NEW_KINDS, SellerPost } from '../../../core/models/seller';
import { SellerSpaceService } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';
import { SortOption } from '../../../shared/components/sort-menu/sort-menu';

type Status = 'all' | 'open' | 'low' | 'off' | 'promo';

/**
 * Bài đăng (design/mockups/seller-posts.html): mọi bài của gian hàng, mỗi mảng một hàng thẻ.
 * Lọc mảng (tab viên) / trạng thái (nút thả xuống); trên thẻ sửa giá tại chỗ, ± số lượng, bật/tắt, Xu, nhân bản, xóa.
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
  protected readonly newOpen = signal(false);
  protected readonly statusOptions: SortOption[] = [
    { key: 'all', label: 'Mọi trạng thái' },
    { key: 'open', label: 'Đang hoạt động' },
    { key: 'low', label: 'Sắp hết' },
    { key: 'off', label: 'Tạm ngưng' },
    { key: 'promo', label: 'Đang quảng bá' },
  ];

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
    this.seller.posts().filter((p) => (this.kind() === 'all' || p.kind === this.kind()) && this.matchStatus(p)),
  );
  protected readonly groups = computed(() =>
    this.kinds.map((k) => ({ kind: k, posts: this.shown().filter((p) => p.kind === k) })).filter((g) => g.posts.length),
  );

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

  // ---- nhân bản / xóa: hỏi lại trước khi làm ----
  protected readonly ask = signal<{ kind: 'dup' | 'del'; post: SellerPost } | null>(null);
  protected readonly askView = computed(() => {
    const a = this.ask();
    if (!a) return null;
    return a.kind === 'dup'
      ? { heading: 'Bạn có chắc chắn muốn nhân bản bài?', message: 'Bản sao sẽ ở trạng thái Tạm ngưng, sửa xong bạn bật lên.', icon: 'copy', danger: false }
      : { heading: 'Bạn có chắc chắn muốn xóa bài?', message: 'Bài đã xóa sẽ không khôi phục được.', icon: 'trash', danger: true };
  });

  protected duplicate(p: SellerPost): void {
    this.ask.set({ kind: 'dup', post: p });
  }

  protected remove(p: SellerPost): void {
    this.ask.set({ kind: 'del', post: p });
  }

  protected confirmAsk(): void {
    const a = this.ask();
    this.ask.set(null);
    if (!a) return;
    if (a.kind === 'dup') {
      this.seller.duplicatePost(a.post.id);
      this.toast.show('Đã nhân bản — bản sao đang tạm ngưng, sửa xong thì bật lên');
    } else {
      this.seller.removePost(a.post.id);
      this.toast.show(`Đã xóa “${a.post.title}”`);
    }
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
