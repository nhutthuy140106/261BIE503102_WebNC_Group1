import { Post } from '../models/post';

/**
 * Đơn vị giá hiển thị cho người mua — gom về một bộ ngắn, dễ hiểu:
 * đồ ăn = phần, đồ uống = ly, đồ dùng = không ghi (mua cả món), bài bán trọn gói = combo, dịch vụ = lần / giờ / kg / buổi, việc làm = lần / buổi / ngày.
 * Người bán gõ tự do (ổ, hộp, combo, ca, máy…) nên ở đây chuẩn hóa lại; khi form đăng bài cho chọn từ danh sách cố định thì bỏ bước này.
 */
export function displayUnit(p: Pick<Post, 'kind' | 'category' | 'priceUnit'>): string {
  const u = (p.priceUnit ?? '').trim().toLowerCase();
  if (u === 'combo') return 'combo';
  switch (p.kind) {
    case 'goods':
      return '';
    case 'food':
      return p.category === 'Đồ uống' || u === 'ly' ? 'ly' : 'phần';
    case 'service':
      return ['kg', 'giờ', 'buổi'].includes(u) ? u : 'lần';
    case 'job':
      return /ngày|tuần/.test(u) ? u : u === 'buổi' || u === 'ca' ? 'buổi' : 'lần';
  }
}
