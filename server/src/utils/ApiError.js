class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(msg = 'Yêu cầu không hợp lệ') { return new ApiError(400, 'BAD_REQUEST', msg); }
  static unauthorized(msg = 'Bạn cần đăng nhập') { return new ApiError(401, 'UNAUTHORIZED', msg); }
  static forbidden(msg = 'Bạn không có quyền với nội dung này') { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(msg = 'Không tìm thấy') { return new ApiError(404, 'NOT_FOUND', msg); }
  static invalidState(msg) { return new ApiError(409, 'INVALID_STATE', msg); }
  static duplicate(msg) { return new ApiError(409, 'DUPLICATE', msg); }
  static validation(msg = 'Dữ liệu không hợp lệ', details) { return new ApiError(422, 'VALIDATION_ERROR', msg, details); }
}
module.exports = ApiError;
