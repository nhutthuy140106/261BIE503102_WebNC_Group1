import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from dfd2_lib import G2,render

def dfd00():
    d=G2('DFD00','DFD00 — Sơ đồ ngữ cảnh (mức 0)'); d.inline=True
    d.proc('p0',520,300,300,200,'0','Hệ thống AntGo')
    d.ext('tv',40,330,230,140,'Thành viên')
    d.ext('qt',1070,330,230,140,'Quản trị viên')
    d.ext('sms',570,80,200,70,'Nhà cung cấp SMS')
    d.ext('gg',570,650,200,70,'Google')
    d.flow('tv','r',-40,'p0','l',-40,'Hồ sơ, đơn, đề nghị, tin nhắn')
    d.flow('p0','l',40,'tv','r',40,'Kết quả, thông báo, số dư Xu')
    d.flow('p0','r',-40,'qt','l',-40,'Hồ sơ xác minh, báo cáo')
    d.flow('qt','l',40,'p0','r',40,'Quyết định xử lý')
    d.flow('p0','t',-50,'sms','b',-50,'Gửi OTP')
    d.flow('sms','b',50,'p0','t',50,'Kết quả gửi')
    d.flow('p0','b',-50,'gg','t',-50,'Yêu cầu')
    d.flow('gg','t',50,'p0','b',50,'Kết quả')
    return d.model(1360,780),1360,780

def level2(pid,title,rows,sid,store_label,spacing=270):
    d=G2(pid,title)
    PX,PWD,PH=480,300,150
    EX,EW=40,200
    SX,SW=940,300
    RX,RW=1380,250
    top=300
    H=top+spacing*len(rows)+60
    ys=[top+i*spacing for i in range(len(rows))]
    # một hộp Thành viên cao chạy qua mọi quá trình
    d.ext('tv',EX,ys[0]-75,EW,ys[-1]-ys[0]+150,'Thành viên')
    cyt=ys[0]-75+(ys[-1]-ys[0]+150)/2
    for i,r in enumerate(rows):
        y=ys[i]
        d.proc('s%d'%i,PX,y-PH/2,PWD,PH,r['id'],r['label'])
        role,inl,outl=r['roles'][0]
        d.flow('tv','r',(y-22)-cyt,'s%d'%i,'l',-22,inl,loff=(0,-30))
        d.flow('s%d'%i,'l',22,'tv','r',(y+22)-cyt,outl,loff=(0,30))
        w,rd=r['store']
        d.store('d%d'%i,SX,y+17,SW,64,sid,store_label)
        if w: d.flow('s%d'%i,'r',35,'d%d'%i,'l',-14,w,loff=(0,-30))
        d.flow('d%d'%i,'l',14,'s%d'%i,'r',63,rd,loff=(0,34))
        for k,(key,lab,kind,fl) in enumerate(r.get('refs',[])):
            hh=70
            if k==0:
                cy=y-45
                oa=[(-59,-14),(-31,14)]
            else:
                cy=y-130
            if kind=='ext': d.ext('f%d_%d'%(i,k),RX,cy-hh/2,RW,hh,lab)
            else: d.proc('f%d_%d'%(i,k),RX,cy-hh/2,RW,hh,key,lab,ref=True)
            for m,(dr,fl_lab) in enumerate(fl):
                if k==0:
                    a_,b_=oa[m]
                    if dr=='out': d.flow('s%d'%i,'r',a_,'f%d_%d'%(i,k),'l',b_,fl_lab,loff=(0,-28 if m==0 else 28))
                    else: d.flow('f%d_%d'%(i,k),'l',b_,'s%d'%i,'r',a_,fl_lab,loff=(0,-28 if m==0 else 28))
                else:
                    vx=PX+PWD/2-50
                    if dr=='in': d.flow('f%d_%d'%(i,k),'l',-14,'s%d'%i,'t',-50,fl_lab,via=[(vx,cy-14)],lab_seg=0,lab_frac=0.6,loff=(0,22))
                    else: d.flow('s%d'%i,'t',-50,'f%d_%d'%(i,k),'l',-14,fl_lab,via=[(vx,cy-14)],lab_seg=1,loff=(0,-28))
    d.legend(40,H-190)
    return d.model(1700,H),1700,H

