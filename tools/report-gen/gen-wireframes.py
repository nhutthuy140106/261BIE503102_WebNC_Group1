# -*- coding: utf-8 -*-
# Sinh design/wireframes.html: khung dây (wireframe) xám, không màu, cho client và admin.
# Chạy: python -I -X utf8 gen-wireframes.py   → ghi ../../design/wireframes.html ; chụp ảnh bằng chup-wireframes.mjs
import os, html
E = lambda t: html.escape(t, quote=False)

def hr_():
    return '<hr>'
def lines(n, w=None):
    ws = w or [100, 92, 96, 70, 85, 60]
    return '<div class="ln">' + ''.join('<i style="width:%d%%"></i>' % ws[i % len(ws)] for i in range(n)) + '</div>'
def img(label='Ảnh', h=160, w=None):
    st = 'height:%dpx;' % h + ('width:%dpx;' % w if w else '')
    return '<div class="img" style="%s"><svg preserveAspectRatio="none" viewBox="0 0 100 100"><line x1="0" y1="0" x2="100" y2="100"/><line x1="100" y1="0" x2="0" y2="100"/></svg><span>%s</span></div>' % (st, E(label))
def blk(label='', h=None, cls='', style=''):
    s = (('height:%dpx;' % h) if h else '') + style
    return '<div class="blk %s" style="%s">%s</div>' % (cls, s, E(label))
def btn(label, primary=False, cls=''):
    return '<span class="btn %s %s">%s</span>' % ('p' if primary else '', cls, E(label))
def h(t, n=2):
    return '<div class="h%d">%s</div>' % (n, E(t))
def row(*items, gap=14, cls='', style=''):
    return '<div class="row %s" style="gap:%dpx;%s">%s</div>' % (cls, gap, style, ''.join(items))
def col(*items, gap=12, cls='', style=''):
    return '<div class="col %s" style="gap:%dpx;%s">%s</div>' % (cls, gap, style, ''.join(items))
def grid(n, items, gap=18, style=''):
    return '<div class="gridw" style="grid-template-columns:repeat(%d,1fr);gap:%dpx;%s">%s</div>' % (n, gap, style, ''.join(items))
def card(label='Bài đăng', ih=130):
    return '<div class="card">' + img('Ảnh bài', ih) + '<div class="cb">' + blk('Tên bài đăng', 16, 'bar') + blk('Người bán · khoảng cách', 12, 'bar s') + blk('45.000đ', 14, 'bar w40') + '</div></div>'
def jcard():
    return '<div class="card job"><div class="cb">' + blk('Người đăng · thời gian', 12, 'bar s') + blk('Tên việc cần làm', 16, 'bar') + lines(2) + blk('150.000đ', 20, 'bar w40') + blk('Làm lúc · Đang mở · n đề nghị', 12, 'bar s') + '</div></div>'
def tabs(*names, on=0):
    return '<div class="tabs">' + ''.join('<span class="%s">%s</span>' % ('on' if i == on else '', E(n)) for i, n in enumerate(names)) + '</div>'
def field(label, ph='', tall=False):
    return '<div class="fld"><b>%s</b><div class="inp %s">%s</div></div>' % (E(label), 'tall' if tall else '', E(ph))
def table(headers, rows_n=5, widths=None, firstimg=False):
    n = len(headers)
    wt = widths or [1] * n
    tpl = ' '.join('%sfr' % w for w in wt)
    out = '<div class="tbl"><div class="tr th" style="grid-template-columns:%s">%s</div>' % (tpl, ''.join('<span>%s</span>' % E(x) for x in headers))
    for r in range(rows_n):
        out += '<div class="tr" style="grid-template-columns:%s">' % tpl
        for i in range(n):
            if i == 0 and firstimg:
                out += '<span class="cellimg"><i class="sq"></i><i class="b" style="width:70%"></i></span>'
            elif i == n - 1 and headers[i] == '':
                out += '<span><i class="pillb"></i></span>'
            else:
                out += '<span><i class="b" style="width:%d%%"></i></span>' % (60 + (r * 7 + i * 11) % 35)
        out += '</div>'
    return out + '</div>'
def stat(label):
    return '<div class="stat">' + blk(label, 12, 'bar s') + blk('000', 26, 'bar w40') + '</div>'
def chart(label, h=170):
    return '<div class="chart"><div class="ch">%s</div><div class="bars">%s</div></div>' % (E(label), ''.join('<i style="height:%d%%"></i>' % v for v in (35, 60, 45, 80, 55, 30, 70)))

