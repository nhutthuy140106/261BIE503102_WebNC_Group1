import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Post } from '../../../core/models/post';
import { SellerPost } from '../../../core/models/seller';
import { SellerService } from '../../../core/services/seller';
import { SellerSpaceService } from '../../../core/services/seller-space';
import { ToastService } from '../../../core/services/toast';
import { UploadService } from '../../../core/services/upload';

/**
 * Sửa nhanh bài: dành cho bài chưa có dữ liệu form đăng bài (bài mẫu, bài đăng bằng API) nên không mở lại được đúng từng ô của form đầy đủ.
 * Chỉ sửa các trường chính (tên, mô tả, ảnh, giá, số còn lại, bật / tắt); thực đơn, tùy chọn, lịch bán… giữ NGUYÊN như đã lưu —
 * trình này chỉ gửi đúng các trường bạn sửa nên không thể ghi đè nhầm phần khác. Muốn sửa toàn bộ thì đăng lại bằng form đầy đủ.
 */
@Component({
  selector: 'app-seller-post-quick',
  standalone: false,
  styleUrls: ['../seller-ui.css'],
  styles: [
    `
      :host { display: block; max-width: 760px; margin: 0 auto; padding: 24px 0 60px; }
      h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: -.02em; }
      .lead { margin: 0 0 18px; color: var(--smoke); font-size: 14px; line-height: 1.5; }
      .box { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: grid; gap: 14px; }
      label.f { display: grid; gap: 6px; font-weight: 600; font-size: 13.5px; }
      label.f small { font-weight: 400; color: var(--smoke); }
      .input, textarea.input { border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font: inherit; width: 100%; box-sizing: border-box; background: #fff; }
      textarea.input { min-height: 120px; resize: vertical; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .imgs { display: flex; flex-wrap: wrap; gap: 10px; }
      .im { position: relative; width: 96px; height: 96px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
      .im img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .im button { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; border: 0; background: rgba(0, 0, 0, .65); color: #fff; cursor: pointer; line-height: 1; }
      .add { width: 96px; height: 96px; border-radius: 10px; border: 1.5px dashed var(--border); display: grid; place-items: center; color: var(--smoke); font-size: 13px; cursor: pointer; text-align: center; }
      .err { color: #b3372b; font-size: 13px; font-weight: 600; }
      .foot { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
      .note { background: var(--soft); border-radius: 10px; padding: 10px 12px; font-size: 13px; color: var(--smoke); line-height: 1.5; }
      .on { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    `,
  ],
  template: `
    <h1>Sửa nhanh bài</h1>
    <p class="lead">Bài này chưa có dữ liệu form đăng bài nên sửa ở đây: chỉ các trường dưới đây thay đổi, mọi phần còn lại (thực đơn, tùy chọn, lịch bán…) giữ nguyên.</p>
    @if (loading()) {
      <p class="lead">Đang tải bài…</p>
    } @else if (!post()) {
      <div class="box"><span class="err">Không tìm thấy bài của bạn.</span><div class="foot"><a class="btn" routerLink="/seller/posts">Về danh sách bài</a></div></div>
    } @else {
      <form class="box" (submit)="save($event)">
        <label class="f">Tên bài<input class="input" [value]="title()" (input)="title.set($any($event.target).value)" maxlength="100" /></label>
        <label class="f">Mô tả<textarea class="input" [value]="desc()" (input)="desc.set($any($event.target).value)" maxlength="2000"></textarea></label>
        <div class="row">
          <label class="f">{{ post()!.kind === 'job' ? 'Tiền công (đ)' : 'Giá (đ)' }}<input class="input" type="number" min="0" step="500" [value]="price()" (input)="price.set(+$any($event.target).value)" /></label>
          <label class="f">Đơn vị<input class="input" [value]="unit()" (input)="unit.set($any($event.target).value)" maxlength="20" placeholder="phần, ly, lần…" /></label>
        </div>
        @if (post()!.kind !== 'job') {
          @if (limited()) {
            <label class="f">Số còn lại<small>Bài này giới hạn số lượng. Về 0 thì hiện "Hết hàng".</small><input class="input" type="number" min="0" [value]="left()" (input)="left.set(+$any($event.target).value)" /></label>
          }
          <div class="f">
            Ảnh <small>(tối đa 5, ảnh đầu tiên là ảnh bìa)</small>
            <div class="imgs">
              @for (u of images(); track u; let i = $index) {
                <div class="im"><img [src]="u" alt="" /><button type="button" (click)="removeImage(i)" aria-label="Bỏ ảnh">×</button></div>
              }
              @if (images().length < 5) {
                <label class="add">{{ uploading() ? 'Đang tải…' : '+ Thêm ảnh' }}<input type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="addImage($any($event.target))" /></label>
              }
            </div>
          </div>
        }
        <label class="on"><input type="checkbox" [checked]="open()" (change)="open.set($any($event.target).checked)" />Đang nhận khách (bỏ tick = tạm ngưng)</label>
        @if (error()) { <span class="err">{{ error() }}</span> }
        <div class="foot">
          <a class="btn" routerLink="/seller/posts">Hủy</a>
          <button type="submit" class="btn primary" [disabled]="saving() || uploading()">{{ saving() ? 'Đang lưu…' : 'Lưu thay đổi' }}</button>
        </div>
      </form>
    }
  `,
})
export class SellerPostQuick implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seller = inject(SellerSpaceService);
  private readonly api = inject(SellerService);
  private readonly uploads = inject(UploadService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly post = signal<Post | null>(null);
  private local: SellerPost | undefined;
  protected readonly title = signal('');
  protected readonly desc = signal('');
  protected readonly price = signal(0);
  protected readonly unit = signal('');
  protected readonly images = signal<string[]>([]);
  protected readonly left = signal(0);
  protected readonly open = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);

  protected limited(): boolean {
    return this.post()?.stock?.mode === 'limit';
  }

  ngOnInit(): void {
    this.seller.load().subscribe(() => {
      const id = this.route.snapshot.paramMap.get('id');
      this.local = this.seller.posts().find((x) => x.id === id);
      const serverId = this.local?.buyerPostId;
      if (!serverId) return this.loading.set(false);
      this.api.getPost(serverId).subscribe({
        next: (p) => {
          this.post.set(p);
          this.title.set(p.title);
          this.desc.set(p.description);
          this.price.set(p.price);
          this.unit.set(p.priceUnit ?? '');
          this.images.set([...p.images]);
          this.left.set(p.stock?.left ?? 0);
          this.open.set(!p.closed);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  protected removeImage(i: number): void {
    this.images.update((l) => l.filter((_, k) => k !== i));
  }

  protected addImage(input: HTMLInputElement): void {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    this.uploading.set(true);
    this.error.set('');
    this.uploads.upload(f).subscribe({
      next: (url) => {
        this.images.update((l) => [...l, url].slice(0, 5));
        this.uploading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.uploading.set(false);
      },
    });
  }

  protected save(e: Event): void {
    e.preventDefault();
    const p = this.post();
    if (!p || this.saving()) return;
    const title = this.title().trim();
    const desc = this.desc().trim();
    if (title.length < 5) return this.error.set('Tên bài tối thiểu 5 ký tự.');
    if (desc.length < 10) return this.error.set('Mô tả tối thiểu 10 ký tự.');
    if (!(this.price() >= 0)) return this.error.set('Giá không hợp lệ.');
    if (p.kind !== 'job' && !this.images().length) return this.error.set('Cần ít nhất 1 ảnh để khách tin hơn.');
    this.error.set('');
    this.saving.set(true);
    // chỉ gửi đúng các trường đã sửa
    const call = this.api.quickEdit(p, {
      title, description: desc, price: Math.round(this.price()), unit: this.unit().trim(), images: this.images(), open: this.open(),
      ...(this.limited() ? { left: Math.max(0, Math.round(this.left())) } : {}),
    });
    call.subscribe({
      next: () => {
        this.seller.refreshFromServer();
        this.toast.show('Đã lưu thay đổi');
        this.router.navigate(['/seller/posts']);
      },
      error: (er: Error) => {
        this.error.set(er.message || 'Không lưu được, thử lại nhé.');
        this.saving.set(false);
      },
    });
  }
}
