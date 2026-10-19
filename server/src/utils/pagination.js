function parsePaging(query, defaults = { limit: 20, max: 100 }) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(defaults.max, Math.max(1, parseInt(query.limit, 10) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}

// "-createdAt" -> { createdAt: -1 }; chỉ nhận field nằm trong allowed
function parseSort(sort, allowed, fallback) {
  if (!sort) return fallback;
  const out = {};
  for (const part of String(sort).split(',')) {
    const desc = part.startsWith('-');
    const key = desc ? part.slice(1) : part;
    if (allowed.includes(key)) out[key] = desc ? -1 : 1;
  }
  return Object.keys(out).length ? out : fallback;
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { parsePaging, parseSort, escapeRegex };
