const service = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

exports.register = asyncHandler(async (req, res) => {
  const user = await service.register(req.body);
  await service.startSession(req, user);
  res.status(201).json({ data: user });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await service.verifyLogin(req.body);
  await service.startSession(req, user);
  res.json({ data: user });
});

exports.logout = asyncHandler(async (req, res) => {
  await service.endSession(req, res);
  res.status(204).end();
});

// FE (authGuard) hỏi endpoint này: 200 + user nếu còn phiên, 401 nếu không
exports.profile = (req, res) => res.json({ data: req.user });
