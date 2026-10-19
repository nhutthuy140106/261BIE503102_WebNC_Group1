export interface User {
  _id: string;
  username: string;
  fullName: string;
  block: string;
  avatar?: string;
  /** Số dư AntXu */
  xu?: number;
  /** Vai trò do SERVER quyết định, client không được tự gán */
  role: 'user' | 'admin';
}

export type Block = 'A' | 'B' | 'C' | 'D';
export const BLOCKS: Block[] = ['A', 'B', 'C', 'D'];

/** Sổ địa chỉ — khớp docs/api-buyer-job.md mục 2 */
export interface Address {
  _id: string;
  name: string;
  phone: string;
  block: Block;
  /** Căn/tầng, ví dụ "B-1204" */
  unit: string;
  note?: string;
  label: 'home' | 'family' | 'other';
  isDefault: boolean;
}

export type AddressBody = Omit<Address, '_id' | 'isDefault'> & { isDefault?: boolean };