def dfd10():
    rows=[
     dict(id='1.1',label='Đăng ký,<br>khôi phục mật khẩu (OTP)',
          roles=[('Thành viên','Số điện thoại, mã OTP,<br>thông tin đăng ký','Kết quả đăng ký,<br>đổi mật khẩu')],
          store=('Tài khoản mới,<br>mã OTP','OTP, tài khoản<br>hiện có'),
          refs=[('sms','Nhà cung cấp SMS','ext',[('out','Yêu cầu gửi OTP'),('in','Trạng thái gửi OTP')])]),
     dict(id='1.2',label='Đăng nhập và<br>quản lý phiên',
          roles=[('Thành viên','SĐT, mật khẩu<br>hoặc mã Google','Phiên đăng nhập,<br>kết quả')],
          store=('Tài khoản tạo<br>từ Google','Tài khoản, mật khẩu băm,<br>trạng thái khóa'),
          refs=[('gg','Google','ext',[('out','Yêu cầu xác thực'),('in','Kết quả xác thực')]),
                ('7.0','Quản trị và báo cáo','proc',[('in','Quyết định khóa / quyền tài khoản')])]),
     dict(id='1.3',label='Hồ sơ và<br>địa chỉ',
          roles=[('Thành viên','Hồ sơ, địa chỉ<br>thêm / sửa / xóa','Hồ sơ,<br>sổ địa chỉ')],
          store=('Hồ sơ, địa chỉ<br>cập nhật','Hồ sơ, địa chỉ<br>hiện có')),
     dict(id='1.4',label='Xét xác minh<br>người bán',
          roles=[('Thành viên','Hồ sơ xác minh<br>người bán','Kết quả<br>xét duyệt')],
          store=('Trạng thái<br>xác minh','Hồ sơ<br>đã nộp'),
          refs=[('qt','Quản trị viên','ext',[('out','Hồ sơ xác minh chờ duyệt'),('in','Quyết định duyệt xác minh')])]),
    ]
    return level2('DFD10','DFD10 — Mức 2 của 1.0: Tài khoản và xác minh',rows,'D1','Tài khoản, địa chỉ, OTP, xác minh')

