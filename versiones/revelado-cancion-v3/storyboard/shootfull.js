const {chromium}=require('playwright');const path=require('path');
(async()=>{const [f,o]=process.argv.slice(2);const b=await chromium.launch();const p=await b.newPage({viewport:{width:2040,height:1000}});
await p.goto('file://'+path.resolve(f));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);await p.screenshot({path:o,fullPage:true});await b.close();})();
