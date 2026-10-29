const router = require('express').Router();
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../../../utils/asyncHandler');
const { body } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');
const { isTest } = require('../../../config/env');
const service = require('./assistant.service');

// Mỗi lượt hỏi tốn tiền API → chỉ cho người đã đăng nhập, giới hạn tốc độ theo IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn hỏi hơi nhanh, đợi một chút rồi thử lại nhé' } }),
});

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string({ error: 'Nội dung tin nhắn không hợp lệ' }).trim().min(1, 'Tin nhắn trống').max(500, 'Mỗi tin tối đa 500 ký tự'),
      }),
    )
    .min(1, 'Cần ít nhất một tin nhắn')
    .max(12, 'Hội thoại quá dài, hãy bắt đầu lại')
    .refine((m) => m.length === 0 || m[m.length - 1].role === 'user', 'Tin cuối phải của người dùng')
    .refine((m) => m.length === 0 || m[0].role === 'user', 'Tin đầu phải của người dùng'),
});

/**
 * @openapi
 * /assistant/chat:
 *   post:
 *     tags: [Assistant]
 *     summary: Hỏi trợ lý AntGo (Gemini hoặc bộ trả lời cơ bản) để được tư vấn món ăn, đồ dùng, dịch vụ, việc làm
 *     description: Cần đăng nhập. Trợ lý tìm trong bài đăng thật bằng công cụ `search_catalog` rồi trả lời kèm danh sách thẻ bài.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 maxItems: 12
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, assistant] }
 *                     content: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: "{ data: { reply, cards: [{ id, kind, title, price, unit, sellerName, area, image, slug }] } }" }
 *       401: { description: Chưa đăng nhập }
 *       422: { description: Dữ liệu không hợp lệ }
 *       429: { description: Hỏi quá nhanh }
 *       503: { description: Trợ lý chưa cấu hình hoặc đang bận }
 */
router.post('/chat', limiter, auth, body(schema), asyncHandler(async (req, res) => {
  const data = await service.chat({ messages: req.body.messages, user: req.user });
  res.json({ data });
}));

module.exports = router;
