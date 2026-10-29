import { Component } from '@angular/core';

/** Khung Quản trị: thanh bên + vùng nội dung. Chỉ vào được khi qua adminGuard. */
@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {}
