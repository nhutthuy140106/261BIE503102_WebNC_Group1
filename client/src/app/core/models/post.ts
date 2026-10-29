import type { Promo } from '../utils/promo';
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

/**
 * Một câu hỏi người bán đặt cho người mua. Chỉ có 4 loại (người bán chọn loại, không tự vẽ ô nhập):
 * text = ô nhập chữ · choice = chọn 1 · multi = chọn nhiều · photo = ảnh.
 * Lựa chọn viết "Tên" hoặc "Tên|+5.000đ" (có phụ phí). Chi tiết ở docs/handoff.md mục "Câu hỏi riêng".
 */
export interface PostQuestion {
  type?: 'text' | 'choice' | 'multi' | 'photo';
  label: string;
  required?: boolean;
  /** choice / multi: các lựa chọn */
  opts?: string[];
  /** text: chữ gợi ý trong ô, ví dụ "1 thùng hàng Shopee tên Thu Hà" */
  ph?: string;
  /** text: ô nhiều dòng */
  long?: boolean;
  /** dòng giải thích nhỏ dưới câu hỏi */
  hint?: string;
  /** câu "Cần trả tiền giùm?": chọn "Có" thì hỏi thêm số tiền */
  pay?: boolean;
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
  /** Giờ vàng (khuyến mãi theo khung giờ); giá thật do server tính, mock tự tính cùng quy tắc */
  promo?: Promo;
  rating?: number;
  reviewCount?: number;
  /** Số lượt đã bán / đã đặt (chỉ bài bán, không có ở việc làm) */
  sold?: number;
  /** Bài quảng bá bằng AntXu — hiện nhãn "QUẢNG BÁ" */
  promoted?: boolean;
  acceptsXu?: boolean;
  /** Người bán đã ẩn/đóng bài — không hiện ở phía Mua */
  closed?: boolean;
  /** Nhóm tùy chọn cộng giá (size, topping…) — người mua chọn ở bước 1 */
  optionGroups?: OptionGroup[];
  /** Câu hỏi riêng người bán đặt ra cho người mua */
  /** Câu hỏi riêng người bán đặt cho người mua — form đăng bài (phía Bán) soạn ra, khung đặt hàng (phía Mua) vẽ lại đúng như vậy */
  questions?: PostQuestion[];
  fulfillmentModes?: ('delivery' | 'pickup')[];
  deliveryFee?: number;
  needSchedule?: boolean;
  createdAt: string;
  /** Chỉ dùng cho việc làm */
  job?: {
    /** Mô tả thời gian dạng chữ — chỉ dùng khi việc lặp lại theo tuần ("Tối T3 & T5"); việc có ngày cụ thể dùng start/end */
    due: string;
    /** Ngày giờ bắt đầu làm (ISO). Có `start` thì hiển thị theo kiểu chung dd/MM/yyyy · HH:mm */
    start?: string;
    /** Ngày giờ kết thúc (ISO), nếu việc kéo dài nhiều ngày */
    end?: string;
    /** Chỉ có ngày, không có giờ cụ thể */
    allDay?: boolean;
    offers: number;
    status: 'open' | 'taken';
    /** Khung giờ người nhận được chọn (ISO). Rỗng = tự do */
    windows?: string[];
  };
}
