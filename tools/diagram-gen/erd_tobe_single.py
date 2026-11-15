import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from erd_all import build,pk,fk,a,OPT,MM,DASH
from er_types import typify,TOBE
from dfd2_lib import render
def spec():
    return {
     'VD':(0,0,'VoucherDefinition',[pk(),a('code'),a('title'),a('costXu'),a('discountType'),a('amount'),a('minOrder'),a('validDays'),a('active')]),
     'Post':(1,0,'Post',[pk(),a('type'),a('category'),a('title'),a('price'),a('area'),a('acceptsXu'),fk('seller'),a('status'),a('optionGroups, questions,'),a('promo, combo (nhúng)')]),
     'Promo':(2,0,'Promotion',[pk(),fk('owner'),fk('post'),fk('ledger'),a('costXu'),a('startsAt'),a('endsAt'),a('status')]),
     'Job':(3,0,'Job',[pk(),a('title'),a('category'),a('pay'),a('workTime'),a('area'),a('headcount'),fk('poster'),a('status')]),
     'Offer':(4,0,'Offer',[pk(),a('code'),fk('job'),fk('worker'),a('intro'),a('slots'),a('state'),a('paidAt'),a('reviewed'),a('disputedAt'),a('reviewDueAt'),a('report, cancel, history (nhúng)')]),
     'XV':(0,1,'XuVoucher',[pk(),fk('user'),fk('definition'),a('expiresAt'),a('state'),fk('reservedOrder'),fk('usedOrder')]),
     'Order':(1,1,'Order',[pk(),a('code'),fk('buyer'),fk('seller'),fk('post'),a('quantity'),a('fulfillment'),a('payment'),a('total'),a('state'),a('scheduledAt'),a('snapshot, selections, address,'),a('breakdown, history (nhúng)')]),
     'Review':(2,1,'Review',[pk(),fk('reviewer'),fk('target'),a('targetType'),a('targetId (đa hình)'),fk('post'),a('rating'),a('comment'),a('images'),a('reply (nhúng)')]),
     'Q':(3,1,'Question',[pk(),fk('job'),fk('author'),a('text'),a('answer (nhúng: text, at)'),fk('answer.by')]),
     'XE':(4,1,'XuEntry',[pk(),fk('user'),a('eventKey'),a('delta'),a('reason'),a('expiresAt'),a('sourceType'),a('sourceId (đa hình)'),fk('reverses')]),
     'Notif':(0,2,'Notification',[pk(),fk('user'),a('type'),a('title'),a('body'),a('link (đa hình, nhúng)'),a('read')]),
     'OC':(1,2,'OrderChange',[pk(),fk('order'),fk('proposer'),a('kind'),a('state'),a('oldValue'),a('newValue'),fk('respondedBy')]),
     'User':(2,2,'User',[pk(),a('name'),a('phone'),a('email'),a('avatar'),a('area'),a('role'),a('status'),a('phoneVerifiedAt')]),
     'PA':(3,2,'PaymentAcknowledgement',[pk(),a('targetType'),a('targetId (đa hình)'),fk('payer'),fk('payee'),a('kind'),a('amount'),a('method'),a('state')]),
     'Saved':(4,2,'Saved',[pk(),fk('user'),a('targetId (đa hình)'),a('targetModel'),a('type')]),
     'Conv':(0,3,'Conversation',[pk(),a('participants (2 người dùng)'),a('context (đa hình, nhúng)'),a('lastMessage (nhúng)')]),
     'Msg':(1,3,'Message',[pk(),fk('conversation'),fk('sender'),a('text'),a('readBy (nhiều người dùng)')]),
     'TI':(2,3,'TransactionIssue',[pk(),a('targetType'),a('targetId (đa hình)'),fk('requester'),fk('respondent'),a('state'),a('resolution'),a('refundAmount'),fk('report')]),
     'Report':(3,3,'Report',[pk(),fk('reporter'),a('targetType'),a('targetId (đa hình)'),a('reason'),a('detail'),a('images'),a('state'),a('adminNote'),fk('handledBy')]),
     'Audit':(4,3,'AuditLog',[pk(),fk('actor'),a('action'),a('targetType'),a('targetId (đa hình)'),a('note')]),
     'Addr':(1,4,'Address',[pk(),fk('user'),a('name'),a('phone'),a('block'),a('unit'),a('note'),a('label'),a('isDefault')]),
     'Follow':(2,4,'ShopFollow',[pk(),fk('follower'),fk('seller')]),
     'SV':(3,4,'SellerVerification',[pk(),fk('user'),a('status'),a('fullName'),a('idNumber'),a('privateFiles'),a('shopName'),a('shopType'),a('intro'),fk('reviewedBy'),a('reviewedAt'),a('rejectReason')]),
     'Otp':(4,4,'OtpChallenge',[pk(),a('phone'),a('purpose'),a('codeHash'),a('expiresAt'),a('attempts'),a('resendAfter'),a('consumedAt')]),
    }
EDGES=[('User','Addr'),('User','Notif'),('User','Saved'),('User','Post'),('User','Job'),('User','Offer'),('User','Q'),('User','Q',OPT),
 ('User','Review'),('User','Review'),('User','Order'),('User','Order'),('User','Conv',MM),('User','Msg'),('User','Msg',MM),
 ('User','Report'),('User','Report',OPT),('User','Audit'),('User','XE'),('User','XV'),('User','OC'),('User','OC',OPT),
 ('User','TI'),('User','TI'),('User','PA'),('User','PA'),('User','Promo'),('User','Follow'),('User','Follow'),
 ('User','SV',dict(sa='ERone',ea='ERzeroToOne')),('User','SV',OPT),('User','Otp',dict(sa='ERzeroToOne',dashed=True)),
 ('Job','Offer'),('Job','Q'),('Post','Order'),('Post','Review',OPT),('Conv','Msg'),('VD','XV'),('Order','XV',OPT),('Order','XV',OPT),
 ('Order','OC'),('Post','Promo'),('XE','Promo')]
def make(pid,title,typed):
    S=spec(); sp={}
    for k,(c,r,name,attrs) in S.items():
        sp[k]=(c,r,name,typify(name,attrs,TOBE) if typed else attrs,'','user' if k=='User' else '')
    return build(pid,title,sp,EDGES,'',gap=80,pitch=340)
if __name__=='__main__':
    for pid,title,typed in (('ER01','ER01 — Logic To-Be',False),('ER03','ER03 — Vật lý MongoDB To-Be',True)):
        m,W,H=make(pid,title,typed)
        open(pid+'s.model.xml','w',encoding='utf8').write(m)
        render(m,pid+'s',W,H); print(pid,W,H)
