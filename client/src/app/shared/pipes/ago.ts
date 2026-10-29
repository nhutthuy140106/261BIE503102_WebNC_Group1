import { Pipe, PipeTransform } from '@angular/core';

/** Thời điểm ISO -> "vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước". */
@Pipe({ name: 'ago', standalone: false })
export class AgoPipe implements PipeTransform {
  transform(iso: string | null | undefined): string {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const min = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (min < 1) return 'vừa xong';
    if (min < 60) return `${min} phút trước`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.round(h / 24)} ngày trước`;
  }
}
