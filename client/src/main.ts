import { platformBrowser } from '@angular/platform-browser';

/**
 * Chọn nguồn dữ liệu trước khi khởi động ứng dụng:
 *  - MẶC ĐỊNH: DỮ LIỆU MẪU (public/datasets) — mở là có đủ nội dung, không cần máy chủ hay MongoDB.
 *  - `?mock=0`: dùng DỮ LIỆU THẬT từ máy chủ (phải đăng nhập bằng tài khoản seed) — được ghi nhớ.
 *  - `?mock=1`: quay lại dữ liệu mẫu. `?mock=auto`: tự nhận diện máy chủ (có máy chủ → dữ liệu thật).
 * Phải chạy trước khi nạp `AppModule` vì cờ dữ liệu mẫu được đọc lúc nạp `api.config.ts`.
 */
async function detectServer(): Promise<void> {
  try {
    const q = new URLSearchParams(location.search).get('mock');
    if (q === 'auto') {
      localStorage.removeItem('antgo_mock_pref');
      localStorage.setItem('antgo_mock_auto', '1');
    }
    if (q === '0' || q === '1') localStorage.removeItem('antgo_mock_auto');
    if (q === '0' || q === '1') return; // lựa chọn rõ ràng: api.config.ts tự ghi nhớ
    if (localStorage.getItem('antgo_mock_auto') === '1') {
      const up = await fetch('/api/health', { signal: AbortSignal.timeout(1500) }).then((r) => r.ok, () => false);
      if (up) localStorage.setItem('antgo_mock_off', '1');
      else localStorage.removeItem('antgo_mock_off');
    } else if (!localStorage.getItem('antgo_mock_pref')) {
      // chưa ai chọn gì: bỏ cờ "dữ liệu thật" do bản tự nhận diện cũ để lại
      localStorage.removeItem('antgo_mock_off');
    }
  } catch {
    /* trình duyệt chặn lưu trữ / fetch: để api.config tự quyết định (mặc định dữ liệu mẫu) */
  }
}

detectServer()
  .then(() => import('./app/app-module'))
  .then(({ AppModule }) => platformBrowser().bootstrapModule(AppModule))
  .catch((err) => console.error(err));
