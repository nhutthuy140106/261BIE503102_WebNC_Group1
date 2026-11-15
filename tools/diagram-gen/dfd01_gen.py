import os,sys,itertools
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from dfd2_lib import G2

def dfd01(order=('1','3','2','4')):
    d=G2('DFD01','DFD01 — Sơ đồ mức 1: các quá trình chính'); d.inline=True
    PW,PH=270,150
    AX,BX=480,1250
    cyA={k:300+250*i for i,k in enumerate(order)}; cyB={'7':300,'5':550,'6':800}
    names={'1':'Tài khoản và<br>xác minh','2':'Bài đăng và<br>khám phá','3':'Đơn mua<br>và dịch vụ','4':'Tuyển và<br>thực hiện việc','5':'Trao đổi<br>và uy tín','6':'AntXu<br>và ưu đãi','7':'Quản trị<br>và báo cáo'}
    stores={'1':'Tài khoản, xác minh','2':'Bài, việc, bài lưu','3':'Đơn, vấn đề, tiền','4':'Đề nghị, hỏi đáp, tiền','5':'Hội thoại, đánh giá','6':'Sổ Xu, voucher','7':'Báo cáo, nhật ký'}
    node=lambda k:d.nodes[k]
    def cx(k): n=node(k); return n['x']+n['w']/2
    def cyy(k): n=node(k); return n['y']+n['h']/2
    def off(k,side,p):
        return (p-cyy(k)) if side in 'lr' else (p-cx(k))
    def fl(a,sa,pa,b,sb,pb,label,via=None,**kw):
        d.flow(a,sa,off(a,sa,pa),b,sb,off(b,sb,pb),label,via=via,**kw)
    allp={}
    for k,c in cyA.items(): d.proc('p'+k,AX,c-PH/2,PW,PH,k+'.0',names[k]); allp['p'+k]=c
    for k,c in cyB.items(): d.proc('p'+k,BX,c-PH/2,PW,PH,k+'.0',names[k]); allp['p'+k]=c
    # cột trái (A) và phải (B): Thành viên + kho
    TVL={'1':('Hồ sơ, xác thực','Phiên, kết quả'),'3':('Giỏ, yêu cầu đặt, hủy','Đơn, tiến độ, hậu mãi'),
         '2':('Nội dung bài, truy vấn','Danh sách, chi tiết'),'4':('Đề nghị, báo xong, nghiệm thu','Kết quả tuyển, nhận tiền')}
    TVR={'5':('Tin nhắn, đánh giá','Tin nhận, thông báo'),'6':('Đổi / dùng voucher','Số dư, voucher'),'7':('Báo cáo vi phạm','Kết quả xử lý')}
    for k,(i_,o) in TVL.items():
        c=cyA[k]
        d.ext('tv'+k,40,c-80,230,70,'Thành viên'); d.store('d'+k,40,c+10,230,70,'D'+k,stores[k])
        fl('tv'+k,'r',c-60,'p'+k,'l',c-60,i_); fl('p'+k,'l',c-30,'tv'+k,'r',c-30,o)
        fl('p'+k,'l',c+30,'d'+k,'r',c+30,'Bản ghi cập nhật'); fl('d'+k,'r',c+60,'p'+k,'l',c+60,'Dữ liệu hiện có')
    for k,(i_,o) in TVR.items():
        c=cyB[k]
        d.ext('tv'+k,1790,c-80,230,70,'Thành viên'); d.store('d'+k,1790,c+10,230,70,'D'+k,stores[k])
        fl('tv'+k,'l',c-60,'p'+k,'r',c-60,i_); fl('p'+k,'r',c-30,'tv'+k,'l',c-30,o)
        fl('p'+k,'r',c+30,'d'+k,'l',c+30,'Bản ghi cập nhật'); fl('d'+k,'l',c+60,'p'+k,'r',c+60,'Dữ liệu hiện có')
    # ngoài
    d.ext('sms',430,60,170,60,'Nhà cung cấp SMS'); d.ext('gg',625,60,150,60,'Google'); d.ext('qt',920,60,160,60,'Quản trị viên')
    fl('p1','t',490,'sms','b',490,'Gửi OTP'); fl('sms','b',560,'p1','t',560,'Kết quả gửi')
    fl('p1','t',645,'gg','b',645,'Yêu cầu'); fl('gg','b',715,'p1','t',715,'Kết quả')
    fl('p1','r',240,'qt','b',935,'Hồ sơ chờ duyệt',via=[(935,240)])
    fl('qt','b',965,'p1','r',260,'Quyết định duyệt',via=[(965,260)])
    fl('p7','l',240,'qt','b',1065,'Báo cáo, thống kê',via=[(1065,240)])
    fl('qt','b',1035,'p7','l',260,'Quyết định xử lý',via=[(1035,260)])
    # dọc cùng cột
    def vpair(top,bot,l1,l2):
        # top,bot theo thứ tự từ trên xuống; p2 luôn là một đầu
        a,b=('p2',('p3' if 'p3' in (top,bot) else 'p4'))
        # đường trái: p2 -> p3/p4 ; đường phải: p3/p4 -> p2
        xl,xr=AX+60,AX+210
        if top=='p2':   # p2 ở trên
            fl('p2','b',xl,b,'t',xl,l1[0]); fl(b,'t',xr,'p2','b',xr,l1[1])
        else:
            fl(b,'b',xl,'p2','t',xl,l1[1]); fl('p2','t',xr,b,'b',xr,l1[0])
    ordr=list(order)
    i2=ordr.index('2')
    for nb,lab in (('3',('Bài bán, giá, tồn','Biến động tồn')),('4',('Việc, lịch, số người','Trạng thái tuyển'))):
        top,bot=('p2','p'+nb) if ordr.index(nb)>i2 else ('p'+nb,'p2')
        vpair(top,bot,lab,lab)
    fl('p7','b',cx('p7'),'p5','t',cx('p7'),'Kết quả cần thông báo')
    fl('p5','b',cx('p5'),'p6','t',cx('p5'),'Sự kiện đánh giá')
    # chéo giữa hai cột: (nguồn,cạnh nguồn,y nguồn, đích,y đích,nhãn)
    CF=[('p7','p1','Khóa / quyền tài khoản'),('p7','p3','Quyết định tranh chấp'),('p7','p2','Ẩn / khôi phục bài'),
        ('p7','p4','Quyết định phản đối kết quả'),('p3','p5','Sự kiện đơn, hậu mãi'),('p4','p5','Sự kiện tuyển, tiến độ'),
        ('p3','p6','Thưởng, đảo thưởng đơn'),('p6','p3','Kết quả kiểm / giữ voucher'),('p4','p6','Thưởng, đảo thưởng việc')]
    isA=lambda k:k in('p1','p2','p3','p4')
    slot={}   # (flow idx, 'src'|'dst') -> y offset
    groups={}
    for i,(a_,b_,l_) in enumerate(CF):
        groups.setdefault(a_,[]).append((i,'src',b_)); groups.setdefault(b_,[]).append((i,'dst',a_))
    base=[-60,-40,-20,0,20,40,60]
    for node_,lst in groups.items():
        res={-60,-40} if node_ in('p1','p7') else set()
        avail=[o for o in base if o not in res]
        st=[x for x in lst if allp[x[2]]==allp[node_]]
        for (i,w,o_) in st: slot[(i,w)]=0
        rest=[x for x in lst if x not in st]
        if st: avail=[o for o in avail if o!=0]
        rest.sort(key=lambda x:allp[x[2]])
        st0=max(0,(len(avail)-len(rest))//2)
        for j,(i,w,o_) in enumerate(rest): slot[(i,w)]=avail[st0+j]
    F=[]
    for i,(a_,b_,l_) in enumerate(CF):
        sa='r' if isA(a_) else 'l'; sb='r' if isA(b_) else 'l'
        F.append((a_,sa,allp[a_]+slot[(i,'src')],b_,sb,allp[b_]+slot[(i,'dst')],l_))
    straight=[f for f in F if f[2]==f[5]]
    bent=[f for f in F if f[2]!=f[5]]
    lanes=[780+int(440/(len(bent)))*i+20 for i in range(len(bent))]
    def ends(f,lx):
        _,sa,ya,_,sb,yb,_=f
        # đầu nguồn ở cạnh trái B (p7,p6) hoặc phải A
        xa=(BX if sa=='l' else AX+PW); xb=(BX if sb=='l' else AX+PW)
        return [(xa,ya),(lx,ya),(lx,yb),(xb,yb)]
    def segs(pts): return list(zip(pts[:-1],pts[1:]))
    def cross(s,t):
        (a,b),(c,e)=s,t
        sh=a[1]==b[1]; th=c[1]==e[1]
        if sh==th:
            if sh and a[1]==c[1]: return min(max(a[0],b[0]),max(c[0],e[0]))>max(min(a[0],b[0]),min(c[0],e[0]))
            if (not sh) and a[0]==c[0]: return min(max(a[1],b[1]),max(c[1],e[1]))>max(min(a[1],b[1]),min(c[1],e[1]))
            return False
        if not sh: s,t=t,s; (a,b),(c,e)=s,t
        # s ngang, t dọc
        return min(a[0],b[0])<c[0]<max(a[0],b[0]) and min(c[1],e[1])<a[1]<max(c[1],e[1])
    fixed=[segs([(AX+PW,f[2]),(BX,f[5])]) for f in straight]
    best=None
    for perm in itertools.permutations(lanes):
        P=[segs(ends(f,lx)) for f,lx in zip(bent,perm)]
        n=0
        for i in range(len(P)):
            for j in range(i+1,len(P)):
                n+=sum(cross(s,t) for s in P[i] for t in P[j])
            for q in fixed: n+=sum(cross(s,t) for s in P[i] for t in q)
        if best is None or n<best[0]: best=(n,perm)
    d.cross=best[0]
    for n_,(f,lx) in enumerate(zip(bent,best[1])):
        a,sa,ya,b,sb,yb,lab=f
        pts=ends(f,lx); ss=segs(pts)
        L=[abs(q[0]-p[0])+abs(q[1]-p[1]) for p,q in ss]
        j=max(range(3),key=lambda i:L[i]) if False else max(range(len(L)),key=lambda i:L[i])
        vert=(ss[j][0][0]==ss[j][1][0])
        fr=(0.2+0.6*((n_*3)%len(bent))/len(bent)) if vert else 0.5
        fl(a,sa,ya,b,sb,yb,lab,via=[(lx,ya),(lx,yb)],lab_seg=j,lab_frac=fr)
    for f in straight:
        a,sa,ya,b,sb,yb,lab=f
        fl(a,sa,ya,b,sb,yb,lab)
    W,H=2080,1230
    return d.model(W,H),W,H,d.cross
