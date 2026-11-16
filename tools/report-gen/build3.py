# -*- coding: utf-8 -*-
import re, os, sys, shutil, struct, zipfile, html
sys.path.insert(0, os.path.dirname(__file__))
from content3 import CH3, APP
from content456 import CH456, APPB

SP = os.path.dirname(os.path.abspath(__file__))
SRC = r'd:\Năm 1\WEB2\docs\bao-cao\Chuong-1-Gioi-thieu-v4-day-du.docx'   # bản người dùng đã sửa (bìa...), làm nền
BAK = os.path.join(SP, 'base-user.docx')
OUT = os.path.join(SP, 'v6.docx')
shutil.copy(SRC, BAK)          # luôn lấy bản mới nhất của người dùng làm nền
# màu bảng (đổi ở đây là đổi cả báo cáo): viền, tiêu đề, dòng xen kẽ
TBL_BORDER, TBL_HEAD, TBL_BAND = '9DC3E6', '1F4E79', 'DEEAF6'
W = os.path.join(SP, 'w')
shutil.rmtree(W, ignore_errors=True)
with zipfile.ZipFile(BAK) as z:
    z.extractall(W)

def esc(t):
    return html.escape(t, quote=False)

# ---------------------------------------------------------------- đánh số
from patches import apply, APP_NEW
CH3, CH456 = apply(CH3, CH456)
APP = APP_NEW
ops = list(CH3) + list(CH456) + [('sep',)] + list(APP) + list(APPB)
out = []
for o in ops:
    if o[0] == 'land' and out and out[-1][0] == 'endland':
        out.pop(); continue
    out.append(o)
ops = out
num = {}
ch = 0; nfig = 0; ntbl = 0; nA = 0; nB = 0
nfigs = {}
inapp = False; ntblA = 0
for o in ops:
    if o[0] == 'h1':
        ch = int(o[1].split('.')[0].split()[-1]); nfig = 0; ntbl = 0
    elif o[0] == 'fig':
        tag = o[5] if len(o) > 5 else ''
        if tag == 'A': nA += 1; num['F:' + o[1]] = 'Hình A.%d' % nA
        elif tag == 'B': nB += 1; num['F:' + o[1]] = 'Hình B.%d' % nB
        else: nfig += 1; num['F:' + o[1]] = 'Hình %d.%d' % (ch, nfig)
    elif o[0] == 'sep':
        inapp = True; ntblA = 0
    elif o[0] == 'tbl' and inapp:
        ntblA += 1; num['T:' + o[1]] = 'Bảng A.%d' % ntblA
    elif o[0] == 'tbl':
        ntbl += 1; num['T:' + o[1]] = 'Bảng %d.%d' % (ch, ntbl)

def subst(t):
    def f(m):
        k = m.group(1) + ':' + m.group(2)
        if k not in num: raise KeyError(k)
        return num[k]
    return re.sub(r'\{([FT]):([a-z0-9_]+)\}', f, t)

# ---------------------------------------------------------------- XML helpers
CODE_RPR = '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="22"/></w:rPr>'
def runs(text):
    text = subst(text)
    parts = re.split(r'(<c>.*?</c>|<i>.*?</i>|<h>.*?</h>)', text)
    r = ''
    for p in parts:
        if not p: continue
        if p.startswith('<c>'):
            r += '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (CODE_RPR, esc(p[3:-4]))
        elif p.startswith('<h>'):
            r += '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r>' % esc(p[3:-4])
        elif p.startswith('<i>'):
            r += '<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r>' % esc(p[3:-4])
        else:
            r += '<w:r><w:t xml:space="preserve">%s</w:t></w:r>' % esc(p)
    return r

bm = [3000]
def heading(style, text):
    bm[0] += 1
    return ('<w:p><w:pPr><w:pStyle w:val="%s"/></w:pPr><w:bookmarkStart w:id="%d" w:name="_Toc2448%05d"/>'
            '<w:r><w:t>%s</w:t></w:r><w:bookmarkEnd w:id="%d"/></w:p>') % (style, bm[0], bm[0], esc(text), bm[0])

