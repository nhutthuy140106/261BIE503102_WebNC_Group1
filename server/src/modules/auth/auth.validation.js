const { z } = require('zod');

const phone = z.string({ error: 'Cần nhập số điện thoại' }).regex(/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0');
const password = z.string({ error: 'Cần nhập mật khẩu' }).min(6, 'Mật khẩu tối thiểu 6 ký tự').max(72);

exports.register = z.object({
  name: z.string({ error: 'Cần nhập tên' }).trim().min(2, 'Tên tối thiểu 2 ký tự').max(60),
  phone, password,
  area: z.string().max(20).optional(),
});
exports.login = z.object({ phone, password: z.string({ error: 'Cần nhập mật khẩu' }).min(1, 'Cần nhập mật khẩu') });
