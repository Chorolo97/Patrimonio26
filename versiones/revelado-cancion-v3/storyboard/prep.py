import numpy as np, sys, json
from PIL import Image, ImageFilter
R='/home/user/Patrimonio26/'
P=R+'shared/assets/photos/v2/'; PL=R+'versiones/revelado-cancion-v2/plates/'
W,H=1080,1920
S=np.array([36,29,24.]);M=np.array([146,124,102.]);Hh=np.array([243,235,219.])
def tone(L):
    L=np.clip(L,0,1)[...,None]
    a=np.clip(L*2,0,1); b=np.clip(L*2-1,0,1)
    return np.where(L<.5, S+(M-S)*a, M+(Hh-M)*b)
def curve(x,pts):
    xs,ys=zip(*pts); return np.interp(x,xs,ys)
def load(src,x0,scale=None,lo=1,hi=99,cv=None,sharp=1.0,y0=0,gam=1.0):
    im=Image.open(src).convert('RGB')
    s=scale or H/im.height
    im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    im=im.crop((x0,y0,x0+W,y0+H))
    if sharp: im=im.filter(ImageFilter.UnsharpMask(2,int(60*sharp),2))
    a=np.asarray(im).astype(float)/255
    L=a[...,0]*.3+a[...,1]*.59+a[...,2]*.11
    l,h=np.percentile(L,lo),np.percentile(L,hi)
    L=np.clip((L-l)/(h-l),0,1)**gam
    if cv: L=curve(L,cv)
    return L
def save(L,name,dev=None):
    out=tone(L)
    if dev is not None: # paper not yet developed: blend towards paper
        out=out*(1-dev[...,None])+Hh*dev[...,None]
    Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save(name)
if __name__=='__main__':
    which=sys.argv[1:]
    cfg=json.load(open('bgs.json'))
    for k,v in cfg.items():
        if which and k not in which: continue
        L=load(PL+v['src'] if v.get('plate') else P+v['src'],v['x0'],v.get('scale'),v.get('lo',1),v.get('hi',99),v.get('cv'),v.get('sharp',1),v.get('y0',0),v.get('gam',1))
        dev=None
        if 'dev' in v:  # vertical fade: [y_full_paper, y_full_image]
            y=np.arange(H)[:,None]*np.ones((1,W)); a,b=v['dev']
            t=np.clip((y-a)/(b-a),0,1); dev=(1-t*t*(3-2*t))*v.get('devAmt',1)
        for (x,y,w,h,dx,dy,f) in v.get('patch',[]):
            src=L[y+dy:y+dy+h,x+dx:x+dx+w].copy()
            yy,xx=np.mgrid[0:h,0:w]; m=np.minimum.reduce([xx/f if x>0 else xx*0+9,(w-1-xx)/f if x+w<W else xx*0+9,yy/f if y>0 else yy*0+9,(h-1-yy)/f]); m=np.clip(m,0,1)
            m=m*m*(3-2*m); L[y:y+h,x:x+w]=L[y:y+h,x:x+w]*(1-m)+src*m
        save(L,'bg_'+k+'.png',dev)
        print(k)
