/** Đơn đã đặt (phía Mua) */
export type PlacedStatus =
  | 'pending' | 'confirmed' | 'pricing' | 'preparing' | 'delivering' | 'ready' | 'done' | 'cancelled' | 'declined';

/** Việc đã nhận (phía làm việc) — thanh 5 bước + 3 nhánh phụ, xem CLAUDE.md mục 2.2e */
export type JobStatus =
  | 'offered' | 'chosen' | 'working' | 'reported' | 'done'
  | 'rejected' | 'withdrawn' | 'cancelled';

export type PaymentMethod = 'cash' | 'transfer';

export interface Order {
  _id: string;
  /** Mã hiển thị, ví dụ AG-O3012 (đơn đặt) hoặc AG-J1998 (việc nhận) */
  code: string;
  type: 'placed' | 'received';
  postId: string;
  postTitle: string;
  counterpartName: string;
  counterpartAvatar?: string;
  /** Id người bán/người đăng — để mở gian hàng /shop/:id */
  counterpartId?: string;
  /** Ảnh món/bài của đơn đã đặt (snapshot lúc đặt) */
  image?: string;
  /** Nhóm của bài — dùng chọn icon khi không có ảnh (việc làm không có ảnh thật) */
  category?: string;
  status: PlacedStatus | JobStatus;
  total: number;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
  /** Mốc thời gian từng bước, hiện dưới thanh tiến trình */
  history?: { state: string; at: string }[];
  /** Có khi đơn đặt đã gửi yêu cầu hủy (chờ người bán xử lý) */
  cancelRequested?: boolean;
  /** Phụ thu do người bán báo (vd. đồ to hơn đã chọn) — người mua phải đồng ý trước khi làm tiếp */
  surcharge?: Surcharge;
  /** Nội dung đã đặt (snapshot lúc đặt) — hiện ở chi tiết đơn */
  detail?: OrderDetail;
  /** Loại bài lúc đặt — quyết định luật báo vấn đề / trả hàng sau khi nhận */
  kind?: 'food' | 'goods' | 'service';
  /** Dịch vụ có giá chưa chắc: ước tính (cân thực tế) · báo giá sau (kiểm tra) · phụ thu (đồ to hơn đã chọn) */
  priceCheck?: 'estimate' | 'quote' | 'surcharge';
  /** Giá cuối bên bán báo — người mua phải duyệt trước khi làm tiếp */
  newPrice?: NewPrice | null;
  oldTotal?: number;
  priceDone?: boolean;
  priceRejected?: string;
  /** Đổi lịch hẹn: người mua gửi giờ mới (chờ bên bán) hoặc bên bán xin đổi (chờ người mua duyệt) */
  resched?: Resched | null;
  /** Số giờ còn tới giờ hẹn (dịch vụ) — dưới 2 giờ thì hủy bị ghi "hủy sát giờ" */
  apptIn?: number;
  cancelWhy?: string;
  cancelBy?: 'buyer' | 'seller';
  cancelLate?: boolean;
  cancelDenied?: string | null;
  cancelFrom?: string;
  /** Mốc người mua xác nhận đã nhận (ms) — tính thời hạn báo vấn đề */
  doneAt?: number;
  /** Mock: đã nhận cách đây n giờ (đổi thành doneAt khi đọc) */
  doneAgoH?: number;
  issue?: OrderIssue | null;
  rated?: { s: number; t: string } | null;
  returnRequested?: string;
  /** Việc đã nhận: đã bấm xác nhận nhận tiền công */
  paid?: boolean;
}

export interface NewPrice {
  total: number;
  reason: string;
  lines?: [string, number][];
}

export interface Resched {
  to: string;
  by: 'buyer' | 'seller';
  note?: string;
}

/** Báo vấn đề (đồ ăn 2 giờ) / trả hàng (đồ dùng 24 giờ) / báo dịch vụ chưa đạt (24 giờ) */
export interface OrderIssue {
  st: 'open' | 'redo' | 'refund' | 'returnAgreed' | 'rejected' | 'closed';
  type: string;
  want: string;
  text: string;
  photos: number;
  reply?: string;
  amount?: number;
  result?: string;
}

/** Giờ còn để báo vấn đề sau khi nhận, theo loại bài */
export const ISSUE_HOURS = { food: 2, goods: 24, service: 24 } as const;

export interface OrderDetail {
  lines: string[];
  quantity?: number;
  /** Tên dòng số lượng + đơn vị (lấy từ khối Số lượng của bài): "Khối lượng ước tính" + "kg" */
  quantityLabel?: string;
  /** Đồ ăn: các món đã chọn, mỗi món một số lượng (tên nhóm món ở `itemsLabel`) */
  items?: { name: string; qty: number }[];
  itemsLabel?: string;
  unit?: string;
  address?: string;
  /** Cách nhận đã chọn (chỉ khi bài cho chọn / người bán nhận tại chỗ) */
  place?: string;
  /** Tên dòng địa điểm (lấy từ khối Địa điểm của bài): "Cách nhận", "Lấy & trả tại"… */
  placeLabel?: string;
  when?: string;
  /** Tên dòng giờ: "Nhận lúc", "Hẹn lấy", "Lấy đồ lúc"… (lấy từ bài) */
  whenLabel?: string;
  /** Người mua tự đến lấy (không giao): bước 4 ghi "Hẹn lấy hàng" thay cho "Đang giao" */
  pickup?: boolean;
  utensils?: boolean;
  voucher?: string;
  subtotal: number;
  fee: number;
  discount: number;
  /** Các bước theo dõi của loại bài này (đồ ăn khác dịch vụ giặt khác sửa máy…) */
  steps: string[];
  template?: string;
}

export interface Surcharge {
  amount: number;
  reason: string;
  state: 'pending' | 'approved' | 'declined';
}

export interface CreateOrderBody {
  postId: string;
  quantity: number;
  selections: { group: string; choices: string[] }[];
  /** Trả lời câu hỏi riêng của bài */
  answers?: { question: string; value: string }[];
  fulfillment: 'delivery' | 'pickup';
  addressId?: string;
  scheduledAt?: string;
  utensils: boolean;
  note?: string;
  /** Mã voucher AntXu (chỉ với bài có nhãn "Dùng được Xu"); server kiểm tra và tính giảm giá */
  voucherCode?: string;
  payment: PaymentMethod;
  /** Mock: FE gửi kèm nội dung và tổng ước tính để đơn mẫu hiện đúng như người dùng đã chọn (server bỏ qua, tự tính lại) */
  detail?: OrderDetail;
  total?: number;
}

export const PLACED_STATUS_LABEL: Record<PlacedStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  pricing: 'Chờ bạn duyệt giá',
  preparing: 'Đang chuẩn bị',
  delivering: 'Đang giao',
  ready: 'Sẵn sàng lấy',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
  declined: 'Người bán từ chối',
};
