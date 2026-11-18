import { messageFromApi } from './api-mappers';
import { reviewPostTitle, sampleReviewFromApi } from './review-mappers';
import { sellerChatFromApi } from './seller-mappers';

describe('đánh giá thật → dòng đánh giá', () => {
  const NOW = new Date('2026-11-14T12:00:00').getTime();

  it('đủ 8 phần: ảnh, tên, khu, thời gian, sao, nội dung, ảnh kèm, phản hồi', () => {
    const r = sampleReviewFromApi({ rating: 5, comment: 'Phở ngon', images: ['a.jpg'], createdAt: '2026-11-14T09:00:00', reviewer: { name: 'Ngọc Thủy', avatar: 'u.png', area: 'B' }, reply: { text: 'Cảm ơn bạn' } }, NOW);
    expect(r).toEqual(['u.png', 'Ngọc Thủy', 'Block B', '3 giờ trước', 5, 'Phở ngon', ['a.jpg'], 'Cảm ơn bạn']);
  });

  it('thiếu ảnh / phản hồi / nhận xét thì có giá trị mặc định, người chưa có ảnh dùng chữ cái đầu tên', () => {
    const r = sampleReviewFromApi({ rating: 3, createdAt: '2026-11-14T11:59:50', reviewer: { name: 'Minh' } }, NOW);
    expect(r[0]).toMatch(/^data:image\/svg\+xml/);
    expect(r.slice(1)).toEqual(['Minh', '', 'vừa xong', 3, '', [], '']);
  });

  it('tên bài đã mua lấy từ bài đính kèm đánh giá', () => {
    expect(reviewPostTitle({ post: { title: 'Cơm nhà làm' } })).toBe('Cơm nhà làm');
    expect(reviewPostTitle({})).toBe('');
  });
});

describe('tin nhắn kèm tệp', () => {
  const media = { kind: 'file', url: '/images/uploads/chat/x.pdf', name: 'thuc-don.pdf', size: 1234 };

  it('tin của server → tin của người mua, giữ tệp đính kèm; tin chữ không có media', () => {
    expect(messageFromApi({ _id: 'm1', sender: 'u2', text: '', media, createdAt: 't' }, 'u1')).toMatchObject({ mine: false, text: '', media: { kind: 'file', url: '/images/uploads/chat/x.pdf', name: 'thuc-don.pdf', size: 1234 } });
    expect(messageFromApi({ _id: 'm2', sender: 'u1', text: 'Chào', createdAt: 't' }, 'u1')).not.toHaveProperty('media');
  });

  it('tin của server → tin ở Messenger người bán, giữ tệp, ghi chú ghi âm có số giây', () => {
    const c = sellerChatFromApi({ _id: 'c1', with: { _id: 'u2', name: 'Thủy' } }, [{ sender: 'u2', text: '', media: { kind: 'audio', url: '/images/uploads/chat/v.webm', sec: 7 }, createdAt: '2026-11-14T10:00:00' }], 'u1');
    expect(c.messages[0]).toMatchObject({ from: 'them', text: '', media: { kind: 'audio', url: '/images/uploads/chat/v.webm', sec: 7 } });
  });
});
