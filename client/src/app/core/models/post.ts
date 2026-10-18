/** 4 nhóm phía Mua (xem docs/handoff.md): Đồ ăn · Đồ dùng · Dịch vụ · Việc làm */
export type PostKind = 'food' | 'goods' | 'service' | 'job';

export const KIND_LABEL: Record<PostKind, string> = {
  food: 'Đồ ăn & uống',
  goods: 'Đồ dùng',
  service: 'Dịch vụ',
  job: 'Việc làm',
};

export interface Post {
  /** ObjectId (24 ký tự hex) của MongoDB */
  _id: string;
  kind: PostKind;
  title: string;
  description: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  /** Block/khu vực của người đăng, ví dụ "Block B" */
  block: string;
  /** Giá bán (đồ ăn, đồ dùng, dịch vụ) hoặc tiền công (việc làm), đơn vị VND */
  price: number;
  /** "phần", "giờ", "lần"… — bỏ trống nếu giá cố định */
  priceUnit?: string;
  rating?: number;
  reviewCount?: number;
  /** Bài quảng bá bằng AntXu — hiện nhãn "QUẢNG BÁ" */
  promoted?: boolean;
  acceptsXu?: boolean;
  createdAt: string;
  /** Chỉ dùng cho việc làm */
  job?: {
    due: string;
    offers: number;
    status: 'open' | 'taken';
  };
}