def dfd10b():
    d=G2('DFD10','DFD10 — Mức 2 của 1.0: Tài khoản và xác minh')
    PW,PH=280,140
    d.proc('p1',60,230,PW,PH,'1.1','Đăng ký,<br>khôi phục mật khẩu (OTP)')
    d.proc('p3',1060,230,PW,PH,'1.3','Hồ sơ và<br>địa chỉ')
    d.proc('p2',60,770,PW,PH,'1.2','Đăng nhập và<br>quản lý phiên')
    d.proc('p4',1060,770,PW,PH,'1.4','Xét xác minh<br>người bán')
    d.ext('tv',600,490,200,160,'Thành viên')
    d.store('da',550,268,300,64,'D1','Tài khoản, địa chỉ, OTP, xác minh')
    d.store('db',550,808,300,64,'D1','Tài khoản, địa chỉ, OTP, xác minh')
    # kho
    def st(p,s,w,r):
        d.flow(p,'r',-14,s,'l',-14,w,loff=(0,-30)) if p in('p1','p2') else None
    d.flow('p1','r',-14,'da','l',-14,'Tài khoản mới, mã OTP',loff=(0,-22))
    d.flow('da','l',14,'p1','r',14,'OTP, tài khoản hiện có',loff=(0,22))
    d.flow('p3','l',-14,'da','r',-14,'Hồ sơ, địa chỉ cập nhật',loff=(0,-22))
    d.flow('da','r',14,'p3','l',14,'Hồ sơ, địa chỉ hiện có',loff=(0,22))
    d.flow('p2','r',-14,'db','l',-14,'Tài khoản tạo từ Google',loff=(0,-22))
    d.flow('db','l',14,'p2','r',14,'Tài khoản, mật khẩu băm,<br>trạng thái khóa',loff=(0,30))
    d.flow('p4','l',-14,'db','r',-14,'Trạng thái xác minh',loff=(0,-22))
    d.flow('db','r',14,'p4','l',14,'Hồ sơ đã nộp',loff=(0,22))
    # thành viên (Tv trung tâm y=570): trên 515/551, dưới 589/625
    def up(pk,pcx,side,yin,xin,yout,xout,lin,lout):
        sx=-1 if side=='l' else 1
        ex='l' if side=='l' else 'r'
        d.flow('tv',ex,yin-570,pk,'b',xin-pcx,lin,via=[(xin,yin)],lab_seg=0,loff=(0,-14))
        d.flow(pk,'b',xout-pcx,'tv',ex,yout-570,lout,via=[(xout,yout)],lab_seg=1,loff=(0,-14))
    def dn(pk,pcx,side,yin,xin,yout,xout,lin,lout):
        ex='l' if side=='l' else 'r'
        d.flow('tv',ex,yin-570,pk,'t',xin-pcx,lin,via=[(xin,yin)],lab_seg=0,loff=(0,-14))
        d.flow(pk,'t',xout-pcx,'tv',ex,yout-570,lout,via=[(xout,yout)],lab_seg=1,loff=(0,-14))
    up('p1',200,'l',515,170,551,130,'SĐT, OTP, thông tin đăng ký','Kết quả đăng ký, đổi mật khẩu')
    dn('p2',200,'l',589,130,625,170,'SĐT, mật khẩu hoặc mã Google','Phiên đăng nhập, kết quả')
    up('p3',1200,'r',515,1230,551,1270,'Hồ sơ, địa chỉ thêm / sửa / xóa','Hồ sơ, sổ địa chỉ')
    dn('p4',1200,'r',589,1270,625,1230,'Hồ sơ xác minh người bán','Kết quả xét duyệt')
    # ngoài
    d.ext('sms',100,70,200,70,'Nhà cung cấp SMS')
    d.flow('p1','t',-50,'sms','b',-50,'Yêu cầu gửi OTP',loff=(-80,0))
    d.flow('sms','b',50,'p1','t',50,'Trạng thái gửi OTP',loff=(84,0))
    d.ext('gg',60,990,200,70,'Google')
    d.flow('p2','b',-90,'gg','t',-50,'Yêu cầu<br>xác thực',loff=(-46,0))
    d.flow('gg','t',50,'p2','b',10,'Kết quả<br>xác thực',loff=(44,0))
    d.proc('p7',290,990,200,70,'7.0','Quản trị và báo cáo',ref=True)
    d.flow('p7','t',-70,'p2','b',120,'Quyết định khóa /<br>quyền tài khoản',loff=(68,0))
    d.ext('qt',1100,990,240,70,'Quản trị viên')
    d.flow('p4','b',-50,'qt','t',-70,'Hồ sơ xác minh<br>chờ duyệt',loff=(-80,0))
    d.flow('qt','t',30,'p4','b',50,'Quyết định duyệt<br>xác minh',loff=(80,0))
    return d.model(1500,1090),1500,1090

