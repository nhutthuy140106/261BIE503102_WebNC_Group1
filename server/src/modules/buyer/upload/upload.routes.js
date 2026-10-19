const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = require('express').Router();
const fileUpload = require('express-fileupload');
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const { auth } = require('../../../middlewares/auth');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 4;
const DIR = path.join(__dirname, '../../../../public/images/uploads');

// Nhận dạng loại ảnh bằng chữ ký đầu file (không tin đuôi/mimetype client gửi)
function sniff(buf) {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

/**
 * @openapi
 * /uploads:
 *   post:
 *     tags: [Upload]
 *     summary: Tải ảnh lên (png/jpg/webp, ≤ 2 MB mỗi ảnh, tối đa 4 ảnh)
 *     description: Gửi multipart/form-data, field `images` (một hoặc nhiều file). Tên file do server sinh. Dùng URL trả về cho `images` của báo hoàn thành, đánh giá, báo cáo.
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201: { description: "{ data: [{ url: '/images/uploads/<tên>.jpg' }] }" }
 *       401: { description: Chưa đăng nhập }
 *       413: { description: Ảnh quá 2 MB hoặc quá 4 ảnh }
 *       422: { description: Không có file hoặc sai loại ảnh }
 */
router.post(
  '/',
  auth,
  fileUpload({
    limits: { fileSize: MAX_BYTES, files: MAX_FILES + 1 }, // +1 để phát hiện được "quá số ảnh" thay vì bị cắt âm thầm
    abortOnLimit: true,
    limitHandler: (req, res) => res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Mỗi ảnh tối đa 2 MB và tối đa ${MAX_FILES} ảnh` } }),
    parseNested: false,
  }),
  asyncHandler(async (req, res) => {
    const raw = req.files && req.files.images;
    const files = raw ? [].concat(raw) : [];
    if (!files.length) throw ApiError.validation('Chưa chọn ảnh (field "images")');
    if (files.length > MAX_FILES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', `Tối đa ${MAX_FILES} ảnh`);

    // kiểm hết trước khi ghi file nào
    const checked = files.map((f) => {
      const ext = f.truncated ? null : sniff(f.data);
      if (!ext) throw ApiError.validation(`"${path.basename(f.name || 'file')}" không phải ảnh png/jpg/webp hợp lệ`);
      return { f, ext };
    });
    await fs.promises.mkdir(DIR, { recursive: true });
    const out = [];
    for (const { f, ext } of checked) {
      const name = `${crypto.randomUUID()}.${ext}`; // không dùng tên client => không có path traversal
      await fs.promises.writeFile(path.join(DIR, name), f.data);
      out.push({ url: `/images/uploads/${name}` });
    }
    res.status(201).json({ data: out });
  }),
);

module.exports = router;
