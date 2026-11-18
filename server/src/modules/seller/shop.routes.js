// Theo dõi gian hàng (người mua): POST/DELETE /api/shops/:sellerId/follow
const router = require('express').Router();
const shop = require('./shop.service');
const asyncHandler = require('../../utils/asyncHandler');
const { ids } = require('../../middlewares/validate');
const { auth, optionalAuth } = require('../../middlewares/auth');

/**
 * @openapi
 * /shops/{sellerId}:
 *   get: { tags: [Bán & Đăng việc], summary: "Trang gian hàng công khai: hồ sơ, số liệu thật (đánh giá, đơn hoàn thành, người theo dõi), giờ nhận đơn; kèm `following` nếu đã đăng nhập", parameters: [{ name: sellerId, in: path, required: true, schema: { type: string } }], responses: { 200: { description: "{ shop, hours, pause, following }" }, 404: { description: Không có gian hàng } } }
 * /shops/{sellerId}/follow:
 *   post: { tags: [Bán & Đăng việc], summary: Theo dõi gian hàng, security: [{ cookieAuth: [] }], parameters: [{ name: sellerId, in: path, required: true, schema: { type: string } }], responses: { 200: { description: "{ following: true, followers }" }, 409: { description: Gian hàng của chính bạn } } }
 *   delete: { tags: [Bán & Đăng việc], summary: Bỏ theo dõi, security: [{ cookieAuth: [] }], parameters: [{ name: sellerId, in: path, required: true, schema: { type: string } }], responses: { 200: { description: "{ following: false, followers }" } } }
 */
router.get('/:sellerId', ids('sellerId'), optionalAuth, asyncHandler(async (req, res) => res.json({ data: await shop.publicShop(req.params.sellerId, req.user) })));
router.post('/:sellerId/follow', ids('sellerId'), auth, asyncHandler(async (req, res) => res.json({ data: await shop.follow(req.user, req.params.sellerId) })));
router.delete('/:sellerId/follow', ids('sellerId'), auth, asyncHandler(async (req, res) => res.json({ data: await shop.unfollow(req.user, req.params.sellerId) })));

module.exports = router;
