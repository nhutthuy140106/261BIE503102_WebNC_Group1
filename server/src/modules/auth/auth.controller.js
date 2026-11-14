const service = require('./auth.service');
const otp = require('./otp.service');
const asyncHandler = require('../../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const user = await service.register(req.body);
  await service.startSession(req, user);
  res.status(201).json({ data: user });
});

exports.phoneExists = asyncHandler(async (req, res) => {
  res.json({ data: { exists: await service.phoneTaken(req.valid.query.phone) } });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await service.verifyLogin(req.body);
  await service.startSession(req, user);
  res.json({ data: user });
});

// 200 { data: User } = đã đăng nhập; 200 { needPhone: true, name } = lần đầu, FE hiện bước nhập SĐT rồi gọi googleComplete
exports.google = asyncHandler(async (req, res) => {
  const { user, name } = await service.googleLogin(req, req.body.credential);
  if (!user) return res.json({ needPhone: true, name });
  await service.startSession(req, user);
  res.json({ data: user });
});

exports.googleComplete = asyncHandler(async (req, res) => {
  const user = await service.googleComplete(req, req.body);
  await service.startSession(req, user);
  res.status(201).json({ data: user });
});

exports.logout =asyncHandler(async (req, res) => {
  await service.endSession(req, res);
  res.status(204).end();
});

// FE (authGuard) hỏi endpoint này: 200 + user nếu còn phiên, 401 nếu không
exports.profile = (req, res) => res.json({ data: req.user });

exports.updateProfile = asyncHandler(async (req, res) => {
  res.json({ data: await service.updateProfile(req.user, req.body) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user, req.body);
  res.status(204).end();
});

exports.otpSend = asyncHandler(async (req, res) => {
  res.json({ data: await otp.send(req.body.phone, req.body.purpose) });
});

exports.otpVerify = asyncHandler(async (req, res) => {
  res.json({ data: await otp.verify(req.body.phone, req.body.purpose, req.body.code) });
});

exports.passwordReset = asyncHandler(async (req, res) => {
  await service.resetPassword(req.body);
  res.status(204).end();
});
