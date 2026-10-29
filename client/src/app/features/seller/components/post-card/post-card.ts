import { Component, EventEmitter, HostListener, Input, Output, computed, inject, signal } from '@angular/core';
import { KIND_LABEL } from '../../../../core/models/post';
import { SELLER_KIND_ICON, SELLER_LANE, SellerPost } from '../../../../core/models/seller';
import { AuthService } from '../../../../core/services/auth';
import { SellerSpaceService } from '../../../../core/services/seller-space';
import { ToastService } from '../../../../core/services/toast';

/**
 * Thẻ một bài ở "Tình trạng bán" (trang Hôm nay) và trang Bài đăng:
 * nhãn trạng thái · lượt xem / QUẢNG BÁ · tên · giá · nút ± số lượng · công tắc bật/tắt · nút dùng Xu.
 * `manage` (trang Bài đăng): ♡ lượt lưu cạnh tên, sửa giá tại chỗ + "Đã bán / Đã đặt n" cùng hàng giá, nút sửa và menu
 * (nhân bản, xem như khách, xóa — trang cha hỏi lại trước khi làm).
 */
@Component({
  selector: 'app-seller-post-card',
  standalone: false,
  templateUrl: './post-card.html',
  styleUrls: ['../../seller-ui.css', './post-card.css'],
})
export class SellerPostCard {
  private readonly seller = inject(SellerSpaceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) post!: SellerPost;
  @Input() manage = false;
  @Output() readonly toggled = new EventEmitter<void>();
  @Output() readonly promoted = new EventEmitter<void>();
  @Output() readonly priced = new EventEmitter<number>();
  @Output() readonly duplicated = new EventEmitter<void>();
  @Output() readonly removed = new EventEmitter<void>();

  protected readonly lane = SELLER_LANE;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindIcon = SELLER_KIND_ICON;
  protected readonly myId = computed(() => this.auth.currentUser()?._id ?? '');

  protected readonly editing = signal(false);
  protected readonly menuOpen = signal(false);

  protected get st() {
    return this.seller.postState(this.post);
  }

  /** Bài việc làm mở chi tiết việc, bài bán mở form sửa */
  protected get link(): string[] {
    return this.post.kind === 'job' && this.post.jobId ? ['/seller/jobs', this.post.jobId] : this.editLink;
  }

  protected get editLink(): string[] {
    return ['/seller/posts', this.post.id, 'edit'];
  }

  protected get soldText(): string {
    if (this.post.kind !== 'job') return `${this.post.kind === 'service' ? 'Đã đặt' : 'Đã bán'} ${this.post.sold}`;
    return `${this.seller.jobs().find((j) => j.id === this.post.jobId)?.offers.length ?? 0} đề nghị`;
  }

  /** Việc làm cần ít nhất 1 người; bài bán xuống 0 là hết */
  protected get min(): number {
    return this.post.kind === 'job' ? 1 : 0;
  }

  /** ± số lượng còn bán / nhận ngay trên thẻ, kèm thông báo có nút Hoàn tác */
  protected step(d: number): void {
    const prev = this.post.stock;
    const next = Math.max(this.min, Math.min(this.post.max, prev + d));
    if (next === prev) return;
    const id = this.post.id;
    this.seller.setPost(id, { stock: next });
    this.toast.show(`Bạn vừa điều chỉnh còn ${next} ${SELLER_LANE[this.post.kind].unit}`, 5000, {
      label: 'Hoàn tác',
      run: () => this.seller.setPost(id, { stock: prev }),
    });
  }

  protected savePrice(e: Event, v: string): void {
    e.preventDefault();
    this.editing.set(false);
    this.priced.emit(Math.max(0, Math.round(+v || 0)));
  }

  @HostListener('document:click', ['$event'])
  onDoc(e: Event): void {
    if (this.menuOpen() && !(e.target as HTMLElement).closest('.menu, .more')) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.editing.set(false);
    this.menuOpen.set(false);
  }
}
