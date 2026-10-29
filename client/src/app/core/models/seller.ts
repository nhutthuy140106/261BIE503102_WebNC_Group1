import { placedStepNames } from '../utils/placed-steps';
import { OFFER_STATE_LABEL, OFFER_STEPS, OfferState } from './offer';
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
  /** giá thấp nhất của bài (nhiều món / size / dịch vụ con thì là giá rẻ nhất) */
  price: number;
  unit?: string;
  /** bài có nhiều mức giá khác nhau: thẻ ghi "từ {price}" và không sửa nhanh giá trên thẻ */
  priceFrom?: boolean;
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

/**
 * Thanh bước dùng CHUNG tên với phía Mua (placedStepNames / OFFER_STEPS), hai bên nhìn cùng một đơn thấy cùng bước:
 * đồ ăn & uống 5 bước, đồ dùng 4 (không có "Đang thực hiện"), dịch vụ 4 (không có "Đang giao"), việc làm theo đề nghị.
 */
export const orderStepNames = (kind: SellerOrder['kind']): string[] => placedStepNames(kind);
export const JOB_STEP_NAMES = OFFER_STEPS.map((s) => OFFER_STATE_LABEL[s]);

/** Trạng thái đơn → vị trí trên thanh bước (khớp posMap ở chi tiết đơn phía Mua) */
const ORDER_POS: Record<SellerOrder['kind'], Partial<Record<SellerOrderState, number>>> = {
  food: { waiting: 0, confirmed: 1, preparing: 2, delivering: 3, ready: 3, done: 4 },
  goods: { waiting: 0, confirmed: 1, preparing: 2, delivering: 2, ready: 2, done: 3 },
  service: { waiting: 0, confirmed: 1, preparing: 2, delivering: 2, ready: 2, done: 3 },
};
export const orderPos = (kind: SellerOrder['kind'], state: SellerOrderState): number | undefined => ORDER_POS[kind][state];

/** Một bước trên thanh tiến trình: ok ✓ xanh đen · cur viền cam · cut ✕ (hủy / từ chối) */
export interface StepItem {
  label: string;
  cls: '' | 'ok' | 'cur' | 'cut';
  time: string;
}

/** Dựng thanh bước: trước `pos` là ✓, `pos` là bước hiện tại (bước cuối thì ✓ luôn, trừ khi `endOk = false`). */
export function stepItems(names: readonly string[], pos: number, opts: { times?: string[]; cut?: { at: number; label: string }; endOk?: boolean } = {}): StepItem[] {
  const { times = [], cut, endOk = true } = opts;
  return names.map((n, i) => {
    const cls: StepItem['cls'] = cut
      ? i < cut.at ? 'ok' : i === cut.at ? 'cut' : ''
      : i < pos || (endOk && i === pos && i === names.length - 1) ? 'ok' : i === pos ? 'cur' : '';
    return { label: cut && i === cut.at ? cut.label : n, cls, time: cls ? times[i] ?? '' : '' };
  });
}

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
