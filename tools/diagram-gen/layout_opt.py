import random,math
def optimize(keys,edges,center='User',cols=5,rows=5,seed=1,iters=60000,heights=None):
    """Xếp các hộp lên lưới cols x rows sao cho các liên kết ngắn nhất.
    edges: list (a,b) (trùng cặp = nhiều đường). Trả về dict key->(col,row)."""
    random.seed(seed)
    cells=[(c,r) for r in range(rows) for c in range(cols)]
    cc=(cols//2,rows//2)
    w={}
    for e in edges:
        a,b=e[0],e[1]
        k=tuple(sorted((a,b)))
        w[k]=w.get(k,0)+(1.0 if center in k else 2.5)
    nbr={k:[] for k in keys}
    for (a,b),v in w.items():
        nbr[a].append((b,v)); nbr[b].append((a,v))
    def dist(p,q): return abs(p[0]-q[0])+abs(p[1]-q[1])
    def cost(pos):
        t=0.0
        for (a,b),v in w.items():
            p,q=pos[a],pos[b]; d=dist(p,q)
            if d<=1: continue
            t+=v*(d**1.4)+(0.8*v if (p[0]!=q[0] and p[1]!=q[1]) else 0.0)
        return t
    free=[c for c in cells if c!=cc]
    best=None
    for rs in range(6):
        others=[k for k in keys if k!=center]
        random.shuffle(others)
        pos={center:cc}
        for k,c in zip(others,free): pos[k]=c
        used={v:k for k,v in pos.items()}
        cur=cost(pos); T=3.0
        for it in range(iters):
            T=3.0*(1-it/iters)+0.05
            k=random.choice(others); tgt=random.choice(cells)
            if tgt==cc: continue
            old=pos[k]
            other=used.get(tgt)
            if other==center: continue
            pos[k]=tgt
            if other: pos[other]=old
            new=cost(pos)
            if new<=cur or random.random()<math.exp((cur-new)/T):
                cur=new
                used[tgt]=k
                if other: used[old]=other
                else: used.pop(old,None)
            else:
                pos[k]=old
                if other: pos[other]=tgt
        if best is None or cur<best[0]: best=(cur,dict(pos))
    return best[1],best[0]
