import { Component, Input, signal } from '@angular/core';
import { PostBank } from '../../../core/models/post';
import { BANK_LIST } from '../../../features/seller/seller-post-form/banks';

/**
 * Thông tin nhận chuyển khoản của người bán: mã QR, ngân hàng, số tài khoản, chủ tài khoản.
 * Có `amount` + `content` (số tiền, mã đơn) thì tự sinh mã VietQR điền sẵn hai thông tin đó (img.vietqr.io, ảnh thôi — AntGo không giữ tiền).
 * Không sinh được (thiếu số tiền, ngân hàng lạ, rớt mạng) thì dùng QR người bán tải lên, và luôn có số tài khoản dạng chữ bên cạnh.
 */
@Component({
  selector: 'app-bank-pay',
  standalone: false,
  templateUrl: './bank-pay.html',
  styleUrl: './bank-pay.css',
})
export class BankPay {
  @Input({ required: true }) bank!: PostBank;
  /** Số tiền khách cần chuyển (đ) */
  @Input() amount?: number;
  /** Nội dung chuyển khoản, thường là mã đơn */
  @Input() content?: string;

  /** Ảnh QR tự sinh lỗi tải (mất mạng…) thì rơi về QR người bán tải lên */
  protected readonly genFailed = signal(false);

  /** Mã ngân hàng theo VietQR; tìm theo tên ngắn lưu trong bài (Vietcombank → VCB) */
  private get bankCode(): string | undefined {
    const n = this.bank.bankName?.trim().toLowerCase();
    return BANK_LIST.find((b) => b.short.toLowerCase() === n || b.code.toLowerCase() === n)?.code;
  }

  protected get generated(): string | null {
    const code = this.bankCode;
    const no = this.bank.no?.replace(/\s/g, '');
    if (!code || !no || !this.amount || this.amount <= 0) return null;
    const q = new URLSearchParams({ amount: String(Math.round(this.amount)), accountName: this.bank.holder ?? '' });
    if (this.content) q.set('addInfo', this.content);
    return `https://img.vietqr.io/image/${code}-${no}-compact2.png?${q.toString()}`;
  }

  protected get qrSrc(): string | null {
    const g = this.generated;
    return g && !this.genFailed() ? g : this.bank.qr || null;
  }

  /** Đang hiện QR tự sinh (đã điền sẵn tiền và nội dung) */
  protected get isGenerated(): boolean {
    return !!this.generated && !this.genFailed();
  }
}
