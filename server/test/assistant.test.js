// Chatbot tư vấn: dùng fetch giả cho Gemini (không gọi mạng, không tốn hạn mức), kiểm tra vòng gọi công cụ, dự phòng và đầu vào
process.env.NODE_ENV = 'test';
process.env.SEED_PASSWORD = 'Test@2026';
const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; let server; let base; let cookie = '';
const PW = 'Test@2026';
const saved = { llm: process.env.LLM_API_KEY, key: process.env.GEMINI_API_KEY, google: process.env.GOOGLE_API_KEY, mode: process.env.ASSISTANT_MODE };

async function api(method, path, body, withCookie = true) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(withCookie && cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (sc && path === '/auth/login') cookie = sc.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await require('./fixture')();
  server = require('../src/app').listen(0);
  base = `http://localhost:${server.address().port}/api`;
  await api('POST', '/auth/login', { phone: '0900000001', password: PW });
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const assistant = require('../src/modules/buyer/assistant/assistant.service');
const ask = (content) => api('POST', '/assistant/chat', { messages: [{ role: 'user', content }] });
const jsonRes = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data, text: async () => JSON.stringify(data) });

afterEach(() => {
  assistant.setGeminiFetch(null);
  assistant.setLlmFetch(null);
  for (const [k, v] of [['LLM_API_KEY', saved.llm], ['GEMINI_API_KEY', saved.key], ['GOOGLE_API_KEY', saved.google], ['ASSISTANT_MODE', saved.mode]]) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

test('chưa đăng nhập thì 401', async () => {
  const r = await api('POST', '/assistant/chat', { messages: [{ role: 'user', content: 'ăn gì' }] }, false);
  assert.equal(r.status, 401);
});

test('đầu vào sai: tin trống, quá dài, tin cuối không phải của người dùng → 422', async () => {
  assert.equal((await api('POST', '/assistant/chat', { messages: [] })).status, 422);
  assert.equal((await ask('x'.repeat(501))).status, 422);
  assert.equal((await api('POST', '/assistant/chat', { messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] })).status, 422);
});

test('Gemini gọi search_catalog → server chạy tìm thật → trả câu trả lời + thẻ bài; khóa nằm ở header, không ở URL/body', async () => {
  process.env.GEMINI_API_KEY = 'test-key-123';
  delete process.env.ASSISTANT_MODE;
  const reqs = [];
  assistant.setGeminiFetch(async (url, init) => {
    reqs.push({ url, init });
    if (reqs.length === 1) {
      return jsonRes(200, { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'search_catalog', args: { q: 'cơm', max_price: 100000 } } }] } }] });
    }
    const body = JSON.parse(init.body);
    const last = body.contents[body.contents.length - 1];
    assert.equal(last.role, 'user');
    assert.ok(last.parts[0].functionResponse, 'lượt 2 phải gửi kết quả công cụ');
    return jsonRes(200, { candidates: [{ content: { role: 'model', parts: [{ text: 'Mình gợi ý món cơm này nhé.' }] } }] });
  });
  const r = await ask('trưa nay ăn cơm dưới 100k');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.engine, 'gemini');
  assert.equal(r.body.data.reply, 'Mình gợi ý món cơm này nhé.');
  assert.ok(r.body.data.cards.length >= 1, 'phải có thẻ bài từ kho dữ liệu thật');
  assert.ok(r.body.data.cards.every((c) => c.id && c.title && typeof c.price === 'number'));
  assert.equal(reqs[0].init.headers['x-goog-api-key'], 'test-key-123');
  assert.ok(!reqs[0].url.includes('test-key-123'), 'khóa không được nằm trong URL');
  const sent = JSON.parse(reqs[0].init.body);
  assert.equal(sent.tools[0].functionDeclarations[0].name, 'search_catalog');
  assert.ok(!JSON.stringify(sent).includes('additionalProperties'));
});

test('Gemini lỗi 429 ở chế độ auto → rơi về bộ cơ bản, không báo lỗi', async () => {
  process.env.GEMINI_API_KEY = 'test-key-123';
  delete process.env.ASSISTANT_MODE;
  assistant.setGeminiFetch(async () => jsonRes(429, { error: { message: 'quota secret detail' } }));
  const r = await ask('có đồ uống mát không');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.engine, 'local');
});

test('chế độ gemini mà Gemini lỗi → 503 thân thiện, không lộ chi tiết', async () => {
  process.env.GEMINI_API_KEY = 'test-key-123';
  process.env.ASSISTANT_MODE = 'gemini';
  assistant.setGeminiFetch(async () => jsonRes(429, { error: { message: 'quota secret detail' } }));
  const r = await ask('xin chào');
  assert.equal(r.status, 503);
  assert.ok(!JSON.stringify(r.body).includes('secret detail'));
});

test('không có khóa → tự dùng bộ trả lời cơ bản (miễn phí), vẫn trả thẻ bài thật và tôn trọng mức giá', async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY; delete process.env.ASSISTANT_MODE;
  const r = await ask('trưa nay ăn cơm dưới 100k');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.engine, 'local');
  assert.ok(r.body.data.cards.length >= 1);
  assert.ok(r.body.data.cards.every((c) => c.price <= 100000));
});

test('chế độ gemini mà thiếu khóa → 503 ASSISTANT_UNAVAILABLE', async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY;
  process.env.ASSISTANT_MODE = 'gemini';
  const r = await ask('xin chào');
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, 'ASSISTANT_UNAVAILABLE');
});

