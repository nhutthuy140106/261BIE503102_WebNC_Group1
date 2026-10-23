/**
 * Tên các bước của đơn đã đặt — MỘT nguồn dùng cho cả màn "Đã gửi đơn" và thanh tiến trình trong chi tiết đơn,
 * để hai nơi luôn khớp nhau. Cả hai: Đã xác nhận → Đang thực hiện; sau đó dịch vụ là "Trả đồ", đồ ăn / đồ dùng là "Đang giao".
 */
export function placedStepNames(kind: 'food' | 'goods' | 'service' | undefined, priceStep = false): string[] {
  const svc = kind === 'service';
  const names = ['Đã gửi', 'Đã xác nhận', 'Đang thực hiện', svc ? 'Trả đồ' : 'Đang giao', 'Hoàn thành'];
  if (priceStep) names.splice(2, 0, 'Duyệt giá');
  return names;
}
