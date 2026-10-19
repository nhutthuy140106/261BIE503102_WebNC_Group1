// Nạp dữ liệu mẫu. Chạy lặp lại được: mỗi lần chỉ xóa và tạo lại dữ liệu THUỘC các tài khoản mẫu
// (người dùng thật đăng ký thêm và dữ liệu của họ không bị đụng tới). Dữ liệu gốc ở ./data.js.
const bcrypt = require('bcryptjs');
const User = require('../modules/shared/user.model');
const Post = require('../modules/shared/post.model');
const Job = require('../modules/shared/job.model');
const { Counter } = require('../modules/shared/counter.model');
const { AuditLog } = require('../modules/shared/audit-log.model');
const Address = require('../modules/buyer/address/address.model');
const Saved = require('../modules/buyer/saved/saved.model');
const Order = require('../modules/buyer/order/order.model');
const Offer = require('../modules/buyer/offer/offer.model');
const Question = require('../modules/buyer/question/question.model');
const Review = require('../modules/buyer/review/review.model');
const { Conversation, Message } = require('../modules/buyer/chat/chat.model');
const Notification = require('../modules/buyer/notification/notification.model');
const Report = require('../modules/buyer/report/report.model');
const orders = require('../modules/buyer/order/order.service');
const offers = require('../modules/buyer/offer/offer.service');
const { USERS, POSTS, JOBS, img } = require('./data');

// Mật khẩu tài khoản mẫu lấy từ biến môi trường SEED_PASSWORD (.env), không viết cứng trong repo
const getPassword = () => {
  const pw = process.env.SEED_PASSWORD;
  if (!pw || pw.length < 6) throw new Error('Cần đặt SEED_PASSWORD (tối thiểu 6 ký tự) trong server/.env trước khi chạy seed');
  return pw;
};

const DAY = 86400000;
const HOUR = 3600000;
const ago = (ms) => new Date(Date.now() - ms);
const inDays = (d, h = 9) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x; };

// đặt lại createdAt/updatedAt (Mongoose luôn ghi "bây giờ", nên đi đường raw)
const backdate = (Model, id, date, extra = {}) =>
  Model.collection.updateOne({ _id: id }, { $set: { createdAt: date, updatedAt: date, ...extra } });

async function cleanup(userIds) {
  const jobIds = (await Job.find({ poster: { $in: userIds } }).select('_id').lean()).map((j) => j._id);
  const convIds = (await Conversation.find({ participants: { $in: userIds } }).select('_id').lean()).map((c) => c._id);
  await Promise.all([
    Post.deleteMany({ seller: { $in: userIds } }),
    Job.deleteMany({ poster: { $in: userIds } }),
    Order.deleteMany({ $or: [{ buyer: { $in: userIds } }, { seller: { $in: userIds } }] }),
    Offer.deleteMany({ $or: [{ worker: { $in: userIds } }, { job: { $in: jobIds } }] }),
    Question.deleteMany({ $or: [{ author: { $in: userIds } }, { job: { $in: jobIds } }] }),
    Review.deleteMany({ $or: [{ reviewer: { $in: userIds } }, { target: { $in: userIds } }] }),
    Message.deleteMany({ conversation: { $in: convIds } }),
    Conversation.deleteMany({ _id: { $in: convIds } }),
    Notification.deleteMany({ user: { $in: userIds } }),
    Report.deleteMany({ reporter: { $in: userIds } }),
    Address.deleteMany({ user: { $in: userIds } }),
    Saved.deleteMany({ user: { $in: userIds } }),
    AuditLog.deleteMany({ actor: { $in: userIds } }),
  ]);
  // không còn đơn/đề nghị nào thì cho mã AG-O…/AG-J… bắt đầu lại từ đầu; còn thì giữ để không trùng mã
  if (!(await Order.countDocuments()) && !(await Offer.countDocuments())) await Counter.deleteMany({});
}

