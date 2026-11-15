import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import dfd2_specs,dfd2_lib
for n in sys.argv[1:]:
    m,W,H=getattr(dfd2_specs,n.lower())()
    open(os.path.join(dfd2_lib.SP,n+'.model.xml'),'w',encoding='utf8').write(m)
    dfd2_lib.render(m,n,W,H);print(n,W,H)
