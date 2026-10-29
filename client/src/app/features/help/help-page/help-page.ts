import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';

interface Faq {
  group: string;
  items: { q: string; a: string }[];
}

/** Trợ giúp & hỗ trợ: câu hỏi thường gặp theo nhóm + lối tới hỗ trợ. */
@Component({
  selector: 'app-help-page',
  standalone: false,
  templateUrl: './help-page.html',
  styleUrl: './help-page.css',
})
export class HelpPage {
  protected readonly faqs: Faq[] = [
    {
      group: 'Đặt hàng & dịch vụ',
      items: [
        { q: 'Đặt xong thì bao lâu người bán xác nhận?', a: 'Người bán thường phản hồi trong vài phút đến vài giờ. Khi chưa được xác nhận, bạn có thể hủy đơn ngay trong trang chi tiết đơn.' },
        { q: 'Tôi muốn đổi giờ hoặc đổi địa chỉ thì làm sao?', a: 'Hãy nhắn tin trực tiếp cho người bán trong Messenger để thỏa thuận. Hai bên đồng ý là được, AntGo không có bước đổi lịch riêng.' },
        { q: 'Làm sao hủy đơn?', a: 'Vào Đơn hàng, mở đơn muốn hủy rồi bấm Hủy đơn (khi người bán chưa bắt đầu) hoặc Yêu cầu hủy (khi họ đã bắt đầu, cần họ đồng ý).' },
      ],
    },
    {
      group: 'Thanh toán',
      items: [
        { q: 'AntGo có giữ tiền của tôi không?', a: 'Không. Bạn trả trực tiếp cho người bán bằng tiền mặt hoặc chuyển khoản khi nhận hàng hoặc dịch vụ. AntGo không giữ tiền và không thu hộ.' },
        { q: 'Giá cuối khác giá lúc đặt, tôi có phải trả không?', a: 'Với dịch vụ tính theo kg hoặc cần kiểm tra, người bán sẽ báo giá cuối. Bạn xem và bấm Duyệt giá thì họ mới làm tiếp; không đồng ý thì có thể từ chối.' },
      ],
    },
    {
      group: 'Trả hàng, hoàn tiền & khiếu nại',
      items: [
        { q: 'Tôi nhận hàng không đúng mô tả thì sao?', a: 'Trong thời hạn (2 giờ với đồ ăn, 24 giờ với đồ dùng và dịch vụ) bạn bấm Trả hàng/Hoàn tiền hoặc Báo vấn đề, chọn lý do và gửi ảnh. Người bán sẽ phản hồi trực tiếp với bạn.' },
        { q: 'Khi nào dùng Báo cáo vấn đề với đơn?', a: 'Khi hai bên không thỏa thuận được, hoặc có hành vi không phù hợp. Báo cáo gửi tới AntGo để xem xét, không tự động hoàn tiền.' },
      ],
    },
    {
      group: 'AntXu & voucher',
      items: [
        { q: 'Làm sao nhận AntXu?', a: 'Bạn nhận Xu khi hoàn thành đơn từ 30.000đ, đánh giá có nhận xét và hoàn thành việc đã nhận. Chi tiết ở trang AntXu.' },
        { q: 'Xu có hết hạn không?', a: 'Có, Xu hết hạn sau 6 tháng kể từ ngày nhận. Xu không mua bằng tiền và không đổi ra tiền.' },
      ],
    },
    {
      group: 'Việc làm',
      items: [
        { q: 'Gửi đề nghị có nghĩa là đã nhận việc chưa?', a: 'Chưa. Người đăng việc sẽ xem các đề nghị và chọn người. Bạn nhận thông báo khi được chọn, lúc đó địa chỉ chính xác mới hiện ra.' },
        { q: 'Tôi chưa nhận được tiền công thì làm gì?', a: 'Hãy nhắn người đăng trước, đa số chỉ là quên. Sau 3 ngày vẫn chưa nhận được thì báo cáo cho AntGo trong trang đơn.' },
      ],
    },
    {
      group: 'An toàn',
      items: [
        { q: 'Vì sao tôi không thể gửi số điện thoại trong hỏi đáp công khai?', a: 'Để tránh bị lợi dụng. Hãy trao đổi qua Messenger của AntGo, nơi mọi tin nhắn được lưu lại nếu cần xem xét.' },
      ],
    },
  ];

  /** Form góp ý (template-driven + [(ngModel)]): demo lưu ở trình duyệt, chưa gửi tới máy chủ. */
  protected fb = { topic: '', text: '' };
  protected sent = false;

  protected send(f: NgForm): void {
    if (f.invalid) return;
    try {
      const all = JSON.parse(localStorage.getItem('antgo_feedback') ?? '[]') as unknown[];
      localStorage.setItem('antgo_feedback', JSON.stringify([...all, { ...this.fb, at: new Date().toISOString() }]));
    } catch {
      /* trình duyệt chặn lưu: vẫn báo đã ghi nhận trong phiên */
    }
    this.sent = true;
    f.resetForm({ topic: '', text: '' });
  }
}
