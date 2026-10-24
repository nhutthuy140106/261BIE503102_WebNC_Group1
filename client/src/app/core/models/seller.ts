import { OfferState } from './offer';
import { PaymentMethod } from './order';
import { PostKind } from './post';

/**
 * Không gian Bán & Đăng việc (phía người bán / người đăng việc).
 * Dữ liệu mẫu ở public/datasets/seller-space.json (tài khoản Bếp Cô Lan), chuyển từ design/mockups/shared/seller-data.js.
 * `day` là số ngày so với hôm nay (0 = hôm nay, -1 = hôm qua) để bản mẫu luôn "tươi" theo ngày mở.
 */

export interface SellerPerson {
  name: string;
  avatar: string;
  phone: string;
}

/** Bài đăng của tôi — `stock`: số phần còn / số cái / buổi trống / số người cần, tùy loại */
export interface SellerPost {
  id: string;
  kind: PostKind;
  title: string;
  image?: string;
  /** icon thay ảnh (bài không có ảnh): tên symbol trong index.html */
  icon?: string;
  price: number;
  unit?: string;
  stock: number;
  max: number;
  on: boolean;
  views: number;
  saves: number;
  sold: number;
  /** đang quảng bá bằng AntXu: chữ hiển thị "còn 2 ngày" */
  promo?: string;
  category: string;
  /** bài việc làm: id việc tương ứng trong `jobs` */
  jobId?: string;
  /** dữ liệu form đăng bài (để mở lại đúng khi sửa) + loại form: food / drink / goods / service / job */
  form?: Record<string, unknown>;
  formType?: 'food' | 'drink' | 'goods' | 'service' | 'job';
}

/** Trạng thái đơn khách đặt — nhìn từ phía người bán */
export type SellerOrderState = 'waiting' | 'confirmed' | 'preparing' | 'delivering' | 'ready' | 'done' | 'declined' | 'cancelled';

/** delivery: giao tận cửa · pickup: khách tự lấy · home: làm tại nhà khách (dịch vụ) */
export type Fulfil = 'delivery' | 'pickup' | 'home';

export interface SellerOrderItem {
  name: string;
  qty: number;
  option: string;
  price: number;
}

export interface SellerOrder {
  id: string;
  code: string;
  kind: Exclude<PostKind, 'job'>;
  image?: string;
  icon?: string;
  title: string;
  items: SellerOrderItem[];
  buyer: SellerPerson;
  fulfil: Fulfil;
  address: string;
  day: number;
  time: string;
  /** phút (dịch vụ làm lâu) */
  duration?: number;
  ship: number;
  pay: PaymentMethod;
  note: string;
  state: SellerOrderState;
  /** Khách xin hủy: lý do. null = không có yêu cầu */
  cancelRequest?: string | null;
  declineReason?: string;
  surcharge?: { amount: number; reason: string; ok: boolean } | null;
  answers?: [string, string][];
  /** Chữ hạn xử lý trên thẻ ("Còn 12 phút") */
  due?: string;
  history: [SellerOrderState, string][];
  reviewId?: string;
}

export interface SellerOffer {
  id: string;
  code: string;
  worker: SellerPerson & { rating: string; jobs: number; distance: string };
  slot: string;
  intro: string;
  state: OfferState;
  /** ngày làm của riêng đề nghị này (việc lặp) */
  day?: number;
  report?: { note: string; at: string; photos: number };
  rated?: { stars: number; text: string } | null;
}

export interface SellerQuestion {
  id: string;
  by: SellerPerson;
  at: string;
  text: string;
  answer?: string;
}

export interface SellerJob {
  id: string;
  code: string;
  postId: string | null;
  title: string;
  category: string;
  pay: number;
  unit: string;
  when: string;
  day: number;
  time: string;
  duration: number;
  head: number;
  area: string;
  exact: string;
  desc: string;
  reqs: string[];
  offers: SellerOffer[];
  questions: SellerQuestion[];
  closed?: boolean;
  /** hạn chọn người hiện trên thẻ */
  due?: string;
}

export interface SellerReview {
  id: string;
  by: SellerPerson;
  stars: number;
  at: string;
  orderId: string;
  post: string;
  text: string;
  reply?: string;
}

export interface SellerShop {
  name: string;
  kind: string;
  at: string;
  since: string;
  reply: string;
  bio: string;
  avatar: string;
  cover?: string | null;
  followers: number;
  shopViews: number;
  rating: string;
  reviewCount: number;
  doneCount: number;
}

export interface DayHours {
  on: boolean;
  from: string;
  to: string;
}

export interface SellerPause {
  mode: 'all' | 'some';
  kinds: PostKind[];
  until: string;
}

