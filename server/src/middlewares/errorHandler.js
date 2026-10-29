const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let e = err;
  if (e instanceof mongoose.Error.CastError) e = ApiError.badRequest('Mã (id) sai định dạng');
  else if (e instanceof mongoose.Error.ValidationError) {
    e = ApiError.validation('Dữ liệu không hợp lệ', Object.values(e.errors).map((x) => ({ field: x.path, message: x.message })));
  } else if (e && e.code === 11000) e = ApiError.duplicate('Dữ liệu đã tồn tại');
  else if (e && e.type === 'entity.parse.failed') e = ApiError.badRequest('JSON gửi lên sai định dạng');

  if (!(e instanceof ApiError)) {
    console.error(err);
    e = new ApiError(500, 'INTERNAL_ERROR', 'Lỗi máy chủ');
  }
  res.status(e.status).json({ error: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) } });
};
