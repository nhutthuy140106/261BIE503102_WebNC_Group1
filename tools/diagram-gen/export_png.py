import os,sys,re,json,html,subprocess,struct,zlib,urllib.parse
sys.stdout.reconfigure(encoding='utf8')
SP=os.path.dirname(os.path.abspath(__file__))
EDGE=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
BORDER=10; SCALE=3; DPI=100

def page_html(model,extra_body_style='',measure=False,box=None):
    cfg=json.dumps({"highlight":"#0000ff","nav":False,"resize":False,"toolbar":"","border":0,"xml":'<mxfile><diagram id="x" name="x">'+model+'</diagram></mxfile>'})
    div='<div class="mxgraph" id="g" data-mxgraph="'+html.escape(cfg,quote=True)+'"></div>'
    meas=('<script>window.addEventListener("load",function(){setTimeout(function(){var s=document.querySelector("svg");'
          'var g=s.querySelector("g");var b=g.getBBox();var r=s.getBoundingClientRect();'
          'document.body.setAttribute("data-bb",JSON.stringify({x:b.x,y:b.y,w:b.width,h:b.height,sw:r.width,sh:r.height,sx:r.left,sy:r.top}));},1500);});</script>') if measure else ''
    if box:
        bx,by,bw,bh=box
        body=f'<div style="width:{bw}px;height:{bh}px;overflow:hidden;position:relative;background:#fff"><div style="position:absolute;left:{-bx}px;top:{-by}px;width:6000px">{div}</div></div>'
    else: body=div
    return f'<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff">{body}<script charset="utf-8" src="viewer.js"></script>{meas}</body></html>'

def run_edge(args,outfile=None,timeout=150):
    kw=dict(stderr=subprocess.DEVNULL,timeout=timeout)
    if outfile:
        with open(outfile,'wb') as f: subprocess.run([EDGE]+args,stdout=f,**kw)
    else: subprocess.run([EDGE]+args,stdout=subprocess.DEVNULL,**kw)

def measure(model,name):
    hp=os.path.join(SP,name+'_m.html'); dom=os.path.join(SP,name+'_dom.txt')
    open(hp,'w',encoding='utf8').write(page_html(model,measure=True))
    run_edge(['--headless','--disable-gpu','--window-size=4000,2000','--virtual-time-budget=20000','--dump-dom','file:///'+hp.replace(chr(92),'/')],outfile=dom)
    d=open(dom,encoding='utf8',errors='ignore').read()
    m=re.search(r'data-bb="([^"]*)"',d)
    return json.loads(html.unescape(m.group(1)))

def add_chunks(png_path,xml_text):
    data=open(png_path,'rb').read()
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    ppm=int(round(DPI/0.0254))
    phys=chunk(b'pHYs',struct.pack('>IIB',ppm,ppm,1))
    txt=chunk(b'tEXt',b'mxfile\x00'+urllib.parse.quote(xml_text,safe='').encode('ascii'))
    # bỏ pHYs cũ nếu có, chèn pHYs trước IDAT, tEXt trước IEND
    out=data[:8]; i=8; ins_phys=False
    while i<len(data):
        ln=struct.unpack('>I',data[i:i+4])[0]; t=data[i+4:i+8]; seg=data[i:i+12+ln]
        if t==b'pHYs': i+=12+ln; continue
        if t==b'IDAT' and not ins_phys: out+=phys; ins_phys=True
        if t==b'IEND': out+=txt
        out+=seg; i+=12+ln
    open(png_path,'wb').write(out)

def export(model,name,page_title,png_path):
    bb=measure(model,name)
    left=bb['sx']-BORDER; top=bb['sy']-BORDER
    w=int(round(bb['sw']+2*BORDER)); h=int(round(bb['sh']+2*BORDER))
    # cắt theo nội dung thật (tính từ mô hình) để không dư vùng trắng bên phải/dưới
    xs=[];ys=[];xe=[];ye=[]
    for mm in re.finditer(r'<mxGeometry x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"',model):
        gx,gy,gw,gh=map(float,mm.groups())
        if gh<=40 and gw>=1400: gw=min(gw,700)
        xs.append(gx);ys.append(gy);xe.append(gx+gw);ye.append(gy+gh)
    for mm in re.finditer(r'<mxPoint x="(-?[\d.]+)" y="(-?[\d.]+)"/>',model):
        gx,gy=map(float,mm.groups()); xs.append(gx);ys.append(gy);xe.append(gx);ye.append(gy)
    if xs:
        cw=int(max(xe)-min(xs))+2*BORDER+12; ch=int(max(ye)-min(ys))+2*BORDER+12
        w=min(w,cw); h=min(h,ch)
    hp=os.path.join(SP,name+'_e.html')
    open(hp,'w',encoding='utf8').write(page_html(model,box=(left,top,w,h)))
    run_edge(['--headless','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=%d'%SCALE,'--window-size=%d,%d'%(w,h),'--virtual-time-budget=20000','--screenshot='+png_path,'file:///'+hp.replace(chr(92),'/')])
    xml='<mxfile host="app.diagrams.net" pages="1"><diagram name="%s">%s</diagram></mxfile>'%(html.escape(page_title,quote=True),model)
    add_chunks(png_path,xml)
    return w,h,bb

if __name__=='__main__':
    # dùng thử: python export_png.py <model.xml> <name> <out.png>
    m=open(sys.argv[1],encoding='utf8').read()
    print(export(m,sys.argv[2],sys.argv[2],sys.argv[3]))
