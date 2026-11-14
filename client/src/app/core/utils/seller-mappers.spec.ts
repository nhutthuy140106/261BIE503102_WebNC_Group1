import { Post } from '../models/post';
import { SellerSpace } from '../models/seller';
import type { PostBody } from '../services/seller';
import { areaCode, jobBodyToApi, mergeServerSpace, postBodyToApi, posterOfferFromApi, sellerOrderFromApi } from './seller-mappers';

const NOW = new Date('2026-11-14T10:00:00');

const apiOrder = {
  _id: 'o1', code: 'AG-O1001', state: 'waiting', quantity: 2, fulfillment: 'delivery', payment: 'transfer', total: 97000, note: 'Ít cay',
  createdAt: '2026-11-14T09:00:00', scheduledAt: '2026-11-15T11:30:00',
  snapshot: { title: 'Cơm nhà làm', type: 'food', image: 'x.jpg', unitPrice: 35000 },
  selections: [{ group: 'Món mặn', choices: [{ label: 'Sườn rim', price: 10000 }] }],
  breakdown: { deliveryFee: 7000, discount: 10000 },
  address: { name: 'Thủy', phone: '0901234567', block: 'B', unit: 'B-1204' },
  buyer: { _id: 'u1', name: 'Ngọc Thủy', phone: '0900000001', avatar: null },
  history: [{ state: 'waiting', at: '2026-11-14T09:00:00' }],
};

describe('sellerOrderFromApi', () => {
  it('đổi đơn của server sang đơn hiển thị ở khu Bán', () => {
    const o = sellerOrderFromApi(apiOrder, NOW);
    expect(o).toMatchObject({
      id: 'o1', code: 'AG-O1001', kind: 'food', title: 'Cơm nhà làm', state: 'waiting', fulfil: 'delivery', pay: 'transfer', ship: 7000, day: 1, time: '11:30',
      address: 'B-1204, Block B', note: 'Ít cay', buyerOrderId: 'o1', cancelRequest: null, surcharge: null,
    });
    expect(o.buyer).toMatchObject({ name: 'Ngọc Thủy', phone: '0901234567' });
    expect(o.items[0]).toMatchObject({ name: 'Cơm nhà làm', qty: 2, option: 'Món mặn: Sườn rim', price: 35000 });
  });

  it('tổng tiền các dòng + phí giao luôn khớp tổng của đơn (phần chênh thành một dòng riêng)', () => {
    const o = sellerOrderFromApi(apiOrder, NOW);
    const sum = o.items.reduce((n, i) => n + i.qty * i.price, 0) + o.ship;
    expect(sum).toBe(97000);
    expect(o.items.at(-1)).toMatchObject({ name: 'Tùy chọn cộng giá', price: 20000 });
  });

  it('đơn tự lấy ghi "Khách tự đến lấy"; dịch vụ giao tận nơi là làm tại nhà', () => {
    expect(sellerOrderFromApi({ ...apiOrder, fulfillment: 'pickup' }, NOW).address).toBe('Khách tự đến lấy');
    const svc = sellerOrderFromApi({ ...apiOrder, snapshot: { ...apiOrder.snapshot, type: 'service' } }, NOW);
    expect(svc.kind).toBe('service');
    expect(svc.fulfil).toBe('home');
  });

  it('khách xin hủy chờ trả lời → có lý do; phụ thu đã đồng ý thì không tính vào dòng chênh', () => {
    const o = sellerOrderFromApi({
      ...apiOrder, state: 'confirmed', total: 112000, cancelRequest: { status: 'pending', reason: 'Đổi ý', at: '2026-11-14T09:30:00' },
      surcharge: { amount: 15000, reason: 'Đồ nặng', status: 'approved' },
    }, NOW);
    expect(o.cancelRequest).toBe('Đổi ý');
    expect(o.surcharge).toEqual({ amount: 15000, reason: 'Đồ nặng', ok: true });
    expect(o.items.reduce((n, i) => n + i.qty * i.price, 0) + o.ship + 15000).toBe(112000);
  });

  it('trạng thái server được nối đúng, trạng thái lạ rơi về "waiting"', () => {
    expect(sellerOrderFromApi({ ...apiOrder, state: 'ready' }, NOW).state).toBe('ready');
    expect(sellerOrderFromApi({ ...apiOrder, state: 'declined' }, NOW).state).toBe('declined');
    expect(sellerOrderFromApi({ ...apiOrder, state: 'khong-biet' }, NOW).state).toBe('waiting');
  });
});