/** Số liệu Hiệu quả theo mốc (bản mẫu) — chữ tăng trưởng dạng "+12%" */
export interface SellerStats {
  label: string;
  income: number;
  incomeUp: string;
  paid: number;
  paidUp: string;
  hired: number;
  hiredUp: string;
  done: number;
  doneUp: string;
  rating: string;
  ratingCount: number;
  views: number;
  viewsUp: string;
  /** tỉ lệ đặt (đơn / lượt xem) tăng bao nhiêu */
  bookUp: string;
  saves: number;
  /** biểu đồ đã thu: đơn vị cột (giờ / ngày / tuần / tháng), nhãn và giá trị từng cột */
  unit: string;
  x: string[];
  y: number[];
  /** thu theo mảng: đồ ăn & uống, đồ dùng, dịch vụ */
  mix: [number, number, number];
}

/** Hội thoại trong Messenger của người bán: khách hỏi về đơn, người nhận việc hỏi về việc */
export interface SellerChat {
  id: string;
  name: string;
  avatar?: string;
  unread: number;
  /** đơn / việc đang nói tới */
  ctx: { type: 'order' | 'job'; id: string } | null;
  messages: { from: 'me' | 'them'; text: string; time: string }[];
}

export type StatsRange = 'today' | '7' | '30' | '90' | 'year';

export interface SellerSpace {
  /** đổi khi sửa cấu trúc dữ liệu mẫu: bản cũ lưu trong trình duyệt tự được nạp lại */
  version: string;
  posts: SellerPost[];
  orders: SellerOrder[];
  jobs: SellerJob[];
  reviews: SellerReview[];
  shop: SellerShop;
  hours: DayHours[];
  offs: { day: number; note: string }[];
  stats: Record<StatsRange, SellerStats>;
  pause: SellerPause | null;
  chats: SellerChat[];
}

/** Tên bước hiển thị cho đơn, theo cách nhận */
export const SELLER_STEPS: Record<Fulfil, [SellerOrderState, string][]> = {
  delivery: [['waiting', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['preparing', 'Đang chuẩn bị'], ['delivering', 'Đang giao'], ['done', 'Hoàn thành']],
  pickup: [['waiting', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['preparing', 'Đang chuẩn bị'], ['ready', 'Chờ khách lấy'], ['done', 'Hoàn thành']],
  home: [['waiting', 'Chờ xác nhận'], ['confirmed', 'Đã nhận lịch'], ['preparing', 'Đang làm'], ['done', 'Hoàn thành']],
};

/** Quy trình rút gọn hiện trong hộp "Bạn chắc chắn…" (khớp tên bước trên thanh tiến trình) */
export const SELLER_FLOW = {
  delivery: ['Đã đặt', 'Chờ xác nhận', 'Đang giao', 'Hoàn thành'],
  pickup: ['Đã đặt', 'Chờ xác nhận', 'Chờ khách lấy', 'Hoàn thành'],
  home: ['Đã đặt', 'Chờ xác nhận', 'Đang thực hiện', 'Hoàn thành'],
  job: ['Đã yêu cầu', 'Chờ xác nhận', 'Đang thực hiện', 'Đã báo xong', 'Hoàn thành'],
  cancel: ['Khách xin hủy', 'Đã hủy'],
} as const;
export type FlowKey = keyof typeof SELLER_FLOW;

/** Nhãn từng mảng ở Tình trạng bán / Bài đăng */
/** Nhãn từng mảng ở Tình trạng bán / Bài đăng. Ô số lượng ghi chung "Còn n", công tắc chung "Đang mở"; `unit` chỉ dùng trong thông báo */
export const SELLER_LANE: Record<PostKind, { title: string; unit: string; xu: [string, number] }> = {
  food: { title: 'Đồ ăn & uống', unit: 'phần', xu: ['Quảng bá 3 ngày', 30] },
  goods: { title: 'Đồ dùng', unit: 'cái', xu: ['Quảng bá 3 ngày', 30] },
  service: { title: 'Dịch vụ', unit: 'buổi', xu: ['Quảng bá 3 ngày', 30] },
  job: { title: 'Việc làm', unit: 'người', xu: ['Ghim đầu danh sách', 20] },
};

/** Icon (symbol trong index.html) cho từng mảng */
export const SELLER_KIND_ICON: Record<PostKind, string> = { food: 'fork', goods: 'package', service: 'wrench', job: 'hand' };

/** 4 nút đăng bài ở trang Hôm nay */
export const SELLER_NEW_KINDS: [PostKind, string, string, string][] = [
  ['food', 'fork', 'Bán đồ ăn & uống', 'Món theo phần, đồ uống theo ly'],
  ['goods', 'package', 'Bán đồ dùng', 'Đồ mới hoặc đã dùng'],
  ['service', 'wrench', 'Đăng dịch vụ', 'Bạn làm, khách đặt lịch'],
  ['job', 'hand', 'Đăng việc cần người', 'Hàng xóm gửi đề nghị, bạn chọn'],
];
