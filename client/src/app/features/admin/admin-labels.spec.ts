import { ACTION, ISSUE_STATE, ORDER_STATE, actionLabel, issueTone, orderTone } from './admin-labels';

describe('nhãn khu Quản trị', () => {
  it('mọi hành động server ghi vào nhật ký đều có tên tiếng Việt, hành động lạ giữ nguyên mã', () => {
    expect(actionLabel('order.issue_refund')).toBe('Phân xử: hoàn tiền');
    expect(actionLabel('xu.grant')).toBe('Cộng Xu');
    expect(actionLabel('khong.co')).toBe('khong.co');
    expect(Object.values(ACTION).every((t) => t.length > 3)).toBe(true);
  });

  it('mọi trạng thái đơn có nhãn và màu: hoàn thành xanh lá, hủy/từ chối đỏ, chờ cam', () => {
    for (const s of ['waiting', 'confirmed', 'picked', 'pricing', 'preparing', 'delivering', 'ready', 'done', 'cancelled', 'declined']) expect(ORDER_STATE[s]).toBeTruthy();
    expect(orderTone('done')).toBe('ok');
    expect(orderTone('declined')).toBe('bad');
    expect(orderTone('waiting')).toBe('warn');
    expect(orderTone('preparing')).toBe('info');
  });

  it('báo vấn đề đang chờ hoặc bị người bán từ chối là cam (cần admin để mắt), xong là xanh', () => {
    expect(issueTone('open')).toBe('warn');
    expect(issueTone('rejected')).toBe('warn');
    expect(issueTone('refund')).toBe('ok');
    expect(issueTone('closed')).toBe('mute');
    expect(ISSUE_STATE['returnAgreed']).toBeTruthy();
  });
});
