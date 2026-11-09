import { OrderWindow } from '../utils/order-window';
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

/** Trạng thái bài (docs/post-contract.md). `closed` của Post là bản suy ra: status ≠ 'open'. */
export type PostStatus = 'draft' | 'open' | 'soldout' | 'closed' | 'hidden';
export type PayMethod = 'cash' | 'transfer' | 'xu';
/** Tài khoản nhận chuyển khoản của bài, người bán nhập ở form đăng bài */
export interface PostBank {
  bankName: string;
  no: string;
  holder: string;
  qr?: string;
}
/** Khối 1 — cách tính giá. `price`/`priceUnit` của Post là giá đại diện (thấp nhất) để lọc, sắp xếp. */
export type PriceType = 'fixed' | 'unit' | 'from' | 'quote';

/** Một món trong thực đơn / một dòng trong bảng giá dịch vụ — bài nhiều món gom vào MỘT Post */
export interface PostItem {
  id: string;
  name: string;
  price: number;
  unit?: string;
  /** số phần/ngày; bỏ trống = không giới hạn */
  dailyQty?: number;
  /** tùy chọn riêng của món (size, topping…) */
  optionGroups?: OptionGroup[];
}

export interface ComboItem {
  postId: string;
  qty: number;
  title: string;
  unitPrice: number;
  unit?: string;
  image?: string;
  available: boolean;
}

export interface ComboDetail {
  items: ComboItem[];
  listPrice: number;
  saving: number;
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
  /** Khu (KTX, chung cư…) của người đăng — để lọc bài theo khu đang xem */
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
  /** Khung giờ nhận đơn do người bán đặt (khác Giờ vàng). Ngoài khung bài tự khóa; không có = theo mẫu loại bài. */
  orderWindow?: OrderWindow;
  /** Combo: gói nhiều món cùng người bán (price = giá combo). Giá lẻ và tiết kiệm do server tính (mock tự tính). */
  combo?: { items: { postId: string; qty: number }[]; comboPrice: number; listPrice: number };
  /** Chi tiết combo (chỉ ở trang chi tiết): từng món + tiết kiệm theo giá đang trả */
  comboDetail?: ComboDetail;
  rating?: number;
  reviewCount?: number;
  /** Số lượt đã bán / đã đặt (chỉ bài bán, không có ở việc làm) */
  sold?: number;
  /** Bài quảng bá bằng AntXu — hiện nhãn "QUẢNG BÁ" */
  promoted?: boolean;
  /** Người bán trả AntXu để món dễ ra hơn trong trang Quay món (có nhãn "Quảng bá"); khác với `promoted` ở trang chủ */
  spinPromo?: boolean;
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
  /** Trạng thái do người bán điều khiển; thiếu = 'open' */
  status?: PostStatus;
  /** Khối 1: cách tính giá (price là giá đại diện) */
  priceType?: PriceType;
  /** Giá theo đơn vị chỉ là ước tính (giặt theo kg sau khi cân) */
  estimate?: boolean;
  /** Phí kiểm tra khi báo giá sau */
  inspectFee?: number;
  /** Thực đơn nhiều món / bảng giá dịch vụ. Bài một món: bỏ trống, dùng price + optionGroups cấp bài */
  items?: PostItem[];
  /** Cách nhận tiền */
  payMethods?: PayMethod[];
  /** Tài khoản và mã QR khi bài nhận chuyển khoản */
  bank?: PostBank;
  /** Đồ ăn, đồ uống: tùy chọn nhanh người bán đặt, khách tick khi đặt, không tính tiền. Không có = dùng dòng mặc định của mẫu */
  quickOptions?: string[];
  /** Đồ ăn, đồ uống: false = người bán tắt ô ghi chú */
  noteEnabled?: boolean;
  /** Miễn phí giao cho đơn từ số tiền này */
  freeShipFrom?: number;
  /** Các khu người bán phục vụ (bài đăng từ form khu Bán); `block` ghi sẵn tên các khu để hiển thị */
  areas?: string[];
  /** Dọn dẹp: mỗi đơn một dịch vụ, khách không chọn số lượng; giá là tổng các tùy chọn khách chọn */
  bookOnce?: boolean;
  /** Dọn dẹp: danh sách dịch vụ, mỗi dịch vụ có tùy chọn cộng giá và câu hỏi riêng (khách chọn dịch vụ xong mới hiện) */
  serviceMenu?: { name: string; optionGroups: OptionGroup[]; questions: PostQuestion[] }[];
  /** Giặt sấy: người làm luôn qua nhà khách lấy đồ nên luôn cần địa chỉ; cách nhận chỉ áp dụng lúc trả đồ */
  pickupAtBuyer?: boolean;
  /** Dịch vụ không có mục Thông tin nhanh (giặt sấy, lưu trú): 3 ô đầu bài lấy từ các ô người bán đã điền */
  highlights?: { icon: 'clock' | 'bolt' | 'pin' | 'check' | 'receipt'; label: string; value: string }[];
  /** Thông tin người bán đã điền, hiện dưới Mô tả (nội quy, điều kiện hủy, phạm vi phục vụ…) */
  info?: { label: string; value: string }[];
  /** Khối 3: ngày bán / ngày làm (yyyy-mm-dd) */
  dates?: string[];
  /** Khối 3: dịch vụ — kiểu chọn thời gian và thời lượng (giờ) */
  timeMode?: 'slot' | 'datedur' | 'stay';
  duration?: { min: number; max: number };
  repeat?: boolean;
  /** Khối 4: dịch vụ làm ở đâu (tại nhà khách · khách mang tới · khách chọn · A→B) + địa chỉ người bán */
  place?: { mode: 'buyer' | 'seller' | 'choice' | 'ab'; where?: string };
  /** Đồ ăn/uống: thời gian chuẩn bị (phút). `handover` = khung giờ khách chọn hẹn: giờ giao/nhận món (đồ ăn) hoặc giờ làm dịch vụ */
  prepMinutes?: number;
  handover?: { from: string; to: string };
  /** Dịch vụ: 3 thông tin nhanh người bán điền (thời gian hoàn thành · bảo hành · phạm vi) */
  serviceInfo?: { turnaround?: string; warranty?: string; area?: string };
  /** Đồ dùng: tình trạng theo % độ mới (100 · 90 · 80 · 50) + mô tả lỗi nếu có */
  condition?: { level: string; note?: string };
  /** Khối 7: tình trạng bán */
  stock?: { mode: 'open' | 'limit' | 'once'; left?: number };
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
    /** Số người cần */
    head?: number;
    /** Cách trả công: tiền mặt / chuyển khoản */
    payBy?: 'cash' | 'transfer';
    /** Tòa nhà hiện trên bài; số nhà, tầng chỉ gửi cho người được chọn */
    building?: string;
    /** Đơn vị tiền công: việc · giờ · lượt… */
    payUnit?: string;
    offers: number;
    status: 'open' | 'taken';
    /** Khung giờ người nhận được chọn: chữ "08:30 – 11:00" (form khu Bán) hoặc ISO (server). Rỗng = Sáng, Chiều, Tối */
    windows?: string[];
  };
}
