import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, switchMap, forkJoin } from 'rxjs';
import { CanComponentDeactivate } from '../../../core/guards/pending-changes-guard';
import { AppError } from '../../../core/models/api';
import { OFFER_STATE_LABEL, Offer } from '../../../core/models/offer';
import { Post } from '../../../core/models/post';
import { Question } from '../../../core/models/social';
import { AuthPromptService } from '../../../core/services/auth-prompt';
import { SavedService } from '../../../core/services/saved';
import { ToastService } from '../../../core/services/toast';
import { JobOfferService } from '../../../core/services/job-offer';
import { PostService } from '../../../core/services/post';
import { QuestionService } from '../../../core/services/question';
import { resolveId } from '../../../core/utils/slug-helper';
import { formatDateTime } from '../../../core/utils/status-label';
import { noPhoneValidator } from '../../../core/utils/validators';

const SLOTS = ['Sáng', 'Chiều', 'Tối'];

/** Chi tiết việc làm + Đề nghị nhận việc + Hỏi đáp công khai (gửi đề nghị ≠ đã nhận việc). */
@Component({
  selector: 'app-job-detail',
  standalone: false,
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.css',
})
export class JobDetail implements OnInit, CanComponentDeactivate {
  private readonly route = inject(ActivatedRoute);
  private readonly postService = inject(PostService);
  private readonly offers = inject(JobOfferService);
  private readonly questions = inject(QuestionService);
  private readonly router = inject(Router);
  private readonly prompt = inject(AuthPromptService);
  private readonly toast = inject(ToastService);
  protected readonly saved = inject(SavedService);

  protected readonly others = signal<Post[]>([]);
  protected readonly posterStats = signal({ posted: 0, done: 0 });
  protected readonly confirm = signal(false);
  protected readonly sent = signal(false);

