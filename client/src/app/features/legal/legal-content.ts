/**
 * Nội dung Điều khoản sử dụng và Chính sách quyền riêng tư — BẢN NHÁP để dựng giao diện.
 * Cần luật sư rà soát trước khi chạy thật, và điền tên đơn vị vận hành / thông tin liên hệ.
 * Khi sửa nội dung, tăng LEGAL_VERSION để lưu được người dùng đã đồng ý bản nào.
 */
export const LEGAL_VERSION = '2026-10-21';

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<'terms' | 'privacy', LegalDoc> = {
  terms: {
    title: 'Điều khoản sử dụng',
    intro: 'Khi tạo tài khoản và dùng AntGo, bạn đồng ý với các điều khoản dưới đây.',
    sections: [
      {
        heading: '1. AntGo là gì',
        body: [
          'AntGo là nền tảng kết nối cư dân trong cùng một khu (ký túc xá, chung cư) để mua bán đồ, đặt dịch vụ và nhận việc vặt.',
          'AntGo chỉ cung cấp nơi đăng tin và kết nối. AntGo không phải là người bán, người mua, người thuê hay người làm trong các giao dịch giữa người dùng.',
        ],
      },
      {
        heading: '2. Tài khoản',
        body: [
          'Bạn cung cấp thông tin đúng sự thật (họ tên, số điện thoại, khu, tòa, phòng) và cập nhật khi thay đổi.',
          'Mỗi người dùng một tài khoản. Bạn tự giữ bí mật mật khẩu và chịu trách nhiệm cho mọi hoạt động từ tài khoản của mình.',
        ],
      },
      {
        heading: '3. Giao dịch giữa người dùng',
        body: [
          'Giao dịch diễn ra trực tiếp giữa hai bên. Thanh toán bằng tiền mặt hoặc chuyển khoản; AntGo không giữ tiền và không bảo lãnh thanh toán.',
          'AntGo không bảo đảm chất lượng, nguồn gốc, độ an toàn của hàng hóa, dịch vụ hay công việc. Bạn nên nhắn trao đổi, kiểm tra kỹ trước khi giao dịch và báo cho AntGo khi có vấn đề.',
        ],
      },
      {
        heading: '4. Người bán và người đăng việc',
        body: [
          'Muốn mở gian hàng hoặc đăng việc, bạn phải xác minh danh tính bằng giấy tờ của chính mình.',
          'Bạn tự chịu trách nhiệm về tính đúng sự thật của bài đăng, chất lượng và nguồn gốc hàng hóa, an toàn thực phẩm, nghĩa vụ thuế và các giấy phép theo quy định pháp luật.',
        ],
      },
      {
        heading: '5. Nội dung và hàng hóa bị cấm',
        body: [
          'Không đăng hàng cấm, hàng giả, chất kích thích, vũ khí, nội dung vi phạm pháp luật hoặc thuần phong mỹ tục, lừa đảo, quấy rối, hay chia sẻ thông tin cá nhân của người khác khi chưa được đồng ý.',
        ],
      },
      {
        heading: '6. AntXu và ưu đãi',
        body: [
          'AntXu là điểm thưởng trong ứng dụng, không quy đổi ra tiền và có thể hết hạn. AntGo có quyền điều chỉnh cách nhận và dùng Xu, thông báo trước trong ứng dụng.',
        ],
      },
      {
        heading: '7. Xử lý vi phạm',
        body: [
          'AntGo có quyền gỡ bài, hạn chế hoặc khóa tài khoản khi phát hiện vi phạm điều khoản, thông tin giả mạo hoặc có báo cáo đáng tin cậy.',
        ],
      },
      {
        heading: '8. Giới hạn trách nhiệm',
        body: [
          'Trong phạm vi pháp luật cho phép, AntGo không chịu trách nhiệm cho thiệt hại phát sinh từ giao dịch hoặc tranh chấp giữa người dùng. AntGo sẽ hỗ trợ ghi nhận, liên hệ các bên và phối hợp với cơ quan có thẩm quyền khi được yêu cầu hợp lệ.',
        ],
      },
      {
        heading: '9. Thay đổi điều khoản',
        body: ['AntGo có thể cập nhật điều khoản và sẽ thông báo trong ứng dụng. Bạn tiếp tục sử dụng sau khi cập nhật nghĩa là bạn đồng ý bản mới.'],
      },
      {
        heading: '10. Luật áp dụng',
        body: ['Điều khoản này theo pháp luật Việt Nam. Tranh chấp được ưu tiên thương lượng; nếu không được thì giải quyết tại tòa án có thẩm quyền.'],
      },
    ],
  },
  privacy: {
    title: 'Chính sách quyền riêng tư',
    intro: 'AntGo xử lý dữ liệu cá nhân theo quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân. Bạn đồng ý với chính sách này khi tạo tài khoản.',
    sections: [
      {
        heading: '1. Dữ liệu AntGo thu thập',
        body: [
          'Khi đăng ký: họ tên, số điện thoại, khu / tòa / phòng, mật khẩu (lưu dưới dạng đã mã hóa một chiều).',
          'Khi giao dịch: nội dung đơn hàng, tin nhắn, đánh giá, địa chỉ nhận hàng bạn nhập.',
          'Khi xác minh người bán: họ tên, số CCCD và ảnh giấy tờ, ảnh chân dung.',
        ],
      },
      {
        heading: '2. Mục đích sử dụng',
        body: [
          'Tạo và bảo vệ tài khoản; kết nối bạn với người dùng cùng khu; xử lý đơn hàng và việc; xác minh danh tính người bán; hỗ trợ, giải quyết khiếu nại; phòng chống gian lận; cải thiện ứng dụng.',
        ],
      },
      {
        heading: '3. Ai được xem dữ liệu của bạn',
        body: [
          'Số điện thoại và địa chỉ chính xác chỉ hiện cho bên còn lại khi hai bên có đơn hàng hoặc việc với nhau.',
          'Giấy tờ xác minh chỉ nhân sự được phân quyền của AntGo xem để xác minh, không hiện công khai.',
          'AntGo không bán dữ liệu cá nhân. AntGo chỉ cung cấp cho cơ quan nhà nước khi có yêu cầu hợp lệ theo pháp luật.',
        ],
      },
      {
        heading: '4. Thời gian lưu và bảo mật',
        body: [
          'Dữ liệu được lưu trong thời gian tài khoản còn hoạt động và thêm thời hạn cần thiết theo quy định pháp luật. Giấy tờ xác minh được lưu có giới hạn thời gian và bảo vệ bằng kiểm soát truy cập.',
        ],
      },
      {
        heading: '5. Quyền của bạn',
        body: [
          'Bạn có quyền được biết, truy cập, chỉnh sửa, yêu cầu xóa dữ liệu, rút lại sự đồng ý và khiếu nại về việc xử lý dữ liệu của mình. Một số dữ liệu có thể được giữ lại khi pháp luật yêu cầu.',
        ],
      },
      {
        heading: '6. Liên hệ',
        body: ['Mọi yêu cầu về dữ liệu cá nhân, vui lòng gửi tới: [email liên hệ của đơn vị vận hành].'],
      },
    ],
  },
};
