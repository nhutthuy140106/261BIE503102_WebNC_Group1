/**
 * Mẫu chi tiết bài theo "mô hình 7 khối" của design/mockups/detail.html:
 * Giá · Số lượng · Thời gian · Địa điểm · Tùy chọn cộng giá · Câu hỏi riêng · Tình trạng bán.
 * Người bán bật/tắt từng khối khi đăng bài; trang chi tiết chỉ vẽ những khối có dữ liệu.
 */
export type TemplateKey = 'food' | 'drink' | 'goods' | 'svc' | 'fix' | 'clean' | 'trip';

export type IconName = 'clock' | 'pin' | 'bolt' | 'check' | 'receipt' | 'shield';

/** Khối 1 — Giá: cố định / theo đơn vị / "từ" / báo giá sau (kèm phí kiểm tra) */
export interface PriceBlock {
  type: 'fixed' | 'unit' | 'from' | 'quote';
  amount?: number;
  unit?: string;
  /** Giá theo đơn vị chỉ là ước tính (vd. giặt theo kg sau khi cân) */
  estimate?: boolean;
  /** Phí kiểm tra khi báo giá sau */
  inspect?: number;
}

/** Khối 2 — Số lượng */
export interface QtyBlock {
  label: string;
  min: number;
  max: number;
}

/** Khối 3 — Thời gian: khung giờ trong ngày, hoặc ngày + thời lượng (có thể lặp hằng tuần) */
export interface TimeBlock {
  mode: 'slot' | 'datedur';
  label: string;
  win: [string, string];
  dur?: [number, number];
  repeat?: boolean;
}

/** Khối 4 — Địa điểm: chọn giao/tự lấy · tại nhà khách · tại chỗ người bán · A→B */
export interface PlaceBlock {
  mode: 'choice' | 'buyer' | 'seller' | 'ab';
  label: string;
  /** mode 'choice': [tên cách nhận, phụ phí] */
  choices?: [string, number][];
  /** mode 'seller': địa chỉ người bán */
  where?: string;
}

/** Khối 5 — Tùy chọn cộng giá. Nhãn dạng "Tên|+5.000đ" */
export interface OptionBlock {
  name: string;
  choices: string[];
}

/** Khối 6 — Câu hỏi riêng (chữ / chọn 1 / chọn nhiều / ảnh) */
export interface QuestionBlock {
  type: 'text' | 'choice' | 'multi' | 'photo';
  label: string;
  opts?: string[];
  ph?: string;
  req?: boolean;
  long?: boolean;
  hint?: string;
  /** Câu hỏi "Cần trả tiền giùm?" — trả lời "Có" thì nhắc ứng tiền */
  pay?: boolean;
}

/** Khối 7 — Tình trạng bán: mở theo lịch / giới hạn số lượng / bán một lần */
export interface StockBlock {
  mode: 'open' | 'limit' | 'once';
  sched?: string;
  left?: number;
}

export interface PostTemplate {
  key: TemplateKey;
  /** Nhãn loại ngắn: Đồ ăn, Đồ uống, Hàng hóa, Dịch vụ */
  kind: string;
  cat: string;
  /** Tên nút đặt: "Đặt món", "Mua", "Đặt lịch"… */
  action: string;
  /** Câu "ai làm gì" dưới tiêu đề (ghi đè câu mặc định) */
  explain?: string;
  xuOk?: boolean;
  title: string;
  imgs: string[];
  seller: { av: string; name: string; since: string; reply: string };
  facts: [IconName, string, string][];
  desc: string[];
  list: string[];
  price: PriceBlock;
  qty: QtyBlock | null;
  time: TimeBlock;
  place: PlaceBlock;
  opts: OptionBlock[];
  qs: QuestionBlock[];
  stock: StockBlock;
  notePh: string;
  safety?: boolean;
  /** Các bước theo dõi đơn của loại này */
  steps: string[];
}

/** Đánh giá mẫu: [ảnh đại diện, tên, khu, thời gian, sao, nội dung, ảnh người mua, phản hồi người bán] */
export type SampleReview = [string, string, string, string, number, string, string[], string];