def client_header(active=''):
    nav = ''.join('<span>%s</span>' % n for n in ('Trang chủ', 'Đơn hàng', 'Messenger'))
    return ('<div class="hdr"><div class="logo">AntGo</div><div class="nav">%s</div><div class="srch">Ô tìm kiếm (giọng nói · hình ảnh)</div>'
            '<div class="tools"><span class="seg"><b>Mua</b><b>Bán</b></span><span class="chipw">Khu vực</span><span class="chipw">Xu</span><i class="ico"></i><i class="ico"></i><i class="av"></i></div></div>') % nav
def client_footer():
    c = lambda t: '<div class="fc"><b>%s</b>%s</div>' % (t, '<i class="b"></i>' * 5)
    return '<div class="ftr"><div class="fc"><div class="logo s">AntGo</div>%s<span class="chipw">Khu vực</span></div>%s%s%s</div>' % (lines(3), c('Khám phá'), c('Bán & Đăng việc'), c('Hỗ trợ'))

def client_page(title, body, with_footer=True, h_note=''):
    return '<section class="wf" id="%s"><div class="ttl">%s</div><div class="shell">%s<div class="pg">%s</div>%s</div></section>' % (
        title[0], E(title[1]), client_header(), body, client_footer() if with_footer else '')

ADM_NAV = ['Tổng quan', 'Xác minh người bán', 'Báo cáo vi phạm', 'Đơn & tranh chấp', 'Hộp thư hỗ trợ', 'Người dùng', 'Bài đăng', 'Voucher & Xu', 'Thông báo hệ thống', 'Cài đặt & xuất dữ liệu', 'Nhật ký thao tác']
def admin_page(title, active, body):
    nav = ''.join('<div class="%s">%s</div>' % ('on' if i == active else '', E(n)) for i, n in enumerate(ADM_NAV))
    return ('<section class="wf adm" id="%s"><div class="ttl">%s</div><div class="ashell"><aside><div class="logo s">AntGo · Quản trị</div>%s<div class="me">Quản trị viên · Đăng xuất</div></aside>'
            '<main>%s</main></div></section>') % (title[0], E(title[1]), nav, body)

pages = []

# ============================= CLIENT =============================
# C1 Trang chủ
pages.append(client_page(('c-home', 'Trang chủ'), col(
    '<div class="hero">' + col(h('Chữ AntGo + linh vật (khối mở đầu)', 1), blk('Một câu giới thiệu ngắn', 14, 'bar s w60'), row(btn('Tìm quanh khu', True), btn('Tìm việc gần nhà'))) + img('Kiến cưỡi máy bay', 190, 300) + '</div>',
    '<div class="bigsearch">Ô tìm kiếm lớn · mic · camera</div>', row(blk('Phổ biến: …', 14, 'bar s w60')),
    h('Nổi bật trong khu') + grid(4, [card() for _ in range(4)]),
    h('Đang giảm giá (Giờ vàng)') + grid(4, [card() for _ in range(4)]),
    h('Gần bạn') + grid(4, [card() for _ in range(4)]),
    '<div class="band">' + img('Linh vật', 90, 120) + col(h('Kiếm thêm gần nhà', 2), lines(2), row(btn('Xem việc gần nhà', True), btn('Đăng việc cần người'))) + '</div>',
    h('Việc mới quanh bạn') + grid(4, [jcard() for _ in range(4)]),
    row(h('Khám phá quanh khu'), tabs('Tất cả', 'Đồ ăn', 'Đồ dùng', 'Dịch vụ', 'Việc làm'), btn('Sắp xếp ▾'), gap=18) + grid(4, [card() for _ in range(4)]),
    gap=26)))

# C2 Tìm kiếm
pages.append(client_page(('c-search', 'Kết quả tìm kiếm'), col(
    row(h('Kết quả cho “…” · N bài trong Block B', 1), btn('Đổi khu vực'), gap=18),
    tabs('Tất cả 24', 'Đồ ăn', 'Đồ dùng', 'Dịch vụ', 'Việc làm'),
    row('<div class="side">' + h('Bộ lọc', 3) + blk('Danh mục (viên bấm)', 60) + blk('Khoảng cách', 36) + blk('Giá từ – đến', 36) + blk('Dùng được Xu', 24) + blk('Đang nhận đặt', 24) + btn('Xóa tất cả') + '</div>',
        col(row(blk('Viên bộ lọc đang chọn', 24, 'w60'), btn('Sắp xếp ▾'), gap=14), grid(3, [card() for _ in range(6)]), blk('Ở khu gần đó (nhãn vị trí)', 30), grid(3, [card() for _ in range(3)]), btn('Xem thêm')), gap=24, cls='top')
    , gap=18)))

