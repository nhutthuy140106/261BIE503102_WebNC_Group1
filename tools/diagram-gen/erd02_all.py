import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from erd_all import build,pk,fk,a,OPT,MM,DASH
from dfd2_lib import render
U=lambda: [pk(),a('name'),a('phone'),a('email'),a('avatar'),a('area'),a('role'),a('status')]
def a_():
    spec={'Post':(0,0,'Post',[pk(),a('type'),a('title'),a('price'),fk('seller'),a('status'),a('combo (nhúng, trỏ lại Post)')],'',''),
          'Order':(1,0,'Order',[pk(),a('code'),fk('buyer'),fk('seller'),fk('post'),a('quantity'),a('fulfillment'),a('payment'),a('total'),a('state'),a('scheduledAt'),a('snapshot, selections, address,'),a('breakdown, history (nhúng)')],'',''),
          'XE':(0,1,'XuEntry',[pk(),fk('user'),a('title'),a('delta'),a('kind'),a('key'),a('day')],'',''),
          'User':(1,1,'User',U(),'','user'),
          'XV':(2,1,'XuVoucher',[pk(),fk('user'),a('cid'),a('code'),a('expiresAt'),a('usedAt')],'','')}
    E=[('User','Order'),('User','Order'),('Post','Order'),('User','Post'),('User','XE'),('User','XV')]
    return build('ER02a','ER02a — Logic hiện tại: Đơn hàng và Xu',spec,E,'')
def b_():
    spec={'Notif':(1,0,'Notification',[pk(),fk('user'),a('type'),a('title'),a('body'),a('link (đa hình, nhúng)'),a('read')],'',''),
          'Addr':(0,1,'Address',[pk(),fk('user'),a('name'),a('phone'),a('block'),a('unit'),a('note'),a('label'),a('isDefault')],'',''),
          'User':(1,1,'User',U(),'','user'),
          'Saved':(2,1,'Saved',[pk(),fk('user'),a('targetId (đa hình)'),a('targetModel'),a('type')],'','')}
    E=[('User','Addr'),('User','Notif'),('User','Saved')]
    return build('ER02b','ER02b — Logic hiện tại: Tài khoản và tiện ích',spec,E,'')
def c_():
    spec={'Offer':(1,0,'Offer',[pk(),a('code'),fk('job'),fk('worker'),a('intro'),a('slots'),a('state'),a('paidAt'),a('reviewed'),a('report, cancel, history (nhúng)')],'',''),
          'Job':(2,1,'Job',[pk(),a('title'),a('category'),a('pay'),a('workTime'),a('area'),a('headcount'),fk('poster'),a('status')],'',''),
          'Q':(1,2,'Question',[pk(),fk('job'),fk('author'),a('text'),a('answer (nhúng: text, at)'),fk('answer.by')],'',''),
          'Post':(0,0,'Post',[pk(),a('type'),a('category'),a('title'),a('price'),a('area'),a('acceptsXu'),fk('seller'),a('status'),a('optionGroups, questions,'),a('promo, combo (nhúng)')],'',''),
          'Review':(0,1,'Review',[pk(),fk('reviewer'),fk('target'),a('targetType'),a('targetId (đa hình)'),fk('post'),a('rating'),a('comment'),a('images'),a('reply (nhúng)')],'',''),
          'User':(1,1,'User',[pk(),a('name'),a('phone'),a('avatar'),a('area'),a('role'),a('status')],'','user')}
    E=[('User','Post'),('User','Job'),('Job','Offer'),('User','Offer'),('Job','Q'),('User','Q'),('User','Q',OPT),
       ('User','Review'),('User','Review'),('Post','Review',OPT),('Offer','Review',DASH)]
    return build('ER02c','ER02c — Logic hiện tại: Bài đăng và việc làm',spec,E,'')
def d_():
    spec={'Conv':(0,0,'Conversation',[pk(),a('participants (2 người dùng)'),a('context (đa hình, nhúng)'),a('lastMessage (nhúng)')],'',''),
          'Msg':(1,0,'Message',[pk(),fk('conversation'),fk('sender'),a('text'),a('readBy (nhiều người dùng)')],'',''),
          'Audit':(0,1,'AuditLog',[pk(),fk('actor'),a('action'),a('targetType'),a('targetId (đa hình)'),a('note')],'',''),
          'User':(1,1,'User',[pk(),a('name'),a('phone'),a('avatar'),a('area'),a('role'),a('status')],'','user'),
          'Report':(2,1,'Report',[pk(),fk('reporter'),a('targetType'),a('targetId (đa hình)'),a('reason'),a('detail'),a('images'),a('state'),a('adminNote'),fk('handledBy')],'','')}
    E=[('User','Conv',MM),('Conv','Msg'),('User','Msg'),('User','Msg',MM),('User','Report'),('User','Report',OPT),('User','Audit')]
    return build('ER02d','ER02d — Logic hiện tại: Trao đổi và quản trị',spec,E,'')
if __name__=='__main__':
    for n in (sys.argv[1:] or list('abcd')):
        m,W,H=globals()[n+'_']()
        open('ER02'+n+'.model.xml','w',encoding='utf8').write(m)
        render(m,'ER02'+n,W,H); print(n,W,H)
