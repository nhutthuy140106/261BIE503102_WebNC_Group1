const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const c = require('./auth.controller');
const v = require('./auth.validation');
const { body, query } = require('../../middlewares/validate');
const { auth } = require('../../middlewares/auth');
const { isTest } = require('../../config/env');

// Chống dò mật khẩu: tối đa 10 lần đăng nhập / 15 phút / IP (tắt khi chạy test)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => isTest && !process.env.FORCE_RATE_LIMIT, // test riêng bật cờ này để kiểm giới hạn
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn thử đăng nhập quá nhiều lần, vui lòng đợi ít phút' } }),
});

// Chống tạo tài khoản hàng loạt: tối đa 20 lần đăng ký / giờ / IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  skip: () => isTest && !process.env.FORCE_RATE_LIMIT, // test riêng bật cờ này để kiểm giới hạn
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn đăng ký quá nhiều lần, vui lòng thử lại sau' } }),
});

// Kiểm tra số điện thoại ở bước 1 form đăng ký: tối đa 60 lần / 15 phút / IP (chống dò danh sách số đã đăng ký)
const phoneCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  skip: () => isTest && !process.env.FORCE_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn kiểm tra quá nhiều lần, vui lòng đợi ít phút' } }),
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký (luôn là enduser) và đăng nhập luôn
 *     description: Server đặt cookie phiên `connect.sid` (httpOnly). Field `role` gửi lên bị bỏ qua.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, example: "0901234567" }
 *               password: { type: string, minLength: 6 }
 *               area: { type: string, example: B }
 *     responses:
 *       201: { description: "{ data: User } + Set-Cookie; avatar mặc định null" }
 *       409: { description: Số điện thoại đã đăng ký }
 *       422: { description: Dữ liệu không hợp lệ }
 * /auth/phone-exists:
 *   get:
 *     tags: [Auth]
 *     summary: Số điện thoại đã đăng ký chưa (bước 1 form đăng ký)
 *     parameters:
 *       - { in: query, name: phone, required: true, schema: { type: string, example: "0901234567" } }
 *     responses:
 *       200: { description: "{ data: { exists: boolean } }" }
 *       422: { description: Số điện thoại sai định dạng }
 *       429: { description: Kiểm tra quá nhiều lần }
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập (đổi Session ID, giữ giỏ nháp của khách)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: "{ data: User } + Set-Cookie" }
 *       401: { description: Sai số điện thoại hoặc mật khẩu (thông báo chung) }
 *       403: { description: "Tài khoản bị khóa (code ACCOUNT_LOCKED)" }
 *       422: { description: Dữ liệu sai kiểu (vd gửi object thay chuỗi) }
 *       429: { description: Thử quá nhiều lần }
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập bằng Google (bước 1) — gửi ID token từ Google Identity Services
 *     description: "Đã có tài khoản thì đăng nhập luôn (`{ data: User }` + cookie). Lần đầu thì trả `{ needPhone: true, name }` và nhớ tạm thông tin Google trong phiên 10 phút; gọi tiếp `/auth/google/complete`."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential: { type: string, description: ID token (JWT) do Google cấp }
 *     responses:
 *       200: { description: "{ data: User } hoặc { needPhone: true, name }" }
 *       401: { description: Token Google không hợp lệ }
 *       403: { description: Tài khoản bị khóa }
 *       503: { description: Server chưa cấu hình GOOGLE_CLIENT_ID }
 * /auth/google/complete:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập bằng Google (bước 2) — nhập SĐT để tạo tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, example: "0901234567" }
 *     responses:
 *       201: { description: "{ data: User } + Set-Cookie" }
 *       409: { description: Hết phiên chờ (INVALID_STATE) hoặc SĐT đã đăng ký (DUPLICATE) }
 *       422: { description: SĐT không hợp lệ }
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng xuất (hủy phiên + xóa cookie)
 *     responses:
 *       204: { description: Đã đăng xuất }
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Tài khoản đang đăng nhập (authGuard của FE hỏi endpoint này)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: "{ data: User } — có avatar (URL hoặc null)", content: { application/json: { schema: { type: object, properties: { data: { $ref: "#/components/schemas/User" } } } } } }
 *       401: { description: Chưa đăng nhập hoặc hết phiên }
 *       403: { description: Tài khoản bị khóa }
 */
router.post('/register', registerLimiter, body(v.register), c.register);
router.get('/phone-exists', phoneCheckLimiter, query(v.phoneQuery), c.phoneExists);
router.post('/login', loginLimiter, body(v.login), c.login);
router.post('/google', loginLimiter, body(v.google), c.google);
router.post('/google/complete', loginLimiter, body(v.googleComplete), c.googleComplete);
router.post('/logout', c.logout);
router.get('/profile', auth, c.profile);

module.exports = router;
