/* Decisiones de edición de v2; los originales permanecen intactos. */
(() => {
const C = window.REEL_CONFIG;
C.title = 'Punta Ballena · plata, espuma, arena';
C.subtitle = 'Revelado v2 · copias fotográficas y matrices de aguatinta';
for (const k of Object.keys(C.photos)) if (!C.photos[k].startsWith('plates/')) C.photos[k] = `photos/v2/${k}.jpg`;
C.photos.rinconada = 'photos/v2/rinconada.jpg';
C.photos.gruta = 'photos/v2/gruta.jpg';
C.closingAt = 152.18;
C.closing.y = 300;
C.burn = {...C.burn, t0:149.8,t1:152.18,yFull:1100,yZero:1220,density:1.55};
C.noteStyle = {...C.noteStyle, maxW:760,wordSize:68,glossSize:42,gloss2Size:36,reveal:.6,fadeOut:.35,burn:.36};
C.annotations = [
 {id:'creditos',t0:.55,t1:9,y:290,h:350,word:'Punta Ballena',wordSize:104,gloss:'Santiago Chalar · Santos Inzaurralde',gloss2:'Minas y Abril · 1978'},
 {id:'yaguaron',t0:50.6,t1:55.2,y:290,h:290,word:'Yaguarón',gloss:'río de frontera · Uruguay y Brasil'},
 {id:'yerbal',t0:63,t1:68.3,y:290,h:290,word:'Sierras del Yerbal',gloss:'serranías del este del Uruguay'},
 {id:'tacuari',t0:69.9,t1:72.8,y:290,h:290,word:'Tacuarí',gloss:'río de la cuenca de la Laguna Merín',gloss2:'quilero: contrabandista de frontera'},
 {id:'guazunambi',t0:72.8,t1:76,y:290,h:320,word:'Guazunambí',gloss:'cuchilla y arroyo de Cerro Largo',gloss2:'arachán: gentilicio tradicional'},
 {id:'coronilla',t0:79.6,t1:83.4,y:290,h:290,word:'coronilla',gloss:'árbol nativo del monte serrano'},
 {id:'carape',t0:110.8,t1:117,y:290,h:300,word:'Carapé',gloss:'sierra de Maldonado y Lavalleja'},
 {id:'aigua',t0:120.8,t1:125.5,y:290,h:300,word:'Aiguá',gloss:'arroyo del norte de Maldonado'},
];
// La portada se revela ya desde el primer cuadro; la ampliación es un recorrido lento.
C.sections[0].enter = {...C.sections[0].enter,t0:-1.7,v:950,tau0:.22};
C.prints[0].cam = [[0,370,0,1],[19.06,490,0,1]];
C.photoSpec.aerea.black=.06; C.photoSpec.aerea.white=.93;
// La nueva copia de gruta utiliza un negativo vertical sin turistas.
C.photoSpec.gruta = {w:1600,h:2400,up:1,dist:false,black:.05,white:.84};
C.masks.gruta = {sky:[[[440,0],[1150,0],[1160,1150],[440,1150]]],water:[[[470,1350],[1150,1350],[1150,1610],[470,1610]]],sand:[[[0,1770],[1600,1700],[1600,2400],[0,2400]]],rockRest:true};
const gr=C.prints.find(p=>p.id==='gruta'); Object.assign(gr,{kind:'still',scale:.8,cam:[[120.1,95,0,1],[125,105,0,1]],fx:{},atlasS:2});
for(const f of C.figures.filter(f=>f.print==='gruta')) {f.h=160;f.foot= f.id==='G1'?[610,2040]:f.id==='G2'?[1090,2000]:[760,2050];}
// Archivo común, sin parches clonados antiguos para un escaneo distinto.
C.photoSpec.rinconada.patches=[];
// Cerro/monte regional: la foto libre de Quebrada es materia; no se afirma identificar el verso dudoso.
C.photoSpec.yerbal={w:1010,h:720,up:2,dist:false,black:.05,white:.9};
// Un relieve que se deshace con el primer verso de la coda, no seis segundos después.
C.prints.find(p=>p.id==='playa').fx.erode={t0:138.84,t1:150,max:.18};
const foam=C.shed.find(p=>p.print==='rompiente');
Object.assign(foam,{t0:84.18,t1:90.28,bursts:[[84.7,6],[86.4,7],[88.0,4]],cluster:85,perCluster:38,trickle:650,reach:[45,95],size:[4,9]});
C.shed=C.shed.filter(s=>s.print!=='playa');
// Las matrices son planas: no se les aplica deformación de volumen.
for(const p of C.prints) if(['quebrada','tacuari','cerrito','carape'].includes(p.id)) {p.kind='still';p.fx={};}
// No usar nombres dudosos de la transcripción como hechos.
C.sections.find(s=>s.id==='e2d').lyric='[verso serrano pendiente de cotejo]';
})();
(() => {
const C=window.REEL_CONFIG;
C.photos.yaguaron='photos/v2/yaguaron.jpg';
C.photoSpec.yaguaron={w:1942,h:1920,up:1,dist:false,black:.04,white:.94};
C.masks.yaguaron={sky:[[[0,0],[1942,0],[1942,810],[1500,745],[1100,690],[550,600],[0,460]]],water:[[[0,950],[1942,950],[1942,1620],[1730,1720],[1460,1920],[0,1920]]],rockRest:true};
C.light.yaguaron={kx:.2,ky:.08,rim:[.4,.4]};
C.prints.push({id:'yaguaron',kind:'still',photo:'yaguaron',scale:1,cam:[[50.42,850,0,1],[55.28,860,0,1]],atlasS:2});
const rec=C.sections.find(s=>s.id==='rec2');rec.print='yaguaron';rec.t1=55.28;
const i=C.sections.indexOf(rec); C.sections.splice(i+1,0,{id:'rec3',t0:55.28,t1:60.86,print:'abra',lyric:'Rompió en las olas…',enter:{dur:1.1,dirDeg:-6,bow:90,noiseAmp:60,seed:9.7,figFront:1,tau0:.35,induction:.02}});
C.figures.push({id:'J1',print:'yaguaron',group:0,pose:'standP',foot:[1680,1860],h:100,size:'adult',facing:-1},{id:'J2',print:'yaguaron',group:0,pose:'childP',foot:[1760,1875],h:110,size:'child',facing:-1});
})();
(() => {const C=window.REEL_CONFIG;for(const f of C.figures.filter(f=>f.print==='cerrito'))f.foot[1]+=190;})();

