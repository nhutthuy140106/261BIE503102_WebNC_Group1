/** 4 nhóm phía Mua (xem docs/handoff.md): Đồ ăn · Đồ dùng · Dịch vụ · Việc làm */
export type PostKind = 'food' | 'goods' | 'service' | 'job';

export const KIND_LABEL: Record<PostKind, string> = {
  food: 'Đồ ăn & uống',
  goods: 'Đồ dùng',
  service: 'Dịch vụ',
  job: 'Việc làm',
};

export interface OptionGroup {
  name: string;
  multi: boolean;
  required: boolean;
  choices: { label: string; price: number }[];
}

export interface Post {
  /** ObjectId (24 ký tự hex) của MongoDB */
  _id: string;
  kind: PostKind;
  title: string;
  description: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  /** Ảnh đại diện người bán/người đăng (URL); thiếu thì hiện chữ cái đầu */
  sellerAvatar?: string;
  /** Block/khu vực của người đăng, ví dụ "Block B" */
  block: string;
  /** Khu (KTX, chung cư…) của người đăng — để ưu tiên bài cùng khu khi tìm kiếm */
  area?: string;
  /** Khoảng cách tới người xem, tính bằng mét (server tính; mock là số mẫu) */
  distance?: number;
  /** Danh mục con hiển thị trên thẻ việc (Mua hộ, Gia sư…) hoặc nhãn loại (Đồ uống…) */
  category?: string;
  /** Mẫu chi tiết 7 khối của bản mẫu (mock): food, drink, goods, svc, fix, clean, trip */
  template?: string;
  /** Mock: đăng cách đây bao nhiêu phút (để "2 giờ trước" luôn tươi theo giờ hiện tại) */
  agoMin?: number;
  /** Giá bán (đồ ăn, đồ dùng, dịch vụ) hoặc tiền công (việc làm), đơn vị VND */
  price: number;
  /** "phần", "giờ", "lần"… — bỏ trống nếu giá cố định */
  priceUnit?: string;
  rating?: number;
  reviewCount?: number;
  /** Bài quảng bá bằng AntXu — hiện nhãn "QUẢNG BÁ" */
  promoted?: boolean;
  acceptsXu?: boolean;
  /** Người bán đã ẩn/đóng bài — không hiện ở phía Mua */
  closed?: boolean;
  /** Nhóm tùy chọn cộng giá (size, topping…) — người mua chọn ở bước 1 */
  optionGroups?: OptionGroup[];
  /** Câu hỏi riêng người bán đặt ra cho người mua */
  questions?: { label: string; required: boolean }[];
  fulfillmentModes?: ('delivery' | 'pickup')[];
  deliveryFee?: number;
  needSchedule?: boolean;
  createdAt: string;
  /** Chỉ dùng cho việc làm */
  job?: {
    due: string;
    offers: number;
    status: 'open' | 'taken';
    /** Khung giờ người nhận được chọn (ISO). Rỗng = tự do */
    windows?: string[];
  };
}
