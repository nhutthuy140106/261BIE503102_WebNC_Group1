// Cùng quy tắc với client/src/app/core/utils/slug-helper.ts để slug hai phía khớp nhau.
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const SLUG_TAIL = /-([a-f0-9]{24})$/i;

/** Bỏ dấu tiếng Việt (kể cả đ), hạ chữ thường. */
function stripAccents(s) {
  return String(s || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/\p{M}/gu, '');
}

function createSlug(name, id) {
  const base = stripAccents(name).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return base ? `${base}-${id}` : String(id);
}

/** Nhận id hoặc slug-có-id, trả ObjectId hex; null nếu không hợp lệ. */
function resolveId(identity) {
  if (OBJECT_ID.test(identity)) return identity;
  const m = String(identity).match(SLUG_TAIL);
  return m ? m[1] : null;
}

module.exports = { stripAccents, createSlug, resolveId };