def level2c(pid,title,rows,sid,store_label,spacing=250):
    d=G2(pid,title); d.inline=True
    PX,PWD,PH=580,300,150
    EX,EW=40,210
    SX,SW=1070,300
    RX,RW=1500,260
    top=190
    ys=[top]
    for i in range(1,len(rows)):
        ex=max(0,len(rows[i].get('refs',[]))-1)
        ys.append(ys[-1]+spacing+(90 if ex>=2 else 0))
    H=ys[-1]+170
    for i,r in enumerate(rows):
        d.proc('s%d'%i,PX,ys[i]-PH/2,PWD,PH,r['id'],r['label'])
    for i,r in enumerate(rows):
        y=ys[i]
        roles=r['roles']
        if len(roles)==1: slots=[(0,-15)]; 
        for j,(role,inl,outl) in enumerate(roles):
            if len(roles)==1: ecy=y; o_in,o_out=-15,15
            elif j==0: ecy=y-45; o_in,o_out=-60,-30
            else: ecy=y+45; o_in,o_out=30,60
            if len(roles)==1: o_in,o_out=-15,15
            d.ext('r%d_%d'%(i,j),EX,ecy-38,EW,76,role)
            d.flow('r%d_%d'%(i,j),'r',o_in-(ecy-y),'s%d'%i,'l',o_in,inl.replace('<br>',' '),loff=(0,-14))
            d.flow('s%d'%i,'l',o_out,'r%d_%d'%(i,j),'r',o_out-(ecy-y),outl.replace('<br>',' '),loff=(0,14))
        w,rd=r['store']
        d.store('d%d'%i,SX,y+17,SW,64,sid,store_label)
        if w: d.flow('s%d'%i,'r',35,'d%d'%i,'l',-14,w,loff=(0,-30))
        d.flow('d%d'%i,'l',14,'s%d'%i,'r',63,rd,loff=(0,34))
        for k,(key,lab,kind,fl) in enumerate(r.get('refs',[])):
            hh=60 if k==0 else 56
            cy=y-48 if k==0 else y-132-(k-1)*76
            if kind=='ext': d.ext('f%d_%d'%(i,k),RX,cy-hh/2,RW,hh,lab)
            else: d.proc('f%d_%d'%(i,k),RX,cy-hh/2,RW,hh,key,lab,ref=True)
            for m,(dr,fl_lab) in enumerate(fl):
                if k==0:
                    a_,b_=[(-62,-14),(-34,14)][m]
                    if dr=='out': d.flow('s%d'%i,'r',a_,'f%d_%d'%(i,k),'l',b_,fl_lab,loff=(0,-28 if m==0 else 28))
                    else: d.flow('f%d_%d'%(i,k),'l',b_,'s%d'%i,'r',a_,fl_lab,loff=(0,-28 if m==0 else 28))
                else:
                    # đi từ cạnh trên quá trình, mỗi tham chiếu thêm một tuyến riêng
                    vx=PX+PWD/2+60+(len(r['refs'])-1-k)*40
                    yy=cy
                    if dr=='in': d.flow('f%d_%d'%(i,k),'l',0,'s%d'%i,'t',vx-(PX+PWD/2),fl_lab,via=[(vx,yy)],lab_seg=0,lab_frac=0.6,loff=(0,22))
                    else: d.flow('s%d'%i,'t',vx-(PX+PWD/2),'f%d_%d'%(i,k),'l',0,fl_lab,via=[(vx,yy)],lab_seg=1,lab_frac=0.4,loff=(0,-22))
        if i<len(rows)-1 and r.get('chain'):
            d.flow('s%d'%i,'b',0,'s%d'%(i+1),'t',0,r['chain'],loff=(-100,0))
    return d.model(1800,H),1800,H

