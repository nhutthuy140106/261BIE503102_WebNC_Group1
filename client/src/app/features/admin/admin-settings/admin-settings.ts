import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminApi, Settings, msgOf } from '../../../core/services/admin-api';
import { AuthService } from '../../../core/services/auth';

type Key = keyof Settings;

/** Cài đặt hệ thống (từ khóa cấm, khu vực, danh mục) và xuất dữ liệu CSV. Mỗi mục nhập một dòng một giá trị. */
@Component({
  selector: 'app-admin-settings',
  standalone: false,
  templateUrl: './admin-settings.html',
  styleUrls: ['../admin-shared.css'],
})
export class AdminSettings implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly me = inject(AuthService).currentUser;
  protected readonly loaded = signal(false);
  protected readonly error = signal('');
  protected readonly ok = signal('');
  protected readonly busy = signal(false);
  protected text: Record<Key, string> = { bannedKeywords: '', areas: '', categories: '' };

  ngOnInit(): void {
    this.api.settings().subscribe({
      next: (s) => { this.fill(s); this.loaded.set(true); },
      error: (e: unknown) => this.error.set(msgOf(e, 'Không tải được cài đặt.')),
    });
  }

  protected isAdmin(): boolean { return this.me()?.role === 'admin'; }
  protected count(k: Key): number { return this.lines(k).length; }

  protected save(k: Key, label: string): void {
    const list = this.lines(k);
    if ((k === 'areas' || k === 'categories') && !list.length) { this.error.set(`Danh sách ${label} không được để trống.`); return; }
    this.busy.set(true);
    this.ok.set('');
    this.error.set('');
    this.api.saveSettings({ [k]: list }).subscribe({
      next: (s) => { this.busy.set(false); this.fill(s); this.ok.set(`Đã lưu ${label}.`); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  protected download(what: 'users' | 'orders' | 'reports'): void {
    this.busy.set(true);
    this.error.set('');
    this.api.exportCsv(what).subscribe({
      next: () => { this.busy.set(false); this.ok.set('Đã tải file. Thao tác xuất dữ liệu được ghi vào nhật ký.'); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  private lines(k: Key): string[] {
    return this.text[k].split('\n').map((s) => s.trim()).filter(Boolean);
  }
  private fill(s: Settings): void {
    this.text = { bannedKeywords: s.bannedKeywords.join('\n'), areas: s.areas.join('\n'), categories: s.categories.join('\n') };
  }
}
