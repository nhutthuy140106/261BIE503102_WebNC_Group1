export interface Question {
  _id: string;
  jobId: string;
  text: string;
  authorName: string;
  answer: string | null;
  createdAt: string;
}

export interface Review {
  _id: string;
  targetType: 'order' | 'offer';
  targetId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  items: Review[];
}

export interface Message {
  _id: string;
  mine: boolean;
  text: string;
  /** Hình / video / ghi âm đính kèm (mock: ảnh lưu dạng data URL, video và ghi âm chỉ sống trong phiên) */
  media?: { kind: 'image' | 'video' | 'audio'; url: string; sec?: number };
  createdAt: string;
}

export interface Conversation {
  _id: string;
  withName: string;
  withAvatar?: string;
  /** Ngữ cảnh gắn với hội thoại (đơn/việc/bài) */
  context?: { type: 'order' | 'offer' | 'post' | 'job'; id: string; label: string };
  unread: number;
  messages: Message[];
}

export interface AppNotification {
  _id: string;
  text: string;
  /** Đường dẫn nội bộ để mở đúng đơn/hội thoại */
  link: string;
  read: boolean;
  /** Ảnh người liên quan (người bán / người đăng việc); không có thì hiện icon theo loại */
  avatar?: string;
  createdAt: string;
}

export type ReportReason = 'not_received' | 'quality' | 'payment' | 'abuse' | 'other';

export interface Report {
  _id: string;
  targetType: 'order' | 'offer' | 'post' | 'job' | 'user';
  targetId: string;
  reason: ReportReason;
  detail: string;
  state: 'open' | 'resolved';
  createdAt: string;
}

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  not_received: 'Không nhận được hàng/dịch vụ',
  quality: 'Chất lượng không đúng mô tả',
  payment: 'Vấn đề thanh toán',
  abuse: 'Hành vi không phù hợp',
  other: 'Khác',
};