def dfd40():
    rows=[
     dict(id='4.1',label='Kiểm và lưu<br>đề nghị',
          roles=[('Thành viên<br>(người nhận việc)','Giới thiệu, khung giờ, hỏi đáp','Kết quả gửi đề nghị')],
          store=('Đề nghị, câu hỏi mới','Việc, đề nghị hiện có'),
          refs=[('2.0','Bài đăng và khám phá','proc',[('in','Việc, lịch, số người khả dụng')])],
          chain='Đề nghị hợp lệ'),
     dict(id='4.2',label='Chọn người<br>theo số người cần',
          roles=[('Thành viên<br>(người đăng việc)','Chọn / từ chối<br>ứng viên','Danh sách, kết quả tuyển'),
                 ('Thành viên<br>(người nhận việc)','Rút đề nghị','Kết quả chọn, địa chỉ')],
          store=('Trạng thái đề nghị','Đề nghị hiện có'),
          refs=[('2.0','Bài đăng và khám phá','proc',[('out','Trạng thái tuyển (đủ / còn chỗ)')]),
                ('5.0','Trao đổi và uy tín','proc',[('out','Sự kiện tuyển')])],
          chain='Người được chọn'),
     dict(id='4.3',label='Theo dõi thực hiện<br>và nghiệm thu',
          roles=[('Thành viên<br>(người nhận việc)','Bắt đầu, xin hủy,<br>báo hoàn thành','Tiến độ,<br>kết quả nghiệm thu'),
                 ('Thành viên<br>(người đăng việc)','Duyệt hoặc<br>phản đối','Báo xong,<br>kết quả nghiệm thu')],
          store=('Trạng thái việc','Đề nghị đã chọn'),
          refs=[('5.0','Trao đổi và uy tín','proc',[('out','Sự kiện tiến độ')]),
                ('7.0','Quản trị và báo cáo','proc',[('in','Quyết định phản đối kết quả')])],
          chain='Việc đã hoàn thành'),
     dict(id='4.4',label='Xác nhận<br>nhận tiền',
          roles=[('Thành viên<br>(người đăng việc)','Trả tiền công<br>trực tiếp','Kết quả xác nhận<br>nhận tiền'),
                 ('Thành viên<br>(người nhận việc)','Xác nhận<br>đã nhận tiền','Kết quả,<br>đánh giá')],
          store=('Ngày trả, ngày nhận tiền','Việc đã hoàn thành'),
          refs=[('6.0','AntXu và ưu đãi','proc',[('out','Sự kiện thưởng việc xong')])]),
    ]
    return level2c('DFD40','DFD40 — Mức 2 của 4.0: Tuyển và thực hiện việc',rows,'D4','Đề nghị, hỏi đáp, thanh toán')