# C3 Chi tiết bài
pages.append(client_page(('c-post', 'Chi tiết bài đăng'), col(
    blk('Đường dẫn: Trang chủ › Danh mục › Tên bài', 14, 'bar s w60'),
    row(col(img('Ảnh lớn của bài', 330), row(*[img('', 56, 80) for _ in range(5)], gap=8), gap=10),
        col(blk('Nhãn loại bài + 1 câu giải thích', 16, 'bar s'), h('Tên bài đăng', 1), blk('★ 4,8 · 120 đánh giá · 340 đã bán', 14, 'bar s w60'), blk('45.000đ', 28, 'bar w40'),
            row(*[blk(x, 44) for x in ('Giờ nhận đặt', 'Cách nhận', 'Thời gian chuẩn bị')], gap=10),
            '<div class="box">' + h('Khung đặt (bước 1)', 3) + blk('Nhóm chọn 1 / chọn nhiều (hàng + nút tròn)', 70) + blk('Số lượng  – 1 +', 28) + blk('Địa chỉ nhận hàng · Thay đổi', 28) + btn('Tiếp tục · giá', True) + '</div>', gap=12), gap=28, cls='top'),
    row(col(h('Mô tả', 3), lines(5), h('Thông tin thêm', 3), lines(3), '<div class="seller">' + img('', 52, 52) + col(blk('Tên người bán', 14, 'bar'), blk('★ · số bài · số đơn', 12, 'bar s w60')) + btn('Nhắn tin') + btn('Xem gian hàng') + '</div>', gap=12),
        col(h('Đánh giá', 3), blk('Biểu đồ sao + lọc', 60), lines(4), btn('Xem tất cả đánh giá'), gap=10), gap=28, cls='top'),
    h('Bài khác của người bán / Tương tự trong khu') + grid(4, [card() for _ in range(4)]), gap=22)))

# C4 Xác nhận đơn
pages.append(client_page(('c-confirm', 'Hộp xác nhận đơn hàng'), col(
    '<div class="dim"></div>',
    '<div class="modal">' + h('Xác nhận đơn hàng', 1) +
    blk('Địa chỉ nhận hàng · tên · SĐT · Thay đổi  >', 52) + blk('Món + tùy chọn đã chọn · số lượng · giá', 70) +
    row(blk('Giao tận cửa  [công tắc]', 36), blk('Nhận lúc / Ngày giờ  >', 36), gap=10) + blk('Lấy dụng cụ ăn uống  [công tắc]', 30) + field('Ghi chú cho người bán') + blk('Voucher AntGo (Xu)  >', 34) +
    row(blk('Tiền mặt', 34, 'on'), blk('Chuyển khoản', 34), gap=10) + blk('Chi tiết thanh toán: tiền hàng · phí giao · giảm giá', 60) +
    row(blk('Tổng cộng 0đ', 30, 'bar w40'), btn('Đặt đơn', True), gap=14, cls='between') + '</div>', gap=0), with_footer=False))

# C5 Đơn hàng: chi tiết
pages.append(client_page(('c-order', 'Chi tiết đơn hàng'), col(
    blk('← Đơn hàng', 14, 'bar s w40'),
    row(h('Tên bài · mã đơn AG-O…', 1), blk('Trạng thái', 20, 'chip'), gap=14),
    '<div class="steps">' + ''.join('<div><i class="dot"></i><b>%s</b><em>giờ</em></div>' % s for s in ('Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Giao / nhận', 'Hoàn thành')) + '</div>',
    row(col(h('Thông tin đơn', 3), blk('Bảng thông tin dạng hàng (nhãn · nội dung)', 150), h('Nội dung đã đặt', 3), blk('Món · tùy chọn · câu trả lời', 80), '<div class="box">' + h('Chuyển khoản cho người bán', 3) + row(img('QR', 110, 110), col(blk('Ngân hàng · STK', 14, 'bar'), blk('Số tiền · nội dung = mã đơn', 14, 'bar s'))) + '</div>', gap=14),
        '<div class="box act">' + h('Hành động', 3) + btn('Hành động chính', True) + btn('Hành động phụ') + blk('Báo vấn đề với đơn này', 14, 'bar s') + '<hr>' + row(img('', 44, 44), col(blk('Người bán', 14, 'bar'), blk('★ · uy tín', 12, 'bar s'))) + btn('Nhắn') + '</div>', gap=24, cls='top'), gap=18)))

