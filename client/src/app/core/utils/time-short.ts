/** "Vừa xong", "5 phút", "2 giờ", "3 ngày" — thời gian ngắn gọn cạnh một mục (như Facebook). */
export function timeShort(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'Vừa xong';
  if (m < 60) return m + ' phút';
  if (m < 1440) return Math.floor(m / 60) + ' giờ';
  return Math.floor(m / 1440) + ' ngày';
}
