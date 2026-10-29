/**
 * Danh sách khu (ký túc xá, chung cư…) để người dùng chọn nơi mình ở khi đăng ký.
 * DỮ LIỆU MẪU: sau này lấy từ server (GET /areas). Thêm / bớt khu hoặc tòa chỉ cần sửa mảng này.
 * Người dùng chọn khu → chọn tòa trong danh sách của khu → tự nhập số phòng.
 * Mỗi loại khu gọi tên cấp "tòa" và "phòng" khác nhau nên nhãn nằm theo từng khu.
 */
export interface Area {
  id: string;
  name: string;
  /** Nhãn ô cấp 1 (tòa) */
  buildingLabel: string;
  /** Các tòa của khu (người dùng chọn, không gõ) */
  buildings: string[];
  /** Nhãn ô cấp 2 (phòng / căn hộ) — người dùng tự nhập */
  unitLabel: string;
  unitHint: string;
}

const DORM = { buildingLabel: 'Tòa', unitLabel: 'Phòng', unitHint: 'ví dụ 305' };
const APARTMENT = { buildingLabel: 'Tòa', unitLabel: 'Căn hộ', unitHint: 'ví dụ 1204' };

export const AREAS: Area[] = [
  { id: 'ktx-a', name: 'KTX Khu A', ...DORM, buildings: ['A1', 'A2', 'A3', 'A4', 'A5'] },
  { id: 'ktx-b', name: 'KTX Khu B', ...DORM, buildings: ['B1', 'B2', 'B3', 'B4'] },
  { id: 'bcons', name: 'Bcons', ...APARTMENT, buildings: ['Block A', 'Block B', 'Block C', 'Block D'] },
  { id: 'vinhomes-gp', name: 'Vinhomes Grand Park', ...APARTMENT, buildings: ['S1.01', 'S1.02', 'S2.01', 'S2.02', 'S6.01'] },
];
