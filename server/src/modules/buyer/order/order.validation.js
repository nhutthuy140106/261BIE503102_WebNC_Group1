const { z } = require('zod');

const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Mã sai định dạng');

exports.create = z.object({
  postId: oid,
  quantity: z.number({ error: 'Cần nhập số lượng' }).int('Số lượng phải là số nguyên').min(1, 'Số lượng tối thiểu 1').max(99),
  selections: z.array(z.object({ group: z.string(), choices: z.array(z.string()) })).default([]),
  answers: z.array(z.object({ question: z.string(), value: z.string().max(500) })).default([]),
  fulfillment: z.enum(['delivery', 'pickup'], { error: 'fulfillment phải là delivery hoặc pickup' }),
  addressId: oid.optional(),
  scheduledAt: z.coerce.date().optional(),
  utensils: z.boolean().optional(),
  note: z.string().trim().max(300).optional(),
  voucherCode: z.string().trim().max(30).optional(),
  payment: z.enum(['cash', 'transfer'], { error: 'payment phải là cash hoặc transfer' }),
  // total / breakdown KHÔNG nhận từ client (zod bỏ field lạ)
});

exports.list = z.object({
  role: z.enum(['placed']).default('placed'),
  state: z.enum(['active', 'history']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

exports.reason = z.object({ reason: z.string({ error: 'Cần ghi lý do' }).trim().min(2, 'Hãy ghi lý do').max(300) });

exports.cancelNow = z.object({ reason: z.string().trim().min(2, 'Hãy ghi lý do').max(300) });
exports.issue = z.object({
  type: z.string().trim().min(2, 'Hãy chọn vấn đề').max(300),
  text: z.string().trim().max(500).optional(),
  photos: z.number().int().min(0).max(4).optional(),
  images: z.array(z.string().regex(/^\/images\/uploads\/[\w./-]+$/, 'Ảnh phải tải lên qua AntGo')).max(4).optional(),
});
exports.issueClose = z.object({ result: z.string().trim().max(200).optional() });
