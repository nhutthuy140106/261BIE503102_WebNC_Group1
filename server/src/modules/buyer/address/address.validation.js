const { z } = require('zod');

const base = {
  name: z.string({ error: 'Cần nhập họ tên' }).trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(60),
  phone: z.string({ error: 'Cần nhập số điện thoại' }).regex(/^\d{10}$/, 'Số điện thoại gồm đúng 10 số'),
  block: z.enum(['A', 'B', 'C', 'D'], { error: 'Block phải là A, B, C hoặc D' }),
  unit: z.string().trim().max(40).optional(),
  note: z.string().trim().max(200).optional(),
  label: z.enum(['home', 'family', 'other']).optional(),
  isDefault: z.boolean().optional(),
};

exports.create = z.object(base);
exports.update = z.object(base).partial().refine((o) => Object.keys(o).length > 0, 'Không có gì để cập nhật');
