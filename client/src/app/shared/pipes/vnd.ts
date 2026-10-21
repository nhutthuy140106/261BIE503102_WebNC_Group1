import { Pipe, PipeTransform } from '@angular/core';

/** 35000 -> "35.000đ" (chấm ngăn cách hàng nghìn như bản mẫu; Angular `number` ra "35,000"). */
@Pipe({ name: 'vnd', standalone: false })
export class VndPipe implements PipeTransform {
  transform(value: number | null | undefined, suffix = 'đ'): string {
    if (value == null || isNaN(value)) return '';
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + suffix;
  }
}
