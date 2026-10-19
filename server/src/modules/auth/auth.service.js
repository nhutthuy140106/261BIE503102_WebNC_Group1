const bcrypt = require('bcryptjs');
const User = require('../shared/user.model');
const ApiError = require('../../utils/ApiError');

// Đăng ký công khai LUÔN là enduser: không nhận role từ client (zod đã bỏ field lạ, ở đây ép cứng thêm một lần)
async function register({ name, phone, password, area }) {
  if (await User.exists({ phone })) throw ApiError.duplicate('Số điện thoại đã được đăng ký');
  return User.create({ name, phone, area, role: 'enduser', password: await bcrypt.hash(password, 10) });
}

async function verifyLogin({ phone, password }) {
  const user = await User.findOne({ phone }).select('+password');
  // cùng một thông báo cho "sai SĐT" và "sai mật khẩu" để không lộ số nào đã đăng ký
  if (!user || !(await bcrypt.compare(password, user.password))) throw ApiError.unauthorized('Sai số điện thoại hoặc mật khẩu');
  if (user.status === 'locked') throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa');
  return user;
}

// Đổi Session ID sau khi đăng nhập (chống session fixation) nhưng giữ nháp giỏ hàng của khách vãng lai
function startSession(req, user) {
  const cart = req.session && req.session.cart;
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = { _id: String(user._id), role: user.role }; // role lấy từ DB
      if (cart) req.session.cart = cart;
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

function endSession(req, res) {
  return new Promise((resolve) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      resolve();
    });
  });
}

module.exports = { register, verifyLogin, startSession, endSession };
