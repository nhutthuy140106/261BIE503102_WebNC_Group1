export interface User {
  _id: string;
  username: string;
  fullName: string;
  block: string;
  avatar?: string;
  /** Thông tin hồ sơ tự khai (không bắt buộc) */
  email?: string;
  gender?: 'male' | 'female' | 'other';
  /** Ngày sinh dạng yyyy-MM-dd */
  birthday?: string;
  bio?: string;
  /** Số dư AntXu */
  xu?: number;
  /** Vai trò do SERVER quyết định, client không được tự gán */
  role: 'user' | 'admin';
}

export type Block = 'A' | 'B' | 'C' | 'D';
export const BLOCKS: Block[] = ['A', 'B', 'C', 'D'];

/** Sổ địa chỉ — khớp docs/api-buyer-job.md mục 2 */
/** Tên tòa để hiển thị: "B" → "Tòa B", đã ghi sẵn "Tòa …" hoặc "Block …" thì giữ nguyên */
export const blockText = (b: string): string => (/^(tòa|toà|block)\b/i.test(b.trim()) ? b.trim() : 'Tòa ' + b.trim());

export interface Address {
  _id: string;
  name: string;
  phone: string;
  /** Tòa người dùng tự nhập. Địa chỉ cũ có thể chỉ là một chữ (A, B…) */
  block: string;
  /** Số nhà, ví dụ "B-1204" */
  unit: string;
  note?: string;
  label: 'home' | 'family' | 'other';
  isDefault: boolean;
}

export type AddressBody = Omit<Address, '_id' | 'isDefault'> & { isDefault?: boolean };
