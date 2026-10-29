import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LEGAL_DOCS, LEGAL_VERSION, LegalDoc } from '../legal-content';

/** Trang đọc Điều khoản / Chính sách; route.data.doc chọn nội dung. */
@Component({
  selector: 'app-legal-page',
  standalone: false,
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.css',
})
export class LegalPage {
  protected readonly doc: LegalDoc = LEGAL_DOCS[inject(ActivatedRoute).snapshot.data['doc'] as 'terms' | 'privacy'];
  protected readonly version = LEGAL_VERSION;
}