  protected readonly job = signal<Post | null>(null);
  protected readonly myOffer = signal<Offer | null>(null);
  protected readonly qa = signal<Question[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly stateLabel = OFFER_STATE_LABEL;
  protected readonly slotOptions = signal<{ value: string; label: string }[]>(SLOTS.map((s) => ({ value: s, label: s })));

  protected readonly offerForm = new FormGroup({
    slots: new FormArray<FormControl<boolean>>(SLOTS.map(() => new FormControl(false, { nonNullable: true }))),
    intro: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(300)] }),
  });
  protected readonly askForm = new FormGroup({
    text: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(500), noPhoneValidator] }),
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = resolveId(params.get('slug') ?? '');
          this.loading.set(true);
          if (!id) return of(null);
          return forkJoin({
            job: this.postService.getPostById(id),
            offer: this.offers.findActiveForJob(id),
            qa: this.questions.list(id),
          });
        }),
      )
      .subscribe({
        next: (r) => {
          this.job.set(r?.job ?? null);
          this.setSlotOptions(r?.job?.job?.windows ?? []);
          this.myOffer.set(r?.offer ?? null);
          this.qa.set(r?.qa ?? []);
          this.confirm.set(false);
          this.sent.set(false);
          if (r?.job) {
            const j = r.job;
            this.postService.getPosts().subscribe((all) => {
              const jobs = all.filter((p) => p.kind === 'job');
              const mine = jobs.filter((p) => p.sellerId === j.sellerId);
              this.posterStats.set({ posted: mine.length, done: Math.max(0, mine.length - 1) });
              this.others.set(jobs.filter((p) => p._id !== j._id).slice(0, 4));
            });
            const r2 = this.prompt.takeResume<{ jobId: string; intro: string; slots: boolean[] }>('offer');
            if (r2 && r2.jobId === j._id) {
              this.offerForm.controls.intro.setValue(r2.intro);
              r2.slots.forEach((v, i) => this.offerForm.controls.slots.at(i)?.setValue(v));
              this.offerForm.markAsDirty();
            }
          }
          this.loading.set(false);
        },
        error: (e: Error) => {
          this.error.set(e.message);
          this.loading.set(false);
        },
      });
  }

  /** Việc có khung giờ cụ thể (ISO) thì chỉ cho chọn trong đó; không thì 3 buổi chung. */
  private setSlotOptions(windows: string[]): void {
    const opts = windows.length
      ? windows.map((w) => ({ value: w, label: formatDateTime(w) }))
      : SLOTS.map((s) => ({ value: s, label: s }));
    this.slotOptions.set(opts);
    const arr = this.offerForm.controls.slots;
    arr.clear();
    opts.forEach(() => arr.push(new FormControl(false, { nonNullable: true })));
  }

  back(): void {
    history.length > 1 ? history.back() : this.router.navigate(['/search'], { queryParams: { kind: 'job' } });
  }

  hasUnsavedChanges(): boolean {
    return !this.myOffer() && this.offerForm.dirty;
  }

  /** Bấm "Đề nghị nhận việc": khách → đăng nhập (giữ lời giới thiệu); đủ thông tin → hộp xác nhận. */
  askConfirm(): void {
    const j = this.job();
    if (!j) return;
    if (this.offerForm.invalid) return this.offerForm.markAllAsTouched();
    const v = this.offerForm.getRawValue();
    if (!this.prompt.require('offer', { type: 'offer', payload: { jobId: j._id, intro: v.intro, slots: v.slots } })) return;
    this.confirm.set(true);
  }

  protected chosenSlots(): string {
    const v = this.offerForm.getRawValue();
    const l = this.slotOptions().filter((_, i) => v.slots[i]).map((o) => o.label);
    return l.length ? l.join(', ') : 'Chưa chọn — thỏa thuận sau';
  }

  protected toggleSave(): void {
    const j = this.job();
    if (j) this.saved.toggle(j._id);
  }

  protected share(): void {
    navigator.clipboard?.writeText(location.href).then(() => this.toast.show('Đã chép liên kết việc'), () => this.toast.show('Không chép được liên kết'));
  }

  protected message(): void {
    const j = this.job();
    if (j && this.prompt.require('chat')) this.router.navigate(['/messenger'], { queryParams: { with: j.sellerId } });
  }

  protected openOrder(): void {
    const o = this.myOffer();
    if (o) this.router.navigate(['/orders', o._id]);
  }

  submitOffer(): void {
    const j = this.job();
    if (!j) return;
    if (this.offerForm.invalid) return this.offerForm.markAllAsTouched();
    const v = this.offerForm.getRawValue();
    const slots = this.slotOptions().filter((_, i) => v.slots[i]).map((o) => o.value);
    this.submitting.set(true);
    this.error.set(null);
    this.offers.create(j._id, { intro: v.intro.trim(), slots }).subscribe({
      next: (o) => {
        this.myOffer.set(o);
        this.offerForm.markAsPristine();
        this.sent.set(true);
        this.submitting.set(false);
      },
      error: (e: Error) => {
        this.applyServerErrors(e, this.offerForm);
        this.error.set(e.message);
        this.submitting.set(false);
      },
    });
  }

  withdraw(): void {
    const o = this.myOffer();
    if (!o) return;
    this.offers.act(o._id, 'withdraw').subscribe({
      next: () => this.myOffer.set(null),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  ask(): void {
    const j = this.job();
    if (!j) return;
    if (!this.prompt.require('ask')) return;
    if (this.askForm.invalid) return this.askForm.markAllAsTouched();
    this.questions.ask(j._id, this.askForm.getRawValue().text).subscribe({
      next: (q) => {
        this.qa.update((l) => [...l, q]);
        this.askForm.reset();
      },
      error: (e: Error) => this.applyServerErrors(e, this.askForm),
    });
  }

  /** Server trả 422 kèm field → hiện đúng chỗ (server vẫn là nơi validate bắt buộc). */
  private applyServerErrors(e: Error, form: FormGroup): void {
    if (!(e instanceof AppError)) return;
    for (const d of e.details) form.get(d.field)?.setErrors({ server: d.message });
  }
}
