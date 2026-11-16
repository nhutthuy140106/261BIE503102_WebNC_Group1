// Thêm dữ liệu mẫu cho khu Quản trị vào MongoDB đang chạy: hồ sơ xác minh chờ duyệt, báo cáo, đơn bị báo vấn đề,
// phiếu hỗ trợ, thông báo hệ thống, nhật ký. Chạy lại không nhân đôi.
//   node scripts/seed-admin-demo.js           → xem trước
//   node scripts/seed-admin-demo.js --apply   → sao lưu các bộ sưu tập liên quan ra server/backups/ rồi ghi
// Dùng DB khác DoAnWeb: MONGODB_URI=mongodb://127.0.0.1:27017/DoAnWeb_admin node scripts/seed-admin-demo.js --apply
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const User = require('../src/modules/shared/user.model');
const Post = require('../src/modules/shared/post.model');
const Order = require('../src/modules/buyer/order/order.model');
const Report = require('../src/modules/buyer/report/report.model');
const Job = require('../src/modules/shared/job.model');
const Offer = require('../src/modules/buyer/offer/offer.model');
const Ticket = require('../src/modules/buyer/support/support.model');
const Verification = require('../src/modules/seller/verification.model');
const Announcement = require('../src/modules/admin/announcement.model');
const { AuditLog } = require('../src/modules/shared/audit-log.model');
const { nextCode } = require('../src/modules/shared/counter.model');
const extra = require('../src/modules/admin/admin-extra.service');

const DAY = 864e5;
const ago = (d, h = 0) => new Date(Date.now() - d * DAY - h * 36e5);
const face = (id) => `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&crop=faces&q=70`;
const FRONT = '/images/admin-demo/cccd-truoc.svg';
const BACK = '/images/admin-demo/cccd-sau.svg';

