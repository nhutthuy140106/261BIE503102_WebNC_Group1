import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from er_route import ERD,up,HEAD,LH
from dfd2_lib import render
NOTE_TAG='Nét đứt: quan hệ đa hình (targetType / targetId).  Trường nhúng ghi trong hộp.'
def pk(): return ('PK','_id')
def fk(t): return ('FK',t)
def a(t): return ('',t)
COLX=[40,400,760,1120,1480]
def build(pid,title,spec,edges,note,gap=110,top=100,extra_note='',pitch=360):
    d=ERD(pid,title); d.show_labels=False
    hs={}
    for k,(c,r,name,attrs,tag,style) in spec.items():
        hs[k]=up(HEAD+LH*len(attrs)+14)
    rows=sorted({v[1] for v in spec.values() if v[5]!='pack'})
    ry={}; y=top
    for r in rows:
        ry[r]=y; y+=max(hs[k] for k,v in spec.items() if v[1]==r and v[5]!='pack')+gap
    minc=min(v[0] for v in spec.values())
    placed={}
    for k,(c,r,name,attrs,tag,style) in spec.items():
        if style=='pack': continue
        kw={}
        if style=='user': kw=dict(fill='#F3F6FB',stroke='#4C6A9E',head='#D5DFEE')
        if style=='ref': kw=dict(fill='#FAFAFA',stroke='#9AA7BD',head='#EEF1F6')
        d.entity(k,(40+pitch*(c-minc)),ry[r],name,attrs,tag='',**kw)
        placed[k]=(c,ry[r],hs[k])
    for k,(c,r,name,attrs,tag,style) in spec.items():
        if style!='pack': continue
        yy=max([py+ph for kk,(pc,py,ph) in placed.items() if pc==c] or [top-gap])+gap
        d.entity(k,(40+pitch*(c-minc)),yy,name,attrs,tag='')
    for e in edges:
        one,many=e[0],e[1]
        kw=e[2] if len(e)>2 else {}
        d.rel(one,many,'',**kw)
    d.note=''
    return d.model()
OPT=dict(sa='ERzeroToOne')
DASH=dict(sa='ERzeroToOne',dashed=True)
MM=dict(sa='ERzeroToMany',ea='ERzeroToMany')
def user_attrs(): return [pk(),a('name'),a('phone'),a('email'),a('avatar'),a('area'),a('role'),a('status'),a('phoneVerifiedAt')]
def user_short(): return [pk(),a('name'),a('phone'),a('avatar'),a('area'),a('role'),a('status')]

def erd_a():
    spec={
     'VD':(0,0,'VoucherDefinition',[pk(),a('code'),a('title'),a('costXu'),a('discountType'),a('amount'),a('minOrder'),a('validDays'),a('active')],'ĐỀ XUẤT',''),
     'XV':(0,1,'XuVoucher',[pk(),fk('user'),fk('definition'),a('expiresAt'),a('state'),fk('reservedOrder'),fk('usedOrder')],'CÓ THAY ĐỔI',''),
     'Order':(1,1,'Order',[pk(),a('code'),fk('buyer'),fk('seller'),fk('post'),a('quantity'),a('fulfillment'),a('payment'),a('total'),a('state'),a('scheduledAt'),a('snapshot, selections, address,'),a('breakdown, history (nhúng)')],'CÓ THAY ĐỔI',''),
     'Post':(2,1,'Post',[pk(),a('type'),a('title'),a('price'),fk('seller'),a('status'),a('combo (nhúng, trỏ lại Post)')],'',''),
     'Promo':(2,2,'Promotion',[pk(),fk('owner'),fk('post'),fk('ledger'),a('costXu'),a('startsAt'),a('endsAt'),a('status')],'ĐỀ XUẤT',''),
     'PA':(0,2,'PaymentAcknowledgement',[pk(),a('targetType'),a('targetId (đa hình)'),fk('payer'),fk('payee'),a('kind'),a('amount'),a('method'),a('state')],'ĐỀ XUẤT',''),
     'User':(1,2,'User',[pk(),a('name'),a('phone'),a('avatar'),a('role'),a('status')],'CÓ THAY ĐỔI','user'),
     'OC':(1,0,'OrderChange',[pk(),fk('order'),fk('proposer'),a('kind'),a('state'),a('oldValue'),a('newValue'),fk('respondedBy')],'ĐỀ XUẤT',''),
     'XE':(2,3,'XuEntry',[pk(),fk('user'),a('eventKey'),a('delta'),a('reason'),a('expiresAt'),a('sourceType'),a('sourceId (đa hình)'),fk('reverses')],'CÓ THAY ĐỔI',''),
     'TI':(1,3,'TransactionIssue',[pk(),a('targetType'),a('targetId (đa hình)'),fk('requester'),fk('respondent'),a('state'),a('resolution'),a('refundAmount'),fk('report')],'ĐỀ XUẤT',''),
    }
    E=[('User','Order'),('User','Order'),('Post','Order'),('User','Post'),('Order','OC'),('User','OC'),('User','OC',OPT),
       ('User','TI'),('User','TI'),('User','PA'),('User','PA'),('User','XE'),('XE','Promo'),('User','XV'),('VD','XV'),
       ('Order','XV',OPT),('Order','XV',OPT),('User','Promo'),('Post','Promo'),
       ('Order','TI',DASH),('Order','PA',DASH),('Order','XE',DASH)]
    return build('ER01a','ER01a — Logic To-Be: Đơn hàng và Xu',spec,E,'')