def dfd10c(inline=True):
    d=G2('DFD10','DFD10 — Mức 2 của 1.0: Tài khoản và xác minh'); d.inline=inline
    PW,PH=260,130
    L,R=60,910            # x trái của cột trái / phải
    Y1,Y2=230,630         # y trên của hàng trên / dưới
    d.proc('p1',L,Y1,PW,PH,'1.1','Đăng ký,<br>khôi phục mật khẩu')
    d.proc('p3',R,Y1,PW,PH,'1.3','Hồ sơ và<br>địa chỉ')
    d.proc('p2',L,Y2,PW,PH,'1.2','Đăng nhập và<br>quản lý phiên')
    d.proc('p4',R,Y2,PW,PH,'1.4','Xét xác minh<br>người bán')
    c1=Y1+PH/2; c2=Y2+PH/2; yc=(Y1+PH+Y2)/2
    d.ext('tv',515,yc-60,200,120,'Thành viên')
    SX,SW=510,210
    d.store('da',SX,c1-32,SW,64,'D1','Tài khoản, xác minh')
    d.store('db',SX,c2-32,SW,64,'D1','Tài khoản, xác minh')
    d.flow('p1','r',-14,'da','l',-14,'Tài khoản mới, OTP',loff=(0,-16))
    d.flow('da','l',14,'p1','r',14,'Tài khoản, OTP',loff=(0,16))
    d.flow('p3','l',-14,'da','r',-14,'Cập nhật hồ sơ',loff=(0,-16))
    d.flow('da','r',14,'p3','l',14,'Hồ sơ hiện có',loff=(0,16))
    d.flow('p2','r',-14,'db','l',-14,'Tài khoản từ Google',loff=(0,-16))
    d.flow('db','l',14,'p2','r',14,'Thông tin đăng nhập',loff=(0,16))
    d.flow('p4','l',-14,'db','r',-14,'Trạng thái xác minh',loff=(0,-16))
    d.flow('db','r',14,'p4','l',14,'Hồ sơ đã nộp',loff=(0,16))
    cl=L+PW/2; cr=R+PW/2
    ys=[yc-45,yc-15,yc+15,yc+45]
    def link(pk,pcx,side,vert,y_in,x_in,y_out,x_out,lin,lout):
        ex='l' if side=='l' else 'r'
        d.flow('tv',ex,y_in-yc,pk,vert,x_in-pcx,lin,via=[(x_in,y_in)],lab_seg=0,loff=(0,-12))
        d.flow(pk,vert,x_out-pcx,'tv',ex,y_out-yc,lout,via=[(x_out,y_out)],lab_seg=1,loff=(0,-12))
    link('p1',cl,'l','b',ys[0],cl-30,ys[1],cl-70,'SĐT, OTP, thông tin','Kết quả đăng ký')
    link('p2',cl,'l','t',ys[2],cl-70,ys[3],cl-30,'SĐT, mật khẩu / mã Google','Phiên đăng nhập')
    link('p3',cr,'r','b',ys[0],cr+30,ys[1],cr+70,'Hồ sơ, địa chỉ mới','Hồ sơ, sổ địa chỉ')
    link('p4',cr,'r','t',ys[2],cr+70,ys[3],cr+30,'Hồ sơ xác minh','Kết quả duyệt')
    d.ext('sms',cl-100,80,200,56,'Nhà cung cấp SMS')
    d.flow('p1','t',-50,'sms','b',-50,'Gửi OTP',loff=(-48,0))
    d.flow('sms','b',50,'p1','t',50,'Kết quả gửi',loff=(52,0))
    Yb=Y2+PH+100
    d.ext('gg',40,Yb,180,56,'Google')
    d.flow('p2','b',-90,'gg','t',-30,'Yêu cầu',loff=(-36,0))
    d.flow('gg','t',30,'p2','b',-30,'Kết quả',loff=(34,0))
    d.proc('p7',250,Yb,170,56,'7.0','Quản trị và báo cáo',ref=True)
    d.flow('p7','t',-45,'p2','b',100,'Khóa / quyền',loff=(48,0))
    d.ext('qt',940,Yb,200,56,'Quản trị viên')
    d.flow('p4','b',-50,'qt','t',-50,'Hồ sơ chờ',loff=(-40,0))
    d.flow('qt','t',50,'p4','b',50,'Quyết định',loff=(46,0))
    W=R+PW+120; H=Yb+56+60
    return d.model(W,H),W,H


