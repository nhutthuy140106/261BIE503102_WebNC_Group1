// Thông tin dùng chung do admin cấu hình, ai cũng đọc được: khu vực và danh mục (không gồm từ khóa cấm).
const router = require('express').Router();
const settings = require('./setting.model');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * @openapi
 * /meta:
 *   get: { tags: [Chung], summary: "Danh sách khu vực và danh mục do admin cấu hình", responses: { 200: { description: "{ areas, categories }" } } }
 */
router.get('/', asyncHandler(async (req, res) => {
  const all = await settings.getAll();
  res.json({ data: { areas: all.areas, categories: all.categories } });
}));

module.exports = router;