def para(text, keep=False, before=False):
    ppr = '<w:pPr><w:keepNext/></w:pPr>' if keep else ('<w:pPr><w:spacing w:before="200"/></w:pPr>' if before else '')
    return '<w:p>%s%s</w:p>' % (ppr, runs(text))

PAGEBREAK = ('<w:p><w:pPr><w:spacing w:after="160"/><w:ind w:firstLine="0"/><w:jc w:val="left"/></w:pPr>'
             '<w:r><w:br w:type="page"/></w:r></w:p>')

PORTRAIT_PG = '<w:pgSz w:w="11909" w:h="16834" w:code="9"/>'
LAND_PG = '<w:pgSz w:w="16834" w:h="11909" w:orient="landscape" w:code="9"/>'
PGMAR = '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>'
state = {'first_sect': True}
def sect(land):
    num_start = ''
    if state['first_sect']:
        num_start = '<w:pgNumType w:start="1"/>'; state['first_sect'] = False
    return ('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:ind w:firstLine="0"/>'
            '<w:sectPr><w:headerReference w:type="default" r:id="rId16"/>%s%s%s<w:cols w:space="720"/>'
            '<w:docGrid w:linePitch="354"/></w:sectPr></w:pPr></w:p>') % (LAND_PG if land else PORTRAIT_PG, PGMAR, num_start)

# ---------------------------------------------------------------- bảng
def table(o):
    _, key, cap, widths, header, rows, align = o
    widths = list(widths); widths[-1] += 9641 - sum(widths)
    x = '<w:p><w:pPr><w:pStyle w:val="Bng"/><w:keepNext/></w:pPr>%s</w:p>' % (
        '<w:r><w:t>%s</w:t></w:r>' % esc('%s. %s' % (num['T:' + key], cap)))
    x = x.replace('<w:p><w:pPr>', '<w:p><w:pPr>', 1)
    bm[0] += 1
    x = x.replace('<w:r>', '<w:bookmarkStart w:id="%d" w:name="_Toc2448%05d"/><w:r>' % (bm[0], bm[0]), 1)
    x = x.replace('</w:r></w:p>', '</w:r><w:bookmarkEnd w:id="%d"/></w:p>' % bm[0], 1)
    t = ('<w:tbl><w:tblPr><w:tblStyle w:val="AntGoBng1"/><w:tblW w:w="9641" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/>'
         '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar>'
         '<w:tblLook w:val="0420" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>'
         '<w:tblGrid>%s</w:tblGrid>') % ''.join('<w:gridCol w:w="%d"/>' % w for w in widths)
    allrows = [header] + rows
    for ri, row in enumerate(allrows):
        last = ri == len(allrows) - 1
        trpr = '<w:trPr><w:cantSplit/>%s</w:trPr>' % ('<w:tblHeader/>' if ri == 0 else '')
        t += '<w:tr>' + trpr
        for ci, cell in enumerate(row):
            if ri == 0: jc, sp = 'center', '<w:spacing w:before="100" w:after="100" w:line="240" w:lineRule="auto"/>'
            else:
                sp = '<w:spacing w:after="80" w:line="240" w:lineRule="auto"/>'
                jc = 'left' if (align == 'left' or ci == 0) else 'center'
            kn = '' if last else '<w:keepNext/>'
            body = runs(cell) if cell else '<w:r><w:t></w:t></w:r>'
            # ép không nghiêng như bảng cũ
            body = body.replace('<w:r><w:t', '<w:r><w:rPr><w:i w:val="0"/><w:iCs w:val="0"/></w:rPr><w:t')
            body = body.replace('<w:rPr><w:rFonts', '<w:rPr><w:i w:val="0"/><w:iCs w:val="0"/><w:rFonts')
            t += ('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="table"/>%s%s'
                  '<w:jc w:val="%s"/></w:pPr>%s</w:p></w:tc>') % (widths[ci], kn, sp, jc, body)
        t += '</w:tr>'
    t += '</w:tbl>'
    return x + t

# ---------------------------------------------------------------- hình
rels = []
media_n = [0]
def png_size(p):
    with open(p, 'rb') as f:
        d = f.read(32)
    return struct.unpack('>II', d[16:24])

