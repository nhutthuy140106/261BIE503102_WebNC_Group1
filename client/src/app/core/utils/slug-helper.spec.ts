import { createSlug, extractIdFromSlug, getIdentityType, resolveId } from './slug-helper';

const ID = '640b187e71d9faa9039ff97d';

describe('slug-helper', () => {
  it('bỏ dấu tiếng Việt, kể cả chữ đ', () => {
    expect(createSlug('Bún bò Đường Số 5', ID)).toBe(`bun-bo-duong-so-5-${ID}`);
    expect(createSlug('Đồ ăn nhanh Dĩ An', ID)).toBe(`do-an-nhanh-di-an-${ID}`);
  });

  it('tách id từ slug', () => {
    expect(extractIdFromSlug(`bun-bo-${ID}`)).toBe(ID);
    expect(extractIdFromSlug('bun-bo')).toBeNull();
  });

  it('nhận diện kiểu định danh', () => {
    expect(getIdentityType(ID)).toBe('ID');
    expect(getIdentityType(`bun-bo-${ID}`)).toBe('SLUG_WITH_ID');
    expect(getIdentityType('bun-bo')).toBe('PURE_SLUG');
    expect(resolveId('bun-bo')).toBeNull();
    expect(resolveId(`bun-bo-${ID}`)).toBe(ID);
  });
});