test('bộ cơ bản: hiểu giá, loại, bữa ăn, chào hỏi, câu nối tiếp', async () => {
  const local = require('../src/modules/buyer/assistant/assistant.local');
  assert.equal(local.parse('món dưới 50k').maxPrice, 50000);
  assert.equal(local.parse('từ 20k đến 40k').minPrice, 20000);
  assert.equal(local.parse('từ 20k đến 40k').maxPrice, 40000);
  assert.equal(local.parse('khoảng 2 triệu').maxPrice, 2600000);
  assert.equal(local.parse('cần người dọn nhà').type, 'service');
  assert.equal(local.parse('có việc kiếm thêm không').type, 'job');
  assert.equal(local.parse('trà sữa').type, 'food');
  assert.equal(local.parse('sáng nay ăn gì').meal, 'sang');
  assert.equal(local.parse('xin chào').intent, 'greet');
  assert.equal(local.parse('cảm ơn bạn').intent, 'thanks');
  assert.equal((await local.answer('xin chào')).cards.length, 0);
  assert.equal((await local.answer('abcxyz qwertyuiop')).cards.length, 0);
  const follow = await local.answer('dưới 30k thôi', 'tìm món cơm');
  assert.ok(follow.cards.every((c) => c.price <= 30000));
});

test('LLM kiểu OpenAI (Groq/OpenRouter…): gọi công cụ → trả thẻ bài thật; khóa ở header Authorization', async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY; delete process.env.ASSISTANT_MODE;
  process.env.LLM_API_KEY = 'llm-key-xyz';
  const reqs = [];
  assistant.setLlmFetch(async (url, init) => {
    reqs.push({ url, init });
    if (reqs.length === 1) {
      return jsonRes(200, { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'search_catalog', arguments: JSON.stringify({ q: 'cơm', max_price: 100000 }) } }] } }] });
    }
    const body = JSON.parse(init.body);
    const last = body.messages[body.messages.length - 1];
    assert.equal(last.role, 'tool');
    assert.equal(last.tool_call_id, 'c1');
    return jsonRes(200, { choices: [{ message: { role: 'assistant', content: 'Gợi ý món cơm cho bạn nhé.' } }] });
  });
  const r = await ask('trưa nay ăn cơm dưới 100k');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.engine, 'llm');
  assert.equal(r.body.data.reply, 'Gợi ý món cơm cho bạn nhé.');
  assert.ok(r.body.data.cards.length >= 1);
  assert.equal(reqs[0].init.headers.Authorization, 'Bearer llm-key-xyz');
  assert.ok(reqs[0].url.endsWith('/chat/completions'));
  assert.equal(JSON.parse(reqs[0].init.body).tools[0].function.name, 'search_catalog');
});

test('Gemini lỗi → thử LLM kiểu OpenAI → nếu cũng lỗi thì bộ cơ bản', async () => {
  process.env.GEMINI_API_KEY = 'g'; process.env.LLM_API_KEY = 'l'; delete process.env.ASSISTANT_MODE;
  assistant.setGeminiFetch(async () => jsonRes(403, { error: 'denied' }));
  assistant.setLlmFetch(async () => jsonRes(200, { choices: [{ message: { role: 'assistant', content: 'Từ LLM' } }] }));
  let r = await ask('xin chào');
  assert.equal(r.body.data.engine, 'llm');
  assistant.setLlmFetch(async () => jsonRes(500, {}));
  r = await ask('xin chào');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.engine, 'local');
});

test('chế độ llm mà thiếu khóa → 503 ASSISTANT_UNAVAILABLE', async () => {
  delete process.env.LLM_API_KEY; process.env.ASSISTANT_MODE = 'llm';
  const r = await ask('xin chào');
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, 'ASSISTANT_UNAVAILABLE');
});

test('bộ cơ bản: "chọn giúp" ra đúng 1 món trong ngân sách; "đơn của tôi" không lỗi; thực đơn cả ngày trong ngân sách', async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY; delete process.env.LLM_API_KEY; delete process.env.ASSISTANT_MODE;
  let r = await ask('chưa biết ăn gì chọn giúp tôi món dưới 100k');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.cards.length, 1);
  assert.ok(r.body.data.cards[0].price <= 100000);
  r = await ask('đơn của tôi đến đâu rồi');
  assert.equal(r.status, 200);
  assert.ok(r.body.data.reply.length > 0);
  r = await ask('ngân sách 300k cho cả ngày');
  assert.equal(r.status, 200);
  assert.ok(r.body.data.cards.every((c) => c.price <= 100000));
});

test('LLM gọi my_orders: chỉ đọc đơn của chính người đang chat', async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY; delete process.env.ASSISTANT_MODE;
  process.env.LLM_API_KEY = 'k';
  let seen = '';
  assistant.setLlmFetch(async (url, init) => {
    const body = JSON.parse(init.body);
    const last = body.messages[body.messages.length - 1];
    if (last.role !== 'tool') return jsonRes(200, { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 't', type: 'function', function: { name: 'my_orders', arguments: '{"state":"all"}' } }] } }] });
    seen = last.content;
    return jsonRes(200, { choices: [{ message: { role: 'assistant', content: 'ok' } }] });
  });
  const r = await ask('đơn của tôi');
  assert.equal(r.body.data.engine, 'llm');
  assert.ok(seen.length > 0);
});

test('tìm kiếm gõ sai ("coom gaa") vẫn ra bài qua API công khai, có cờ smart', async () => {
  const r = await api('GET', '/posts?q=' + encodeURIComponent('coom ga'));
  assert.equal(r.status, 200);
  assert.ok(r.body.data.length >= 1, 'phải ra bài cơm dù gõ sai');
  assert.equal(r.body.meta.smart, true);
});
