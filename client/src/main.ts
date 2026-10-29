import { platformBrowser } from '@angular/platform-browser';

/**
 * Tự nhận diện máy chủ trước khi khởi động ứng dụng:
 *  - Máy chủ (`/api/health`) đang chạy → dùng DỮ LIỆU THẬT (có AI chatbot, bản đồ theo dõi, Xu…); phải đăng nhập bằng tài khoản seed.
 *  - Không có máy chủ → dùng dữ liệu mẫu như trước (mở là có dữ liệu ngay).
 * Người dùng vẫn ép được bằng `?mock=0` (dữ liệu thật), `?mock=1` (dữ liệu mẫu); `?mock=auto` quay về tự nhận diện.
 * Phải chạy trước khi nạp `AppModule` vì cờ dữ liệu mẫu được đọc lúc nạp `api.config.ts`.
 */
async function detectServer(): Promise<void> {
  try {
    const q = new URLSearchParams(location.search).get('mock');
    if (q === 'auto') localStorage.removeItem('antgo_mock_pref');
    else if (q === '0' || q === '1' || localStorage.getItem('antgo_mock_pref')) return; // người dùng đã chọn rõ ràng
    const up = await fetch('/api/health', { signal: AbortSignal.timeout(1500) }).then((r) => r.ok, () => false);
    if (up) localStorage.setItem('antgo_mock_off', '1');
    else localStorage.removeItem('antgo_mock_off');
  } catch {
    /* trình duyệt chặn lưu trữ / fetch: để api.config tự quyết định (mặc định dữ liệu mẫu) */
  }
}

detectServer()
  .then(() => import('./app/app-module'))
  .then(({ AppModule }) => platformBrowser().bootstrapModule(AppModule))
  .catch((err) => console.error(err));
