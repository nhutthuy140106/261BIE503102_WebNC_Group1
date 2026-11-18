const bcrypt = require('bcryptjs');
const User = require('../shared/user.model');
const ApiError = require('../../utils/ApiError');
const { OAuth2Client } = require('google-auth-library');
const { googleClientId, otpRequired } = require('../../config/env');
const otp = require('./otp.service');

const googleClient = new OAuth2Client(googleClientId);

// Đăng ký công khai LUÔN là enduser: không nhận role từ client (zod đã bỏ field lạ, ở đây ép cứng thêm một lần)
async function register({ name, phone, password, area }) {
  if (await User.exists({ phone })) throw ApiError.duplicate('Số điện thoại đã được đăng ký');
  if (otpRequired) await otp.consume(phone, 'register'); // phải vừa nhập đúng mã gửi tới số này
  return User.create({ name, phone, area, role: 'enduser', password: await bcrypt.hash(password, 10), phoneVerifiedAt: otpRequired ? new Date() : undefined });
}

// Quên mật khẩu: chỉ đổi được sau khi nhập đúng mã gửi tới số đó
async function resetPassword({ phone, password }) {
  if (otpRequired) await otp.consume(phone, 'reset');
  const user = await User.findOne({ phone }).select('+password status');
  if (!user || user.status === 'locked') throw ApiError.invalidState('Không đặt lại được mật khẩu cho số này');
  user.password = await bcrypt.hash(password, 10);
  if (!user.phoneVerifiedAt && otpRequired) user.phoneVerifiedAt = new Date();
  await user.save();
}

// Cho form đăng ký báo "đã đăng ký" ngay ở bước nhập số (đăng ký vốn đã lộ điều này qua lỗi 409)
async function phoneTaken(phone) {
  return !!(await User.exists({ phone }));
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
  if (otpRequired) await otp.consume(phone, 'register'); // phải nhập đúng mã gửi tới số này, giống đăng ký thường
  return User.create({ googleId: p.googleId, email: p.email, name: p.name, avatar: p.avatar, phone, role: 'enduser', phoneVerifiedAt: otpRequired ? new Date() : undefined });
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

/** Sửa hồ sơ của chính mình (tên, ảnh, email, giới tính, ngày sinh, giới thiệu) */
async function updateProfile(user, data) {
  const u = await User.findById(user._id);
  if (data.name !== undefined) u.name = data.name;
  if (data.avatar !== undefined) u.avatar = data.avatar;
  for (const k of ['email', 'gender', 'birthday', 'bio']) if (data[k] !== undefined) u[k] = data[k] === '' ? undefined : data[k];
  await u.save();
  return u;
}

/** Đổi mật khẩu khi đang đăng nhập: phải nhập đúng mật khẩu hiện tại */
async function changePassword(user, { current, next }) {
  const u = await User.findById(user._id).select('+password');
  if (!u.password) throw ApiError.invalidState('Tài khoản này đăng nhập bằng Google nên chưa có mật khẩu');
  if (!(await bcrypt.compare(current, u.password))) throw ApiError.validation('Mật khẩu hiện tại chưa đúng', [{ field: 'current', message: 'Mật khẩu hiện tại chưa đúng' }]);
  if (current === next) throw ApiError.validation('Mật khẩu mới phải khác mật khẩu cũ', [{ field: 'next', message: 'Mật khẩu mới phải khác mật khẩu cũ' }]);
  u.password = await bcrypt.hash(next, 10);
  await u.save();
}

module.exports = { updateProfile, changePassword, register, resetPassword, phoneTaken, verifyLogin, googleLogin, googleComplete, startSession, endSession };
