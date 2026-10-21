/**
 * Cấu hình nguồn dữ liệu.
 * - USE_MOCK = true : đọc JSON tĩnh trong public/datasets (chưa có backend).
 * - USE_MOCK = false: gọi API Express qua proxy.conf.json (/api -> http://localhost:3000).
 * Gắn API thật dần (planning 4.2): giữ USE_MOCK = true và bật từng service trong MOCK_OVERRIDES,
 * ví dụ `{ address: false }` khi endpoint /me/addresses đã "Xong" trong api-buyer-job.md.
 */
/**
 * Mặc định gọi API thật. Người chỉ làm giao diện (chưa chạy backend) bật dữ liệu mẫu bằng cách mở
 * `http://localhost:4200/?mock=1` (nhớ trong trình duyệt); `?mock=0` để tắt. Không cần sửa mã.
 */
function mockFlag(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('mock');
    if (q === '1') localStorage.setItem('antgo_mock', '1');
    if (q === '0') localStorage.removeItem('antgo_mock');
    return localStorage.getItem('antgo_mock') === '1';
  } catch {
    return false; // trình duyệt chặn localStorage: dùng API thật
  }
}
export const USE_MOCK = mockFlag();
export const API_BASE = '/api';
export const DATASET_BASE = '/datasets';

export type ServiceName =
  | 'auth' | 'post' | 'order' | 'offer' | 'address' | 'saved' | 'question'
  | 'review' | 'chat' | 'seller' | 'notification' | 'report' | 'upload' | 'recommend' | 'xu';

/** `false` = service đó gọi API thật dù USE_MOCK còn bật; `true` = ép mock. */
export const MOCK_OVERRIDES: Partial<Record<ServiceName, boolean>> = {
  // Khu Bán & Đăng việc chưa có endpoint thật (decisions F5) → vẫn mock
  seller: true,
};

export function useMock(name: ServiceName): boolean {
  return MOCK_OVERRIDES[name] ?? USE_MOCK;
}
