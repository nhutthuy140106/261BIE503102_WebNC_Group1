import os,sys,re,html
sys.stdout.reconfigure(encoding='utf8')
SP=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,SP)
import export_png
root=r'd:\Năm 1\WEB2\docs\bao-cao'
src=open(os.path.join(root,'anh-sua.drawio'),encoding='utf8').read()
jobs=[]
for m in re.finditer(r'<diagram id="((?:UC0\d)|(?:BP\d\d)|(?:AS\d\d)|(?:ST\d\d)|(?:DFD\d\d)|(?:ER\d\d[a-z]?))" name="([^"]*)">\s*(<mxGraphModel.*?</mxGraphModel>)\s*</diagram>',src,re.S):
    pid,name,model=m.group(1),html.unescape(m.group(2)),m.group(3)
    folder={'UC':'hinh-usecase','BP':'hinh-bpmn','ST':'hinh-trangthai','DF':'hinh-dfd','ER':'hinh-er','AS':'hinh-asis'}[pid[:2]]
    os.makedirs(os.path.join(root,folder),exist_ok=True)
    jobs.append((pid,name,model,os.path.join(root,folder,pid+'.png')))
only=sys.argv[1:]
for pid,name,model,png in jobs:
    if only and not any(pid.startswith(o) for o in only): continue
    w,h,bb=export_png.export(model,pid,name,png)
    print(pid,'%dx%d css -> %dx%d px'%(w,h,w*3,h*3),os.path.getsize(png)//1024,'KB',flush=True)
print('XONG',len(jobs))
