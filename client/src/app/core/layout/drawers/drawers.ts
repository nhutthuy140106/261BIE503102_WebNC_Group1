import { Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Post, PostKind } from '../../models/post';
import { DrawerService } from '../../services/drawer';
import { PostService } from '../../services/post';
import { SavedService } from '../../services/saved';
import { ToastService } from '../../services/toast';
import { XuService } from '../../services/xu';
import { createSlug } from '../../utils/slug-helper';

type SavedFilter = 'all' | PostKind;

/** Ngăn kéo bên phải dùng chung mọi trang: Đã lưu và AntXu (bê từ design/mockups/shared/drawers.js). */
@Component({
  selector: 'app-drawers',
  standalone: false,
  templateUrl: './drawers.html',
  styleUrl: './drawers.css',
})
export class Drawers {
  protected readonly drawer = inject(DrawerService);
  protected readonly saved = inject(SavedService);
  protected readonly xu = inject(XuService);
  private readonly posts = inject(PostService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly filters: { key: SavedFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'food', label: 'Đồ ăn & uống' },
    { key: 'goods', label: 'Đồ dùng' },
    { key: 'service', label: 'Dịch vụ' },
    { key: 'job', label: 'Việc làm' },
  ];
  protected readonly filter = signal<SavedFilter>('all');
  private readonly loaded = signal<Post[]>([]);
  /** Thứ tự theo lúc lưu (mới nhất trước), lọc theo nhóm đang chọn. */
  protected readonly rows = computed(() => {
    const byId = new Map(this.loaded().map((p) => [p._id, p]));
    const f = this.filter();
    return [...this.saved.ids()]
      .reverse()
      .map((id) => byId.get(id))
      .filter((p): p is Post => !!p && (f === 'all' || p.kind === f));
  });
  protected readonly earnState = computed(() =>
    this.xu.earnRules.map((e) => {
      const n = this.xu.count(e.key === 'welcome' ? 'welcome' : e.key + ':');
      return { ...e, n, done: !!e.once && n > 0 };
    }),
  );

  constructor() {
    // mở ngăn Đã lưu (hoặc đổi danh sách) thì nạp lại bài theo id đã lưu
    effect(() => {
      const open = this.drawer.open();
      const ids = this.saved.ids();
      if (open === 'saved') untracked(() => this.posts.getByIds(ids).subscribe((l) => this.loaded.set(l)));
    });
  }

  protected link(p: Post): string[] {
    return p.kind === 'job' ? ['/posts/job', createSlug(p.title, p._id)] : ['/posts', createSlug(p.title, p._id)];
  }

  protected open(p: Post): void {
    if (p.closed) return;
    this.drawer.close();
    this.router.navigate(this.link(p));
  }

  protected goAll(): void {
    this.drawer.close();
  }

  protected redeem(cid: string, title: string, cost: number): void {
    if (this.xu.redeem(cid)) this.toast.show(`Đã đổi ${title} · −${cost} Xu`);
  }

  protected day(t: number): string {
    return new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.drawer.close();
  }
}
