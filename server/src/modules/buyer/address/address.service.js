const Address = require('./address.model');
const ApiError = require('../../../utils/ApiError');

// Lấy địa chỉ của chính người dùng: 404 nếu không có, 403 nếu của người khác
async function own(userId, id) {
  const a = await Address.findById(id);
  if (!a) throw ApiError.notFound('Không tìm thấy địa chỉ');
  if (String(a.user) !== String(userId)) throw ApiError.forbidden('Đây không phải địa chỉ của bạn');
  return a;
}

const list = (userId) => Address.find({ user: userId }).sort({ isDefault: -1, createdAt: 1 });

async function clearDefault(userId, exceptId) {
  await Address.updateMany({ user: userId, isDefault: true, _id: { $ne: exceptId } }, { isDefault: false });
}

async function create(userId, data) {
  const first = !(await Address.exists({ user: userId }));
  const makeDefault = first || data.isDefault === true; // địa chỉ đầu tiên luôn là mặc định
  const a = await Address.create({ ...data, user: userId, isDefault: makeDefault });
  if (makeDefault) await clearDefault(userId, a._id);
  return a;
}

async function update(userId, id, data) {
  const a = await own(userId, id);
  const { isDefault, ...rest } = data;
  if (isDefault === false && a.isDefault) throw ApiError.invalidState('Phải luôn có một địa chỉ mặc định; hãy đặt địa chỉ khác làm mặc định');
  a.set(rest);
  if (isDefault === true) a.isDefault = true;
  await a.save();
  if (isDefault === true) await clearDefault(userId, a._id);
  return a;
}

async function remove(userId, id) {
  const a = await own(userId, id);
  if (a.isDefault) throw ApiError.invalidState('Không xóa được địa chỉ mặc định; hãy đặt địa chỉ khác làm mặc định trước');
  await a.deleteOne();
}

async function setDefault(userId, id) {
  const a = await own(userId, id);
  a.isDefault = true;
  await a.save();
  await clearDefault(userId, a._id);
  return a;
}

module.exports = { own, list, create, update, remove, setDefault };
