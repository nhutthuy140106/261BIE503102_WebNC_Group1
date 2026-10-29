import { areaLabel, jobFromApi, messageFromApi, notificationFromApi, offerFromApi, orderFromApi, postFromApi, userFromApi } from './api-mappers';

describe('api-mappers', () => {
  it('khu vực: A–D thành "Block X", khu khác giữ nguyên', () => {
    expect(areaLabel('b')).toBe('Block B');
    expect(areaLabel('Shop 12')).toBe('Shop 12');
    expect(areaLabel(undefined)).toBe('');
  });

  it('user: phone → username, name → fullName, role lạ → user', () => {
    const u = userFromApi({ _id: '1', phone: '0900000001', name: 'Ngọc Thủy', area: 'B', role: 'enduser', avatar: '' });
    expect(u).toMatchObject({ username: '0900000001', fullName: 'Ngọc Thủy', block: 'Block B', role: 'user', avatar: undefined });
    expect(userFromApi({ _id: '2', role: 'admin' }).role).toBe('admin');
  });

  it('bài: type/seller/unit sang kind/sellerName/priceUnit; status khác open thì closed', () => {
    const p = postFromApi({ _id: 'p', type: 'food', title: 'Cơm', seller: { _id: 's', name: 'Cô Lan', area: 'B', avatar: 'u' }, price: 35000, unit: 'phần', status: 'hidden' });
    expect(p).toMatchObject({ kind: 'food', sellerId: 's', sellerName: 'Cô Lan', priceUnit: 'phần', block: 'Block B', closed: true });
  });

  it('việc: pay/desc/poster/offerCount sang price/description/seller/job', () => {
    const j = jobFromApi({ _id: 'j', title: 'Tưới cây', desc: 'mô tả', pay: 90000, workTime: 'Thứ 4', poster: { _id: 'u', name: 'Thu Hà' }, status: 'open', offerCount: 2, windows: ['2026-10-19T04:00:00.000Z'] });
    expect(j).toMatchObject({ kind: 'job', price: 90000, description: 'mô tả', sellerName: 'Thu Hà' });
    expect(j.job).toMatchObject({ due: 'Thứ 4', offers: 2, status: 'open', windows: ['2026-10-19T04:00:00.000Z'] });
    expect(jobFromApi({ _id: 'x', status: 'closed' }).job?.status).toBe('taken');
  });

  it('đơn: waiting → pending, ready → delivering, lấy ảnh + người bán từ snapshot', () => {
    const o = orderFromApi({
      _id: 'o', code: 'AG-O1', post: 'p', seller: 's', state: 'waiting', total: 52000, payment: 'transfer', createdAt: 'x',
      snapshot: { title: 'Giặt sấy', sellerName: 'Mỹ Linh', image: 'img', type: 'service' },
      history: [{ state: 'waiting', at: 'a' }, { state: 'ready', at: 'b' }],
    });
    expect(o).toMatchObject({ status: 'pending', paymentMethod: 'transfer', image: 'img', category: 'service', counterpartName: 'Mỹ Linh', counterpartId: 's' });
    expect(o.history?.map((h) => h.state)).toEqual(['pending', 'delivering']);
  });

  it('đơn: phụ thu đang chờ và yêu cầu hủy đang chờ được giữ lại', () => {
    const o = orderFromApi({ _id: 'o', state: 'preparing', cancelRequest: { status: 'pending' }, surcharge: { amount: 20000, reason: 'Đồ nặng', status: 'pending' } });
    expect(o.cancelRequested).toBe(true);
    expect(o.surcharge).toEqual({ amount: 20000, reason: 'Đồ nặng', state: 'pending' });
    expect(orderFromApi({ _id: 'o2', state: 'waiting' }).surcharge).toBeUndefined();
  });

  it('đề nghị: lấy việc lồng bên trong; thiếu lịch sử thì dựng từ createdAt', () => {
    const f = offerFromApi({ _id: 'f', code: 'AG-J1', state: 'offered', intro: 'hi', slots: [], createdAt: 't', job: { _id: 'j', title: 'T', pay: 5, poster: { _id: 'u', name: 'A', area: 'C' } } });
    expect(f).toMatchObject({ jobId: 'j', jobTitle: 'T', pay: 5, posterName: 'A', block: 'Block C' });
    expect(f.history).toEqual([{ state: 'offered', at: 't' }]);
  });

  it('tin nhắn: mine khi sender là mình', () => {
    expect(messageFromApi({ _id: 'm', sender: 'me', text: 'x', createdAt: 't' }, 'me').mine).toBe(true);
    expect(messageFromApi({ _id: 'm', sender: 'other', text: 'x', createdAt: 't' }, 'me').mine).toBe(false);
  });

  it('thông báo: link {type,id} thành đường dẫn FE, ghép tiêu đề + nội dung', () => {
    const n = notificationFromApi({ _id: 'n', title: 'Đơn đang giao', body: 'Trà sữa', link: { type: 'order', id: '9' }, read: false, createdAt: 't' });
    expect(n).toMatchObject({ text: 'Đơn đang giao, Trà sữa', link: '/orders/9', read: false });
    expect(notificationFromApi({ _id: 'n', title: 't', link: { type: 'job', id: '3' } }).link).toBe('/posts/job/3');
  });
});