# C6 Chi tiết việc làm
pages.append(client_page(('c-job', 'Chi tiết việc làm'), col(
    blk('Đường dẫn: Trang chủ › Việc làm › Tên việc', 14, 'bar s w60'),
    row(col(h('Tên việc cần làm', 1), blk('Đang mở · n đề nghị', 16, 'bar s w40'), row(*[blk(x, 54) for x in ('Làm lúc', 'Địa điểm (khu)', 'Cần', 'Trả công')], gap=10), h('Mô tả công việc', 3), lines(5), h('Yêu cầu', 3), lines(3),
            h('Hỏi đáp công khai', 3), blk('Câu hỏi · trả lời của người đăng (chặn SĐT)', 80), row(field('Đặt câu hỏi'), btn('Gửi')), gap=12),
        col('<div class="box">' + h('Đề nghị nhận việc', 3) + blk('Chọn khung giờ làm được', 40) + field('Lời giới thiệu (bắt buộc)', '', True) + btn('Gửi đề nghị', True) + blk('Gửi đề nghị ≠ đã nhận việc', 12, 'bar s') + '</div>',
            '<div class="box">' + h('Người đăng việc', 3) + row(img('', 48, 48), col(blk('Tên', 14, 'bar'), blk('★ · việc đã đăng', 12, 'bar s'))) + btn('Nhắn tin') + btn('Xem gian hàng') + '</div>', gap=14), gap=28, cls='top'),
    gap=18)))

# C7 Messenger
pages.append(client_page(('c-messenger', 'Messenger'), row(
    '<div class="inbox">' + field('Tìm cuộc trò chuyện') + ''.join(row(img('', 40, 40), col(blk('Tên', 14, 'bar'), blk('Tin nhắn gần nhất', 12, 'bar s')), gap=10) for _ in range(6)) + '</div>',
    '<div class="chat">' + row(img('', 40, 40), col(blk('Tên người nhận', 14, 'bar'), blk('Ngữ cảnh: thẻ đơn / việc', 12, 'bar s w60')), gap=10) + '<div class="msgs">' + blk('', 40, 'l w60') + blk('', 40, 'r w60') + blk('', 40, 'l w40') + blk('', 40, 'r w60') + '</div>' + row(blk('Soạn tin nhắn…', 40, 'w100'), blk('Ảnh/tệp', 40), btn('Gửi', True), gap=8) + '</div>', gap=18, cls='top'), with_footer=False))

# C8 Gian hàng
pages.append(client_page(('c-shop', 'Gian hàng của người bán'), col(
    '<div class="cover">' + img('Ảnh bìa', 140) + '</div>',
    row(img('Ảnh đại diện', 90, 90), col(h('Tên gian hàng', 1), blk('Loại · khu · thời gian trả lời', 14, 'bar s w60')), btn('Theo dõi', True), btn('Nhắn tin'), gap=18),
    row(*[blk(x, 60) for x in ('★ Điểm đánh giá', 'Bài đang đăng', 'Đơn / việc hoàn thành')], gap=12), blk('Giới thiệu', 60),
    tabs('Đang bán', 'Việc đang cần người', 'Đánh giá'), grid(4, [card() for _ in range(8)]), gap=18)))

# ============================= ADMIN =============================
# A1 Tổng quan
pages.append(admin_page(('a-dash', 'Tổng quan'), 0, col(
    row(col(h('Xin chào, Quản trị viên', 1), blk('Mô tả ngắn', 12, 'bar s w60')), btn('7 ngày qua ▾'), cls='between'),
    '<div class="box">' + h('Cần xử lý hôm nay', 3) + grid(5, [blk('n · loại việc', 56) for _ in range(5)]) + '</div>',
    grid(6, [stat('Chỉ số') for _ in range(6)], gap=12),
    grid(2, [chart('Giao dịch hoàn thành'), '<div class="chart"><div class="ch">Đơn theo trạng thái</div><div class="donut"></div></div>', chart('Đơn mới và hoàn thành'), chart('Người dùng mới')]), gap=18)))

