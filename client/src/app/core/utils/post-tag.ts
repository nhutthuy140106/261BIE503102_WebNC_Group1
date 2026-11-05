import { KIND_LABEL, PostKind } from '../models/post';

/**
 * Nhãn phân loại trên thẻ bài, chỉ có 5 nhãn: Đồ ăn, Đồ uống, Đồ dùng, Dịch vụ, Việc làm.
 * Danh mục con người bán chọn (Giặt sấy, Đồ bếp, Cơm nhà làm…) không dùng làm nhãn.
 * Đồ uống cùng nhóm `food` với đồ ăn: nhận ra qua mẫu bài, form đăng hoặc danh mục.
 */
export function postTag(p: { kind: PostKind; category?: string; template?: string; formType?: string }): string {
  if (p.kind !== 'food') return KIND_LABEL[p.kind];
  return p.template === 'drink' || p.formType === 'drink' || p.category === 'Đồ uống' ? 'Đồ uống' : 'Đồ ăn';
}
