const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rank, lev, expand } = require('../src/utils/smart-search');

const docs = [
  { id: 'a', searchText: 'com ga xoi mo bep co lan' },
  { id: 'b', searchText: 'tra sua tran chau duong den' },
  { id: 'c', searchText: 'giat say tai nha tiem sach thom' },
  { id: 'd', searchText: 'don nha ve sinh theo gio' },
];
const top = (q) => (rank(docs, q)[0] || {}).doc;

test('Levenshtein dừng sớm', () => {
  assert.equal(lev('com', 'com'), 0);
  assert.equal(lev('giat', 'giaat'), 1);
  assert.ok(lev('abcdef', 'xyz') > 2);
});

test('gõ sai vẫn tìm ra', () => {
  assert.equal(top('cơm gàa').id, 'a');
  assert.equal(top('tra suaa').id, 'b');
  assert.equal(top('giạt sấy').id, 'c');
});

test('đồng nghĩa: "lau nhà" ra dọn nhà, "cf" mở rộng sang cà phê', () => {
  assert.equal(top('lau nhà').id, 'd');
  assert.ok(expand('cf').has('cafe'));
});

test('không liên quan thì rỗng', () => {
  assert.deepEqual(rank(docs, 'xyzqwerty'), []);
});

test('đồng nghĩa phải khớp đủ cụm: "dạy kèm" không ra bài chỉ có chữ "giá"', () => {
  const ds = [{ id: 'x', searchText: 'Điện thoại giá rẻ bất ngờ' }, { id: 'y', searchText: 'Gia sư toán lớp 9' }];
  assert.deepEqual(rank([ds[0]], 'dạy kèm'), []);
  assert.equal(rank(ds, 'dạy kèm')[0].doc.id, 'y');
});