def erd_b():
    spec={
     'Addr':(1,0,'Address',[pk(),fk('user'),a('name'),a('phone'),a('block'),a('unit'),a('note'),a('label'),a('isDefault')],'',''),
     'Notif':(3,0,'Notification',[pk(),fk('user'),a('type'),a('title'),a('body'),a('link (đa hình, nhúng)'),a('read')],'',''),
     'Follow':(2,0,'ShopFollow',[pk(),fk('follower'),fk('seller')],'',''),
     'SV':(1,1,'SellerVerification',[pk(),fk('user'),a('status'),a('fullName'),a('idNumber'),a('privateFiles'),a('shopName'),a('shopType'),a('intro'),fk('reviewedBy'),a('reviewedAt'),a('rejectReason')],'',''),
     'User':(2,1,'User',user_attrs(),'','user'),
     'Saved':(3,1,'Saved',[pk(),fk('user'),a('targetId (đa hình)'),a('targetModel'),a('type')],'',''),
     'Otp':(2,2,'OtpChallenge',[pk(),a('phone (nối với User.phone)'),a('purpose'),a('codeHash'),a('expiresAt'),a('attempts'),a('resendAfter'),a('consumedAt')],'','pack'),
    }
    E=[('User','Addr'),('User','Notif'),('User','Follow'),('User','Follow'),('User','Saved'),
       ('User','SV',dict(sa='ERone',ea='ERzeroToOne')),('User','SV',OPT),
       ('User','Otp',dict(sa='ERzeroToOne',dashed=True))]
    return build('ER01b','ER01b — Logic To-Be: Tài khoản và tiện ích',spec,E,'',gap=80,pitch=330)

def erd_c():
    spec={
     'Offer':(1,0,'Offer',[pk(),a('code'),fk('job'),fk('worker'),a('intro'),a('slots'),a('state'),a('paidAt'),a('reviewed'),a('disputedAt'),a('reviewDueAt'),a('report, cancel, history (nhúng)')],'',''),
     'Job':(2,1,'Job',[pk(),a('title'),a('category'),a('pay'),a('workTime'),a('area'),a('headcount'),fk('poster'),a('status')],'',''),
     'Q':(1,2,'Question',[pk(),fk('job'),fk('author'),a('text'),a('answer (nhúng: text, at)'),fk('answer.by')],'',''),
     'Post':(0,0,'Post',[pk(),a('type'),a('category'),a('title'),a('price'),a('area'),a('acceptsXu'),fk('seller'),a('status'),a('optionGroups, questions,'),a('promo, combo (nhúng)')],'',''),
     'Review':(0,1,'Review',[pk(),fk('reviewer'),fk('target'),a('targetType'),a('targetId (đa hình)'),fk('post'),a('rating'),a('comment'),a('images'),a('reply (nhúng)')],'',''),
     'User':(1,1,'User',user_short(),'','user'),
    }
    E=[('User','Post'),('User','Job'),('Job','Offer'),('User','Offer'),('Job','Q'),('User','Q'),('User','Q',OPT),
       ('User','Review'),('User','Review'),('Post','Review',OPT),('Offer','Review',DASH)]
    return build('ER01c','ER01c — Logic To-Be: Bài đăng và việc làm',spec,E,'')

def erd_d():
    spec={
     'Conv':(0,0,'Conversation',[pk(),a('participants (2 người dùng)'),a('context (đa hình, nhúng)'),a('lastMessage (nhúng)')],'',''),
     'Msg':(1,0,'Message',[pk(),fk('conversation'),fk('sender'),a('text'),a('readBy (nhiều người dùng)')],'',''),
     'Audit':(0,1,'AuditLog',[pk(),fk('actor'),a('action'),a('targetType'),a('targetId (đa hình)'),a('note')],'',''),
     'User':(1,1,'User',user_short(),'','user'),
     'Report':(2,1,'Report',[pk(),fk('reporter'),a('targetType'),a('targetId (đa hình)'),a('reason'),a('detail'),a('images'),a('state'),a('adminNote'),fk('handledBy')],'',''),
    }
    E=[('User','Conv',MM),('Conv','Msg'),('User','Msg'),('User','Msg',MM),('User','Report'),('User','Report',OPT),('User','Audit')]
    return build('ER01d','ER01d — Logic To-Be: Trao đổi và quản trị',spec,E,'')

if __name__=='__main__':
    names=sys.argv[1:] or ['a','b','c','d']
    for n in names:
        m,W,H=globals()['erd_'+n]()
        open('ER01'+n+'.model.xml','w',encoding='utf8').write(m)
        render(m,'ER01'+n,W,H); print(n,W,H)
