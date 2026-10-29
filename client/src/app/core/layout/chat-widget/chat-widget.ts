import { Router } from '@angular/router';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { AppError } from '../../models/api';
import { AssistantCard, AssistantReply, AssistantService, AssistantTurn, trimHistory } from '../../services/assistant';
import { AuthService } from '../../services/auth';
import { createSlug } from '../../utils/slug-helper';

interface Bubble extends AssistantTurn {
  cards?: AssistantCard[];
  action?: AssistantReply['action'];
  error?: boolean;
}

const SUGGESTIONS = ['Trưa nay ăn gì, dưới 50k?', 'Có đồ uống mát không?', 'Cần người dọn nhà', 'Việc vặt kiếm thêm'];
/** Nút gợi ý nhanh luôn hiện trên ô nhập (khớp công cụ của trợ lý: chọn hộ, ngân sách, đơn của tôi). */
const QUICK = ['Chọn giúp tôi món', 'Ngân sách 150k cho cả ngày', 'Đơn của tôi', 'Rẻ hơn', 'Đồ uống mát'];
const MAX_SAVED = 30;

/** Chatbot tư vấn nổi ở góc phải: nút con kiến → khung chat. Cần đăng nhập (mỗi lượt hỏi tốn lượt API). */
@Component({
  selector: 'app-chat-widget',
  standalone: false,
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
})
export class ChatWidget {
  private readonly assistant = inject(AssistantService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  @ViewChild('list') private list?: ElementRef<HTMLElement>;

  protected readonly open = signal(false);
  protected readonly busy = signal(false);
  protected readonly bubbles = signal<Bubble[]>([]);
  protected readonly suggestions = SUGGESTIONS;
  protected readonly quick = QUICK;
  protected draft = '';
  protected readonly empty = computed(() => this.bubbles().length === 0);

  constructor() {
    // Lịch sử chat lưu theo từng tài khoản trong trình duyệt; đổi tài khoản/đăng xuất thì nạp lại hoặc xóa khỏi màn hình
    effect(() => {
      const u = this.auth.currentUser();
      this.bubbles.set(u ? this.load(u._id) : []);
    });
    effect(() => {
      const u = this.auth.currentUser();
      const list = this.bubbles();
      if (u) this.save(u._id, list);
    });
  }

  private key(uid: string): string {
    return `antgo_chat_${uid}`;
  }

  private load(uid: string): Bubble[] {
    try {
      const raw = JSON.parse(localStorage.getItem(this.key(uid)) ?? '[]') as Bubble[];
      return Array.isArray(raw) ? raw.filter((b) => (b.role === 'user' || b.role === 'assistant') && typeof b.content === 'string') : [];
    } catch {
      return [];
    }
  }

  private save(uid: string, list: Bubble[]): void {
    try {
      if (list.length) localStorage.setItem(this.key(uid), JSON.stringify(list.slice(-MAX_SAVED)));
      else localStorage.removeItem(this.key(uid));
    } catch {
      /* trình duyệt chặn lưu: bỏ qua, chat vẫn dùng được */
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) this.scrollDown();
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
  }

  link(c: AssistantCard): string[] {
    return [c.kind === 'job' ? '/posts/job' : '/posts', c.slug || createSlug(c.title, c.id)];
  }

  go(to: string): void {
    this.close();
    void this.router.navigateByUrl(to);
  }

  clear(): void {
    this.bubbles.set([]);
  }

  send(text = this.draft): void {
    const t = text.trim().slice(0, 500);
    if (!t || this.busy() || !this.auth.isLoggedIn()) return;
    this.draft = '';
    this.bubbles.update((b) => [...b, { role: 'user', content: t }]);
    this.busy.set(true);
    this.scrollDown();
    // Lịch sử gửi lên chỉ gồm chữ (bỏ bong bóng lỗi), không gửi thẻ bài
    const history = trimHistory(this.bubbles().filter((b) => !b.error).map(({ role, content }) => ({ role, content })));
    this.assistant.ask(history).subscribe({
      next: (r) => {
        this.bubbles.update((b) => [...b, { role: 'assistant', content: r.reply, cards: r.cards, action: r.action }]);
        // "Chưa biết ăn gì" → tự chuyển sang trang Quay món sau một nhịp để người dùng kịp đọc (nút bên dưới để đi ngay)
        if (r.action?.type === 'navigate') setTimeout(() => this.go(r.action!.to), 1800);
        this.busy.set(false);
        this.scrollDown();
      },
      error: (e: Error) => {
        const msg = e instanceof AppError && e.status === 401 ? 'Phiên đăng nhập đã hết, hãy đăng nhập lại để hỏi tiếp.' : e.message || 'Trợ lý tạm thời không phản hồi.';
        this.bubbles.update((b) => [...b, { role: 'assistant', content: msg, error: true }]);
        this.busy.set(false);
        this.scrollDown();
      },
    });
  }

  private scrollDown(): void {
    setTimeout(() => this.list?.nativeElement.scrollTo({ top: this.list.nativeElement.scrollHeight, behavior: 'smooth' }), 30);
  }
}
