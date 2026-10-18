import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { KIND_LABEL, PostKind } from '../../../core/models/post';

/** Form đăng bài (khung). Sẽ mở rộng theo mô hình 7 khối ở docs/handoff.md. */
@Component({
  selector: 'app-post-form',
  standalone: false,
  templateUrl: './post-form.html',
  styleUrl: './post-form.css',
})
export class PostForm implements CanComponentDeactivate {
  private readonly router = inject(Router);

  protected readonly kinds = Object.entries(KIND_LABEL) as [PostKind, string][];
  private saved = false;

  protected readonly form = new FormGroup({
    kind: new FormControl<PostKind>('food', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
  });

  hasUnsavedChanges(): boolean {
    return !this.saved && this.form.dirty;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO(backend): POST /api/posts (server tự gán sellerId từ session)
    this.saved = true;
    this.router.navigate(['/seller/posts']);
  }
}