def dfd30():
    rows=[
     dict(id='3.1',label='Kiểm giỏ, tính giá<br>và tạo đơn',
          roles=[('Thành viên<br>(người mua)','Giỏ, lựa chọn, địa chỉ, giờ nhận','Giá tạm tính, đơn đã tạo')],
          store=('Đơn mới','Đơn hiện có'),
          refs=[('2.0','Bài đăng và khám phá','proc',[('in','Bài bán, giá, tồn khả dụng'),('out','Giữ tồn')]),
                ('6.0','AntXu và ưu đãi','proc',[('in','Kết quả kiểm / giữ voucher')])],
          chain='Đơn mới, giá chốt'),
     dict(id='3.2',label='Xác nhận đơn, báo giá,<br>phụ thu, hủy / đổi lịch',
          roles=[('Thành viên<br>(người bán)','Nhận / từ chối đơn, giá cuối, phụ thu','Đơn chờ xác nhận, yêu cầu hủy'),
                 ('Thành viên<br>(người mua)','Đồng ý / từ chối giá, đổi lịch','Giá cuối, phụ thu cần duyệt')],
          store=('Giá chốt','Đơn hiện có'),
          refs=[('5.0','Trao đổi và uy tín','proc',[('out','Sự kiện đơn mới, xác nhận, hủy')])],
          chain='Đơn đã xác nhận'),
     dict(id='3.3',label='Giao nhận,<br>nghiệm thu, xác nhận tiền',
          roles=[('Thành viên<br>(người bán)','Chuẩn bị, giao hàng, làm xong','Yêu cầu giao / làm'),
                 ('Thành viên<br>(người mua)','Xác nhận đã nhận, trả tiền','Tiến độ, thông báo nhận hàng')],
          store=('Trạng thái đơn, tiền','Đơn đã xác nhận'),
          refs=[('5.0','Trao đổi và uy tín','proc',[('out','Sự kiện tiến độ đơn')]),
                ('6.0','AntXu và ưu đãi','proc',[('out','Sự kiện thưởng đơn xong')])],
          chain='Yêu cầu trả hàng'),
     dict(id='3.4',label='Hậu mãi<br>và trả hàng',
          roles=[('Thành viên<br>(người bán)','Đề xuất: làm lại, trả hàng, hoàn tiền','Hồ sơ vấn đề cần phản hồi'),
                 ('Thành viên<br>(người mua)','Loại vấn đề, mong muốn, bằng chứng','Phương án, kết quả hậu mãi')],
          store=('Hồ sơ vấn đề, quyết định','Đơn, hồ sơ hiện có'),
          refs=[('5.0','Trao đổi và uy tín','proc',[('out','Sự kiện hậu mãi')]),
                ('6.0','AntXu và ưu đãi','proc',[('out','Đảo thưởng khi hoàn tiền')]),
                ('7.0','Quản trị và báo cáo','proc',[('in','Quyết định tranh chấp')])]),
    ]
    return level2c('DFD30','DFD30 — Mức 2 của 3.0: Đơn mua và dịch vụ',rows,'D3','Đơn, vấn đề, thanh toán',spacing=260)

def dfd20():
    rows=[
     dict(id='2.1',label='Đăng và quản lý<br>bài đồ ăn, đồ dùng, dịch vụ',
          roles=[('Thành viên<br>(người bán)','Nội dung bài, giá,<br>tùy chọn, ẩn / mở','Kết quả đăng,<br>trạng thái bài')],
          store=('Bài mới, thay đổi','Bài hiện có'),
          refs=[('1.0','Tài khoản và xác minh','proc',[('in','Quyền bán, thông tin gian hàng')])],
          ),
     dict(id='2.2',label='Đăng và quản lý<br>việc làm',
          roles=[('Thành viên<br>(người đăng việc)','Nội dung việc, tiền công,<br>số người cần','Kết quả đăng,<br>trạng thái việc')],
          store=('Việc mới, thay đổi','Việc hiện có'),
          refs=[('4.0','Tuyển và thực hiện việc','proc',[('out','Việc đang mở, số người cần')])],
          ),
     dict(id='2.3',label='Tìm kiếm, lọc<br>và xem chi tiết',
          roles=[('Thành viên<br>(người mua / nhận việc)','Từ khóa, bộ lọc,<br>khu vực','Danh sách, chi tiết<br>bài / việc')],
          store=(None,'Bài, việc đang mở'),
          refs=[('3.0','Đơn mua và dịch vụ','proc',[('out','Bài, giá, tồn kho khi đặt')])]),
     dict(id='2.4',label='Lưu bài và<br>theo dõi gian hàng',
          roles=[('Thành viên<br>(người mua / nhận việc)','Lưu, bỏ lưu,<br>theo dõi','Danh sách đã lưu,<br>gian hàng theo dõi')],
          store=('Bài đã lưu, theo dõi','Bài hiện có'),
          refs=[('5.0','Trao đổi và uy tín','proc',[('out','Sự kiện theo dõi')])]),
    ]
    return level2c('DFD20','DFD20 — Mức 2 của 2.0: Bài đăng và khám phá',rows,'D2','Bài, việc, bài đã lưu',spacing=210)