def figure(o):
    key, path, cap, land = o[1], o[2], o[3], o[4]
    w, h = png_size(path)
    ratio = h / w
    maxw, maxh = (17.0, 19.5)
    keep = 1.0   # luôn hiện nguyên ảnh chụp, không cắt
    ratio *= keep
    cw = min(maxw, maxh / ratio); chh = cw * ratio
    cx, cy = int(cw * 360000), int(chh * 360000)
    media_n[0] += 1
    n = media_n[0]
    name = 'media/ag3_%02d.png' % n
    shutil.copy(path, os.path.join(W, 'word', name))
    rid = 'rIdAg%02d' % n
    rels.append('<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="%s"/>' % (rid, name))
    c = '%s. %s' % (num['F:' + key], cap)
    drawing = ('<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="%d" cy="%d"/>'
               '<wp:docPr id="%d" name="Hình %d" descr="%s"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
               '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
               '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="%d" name="ag3_%02d.png" descr="%s"/><pic:cNvPicPr/></pic:nvPicPr>'
               '<pic:blipFill><a:blip r:embed="%s"/>%s<a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
               '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
               '</a:graphicData></a:graphic></wp:inline></w:drawing>') % (cx, cy, 900 + n, n, esc(cap), 900 + n, n, esc(cap), rid, ('<a:srcRect b="%d"/>' % int((1 - keep) * 100000)) if keep < 1 else '', cx, cy)
    img = ('<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="60" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/>'
           '<w:jc w:val="center"/></w:pPr><w:r>%s</w:r></w:p>') % drawing
    bm[0] += 1
    capx = ('<w:p><w:pPr><w:pStyle w:val="nh"/><w:keepNext/></w:pPr><w:bookmarkStart w:id="%d" w:name="_Toc2448%05d"/>'
            '<w:r><w:t>%s</w:t></w:r><w:bookmarkEnd w:id="%d"/></w:p>') % (bm[0], bm[0], esc(c), bm[0])
    return img + capx

def render(seq):
    x = ''
    prev = None
    for o in seq:
        k = o[0]
        if k == 'h1': x += PAGEBREAK + heading('P1', o[1])
        elif k == 'h2': x += heading('P2', o[1])
        elif k == 'h3': x += heading('P30', o[1])
        elif k == 'h5': x += heading('P5', o[1])
        elif k == 'p': x += para(o[1], before=(prev == 'tbl'))
        elif k == 'tbl': x += table(o)
        elif k == 'fig': x += figure(o)
        elif k in ('land', 'endland'): pass  # không dùng trang ngang
        elif k == 'sep': pass
        else: raise ValueError(k)
        prev = k
    return x

# tách ops thành phần Chương 3 và Phụ lục (sau 'sep')
i = ops.index(('sep',))
ch3_ops, app_ops = ops[:i], ops[i + 1:]
ch3_xml = render(ch3_ops)
app_xml = render(app_ops)

# ---------------------------------------------------------------- chèn vào document.xml
dp = os.path.join(W, 'word', 'document.xml')
d = open(dp, encoding='utf8').read()

def keep_tables(d):
    def fix(m):
        t = m.group(0)
        if 'AntGoBng' not in t: return t
        rows = re.findall(r'<w:tr[ >].*?</w:tr>', t, flags=re.S)
        for i, r in enumerate(rows):
            n = r
            n = re.sub(r'<w:trPr>', '<w:trPr><w:cantSplit/>', n) if '<w:trPr>' in n else n.replace('<w:tc>', '<w:trPr><w:cantSplit/></w:trPr><w:tc>', 1)
            if i < len(rows) - 1:
                n = re.sub(r'(<w:pPr><w:pStyle w:val="table"/>)(?!<w:keepNext/>)', lambda mm: mm.group(1) + '<w:keepNext/>', n)
            t = t.replace(r, n, 1)
        return t
    return re.sub(r'<w:tbl>.*?</w:tbl>', fix, d, flags=re.S)
