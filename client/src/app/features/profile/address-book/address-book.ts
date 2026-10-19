import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AppError } from '../../../core/models/api';
import { Address, BLOCKS } from '../../../core/models/user';
import { AddressService } from '../../../core/services/address';
import { phoneValidator } from '../../../core/utils/validators';

/** Sổ địa chỉ của tôi: danh sách, thêm/sửa, xóa, đặt mặc định. */
@Component({
  selector: 'app-address-book',
  standalone: false,
  templateUrl: './address-book.html',
  styleUrl: './address-book.css',
})
export class AddressBook implements OnInit {
  private readonly service = inject(AddressService);

  protected readonly blocks = BLOCKS;
  protected readonly items = signal<Address[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal<Address | 'new' | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, phoneValidator] }),
    block: new FormControl<'A' | 'B' | 'C' | 'D'>('B', { nonNullable: true }),
    unit: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30)] }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    label: new FormControl<'home' | 'family' | 'other'>('home', { nonNullable: true }),
    isDefault: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.service.list().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  startNew(): void {
    this.form.reset({ block: 'B', label: 'home', isDefault: false });
    this.editing.set('new');
  }

  startEdit(a: Address): void {
    this.form.reset({ ...a, note: a.note ?? '' });
    this.editing.set(a);
  }

  save(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const target = this.editing();
    const body = this.form.getRawValue();
    const req = target && target !== 'new' ? this.service.update(target._id, body) : this.service.create(body);
    req.subscribe({
      next: () => {
        this.editing.set(null);
        this.error.set(null);
        this.reload();
      },
      error: (e: Error) => {
        if (e instanceof AppError) for (const d of e.details) this.form.get(d.field)?.setErrors({ server: d.message });
        this.error.set(e.message);
      },
    });
  }

  makeDefault(a: Address): void {
    this.service.setDefault(a._id).subscribe({ next: () => this.reload(), error: (e: Error) => this.error.set(e.message) });
  }

  remove(a: Address): void {
    this.service.remove(a._id).subscribe({ next: () => this.reload(), error: (e: Error) => this.error.set(e.message) });
  }
}
