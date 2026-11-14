const crypto = require('crypto');
const ApiError = require('../../../utils/ApiError');
const { XuEntry, XuVoucher, VoucherDefinition } = require('./xu.model');

// Luật chống gian lận do server quyết định, FE gửi gì cũng không vượt được (CẦN CHỐT: decisions.md F10)
const GAME = { id: 'hai-xu', maxPlays: 3, dailyCap: 30, maxScore: 80, scorePerXu: 8 };
const WELCOME_XU = 30;
const VOUCHER_DAYS = 30;
const CATALOG = [
  { cid: 'v10', title: 'Giảm 10.000đ', cond: 'Đơn từ 50.000đ', amount: 10000, min: 50000, cost: 20 },
  { cid: 'v20', title: 'Giảm 20.000đ', cond: 'Đơn từ 150.000đ', amount: 20000, min: 150000, cost: 50 },
  { cid: 'ship', title: 'Miễn phí giao trong khu', cond: 'Đơn đồ ăn có giao tận cửa', ship: true, min: 0, cost: 30 },
];

// Danh mục voucher: admin sửa trong DB; chưa có dòng nào thì dùng bộ mặc định ở trên
const pub = (d) => ({ cid: d.cid, title: d.title, cond: d.cond, amount: d.amount || undefined, min: d.min, ship: d.ship || undefined, cost: d.cost });
async function catalog({ all = false } = {}) {
  const rows = await VoucherDefinition.find(all ? {} : { active: true }).sort({ cost: 1, createdAt: 1 });
  if (rows.length || (await VoucherDefinition.exists({}))) return rows.map(pub);
  return CATALOG;
}
// Tìm định nghĩa theo cid, kể cả loại đã tắt (voucher đã đổi vẫn phải dùng được)
async function defOf(cid) {
  return (await VoucherDefinition.findOne({ cid })) || CATALOG.find((c) => c.cid === cid);
}

// Ngày theo giờ Việt Nam (UTC+7)
const today = (now = Date.now()) => new Date(now + 7 * 3600e3).toISOString().slice(0, 10);

async function balance(userId) {
  const [r] = await XuEntry.aggregate([{ $match: { user: userId } }, { $group: { _id: null, sum: { $sum: '$delta' } } }]);
  return r ? r.sum : 0;
}

async function gameState(userId, day = today()) {
  const rows = await XuEntry.find({ user: userId, kind: 'game', day }).select('delta');
  const earned = rows.reduce((n, r) => n + r.delta, 0);
  return { plays: rows.length, playsLeft: Math.max(0, GAME.maxPlays - rows.length), capLeft: Math.max(0, GAME.dailyCap - earned) };
}

// Chỉ mục duy nhất (user, key) được Mongoose tạo bất đồng bộ lúc khởi động; đợi nó xong rồi mới ghi sổ,
// kẻo hai lần ghi sớm có thể cùng lọt qua và cộng đôi Xu chào mừng
const indexesReady = XuEntry.init().catch(() => undefined);

// Ghi một dòng; trùng key thì bỏ qua (idempotent)
async function addEntry(userId, data) {
  await indexesReady;
  try { return await XuEntry.create({ user: userId, ...data }); }
  catch (e) { if (e.code === 11000) return null; throw e; }
}

async function overview(userId) {
  await addEntry(userId, { delta: WELCOME_XU, title: 'Tạo tài khoản', kind: 'welcome', key: 'welcome' });
  const [bal, ledger, vouchers, g] = await Promise.all([
    balance(userId),
    XuEntry.find({ user: userId }).sort({ createdAt: -1 }).limit(100),
    XuVoucher.find({ user: userId }).sort({ createdAt: -1 }),
    gameState(userId),
  ]);
  const now = Date.now();
  return {
    balance: bal,
    ledger: ledger.map((e) => ({ id: e._id, delta: e.delta, title: e.title, kind: e.kind, at: e.createdAt })),
    vouchers: await Promise.all(vouchers.map(async (v) => {
      const def = (await defOf(v.cid)) || {};
      return {
        id: v._id, cid: v.cid, code: v.code, title: def.title, cond: def.cond, expiresAt: v.expiresAt,
        status: v.usedAt ? 'used' : v.expiresAt.getTime() < now ? 'expired' : 'active',
      };
    })),
    catalog: await catalog(),
    game: { id: GAME.id, playsLeft: g.playsLeft, capLeft: g.capLeft, maxPlays: GAME.maxPlays, dailyCap: GAME.dailyCap },
  };
}

async function playGame(userId, game, score) {
  if (game !== GAME.id) throw ApiError.validation('Game không tồn tại', [{ field: 'game', message: 'Chỉ hỗ trợ "hai-xu"' }]);
  if (score > GAME.maxScore) throw ApiError.validation('Điểm không hợp lệ', [{ field: 'score', message: `Điểm tối đa mỗi lượt là ${GAME.maxScore}` }]);
  const day = today();
  const s = await gameState(userId, day);
  if (s.playsLeft <= 0) throw new ApiError(429, 'GAME_LIMIT', `Hôm nay bạn đã chơi đủ ${GAME.maxPlays} lượt, mai quay lại nhé`);
  if (s.capLeft <= 0) throw new ApiError(429, 'GAME_LIMIT', `Hôm nay bạn đã nhận đủ ${GAME.dailyCap} Xu từ trò chơi`);
  const granted = Math.min(Math.floor(score / GAME.scorePerXu), s.capLeft);
  // key theo số thứ tự lượt: hai yêu cầu đồng thời cùng lượt sẽ đụng unique index, chỉ một cái được ghi
  const row = await addEntry(userId, { delta: granted, title: 'Chơi Hái xu', kind: 'game', key: `game:${GAME.id}:${day}:${s.plays + 1}`, day });
  if (!row) throw new ApiError(429, 'GAME_LIMIT', 'Lượt chơi bị trùng, thử lại sau giây lát');
  return { granted, capLeft: s.capLeft - granted, playsLeft: s.playsLeft - 1, balance: await balance(userId) };
}

