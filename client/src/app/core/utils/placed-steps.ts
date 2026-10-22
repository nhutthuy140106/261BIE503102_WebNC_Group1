/**
 * Tên các bước của đơn đã đặt — MỘT nguồn dùng cho cả màn "Đã gửi đơn" và thanh tiến trình trong chi tiết đơn,
 * để hai nơi luôn khớp nhau. Dịch vụ: Đang làm → Trả đồ; đồ ăn / đồ dùng: Đã xác nhận → Đang giao (không có bước "Đang chuẩn bị").
 */
export function placedStepNames(kind: 'food' | 'goods' | 'service' | undefined, priceStep = false): string[] {
  const svc = kind === 'service';
  const names = svc ? ['Đã gửi', 'Đã xác nhận', 'Đang làm', 'Trả đồ', 'Hoàn thành'] : ['Đã gửi', 'Đã xác nhận', 'Đang giao', 'Hoàn thành'];
  if (priceStep) names.splice(2, 0, 'Duyệt giá');
  return names;
}