(() => {
const C=window.REEL_CONFIG;
C.photos.relieve=C.photos.aerea;
C.photoSpec.relieve={w:988,h:717,up:2,dist:false,black:.02,white:.92};
C.masks.relieve=C.masks.aerea;
const p=C.prints.find(p=>p.id==='relieve');p.scale=2.6778;p.cam=[[40,300,0,1],[50.42,320,0,1]];
const feet=[[540,400],[525,420],[510,442]];C.figures.filter(f=>f.print==='relieve').forEach((f,i)=>{f.foot=feet[i];f.h=39;});
C.groups.relieve[1].vel=[-.5,1.2];
})();
(() => {
const C=window.REEL_CONFIG;
C.masks.rompiente={
 sky:[[[0,0],[1876,0],[1876,350],[1770,365],[1600,382],[1450,408],[1390,438],[1090,425],[1040,399],[975,397],[915,421],[500,409],[0,396]]],
 water:[[[0,398],[510,409],[585,427],[580,448],[541,493],[505,540],[464,599],[458,636],[361,634],[318,680],[294,738],[258,850],[236,890],[0,941]],[[570,425],[914,425],[862,476],[816,500],[760,496],[700,467],[630,455]]],
 sand:[[[0,945],[238,890],[475,908],[540,896],[600,916],[785,918],[850,943],[1110,934],[1190,980],[1450,989],[1670,930],[1800,824],[1876,801],[1876,1012],[0,1012]]],rockRest:true
};
})();
(() => {
const C=window.REEL_CONFIG;
C.noteStyle.burn=.18;
// Loma clara de la punta: las figuras se leen sobre tierra, no sobre la roca negra.
const feet=[[490,315],[513,325],[535,335]];
C.figures.filter(f=>f.print==='relieve').forEach((f,i)=>{f.foot=feet[i];f.h=33;});
// La foto de Quebrada es una ladera: ubicar el grupo sobre el afloramiento claro del primer plano.
const ys=[[506,615],[528,623],[550,630]];
C.figures.filter(f=>f.print==='yerbal').forEach((f,i)=>{f.foot=ys[i];f.h=44;});
C.groups.yerbal[1].vel=[.7,0];
})();
(() => {
const C=window.REEL_CONFIG;
C.photoSpec.relieve.curve=[[0,.12],[.15,.38],[.35,.64],[.7,.86],[1,.96]];
C.groups.relieve[1].tau0=.1;
C.groups.yerbal[1].tau0=.12;
C.photoSpec.yerbal.curve=[[0,.12],[.15,.32],[.35,.56],[.65,.80],[1,.95]];
C.prints.find(p=>p.id==='playa').fx.erode={t0:138.84,t1:150,max:.95};
})();