async function main(apply) {
  const out = { verifications: 0, reports: 0, issues: 0, cancelRequests: 0, tickets: 0, announcements: 0, audit: 0 };
  const phones = ['0900000040', '0900000041', '0900000042', '0900000043', '0900000001', '0900000002', '0900000003', '0900000004', '0900000005', '0900000007', '0900000008', '0900000011', '0900000012', '0900000013', '0900000014', '0900000015', '0900000016', '0900000030', '0900000099'];
  const U = Object.fromEntries((await User.find({ phone: { $in: phones } })).map((u) => [u.phone, u]));
  const need = (p) => { if (!U[p]) throw new Error(`Thiếu tài khoản ${p}: hãy chạy npm run seed trước`); return U[p]; };
  const admin = need('0900000099'); const thuy = need('0900000001'); const vp = need('0900000030');

  /* --- 1. Hồ sơ xác minh --- */
  // Người nộp hồ sơ là tài khoản mới (tài khoản mẫu cũ đã được duyệt sẵn); mật khẩu = SEED_PASSWORD
  const applicants = [['0900000040', 'Nguyễn Văn Minh', 'B'], ['0900000041', 'Trần Thị Phương', 'D'], ['0900000042', 'Lê Thị Ngân', 'B'], ['0900000043', 'Phạm Anh Tuấn', 'D']];
  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'Antgo@2026', 10);
  for (const [phone, name, area] of applicants) {
    if (!(await User.exists({ phone }))) { out.verifications += 0; if (apply) await User.create({ name, phone, area, password: hash, phoneVerifiedAt: new Date() }); }
  }
  const people = [
    { p: '0900000040', st: 'pending', shop: 'Bánh mì Minh', type: 'food', name: 'Nguyễn Văn Minh', cccd: '079201004511', intro: 'Bán bánh mì và xôi sáng cho cư dân trong khu, nhận đặt trước.', face: '1507003211169-0a1dd7228f2d', ago: [0, 3] },
    { p: '0900000041', st: 'pending', shop: 'Phương Handmade', type: 'goods', name: 'Trần Thị Phương', cccd: '079301002877', intro: 'Đồ handmade, quà tặng nhỏ, làm theo yêu cầu.', face: '1438761681033-6461ffad8d80', ago: [1, 5] },
    { p: '0900000042', st: 'pending', shop: 'Ngân Gia Sư', type: 'service', name: 'Lê Thị Ngân', cccd: '079199003342', intro: 'Dạy kèm Toán, Lý cấp 2 tại nhà, có 3 năm kinh nghiệm.', face: '1544005313-94ddf0286df2', ago: [2, 1] },
    { p: '0900000043', st: 'rejected', shop: 'Tuấn Sửa Xe', type: 'service', name: 'Phạm Anh Tuấn', cccd: '079198001209', intro: 'Sửa xe máy, xe đạp tại nhà.', face: '1500648767791-00dcc994a43e', ago: [4, 2], reason: 'Ảnh mặt sau CCCD bị mờ, chưa đọc được số. Bạn chụp lại rõ hơn rồi nộp lại nhé.' },
  ];
  for (const x of people) {
    const u = apply ? await User.findOne({ phone: x.p }) : U[x.p] || { _id: x.p };
    if (!u) continue;
    if (u._id && mongoose.isValidObjectId(u._id) && await Verification.exists({ user: u._id })) continue;
    out.verifications++;
    if (!apply) continue;
    await Verification.create({
      user: u._id, status: x.st, submittedAt: ago(...x.ago), createdAt: ago(...x.ago),
      body: { fullName: x.name, idNumber: x.cccd, idFront: FRONT, idBack: BACK, selfie: face(x.face), shopName: x.shop, shopType: x.type, intro: x.intro },
      ...(x.st === 'rejected' ? { reviewedAt: ago(3), reviewedBy: admin._id, rejectReason: x.reason } : {}),
    });
  }

  /* --- 2. Đơn mẫu để gắn báo cáo / báo vấn đề / xin hủy --- */
  const doneOrders = await Order.find({ state: 'done', 'issue.st': { $exists: false } }).sort({ createdAt: -1 }).limit(12);
  const liveOrders = await Order.find({ state: { $in: ['confirmed', 'preparing'] } }).sort({ createdAt: -1 }).limit(3);
  const posts = await Post.find({ status: 'open' }).sort({ createdAt: -1 }).limit(6).populate('seller', 'name');

  const issueDefs = [
    { st: 'rejected', type: 'Món nguội / không còn tươi', text: 'Món giao tới bị nguội và thiếu một phần canh so với lúc đặt. Mình đã chụp ảnh gửi kèm.', reply: 'Mình giao đủ phần, canh để riêng trong túi nhỏ, có thể bạn chưa thấy.', images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600'] },
    { st: 'open', type: 'Sai món', text: 'Mình đặt 2 phần cơm gà nhưng nhận được cơm sườn. Người bán chưa trả lời tin nhắn từ chiều.', reply: '', images: [] },
  ];
  const issued = await Order.exists({ 'issue.text': issueDefs[0].text });
  for (const [i, d] of issueDefs.entries()) {
    const o = doneOrders[i];
    if (!o || issued) continue;
    out.issues++;
    if (apply) { o.issue = { ...d, photos: d.images.length, at: ago(0, 6 + i * 5) }; await o.save(); }
  }
  if (liveOrders[0] && !(await Order.exists({ 'cancelRequest.status': 'pending' }))) {
    out.cancelRequests++;
    if (apply) { liveOrders[0].cancelRequest = { reason: 'Mình có việc đột xuất nên không nhận được hàng hôm nay.', at: ago(0, 2), status: 'pending' }; await liveOrders[0].save(); }
  }

  /* --- 3. Báo cáo vi phạm --- */
  const reportDefs = [
    { by: thuy, t: 'post', id: posts[0] && posts[0]._id, reason: 'quality', detail: 'Ảnh đăng không giống món thật, nhận về khác hẳn mô tả (mẫu quản trị).', state: 'open', ago: [0, 4] },
    { by: need('0900000005'), t: 'user', id: vp._id, reason: 'abuse', detail: 'Người này nhắn tin lời lẽ thô tục khi mình từ chối giảm giá (mẫu quản trị).', state: 'open', ago: [1, 0] },
    { by: need('0900000013'), t: 'order', id: doneOrders[2] && doneOrders[2]._id, reason: 'payment', detail: 'Người bán đòi chuyển khoản trước dù đã chọn tiền mặt khi đặt (mẫu quản trị).', state: 'open', ago: [1, 8] },
    { by: need('0900000014'), t: 'post', id: posts[1] && posts[1]._id, reason: 'other', detail: 'Bài có vẻ đăng lặp nhiều lần để chiếm vị trí tìm kiếm (mẫu quản trị).', state: 'reviewing', ago: [3, 0], note: 'Đang đối chiếu các bài cùng người bán.' },
    { by: need('0900000004'), t: 'user', id: vp._id, reason: 'abuse', detail: 'Tài khoản này liên tục gửi tin quảng cáo ngoài lề vào hội thoại đơn (mẫu quản trị).', state: 'resolved', ago: [8, 0], note: 'Đã nhắc nhở, có vi phạm lần hai sẽ khóa.' },
    { by: need('0900000003'), t: 'post', id: posts[2] && posts[2]._id, reason: 'quality', detail: 'Giá trong bài khác giá thực tế khi hỏi người bán (mẫu quản trị).', state: 'rejected', ago: [10, 0], note: 'Giá trong bài đã đúng, khách nhầm đơn vị tính.' },
  ];
  for (const r of reportDefs) {
    if (!r.id || (await Report.exists({ detail: r.detail }))) continue;
    out.reports++;
    if (!apply) continue;
    const doc = new Report({
      reporter: r.by._id, targetType: r.t, targetId: r.id, reason: r.reason, detail: r.detail, state: r.state, adminNote: r.note || '',
      handledBy: r.state === 'open' ? undefined : admin._id, history: r.state === 'open' ? [] : [{ state: r.state, at: ago(...r.ago), note: r.note || '' }],
    });
    doc.createdAt = ago(...r.ago);
    await doc.save({ timestamps: false });
  }

  /* --- 3b. Báo cáo bổ sung để thử đủ các nút xử lý: đơn có báo vấn đề chờ phân xử, đơn đang chạy, việc làm, đề nghị --- */
  const issueOpen = await Order.findOne({ 'issue.text': issueDefs[1].text });
  const issueRej = await Order.findOne({ 'issue.text': issueDefs[0].text });
  const activeOrder = await Order.findOne({ state: { $in: Order.ACTIVE }, _id: { $nin: liveOrders[0] ? [liveOrders[0]._id] : [] } }).sort({ createdAt: -1 });
  const openJob = await Job.findOne({ status: 'open' }).sort({ createdAt: -1 });
  const anOffer = await Offer.findOne({}).sort({ createdAt: -1 });
  const moreDefs = [
    { by: need('0900000005'), t: 'order', o: issueOpen, reason: 'not_received', detail: 'Người bán chưa trả lời báo vấn đề của mình và cũng không nhận hoàn tiền (mẫu thử nút Phân xử đơn).', state: 'reviewing', ago: [0, 5] },
    { by: need('0900000013'), t: 'order', o: issueRej, reason: 'quality', detail: 'Người bán từ chối hoàn tiền dù món giao thiếu, mình xin AntGo xem lại (mẫu thử nút Phân xử đơn).', state: 'open', ago: [0, 9] },
    { by: need('0900000014'), t: 'order', o: activeOrder, reason: 'other', detail: 'Đơn đã xác nhận từ sáng nhưng người bán không chuẩn bị và không phản hồi (mẫu thử nút Hủy đơn).', state: 'reviewing', ago: [0, 3] },
    { by: need('0900000004'), t: 'job', id: openJob && openJob._id, reason: 'abuse', detail: 'Việc này có vẻ lừa đảo: yêu cầu chuyển tiền cọc trước khi đến làm (mẫu thử nút Đóng việc).', state: 'reviewing', ago: [1, 2] },
    { by: need('0900000003'), t: 'offer', id: anOffer && anOffer._id, reason: 'abuse', detail: 'Người gửi đề nghị để lại số điện thoại và rủ trao đổi ngoài ứng dụng (mẫu thử nút Nhắc nhở).', state: 'open', ago: [1, 6] },
  ];
  for (const r of moreDefs) {
    const id = r.id || (r.o && r.o._id);
    if (!id || (await Report.exists({ detail: r.detail }))) continue;
    out.reports++;
    if (!apply) continue;
    const doc = new Report({
      reporter: r.by._id, targetType: r.t, targetId: id, reason: r.reason, detail: r.detail, state: r.state, adminNote: '',
      handledBy: r.state === 'open' ? undefined : admin._id, history: r.state === 'open' ? [] : [{ state: r.state, at: ago(...r.ago), note: '' }],
    });
    doc.createdAt = ago(...r.ago);
    await doc.save({ timestamps: false });
  }

  /* --- 4. Hộp thư hỗ trợ --- */
  const tickets = [
    { u: thuy, topic: 'order', msgs: [['user', 'Đơn của mình bị giao trễ hơn một tiếng mà người bán không trả lời tin nhắn, mình nên làm gì?']], state: 'open', ago: [0, 2] },
    { u: need('0900000013'), topic: 'account', msgs: [['user', 'Mình quên mật khẩu và số điện thoại cũ đã đổi, có cách nào khôi phục tài khoản không?']], state: 'open', ago: [1, 3] },
    { u: need('0900000005'), topic: 'seller', msgs: [['user', 'Hồ sơ xác minh người bán của mình đã nộp 3 ngày rồi, khi nào được duyệt vậy ạ?'], ['staff', 'Chào bạn, hồ sơ của bạn đang trong hàng chờ và sẽ được duyệt trong hôm nay. Cảm ơn bạn đã kiên nhẫn.']], state: 'answered', ago: [2, 0] },
    { u: need('0900000014'), topic: 'payment', msgs: [['user', 'Voucher XU của mình bị báo hết hạn dù mới đổi hôm qua.'], ['staff', 'AntGo đã kiểm tra và đã cộng lại Xu cho bạn, bạn đổi lại voucher giúp mình nhé.'], ['user', 'Mình đổi được rồi, cảm ơn AntGo!']], state: 'closed', ago: [6, 0] },
  ];
  for (const t of tickets) {
    const first = t.msgs[0][1];
    if (await Ticket.exists({ 'messages.0.text': first })) continue;
    out.tickets++;
    if (!apply) continue;
    const doc = new Ticket({
      code: await nextCode('ticket', 'HT-'), user: t.u._id, topic: t.topic, state: t.state,
      messages: t.msgs.map(([by, text], i) => ({ by, text, at: ago(t.ago[0], Math.max(0, t.ago[1] - i)), ...(by === 'staff' ? { staff: admin._id } : {}) })),
    });
    doc.createdAt = ago(...t.ago);
    doc.updatedAt = ago(t.ago[0], Math.max(0, t.ago[1] - 1));
    await doc.save({ timestamps: false });
  }

  /* --- 5. Thông báo hệ thống + nhật ký --- */
  if (!(await Announcement.exists({ title: 'Cuối tuần có mưa lớn' }))) {
    out.announcements++;
    if (apply) await extra.announce(admin, { title: 'Cuối tuần có mưa lớn', body: 'Người giao hàng trong khu có thể chậm hơn thường lệ. Bạn nên đặt sớm và nhắn trước với người bán nhé.', area: 'all' });
  }
  if (!(await AuditLog.exists({ note: /\(mẫu\)/ }))) {
    const rows = [
      ['user.lock', 'user', vp._id, 'Nhiều báo cáo spam trong hội thoại (mẫu)', ago(9)],
      ['user.unlock', 'user', vp._id, '(mẫu)', ago(8)],
      ['post.hide', 'post', posts[3] && posts[3]._id, 'Ảnh không đúng sản phẩm (mẫu)', ago(6, 3)],
      ['post.unhide', 'post', posts[3] && posts[3]._id, '(mẫu)', ago(5, 6)],
      ['report.resolved', 'report', (await Report.findOne({ state: 'resolved' }) || {})._id, 'Đã nhắc nhở người bán (mẫu)', ago(4)],
      ['xu.grant', 'user', thuy._id, '+30 · Bù Xu do voucher hết hạn sớm (mẫu)', ago(2, 4)],
    ].filter((r) => r[2]);
    for (const [action, targetType, targetId, note, at] of rows) {
      out.audit++;
      if (apply) { const a = new AuditLog({ actor: admin._id, action, targetType, targetId, note }); a.at = at; await a.save({ timestamps: false }); }
    }
  }
  return out;
}

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(env.mongoUri);
  if (apply) {
    const dir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const c of ['sellerverifications', 'reports', 'orders', 'supporttickets', 'announcements', 'auditlogs', 'notifications', 'counters']) {
      const file = path.join(dir, `${c}-${stamp}.json`);
      fs.writeFileSync(file, JSON.stringify(await mongoose.connection.db.collection(c).find({}).toArray()));
      if (!fs.existsSync(file)) throw new Error('Sao lưu thất bại, dừng lại');
    }
    console.log(`Đã sao lưu → server/backups/*-${stamp}.json (DB: ${mongoose.connection.name})`);
  }
  const r = await main(apply);
  console.log(`${apply ? 'Đã thêm' : 'Sẽ thêm'}:`, JSON.stringify(r));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
