import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../../core/models/order';
import { AreaService } from '../../../core/services/area';
import { AuthService } from '../../../core/services/auth';
import { OrderService } from '../../../core/services/order';
import { SavedService } from '../../../core/services/saved';
import { ToastService } from '../../../core/services/toast';
import { XuService } from '../../../core/services/xu';

const FINISHED = ['done', 'cancelled', 'rejected', 'withdrawn'];

type Tab = 'overview' | 'edit' | 'password' | 'saved' | 'addresses' | 'xu' | 'area';

/**
 * Tôi — trung tâm tài khoản kiểu "Tài khoản của tôi": menu bên trái, mỗi mục một khung nội dung riêng
 * (thay cho một trang dài xếp chồng nhiều mục). Mục đang mở nằm trên URL: /profile?tab=xu.
 */
@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly area = inject(AreaService);
  protected readonly xu = inject(XuService);
  protected readonly saved = inject(SavedService);
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly tab = signal<Tab>('overview');
  protected readonly stats = signal({ placed: 0, received: 0, history: 0 });
  protected readonly showAllXu = signal(false);
  protected readonly ledger = computed(() => (this.showAllXu() ? this.xu.ledger() : this.xu.ledger().slice(0, 6)));

  protected readonly menu: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'edit', label: 'Chỉnh sửa hồ sơ' },
    { key: 'password', label: 'Đổi mật khẩu' },
    { key: 'saved', label: 'Bài đã lưu' },
    { key: 'addresses', label: 'Địa chỉ của tôi' },
    { key: 'xu', label: 'AntXu & voucher' },
    { key: 'area', label: 'Khu vực' },
  ];

  // ----- chỉnh sửa hồ sơ -----
  protected readonly profileForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(40)] }),
  });
  protected readonly newAvatar = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected pickAvatar(input: HTMLInputElement): void {
    const f = input.files?.[0];
    input.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    const img = new Image();
    const src = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 320 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k);
      cv.height = Math.round(img.height * k);
      cv.getContext('2d')?.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(src);
      this.newAvatar.set(cv.toDataURL('image/jpeg', 0.85));
    };
    img.src = src;
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) return this.profileForm.markAllAsTouched();
    this.saving.set(true);
    this.auth.updateProfile({ fullName: this.profileForm.controls.fullName.value.trim(), avatar: this.newAvatar() ?? this.auth.currentUser()?.avatar }).subscribe({
      next: () => {
        this.saving.set(false);
        this.newAvatar.set(null);
        this.toast.show('Đã lưu hồ sơ');
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.toast.show(e.message);
      },
    });
  }

  // ----- đổi mật khẩu -----
  protected readonly passForm = new FormGroup({
    current: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    next: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    again: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly passTried = signal(false);

  protected passMismatch(): boolean {
    const v = this.passForm.getRawValue();
    return !!v.again && v.again !== v.next;
  }

  protected savePassword(): void {
    this.passTried.set(true);
    const v = this.passForm.getRawValue();
    if (this.passForm.invalid || this.passMismatch() || v.next === v.current) return;
    this.saving.set(true);
    this.auth.changePassword(v.current, v.next).subscribe({
      next: () => {
        this.saving.set(false);
        this.passForm.reset();
        this.passTried.set(false);
        this.toast.show('Đã đổi mật khẩu');
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.toast.show(e.message);
      },
    });
  }

  ngOnInit(): void {
    this.profileForm.controls.fullName.setValue(this.auth.currentUser()?.fullName ?? '');
    this.route.queryParamMap.subscribe((p) => {
      const t = p.get('tab') as Tab | null;
      this.tab.set(t && this.menu.some((m) => m.key === t) ? t : 'overview');
    });
    this.orders.getOrders().subscribe({
      next: (list: Order[]) =>
        this.stats.set({
          placed: list.filter((o) => o.type === 'placed' && !FINISHED.includes(o.status as string)).length,
          received: list.filter((o) => o.type === 'received' && !FINISHED.includes(o.status as string)).length,
          history: list.filter((o) => FINISHED.includes(o.status as string)).length,
        }),
      error: () => undefined,
    });
  }

  protected go(t: Tab): void {
    if (t === 'xu') return void this.router.navigate(['/xu']);
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t === 'overview' ? null : t } });
  }

  protected badge(t: Tab): string {
    return t === 'xu' ? String(this.xu.balance()) : '';
  }

  protected date(ms: number): string {
    return new Date(ms).toLocaleDateString('vi-VN');
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/']));
  }
}
