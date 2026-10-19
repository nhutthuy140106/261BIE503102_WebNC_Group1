import { Post } from '../models/post';
import { rankSimilar, tokenize } from './recommend';

const mk = (id: string, kind: Post['kind'], title: string, description: string, price = 40000, block = 'Block B'): Post => ({
  _id: id, kind, title, description, images: [], sellerId: 's', sellerName: 'x', block, price, createdAt: '',
});

const pho = mk('1', 'food', 'Phở bò tái', 'Nước dùng hầm xương, bánh phở tươi');
const corpus = [
  pho,
  mk('2', 'food', 'Bún bò Huế', 'Nước dùng hầm xương, thịt bò', 45000),
  mk('3', 'goods', 'Sofa vải 3 chỗ', 'Sofa còn mới, chuyển nhà', 2500000, 'Block A'),
  mk('4', 'food', 'Cơm gà', 'Cơm gà xối mỡ', 35000),
];

describe('recommend', () => {
  it('tách từ không dấu, bỏ từ ngắn và từ dừng', () => {
    expect(tokenize('Phở bò và cơm của nhà')).toEqual(['pho', 'com', 'nha']);
  });

  it('bài tương tự của Phở bò là món ăn, không gợi ý Sofa, không gợi ý lại chính nó', () => {
    const ids = rankSimilar([pho], corpus).map((p) => p._id);
    expect(ids[0]).toBe('2');
    expect(ids).not.toContain('3');
    expect(ids).not.toContain('1');
  });

  it('không có seed thì không gợi ý gì (không bịa)', () => {
    expect(rankSimilar([], corpus)).toEqual([]);
  });
});
