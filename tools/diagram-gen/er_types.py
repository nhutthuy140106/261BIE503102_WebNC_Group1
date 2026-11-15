import re,html,xml.etree.ElementTree as ET
BK=r'C:/Users/Admin/AppData/Local/Temp/claude/660f2b8cca64d33f/0833dcd5-0d26-4c6d-9b2c-9dd2c5d54430/scratchpad/anh-sua.backup.drawio'
def load(pid):
    r=ET.fromstring(open(BK,encoding='utf8').read()); out={}
    for dg in r.iter('diagram'):
        if dg.get('id')!=pid: continue
        for c in dg.find('mxGraphModel').iter('mxCell'):
            if c.get('vertex')=='1' and c.get('bpmnType')=='entity':
                v=html.unescape(c.get('value') or '').replace('&#10;','\n').split('\n')
                name=re.sub(r'^(CÓ THAY ĐỔI|ĐỀ XUẤT)\s*—\s*','',v[0].strip())
                d={}
                for l in v[1:]:
                    m=re.match(r'^\s*([\w.]+):\s*(\[?[\w]+\]?)',l)
                    if m: d[m.group(1)]=m.group(2)
                out[name]=d
    return out
CUR=load('ER02'); TOBE=load('ER03')
CUR['XuEntry']={'user':'ObjectId','title':'String','delta':'Number','kind':'String','key':'String','day':'String'}
CUR['XuVoucher']={'user':'ObjectId','cid':'String','code':'String','expiresAt':'Date','usedAt':'Date'}
ALIAS={'XuEntry':'XuLedger','XuVoucher':'UserVoucher'}
def typify(entity,attrs,source):
    src=source.get(entity) or source.get(ALIAS.get(entity,''),{})
    out=[]
    for mk,t in attrs:
        key=t.split(' (')[0].strip()
        if mk=='PK': out.append((mk,'_id: ObjectId')); continue
        ty=src.get(key)
        if ty and 'đa hình' in t: out.append((mk,f'{key}: {ty} (đa hình)'))
        elif ty: out.append((mk,f'{key}: {ty}'))
        else: out.append((mk,t))
    return out
