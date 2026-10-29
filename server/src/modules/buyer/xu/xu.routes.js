const router = require('express').Router();
const { z } = require('zod');
const service = require('./xu.service');
const asyncHandler = require('../../../utils/asyncHandler');
const { body } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

const gameBody = z.object({ game: z.string().trim().min(1), score: z.number().int().min(0) });
const redeemBody = z.object({ cid: z.string().trim().min(1) });

/**
 * @openapi
 * /me/xu:
 *   get:
 *     tags: [AntXu]
 *     summary: Số dư, lịch sử, voucher, danh mục đổi và lượt game còn lại
 *     description: Lần đầu gọi sẽ cộng 30 Xu chào mừng (một lần duy nhất).
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: "{ data: { balance, ledger[], vouchers[], catalog[], game } }" }
 *       401: { description: Chưa đăng nhập }
 * /me/xu/game:
 *   post:
 *     tags: [AntXu]
 *     summary: Nộp điểm một lượt game Hái xu (server tự tính Xu)
 *     description: Tối đa 3 lượt/ngày, tối đa 30 Xu/ngày từ game, điểm ≤ 80/lượt, cứ 8 điểm = 1 Xu. Vượt giới hạn trả 429 GAME_LIMIT.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [game, score]
 *             properties:
 *               game: { type: string, example: hai-xu }
 *               score: { type: integer, example: 64 }
 *     responses:
 *       200: { description: "{ data: { granted, capLeft, playsLeft, balance } }" }
 *       422: { description: Game lạ hoặc điểm vượt giới hạn }
 *       429: { description: GAME_LIMIT - hết lượt hoặc hết trần Xu hôm nay }
 * /me/xu/redeem:
 *   post:
 *     tags: [AntXu]
 *     summary: Đổi Xu lấy voucher
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cid]
 *             properties:
 *               cid: { type: string, enum: [v10, v20, ship] }
 *     responses:
 *       201: { description: "{ data: { id, cid, code, title, expiresAt, balance } }" }
 *       404: { description: Voucher không tồn tại }
 *       409: { description: Không đủ Xu }
 */
router.use(auth);
router.get('/', asyncHandler(async (req, res) => res.json({ data: await service.overview(req.user._id) })));
router.post('/game', body(gameBody), asyncHandler(async (req, res) =>
  res.json({ data: await service.playGame(req.user._id, req.body.game, req.body.score) })));
router.post('/redeem', body(redeemBody), asyncHandler(async (req, res) =>
  res.status(201).json({ data: await service.redeem(req.user._id, req.body.cid) })));

module.exports = router;
