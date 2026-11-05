import type { Post } from '../models/post';

/**
 * Bài có bán ở khu này không: theo các khu người bán đã chọn, bài mẫu thì theo khu của bài.
 * Bài không có thông tin khu (server chưa trả về) thì không lọc, kẻo mất hết bài.
 */
export function inArea(p: Post, area: string): boolean {
  if (p.areas?.length) return p.areas.includes(area);
  return p.area ? p.area === area : true;
}
