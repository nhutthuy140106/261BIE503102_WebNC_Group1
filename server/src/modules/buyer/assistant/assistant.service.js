const ApiError = require('../../../utils/ApiError');
const catalog = require('../catalog/catalog.service');
const local = require('./assistant.local');
const gemini = require('./assistant.gemini');
const llm = require('./assistant.llm');
const tools = require('./assistant.tools');

/**
 * Trợ lý tư vấn món/đồ/dịch vụ/việc làm của AntGo.
 *  - Có GEMINI_API_KEY: chạy bằng Google Gemini (gói miễn phí). Mô hình KHÔNG tự bịa bài: nó gọi công cụ `search_catalog`
 *    để tìm trong kho bài đăng thật rồi tư vấn dựa trên kết quả.
 *  - Không có khóa, hoặc Gemini lỗi/bận: tự chuyển sang bộ trả lời cơ bản (assistant.local.js) — miễn phí, luôn chạy được.
 * Server trả kèm danh sách thẻ bài (cards) để giao diện hiện nút bấm mở bài.
 *
 * ASSISTANT_MODE: auto (mặc định) | gemini | llm (bắt buộc nhà đó, lỗi thì báo lỗi) | local (chỉ dùng bộ cơ bản).
 * `llm` = nhà cung cấp theo chuẩn OpenAI chat completions (Groq, OpenRouter, Mistral…), cấu hình bằng LLM_BASE_URL/LLM_API_KEY/LLM_MODEL.
 */
const MODE = () => (process.env.ASSISTANT_MODE || 'auto').toLowerCase();

const SYSTEM = `Bạn là trợ lý của AntGo — ứng dụng kết nối hàng xóm trong khu: đặt món ăn/đồ uống, mua đồ dùng, thuê dịch vụ và nhận việc vặt.

Nhiệm vụ: giúp người dùng chọn món ăn, đồ dùng, dịch vụ hoặc việc làm phù hợp CHỈ từ các bài đang có trên AntGo.
- Luôn gọi công cụ search_catalog để tìm bài trước khi gợi ý; không bịa món, giá hay người bán. Hỏi về đơn của họ thì gọi my_orders; khi họ phân vân chưa biết ăn gì và nhờ chọn hộ thì gọi pick_dish. Không có kết quả thì nói thật và gợi ý đổi từ khóa hoặc bỏ bớt điều kiện.
- Trả lời tiếng Việt, thân thiện, ngắn gọn (tối đa khoảng 4 câu). Nêu tên món, giá (đồng) và tên người bán/người đăng; chọn tối đa 4 bài hợp nhất. Bài đầy đủ sẽ hiện thành thẻ bấm được bên dưới câu trả lời, nên không cần chép lại mô tả dài.
- Câu hỏi mơ hồ ("ăn gì?") thì có thể hỏi lại một ý ngắn (ngân sách, món nước hay khô, bữa nào) hoặc tự gợi ý vài lựa chọn phổ biến.
- Chỉ tư vấn trong phạm vi AntGo. Nếu hỏi chuyện ngoài lề, trả lời rất ngắn cho lịch sự rồi dẫn lại việc bạn giúp được.
- Không hỏi hay lưu số điện thoại, địa chỉ nhà, mật khẩu. Việc đặt hàng, thanh toán do người dùng tự bấm vào bài; bạn không đặt thay.`;

const TOOLS = [
  {
    name: 'search_catalog',
    description:
      'Tìm bài đang mở trên AntGo (đồ ăn & uống, đồ dùng, dịch vụ, việc làm). Dùng từ khóa tiếng Việt ngắn gọn (tên món, nguyên liệu, loại dịch vụ). ' +
      'Có thể bỏ trống q để xem bài mới. Trả về danh sách bài kèm giá, người bán và khu.',
    input_schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Từ khóa, ví dụ "cơm gà", "trà sữa", "giặt sấy", "dắt chó". Có thể bỏ trống.' },
        type: { type: 'string', enum: ['food', 'goods', 'service', 'job'], description: 'food=đồ ăn & uống, goods=đồ dùng, service=dịch vụ, job=việc làm. Bỏ trống để tìm cả bài và việc.' },
        min_price: { type: 'integer', description: 'Giá thấp nhất (đồng). Chỉ áp dụng cho food/goods/service.' },
        max_price: { type: 'integer', description: 'Giá cao nhất (đồng), ví dụ 50000. Chỉ áp dụng cho food/goods/service.' },
        area: { type: 'string', enum: ['A', 'B', 'C', 'D'], description: 'Block ưu tiên; bỏ trống để tìm toàn khu.' },
        limit: { type: 'integer', description: 'Số kết quả tối đa (1-8), mặc định 6.' },
      },
    },
  },
  {
    name: 'my_orders',
    description: 'Xem đơn hàng của chính người đang chat (mã đơn, món, tiền, trạng thái). Dùng khi họ hỏi "đơn của tôi", "đơn đến đâu rồi".',
    input_schema: {
      type: 'object',
      properties: { state: { type: 'string', enum: ['active', 'history', 'all'], description: 'active=đang diễn ra (mặc định), history=đã kết thúc, all=tất cả.' } },
    },
  },
  {
    name: 'pick_dish',
    description: 'Chọn ngẫu nhiên MỘT món ăn/đồ uống trong ngân sách cho người chưa biết ăn gì ("chọn giúp tôi", "quay món"). Có thể kèm từ khóa và giá tối đa.',
    input_schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Từ khóa tùy chọn, ví dụ "bún", "trà sữa".' },
        max_price: { type: 'integer', description: 'Giá cao nhất (đồng).' },
        min_price: { type: 'integer', description: 'Giá thấp nhất (đồng).' },
        area: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
      },
    },
  },
];

