import { displayUnit } from './unit';

describe('đơn vị tiền công của việc', () => {
  it('việc từ form dùng đơn vị người đăng chọn', () => {
    expect(displayUnit({ kind: 'job', job: { payUnit: 'việc' } })).toBe('việc');
    expect(displayUnit({ kind: 'job', job: { payUnit: 'giờ' } })).toBe('giờ');
  });

  it('việc mẫu chưa có đơn vị thì như cũ', () => {
    expect(displayUnit({ kind: 'job', job: {} })).toBe('lần');
    expect(displayUnit({ kind: 'job', priceUnit: 'ca' })).toBe('buổi');
  });

  it('loại bài khác không bị ảnh hưởng', () => {
    expect(displayUnit({ kind: 'service', priceUnit: 'kg' })).toBe('kg');
    expect(displayUnit({ kind: 'goods' })).toBe('');
  });
});
