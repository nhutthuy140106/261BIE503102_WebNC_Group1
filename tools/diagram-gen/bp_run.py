import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf8')
import bp_lib
from bp_specs import SPECS
from bp_specs2 import SPECS as SPECS2
SPECS=SPECS+SPECS2
want=sys.argv[1:]
for sp in SPECS:
    if want and sp['id'] not in want: continue
    errs=bp_lib.check(sp)
    print(sp['id'],'LỖI:' if errs else 'ok',errs if errs else '')
    if not errs:
        m,W,H=bp_lib.render(sp,None); print('   ',int(W),'x',int(H))
