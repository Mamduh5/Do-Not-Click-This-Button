const {chromium}=require("@playwright/test");
const fs=require("node:fs");
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1280,height:820}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
 await page.goto("http://127.0.0.1:5180/arena.html",{waitUntil:"networkidle"});
 await page.waitForFunction(()=>window.__containmentArena);
 const report=[];
 for(let wave=1;wave<=5;wave++){
  const started=Date.now();let clicks=0,emptyPulse=null,championCaptured=false;
  while(Date.now()-started<60000){
   const s=await page.evaluate(()=>{
    const sc=window.__containmentArena.scene;
    const e=sc.enemies.find(e=>e.active);
    const r=sc.game.canvas.getBoundingClientRect();
    return {phase:sc.state.wavePhase,energy:sc.state.energy,charge:sc.state.pulseCharge,chain:sc.combo,
      pulseTargets:ARENA.CursorAttack.findTargets(sc.enemies,480,310,sc.stats.pulseRadius).length,
      target:e?{x:r.left+e.x*r.width/960,y:r.top+e.y*r.height/620,role:e.roleId,hp:e.health}:null};
   });
   if(s.phase==="cleared"){report.push({wave,seconds:(Date.now()-started)/1000,clicks,energy:s.energy,chain:s.chain,emptyPulse});break;}
   if(wave===2&&s.charge===100&&s.target&&emptyPulse===null){
    emptyPulse=s.pulseTargets;
    await page.locator("#arenaPulseBtn").click();
   }
   if(s.target){
    if(s.target.role==="champion"&&!championCaptured){await page.screenshot({path:"output/playwright/designer-after-champion.png"});championCaptured=true;}
    await page.mouse.click(s.target.x,s.target.y);clicks++;
   }
   await page.waitForTimeout(180);
  }
  await page.locator("#arenaOperationOverlay").waitFor({state:"visible"});
  await page.screenshot({path:"output/playwright/designer-after-wave-"+wave+".png",fullPage:true});
  if(wave<5){
   const card=page.locator(".arena-upgrade-card").filter({has:page.locator(".upgrade-name",{hasText:wave===2?"Wider Impact":"Heavier Cursor"})});
   if(await card.isEnabled())await card.click();
   await page.locator("#arenaNextWaveBtn").click();
  }
 }
 console.log(JSON.stringify({report,errors},null,2));
 fs.writeFileSync("output/playwright/designer-after.json",JSON.stringify({report,errors},null,2));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:"output/playwright/designer-after-mobile-clear.png",fullPage:true});
 await page.locator("#arenaReviewUpgradesBtn").click();
 await page.locator(".arena-upgrade-card").filter({has:page.locator(".upgrade-name",{hasText:"Auto Tapper"})}).click();
 await page.screenshot({path:"output/playwright/designer-after-mobile-shop.png"});
 await page.locator("#arenaShopNextWaveBtn").click();
 await page.waitForTimeout(850);
 await page.screenshot({path:"output/playwright/designer-after-mobile-field.png"});
 await page.goto("http://127.0.0.1:5180/",{waitUntil:"networkidle"});
 for(let i=0;i<12;i++){await page.locator("#mainBtn").click();await page.waitForTimeout(150);}
 await page.screenshot({path:"output/playwright/designer-after-button.png",fullPage:true});
 if(!(await page.locator("#guideAction").textContent()).includes("INSTALL POWER TAP"))throw new Error("first purchase cue missing");
 await page.locator("#guideAction").click();
 if((await page.locator("#perClickDisplay").textContent())!=="2")throw new Error("first purchase did not improve output");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
