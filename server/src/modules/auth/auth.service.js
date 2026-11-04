const bcrypt = require('bcryptjs');
const User = require('../shared/user.model');
const ApiError = require('../../utils/ApiError');
const { OAuth2Client } = require('google-auth-library');
const { googleClientId } = require('../../config/env');

const googleClient = new OAuth2Client(googleClientId);

// Đăng ký công khai LUÔN là enduser: không nhận role từ client (zod đã bỏ field lạ, ở đây ép cứng thêm một lần)
async function register({ name, phone, password, area }) {
  if (await User.exists({ phone })) throw ApiError.duplicate('Số điện thoại đã được đăng ký');
  return User.create({ name, phone, area, role: 'enduser', password: await bcrypt.hash(password, 10) });
}

async function verifyLogin({ phone, password }) {
  const user = await User.findOne({ phone }).select('+password');
  // cùng một thông báo cho "sai SĐT" và "sai mật khẩu" để không lộ số nào đã đăng ký
  // tài khoản Google không có mật khẩu → coi như sai mật khẩu (không bcrypt.compare với undefined)
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) throw ApiError.unauthorized('Sai số điện thoại hoặc mật khẩu');
  if (user.status === 'locked') throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa');
  return user;
}

const GOOGLE_PENDING_MS = 10 * 60 * 1000; // thời gian được nhập SĐT sau khi chọn tài khoản Google

// Kiểm tra ID token Google (chữ ký + audience = Client ID của AntGo + còn hạn); không tin token do client tự khai
async function verifyGoogleToken(credential) {
  if (!googleClientId) throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'Đăng nhập bằng Google chưa được cấu hình');
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    return ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Không xác thực được tài khoản Google, vui lòng thử lại');
  }
}

/**
 * Bước 1: đã có tài khoản gắn với Google này → trả về user (đăng nhập luôn).
 * Chưa có → chưa tạo, nhớ tạm thông tin Google trong phiên và trả null để FE hỏi SĐT (bước 2).
 */
async function googleLogin(req, credential) {
  const g = await verifyGoogleToken(credential);
  const user = await User.findOne({ googleId: g.sub });
  if (user) {
    if (user.status === 'locked') throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị khóa');
    return { user };
  }
  const name = String(g.name || g.email || 'Hàng xóm').trim().slice(0, 60);
  req.session.googleSignup = { googleId: g.sub, email: g.email_verified ? g.email : undefined, name, avatar: g.picture || null, at: Date.now() };
  return { user: null, name };
}

// Bước 2: nhận SĐT rồi mới tạo tài khoản (luôn enduser; SĐT đã có người dùng thì từ chối, không tự gộp tài khoản)
async function googleComplete(req, { phone }) {
  const p = req.session && req.session.googleSignup;
  if (!p || Date.now() - p.at > GOOGLE_PENDING_MS) throw ApiError.invalidState('Phiên đăng nhập Google đã hết hạn, vui lòng bấm đăng nhập Google lại');
  if (await User.exists({ phone })) throw ApiError.duplicate('Số điện thoại đã được đăng ký');
  return User.create({ googleId: p.googleId, email: p.email, name: p.name, avatar: p.avatar, phone, role: 'enduser' });
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

module.exports = { register, verifyLogin, googleLogin, googleComplete, startSession, endSession };
