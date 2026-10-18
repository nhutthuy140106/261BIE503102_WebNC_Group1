export interface User {
  _id: string;
  username: string;
  fullName: string;
  block: string;
  avatar?: string;
  /** Số dư AntXu */
  xu: number;
  /** Vai trò do SERVER quyết định, client không được tự gán */
  role: 'user' | 'admin';
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  block: string;
  detail: string;
  note?: string;
  label: 'home' | 'relative' | 'other';
  isDefault: boolean;
}
