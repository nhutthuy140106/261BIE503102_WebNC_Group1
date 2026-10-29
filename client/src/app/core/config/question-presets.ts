import { PostQuestion } from '../models/post';
import { TemplateKey } from '../models/post-template';
import { POST_TEMPLATES } from './post-templates';

/**
 * Câu hỏi gợi ý cho form đăng bài (phía Bán): người bán bấm một lần là thêm vào bài, vẫn sửa được.
 * Khung đặt hàng (phía Mua) vẽ đúng danh sách câu hỏi trong `Post.questions`, nên hai phía dùng chung kiểu `PostQuestion`.
 */
export const GENERIC_QUESTIONS: PostQuestion[] = [
  { type: 'text', label: 'Ghi chú cho người bán', ph: 'Ví dụ: ít cay, không hành…', long: true },
  { type: 'photo', label: 'Ảnh minh họa (nếu có)' },
  { type: 'choice', label: 'Có thú cưng trong nhà?', opts: ['Không', 'Có'] },
];

/** Gợi ý riêng theo loại bài, lấy từ các mẫu của bản mẫu (design/mockups/detail.html) */
export function questionPresets(template: TemplateKey): PostQuestion[] {
  return POST_TEMPLATES[template].qs.map((q) => ({ type: q.type, label: q.label, opts: q.opts, ph: q.ph, required: q.req, long: q.long, hint: q.hint, pay: q.pay }));
}
