/**
 * Slug SEO: "Bún bò Đường Số 5" + id -> "bun-bo-duong-so-5-<id>".
 * Dựa trên slide Chương IV, đã sửa chữ "đ" (NFD không tách được "đ")
 * và đổi id số sang ObjectId 24 ký tự hex của MongoDB.
 */
const OBJECT_ID = /^[a-f0-9]{24}$/;
const SLUG_TAIL = /-([a-f0-9]{24})$/;

/** Bỏ dấu tiếng Việt (kể cả đ) và hạ chữ thường. */
export function stripAccents(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function createSlug(name: string, id: string): string {
  const sanitized = stripAccents(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return sanitized ? `${sanitized}-${id}` : id;
}

export function extractIdFromSlug(slug: string): string | null {
  const match = slug.match(SLUG_TAIL);
  return match ? match[1] : null;
}

export type IdentityType = 'ID' | 'SLUG_WITH_ID' | 'PURE_SLUG';

export function getIdentityType(identity: string): IdentityType {
  if (OBJECT_ID.test(identity)) return 'ID';
  if (SLUG_TAIL.test(identity)) return 'SLUG_WITH_ID';
  return 'PURE_SLUG';
}

/** Lấy ObjectId từ URL dạng id hoặc slug-có-id; null nếu không hợp lệ. */
export function resolveId(identity: string): string | null {
  switch (getIdentityType(identity)) {
    case 'ID':
      return identity;
    case 'SLUG_WITH_ID':
      return extractIdFromSlug(identity);
    default:
      return null;
  }
}
