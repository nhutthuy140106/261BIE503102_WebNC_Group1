# -*- coding: utf-8 -*-
# Vá phần đầu báo cáo (lời cảm ơn, cam đoan, từ viết tắt) và các chỗ còn đánh dấu "cần bổ sung" ở Chương 1–2.
# Được build3.py gọi trước khi ghi document.xml. g = globals() của build2 (esc, runs, PAGEBREAK, heading, para).
import re

THANKS = [
    'Trước hết, nhóm xin gửi lời cảm ơn chân thành đến TS. Nguyễn Duy Thanh, giảng viên môn Phát triển Web Kinh doanh Nâng cao, đã tận tình hướng dẫn, góp ý và định hướng cho nhóm trong suốt quá trình thực hiện đồ án.',
    'Đồ án giúp nhóm vận dụng kiến thức của môn học vào một sản phẩm hoàn chỉnh, từ phân tích nghiệp vụ, thiết kế dữ liệu, xây dựng giao diện bằng Angular, xây dựng máy chủ bằng Express và MongoDB, đến cài đặt các thuật toán tìm kiếm và gợi ý. Qua đó, nhóm rèn luyện được kỹ năng làm việc nhóm, phân tích vấn đề và trình bày kết quả.',
    'Nhóm cũng xin cảm ơn Khoa Hệ thống thông tin và nhà trường đã tạo điều kiện để nhóm được học một môn học gắn kiến thức với thực hành.',
    'Do thời gian và kinh nghiệm còn hạn chế, đồ án khó tránh khỏi thiếu sót. Nhóm rất mong nhận được góp ý của thầy để hoàn thiện hơn.',
    'Nhóm xin chân thành cảm ơn.',
]
PLEDGE = [
    'Nhóm thực hiện đồ án xin cam đoan:',
    'Đồ án “Website AntGo: nền tảng mua bán, dịch vụ và việc làm vặt trong khu dân cư” là kết quả nghiên cứu và thực hiện của nhóm dưới sự hướng dẫn của giảng viên.',
    'Các số liệu thử nghiệm trong báo cáo do nhóm tự đo trên mã nguồn và dữ liệu thử nghiệm của đồ án; các tài liệu, bài báo và công cụ tham khảo đều được trích dẫn trong phần Tài liệu tham khảo. Dữ liệu người dùng, đơn hàng và bài đăng trong hệ thống là dữ liệu mẫu do nhóm xây dựng để minh họa, không phải dữ liệu của người dùng thật.',
    'Các thành viên đã cùng thảo luận, phân chia công việc hợp lý và cùng đóng góp vào việc xây dựng sản phẩm và viết báo cáo. Nhóm chịu trách nhiệm về nội dung của báo cáo này.',
]
ABBR = [
    ['API', 'Application Programming Interface (giao diện lập trình ứng dụng)'],
    ['BPMN', 'Business Process Model and Notation (ký hiệu mô hình hóa quy trình nghiệp vụ)'],
    ['CORS', 'Cross-Origin Resource Sharing (chia sẻ tài nguyên giữa các nguồn)'],
    ['CRUD', 'Create, Read, Update, Delete (tạo, đọc, sửa, xóa)'],
    ['CSS', 'Cascading Style Sheets'],
    ['CSV', 'Comma-Separated Values (tệp giá trị phân tách bằng dấu phẩy)'],
    ['DFD', 'Data Flow Diagram (sơ đồ luồng dữ liệu)'],
    ['ERD', 'Entity Relationship Diagram (sơ đồ thực thể liên kết)'],
    ['HTML', 'HyperText Markup Language'],
    ['HTTP', 'HyperText Transfer Protocol'],
    ['JSON', 'JavaScript Object Notation'],
    ['kNN', 'k-Nearest Neighbors (k láng giềng gần nhất)'],
    ['NoSQL', 'Not only SQL (cơ sở dữ liệu phi quan hệ)'],
    ['OTP', 'One-Time Password (mật khẩu dùng một lần)'],
    ['QR', 'Quick Response (mã phản hồi nhanh)'],
    ['REST', 'Representational State Transfer'],
    ['SMS', 'Short Message Service (tin nhắn văn bản)'],
    ['SPA', 'Single Page Application (ứng dụng một trang)'],
    ['TF–IDF', 'Term Frequency – Inverse Document Frequency (tần suất từ – nghịch đảo tần suất văn bản)'],
    ['URL', 'Uniform Resource Locator (địa chỉ tài nguyên)'],
]