const { shortCard } = tools;

/** Chạy công cụ search_catalog; trả { text cho mô hình, cards cho giao diện }. Đầu vào do mô hình sinh nên luôn kiểm tra lại. */
async function runSearch(input) {
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 80) : undefined;
  const lim = Number(input.limit);
  const limit = Math.min(8, Math.max(1, Number.isInteger(lim) ? lim : 6));
  const area = ['A', 'B', 'C', 'D'].includes(input.area) ? input.area : undefined;
  const type = ['food', 'goods', 'service', 'job'].includes(input.type) ? input.type : undefined;
  const int = (v) => (v !== undefined && v !== null && Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : undefined);
  const min = int(input.min_price);
  const max = int(input.max_price);

  let posts = [];
  let jobs = [];
  if (type === 'job') {
    jobs = (await catalog.listJobs({ q, area, limit })).items;
  } else if (type) {
    posts = (await catalog.listPosts({ q, type, area, limit, minPrice: min, maxPrice: max, sort: 'price' })).items;
  } else {
    const r = await catalog.search({ q, area, limit });
    posts = r.posts; jobs = r.jobs;
    if (min !== undefined || max !== undefined) posts = posts.filter((p) => (min === undefined || p.price >= min) && (max === undefined || p.price <= max));
  }
  const cards = [...posts.map((p) => shortCard(p.type, p)), ...jobs.map((j) => shortCard('job', j))].slice(0, limit);
  const text = cards.length
    ? JSON.stringify(cards.map((c) => ({ id: c.id, loai: c.kind, ten: c.title, gia: c.price, don_vi: c.unit, nguoi_ban: c.sellerName, khu: c.area })))
    : 'Không có bài nào khớp điều kiện.';
  return { text, cards };
}

/** Điểm vào duy nhất cho mô hình gọi công cụ. Tên/đầu vào do mô hình sinh nên luôn qua kiểm tra. */
async function runTool(name, input, user) {
  const args = input && typeof input === 'object' ? input : {};
  if (name === 'search_catalog') return runSearch(args);
  if (name === 'my_orders') return tools.myOrders(user, ['active', 'history', 'all'].includes(args.state) ? args.state : 'active');
  if (name === 'pick_dish') return tools.pickDish(args);
  throw new Error('Công cụ không tồn tại');
}

/**
 * messages: [{role:'user'|'assistant', content:string}] — lịch sử gọn do giao diện gửi (đã kiểm tra độ dài).
 * Trả { reply, cards, engine: 'gemini' | 'llm' | 'local' }.
 */
async function chat({ messages, user }) {
  const mode = MODE();
  const lastUser = messages[messages.length - 1].content;
  const prevUser = [...messages].slice(0, -1).reverse().find((m) => m.role === 'user');
  const localAnswer = local.answer(lastUser, prevUser && prevUser.content, user);
  const useLocal = () => localAnswer.then(({ confident, ...r }) => ({ ...r, engine: 'local' }));

  if (mode === 'local') return useLocal();
  // Lai: câu quen thuộc (chào hỏi, đơn của tôi, chọn giúp, tìm món khớp rõ) → bộ luật trả ngay, nhanh và không tốn lượt AI;
  // câu lạ / gõ sai / mơ hồ → nhờ AI (Gemini → Groq). Chế độ gemini hoặc llm vẫn bắt buộc dùng AI.
  if (mode === 'auto' && (await localAnswer).confident) return useLocal();

  // Thứ tự ưu tiên: Gemini → LLM kiểu OpenAI (Groq/OpenRouter…) → bộ cơ bản.
  // Chế độ cố định (gemini | llm) thì lỗi báo thẳng; auto thì rơi xuống bước sau.
  const deps = { system: SYSTEM, tools: TOOLS, runTool: (name, input) => runTool(name, input, user) };
  const providers = [];
  if ((mode === 'auto' || mode === 'gemini') && gemini.hasKey()) providers.push({ name: 'gemini', run: () => gemini.chat({ messages, user }, deps) });
  if ((mode === 'auto' || mode === 'llm') && llm.hasKey()) providers.push({ name: 'llm', run: () => llm.chat({ messages, user }, deps) });
  if (!providers.length) {
    if (mode === 'auto') return useLocal();
    const need = mode === 'gemini' ? 'GEMINI_API_KEY' : 'LLM_API_KEY';
    throw new ApiError(503, 'ASSISTANT_UNAVAILABLE', `Trợ lý chưa được cấu hình (thiếu ${need} trên máy chủ)`);
  }
  for (const p of providers) {
    try {
      return { ...(await p.run()), engine: p.name };
    } catch (e) {
      if (!(e instanceof ApiError) || e.code === 'VALIDATION_ERROR' || mode !== 'auto') throw e;
      // auto: thử nhà cung cấp kế tiếp, cuối cùng là bộ cơ bản
    }
  }
  return useLocal();
}

module.exports = { chat, setGeminiFetch: gemini.setFetch, setLlmFetch: llm.setFetch, SYSTEM, TOOLS };
