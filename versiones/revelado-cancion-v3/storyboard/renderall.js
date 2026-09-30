const {chromium}=require('playwright');const path=require('path');
(async()=>{const ids=process.argv.slice(2);const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('console',m=>console.log('console:',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
for(const id of ids){await p.goto('file://'+path.resolve('frame.html')+'#'+id);await p.reload();await p.waitForFunction(()=>window.DONE);
await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(250);await p.screenshot({path:'f_'+id+'.png'});console.log(id);}
await b.close();})();