# A2 Xác minh
pages.append(admin_page(('a-verify', 'Xác minh người bán'), 1, col(
    h('Xác minh người bán', 1), tabs('Chờ duyệt', 'Đã duyệt', 'Đã từ chối'),
    '<div class="box">' + row(img('', 40, 40), col(blk('Tên gian hàng · họ tên · SĐT · khu', 14, 'bar'), blk('Nộp lúc', 12, 'bar s w40'))) + blk('Họ tên trên giấy tờ · Số CCCD · Loại gian hàng · Giới thiệu', 90) +
    row(img('Mặt trước CCCD', 150), img('Mặt sau CCCD', 150), img('Ảnh chân dung', 150), gap=12) + row(btn('Từ chối'), btn('Duyệt hồ sơ', True), cls='end') + '</div>',
    '<div class="box">' + blk('Hồ sơ tiếp theo…', 70) + '</div>', gap=16)))

# A3 Báo cáo
pages.append(admin_page(('a-report', 'Báo cáo vi phạm'), 2, col(
    h('Báo cáo vi phạm', 1), tabs('Mới 4', 'Đang xem xét 2', 'Đã xử lý 2', 'Từ chối 1'),
    ''.join('<div class="box">' + row(h('Lý do báo cáo', 3), blk('Thời gian', 12, 'bar s w40'), cls='between') + row(blk('Người báo cáo', 22, 'chip'), blk('Loại + mã đối tượng', 22, 'chip'), gap=8) + blk('Nội dung mô tả (trích dẫn)', 34) + blk('Xem bối cảnh  ▾', 14, 'bar s w40') +
            '<hr>' + row(blk('Ghi chú của admin', 56, 'w100'), col(btn('Ẩn bài này'), btn('Bắt đầu xem xét', True)), gap=14, cls='bottom') + '</div>' for _ in range(2)), gap=14)))

# A4 Chi tiết đơn / phân xử
pages.append(admin_page(('a-order', 'Chi tiết đơn và phân xử'), 3, col(
    blk('← Tất cả đơn', 14, 'bar s w40'), row(h('AG-0xxxx', 1), blk('Trạng thái', 20, 'chip')),
    row(col('<div class="box">' + h('Khách báo vấn đề', 3) + blk('Loại vấn đề · mô tả · ảnh khách gửi · người bán trả lời', 110) + hr_() + h('Quyết định của AntGo', 3) + row(blk('Hoàn tiền', 60, 'on'), blk('Làm lại', 60), blk('Không hoàn tiền', 60), gap=10) + field('Số tiền hoàn (đ)') + field('Lý do (cả hai bên đều đọc)', '', True) + row(btn('Ghi nhận quyết định', True), cls='end') + '</div>',
            '<div class="box">' + h('Tiến trình đơn', 3) + lines(5) + '</div>', '<div class="box">' + h('Tin nhắn của đơn', 3) + btn('Xem tin nhắn giữa hai bên (ghi nhật ký)') + '</div>', gap=14),
        col('<div class="box">' + h('Thanh toán', 3) + lines(4) + '</div>', '<div class="box">' + h('Hai bên', 3) + row(blk('Người mua', 54), blk('Người bán', 54), gap=10) + '</div>', '<div class="box">' + h('Nhận hàng', 3) + lines(2) + '</div>', btn('Hủy đơn vi phạm'), gap=14), gap=18, cls='top'), gap=16)))

# A5 Người dùng
pages.append(admin_page(('a-users', 'Người dùng'), 5, col(
    h('Người dùng', 1), row('<div style="flex:1">' + field('Tìm theo tên hoặc số điện thoại') + '</div>', blk('Mọi vai trò ▾', 38, '', 'flex:none;width:170px;margin-top:19px'), blk('Mọi trạng thái ▾', 38, '', 'flex:none;width:170px;margin-top:19px'), gap=12, cls='top'),
    table(['Người dùng', 'Số điện thoại', 'Block', 'Vai trò', 'Trạng thái', 'Ngày tạo', ''], 8, [2.4, 1.4, .8, 1.2, 1.2, 1.2, 1.6], True),
    row('<span class="mut">27 người dùng · Trang 1/4</span>', btn('Trước'), btn('Sau'), gap=10, cls='end'), gap=16)))

