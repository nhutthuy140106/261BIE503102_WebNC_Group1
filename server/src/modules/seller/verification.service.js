const SellerVerification = require('./verification.model');
const { notify } = require('../shared/notify');
const ApiError = require('../../utils/ApiError');
const { parsePaging } = require('../../utils/pagination');

/** Dạng FE đọc: { status, submittedAt?, reviewedAt?, rejectReason?, body? } — chưa nộp thì { status: 'none' } */
function present(v) {
  if (!v) return { status: 'none' };
  return {
    status: v.status,
    submittedAt: v.submittedAt,
    reviewedAt: v.reviewedAt || undefined,
    rejectReason: v.rejectReason || undefined,
    body: v.body && v.body.toObject ? v.body.toObject() : v.body,
  };
}

const mine = async (user) => present(await SellerVerification.findOne({ user: user._id }));

const isApproved = async (userId) => !!(await SellerVerification.exists({ user: userId, status: 'approved' }));

async function submit(user, body) {
  const cur = await SellerVerification.findOne({ user: user._id });
  if (cur && cur.status === 'approved') throw ApiError.duplicate('Hồ sơ của bạn đã được duyệt');
  if (cur && cur.status === 'pending') throw ApiError.duplicate('Hồ sơ đang chờ AntGo duyệt, chưa nộp lại được');
  const doc = cur || new SellerVerification({ user: user._id });
  doc.set({ status: 'pending', body, submittedAt: new Date(), reviewedAt: undefined, reviewedBy: undefined, rejectReason: '' });
  await doc.save();
  return present(doc);
}

/** Quản trị: danh sách hồ sơ (mặc định chờ duyệt), kèm người nộp */
async function list({ status = 'pending', ...paging }) {
  const { page, limit, skip } = parsePaging(paging);
  const filter = status === 'all' ? {} : { status };
  const [items, total] = await Promise.all([
    SellerVerification.find(filter).sort({ submittedAt: 1 }).skip(skip).limit(limit).populate('user', 'name phone avatar area'),
    SellerVerification.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total } };
}

async function review(admin, id, { approve, reason }) {
  const v = await SellerVerification.findById(id);
  if (!v) throw ApiError.notFound('Không tìm thấy hồ sơ');
  if (v.status !== 'pending') throw ApiError.invalidState('Hồ sơ này đã được xử lý');
  v.status = approve ? 'approved' : 'rejected';
  v.reviewedAt = new Date();
  v.reviewedBy = admin._id;
  v.rejectReason = approve ? '' : reason;
  await v.save();
  await notify(v.user, {
    type: 'seller_verification',
    title: approve ? 'Hồ sơ người bán đã được duyệt — bạn có thể đăng bán' : 'Hồ sơ người bán chưa được duyệt',
    body: approve ? '' : reason,
  });
  return v.populate('user', 'name phone avatar area');
}

module.exports = { mine, submit, list, review, isApproved, present };
