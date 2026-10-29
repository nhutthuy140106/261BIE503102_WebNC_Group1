import { Pipe, PipeTransform } from '@angular/core';

/** 1234 -> "1,2k"; dưới 1000 giữ nguyên */
@Pipe({ name: 'count', standalone: false })
export class CountPipe implements PipeTransform {
  transform(n: number | null | undefined): string {
    if (n == null) return '';
    return n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',').replace(',0', '') + 'k' : String(n);
  }
}