# A6 Hồ sơ người dùng
pages.append(admin_page(('a-userdetail', 'Hồ sơ người dùng'), 5, col(
    blk('← Tất cả người dùng', 14, 'bar s w40'), row(img('', 64, 64), col(h('Tên người dùng', 1), blk('SĐT · khu · vai trò · trạng thái', 16, 'bar s w60')), btn('Khóa tài khoản'), gap=16, cls='center'),
    grid(6, [stat('đơn đã đặt') for _ in range(6)], gap=10),
    row(col('<div class="box">' + h('Đơn gần đây', 3) + table(['Đơn', 'Vai trò', 'Tiền', 'Trạng thái'], 4, [3, 1, 1.4, 1.4]) + '</div>', '<div class="box">' + h('Sổ Xu', 3) + lines(3) + '</div>', gap=14),
        col('<div class="box">' + h('Thông tin', 3) + lines(4) + '</div>', '<div class="box">' + h('Vai trò', 3) + blk('Chọn vai trò ▾', 36) + btn('Lưu vai trò') + '</div>', '<div class="box">' + h('Cộng / trừ Xu', 3) + field('Số Xu (âm = trừ)') + field('Lý do', '', True) + btn('Cập nhật Xu', True) + '</div>', gap=14), gap=18, cls='top'), gap=16)))

# A7 Voucher
pages.append(admin_page(('a-voucher', 'Voucher và Xu'), 7, col(
    row(col(h('Voucher & Xu', 1), blk('Mô tả ngắn', 12, 'bar s w60')), btn('+ Tạo voucher', True), cls='between'),
    table(['Voucher', 'Mã', 'Ưu đãi', 'Đơn tối thiểu', 'Giá đổi', 'Đã đổi', 'Trạng thái', ''], 4, [2.4, 1, 1.4, 1.4, 1, 1, 1.2, 1.4]),
    '<div class="modal sm">' + h('Tạo voucher (hộp thoại)', 3) + field('Tên voucher') + row(field('Mã'), field('Ưu đãi'), gap=10) + row(field('Đơn tối thiểu'), field('Giá đổi (Xu)'), gap=10) + row(btn('Hủy'), btn('Lưu', True), cls='end') + '</div>', gap=16)))

# A8 Hỗ trợ + A9 Cài đặt gộp trang riêng
pages.append(admin_page(('a-support', 'Hộp thư hỗ trợ'), 4, col(
    h('Hộp thư hỗ trợ', 1), tabs('Chưa trả lời', 'Đã trả lời', 'Đã đóng'),
    ''.join('<div class="box">' + row(blk('HT-0012 · chủ đề', 16, 'bar'), blk('Thời gian', 12, 'bar s w40'), cls='between') + blk('Nội dung người dùng gửi', 40) + row(blk('Trả lời…', 50, 'w100'), col(btn('Đóng phiếu'), btn('Gửi trả lời', True)), gap=14, cls='bottom') + '</div>' for _ in range(2)), gap=14)))

