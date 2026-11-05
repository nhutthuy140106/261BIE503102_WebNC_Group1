/**
 * Ngày khách được chọn khi đặt: chỉ trong các ngày người bán đã đặt trên lịch và chưa qua.
 * Người bán không chọn ngày nào (bài cũ, bài mẫu) thì mở mọi ngày từ hôm nay. Ngày dạng "YYYY-MM-DD".
 */
export function canPickDate(dates: string[] | undefined, iso: string, today: string): boolean {
  if (iso < today) return false;
  return dates?.length ? dates.includes(iso) : true;
}

/** Ngày chọn sẵn cho khách: ngày gần nhất còn mở; rỗng khi người bán đã hết ngày */
export function firstOpenDate(dates: string[] | undefined, today: string): string {
  if (!dates?.length) return today;
  return [...dates].sort().find((d) => d >= today) ?? '';
}

/** Ngày cuối người bán mở, để khóa nút sang tháng sau; không giới hạn thì rỗng */
export function lastOpenDate(dates: string[] | undefined): string {
  return dates?.length ? [...dates].sort()[dates.length - 1] : '';
}
