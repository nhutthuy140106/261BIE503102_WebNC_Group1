// Sinh server/src/seeds/client-posts.json từ client/public/datasets/posts.json (bài của bạn nhóm đăng qua khu Bán).
//   node scripts/build-client-posts.js
// - extras: khối bổ sung cho bài ĐÃ có ở seed (khóa = tiêu đề). Chỉ các trường cấu trúc, KHÔNG đè giá/ảnh/mô tả/số lượng của seed.
// - extra: bài chỉ có ở FE, thêm nguyên bài vào seed. Bỏ qua: việc làm, combo kiểu FE, bài của người bán chưa có tài khoản seed.
// Số tài khoản trong posts.json là bản MẪU (đã thay trước khi vào repo, xem CLAUDE.md mục 0d).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const posts = JSON.parse(fs.readFileSync(path.join(root, 'client/public/datasets/posts.json'), 'utf8'));
const data = fs.readFileSync(path.join(__dirname, '../src/seeds/data.js'), 'utf8');

const users = Object.fromEntries([...data.matchAll(/\{ key: '(\w+)', avatar: [^,]+, name: '([^']+)'/g)].map((m) => [m[2], m[1]]));
const seedTitles = new Set([...data.matchAll(/title['"]?: *['"]([^'"]+)['"]/g)].map((m) => m[1]));

// Cấu trúc bổ sung cho bài đã có
const STRUCT = ['items', 'serviceMenu', 'highlights', 'info', 'place', 'handover', 'payMethods', 'bank', 'priceType', 'estimate', 'inspectFee',
  'condition', 'serviceInfo', 'quickOptions', 'areas', 'dates', 'timeMode', 'duration', 'repeat', 'bookOnce', 'noSchedule', 'pickupAtBuyer',
  'noteEnabled', 'freeShipFrom', 'timeLabel', 'prepMinutes', 'orderWindow'];
// Bài thêm mới: cấu trúc + phần cơ bản + khối bán
const BASIC = ['title', 'description', 'images', 'category', 'price', 'acceptsXu', 'optionGroups', 'questions', 'fulfillmentModes', 'deliveryFee', 'needSchedule', 'stock', 'status'];

const pick = (p, keys) => Object.fromEntries(keys.filter((k) => p[k] !== undefined && p[k] !== null && !(Array.isArray(p[k]) && !p[k].length)).map((k) => [k, p[k]]));

const extras = {};
const extra = [];
const skipped = [];
for (const p of posts) {
  if (p.kind === 'job') continue;
  if (seedTitles.has(p.title)) { extras[p.title] = pick(p, STRUCT); continue; }
  const seller = users[p.sellerName];
  if (p.combo) { skipped.push([p.title, 'combo kiểu FE']); continue; }
  if (!seller) { skipped.push([p.title, `người bán "${p.sellerName}" chưa có tài khoản seed`]); continue; }
  extra.push({ seller, type: p.kind, unit: p.priceUnit, area: String(p.block || '').replace(/^Block /, '') || 'B', daysAgo: Math.max(1, Math.round((p.agoMin || 3 * 1440) / 1440)), ...pick(p, BASIC), ...pick(p, STRUCT) });
}

fs.writeFileSync(path.join(__dirname, '../src/seeds/client-posts.json'), JSON.stringify({ extras, extra }, null, 2) + '\n');
console.log(`Bổ sung cấu trúc cho ${Object.keys(extras).length} bài đã có · thêm mới ${extra.length} bài`);
for (const [t, why] of skipped) console.log(`  bỏ qua: ${t.slice(0, 50)} — ${why}`);
