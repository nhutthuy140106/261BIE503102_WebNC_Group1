const Saved = require('./saved.model');
const Post = require('../../shared/post.model');
const Job = require('../../shared/job.model');
const ApiError = require('../../../utils/ApiError');

async function save(userId, targetId) {
  let target = await Post.findById(targetId);
  let targetModel = 'Post';
  let type = target && target.type;
  if (!target) {
    target = await Job.findById(targetId);
    targetModel = 'Job';
    type = 'job';
  }
  if (!target) throw ApiError.notFound('Bài hoặc việc này không tồn tại');
  // upsert => lưu hai lần không tạo bản ghi trùng
  await Saved.updateOne({ user: userId, targetId }, { $setOnInsert: { targetModel, type } }, { upsert: true });
}

async function unsave(userId, targetId) {
  await Saved.deleteOne({ user: userId, targetId }); // bỏ lưu bài chưa lưu: vẫn coi là xong
}

async function list(userId, type) {
  const filter = { user: userId, ...(type ? { type } : {}) };
  const rows = await Saved.find(filter).sort({ createdAt: -1 }).lean();
  const posts = await Post.find({ _id: { $in: rows.filter((r) => r.targetModel === 'Post').map((r) => r.targetId) } }).lean();
  const jobs = await Job.find({ _id: { $in: rows.filter((r) => r.targetModel === 'Job').map((r) => r.targetId) } }).lean();
  const byId = new Map([...posts, ...jobs].map((d) => [String(d._id), d]));

  return rows.map((r) => {
    const d = byId.get(String(r.targetId));
    if (!d) return { postId: r.targetId, type: r.type, title: '(Đã bị xóa)', available: false, savedAt: r.createdAt };
    const isJob = r.targetModel === 'Job';
    return {
      postId: r.targetId,
      type: r.type,
      title: d.title,
      price: isJob ? d.pay : d.price,
      area: d.area,
      image: isJob ? undefined : d.images && d.images[0],
      available: d.status === 'open',
      savedAt: r.createdAt,
    };
  });
}

module.exports = { save, unsave, list };
