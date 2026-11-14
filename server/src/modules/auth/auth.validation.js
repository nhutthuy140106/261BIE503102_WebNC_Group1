const { z } = require('zod');

const phone = z.string({ error: 'Cần nhập số điện thoại' }).regex(/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0');
const password = z.string({ error: 'Cần nhập mật khẩu' }).min(6, 'Mật khẩu tối thiểu 6 ký tự').max(72);

exports.register = z.object({
  name: z.string({ error: 'Cần nhập tên' }).trim().min(2, 'Tên tối thiểu 2 ký tự').max(60),
  phone, password,
  area: z.string().max(20).optional(),
});
exports.google = z.object({ credential: z.string({ error: 'Thiếu mã đăng nhập Google' }).min(20).max(4096) });
exports.googleComplete = z.object({ phone });
exports.phoneQuery = z.object({ phone });
exports.login =z.object({ phone, password: z.string({ error: 'Cần nhập mật khẩu' }).min(1, 'Cần nhập mật khẩu') });
exports.otpSend = z.object({ phone, purpose: z.enum(['register', 'reset'], { error: 'purpose phải là register hoặc reset' }) });
exports.otpVerify = z.object({ phone, purpose: z.enum(['register', 'reset'], { error: 'purpose phải là register hoặc reset' }), code: z.string({ error: 'Cần nhập mã' }).regex(/^\d{6}$/, 'Mã gồm 6 chữ số') });
exports.passwordReset = z.object({ phone, password });

// Sửa hồ sơ: trường nào gửi lên mới đổi; chuỗi rỗng = xóa (trừ tên). Ảnh đại diện chỉ nhận ảnh đã tải lên AntGo hoặc https
exports.profile = z.object({
  name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(60).optional(),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Email chưa đúng')]).optional(),
  gender: z.enum(['', 'male', 'female', 'other']).optional(),
  birthday: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh dạng năm-tháng-ngày')]).optional(),
  bio: z.string().trim().max(300, 'Giới thiệu tối đa 300 ký tự').optional(),
  avatar: z.union([z.null(), z.string().regex(/^(\/images\/uploads\/[\w./-]+|https:\/\/\S+)$/, 'Ảnh đại diện phải tải lên qua AntGo')]).optional(),
});
exports.passwordChange = z.object({
  current: z.string({ error: 'Cần nhập mật khẩu hiện tại' }).min(1, 'Cần nhập mật khẩu hiện tại'),
  next: z.string({ error: 'Cần nhập mật khẩu mới' }).min(8, 'Mật khẩu mới tối thiểu 8 ký tự').max(72),
});
