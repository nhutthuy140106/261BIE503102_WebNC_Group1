const { z } = require('zod');

const intro = z.string({ error: 'Cần viết lời giới thiệu' }).trim().min(5, 'Lời giới thiệu tối thiểu 5 ký tự').max(500);
const slots = z.array(z.coerce.date()).max(10);

exports.create = z.object({ intro, slots: slots.default([]) });
exports.update = z.object({ intro: intro.optional(), slots: slots.optional() })
  .refine((o) => o.intro !== undefined || o.slots !== undefined, 'Không có gì để cập nhật');

exports.reportDone = z.object({
  note: z.string({ error: 'Cần ghi chú khi báo hoàn thành' }).trim().min(3, 'Cần ghi chú khi báo hoàn thành').max(500),
  images: z.array(z.string().regex(/^\/images\/uploads\/[\w-]+\.(png|jpg|webp)$/, 'Ảnh phải tải lên qua /uploads')).max(4, 'Tối đa 4 ảnh').default([]),
});

exports.cancel = z.object({
  reason: z.enum(['busy', 'sick', 'other'], { error: 'Cần chọn lý do: busy, sick hoặc other' }),
  detail: z.string().trim().max(300).optional(),
}).refine((o) => o.reason !== 'other' || (o.detail && o.detail.length >= 3), { message: 'Lý do "other" cần ghi chi tiết', path: ['detail'] });

exports.list = z.object({
  state: z.enum(['active', 'history']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
