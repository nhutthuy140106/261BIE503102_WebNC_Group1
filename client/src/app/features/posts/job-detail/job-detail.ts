import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Post } from '../../../core/models/post';
import { PostService } from '../../../core/services/post';
import { resolveId } from '../../../core/utils/slug-helper';

/** Chi tiết việc làm + Đề nghị nhận việc (gửi đề nghị ≠ đã nhận việc). */
@Component({
  selector: 'app-job-detail',
  standalone: false,
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.css',
})
export class JobDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly postService = inject(PostService);

  protected readonly job = signal<Post | null>(null);
  protected readonly loading = signal(true);
  protected readonly sent = signal(false);

  protected readonly offerForm = new FormGroup({
    intro: new FormControl('', [Validators.required, Validators.minLength(10), Validators.maxLength(300)]),
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = resolveId(params.get('slug') ?? '');
          return id ? this.postService.getPostById(id) : of(undefined);
        }),
      )
      .subscribe({
        next: (p) => {
          this.job.set(p ?? null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  submitOffer(): void {
    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      return;
    }
    // TODO(backend): POST /api/offers { jobId, intro }
    this.sent.set(true);
  }
}
