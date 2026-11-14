// Thêm đánh giá + đề nghị nhận việc mẫu vào MongoDB đang chạy (chạy lại không nhân đôi).
//   node scripts/add-activity.js           → xem trước
//   node scripts/add-activity.js --apply   → sao lưu reviews/offers/jobs ra server/backups/ rồi ghi
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { addActivity } = require('../src/seeds/activity-extra');

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(env.mongoUri);
  if (apply) {
    const dir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const c of ['reviews', 'offers', 'jobs', 'notifications', 'counters']) {
      const file = path.join(dir, `${c}-${stamp}.json`);
      fs.writeFileSync(file, JSON.stringify(await mongoose.connection.db.collection(c).find({}).toArray()));
      if (!fs.existsSync(file)) throw new Error('Sao lưu thất bại, dừng lại');
    }
    console.log(`Đã sao lưu → server/backups/*-${stamp}.json`);
  }
  const r = await addActivity({ dryRun: !apply });
  console.log(`${apply ? 'Đã thêm' : 'Sẽ thêm'}: ${r.reviews} đánh giá, ${r.offers} đề nghị nhận việc.`);
  if (r.skipped.length) console.log('Bỏ qua:\n - ' + r.skipped.join('\n - '));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
