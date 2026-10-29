const ApiError = require('../../../utils/ApiError');

/**
 * Trợ lý chạy bằng Google Gemini (có gói miễn phí). Gọi REST trực tiếp, không cần thêm thư viện.
 * Model tự gọi công cụ `search_catalog` để tìm bài đăng thật rồi tư vấn dựa trên kết quả.
 * Khóa lấy ở https://aistudio.google.com → GEMINI_API_KEY trong server/.env (không commit).
 */
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const KEY = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MAX_TOOL_ROUNDS = 5;
const TIMEOUT_MS = 25000;

let injectedFetch = null;
/** Cho test thay fetch bằng bản giả. */
const setFetch = (f) => { injectedFetch = f; };
const hasKey = () => !!KEY();

/** Schema công cụ (dạng JSON Schema) → Gemini (Gemini không nhận additionalProperties). */
function toDeclarations(tools) {
  const clean = (s) => {
    if (Array.isArray(s)) return s.map(clean);
    if (s && typeof s === 'object') {
      const o = {};
      for (const [k, v] of Object.entries(s)) { if (k !== 'additionalProperties') o[k] = clean(v); }
      return o;
    }
    return s;
  };
  return [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: clean(t.input_schema) })) }];
}

async function call(body) {
  const f = injectedFetch || fetch;
  let res;
  try {
    res = await f(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error('[assistant] Gemini không kết nối được:', e.name);
    throw new ApiError(502, 'ASSISTANT_ERROR', 'Trợ lý tạm thời không phản hồi');
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[assistant] Gemini lỗi', res.status, detail.slice(0, 200)); // chỉ ghi log, không trả về cho người dùng
    const busy = res.status === 429 || res.status === 503;
    throw new ApiError(busy ? 503 : 502, 'ASSISTANT_ERROR', busy ? 'Trợ lý đang bận, thử lại sau ít phút' : 'Trợ lý tạm thời không phản hồi');
  }
  return res.json();
}

/** deps: { system, tools, runSearch } lấy từ assistant.service để dùng chung với bản Claude. */
async function chat({ messages, user }, deps) {
  if (!hasKey()) throw new ApiError(503, 'ASSISTANT_UNAVAILABLE', 'Trợ lý chưa được cấu hình');
  const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const known = user && user.area ? `\nNgười dùng đang ở Block ${user.area}.` : '';
  const cards = new Map();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await call({
      systemInstruction: { parts: [{ text: deps.system + known }] },
      contents,
      tools: toDeclarations(deps.tools),
      // vòng cuối cấm gọi thêm công cụ để mô hình buộc phải trả lời bằng chữ
      ...(round === MAX_TOOL_ROUNDS - 1 ? { toolConfig: { functionCallingConfig: { mode: 'NONE' } } } : {}),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
    });
    const cand = data.candidates && data.candidates[0];
    if (!cand || !cand.content || !cand.content.parts) {
      // bị chặn bởi bộ lọc an toàn hoặc không có nội dung
      return { reply: 'Mình chưa thể hỗ trợ câu này. Bạn thử hỏi về món ăn, đồ dùng, dịch vụ hoặc việc làm trong khu nhé.', cards: [...cards.values()].slice(0, 8) };
    }
    const parts = cand.content.parts;
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) {
      const reply = parts.map((p) => p.text || '').join('').trim();
      return { reply: reply || 'Mình chưa tìm được gợi ý phù hợp, bạn mô tả rõ hơn giúp mình nhé.', cards: [...cards.values()].slice(0, 8) };
    }
    contents.push({ role: 'model', parts });
    const responses = [];
    for (const { functionCall: fc } of calls) {
      let result;
      try {
        const out = await deps.runTool(fc.name, fc.args || {});
        out.cards.forEach((c) => cards.set(c.id, c));
        result = { ket_qua: out.text };
      } catch (e) {
        console.error('[assistant] công cụ lỗi', fc.name, e.message);
        result = { error: 'Không thực hiện được lúc này' };
      }
      responses.push({ functionResponse: { name: fc.name, response: result } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { reply: 'Mình tìm hơi nhiều lần mà chưa chốt được, bạn nói rõ hơn món hoặc ngân sách giúp mình nhé.', cards: [...cards.values()].slice(0, 8) };
}

module.exports = { chat, setFetch, hasKey, toDeclarations };
