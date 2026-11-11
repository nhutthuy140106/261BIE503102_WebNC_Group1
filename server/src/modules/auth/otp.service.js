const crypto = require('crypto');
const Otp = require('./otp.model');
const User = require('../shared/user.model');
const ApiError = require('../../utils/ApiError');
const { sessionSecret, isProd, isTest } = require('../../config/env');

const CODE_TTL_MS = 5 * 60 * 1000;        // mã có hiệu lực 5 phút
const RESEND_MS = 60 * 1000;              // gửi lại cách nhau 60 giây (khớp đồng hồ đếm ngược của giao diện)
const MAX_SENDS = 5;                      // tối đa 5 lần gửi / giờ / (SĐT, mục đích)
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;                   // nhập sai quá 5 lần thì phải xin mã mới
const VERIFIED_MS = 10 * 60 * 1000;       // sau khi nhập đúng, có 10 phút để hoàn tất đăng ký / đặt lại mật khẩu

const tooMany = (msg) => new ApiError(429, 'TOO_MANY_REQUESTS', msg);
const hash = (phone, purpose, code) => crypto.createHmac('sha256', sessionSecret).update(`${phone}|${purpose}|${code}`).digest('hex');

/**
 * Gửi mã. CHƯA gửi SMS thật: mã in ra màn hình server; ngoài production còn trả `devCode` để thử mà không cần nhìn terminal.
 * Mục đích 'reset': số chưa có tài khoản thì vẫn trả như đã gửi (không tạo mã) để không lộ số nào đã đăng ký.
 */
async function send(phone, purpose) {
  const user = await User.findOne({ phone }).select('status');
  if (purpose === 'register' && user) throw ApiError.duplicate('Số điện thoại đã được đăng ký');
  const base = { sent: true, expiresInSec: CODE_TTL_MS / 1000, resendInSec: RESEND_MS / 1000 };
  if (purpose === 'reset' && (!user || user.status === 'locked')) return base;

  const now = Date.now();
  const cur = await Otp.findOne({ phone, purpose });
  if (cur && cur.lastSentAt && now - cur.lastSentAt < RESEND_MS) {
    throw tooMany(`Vui lòng đợi ${Math.ceil((RESEND_MS - (now - cur.lastSentAt)) / 1000)} giây rồi gửi lại mã`);
  }
  const fresh = !cur || !cur.windowStart || now - cur.windowStart > SEND_WINDOW_MS;
  if (!fresh && cur.sendCount >= MAX_SENDS) throw tooMany('Bạn đã xin mã quá nhiều lần, vui lòng thử lại sau 1 giờ');

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Otp.updateOne({ phone, purpose }, {
    $set: {
      codeHash: hash(phone, purpose, code),
      expiresAt: new Date(now + CODE_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(now),
      windowStart: fresh ? new Date(now) : cur.windowStart,
      sendCount: fresh ? 1 : cur.sendCount + 1,
      purgeAt: new Date(now + 24 * 60 * 60 * 1000),
    },
    $unset: { verifiedUntil: '' },
  }, { upsert: true });

  if (!isTest) console.log(`[OTP giả lập] ${purpose} ${phone}: ${code} (hết hạn sau 5 phút)`);
  return isProd ? base : { ...base, devCode: code };
}

// Nhập mã. Đúng: đánh dấu đã xác minh (mã dùng một lần). Sai: đếm lần sai, quá giới hạn thì khóa mã.
async function verify(phone, purpose, code) {
  const cur = await Otp.findOne({ phone, purpose });
  if (!cur || !cur.codeHash || !cur.expiresAt || cur.expiresAt < new Date()) {
    throw ApiError.invalidState('Mã đã hết hạn hoặc chưa được gửi. Bấm "Gửi lại mã" để nhận mã mới.');
  }
  if (cur.attempts >= MAX_ATTEMPTS) throw tooMany('Bạn nhập sai quá nhiều lần, vui lòng xin mã mới');
  const given = Buffer.from(hash(phone, purpose, code));
  const real = Buffer.from(cur.codeHash);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    // tăng nguyên tử để hai yêu cầu song song không lách được giới hạn
    const r = await Otp.findOneAndUpdate({ _id: cur._id }, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
    const left = MAX_ATTEMPTS - r.attempts;
    throw ApiError.validation(left > 0 ? `Mã chưa đúng, bạn còn ${left} lần thử` : 'Bạn nhập sai quá nhiều lần, vui lòng xin mã mới');
  }
  await Otp.updateOne({ _id: cur._id }, { $set: { verifiedUntil: new Date(Date.now() + VERIFIED_MS) }, $unset: { codeHash: '', expiresAt: '' } });
  return { verified: true };
}

// Dùng đúng một lần: có xác minh còn hạn thì xóa bản ghi và cho qua, không thì từ chối
async function consume(phone, purpose) {
  const r = await Otp.findOneAndDelete({ phone, purpose, verifiedUntil: { $gt: new Date() } });
  if (!r) throw ApiError.forbidden('Số điện thoại chưa được xác minh hoặc đã hết hạn xác minh, vui lòng nhận mã mới');
}

module.exports = { send, verify, consume };
