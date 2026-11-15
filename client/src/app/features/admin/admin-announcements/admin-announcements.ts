import { Component, OnInit, inject, signal } from '@angular/core';
import { Announcement, AdminApi, msgOf } from '../../../core/services/admin-api';

/** Thông báo hệ thống: gửi tới toàn khu hoặc một khu, hiện trong chuông thông báo của người dùng; lưu lịch sử đã gửi. */
@Component({
  selector: 'app-admin-announcements',
  standalone: false,
  templateUrl: './admin-announcements.html',
  styleUrls: ['../admin-shared.css'],
})
export class AdminAnnouncements implements OnInit {
  private readonly api = inject(AdminApi);
  protected readonly rows = signal<Announcement[] | null>(null);
  protected areaOptions(): { value: unknown; label: string }[] {
    return [{ value: 'all', label: 'Toàn khu (mọi người dùng)' }, ...this.areas().map((a) => ({ value: a, label: 'Chỉ khu ' + a }))];
  }
  protected readonly areas = signal<string[]>(['A', 'B', 'C', 'D']);
  protected readonly error = signal('');
  protected readonly ok = signal('');
  protected readonly busy = signal(false);
  protected readonly confirming = signal(false);
  protected title = '';
  protected body = '';
  protected area = 'all';
  protected formErr = '';

  ngOnInit(): void {
    this.api.settings().subscribe({ next: (s) => this.areas.set(s.areas), error: () => undefined });
    this.load();
  }

  protected ask(): void {
    if (this.title.trim().length < 3) { this.formErr = 'Tiêu đề tối thiểu 3 ký tự.'; return; }
    this.formErr = '';
    this.confirming.set(true);
  }

  protected send(): void {
    this.confirming.set(false);
    this.busy.set(true);
    this.ok.set('');
    this.error.set('');
    this.api.announce({ title: this.title.trim(), body: this.body.trim(), area: this.area }).subscribe({
      next: (a) => { this.busy.set(false); this.ok.set(`Đã gửi tới ${a.recipients} người.`); this.title = ''; this.body = ''; this.load(); },
      error: (e: unknown) => { this.busy.set(false); this.error.set(msgOf(e)); },
    });
  }

  private load(): void {
    this.api.announcements().subscribe({ next: (r) => this.rows.set(r), error: (e: unknown) => { this.rows.set([]); this.error.set(msgOf(e, 'Không tải được lịch sử.')); } });
  }
}
