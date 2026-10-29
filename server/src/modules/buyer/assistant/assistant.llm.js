const ApiError = require('../../../utils/ApiError');

/**
 * Trợ lý chạy bằng bất kỳ nhà cung cấp theo chuẩn "OpenAI chat completions" (Groq, OpenRouter, Mistral, Together…).
 * Cấu hình bằng 3 biến trong server/.env — đổi nhà cung cấp không cần sửa code:
 *   LLM_BASE_URL  (mặc định https://api.groq.com/openai/v1)
 *   LLM_API_KEY
 *   LLM_MODEL     (mặc định openai/gpt-oss-120b — tên model đổi theo từng nhà cung cấp)
 * Mô hình tự gọi công cụ `search_catalog` để tìm bài đăng thật rồi tư vấn, giống bản Gemini.
 */
const BASE = () => (process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
const MODEL = () => process.env.LLM_MODEL || 'openai/gpt-oss-120b';
const KEY = () => process.env.LLM_API_KEY;
// Gói miễn phí giới hạn token theo TỪNG model mỗi phút; hết hạn mức ở model chính thì thử model dự phòng (cách nhau bằng dấu phẩy)
const MODELS = () => [MODEL(), ...(process.env.LLM_FALLBACK_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean)];
const MAX_TOOL_ROUNDS = 5;
const TIMEOUT_MS = 25000;

let injectedFetch = null;
/** Cho test thay fetch bằng bản giả. */
const setFetch = (f) => { injectedFetch = f; };
const hasKey = () => !!KEY();

async function callOne(body) {
  const f = injectedFetch || fetch;
  let res;
  try {
    res = await f(`${BASE()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY()}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error('[assistant] LLM không kết nối được:', e.name);
    throw new ApiError(502, 'ASSISTANT_ERROR', 'Trợ lý tạm thời không phản hồi');
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[assistant] LLM lỗi', res.status, detail.slice(0, 200)); // chỉ ghi log, không trả về cho người dùng
    // 429/503 = bận hoặc hết hạn mức; 400 tool_use_failed = mô hình sinh sai cú pháp gọi công cụ → cũng thử model dự phòng
    const busy = res.status === 429 || res.status === 503 || (res.status === 400 && detail.includes('tool_use_failed'));
    throw new ApiError(busy ? 503 : 502, 'ASSISTANT_ERROR', busy ? 'Trợ lý đang bận, thử lại sau ít phút' : 'Trợ lý tạm thời không phản hồi');
  }
  return res.json();
}

/** Gọi model chính; bận/hết hạn mức (429, 503) thì chuyển sang model dự phòng kế tiếp. */
async function call(body) {
  let last;
  for (const model of MODELS()) {
    try {
      // mô hình gpt-oss có "suy luận": mức thấp đủ cho tư vấn món và tiết kiệm nhiều token (hạn mức 8.000 token/phút)
      return await callOne({ ...body, model, ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}) });
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 503) throw e;
      last = e;
    }
  }
  throw last;
}

const safeJson = (s) => { try { const v = JSON.parse(s || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };

/** deps: { system, tools, runSearch } lấy từ assistant.service. */
async function chat({ messages, user }, deps) {
  if (!hasKey()) throw new ApiError(503, 'ASSISTANT_UNAVAILABLE', 'Trợ lý chưa được cấu hình');
  const known = user && user.area ? `\nNgười dùng đang ở Block ${user.area}.` : '';
  const convo = [{ role: 'system', content: deps.system + known }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const tools = deps.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  const cards = new Map();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await call({ messages: convo, tools, tool_choice: round === MAX_TOOL_ROUNDS - 1 ? 'none' : 'auto', max_tokens: 700, temperature: 0.4 });
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) return { reply: 'Mình chưa thể hỗ trợ câu này. Bạn thử hỏi về món ăn, đồ dùng, dịch vụ hoặc việc làm trong khu nhé.', cards: [...cards.values()].slice(0, 8) };

    const calls = msg.tool_calls || [];
    if (!calls.length) {
      const reply = String(msg.content || '').trim();
      return { reply: reply || 'Mình chưa tìm được gợi ý phù hợp, bạn mô tả rõ hơn giúp mình nhé.', cards: [...cards.values()].slice(0, 8) };
    }
    convo.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
    for (const tc of calls) {
      let content;
      try {
        const out = await deps.runTool(tc.function && tc.function.name, safeJson(tc.function && tc.function.arguments));
        out.cards.forEach((c) => cards.set(c.id, c));
        content = out.text;
      } catch (e) {
        console.error('[assistant] công cụ lỗi', tc.function && tc.function.name, e.message);
        content = 'Không thực hiện được lúc này';
      }
      convo.push({ role: 'tool', tool_call_id: tc.id, content });
    }
  }
  return { reply: 'Mình tìm hơi nhiều lần mà chưa chốt được, bạn nói rõ hơn món hoặc ngân sách giúp mình nhé.', cards: [...cards.values()].slice(0, 8) };
}

module.exports = { chat, setFetch, hasKey };
