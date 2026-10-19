const ApiError = require('../utils/ApiError');
const User = require('../modules/shared/user.model');

// Xác thực bằng session cookie (express-session). Luôn nạp lại user từ DB để biết role/status hiện tại,
// không tin dữ liệu cũ nằm trong session.
async function load(req) {
  const sess = req.session && req.session.user;
  if (!sess) return false;
  const user = await User.findById(sess._id);
  if (!user) { await destroySession(req); return false; }
  if (user.status === 'locked') {
    await destroySession(req); // khóa tài khoản => phiên đang có bị vô hiệu ngay
    throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa');
  }
  req.user = user;
  return true;
}

const destroySession = (req) => new Promise((resolve) => req.session.destroy(() => resolve()));

// Bắt buộc đăng nhập
const auth = async (req, res, next) => {
  try {
    if (!(await load(req))) throw ApiError.unauthorized('Bạn cần đăng nhập hoặc phiên đã hết hạn');
    next();
  } catch (e) { next(e); }
};

// Có đăng nhập thì nạp req.user, không thì bỏ qua (trang công khai nhưng hiện thêm dữ liệu của tôi)
const optionalAuth = async (req, res, next) => {
  try { await load(req); next(); } catch (e) { next(e); }
};

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role) ? next() : next(ApiError.forbidden('Bạn không có quyền truy cập khu vực này'));

module.exports = { auth, optionalAuth, requireRole };
