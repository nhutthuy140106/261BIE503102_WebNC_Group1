import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from erd_all import build,pk,fk,a,OPT,MM,DASH
from er_types import typify,CUR,TOBE
from dfd2_lib import render
def spec_current():
    S={
     'Review':(2,1,'Review',[pk(),fk('reviewer'),fk('target'),a('targetType'),a('targetId (đa hình)'),fk('post'),a('rating'),a('comment'),a('images'),a('reply (nhúng)')]),
     'Post':(1,0,'Post',[pk(),a('type'),a('category'),a('title'),a('price'),a('area'),a('acceptsXu'),fk('seller'),a('status'),a('optionGroups, questions,'),a('promo, combo (nhúng)')]),
     'Q':(3,1,'Question',[pk(),fk('job'),fk('author'),a('text'),a('answer (nhúng: text, at)'),fk('answer.by')]),
     'Order':(1,1,'Order',[pk(),a('code'),fk('buyer'),fk('seller'),fk('post'),a('quantity'),a('fulfillment'),a('payment'),a('total'),a('state'),a('scheduledAt'),a('snapshot, selections, address,'),a('breakdown, history (nhúng)')]),
     'Addr':(1,4,'Address',[pk(),fk('user'),a('name'),a('phone'),a('block'),a('unit'),a('note'),a('label'),a('isDefault')]),
     'Job':(3,0,'Job',[pk(),a('title'),a('category'),a('pay'),a('workTime'),a('area'),a('headcount'),fk('poster'),a('status')]),
     'Offer':(4,0,'Offer',[pk(),a('code'),fk('job'),fk('worker'),a('intro'),a('slots'),a('state'),a('paidAt'),a('reviewed'),a('report, cancel, history (nhúng)')]),
     'Notif':(1,2,'Notification',[pk(),fk('user'),a('type'),a('title'),a('body'),a('link (đa hình, nhúng)'),a('read')]),
     'User':(2,2,'User',[pk(),a('name'),a('phone'),a('email'),a('avatar'),a('area'),a('role'),a('status')]),
     'Saved':(3,2,'Saved',[pk(),fk('user'),a('targetId (đa hình)'),a('targetModel'),a('type')]),
     'Conv':(0,3,'Conversation',[pk(),a('participants (2 người dùng)'),a('context (đa hình, nhúng)'),a('lastMessage (nhúng)')]),
     'Msg':(1,3,'Message',[pk(),fk('conversation'),fk('sender'),a('text'),a('readBy (nhiều người dùng)')]),
     'XV':(2,3,'XuVoucher',[pk(),fk('user'),a('cid'),a('code'),a('expiresAt'),a('usedAt')]),
     'Report':(3,3,'Report',[pk(),fk('reporter'),a('targetType'),a('targetId (đa hình)'),a('reason'),a('detail'),a('images'),a('state'),a('adminNote'),fk('handledBy')]),
     'Audit':(4,3,'AuditLog',[pk(),fk('actor'),a('action'),a('targetType'),a('targetId (đa hình)'),a('note')]),
     'XE':(2,4,'XuEntry',[pk(),fk('user'),a('title'),a('delta'),a('kind'),a('key'),a('day')]),
    }
    return S
EDGES=[('User','Addr'),('User','Notif'),('User','Saved'),('User','Post'),('User','Job'),('User','Offer'),('User','Q'),('User','Q',OPT),
       ('User','Review'),('User','Review'),('User','Order'),('User','Order'),('User','Conv',MM),('User','Msg'),('User','Msg',MM),
       ('User','Report'),('User','Report',OPT),('User','Audit'),('User','XE'),('User','XV'),
       ('Job','Offer'),('Job','Q'),('Post','Order'),('Post','Review',OPT),('Conv','Msg')]
def er02(typed=True):
    S=spec_current(); spec={}
    from layout_opt import optimize
    pos,_c=optimize(list(S.keys()),EDGES,cols=5,rows=4)
    print('  bố cục tối ưu ER02, chi phí =',round(_c,1),flush=True)
    S={k:(pos[k][0],pos[k][1],v[2],v[3]) for k,v in S.items()}
    for k,(c,r,name,attrs) in S.items():
        spec[k]=(c,r,name,typify(name,attrs,CUR) if typed else attrs,'','user' if k=='User' else '')
    return build('ER02','ER02 — Vật lý MongoDB hiện tại',spec,EDGES,'',gap=80,pitch=340)
if __name__=='__main__':
    m,W,H=er02()
    open('ER02s.model.xml','w',encoding='utf8').write(m)
    render(m,'ER02s',W,H); print(W,H)
