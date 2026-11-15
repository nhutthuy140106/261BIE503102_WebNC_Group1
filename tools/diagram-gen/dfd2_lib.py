import sys,html,os,json,subprocess,math
sys.stdout.reconfigure(encoding='utf8')
SP=os.path.dirname(os.path.abspath(__file__))
N='#22304A'
esc=lambda t:html.escape(t,quote=True)
BLUE=('#E4EAF3','#7F93B3'); YEL=('#FBF0CC','#D4B04F'); ORG=('#FDE7DA','#E2976B')

class G2:
    """DFD kiểu Gane-Sarson, đường nối vuông góc."""
    def __init__(self,pid,title):
        self.pid=pid; self.cells=[]; self.edges=[]; self.nodes={}; self.n=0
        self.text('title',title,40,16,1800,36,f'html=1;whiteSpace=wrap;fontFamily=Arial;strokeColor=none;fillColor=none;align=left;verticalAlign=top;fontSize=26;fontStyle=1;fontColor={N};')
    def text(self,key,value,x,y,w,h,style):
        self.cells.append(f'<mxCell id="{self.pid}_{key}" value="{esc(value)}" style="{style}" vertex="1" parent="1" bpmnType="note"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    def _node(self,key,kind,x,y,w,h,label,style):
        i=f'{self.pid}_{key}'
        self.nodes[key]=dict(kind=kind,x=x,y=y,w=w,h=h,id=i)
        self.cells.append(f'<mxCell id="{i}" value="{esc(label)}" style="{style}" vertex="1" parent="1" bpmnType="{kind}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    def proc(self,key,x,y,w,h,pid_label,name,ref=False):
        f,s=BLUE
        dash='dashed=1;dashPattern=8 5;' if ref else ''
        fill='#FFFFFF' if ref else f
        lab=(f'<div style="width:{w-6}px;box-sizing:border-box;text-align:left;padding:3px 10px;border-bottom:2px solid {s};font-weight:bold;font-size:13px;color:{N}">{pid_label}</div>'
             f'<div style="width:{w-6}px;height:{h-36}px;display:flex;align-items:center;justify-content:center;text-align:center;color:{N};font-size:16px">{name}</div>')
        self._node(key,'process',x,y,w,h,lab,f'rounded=1;arcSize=5;whiteSpace=wrap;html=1;fontFamily=Arial;fontSize=15;strokeColor={s};strokeWidth=2.2;fillColor={fill};verticalAlign=top;align=left;spacing=0;{dash}')
    def ext(self,key,x,y,w,h,label):
        f,s=ORG
        self._node(key,'external',x,y,w,h,label,f'rounded=0;whiteSpace=wrap;html=1;spacing=6;fontFamily=Arial;fontSize=15;fontStyle=1;fontColor={N};strokeColor={s};strokeWidth=2.2;fillColor={f};')
    def store(self,key,x,y,w,h,sid,label):
        f,s=YEL
        lab=(f'<div style="width:{w-6}px;height:{h-4}px;display:flex;align-items:center"><div style="width:50px;text-align:center;border-right:2px solid {s};font-weight:bold;color:{N};padding:8px 0">{sid}</div>'
             f'<div style="padding:0 12px;text-align:left;color:{N}">{label}</div></div>')
        self._node(key,'store',x,y,w,h,lab,f'shape=partialRectangle;right=0;whiteSpace=wrap;html=1;fontFamily=Arial;fontSize=14;strokeColor={s};strokeWidth=2.2;fillColor={f};align=left;verticalAlign=middle;spacing=0;')
    def legend(self,x,y):
        h=46+3*40
        self.text('lgf','Chú thích',x,y,260,h,f'rounded=1;arcSize=5;whiteSpace=wrap;html=1;fontFamily=Arial;fontSize=15;fontStyle=1;fontColor={N};strokeColor=#9FB0CC;strokeWidth=2;fillColor=#FFFFFF;verticalAlign=top;align=left;spacingLeft=16;spacingTop=8;')
        f,s=BLUE; self.cells.append(f'<mxCell id="{self.pid}_lg0" value="" style="rounded=1;arcSize=10;html=1;strokeColor={s};strokeWidth=2;fillColor={f};" vertex="1" parent="1"><mxGeometry x="{x+18}" y="{y+48}" width="44" height="26" as="geometry"/></mxCell>')
        f,s=ORG; self.cells.append(f'<mxCell id="{self.pid}_lg1" value="" style="rounded=0;html=1;strokeColor={s};strokeWidth=2;fillColor={f};" vertex="1" parent="1"><mxGeometry x="{x+18}" y="{y+88}" width="44" height="26" as="geometry"/></mxCell>')
        f,s=YEL; self.cells.append(f'<mxCell id="{self.pid}_lg2" value="" style="shape=partialRectangle;right=0;html=1;strokeColor={s};strokeWidth=2;fillColor={f};" vertex="1" parent="1"><mxGeometry x="{x+18}" y="{y+128}" width="44" height="26" as="geometry"/></mxCell>')
        for i,lab in enumerate(['Quá trình','Tác nhân ngoài','Kho dữ liệu']):
            self.text(f'lgt{i}',lab,x+76,y+46+i*40,170,30,f'html=1;whiteSpace=wrap;fontFamily=Arial;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=14;fontColor={N};')
    # ---------- đường nối vuông góc
    def _pt(self,k,side,off):
        d=self.nodes[k]
        if side=='r': return (d['x']+d['w'],d['y']+d['h']/2+off)
        if side=='l': return (d['x'],d['y']+d['h']/2+off)
        if side=='t': return (d['x']+d['w']/2+off,d['y'])
        return (d['x']+d['w']/2+off,d['y']+d['h'])
    def flow(self,a,sa,oa,b,sb,ob,label='',via=None,lab_seg=None,lab_frac=0.5,loff=(0,0)):
        """a[side,offset] -> b[side,offset]. via: danh sách điểm trung gian (x,y). Nếu không có và hai đầu lệch thì tự gập ở giữa."""
        if getattr(self,'inline',False): loff=(0,0)
        P0=self._pt(a,sa,oa); P1=self._pt(b,sb,ob)
        pts=[P0]
        if via: pts+=list(via)
        elif abs(P0[1]-P1[1])>0.5 and sa in 'rl' and sb in 'rl':
            xm=(P0[0]+P1[0])/2; pts+=[(xm,P0[1]),(xm,P1[1])]
        elif abs(P0[0]-P1[0])>0.5 and sa in 'tb' and sb in 'tb':
            ym=(P0[1]+P1[1])/2; pts+=[(P0[0],ym),(P1[0],ym)]
        pts.append(P1)
        segs=[(pts[i],pts[i+1]) for i in range(len(pts)-1)]
        L=[math.hypot(q[0]-p[0],q[1]-p[1]) for p,q in segs]; T=sum(L) or 1
        if lab_seg is None:
            lab_seg=max(range(len(L)),key=lambda i:L[i])
        cum=sum(L[:lab_seg])+L[lab_seg]*lab_frac
        xr=(cum/T-0.5)*2
        da=self.nodes[a]; db=self.nodes[b]
        fx=lambda d,p:((p[0]-d['x'])/d['w'],(p[1]-d['y'])/d['h'])
        ex,ey=fx(da,P0); tx,ty=fx(db,P1)
        self.n+=1
        wp=''.join(f'<mxPoint x="{p[0]:.1f}" y="{p[1]:.1f}"/>' for p in pts[1:-1])
        arr=f'<Array as="points">{wp}</Array>' if wp else ''
        st=(f'html=1;endArrow=block;endFill=1;endSize=9;strokeColor={N};strokeWidth=1.6;fontFamily=Arial;fontSize=13;fontColor={N};labelBackgroundColor=#ffffff;rounded=0;'
            f'exitX={ex:.4f};exitY={ey:.4f};exitDx=0;exitDy=0;exitPerimeter=0;entryX={tx:.4f};entryY={ty:.4f};entryDx=0;entryDy=0;entryPerimeter=0;')
        off=f'<mxPoint as="offset" x="{loff[0]}" y="{loff[1]}"/>'
        self.edges.append(f'<mxCell id="{self.pid}_e{self.n}" value="{esc(label)}" style="{st}" edge="1" parent="1" source="{da["id"]}" target="{db["id"]}"><mxGeometry x="{xr:.4f}" relative="1" as="geometry">{arr}{off}</mxGeometry></mxCell>')
    def model(self,W,H):
        return (f'<mxGraphModel dx="1190" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="{W}" pageHeight="{H}" math="0" shadow="0">'
                '<root><mxCell id="0"/><mxCell id="1" parent="0"/>'+''.join(self.cells+self.edges)+'</root></mxGraphModel>')

def render(model,pid,W,H):
    cfg=json.dumps({"highlight":"#0000ff","nav":False,"resize":True,"toolbar":"","xml":'<mxfile><diagram id="x" name="x">'+model+'</diagram></mxfile>'})
    hp=os.path.join(SP,pid+'v.html')
    open(hp,'w',encoding='utf8').write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff"><div class="mxgraph" data-mxgraph="'+html.escape(cfg,quote=True)+'"></div><script charset="utf-8" src="viewer.js"></script></body></html>')
    with open(os.path.join(SP,pid+'_x.txt'),'wb') as f:
        subprocess.run([r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe','--headless','--disable-gpu','--hide-scrollbars','--window-size=%d,%d'%(max(W,2500),H),'--virtual-time-budget=15000','--screenshot='+os.path.join(SP,pid+'v.png'),'file:///'+hp.replace(chr(92),'/')],stdout=f,stderr=subprocess.DEVNULL,timeout=150)
