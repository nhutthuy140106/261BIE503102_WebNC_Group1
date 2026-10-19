const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

function run(schema, source) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(ApiError.validation(details[0] ? details[0].message : 'Dữ liệu không hợp lệ', details));
    }
    // req.query chỉ đọc trong Express 5 -> để bản đã parse ở req.valid
    req.valid = req.valid || {};
    req.valid[source] = result.data;
    if (source === 'body') req.body = result.data;
    next();
  };
}

const body = (schema) => run(schema, 'body');
const query = (schema) => run(schema, 'query');

// Kiểm tra các tham số :id có đúng ObjectId không -> 400
const ids = (...names) => (req, res, next) => {
  for (const n of names) {
    if (!mongoose.isValidObjectId(req.params[n]) || String(req.params[n]).length !== 24) {
      return next(ApiError.badRequest(`Mã "${n}" sai định dạng`));
    }
  }
  next();
};

module.exports = { body, query, ids };
