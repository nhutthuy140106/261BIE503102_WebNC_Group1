import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Ô tìm kiếm trên header -> /search?q=... (giữ được trạng thái khi chia sẻ URL) */
  onSearch(q: string): void {
    this.router.navigate(['/search'], { queryParams: { q: q.trim() || null }, queryParamsHandling: 'merge' });
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/']));
  }
}
