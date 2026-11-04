import { Component, Input } from '@angular/core';
import { PostBank } from '../../../core/models/post';

/** Thông tin nhận chuyển khoản của người bán: mã QR, ngân hàng, số tài khoản, chủ tài khoản */
@Component({
  selector: 'app-bank-pay',
  standalone: false,
  templateUrl: './bank-pay.html',
  styleUrl: './bank-pay.css',
})
export class BankPay {
  @Input({ required: true }) bank!: PostBank;
}
