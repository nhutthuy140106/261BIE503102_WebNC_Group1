/**
 * Xác minh danh tính để mở gian hàng / đăng bán (người mua không cần).
 * none = chưa nộp · pending = chờ AntGo duyệt · approved = được bán · rejected = bị từ chối (nộp lại được).
 */
export type VerifyStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type ShopType = 'food' | 'goods' | 'service';

export const SHOP_TYPES: { key: ShopType; label: string }[] = [
  { key: 'food', label: 'Đồ ăn & uống' },
  { key: 'goods', label: 'Đồ dùng' },
  { key: 'service', label: 'Dịch vụ' },
];

/** Hồ sơ người bán nộp. Ảnh giấy tờ chỉ đội AntGo xem — không bao giờ hiện công khai. */
export interface VerifyBody {
  fullName: string;
  /** Số CCCD 12 số */
  idNumber: string;
  /** Tên tệp ảnh (bản mẫu chưa lưu ảnh; bản thật server trả về mã tham chiếu riêng tư) */
  idFront: string;
  idBack: string;
  selfie: string;
  shopName: string;
  shopType: ShopType;
  intro?: string;
}

export interface SellerVerification {
  status: VerifyStatus;
  submittedAt?: string;
  reviewedAt?: string;
  /** Lý do khi bị từ chối, để người dùng sửa và nộp lại */
  rejectReason?: string;
  body?: VerifyBody;
}