async function redeem(userId, cid) {
  const def = (await catalog()).find((c) => c.cid === cid);
  if (!def) throw ApiError.notFound('Voucher không tồn tại');
  await overview(userId); // bảo đảm đã có Xu chào mừng
  if ((await balance(userId)) < def.cost) throw ApiError.invalidState('Bạn chưa đủ Xu để đổi voucher này');
  const code = 'XU-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const row = await addEntry(userId, { delta: -def.cost, title: 'Đổi voucher ' + def.title, kind: 'redeem', key: 'redeem:' + code });
  // trừ trước rồi kiểm lại: hai lần đổi chạy song song làm số dư âm thì hoàn tác lần này
  if ((await balance(userId)) < 0) { await row.deleteOne(); throw ApiError.invalidState('Bạn chưa đủ Xu để đổi voucher này'); }
  const v = await XuVoucher.create({ user: userId, cid, code, expiresAt: new Date(Date.now() + VOUCHER_DAYS * 864e5) });
  return { id: v._id, cid, code, title: def.title, expiresAt: v.expiresAt, balance: await balance(userId) };
}

const XU_CODE = /^XU-[0-9A-F]{6}$/;
const EARN = { order: { xu: 10, minTotal: 30000, perDay: 3, title: 'Hoàn thành đơn đã đặt' }, review: { xu: 5, title: 'Đánh giá có nhận xét' }, job: { xu: 15, title: 'Hoàn thành việc đã nhận' } };

// Cộng Xu theo sự kiện nghiệp vụ. `key` gắn với đơn/đánh giá/đề nghị nên mỗi sự kiện chỉ cộng một lần dù gọi lại.
// Lỗi ở đây không được làm hỏng nghiệp vụ chính (đổi trạng thái đơn, đăng đánh giá) nên chỉ ghi log.
async function award(userId, kind, refId, ctx = {}) {
  try {
    const rule = EARN[kind];
    if (!rule) return null;
    if (kind === 'order') {
      if ((ctx.total || 0) < rule.minTotal) return null;
      const day = today();
      if ((await XuEntry.countDocuments({ user: userId, kind: 'order', day })) >= rule.perDay) return null;
      return await addEntry(userId, { delta: rule.xu, title: rule.title, kind, key: `order:${refId}`, day });
    }
    return await addEntry(userId, { delta: rule.xu, title: rule.title, kind, key: `${kind}:${refId}`, day: today() });
  } catch (e) { console.error('Không cộng được Xu:', e.message); return null; }
}

// Đơn được hoàn tiền hết (hoặc trả lại hàng) thì thu lại Xu đã cộng cho đơn đó; không có Xu để thu thì bỏ qua
async function revokeOrder(userId, orderId, code) {
  try {
    const got = await XuEntry.findOne({ user: userId, key: `order:${orderId}`, delta: { $gt: 0 } });
    if (!got) return null;
    return await addEntry(userId, { delta: -got.delta, title: `Thu lại Xu · đơn ${code} được hoàn tiền`, kind: 'other', key: `revoke:order:${orderId}`, day: today() });
  } catch (e) { if (e.code !== 11000) console.error('Không thu lại được Xu:', e.message); return null; }
}

// Voucher của chính người dùng, còn hạn, chưa dùng; trả { doc, def } hoặc null
async function findVoucher(userId, code) {
  if (!code || !XU_CODE.test(String(code).toUpperCase())) return null;
  const doc = await XuVoucher.findOne({ user: userId, code: String(code).toUpperCase(), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  return doc ? { doc, def: await defOf(doc.cid) } : null;
}
// Đánh dấu đã dùng nguyên tử (hai đơn cùng lúc không dùng được một voucher hai lần)
const claimVoucher = (doc) => XuVoucher.findOneAndUpdate({ _id: doc._id, usedAt: { $exists: false } }, { usedAt: new Date() });
// Đơn bị hủy/từ chối thì trả lại voucher
const restoreVoucher = (userId, code) => (code && XU_CODE.test(code) ? XuVoucher.updateOne({ user: userId, code }, { $unset: { usedAt: 1 } }) : null);

// Admin cộng/trừ Xu thủ công (kèm lý do, mỗi lần một dòng riêng trong sổ)
async function adjust(userId, delta, title) {
  await indexesReady;
  return XuEntry.create({ user: userId, delta, title, kind: 'other', key: `admin:${Date.now()}:${crypto.randomBytes(3).toString('hex')}`, day: today() });
}

module.exports = { adjust, catalog, defOf, overview, playGame, redeem, balance, award, revokeOrder, findVoucher, claimVoucher, restoreVoucher, XU_CODE, GAME, CATALOG, today };
