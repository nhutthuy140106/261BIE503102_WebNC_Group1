/**
 * Tên các bước của đơn đã đặt — MỘT nguồn dùng cho cả màn "Đã gửi đơn" và thanh tiến trình trong chi tiết đơn,
 * để hai nơi luôn khớp nhau. Dịch vụ: Đang làm → Trả đồ; đồ ăn / đồ dùng: Đang chuẩn bị → Giao / nhận.
 */
export function placedStepNames(kind: 'food' | 'goods' | 'service' | undefined, priceStep = false): string[] {
  const svc = kind === 'service';
  const names = ['Đã gửi', 'Đã xác nhận', svc ? 'Đang làm' : 'Đang chuẩn bị', svc ? 'Trả đồ' : 'Giao / nhận', 'Hoàn thành'];
  if (priceStep) names.splice(2, 0, 'Duyệt giá');
  return names;
}
