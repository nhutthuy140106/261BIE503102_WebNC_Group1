import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, combineLatest, debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppError } from '../../../core/models/api';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { KIND_LABEL, PostKind } from '../../../core/models/post';
import { BLOCKS } from '../../../core/models/user';
import { PricingService } from '../../../core/services/pricing';
import { SellerService } from '../../../core/services/seller';
import { PriceSuggestion } from '../../../core/utils/price-suggest';
import { UploadService } from '../../../core/services/upload';

const MAX_IMAGES = 4;

/**
 * Form đăng / sửa bài. Mới có các trường chung + giá; mô hình 7 khối (tùy chọn cộng giá, câu hỏi riêng,
 * tình trạng bán…) chờ chốt schema `Post` (decisions F1/Q2).
 */
@Component({
  selector: 'app-post-form',
  standalone: false,
  templateUrl: './post-form.html',
  styleUrl: './post-form.css',
})
export class PostForm implements OnInit, CanComponentDeactivate {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seller = inject(SellerService);
  private readonly upload = inject(UploadService);
  private readonly pricing = inject(PricingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly kinds = Object.entries(KIND_LABEL) as [PostKind, string][];
  protected readonly blocks = BLOCKS;
  protected readonly maxImages = MAX_IMAGES;
  protected readonly editingId = signal<string | null>(null);
  protected readonly images = signal<string[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isJob = signal(false);
  protected readonly priceLabel = computed(() => (this.isJob() ? 'Tiền công (đ)' : 'Giá (đ)'));
  /** Gợi ý giá theo tên + loại (kNN trên bài tương tự); null khi chưa đủ dữ liệu */
  protected readonly priceHint = signal<PriceSuggestion | null>(null);
  private saved = false;

  protected readonly form = new FormGroup({
    kind: new FormControl<PostKind>('food', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)] }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    priceUnit: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
    block: new FormControl('B', { nonNullable: true }),
    due: new FormControl('', { nonNullable: true }),
    acceptsXu: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.form.controls.kind.valueChanges.subscribe((k) => this.onKind(k));
    combineLatest([
      this.form.controls.title.valueChanges.pipe(startWith(this.form.controls.title.value), debounceTime(500), map((t) => t.trim())),
      this.form.controls.kind.valueChanges.pipe(startWith(this.form.controls.kind.value)),
    ])
      .pipe(
        distinctUntilChanged(([t1, k1], [t2, k2]) => t1 === t2 && k1 === k2),
        switchMap(([title, kind]) => (title.length >= 5 ? this.pricing.suggest(kind, title).pipe(catchError(() => EMPTY)) : [null])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((h) => this.priceHint.set(h));
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      this.loading.set(true);
      this.seller.getPost(id).subscribe({
        next: (p) => {
          this.form.patchValue({
            kind: p.kind, title: p.title, description: p.description, price: p.price, priceUnit: p.priceUnit ?? '',
            block: p.block.replace('Block ', ''), due: p.job?.due ?? '', acceptsXu: !!p.acceptsXu,
          });
          this.images.set(p.images);
          this.onKind(p.kind);
          this.form.markAsPristine();
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.error.set(e.message);
          this.loading.set(false);
        },
      });
    }
  }

  private onKind(k: PostKind): void {
    this.isJob.set(k === 'job');
    const due = this.form.controls.due;
    due.setValidators(k === 'job' ? [Validators.required, Validators.maxLength(60)] : []);
    due.updateValueAndValidity({ emitEvent: false });
  }

  applyHint(value: number): void {
    this.form.controls.price.setValue(value);
    this.form.controls.price.markAsDirty();
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && (this.form.dirty || (!this.editingId() && this.images().length > 0));
  }

  addImages(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []).slice(0, MAX_IMAGES - this.images().length);
    input.value = '';
    this.error.set(null);
    for (const f of files) {
      this.upload.upload(f).subscribe({
        next: (url) => {
          this.images.update((l) => [...l, url]);
          this.form.markAsDirty();
        },
        error: (e: Error) => this.error.set(e.message),
      });
    }
  }

  removeImage(i: number): void {
    this.images.update((l) => l.filter((_, k) => k !== i));
    this.form.markAsDirty();
  }

  onSubmit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.seller
      .savePost(
        { kind: v.kind, title: v.title, description: v.description, price: v.price, priceUnit: v.priceUnit.trim() || undefined,
          block: `Block ${v.block}`, images: this.images(), acceptsXu: v.acceptsXu, due: v.kind === 'job' ? v.due.trim() : undefined },
        this.editingId() ?? undefined,
      )
      .subscribe({
        next: () => {
          this.saved = true;
          this.router.navigate(['/seller/posts']);
        },
        error: (e: Error) => {
          if (e instanceof AppError) for (const d of e.details) this.form.get(d.field)?.setErrors({ server: d.message });
          this.error.set(e.message);
          this.submitting.set(false);
        },
      });
  }
}
