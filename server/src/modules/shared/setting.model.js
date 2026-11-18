// Cài đặt hệ thống do admin chỉnh: từ khóa cấm, danh sách khu vực, danh mục bài.
const { Schema, model } = require('mongoose');

const Setting = model('Setting', new Schema({
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed,
}, { timestamps: true }));

const DEFAULTS = {
  bannedKeywords: [],
  areas: ['A', 'B', 'C', 'D'],
  categories: ['Đồ ăn', 'Đồ uống', 'Đồ dùng', 'Dịch vụ', 'Việc làm'],
};

async function get(key) {
  const row = await Setting.findOne({ key });
  return row ? row.value : DEFAULTS[key];
}
async function getAll() {
  const rows = await Setting.find({ key: { $in: Object.keys(DEFAULTS) } });
  const out = { ...DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}
const set = (key, value) => Setting.findOneAndUpdate({ key }, { value }, { upsert: true, returnDocument: 'after' });

module.exports = { Setting, DEFAULTS, get, getAll, set };
