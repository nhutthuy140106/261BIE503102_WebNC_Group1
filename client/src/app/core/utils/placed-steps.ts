/**
 * Tên các bước của đơn đã đặt — MỘT nguồn dùng cho cả màn "Đã gửi đơn" và thanh tiến trình trong chi tiết đơn.
 * - Đồ ăn & uống: Đã gửi → Đã xác nhận → Đang thực hiện → Đang giao → Hoàn thành
 * - Đồ dùng (có sẵn, không phải làm): bỏ "Đang thực hiện" → Đã gửi → Đã xác nhận → Đang giao → Hoàn thành
 * - Dịch vụ: Đã gửi → Đã xác nhận → Đang thực hiện → Trả đồ → Hoàn thành (+ "Duyệt giá" khi giá chưa chốt)
 */
export function placedStepNames(kind: 'food' | 'goods' | 'service' | undefined, priceStep = false, pickup = false): string[] {
  if (kind === 'service') {
    const names = ['Đã gửi', 'Đã xác nhận', 'Đang thực hiện', 'Trả đồ', 'Hoàn thành'];
    if (priceStep) names.splice(2, 0, 'Duyệt giá');
    return names;
  }
  const last = 'Đang giao'; // giao hay tự lấy do hai bên tự thỏa thuận, không đổi tên bước
  return kind === 'goods' ? ['Đã gửi', 'Đã xác nhận', last, 'Hoàn thành'] : ['Đã gửi', 'Đã xác nhận', 'Đang thực hiện', last, 'Hoàn thành'];
}
