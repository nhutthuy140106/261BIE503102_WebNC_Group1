import { Pipe, PipeTransform } from '@angular/core';

/** 150 -> "150m", 1200 -> "1,2km". */
@Pipe({ name: 'distance', standalone: false })
export class DistancePipe implements PipeTransform {
  transform(m: number | null | undefined): string {
    if (m == null || isNaN(m)) return '';
    return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')}km` : `${m}m`;
  }
}