pages.append(admin_page(('a-settings', 'Cài đặt và xuất dữ liệu'), 9, col(
    h('Cài đặt & xuất dữ liệu', 1),
    row('<div class="box" style="flex:1.4">' + h('Từ khóa bị cấm', 3) + blk('Mỗi dòng một từ hoặc cụm từ', 130) + row(btn('Lưu từ khóa', True), cls='end') + '</div>',
        col('<div class="box">' + h('Khu vực', 3) + blk('Mỗi dòng một khu', 70) + row(btn('Lưu khu vực', True), cls='end') + '</div>', '<div class="box">' + h('Danh mục bài', 3) + blk('Mỗi dòng một danh mục', 70) + row(btn('Lưu danh mục', True), cls='end') + '</div>', '<div class="box">' + h('Xuất dữ liệu (CSV)', 3) + row(btn('Người dùng'), btn('Đơn hàng'), btn('Báo cáo')) + '</div>', gap=14), gap=18, cls='top'), gap=16)))

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Mona Sans', system-ui, sans-serif; background: #d9d9d9; color: #3a3a3a; font-size: 13px; padding: 24px 0; }
.wf { width: 1280px; margin: 0 auto 30px; background: #fff; border: 1px solid #8a8a8a; }
.ttl { padding: 8px 14px; background: #3a3a3a; color: #fff; font-size: 13px; font-weight: 600; letter-spacing: .02em; }
.shell { background: #fff; }
.pg { padding: 26px 40px 40px; }
.hdr { display: flex; align-items: center; gap: 22px; height: 64px; padding: 0 40px; border-bottom: 1px solid #8a8a8a; }
.logo { padding: 8px 18px; border: 1.5px solid #555; font-weight: 700; font-size: 17px; }
.logo.s { font-size: 14px; padding: 6px 12px; width: fit-content; }
.nav { display: flex; gap: 20px; color: #555; }
.srch { flex: 1; height: 36px; border: 1px solid #aaa; border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #888; }
.tools { display: flex; align-items: center; gap: 12px; }
.seg { display: inline-flex; border: 1px solid #888; border-radius: 16px; overflow: hidden; } .seg b { padding: 5px 14px; font-weight: 500; } .seg b:first-child { background: #ddd; }
.chipw { padding: 5px 12px; border: 1px solid #aaa; border-radius: 14px; font-size: 12px; color: #666; }
.ico { width: 22px; height: 22px; border: 1.5px solid #888; border-radius: 4px; display: inline-block; } .av { width: 32px; height: 32px; border-radius: 50%; background: #bbb; display: inline-block; }
.ftr { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 40px; padding: 36px 40px; background: #cfcfcf; border-top: 1px solid #8a8a8a; }
.fc { display: grid; gap: 10px; align-content: start; } .fc b { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #555; } .fc .b { display: block; height: 10px; background: #a8a8a8; border-radius: 2px; width: 70%; }
.row { display: flex; align-items: flex-start; } .row.top { align-items: flex-start; } .row.between { justify-content: space-between; align-items: center; } .row.end { justify-content: flex-end; align-items: center; } .row.center { align-items: center; } .row > .img[style*='width'] { flex: none; } .mut { color: #666; font-size: 12.5px; margin-right: 6px; } .row.bottom { align-items: flex-end; }
.row > .col { flex: 1; min-width: 0; } .col { display: flex; flex-direction: column; min-width: 0; }
.row > .blk, .row > .img, .row > .fld { flex: 1; }
.row > .blk.chip, .row > .blk.bar { flex: none; }
.gridw { display: grid; }
.blk { background: #e6e6e6; border: 1px solid #bdbdbd; display: flex; align-items: center; justify-content: center; text-align: center; padding: 6px 10px; color: #666; font-size: 12px; border-radius: 3px; }
.blk.bar { background: #d4d4d4; border-color: transparent; justify-content: flex-start; text-align: left; padding: 0 8px; color: #555; width: 100%; } .blk.bar.s { background: #e2e2e2; } .blk.w40 { width: 40%; } .blk.w60 { width: 60%; } .blk.w100 { width: 100%; }
.blk.chip { background: #ddd; border-radius: 12px; width: fit-content; } .blk.on { background: #cfcfcf; border: 1.5px solid #555; color: #222; font-weight: 600; }
.blk.l { align-self: flex-start; } .blk.r { align-self: flex-end; background: #cfcfcf; }
.img { position: relative; background: #ececec; border: 1px solid #bdbdbd; display: flex; align-items: center; justify-content: center; color: #777; font-size: 12px; overflow: hidden; border-radius: 3px; }
.img svg { position: absolute; inset: 0; width: 100%; height: 100%; } .img line { stroke: #c4c4c4; stroke-width: .8; vector-effect: non-scaling-stroke; } .img span { position: relative; background: #ececec; padding: 0 6px; }
.ln { display: grid; gap: 7px; } .ln i { display: block; height: 9px; background: #d9d9d9; border-radius: 2px; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 9px 16px; border: 1.5px solid #555; border-radius: 6px; font-weight: 600; font-size: 12.5px; color: #444; background: #fff; width: fit-content; }
.btn.p { background: #555; color: #fff; }
.h1 { font-size: 24px; font-weight: 700; color: #333; } .h2 { font-size: 18px; font-weight: 700; margin: 4px 0 10px; } .h3 { font-size: 14px; font-weight: 700; color: #444; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; } .tabs span { padding: 6px 14px; border: 1px solid #aaa; border-radius: 16px; color: #666; } .tabs span.on { background: #555; color: #fff; border-color: #555; }
.fld { display: grid; gap: 5px; } .fld b { font-size: 12px; } .inp { height: 38px; border: 1px solid #aaa; border-radius: 6px; padding: 9px 10px; color: #999; background: #fff; } .inp.tall { height: 74px; }
.card { border: 1px solid #aaa; border-radius: 6px; overflow: hidden; background: #fff; } .card .cb { padding: 10px 12px 12px; display: grid; gap: 8px; } .card.job { background: #f0f0f0; }
.hero { display: flex; justify-content: space-between; align-items: center; gap: 30px; padding: 28px 34px; background: #ececec; border: 1px solid #bdbdbd; border-radius: 8px; }
.hero > .col { flex: 1; } .bigsearch { height: 52px; border: 1.5px solid #888; border-radius: 26px; display: flex; align-items: center; justify-content: center; color: #888; }
.band { display: flex; align-items: center; gap: 24px; padding: 22px 28px; background: #cfcfcf; border-radius: 8px; } .band .col { flex: 1; }
.side { width: 230px; flex: none; display: grid; gap: 12px; padding: 14px; border: 1px solid #bdbdbd; border-radius: 6px; }
.box { border: 1px solid #aaa; border-radius: 8px; padding: 16px 18px; display: grid; gap: 12px; background: #fff; } .box.act { width: 300px; flex: none; }
.seller { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid #bdbdbd; border-radius: 8px; } .seller .col { flex: 1; }
.steps { display: grid; grid-template-columns: repeat(5, 1fr); } .steps > div { display: grid; justify-items: center; gap: 4px; border-top: 3px solid #888; padding-top: 10px; position: relative; } .steps .dot { width: 18px; height: 18px; border-radius: 50%; background: #888; position: absolute; top: -10px; } .steps b { margin-top: 8px; font-size: 12px; } .steps em { font-style: normal; font-size: 11px; color: #888; }
.dim { height: 70px; background: repeating-linear-gradient(45deg, #ececec, #ececec 8px, #e2e2e2 8px, #e2e2e2 16px); border: 1px dashed #aaa; margin-bottom: -1px; }
.modal { width: 560px; margin: 0 auto; border: 2px solid #555; border-radius: 10px; padding: 22px 24px; display: grid; gap: 12px; background: #fff; } .modal.sm { width: 440px; margin: 0; }
.inbox { width: 340px; flex: none; border: 1px solid #aaa; border-radius: 8px; padding: 14px; display: grid; gap: 14px; align-content: start; }
.chat { flex: 1; border: 1px solid #aaa; border-radius: 8px; padding: 14px; display: grid; gap: 14px; } .msgs { min-height: 300px; display: flex; flex-direction: column; gap: 12px; }
.cover { border-radius: 8px; overflow: hidden; }
/* admin */
.ashell { display: grid; grid-template-columns: 240px 1fr; min-height: 700px; } .ashell aside { background: #4a4a4a; padding: 18px 12px; display: flex; flex-direction: column; gap: 6px; color: #ddd; }
.ashell aside .logo { border-color: #ccc; color: #fff; margin-bottom: 14px; } .ashell aside div:not(.logo):not(.me) { padding: 8px 12px; border-radius: 6px; font-size: 12.5px; } .ashell aside div.on { background: #6a6a6a; color: #fff; font-weight: 600; }
.ashell aside .me { margin-top: auto; padding-top: 14px; border-top: 1px solid #777; font-size: 12px; color: #bbb; }
.ashell main { padding: 28px 34px 40px; background: #f5f5f5; }
.stat { border: 1px solid #aaa; border-radius: 8px; padding: 12px 14px; display: grid; gap: 8px; background: #fff; }
.chart { border: 1px solid #aaa; border-radius: 8px; padding: 14px 16px; background: #fff; } .ch { font-weight: 700; margin-bottom: 10px; } .bars { height: 150px; display: flex; align-items: flex-end; gap: 14px; border-bottom: 1px solid #888; } .bars i { flex: 1; background: #b8b8b8; display: block; }
.donut { width: 130px; height: 130px; border-radius: 50%; border: 24px solid #b8b8b8; margin: 4px auto; }
.tbl { border: 1px solid #aaa; border-radius: 8px; overflow: hidden; background: #fff; } .tr { display: grid; padding: 12px 14px; border-top: 1px solid #ddd; align-items: center; gap: 10px; } .tr.th { background: #e2e2e2; border-top: 0; font-weight: 700; font-size: 11.5px; text-transform: uppercase; color: #555; }
.tr .b { display: block; height: 10px; background: #d4d4d4; border-radius: 2px; } .cellimg { display: flex; align-items: center; gap: 10px; } .sq { width: 30px; height: 30px; background: #ccc; border-radius: 50%; display: block; flex: none; } .pillb { display: block; width: 70%; height: 22px; background: #d4d4d4; border-radius: 12px; }
hr { border: 0; border-top: 1px dashed #aaa; }
"""

html_out = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>AntGo — Wireframe</title><link href="https://fonts.googleapis.com/css2?family=Mona+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>%s</style></head><body>%s</body></html>' % (CSS, '\n'.join(pages))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'design', 'wireframes.html')
open(out, 'w', encoding='utf-8').write(html_out)
print('ok', len(pages), 'khung ->', os.path.normpath(out))
