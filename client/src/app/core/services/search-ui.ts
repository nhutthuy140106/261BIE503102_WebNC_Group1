import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast';

const DEFAULT_PLACEHOLDER = 'Tìm món ăn, đồ dùng, dịch vụ hoặc việc làm';

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

/**
 * Trạng thái dùng chung của hai ô tìm kiếm (ô lớn ở trang chủ và ô gọn trên header): luôn cùng nội dung.
 * Có tìm bằng giọng nói (Web Speech, tiếng Việt — chạy thật trên Chrome / Edge) và bằng hình ảnh (mô phỏng).
 * Trang chủ: ô lớn còn thấy thì ô gọn trên header ẩn đi, cuộn qua mới trượt lên.
 */
@Injectable({ providedIn: 'root' })
export class SearchUiService {
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly text = signal('');
  readonly recording = signal(false);
  /** Đang chờ kết quả tìm theo ảnh (tự chạy ngay khi chọn/thả ảnh) */
  readonly searching = signal(false);
  readonly placeholder = computed(() => (this.searching() ? 'Đang tìm theo ảnh…' : this.recording() ? 'Đang nghe… bạn nói đi' : this.imageUrl() ? 'Thêm mô tả (không bắt buộc)…' : DEFAULT_PLACEHOLDER));
  /** Ảnh đang dùng để tìm (object URL) — hiện thành viên nhỏ trong ô lớn */
  readonly imageUrl = signal<string | null>(null);
  /** Ô lớn ở trang chủ đang hiện → ẩn ô gọn trên header */
  readonly hideCompact = signal(false);

  private rec: SpeechRec | null = null;
  private picker?: HTMLInputElement;
  private imgTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRun = { q: '', at: 0 };

  /** Bấm mic: bắt đầu nghe; bấm lần nữa thì dừng. */
  voice(): void {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return this.toast.show('Trình duyệt này chưa hỗ trợ tìm bằng giọng nói. Hãy thử Chrome hoặc Edge.', 3200);
    if (this.rec) {
      this.rec.stop(); // dừng nói → onend sẽ tự tìm
      return;
    }
    const rec = new SR();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    this.rec = rec;
    this.recording.set(true);
    this.text.set('');
    rec.onresult = (e) => this.text.set(Array.from(e.results).map((r) => r[0].transcript).join(''));
    let failed = false;
    rec.onerror = (e) => {
      failed = true;
      this.toast.show(e.error === 'not-allowed' ? 'Bạn cần cho phép dùng micro để tìm bằng giọng nói.' : 'Mình chưa nghe rõ, bạn thử lại nhé', 3200);
    };
    rec.onend = () => {
      const cancelled = this.rec !== rec; // bấm ✕ → không tự tìm
      this.rec = null;
      this.recording.set(false);
      if (cancelled || failed) return;
      const q = this.text().trim();
      if (q) this.run(q);
      else this.toast.show('Mình chưa nghe rõ, bạn thử lại nhé', 3200);
    };
    rec.start();
  }

  /** Bấm camera: chọn ảnh (hoặc kéo thả vào ô lớn). Mô phỏng: chưa có máy chủ nhận dạng ảnh. */
  pickImage(): void {
    if (!this.picker) {
      this.picker = document.createElement('input');
      this.picker.type = 'file';
      this.picker.accept = 'image/*';
      this.picker.onchange = () => {
        const f = this.picker?.files?.[0];
        if (f) this.useImage(f);
        if (this.picker) this.picker.value = '';
      };
    }
    this.picker.click();
  }

  useImage(file: File): void {
    if (!file.type.startsWith('image/')) return;
    const old = this.imageUrl();
    if (old) URL.revokeObjectURL(old);
    this.imageUrl.set(URL.createObjectURL(file));
    this.text.set('');
    // Tự tìm ngay khi có ảnh (mô phỏng: chưa có máy chủ nhận dạng ảnh)
    this.searching.set(true);
    if (this.imgTimer) clearTimeout(this.imgTimer);
    this.imgTimer = setTimeout(() => {
      this.imgTimer = null;
      this.searching.set(false);
      this.run('');
      this.toast.show('Bản mẫu: tìm bằng hình ảnh chưa có máy chủ nhận dạng, đang hiện bài trong khu.', 3200);
    }, 1200);
  }

  /** Tìm ngay (giọng nói / ảnh); bỏ qua lần gọi trùng trong 1,5 giây. */
  run(q: string): void {
    const now = Date.now();
    if (q === this.lastRun.q && now - this.lastRun.at < 1500) return;
    this.lastRun = { q, at: now };
    void this.router.navigate(['/search'], { queryParams: { q: q || null }, queryParamsHandling: 'merge' });
  }

  /** Nút ✕: hủy nghe / hủy tìm ảnh / bỏ ảnh */
  cancel(): void {
    const rec = this.rec;
    this.rec = null;
    rec?.stop();
    this.recording.set(false);
    if (this.imgTimer) clearTimeout(this.imgTimer);
    this.imgTimer = null;
    this.searching.set(false);
    this.clearImage();
  }

  clearImage(): void {
    const old = this.imageUrl();
    if (old) URL.revokeObjectURL(old);
    this.imageUrl.set(null);
  }
}