def patch_front(d, g):
    esc, runs, PAGEBREAK, heading = g['esc'], g['runs'], g['PAGEBREAK'], g['heading']

    def para(t):
        return '<w:p>%s</w:p>' % runs(t)

    bs = d.index('<w:body>') + 8
    body = d[bs:]
    its = [m.group(0) for m in re.finditer(r'<w:p[ >].*?</w:p>|<w:tbl>.*?</w:tbl>|<w:sectPr.*?</w:sectPr>', body, flags=re.S)]

    def pt(x):
        return ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', x)).strip()

    def find(pred, what):
        c = [x for x in its if x.startswith('<w:p') and pred(pt(x)) and 'w:pStyle w:val="TOC' not in x]
        assert len(c) == 1, (what, len(c))
        return c[0]

    def sub(old, new):
        nonlocal d
        assert d.count(old) == 1, (old[:60], d.count(old))
        d = d.replace(old, new)

    def ppr(x):
        m = re.search(r'<w:pPr>.*?</w:pPr>', x, flags=re.S)
        return m.group(0) if m else ''

    def rewrite(pred, text, what):
        x = find(pred, what)
        sub(x, '<w:p>%s%s</w:p>' % (ppr(x), runs(text)))

    # ---- Chương 1
    sub(' (Hình 1.1)', '')
    for pred, w in ((lambda t: t.startswith('[CẦN BỔ SUNG: Hình 1.1'), 'ph11'),
                    (lambda t: t.startswith('Hình 1.1.') , 'cap11')):
        sub(find(pred, w), '')
    rewrite(lambda t: t.startswith('Nhóm không tích hợp cổng thanh toán'),
            'Nhóm không tích hợp cổng thanh toán: AntGo chỉ ghi nhận cách thanh toán giữa hai bên và không giữ tiền, nên việc hoàn tiền do hai bên tự thực hiện và hệ thống chỉ ghi nhận quyết định phân xử của quản trị viên. Việc xác minh danh tính chỉ dừng ở mức quản trị viên duyệt hồ sơ người bán tự gửi, chưa đối chiếu với nguồn dữ liệu bên ngoài. Hệ thống được đánh giá trên dữ liệu thử nghiệm do nhóm xây dựng, chưa triển khai cho người dùng thật.', 'gh')
    # ---- Chương 2
    x = find(lambda t: t.startswith('AntGo là ứng dụng web chạy trên trình duyệt'), 'web')
    if 'CẦN BỔ SUNG' in x:
        sub(x, re.sub(r'<w:r[^>]*><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t[^>]*> \[CẦN BỔ SUNG: nhóm xác nhận\]</w:t></w:r>', '', x))
    x = find(lambda t: t.startswith('Các nghiên cứu trên chủ yếu khảo sát'), 'nc')
    sub(x, '<w:p>%s</w:p>' % runs('Các nghiên cứu trên chủ yếu khảo sát nền tảng đã vận hành ở quy mô lớn tại Mỹ hoặc Hàn Quốc, hoặc chỉ tập trung vào một loại giao dịch. Trong các nguồn nhóm đã tham khảo, chưa có nghiên cứu nào xem xét một nền tảng kết hợp mua bán, dịch vụ và việc làm ngắn trong cùng một khu dân cư tại Việt Nam.'))
    x = find(lambda t: t.startswith('[CẦN BỔ SUNG: nhóm kiểm tra lại từng ô'), 'tbl21')
    sub(x, '<w:p>%s%s</w:p>' % (ppr(x), runs('<i>Nguồn: tổng hợp từ trang trợ giúp công khai và mô tả của từng ứng dụng, tháng 11/2026.</i>')))
    rewrite(lambda t: t.startswith('Trong AntGo, mỗi nhóm tài nguyên có router riêng'),
            'Trong AntGo, mỗi nhóm tài nguyên có router riêng, các route cần đăng nhập đi qua middleware xác thực, và dữ liệu đầu vào được kiểm tra bằng Zod trước khi vào tầng nghiệp vụ.', 'zod')
    rewrite(lambda t: t.startswith('Trong AntGo, người dùng đăng nhập bằng số điện thoại'),
            'Trong AntGo, người dùng đăng nhập bằng số điện thoại và mật khẩu hoặc bằng tài khoản Google; tài khoản mới phải xác minh số điện thoại bằng mã OTP. Server phân ba vai trò là người dùng thường, người kiểm duyệt và quản trị viên, và vai trò được kiểm tra ở server cho từng API quản trị.', 'auth')
    rewrite(lambda t: t.startswith('Trong AntGo, mật khẩu được băm bằng bcrypt'),
            'Trong AntGo, mật khẩu được băm bằng bcrypt, và API chỉ trả dữ liệu riêng tư như đơn hàng hay địa chỉ chính xác của việc làm cho người có quyền xem. Server dùng Helmet để đặt các tiêu đề bảo mật, giới hạn số lần đăng nhập, đăng ký và gửi mã OTP bằng express-rate-limit, và giới hạn dung lượng, loại tệp khi tải lên.', 'sec')
    # 2.8.3: giữ phương án gợi ý giá bằng kNN
    x = find(lambda t: t.startswith('2.8.3.'), 'h283')
    sub(x, x.replace('<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>[CHỜ CHỐT: Gợi ý giá bằng kNN, hoặc Phát hiện bài trùng lặp và bài đáng ngờ]</w:t></w:r>', '<w:r><w:t>Gợi ý giá bằng kNN</w:t></w:r>'))
    for pred, w in ((lambda t: t.startswith('Phương án A'), 'pa'), (lambda t: t.startswith('Phương án B'), 'pb'),
                    (lambda t: t.startswith('Phát hiện bài trùng lặp dựa trên'), 'pdet')):
        sub(find(pred, w), '')
    # DOI
    x = find(lambda t: t.startswith('Fedosov, A.'), 'fed')
    x2 = x.replace('https://doi.org/10.1145/3544549.</w:t></w:r><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>[CẦN BỔ SUNG: tra số DOI đầy đủ trên dl.acm.org]</w:t></w:r>', 'https://doi.org/10.1145/3544549.3585744</w:t></w:r>')
    assert x2 != x
    sub(x, x2)

    # ---- Phần đầu
    mucluc = find(lambda t: t == 'MỤC LỤC', 'mucluc')
    # đánh dấu cam đoan không cần vào mục lục nhưng giữ kiểu P1 như các mục đầu trang khác
    front = (heading('P1', 'LỜI CẢM ƠN') + ''.join(para(t) for t in THANKS)
             + PAGEBREAK + heading('P1', 'LỜI CAM ĐOAN') + ''.join(para(t) for t in PLEDGE)
             + PAGEBREAK)
    sub(mucluc, front + mucluc)

    # trang trống sau danh mục bảng biểu: thu nhỏ đoạn kết thúc trường và bỏ đoạn trống kế sau nó
    k = [i for i, x in enumerate(its) if x.startswith('<w:p') and 'fldCharType="end"' in x and 'noProof w:val="0"' in x and '<w:br' not in x and pt(x) == '']
    assert len(k) == 1, k
    x97, x98 = its[k[0]], its[k[0] + 1]
    assert pt(x98) == '' and '<w:r>' not in x98 and '<w:r ' not in x98
    tiny = x97.replace('<w:pPr><w:pStyle w:val="P1"/></w:pPr>', '<w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>')
    assert tiny != x97
    sub(x97, tiny)
    sub(x98, '')

    # bảng từ viết tắt
    head = find(lambda t: t == 'DANH MỤC TỪ VIẾT TẮT', 'abbr')
    widths = [2200, 7441]
    t = ('<w:tbl><w:tblPr><w:tblStyle w:val="AntGoBng1"/><w:tblW w:w="9641" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/>'
         '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar>'
         '<w:tblLook w:val="0420" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>'
         '<w:tblGrid>%s</w:tblGrid>') % ''.join('<w:gridCol w:w="%d"/>' % w for w in widths)
    for ri, row in enumerate([['Từ viết tắt', 'Diễn giải']] + ABBR):
        t += '<w:tr><w:trPr><w:cantSplit/>%s</w:trPr>' % ('<w:tblHeader/>' if ri == 0 else '')
        for ci, cell in enumerate(row):
            if ri == 0:
                jc, sp = 'center', '<w:spacing w:before="100" w:after="100" w:line="240" w:lineRule="auto"/>'
            else:
                jc, sp = 'left', '<w:spacing w:after="80" w:line="240" w:lineRule="auto"/>'
            body_r = runs(cell).replace('<w:r><w:t', '<w:r><w:rPr><w:i w:val="0"/><w:iCs w:val="0"/></w:rPr><w:t')
            t += ('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="table"/>%s<w:jc w:val="%s"/></w:pPr>%s</w:p></w:tc>'
                  % (widths[ci], sp, jc, body_r))
        t += '</w:tr>'
    t += '</w:tbl>'
    sub(head, head + t)
    return d
