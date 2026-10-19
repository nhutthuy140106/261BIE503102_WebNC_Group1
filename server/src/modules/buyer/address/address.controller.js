const service = require('./address.service');
const asyncHandler = require('../../../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => res.json({ data: await service.list(req.user._id) }));
exports.create = asyncHandler(async (req, res) => res.status(201).json({ data: await service.create(req.user._id, req.body) }));
exports.update = asyncHandler(async (req, res) => res.json({ data: await service.update(req.user._id, req.params.id, req.body) }));
exports.remove = asyncHandler(async (req, res) => { await service.remove(req.user._id, req.params.id); res.status(204).end(); });
exports.setDefault = asyncHandler(async (req, res) => res.json({ data: await service.setDefault(req.user._id, req.params.id) }));
