import sys,os,re,html
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import er_route
orig=er_route.ERD.model
def patched(self,*a,**k):
    r=orig(self,*a,**k)
    bad=[(e['a'],e['b']) for i,e in enumerate(self.edges) if not self.routes.get(i)]
    print(self.pid,'gập bậc nhỏ =',self.jogs,'| tổng số chỗ gập =',self.bends,'| đường chưa nối =',bad,flush=True)
    many=[(self.edges[i]['a'],self.edges[i]['b'],len(p)-2) for i,p in self.polys.items() if len(p)-2>=3]
    print('   nhiều gập (>=3):',many,flush=True)
    return r
er_route.ERD.model=patched
import erd02_single,erd_tobe_single
from dfd2_lib import render
out={}
m,W,H=erd02_single.er02(); out['ER02']=(m,W,H)
for pid,title,typed in (('ER01','ER01 — Logic To-Be',False),('ER03','ER03 — Vật lý MongoDB To-Be',True)):
    out[pid]=erd_tobe_single.make(pid,title,typed)
f=r'D:/Năm 1/WEB2/docs/bao-cao/anh-sua.drawio'
x=open(f,encoding='utf8').read()
for pid,(m,W,H) in out.items():
    open(pid+'s.model.xml','w',encoding='utf8').write(m)
    pat=re.compile(r'(<diagram id="%s"[^>]*>).*?(</diagram>)'%pid,re.S)
    assert pat.search(x),pid
    x=pat.sub(lambda g:g.group(1)+m+g.group(2),x,count=1)
    print(pid,W,H,flush=True)
import xml.dom.minidom as md; md.parseString(x.encode('utf8'))
open(f,'w',encoding='utf8').write(x)
print('đã cập nhật file draw.io')
for pid in out: render(out[pid][0],pid+'s',out[pid][1],out[pid][2])
