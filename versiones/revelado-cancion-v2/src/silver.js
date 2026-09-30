/* Fragmento fotográfico: granito, luego arena. Puntos de plata deterministas. */
window.createSilverFragment = async function(cfg) {
 const image = await RV.loadAsset(cfg.assets+'photos/v2/rompiente.jpg', cfg);
 const c=document.createElement('canvas');c.width=180;c.height=230;
 const g=c.getContext('2d',{willReadFrequently:true});
 g.drawImage(image,680,475,560,515,0,0,180,230);
 const data=g.getImageData(0,0,180,230).data, r=PBS.rng(260942), dots=[];
 for(let y=0;y<230;y++) for(let x=0;x<180;x++) {
   const nx=x/180,ny=y/230;
   const edge=.19+.05*Math.sin(nx*17)+.035*Math.sin(nx*39)-.17*nx;
   if(ny<edge || nx<.14*(1-ny)+.035*Math.sin(ny*16)) continue;
   const k=(y*180+x)*4,L=(data[k]*.30+data[k+1]*.59+data[k+2]*.11)/255;
   const v=Math.max(.075,Math.min(.82,(L-.12)/.78));
   dots.push({x:710+x*2.5,y:1130+y*4,L:v,threshold:.12+.68*r()+.2*(1-ny),vx:28+75*r(),vy:22+70*r(),life:2+3*r(),phase:r()*6.28,size:1.3+r()*1.3});
 }
 return function(ctx,t) {
  if(t<138.84||t>156)return;
  const birth=PBS.smooth((t-124.5)/1.4), progress=PBS.smooth((t-138.84)/10.8);
  ctx.save();
  for(const p of dots) {
    if(p.threshold>birth || progress<=p.threshold)continue;
    let x=p.x,y=p.y,L=p.L,alpha=1;
    if(progress>p.threshold) {
      const dt=(progress-p.threshold)*15 + Math.max(0,t-149.64);
      x+=p.vx*dt; y+=p.vy*dt+8*dt*dt;
      L= PBS.lerp(L,.68,Math.min(1,dt*.8));
      alpha=1-PBS.smooth((dt-p.life*.65)/(p.life*.35));
    }
    if(alpha<=0||x>1080||y>1920)continue;
    const val=Math.round(L*228);
    ctx.fillStyle=`rgba(${val+15},${val+8},${val},${alpha})`;
    ctx.fillRect(x,y,progress>p.threshold?p.size:2.8,progress>p.threshold?p.size:4.3);
  }
  ctx.restore();
 };
};
