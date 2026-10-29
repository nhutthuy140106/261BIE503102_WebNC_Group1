import { Component, OnInit, inject, signal } from '@angular/core';
import { Post } from '../../../core/models/post';
import { REPORT_REASON_LABEL, Report } from '../../../core/models/social';
import { PostService } from '../../../core/services/post';
import { ReportService } from '../../../core/services/report';

const HIDDEN_KEY = 'antgo_admin_hidden';

/**
 * Quản trị (DEMO, chỉ role admin): xử lý báo cáo và ẩn/hiện bài đăng.
 * Danh sách người dùng chờ API quản trị của server; ẩn bài hiện lưu ở trình duyệt (mock).
 */
@Component({
  selector: 'app-admin-page',
  standalone: false,
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.css',
})
export class AdminPage implements OnInit {
  private readonly reportsApi = inject(ReportService);
  private readonly postsApi = inject(PostService);

  protected readonly reports = signal<Report[]>([]);
  protected readonly posts = signal<Post[]>([]);
  protected readonly hidden = signal<string[]>(this.readHidden());
  protected readonly reason = REPORT_REASON_LABEL;

  ngOnInit(): void {
    this.reportsApi.list().subscribe((r) => this.reports.set(r));
    this.postsApi.getPosts().subscribe((p) => this.posts.set(p));
  }

  protected resolve(r: Report): void {
    this.reportsApi.resolve(r._id).subscribe(() => this.reports.update((all) => all.map((x) => (x._id === r._id ? { ...x, state: 'resolved' } : x))));
  }

  protected isHidden(id: string): boolean {
    return this.hidden().includes(id);
  }

  protected toggle(id: string): void {
    this.hidden.update((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(this.hidden()));
    } catch {
      /* trình duyệt chặn lưu: giữ trong phiên */
    }
  }

  private readHidden(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
}
