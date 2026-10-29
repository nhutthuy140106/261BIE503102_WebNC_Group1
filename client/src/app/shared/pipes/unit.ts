import { Pipe, PipeTransform } from '@angular/core';
import { Post } from '../../core/models/post';
import { displayUnit } from '../../core/utils/unit';

/** `post | unit` -> "phần", "lần"… (rỗng nếu không cần ghi đơn vị) */
@Pipe({ name: 'unit', standalone: false })
export class UnitPipe implements PipeTransform {
  transform(p: Post): string {
    return displayUnit(p);
  }
}
