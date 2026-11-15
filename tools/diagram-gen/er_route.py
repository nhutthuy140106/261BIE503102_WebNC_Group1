import os,sys,heapq,html
sys.stdout.reconfigure(encoding='utf8')
SP=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,SP)
from dfd2_lib import render
N='#22304A'
esc=lambda t:html.escape(t,quote=True)
G=10          # bước lưới
LH=20; HEAD=34

def up(v,m=G): return int(-(-v//m)*m)

class ERD:
    def __init__(self,pid,title):
        self.pid=pid; self.title=title; self.ents={}; self.order=[]; self.edges=[]
    def entity(self,key,x,y,name,attrs,w=250,tag='',fill='#FFFFFF',stroke='#7F93B3',head='#E4EAF3'):
        """attrs: list of (marker,text): marker in '', 'PK','FK'"""
        h=up(HEAD+LH*(len(attrs))+14)
        self.ents[key]=dict(x=x,y=y,w=w,h=h,name=name,attrs=attrs,tag=tag,fill=fill,stroke=stroke,head=head,id=f'{self.pid}_{key}')
        self.order.append(key)
    def rel(self,one,many,label,sa='ERone',ea='ERzeroToMany',dashed=False):
        self.edges.append(dict(a=one,b=many,label=label,sa=sa,ea=ea,dashed=dashed))
    # ---------- định tuyến
    def _ports(self,k):
        e=self.ents[k]; x,y,w,h=e['x'],e['y'],e['w'],e['h']; P=[]
        c20=lambda v:((int(v)+19)//20)*20
        for px in range(c20(x+20),x+w-10,20):
            P.append((px,y,'t')); P.append((px,y+h,'b'))
        for py in range(c20(y+50),y+h-10,20):
            P.append((x,py,'l')); P.append((x+w,py,'r'))
        return P
    def route(self):
        ents=self.ents
        blocked=set()
        for e in ents.values():
            for gx in range(e['x']+G,e['x']+e['w'],G):
                for gy in range(e['y']+G,e['y']+e['h'],G): blocked.add((gx,gy))
        # viền hộp: chỉ cổng mới được đi qua
        border=set()
        for e in ents.values():
            for gx in range(e['x'],e['x']+e['w']+1,G):
                border.add((gx,e['y'])); border.add((gx,e['y']+e['h']))
            for gy in range(e['y'],e['y']+e['h']+1,G):
                border.add((e['x'],gy)); border.add((e['x']+e['w'],gy))
        # vùng đệm 30px quanh hộp: cấm đi vào, trừ hành lang thẳng ra từ mỗi cổng
        CL=30
        corridor=set()
        for k in ents:
            for (px,py,sd) in self._ports(k):
                dx,dy={'t':(0,-G),'b':(0,G),'l':(-G,0),'r':(G,0)}[sd]
                for t in range(1,CL//G+1): corridor.add((px+t*dx,py+t*dy))
        Wt=max(e['x']+e['w'] for e in ents.values())+160; Ht=max(e['y']+e['h'] for e in ents.values())+160
        for gx in range(0,Wt+1,G):
            for gy in range(0,Ht+1,G):
                for e in ents.values():
                    ddx=max(e['x']-gx,0,gx-(e['x']+e['w'])); ddy=max(e['y']-gy,0,gy-(e['y']+e['h']))
                    if max(ddx,ddy)<CL and (gx,gy) not in corridor and (ddx>0 or ddy>0):
                        blocked.add((gx,gy)); break
        occ={}   # cell -> set('h','v')
        used=set()
        W=max(e['x']+e['w'] for e in ents.values())+100; H=max(e['y']+e['h'] for e in ents.values())+100
        self.W,self.H=W,H
        def dist_box(x,y,e):
            dx=max(e['x']-x,0,x-(e['x']+e['w'])); dy=max(e['y']-y,0,y-(e['y']+e['h'])); return dx+dy
        dirs={'t':(0,-G),'b':(0,G),'l':(-G,0),'r':(G,0)}
        results=[]
        order=sorted(range(len(self.edges)),key=lambda i:abs((ents[self.edges[i]['a']]['x']+ents[self.edges[i]['a']]['w']/2)-(ents[self.edges[i]['b']]['x']+ents[self.edges[i]['b']]['w']/2))+abs((ents[self.edges[i]['a']]['y']+ents[self.edges[i]['a']]['h']/2)-(ents[self.edges[i]['b']]['y']+ents[self.edges[i]['b']]['h']/2)))
        for i in order:
            ed=self.edges[i]; A=ents[ed['a']]; B=ents[ed['b']]
            sp=[p for p in self._ports(ed['a']) if (ed['a'],p[0],p[1]) not in used]
            gp={(p[0],p[1]):p for p in self._ports(ed['b']) if (ed['b'],p[0],p[1]) not in used}
            # cặp hộp thẳng hàng (chồng dọc hoặc kề ngang): dùng các cổng ở GIỮA, chừa hai bên cho đường khác
            cntp=sum(1 for e2 in self.edges if {e2['a'],e2['b']}=={ed['a'],ed['b']})
            xlo=max(A['x'],B['x']); xhi=min(A['x']+A['w'],B['x']+B['w'])
            ylo=max(A['y'],B['y']); yhi=min(A['y']+A['h'],B['y']+B['h'])
            half=10+20*cntp
            def clear_between(x0,x1,y0,y1):
                for k3,e3 in self.ents.items():
                    if k3 in (ed['a'],ed['b']): continue
                    if e3['x']<x1 and e3['x']+e3['w']>x0 and e3['y']<y1 and e3['y']+e3['h']>y0: return False
                return True
            vert_ok=xhi-xlo>=60 and (A['y']+A['h']<=B['y'] or B['y']+B['h']<=A['y']) and clear_between(xlo,xhi,min(A['y']+A['h'],B['y']+B['h']),max(A['y'],B['y']))
            horz_ok=yhi-ylo>=60 and (A['x']+A['w']<=B['x'] or B['x']+B['w']<=A['x']) and clear_between(min(A['x']+A['w'],B['x']+B['w']),max(A['x'],B['x']),ylo,yhi)
            if vert_ok:
                cx=(xlo+xhi)/2
                f1=[p for p in sp if p[2] in 'tb' and abs(p[0]-cx)<=half]
                g1={k:v for k,v in gp.items() if v[2] in 'tb' and abs(k[0]-cx)<=half}
                if f1 and g1: sp,gp=f1,g1
            elif horz_ok:
                cy=(ylo+yhi)/2
                f1=[p for p in sp if p[2] in 'lr' and abs(p[1]-cy)<=half]
                g1={k:v for k,v in gp.items() if v[2] in 'lr' and abs(k[1]-cy)<=half}
                if f1 and g1: sp,gp=f1,g1
            heap=[]; best={}
            for (px,py,sd) in sp:
                dx,dy=dirs[sd]; st=(px+dx,py+dy)
                if st in blocked: continue
                state=(st[0],st[1],sd,1)
                c=1
                heapq.heappush(heap,(c+dist_box(st[0],st[1],B)/G,c,state,[(px,py),st],(px,py,sd)))
            found=None
            seen={}
            while heap:
                f,c,state,path,start=heapq.heappop(heap)
                x,y,d,run=state
                if state in seen and seen[state]<=c: continue
                seen[state]=c
                # đích: ô ngay ngoài một cổng của B, đi vào đúng chiều
                for (gx,gy),(px,py,sd) in gp.items():
                    ox,oy=dirs[sd]
                    if (x,y)==(gx+ox,gy+oy): found=(path+[(gx,gy)],start,(gx,gy,sd),c); break
                if found: break
                for nd,(dx,dy) in dirs.items():
                    nx,ny=x+dx,y+dy
                    if nx<0 or ny<0 or nx>W or ny>H: continue
                    if (nx,ny) in blocked: continue
                    if (nx,ny) in border: continue
                    # không quay đầu
                    if (nd,d) in (('t','b'),('b','t'),('l','r'),('r','l')): continue
                    ori='h' if nd in 'lr' else 'v'
                    cost=1+((55+(120 if run<4 else 0)) if nd!=d else 0)
                    o=occ.get((nx,ny),set())
                    if o:
                        if ori in o: cost+=120
                        else: cost+=35
                    # gần dây khác song song
                    for ax,ay in ((G,0),(-G,0),(0,G),(0,-G)):
                        if ori in occ.get((nx+ax,ny+ay),set()) and ((ax!=0 and ori=='v') or (ay!=0 and ori=='h')): cost+=70
                    ns=(nx,ny,nd,(1 if nd!=d else min(run+1,4))); nc=c+cost
                    if ns in seen and seen[ns]<=nc: continue
                    heapq.heappush(heap,(nc+dist_box(nx,ny,B)/G,nc,ns,path+[(nx,ny)],start))
            if not found: print('KHÔNG ĐỊNH TUYẾN ĐƯỢC',ed['a'],ed['b'],ed['label'],file=sys.stderr); results.append((i,None)); continue
            path,start,end,_=found
            used.add((ed['a'],start[0],start[1])); used.add((ed['b'],end[0],end[1]))
            # đánh dấu chiếm dụng
            for p,q in zip(path[:-1],path[1:]):
                if p[0]==q[0]:
                    for yy in range(min(p[1],q[1]),max(p[1],q[1])+1,G): occ.setdefault((p[0],yy),set()).add('v')
                else:
                    for xx in range(min(p[0],q[0]),max(p[0],q[0])+1,G): occ.setdefault((xx,p[1]),set()).add('h')
            results.append((i,(path,start,end)))
        self.routes=dict(results)
    # ---------- xuất XML
    def model(self,legend=True):
        self.route()
        cells=[f'<mxCell id="{self.pid}_title" value="{esc(self.title)}" style="html=1;whiteSpace=wrap;fontFamily=Arial;strokeColor=none;fillColor=none;align=left;verticalAlign=top;fontSize=26;fontStyle=1;fontColor={N};" vertex="1" parent="1" bpmnType="note"><mxGeometry x="40" y="16" width="1800" height="36" as="geometry"/></mxCell>']
        for k in self.order:
            e=self.ents[k]
            rows=''
            for mk,tx in e['attrs']:
                if mk=='PK': rows+=f'<tr><td style="width:34px;font-weight:bold;border-bottom:1px solid {e["stroke"]};padding:2px 6px">PK</td><td style="border-bottom:1px solid {e["stroke"]};padding:2px 6px;font-weight:bold;text-decoration:underline">{esc(tx)}</td></tr>'
                elif mk=='FK': rows+=f'<tr><td style="width:34px;padding:1px 6px;color:#B4531A;font-weight:bold">FK</td><td style="padding:1px 6px;font-weight:bold">{esc(tx)}</td></tr>'
                else: rows+=f'<tr><td style="width:34px;padding:1px 6px"></td><td style="padding:1px 6px">{esc(tx)}</td></tr>'
            tagh=f' <span style="font-weight:normal;font-size:11px;color:#B4531A">{esc(e["tag"])}</span>' if e['tag'] else ''
            lab=(f'<div style="width:{e["w"]-6}px;box-sizing:border-box;padding:6px 10px;background:{e["head"]};border-bottom:2px solid {e["stroke"]};font-weight:bold;font-size:14px;color:{N};text-align:left;border-radius:6px 6px 0 0;white-space:nowrap">{esc(e["name"])}{tagh}</div>'
                 f'<table style="border-collapse:collapse;width:{e["w"]-6}px;font-size:12px;color:{N};text-align:left;line-height:{LH-4}px">{rows}</table>')
            cells.append(f'<mxCell id="{e["id"]}" value="{esc(lab)}" style="rounded=1;arcSize=2;whiteSpace=wrap;html=1;fontFamily=Arial;strokeColor={e["stroke"]};strokeWidth=2;fillColor={e["fill"]};verticalAlign=top;align=left;spacing=0;" vertex="1" parent="1" bpmnType="entity"><mxGeometry x="{e["x"]}" y="{e["y"]}" width="{e["w"]}" height="{e["h"]}" as="geometry"/></mxCell>')
        polys={}
        self.jogs=0; self.jogl=[]; self.bends=0
        for i,ed in enumerate(self.edges):
            r=self.routes.get(i)
            if not r: continue
            path,start,end=r
            pts=[path[0]]
            for j in range(1,len(path)-1):
                a,b,c=path[j-1],path[j],path[j+1]
                if (b[0]-a[0],b[1]-a[1])!=(c[0]-b[0],c[1]-b[1]) and not((a[0]==b[0]==c[0]) or (a[1]==b[1]==c[1])): pts.append(b)
            pts.append(path[-1])
            polys[i]=pts; self.bends+=len(pts)-2
            for j2 in range(1,len(pts)-2):
                if abs(pts[j2+1][0]-pts[j2][0])+abs(pts[j2+1][1]-pts[j2][1])<=20: self.jogs+=1; self.jogl.append((ed['a'],ed['b'],pts[j2],pts[j2+1]))  # JOGS
        self.polys=polys
        def seg_hits_rect(p,q,rx0,ry0,rx1,ry1):
            x0,x1=sorted((p[0],q[0])); y0,y1=sorted((p[1],q[1]))
            return not (x1<rx0 or x0>rx1 or y1<ry0 or y0>ry1)
        def pick_label(i,ed,pts):
            lw=6.4*len(ed['label'])+14; lh=16
            segs=[(pts[j],pts[j+1]) for j in range(len(pts)-1)]
            L=[abs(q[0]-p[0])+abs(q[1]-p[1]) for p,q in segs]
            order=sorted(range(len(segs)),key=lambda t:-L[t])
            for j in order:
                p,q=segs[j]; horiz=(p[1]==q[1])
                need=(lw if horiz else lh)+60   # chừa chỗ cho ký hiệu chân quạ ở hai đầu
                if L[j]<need: continue
                d_=lw/2+13
                offs=[(0,0)]+([(-d_,0),(d_,0)] if not horiz else [(0,-14),(0,14)])
                for fr in (0.5,0.35,0.65,0.25,0.75):
                  for (ox,oy) in offs:
                    cx=p[0]+(q[0]-p[0])*fr+ox; cy=p[1]+(q[1]-p[1])*fr+oy
                    rx0,rx1=cx-lw/2-4,cx+lw/2+4; ry0,ry1=cy-lh/2-3,cy+lh/2+3
                    ok=True
                    for e in self.ents.values():
                        if not (rx1<e['x']-8 or rx0>e['x']+e['w']+8 or ry1<e['y']-8 or ry0>e['y']+e['h']+8): ok=False; break
                    if not ok: continue
                    for k2,pts2 in polys.items():
                        for a2,b2 in zip(pts2[:-1],pts2[1:]):
                            if (ox or oy) and k2==i and (a2,b2)==(p,q): continue
                            if k2==i and (a2,b2)==(p,q) and not(ox or oy): continue
                            if seg_hits_rect(a2,b2,rx0,ry0,rx1,ry1): ok=False; break
                        if not ok: break
                    if ok: return j,fr,ox,oy
            j=order[0]; return j,0.5,0,0
        for i,ed in enumerate(self.edges):
            r=self.routes.get(i)
            if not r: continue
            path,start,end=r
            A=self.ents[ed['a']]; B=self.ents[ed['b']]
            pts=polys[i]
            via=pts[1:-1]
            ex=(pts[0][0]-A['x'])/A['w']; ey=(pts[0][1]-A['y'])/A['h']
            tx=(pts[-1][0]-B['x'])/B['w']; ty=(pts[-1][1]-B['y'])/B['h']
            segs=[(pts[j],pts[j+1]) for j in range(len(pts)-1)]
            L=[abs(q[0]-p[0])+abs(q[1]-p[1]) for p,q in segs]; T=sum(L) or 1
            j,fr,lox,loy=pick_label(i,ed,pts); mid=sum(L[:j])+L[j]*fr
            xr=(mid/T-0.5)*2
            dash='dashed=1;dashPattern=6 4;' if ed['dashed'] else ''
            st=(f'html=1;rounded=0;endSize=10;startSize=10;strokeColor={N};strokeWidth=1.6;{dash}fontFamily=Arial;fontSize=11;fontColor={N};labelBackgroundColor=#ffffff;'
                f'startArrow={ed["sa"]};startFill=0;endArrow={ed["ea"]};endFill=0;'
                f'exitX={ex:.4f};exitY={ey:.4f};exitDx=0;exitDy=0;exitPerimeter=0;entryX={tx:.4f};entryY={ty:.4f};entryDx=0;entryDy=0;entryPerimeter=0;')
            wp=''.join(f'<mxPoint x="{p[0]}" y="{p[1]}"/>' for p in via)
            arr=f'<Array as="points">{wp}</Array>' if wp else ''
            cells.append(f'<mxCell id="{self.pid}_e{i}" value="{esc(ed["label"] if getattr(self,"show_labels",True) else "")}" style="{st}" edge="1" parent="1" source="{A["id"]}" target="{B["id"]}"><mxGeometry x="{xr:.3f}" relative="1" as="geometry">{arr}<mxPoint as="offset" x="{lox:.0f}" y="{loy:.0f}"/></mxGeometry></mxCell>')
        W,H=self.W,self.H
        if getattr(self,'note',None):
            cells.append(f'<mxCell id="{self.pid}_note" value="{esc(self.note)}" style="html=1;whiteSpace=wrap;fontFamily=Arial;strokeColor=none;fillColor=none;align=left;verticalAlign=top;fontSize=12;fontColor={N};" vertex="1" parent="1" bpmnType="note"><mxGeometry x="40" y="{H-40}" width="{max(900,W-80)}" height="40" as="geometry"/></mxCell>')
            H+=20
        return (f'<mxGraphModel dx="1190" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="{W}" pageHeight="{H}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+''.join(cells)+'</root></mxGraphModel>'),W,H