describe('form Bán → body server', () => {
  const body = { kind: 'food', title: 'Bánh mì', description: 'Ngon', price: 20000, priceUnit: 'cái', block: 'Block B', images: [], template: 't', due: 'x', stock: { mode: 'limit', left: 5 } } as PostBody;

  it('đổi tên trường: kind→type, priceUnit→unit, block→area; bỏ trường chỉ dùng ở FE', () => {
    const out = postBodyToApi(body);
    expect(out).toMatchObject({ type: 'food', unit: 'cái', area: 'B', title: 'Bánh mì', stock: { mode: 'limit', left: 5 } });
    expect(out).not.toHaveProperty('kind');
    expect(out).not.toHaveProperty('priceUnit');
    expect(out).not.toHaveProperty('template');
    expect(out).not.toHaveProperty('due');
  });

  it('khu vực: "Block B" → "B", tên shop giữ nguyên', () => {
    expect(areaCode('Block B')).toBe('B');
    expect(areaCode('Shop 12')).toBe('Shop 12');
  });

  it('việc làm: tiền công, số người cần, địa chỉ chính xác', () => {
    const job = { ...body, kind: 'job', job: { due: 'Cuối tuần', head: 2, building: 'B-0512', windows: [] } } as PostBody;
    expect(jobBodyToApi(job)).toMatchObject({ title: 'Bánh mì', pay: 20000, workTime: 'Cuối tuần', headcount: 2, exactAddress: 'B-0512', area: 'B' });
  });
});

describe('đề nghị phía người đăng việc', () => {
  it('kèm thông tin người làm', () => {
    const o = posterOfferFromApi({ _id: 'f1', code: 'AG-J1', state: 'offered', intro: 'Mình rảnh', slots: [], job: { _id: 'j1', title: 'Tưới cây', pay: 60000, poster: { name: 'Hoa' } }, worker: { _id: 'w1', name: 'Quốc Anh', phone: '0900000005', avatar: null, area: 'B' } });
    expect(o).toMatchObject({ _id: 'f1', jobId: 'j1', jobTitle: 'Tưới cây', workerName: 'Quốc Anh', workerPhone: '0900000005', workerBlock: 'Block B', state: 'offered' });
  });
});

describe('mergeServerSpace', () => {
  const base = {
    version: 'v', shop: { name: 'Shop' }, hours: [], offs: [], stats: {}, pause: null, chats: [], reviews: [],
    orders: [{ id: 'mau-1' }], jobs: [],
    posts: [
      { id: 'mau-a', kind: 'food', title: 'Bài mẫu giả', buyerPostId: 'mock-id', price: 1, stock: 1, max: 1, on: true, views: 9, saves: 9, sold: 9, category: 'x' },
      { id: 'p1', kind: 'food', title: 'Bài thật cũ', buyerPostId: 's1', price: 1, stock: 1, max: 1, on: true, views: 50, saves: 5, sold: 7, category: 'x', form: { a: 1 }, formType: 'drink' },
      { id: 'nhap', kind: 'goods', title: 'Chưa lên server', price: 1, stock: 1, max: 1, on: true, views: 0, saves: 0, sold: 0, category: 'x' },
    ],
  } as unknown as SellerSpace;
  const post = (id: string, over: Partial<Post> = {}): Post => ({ _id: id, kind: 'food', title: 'T' + id, description: '', images: ['i.jpg'], sellerId: 'u', sellerName: 'u', block: 'Block B', price: 20000, createdAt: '2026-11-14', ...over }) as Post;

  it('đơn lấy từ server thay hết đơn mẫu; bài mẫu không có trên server bị bỏ', () => {
    const next = mergeServerSpace(base, [{ id: 'o1' } as never], [post('s1', { title: 'Bài thật mới', price: 33000 })]);
    expect(next.orders.map((o) => o.id)).toEqual(['o1']);
    expect(next.posts.some((p) => p.id === 'mau-a')).toBe(false);
  });

  it('bài đã có ở máy giữ form, lượt xem; giá và tên lấy theo server', () => {
    const p = mergeServerSpace(base, [], [post('s1', { title: 'Bài thật mới', price: 33000, closed: true })]).posts.find((x) => x.buyerPostId === 's1')!;
    expect(p).toMatchObject({ title: 'Bài thật mới', price: 33000, on: false, views: 50, sold: 7, form: { a: 1 }, formType: 'drink' });
  });

  it('bài mới của server hiện ra, kèm số còn lại; bài chưa lên server vẫn giữ', () => {
    const next = mergeServerSpace(base, [], [post('s2', { stock: { mode: 'limit', left: 4 } })]);
    expect(next.posts.find((p) => p.buyerPostId === 's2')).toMatchObject({ stock: 4, on: true, kind: 'food' });
    expect(next.posts.some((p) => p.id === 'nhap')).toBe(true);
  });

  it('việc của server thành thẻ việc, nối với bài việc qua jobId', () => {
    const next = mergeServerSpace(base, [], [post('j9', { kind: 'job', title: 'Tưới cây', price: 60000, job: { due: 'Chiều nay', head: 2, building: 'B-0512', offers: 0, status: 'open' } })]);
    const sp = next.posts.find((p) => p.buyerPostId === 'j9')!;
    const job = next.jobs.find((j) => j.id === sp.jobId)!;
    expect(job).toMatchObject({ title: 'Tưới cây', pay: 60000, head: 2, exact: 'B-0512', closed: false });
  });
});