d = keep_tables(d)
d = re.sub(r'(<w:pStyle w:val="Bng"/>)(?!<w:keepNext/>)', lambda mm: mm.group(1) + '<w:keepNext/>', d)
# --- gỡ nội dung Chương 3–6 và Phụ lục do lần dựng trước chèn vào bản của người dùng, rồi chèn bản mới
bs = d.index('<w:body>') + 8
body = d[bs:]
def top_items(body):
    return [(m.start(), m.group(0)) for m in re.finditer(r'<w:p[ >].*?</w:p>|<w:tbl>.*?</w:tbl>|<w:sectPr.*?</w:sectPr>', body, flags=re.S)]
def ptext(x):
    return ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', x)).strip()
its = top_items(body)
def find_exact(txt, start=0):
    for i in range(start, len(its)):
        if its[i][1].startswith('<w:p') and ptext(its[i][1]) == txt: return i
    raise KeyError(txt)
i3 = find_exact('CHƯƠNG 3. PHƯƠNG PHÁP THỰC HIỆN')
iT = find_exact('TÀI LIỆU THAM KHẢO', i3)
start_off = its[i3 - 1][0] if 'w:br w:type="page"' in its[i3 - 1][1] else its[i3][0]
end_off = its[iT][0]
iA = find_exact('PHỤ LỤC A. CÁC SƠ ĐỒ BỔ SUNG', iT)
app_start = its[iA][0]
assert its[-1][1].startswith('<w:sectPr')
app_end = its[-1][0]
body = body[:start_off] + ch3_xml + body[end_off:app_start] + app_xml + body[app_end:]
d = d[:bs] + body
# dọn ảnh và quan hệ của lần dựng trước
rp0 = os.path.join(W, 'word', '_rels', 'document.xml.rels')
r0 = open(rp0, encoding='utf8').read()
r0 = re.sub(r'<Relationship [^>]*Target="media/ag3_[^"]*"[^>]*/>', '', r0)
open(rp0, 'w', encoding='utf8').write(r0)
keep_media = {re.search(r'Target="media/([^"]+)"', x).group(1) for x in rels}
for fn in os.listdir(os.path.join(W, 'word', 'media')):
    if fn.startswith('ag3_') and fn not in keep_media:
        os.remove(os.path.join(W, 'word', 'media', fn))
# đổi màu bảng AntGo Bảng 1 (cam -> xanh)
sp = os.path.join(W, 'word', 'styles.xml')
st = open(sp, encoding='utf8').read()
m = re.search(r'<w:style [^>]*w:styleId="AntGoBng1".*?</w:style>', st, flags=re.S)
sty = m.group(0)
sty2 = sty.replace('F4B183', TBL_BORDER).replace('D85A1C', TBL_HEAD).replace('FCE4D6', TBL_BAND)
st = st.replace(sty, sty2)
open(sp, 'w', encoding='utf8').write(st)

# namespace wp/pic dùng inline: wp đã khai báo ở gốc?
head = d[:d.find('<w:body>')]
for ns in ('xmlns:wp=', 'xmlns:r=', 'xmlns:w14='):
    assert ns in head, ns
from front import patch_front
d = patch_front(d, globals())
open(dp, 'w', encoding='utf8').write(d)

# rels + content types
rp = os.path.join(W, 'word', '_rels', 'document.xml.rels')
r = open(rp, encoding='utf8').read().replace('</Relationships>', ''.join(rels) + '</Relationships>')
open(rp, 'w', encoding='utf8').write(r)
cp = os.path.join(W, '[Content_Types].xml')
c = open(cp, encoding='utf8').read()
if 'Extension="png"' not in c:
    c = c.replace('<Default Extension="rels"', '<Default Extension="png" ContentType="image/png"/><Default Extension="rels"', 1)
open(cp, 'w', encoding='utf8').write(c)

# zip (mimetype không cần, [Content_Types].xml đứng đầu)
if os.path.exists(OUT): os.remove(OUT)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(cp, '[Content_Types].xml')
    for root, _, files in os.walk(W):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, W).replace('\\', '/')
            if arc == '[Content_Types].xml': continue
            z.write(full, arc)
print('OK', OUT, 'hinh ch3:', nfig, 'hinh PL:', nA, 'bang:', ntbl)
