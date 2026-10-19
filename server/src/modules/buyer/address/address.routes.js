const router = require('express').Router();
const c = require('./address.controller');
const v = require('./address.validation');
const { body, ids } = require('../../../middlewares/validate');
const { auth } = require('../../../middlewares/auth');

/**
 * @openapi
 * components:
 *   schemas:
 *     AddressInput:
 *       type: object
 *       required: [name, phone, block]
 *       properties:
 *         name: { type: string, example: Ngọc Thủy }
 *         phone: { type: string, example: "0901234567" }
 *         block: { type: string, enum: [A, B, C, D] }
 *         unit: { type: string, example: B-1204 }
 *         note: { type: string }
 *         label: { type: string, enum: [home, family, other] }
 *         isDefault: { type: boolean }
 * /me/addresses:
 *   get:
 *     tags: [Địa chỉ]
 *     summary: Danh sách địa chỉ của tôi (mặc định đứng đầu)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: "{ data: Address[] }" }
 *       401: { description: Chưa đăng nhập }
 *   post:
 *     tags: [Địa chỉ]
 *     summary: Thêm địa chỉ (địa chỉ đầu tiên tự là mặc định)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: "#/components/schemas/AddressInput" } } }
 *     responses:
 *       201: { description: Đã tạo }
 *       422: { description: SĐT không đủ 10 số hoặc block ngoài A–D }
 * /me/addresses/{id}:
 *   parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *   put:
 *     tags: [Địa chỉ]
 *     summary: Sửa địa chỉ (gửi field nào đổi field đó)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: "#/components/schemas/AddressInput" } } }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Địa chỉ của người khác }
 *       404: { description: Không tồn tại }
 *       409: { description: Cố bỏ mặc định của địa chỉ mặc định duy nhất }
 *       422: { description: Dữ liệu sai }
 *   delete:
 *     tags: [Địa chỉ]
 *     summary: Xóa địa chỉ (trừ địa chỉ mặc định)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       204: { description: Đã xóa }
 *       403: { description: Địa chỉ của người khác }
 *       404: { description: Không tồn tại }
 *       409: { description: Đây là địa chỉ mặc định }
 * /me/addresses/{id}/default:
 *   patch:
 *     tags: [Địa chỉ]
 *     summary: Đặt làm mặc định (địa chỉ mặc định cũ tự bỏ)
 *     security: [{ cookieAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       403: { description: Địa chỉ của người khác }
 *       404: { description: Không tồn tại }
 */
router.use(auth);
router.get('/', c.list);
router.post('/', body(v.create), c.create);
router.put('/:id', ids('id'), body(v.update), c.update);
router.delete('/:id', ids('id'), c.remove);
router.patch('/:id/default', ids('id'), c.setDefault);

module.exports = router;
