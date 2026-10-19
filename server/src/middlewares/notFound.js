const ApiError = require('../utils/ApiError');
module.exports = (req, res, next) => next(ApiError.notFound(`Không có đường dẫn ${req.method} ${req.originalUrl}`));
