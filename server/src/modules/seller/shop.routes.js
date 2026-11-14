// Theo dõi gian hàng (người mua): POST/DELETE /api/shops/:sellerId/follow
const router = require('express').Router();
const shop = require('./shop.service');
const asyncHandler = require('../../utils/asyncHandler');
const { ids } = require('../../middlewares/validate');
const { auth } = require('../../middlewares/auth');

router.use(auth);

/**
 * @openapi
 * /shops/{sellerId}/follow:
 *   post: { tags: [Bán & Đăng việc], summary: Theo dõi gian hàng, security: [{ cookieAuth: [] }], parameters: [{ name: sellerId, in: path, required: true, schema: { type: string } }], responses: { 200: { description: "{ following: true, followers }" }, 409: { description: Gian hàng của chính bạn } } }
 *   delete: { tags: [Bán & Đăng việc], summary: Bỏ theo dõi, security: [{ cookieAuth: [] }], parameters: [{ name: sellerId, in: path, required: true, schema: { type: string } }], responses: { 200: { description: "{ following: false, followers }" } } }
 */
router.post('/:sellerId/follow', ids('sellerId'), asyncHandler(async (req, res) => res.json({ data: await shop.follow(req.user, req.params.sellerId) })));
router.delete('/:sellerId/follow', ids('sellerId'), asyncHandler(async (req, res) => res.json({ data: await shop.unfollow(req.user, req.params.sellerId) })));

module.exports = router;
