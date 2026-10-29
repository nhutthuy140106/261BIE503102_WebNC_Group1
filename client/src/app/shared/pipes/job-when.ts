import { Pipe, PipeTransform } from '@angular/core';
import { jobWhen } from '../../core/utils/status-label';

/** {{ post.job | jobWhen }} -> "24/10/2026 · 06:30" (một kiểu ngày giờ cho mọi nơi) */
@Pipe({ name: 'jobWhen', standalone: false })
export class JobWhenPipe implements PipeTransform {
  transform(job: Parameters<typeof jobWhen>[0]): string {
    return jobWhen(job);
  }
}
