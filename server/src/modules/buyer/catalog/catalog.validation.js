const { z } = require('zod');

const num = (msg) => z.coerce.number({ error: msg }).min(0, msg);
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

exports.posts = z.object({
  type: z.enum(['food', 'goods', 'service'], { error: 'type phải là food, goods hoặc service' }).optional(),
  area: z.string().max(20).optional(),
  q: z.string().trim().max(100).optional(),
  minPrice: num('minPrice không hợp lệ').optional(),
  maxPrice: num('maxPrice không hợp lệ').optional(),
  acceptsXu: bool.optional(),
  sort: z.enum(['nearest', 'newest', 'price', '-price']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).refine((o) => o.minPrice === undefined || o.maxPrice === undefined || o.minPrice <= o.maxPrice,
  { message: 'minPrice không được lớn hơn maxPrice', path: ['minPrice'] });

exports.jobs = z.object({
  area: z.string().max(20).optional(),
  q: z.string().trim().max(100).optional(),
  minPay: num('minPay không hợp lệ').optional(),
  sort: z.enum(['newest', 'nearest', '-pay']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

exports.search = z.object({
  q: z.string({ error: 'Cần nhập từ khóa q' }).trim().min(1, 'Cần nhập từ khóa q').max(100),
  type: z.enum(['food', 'goods', 'service', 'job']).optional(),
  area: z.string().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
