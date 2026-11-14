import { SampleReview } from '../models/post-template';
import { areaLabel } from './api-mappers';
import { initialAvatar } from './order-link';
import { agoText } from './seller-mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/** Đánh giá của server → dòng đánh giá dạng [ảnh người đánh giá, tên, khu, "2 tuần trước", sao, nội dung, ảnh kèm, phản hồi người bán] */
export function sampleReviewFromApi(r: Raw, now = Date.now()): SampleReview {
  const name: string = r.reviewer?.name ?? 'Khách';
  return [r.reviewer?.avatar || initialAvatar(name), name, areaLabel(r.reviewer?.area), agoText(r.createdAt, now), r.rating, r.comment ?? '', r.images ?? [], r.reply?.text ?? ''];
}

/** Tên bài đã mua của một đánh giá, để ghi "Đã đặt: …" dưới đánh giá ở trang gian hàng */
export const reviewPostTitle = (r: Raw): string => r.post?.title ?? '';
