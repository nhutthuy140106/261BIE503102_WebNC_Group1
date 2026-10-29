import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SHOP_TYPES, ShopType } from '../../../core/models/seller-verification';
import { AuthService } from '../../../core/services/auth';
import { SellerVerificationService } from '../../../core/services/seller-verification';
import { validateImage } from '../../../core/services/upload';
import { idCardValidator } from '../../../core/utils/validators';

type Slot = 'idFront' | 'idBack' | 'selfie';
interface Photo {
  name: string;
  url: string;
}

/** Ba ảnh giấy tờ cần nộp: nhãn + gợi ý chụp. */
const SLOTS: { key: Slot; label: string; hint: string }[] = [
  { key: 'idFront', label: 'CCCD mặt trước', hint: 'Thấy rõ ảnh, họ tên và số thẻ' },
  { key: 'idBack', label: 'CCCD mặt sau', hint: 'Không che, không lóa' },
  { key: 'selfie', label: 'Ảnh chân dung cầm CCCD', hint: 'Thấy rõ mặt và thẻ trong cùng một ảnh' },
];

/**
 * Xác minh danh tính để mở gian hàng. Người mua không cần; người bán nộp hồ sơ, chờ AntGo duyệt.
 * Ảnh giấy tờ chỉ để xem trước tại chỗ và lưu tên tệp (bản mẫu) — không đưa vào kho ảnh công khai.
 */
@Component({
  selector: 'app-seller-verify',
  standalone: false,
  templateUrl: './seller-verify.html',
  styleUrl: './seller-verify.css',
})
export class SellerVerify implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly verify = inject(SellerVerificationService);

  protected readonly slots = SLOTS;
  protected readonly shopTypes = SHOP_TYPES;
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly photos = signal<Record<Slot, Photo | null>>({ idFront: null, idBack: null, selfie: null });
  protected readonly photoError = signal<Partial<Record<Slot, string>>>({});
  /** Đã bấm Gửi mà còn thiếu ảnh → hiện nhắc */
  protected readonly triedSubmit = signal(false);
  protected readonly missingPhoto = computed(() => SLOTS.some((s) => !this.photos()[s.key]));

  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)] }),
    idNumber: new FormControl('', { nonNullable: true, validators: [Validators.required, idCardValidator] }),
    shopName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(40)] }),
    shopType: new FormControl<ShopType>('food', { nonNullable: true }),
    intro: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    agree: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  ngOnInit(): void {
    this.form.patchValue({ fullName: this.auth.currentUser()?.fullName ?? '' });
    this.verify.load().subscribe(() => {
      // hồ sơ bị từ chối: điền lại thông tin đã nộp để người dùng chỉ sửa chỗ cần
      const b = this.verify.current().body;
      if (this.verify.current().status === 'rejected' && b) {
        this.form.patchValue({ fullName: b.fullName, idNumber: b.idNumber, shopName: b.shopName, shopType: b.shopType, intro: b.intro ?? '' });
      }
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    Object.values(this.photos()).forEach((p) => p && URL.revokeObjectURL(p.url));
  }

  protected invalid(name: 'fullName' | 'idNumber' | 'shopName' | 'agree'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  protected pick(slot: Slot, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const problem = validateImage(file);
    this.photoError.update((e) => ({ ...e, [slot]: problem ?? undefined }));
    if (problem) {
      input.value = '';
      return;
    }
    const old = this.photos()[slot];
    if (old) URL.revokeObjectURL(old.url);
    this.photos.update((p) => ({ ...p, [slot]: { name: file.name, url: URL.createObjectURL(file) } }));
  }

  protected removePhoto(slot: Slot): void {
    const old = this.photos()[slot];
    if (old) URL.revokeObjectURL(old.url);
    this.photos.update((p) => ({ ...p, [slot]: null }));
  }

  protected submit(): void {
    this.triedSubmit.set(true);
    if (this.form.invalid || this.missingPhoto()) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    const p = this.photos();
    this.submitting.set(true);
    this.error.set(null);
    this.verify
      .submit({
        fullName: f.fullName.trim(),
        idNumber: f.idNumber.trim(),
        idFront: p.idFront!.name,
        idBack: p.idBack!.name,
        selfie: p.selfie!.name,
        shopName: f.shopName.trim(),
        shopType: f.shopType,
        intro: f.intro.trim() || undefined,
      })
      .subscribe({
        next: () => this.submitting.set(false),
        error: (e: Error) => {
          this.error.set(e.message || 'Chưa gửi được hồ sơ. Bạn thử lại nhé.');
          this.submitting.set(false);
        },
      });
  }

  protected goSell(): void {
    this.router.navigate(['/seller']);
  }

  // ---- thanh "Bản mẫu": giả lập phía AntGo duyệt hồ sơ ----
  protected simApprove(): void {
    this.verify.simulateApprove().subscribe();
  }

  protected simReject(): void {
    this.verify.simulateReject('Ảnh CCCD bị mờ, chưa đọc được số thẻ. Bạn chụp lại ở nơi đủ sáng nhé.').subscribe();
  }

  protected simReset(): void {
    this.verify.simulateReset().subscribe(() => this.photos.set({ idFront: null, idBack: null, selfie: null }));
  }
}
