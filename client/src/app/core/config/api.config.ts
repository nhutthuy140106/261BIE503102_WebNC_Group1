/**
 * Cấu hình nguồn dữ liệu.
 * - USE_MOCK = true : đọc JSON tĩnh trong public/datasets (chưa có backend).
 * - USE_MOCK = false: gọi API Express qua proxy.conf.json (/api -> http://localhost:3000).
 * Gắn API thật dần (planning 4.2): giữ USE_MOCK = true và bật từng service trong MOCK_OVERRIDES,
 * ví dụ `{ address: false }` khi endpoint /me/addresses đã "Xong" trong api-buyer-job.md.
 */
/**
 * Tự nhận diện (main.ts): có máy chủ → dữ liệu thật, không có → DỮ LIỆU MẪU (public/datasets).
 * Ép thủ công: `?mock=0` (API thật), `?mock=1` (dữ liệu mẫu), `?mock=auto` (về tự nhận diện). Không cần sửa mã.
 */
function mockFlag(): boolean {
  try {
    const q = new URLSearchParams(location.search).get('mock');
    // ?mock=0|1 là lựa chọn rõ ràng của người dùng: ghi nhớ (antgo_mock_pref) để không bị tự nhận diện máy chủ ghi đè (xem main.ts)
    if (q === '1') {
      localStorage.removeItem('antgo_mock_off');
      localStorage.setItem('antgo_mock_pref', '1');
    }
    if (q === '0') {
      localStorage.setItem('antgo_mock_off', '1');
      localStorage.setItem('antgo_mock_pref', '1');
    }
    return localStorage.getItem('antgo_mock_off') !== '1';
  } catch {
    return true; // trình duyệt chặn localStorage: dùng dữ liệu mẫu
  }
}
export const USE_MOCK = mockFlag();
export const API_BASE = '/api';
export const DATASET_BASE = '/datasets';

export type ServiceName =
  | 'auth' | 'post' | 'order' | 'offer' | 'address' | 'saved' | 'question'
  | 'review' | 'chat' | 'seller' | 'notification' | 'report' | 'upload' | 'recommend' | 'xu' | 'assistant' | 'admin';

/** `false` = service đó gọi API thật dù USE_MOCK còn bật; `true` = ép mock. */
export const MOCK_OVERRIDES: Partial<Record<ServiceName, boolean>> = {
  // Khu Bán & Đăng việc chưa có endpoint thật (decisions F5) → vẫn mock
  seller: true,
};

export function useMock(name: ServiceName): boolean {
  return MOCK_OVERRIDES[name] ?? USE_MOCK;
}
