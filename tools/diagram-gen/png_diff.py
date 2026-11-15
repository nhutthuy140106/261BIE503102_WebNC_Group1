import sys,os,re,glob
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from png_extract import mx,models
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf8')
def cells(model_xml):
    r=ET.fromstring(model_xml) if isinstance(model_xml,str) else model_xml
    out={}
    for c in r.iter('mxCell'):
        g=c.find('mxGeometry'); geo=''
        if g is not None:
            geo=' '.join(f'{k}={v}' for k,v in sorted(g.attrib.items()))
            for p in g.iter('mxPoint'): geo+=f' [{p.get("as")}:{p.get("x")},{p.get("y")}]'
        out[c.get('id')]=(c.get('value') or '',c.get('style') or '',geo,c.get('source'),c.get('target'),c.get('parent'))
    return out
cur=open('anh-sua.drawio',encoding='utf8').read()
curm={}
for dg in ET.fromstring(cur).iter('diagram'):
    curm[dg.get('id')]=(dg.get('name'),cells(dg.find('mxGraphModel')))
files={}
for p in glob.glob('hinh-usecase/*.png')+glob.glob('hinh-trangthai/*.png')+glob.glob('hinh-bpmn/*.png'):
    files[p]=p
for p in sorted(files):
    x=mx(p)
    if not x: print(p,'không có mxfile'); continue
    ms=models(x)
    for did,(nm,mxml) in ms.items():
        key=did
        if key not in curm:
            m=re.search(r'(BP\d\d|UC\d\d|ST\d\d)',os.path.basename(p)) or re.search(r'(BP\d\d|UC\d\d|ST\d\d)',nm or '')
            key=m.group(1) if m else None
        if key not in curm: print(p,'không khớp trang',did,nm); continue
        a=cells(ET.fromstring(mxml)) if isinstance(mxml,str) else None
        b=curm[key][1]
        add=[k for k in a if k not in b]; rem=[k for k in b if k not in a]
        chg=[k for k in a if k in b and a[k]!=b[k]]
        print(f'{os.path.basename(p)[:40]:42s} -> {key}: png={len(a)} cur={len(b)} thêm={len(add)} mất={len(rem)} đổi={len(chg)}')