async function seed() {
  const password = getPassword();
  const hash = await bcrypt.hash(password, 10);

  /* ---------- Người dùng ---------- */
  const u = {};
  for (const { key, ...d } of USERS) {
    u[key] = await User.findOneAndUpdate(
      { phone: d.phone },
      { role: 'enduser', status: 'active', lockedReason: '', ...d, password: hash },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }
  await cleanup(Object.values(u).map((x) => x._id));

  /* ---------- Bài đăng ---------- */
  const p = {};
  for (const [i, { key, seller, daysAgo, images, ...d }] of POSTS.entries()) {
    p[key] = await Post.create({ ...d, seller: u[seller]._id, images: (images || []).map(img) });
    await backdate(Post, p[key]._id, ago(daysAgo * DAY + i * 17 * 60000));
  }

  /* ---------- Việc làm ---------- */
  const j = {};
  for (const [i, { key, poster, daysAgo, windows, ...d }] of JOBS.entries()) {
    j[key] = await Job.create({ ...d, poster: u[poster]._id, windows: (windows || []).map(([day, h]) => inDays(day, h)) });
    await backdate(Job, j[key]._id, ago(daysAgo * DAY + i * 11 * 60000));
  }

  /* ---------- Sổ địa chỉ ---------- */
  await Address.create([
    { user: u.thuy._id, name: 'Ngọc Thủy', phone: '0901234567', block: 'B', unit: 'B-1204', note: 'Gọi trước khi tới', label: 'home', isDefault: true },
    { user: u.thuy._id, name: 'Mẹ — Cô Lan Anh', phone: '0907654321', block: 'A', unit: 'A-0305', label: 'family' },
    { user: u.minh._id, name: 'Minh', phone: '0911000001', block: 'B', unit: 'B-0610', label: 'home', isDefault: true },
    { user: u.phuong._id, name: 'Phương', phone: '0911000002', block: 'D', unit: 'D-0902', label: 'home', isDefault: true },
  ]);
  const addr = {
    thuy: String((await Address.findOne({ user: u.thuy._id, isDefault: true }))._id),
    minh: String((await Address.findOne({ user: u.minh._id }))._id),
    phuong: String((await Address.findOne({ user: u.phuong._id }))._id),
  };

  /* ---------- Đơn mua (qua service thật để tính tiền đúng) ---------- */
  const place = (buyer, post, input) => orders.create(u[buyer], {
    postId: String(p[post]._id), quantity: 1, selections: [], answers: [], payment: 'cash', fulfillment: 'pickup', ...input,
  });
  // dựng lịch sử trạng thái: mỗi bước cách nhau 25 phút, bắt đầu từ `daysAgo` ngày trước
  const advance = async (order, to, daysAgo, extra = {}) => {
    const start = Date.now() - daysAgo * DAY;
    const last = order.fulfillment === 'delivery' ? 'delivering' : 'ready';
    const path = to === 'cancelled' ? ['waiting', 'cancelled']
      : to === 'done' ? ['waiting', 'confirmed', 'preparing', last, 'done']
        : ['waiting', 'confirmed', 'preparing', 'delivering'].slice(0, ['waiting', 'confirmed', 'preparing', 'delivering'].indexOf(to) + 1);
    const history = path.map((state, i) => ({ state, at: new Date(start + i * 25 * 60000) }));
    await Order.collection.updateOne({ _id: order._id }, { $set: { state: to, history, createdAt: new Date(start), updatedAt: history[history.length - 1].at, ...extra } });
  };

  const o = {};
  // Thủy — đủ các trạng thái để thử trang Đơn hàng
  o.wait = await place('thuy', 'com', { fulfillment: 'delivery', addressId: addr.thuy, utensils: true, note: 'Ít cay giúp mình',
    selections: [{ group: 'Món mặn', choices: ['Sườn rim'] }, { group: 'Thêm', choices: ['Trứng'] }] });
  o.deliver = await place('thuy', 'trasua', { fulfillment: 'delivery', addressId: addr.thuy, voucherCode: 'XU10',
    selections: [{ group: 'Size', choices: ['L'] }, { group: 'Độ ngọt', choices: ['50%'] }, { group: 'Topping', choices: ['Trân châu'] }] });
  await advance(o.deliver, 'delivering', 0.04);
  o.rau = await place('thuy', 'rau', { quantity: 2 });
  await advance(o.rau, 'done', 5);
  o.pho = await place('thuy', 'pho', { quantity: 2, fulfillment: 'delivery', addressId: addr.thuy });
  await advance(o.pho, 'done', 3);
  o.mi = await place('thuy', 'mi', { fulfillment: 'delivery', addressId: addr.thuy });
  await advance(o.mi, 'cancelled', 4, { cancelRequest: { reason: 'Đặt nhầm món', at: ago(4 * DAY - 10 * 60000), status: 'accepted' } });
  o.sur = await place('thuy', 'giaonhan', { fulfillment: 'delivery', addressId: addr.thuy, answers: [{ question: 'Kích thước đồ (dưới 10kg?)', value: 'Dưới 10kg' }], note: 'Lấy ở cổng sau' });
  await Order.collection.updateOne({ _id: o.sur._id }, { $set: { state: 'confirmed', history: [{ state: 'waiting', at: ago(5 * HOUR) }, { state: 'confirmed', at: ago(4.5 * HOUR) }], surcharge: { amount: 15000, reason: 'Đồ nặng hơn đã chọn (khoảng 14kg)', status: 'pending' } } });
  o.giat = await place('thuy', 'giat', { fulfillment: 'delivery', addressId: addr.thuy, scheduledAt: inDays(1, 9), answers: [{ question: 'Khối lượng ước tính (kg)', value: '5' }] });

  // Người mua khác — để các bài có đánh giá thật
  const doneOrder = async (buyer, post, daysAgo, input = {}) => {
    const x = await place(buyer, post, input);
    await advance(x, 'done', daysAgo);
    return x;
  };
  const comSel = (m) => [{ group: 'Món mặn', choices: [m] }];
  const drink = [{ group: 'Size', choices: ['M'] }, { group: 'Độ ngọt', choices: ['100%'] }];
  const ro = {
    com1: await doneOrder('minh', 'com', 9, { selections: comSel('Gà kho gừng') }),
    com2: await doneOrder('phuong', 'com', 8, { selections: comSel('Cá kho') }),
    com3: await doneOrder('minh', 'com', 6, { selections: comSel('Sườn rim') }),
    pho1: await doneOrder('minh', 'pho', 7),
    pho2: await doneOrder('phuong', 'pho', 5),
    tra1: await doneOrder('minh', 'trasua', 6, { selections: drink }),
    tra2: await doneOrder('phuong', 'trasua', 4, { selections: drink }),
    salad: await doneOrder('phuong', 'salad', 5),
    cafe: await doneOrder('minh', 'cafe', 3, { selections: [{ group: 'Đá', choices: ['Ít đá'] }] }),
    giat: await doneOrder('minh', 'giat', 8, { fulfillment: 'delivery', addressId: addr.minh, scheduledAt: inDays(1, 9), answers: [{ question: 'Khối lượng ước tính (kg)', value: '4' }] }),
    don: await doneOrder('phuong', 'don', 7, { fulfillment: 'delivery', addressId: addr.phuong, scheduledAt: inDays(1, 9) }),
  };

  /* ---------- Đánh giá (kèm phản hồi của người bán ở vài cái) ---------- */
  const review = async (order, reviewer, rating, comment, daysAgo, reply) => {
    const r = await Review.create({
      reviewer: u[reviewer]._id, target: order.seller, targetType: 'order', targetId: order._id, post: order.post,
      rating, comment, ...(reply ? { reply: { text: reply, at: ago((daysAgo - 0.2) * DAY) } } : {}),
    });
    await backdate(Review, r._id, ago(daysAgo * DAY));
    await Order.updateOne({ _id: order._id }, { reviewed: true });
  };
  await review(ro.com1, 'minh', 5, 'Cơm ngon, gà kho thấm vị, giao đúng giờ.', 8, 'Cảm ơn bạn Minh nhé, hôm nào cô nấu món mới sẽ báo.');
  await review(ro.com2, 'phuong', 4, 'Cá kho đậm đà, hơi nhiều muối một chút.', 7);
  await review(ro.com3, 'minh', 5, 'Sườn rim mềm, phần ăn đầy đặn.', 5);
  await review(ro.pho1, 'minh', 5, 'Nước dùng ngọt thanh, thịt bò mềm.', 6);
  await review(ro.pho2, 'phuong', 4, 'Ngon nhưng đến hơi nguội một chút.', 4, 'Cảm ơn góp ý, quán sẽ đóng gói giữ nhiệt tốt hơn.');
  await review(ro.tra1, 'minh', 5, 'Trân châu dẻo, đường đen thơm.', 5);
  await review(ro.tra2, 'phuong', 3, 'Hơi ngọt so với 100%, lần sau mình chọn 50%.', 3);
  await review(ro.salad, 'phuong', 4, 'Rau tươi, ức gà không bị khô.', 4);
  await review(ro.cafe, 'minh', 5, 'Cà phê đậm, pha đúng gu mình.', 2);
  await review(ro.giat, 'minh', 5, 'Lấy và trả đúng hẹn, quần áo thơm và gấp gọn.', 7, 'Cảm ơn anh Minh đã tin tưởng ạ.');
  await review(ro.don, 'phuong', 3, 'Dọn sạch nhưng đến trễ 20 phút.', 6);
  await review(o.rau, 'thuy', 5, 'Rau tươi, nhiều hơn mình nghĩ, sẽ đặt lại.', 4); // đơn phở của Thủy để chưa đánh giá, để thử luồng đánh giá

  /* ---------- Đề nghị nhận việc ---------- */
  // tạo qua service (kiểm tra luật thật), sau đó dựng lại lịch sử theo trạng thái mong muốn: steps = [[state, số giờ trước]]
  const offer = async (worker, job, intro, steps) => {
    const x = await offers.create(u[worker], String(j[job]._id), { intro, slots: [] });
    const history = steps.map(([state, hoursAgo]) => ({ state, at: new Date(Date.now() - hoursAgo * HOUR) }));
    const set = { state: steps[steps.length - 1][0], history, createdAt: history[0].at, updatedAt: history[history.length - 1].at };
    const reported = history.find((h) => h.state === 'reported');
    if (reported) set.report = { note: 'Đã làm xong, mình chụp ảnh gửi qua tin nhắn.', images: [], at: reported.at };
    await Offer.collection.updateOne({ _id: x._id }, { $set: set });
    return x;
  };
  const f = {};
  // Thủy — đủ các bước để thử trang Việc đã nhận
  f.don = await offer('thuy', 'donPhong', 'Mình ở cùng block, đã dọn nhà nhiều lần, có thể tới sớm.', [['offered', 5]]);
  f.meo = await offer('thuy', 'meo', 'Mình nuôi mèo ở nhà nên quen cách chăm, rảnh cả tuần.', [['offered', 30], ['chosen', 26], ['working', 3]]);
  f.thung = await offer('thuy', 'thung', 'Mình có xe đẩy riêng, chuyển được ngay tối nay.', [['offered', 80], ['chosen', 76], ['working', 74], ['reported', 72], ['done', 70]]);
  f.com = await offer('thuy', 'comCong', 'Mình hay đi qua cổng sau, lấy giúp được.', [['offered', 4], ['withdrawn', 3]]);
  f.tuoi = await offer('thuy', 'tuoiCay', 'Mình có kinh nghiệm chăm cây, tưới đúng liều.', [['offered', 40], ['chosen', 36], ['working', 30], ['reported', 6]]);
  await Offer.collection.updateOne({ _id: f.thung._id }, { $set: { paidAt: ago(69 * HOUR) } });

  // Người khác nhận việc — để các việc có "n đề nghị" thật
  await offer('minh', 'comCong', 'Mình ở tầng 3, xuống lấy hộ được liền.', [['offered', 3]]);
  await offer('phuong', 'comCong', 'Mình rảnh buổi trưa.', [['offered', 2]]);
  await offer('minh', 'donPhong', 'Mình dọn nhà nhanh, có dụng cụ riêng.', [['offered', 6]]);
  await offer('phuong', 'donPhong', 'Mình nhận được, có thể đi cùng bạn để dọn nhanh hơn.', [['offered', 4]]);
  await offer('minh', 'meo', 'Mình ở tầng dưới, qua cho mèo ăn tiện.', [['offered', 28], ['rejected', 26]]);
  await offer('minh', 'toan', 'Mình dạy Toán cấp 2 hai năm, có giáo án.', [['offered', 20]]);
  await offer('minh', 'tuLanh', 'Mình khiêng được, rủ thêm một bạn nữa.', [['offered', 12]]);
  await offer('phuong', 'tuLanh', 'Mình đi cùng bạn, khỏe, có dây chằng.', [['offered', 10]]);

  // trạng thái việc khớp với các đề nghị ở trên
  await Job.updateMany({ _id: { $in: [j.meo._id, j.tuoiCay._id, j.thung._id] } }, { status: 'closed' });
  await Job.updateOne({ _id: j.thung._id }, { status: 'done' });
  for (const job of Object.values(j)) await offers.syncOfferCount(job._id);

  /* ---------- Hỏi đáp công khai ---------- */
  const qa = async (job, author, text, hoursAgo, answerBy, answerText) => {
    const q = await Question.create({ job: j[job]._id, author: u[author]._id, text });
    await backdate(Question, q._id, ago(hoursAgo * HOUR));
    if (answerText) await Question.collection.updateOne({ _id: q._id }, { $set: { answer: { text: answerText, by: u[answerBy]._id, at: ago((hoursAgo - 1) * HOUR) } } });
  };
  await qa('comCong', 'minh', 'Cổng sau có bảo vệ không, mình cần nói gì không?', 3, 'ha', 'Có, bạn nói lấy cơm hộ căn B-0203 là được.');
  await qa('comCong', 'phuong', 'Phần cơm khoảng bao nhiêu kg vậy ạ?', 2, 'ha', 'Một túi nhỏ, dưới 1kg thôi bạn.');
  await qa('donPhong', 'minh', 'Có cần mang theo máy hút bụi không ạ?', 5); // chưa có trả lời
  await qa('toan', 'phuong', 'Bé học trường nào để mình chuẩn bị giáo án?', 18, 'khoa', 'Bé học lớp 8 chương trình chuẩn, ôn hình học là chính.');

  /* ---------- Đã lưu ---------- */
  const save = async (user, target, model, type, ms) => {
    const s = await Saved.create({ user: u[user]._id, targetId: target._id, targetModel: model, type });
    await backdate(Saved, s._id, ago(ms));
  };
  await save('thuy', p.pho, 'Post', 'food', 3 * DAY);
  await save('thuy', p.trasua, 'Post', 'food', 2 * DAY);
  await save('thuy', p.taiNghe, 'Post', 'goods', DAY);
  await save('thuy', p.giat, 'Post', 'service', DAY / 2);
  await save('thuy', j.tuoiCay, 'Job', 'job', DAY / 3);
  await save('minh', p.pho, 'Post', 'food', DAY);
  await save('minh', p.com, 'Post', 'food', DAY / 2);

  /* ---------- Tin nhắn ---------- */
  // lines: [người gửi, nội dung, số phút trước]; tin của người kia gửi sau cùng chưa được `a` đọc nếu unreadLast
  const chat = async (a, b, context, lines, unreadLast = false) => {
    const c = await Conversation.create({ participants: [u[a]._id, u[b]._id], context });
    let last;
    for (const [i, [who, text, minsAgo]] of lines.entries()) {
      const sender = u[who]._id;
      const other = who === a ? u[b]._id : u[a]._id;
      const isLast = i === lines.length - 1;
      const readBy = isLast && unreadLast ? [sender] : [sender, other];
      const m = await Message.create({ conversation: c._id, sender, text, readBy });
      await backdate(Message, m._id, ago(minsAgo * 60000));
      last = { text, at: ago(minsAgo * 60000), sender };
    }
    await Conversation.collection.updateOne({ _id: c._id }, { $set: { lastMessage: last, updatedAt: last.at } });
  };
  await chat('thuy', 'lan', { type: 'order', id: o.wait._id }, [
    ['thuy', 'Cô ơi, đơn cơm hôm nay mình lấy ít cay ạ.', 40], ['lan', 'Ok con, cô ghi chú rồi nhé.', 35], ['lan', 'Khoảng 20 phút nữa cô giao tới.', 5],
  ], true); // 1 tin chưa đọc
  await chat('thuy', 'ha', { type: 'job', id: j.comCong._id }, [
    ['thuy', 'Chào chị, em hỏi việc lấy cơm cổng sau còn nhận không ạ?', 200], ['ha', 'Còn em, chị đang chờ người đề nghị.', 190], ['thuy', 'Dạ em sẽ cân nhắc rồi báo chị.', 185],
  ]);

  /* ---------- Thông báo ---------- */
  const note = async (user, type, title, body, link, hoursAgo, read = false) => {
    const n = await Notification.create({ user: u[user]._id, type, title, body, link, read });
    await backdate(Notification, n._id, ago(hoursAgo * HOUR));
  };
  await note('thuy', 'order_state', `Đơn ${o.deliver.code} đang được giao`, 'Trà sữa trân châu đường đen', { type: 'order', id: o.deliver._id }, 0.5);
  await note('thuy', 'order_surcharge', `Đơn ${o.sur.code} có phụ thu, cần bạn đồng ý`, 'Đồ nặng hơn đã chọn', { type: 'order', id: o.sur._id }, 4);
  await note('thuy', 'offer_chosen', 'Bạn được chọn làm việc', 'Cho mèo ăn 3 ngày khi đi vắng', { type: 'offer', id: f.meo._id }, 26, true);
  await note('thuy', 'offer_done', 'Việc đã được xác nhận hoàn thành', 'Chuyển 2 thùng đồ sang Block A', { type: 'offer', id: f.thung._id }, 70, true);

  /* ---------- Báo cáo + nhật ký admin (dữ liệu mẫu cho trang Quản trị) ---------- */
  const report = async (reporter, targetType, target, reason, detail, state, daysAgo, adminNote) => {
    const at = ago(daysAgo * DAY);
    const history = [{ state: 'open', at }];
    if (state !== 'open') history.push({ state: 'reviewing', at: new Date(at.getTime() + 2 * HOUR) });
    if (['resolved', 'rejected'].includes(state)) history.push({ state, at: new Date(at.getTime() + 6 * HOUR), note: adminNote });
    const r = await Report.create({ reporter: u[reporter]._id, targetType, targetId: target._id, reason, detail, state, history, adminNote: adminNote || '', ...(state !== 'open' ? { handledBy: u.admin._id } : {}) });
    await backdate(Report, r._id, at);
    return r;
  };
  await report('thuy', 'order', o.pho, 'quality', 'Phở giao tới bị nguội và thiếu hành, mình muốn phản ánh.', 'open', 1);
  const resolved = await report('minh', 'post', p.vipham, 'abuse', 'Bài yêu cầu chuyển khoản trước rồi mới gặp, nghi ngờ lừa đảo.', 'resolved', 12, 'Đã gỡ bài và khóa tài khoản đăng bài.');
  await report('phuong', 'user', u.vp, 'abuse', 'Người này nhắn tin mời mua hàng rồi yêu cầu cọc tiền.', 'reviewing', 2);
  const audit = async (action, targetType, target, note, daysAgo) => {
    const a = await AuditLog.create({ actor: u.admin._id, action, targetType, targetId: target._id, note });
    await AuditLog.collection.updateOne({ _id: a._id }, { $set: { at: ago(daysAgo * DAY) } }); // audit dùng trường `at`
  };
  await audit('post.hide', 'post', p.vipham, 'Yêu cầu chuyển khoản trước, nghi ngờ lừa đảo', 12);
  await audit('user.lock', 'user', u.vp, 'Đăng tin lừa đảo', 12);
  await audit('report.reviewing', 'report', resolved, '', 12);
  await audit('report.resolved', 'report', resolved, 'Đã gỡ bài và khóa tài khoản đăng bài.', 12);

  const n = (M) => M.countDocuments({});
  return {
    users: await n(User), posts: await n(Post), jobs: await n(Job), orders: await n(Order), offers: await n(Offer),
    reviews: await n(Review), questions: await n(Question), conversations: await n(Conversation),
    notifications: await n(Notification), reports: await n(Report), addresses: await n(Address), saved: await n(Saved),
  };
}

module.exports = seed;

if (require.main === module) {
  const { connectDb } = require('../config/db');
  const mongoose = require('mongoose');
  connectDb().then(seed).then((r) => { console.log('Seed xong:', r); return mongoose.disconnect(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
