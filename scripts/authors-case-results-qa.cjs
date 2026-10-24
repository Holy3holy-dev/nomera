'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const out=path.resolve('work/case-results/mobile');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),result={cases:[],views:[],errors:[]};let page;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
 await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4317/')?route.continue():route.abort());
 page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.stack));
 await page.goto('http://127.0.0.1:4317/authors.html');
 await page.evaluate(()=>{balance=1000000000;achievements=Object.fromEntries(ACHIEVEMENTS_CATALOG.map(a=>[a.id,123]));activityRewards.extraAchievements=ACHIEVEMENTS_CATALOG.map(a=>a.id);NomeraProgressionCelebration.clear();switchTab('cases');setCaseAnimMode('fast');});
 for(const isCar of [false,true])for(const count of [1,5,10]){
  const before=await page.evaluate(({isCar,count})=>{const type=Object.keys(caseConfigs).find(k=>!!caseConfigs[k].isCar===isCar),before={balance,n:isCar?myCars.length:inventory.length};buyCase(type,count);return before;},{isCar,count});
  await page.waitForFunction(()=>!isSpinning,null,{timeout:12000});await page.waitForTimeout(150);
  const after=await page.evaluate(isCar=>({balance,n:isCar?myCars.length:inventory.length,phase:document.getElementById('roulette-modal').dataset.casePhase,open:[...document.querySelectorAll('.ae-result-reel')].filter(n=>!n.hidden&&n.open).length}),isCar);
  assert.equal(after.n,before.n+count);assert(after.balance<before.balance);assert.equal(after.phase,'complete');assert.equal(after.open,0);
  if(count===1){await page.screenshot({path:path.join(out,(isCar?'car':'plate')+'-single.png')});await page.evaluate(isCar=>isCar?rouletteSaveCar():rouletteSave(),isCar);assert.equal(await page.evaluate(isCar=>isCar?myCars.length:inventory.length,isCar),after.n);}
  else{
   await page.evaluate(()=>{batchCaseResults[0]._isDuplicate=true;batchCaseResults[1]._isDuplicate=true;{const config=caseConfigs[activeCaseType],price=getCaseEffectivePrice(activeCaseType,config.fixedCountry||currentCaseCountry||currentCountry||'RUS');renderBatchCaseResultsUI(config.title||config.name||activeCaseType,batchCaseResults.length,price*batchCaseResults.length,price);};});
   await page.locator('[data-keep="0"]').click();
   const stable=await page.evaluate(()=>({balance,n:myCars.length+inventory.length}));
   await page.evaluate(()=>sellSingleBatchDrop(0));assert.deepEqual(await page.evaluate(()=>({balance,n:myCars.length+inventory.length})),stable);
   await page.locator('#ae-select-duplicates').click();
   assert.equal(await page.locator('[data-select="0"]').isChecked(),false);assert.equal(await page.locator('[data-select="1"]').isChecked(),true);
   await page.locator('#ae-clear-selection').click();await page.locator('[data-select="1"]').check();
   const expected=await page.evaluate(()=>{const i=batchCaseResults[1];return i.isCar?Math.floor(i.price*.9):i.price;});
   if(count===10){await page.locator('#batch-drop-card-1').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,(isCar?'car':'plate')+'-selected-390.png')});}
   await page.locator('#ae-sell-selected').click();
   assert.equal(await page.evaluate(()=>balance),stable.balance+expected);assert.equal(await page.evaluate(()=>myCars.length+inventory.length),stable.n-1);
   await page.evaluate(()=>sellSingleBatchDrop(1));assert.equal(await page.evaluate(()=>balance),stable.balance+expected);
   const bulk=await page.evaluate(()=>{batchCaseResults[2]._isDuplicate=true;{const config=caseConfigs[activeCaseType],price=getCaseEffectivePrice(activeCaseType,config.fixedCountry||currentCaseCountry||currentCountry||'RUS');renderBatchCaseResultsUI(config.title||config.name||activeCaseType,batchCaseResults.length,price*batchCaseResults.length,price);};return{before:balance,expected:batchCaseResults.filter(i=>i._isDuplicate&&NomeraCaseResults.canSell(i)).reduce((sum,i)=>sum+(i.isCar?Math.floor(i.price*.9):i.price),0)};});await page.locator('#btn-batch-sell-dups').click();assert.equal(await page.evaluate(()=>balance),bulk.before+bulk.expected);assert(await page.evaluate(()=>!batchCaseResults[0]._sold&&batchCaseResults[2]._sold));
   await page.locator('[data-filter="kept"]').click();assert.equal(await page.locator('#roulette-batch-grid .ae-drop').count(),1);
   await page.locator('[data-filter="all"]').click();
   for(const [width,height]of [[320,740],[390,844],[844,390],[1280,900]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>document.querySelector('.ae-case-dialog-body').scrollTop=0);await page.waitForTimeout(70);
    const box=await page.evaluate(()=>{const d=document.querySelector('.ae-case-dialog-body'),g=document.getElementById('roulette-batch-grid');return {scroll:d.scrollWidth,client:d.clientWidth,grid:g.getBoundingClientRect().toJSON(),cards:[...g.children].map(n=>n.getBoundingClientRect().toJSON())};});
    assert(box.scroll<=box.client+1,JSON.stringify({width,box}));assert(box.cards.every(n=>n.x>=0&&n.right<=width+1));
    if(count===10){await page.screenshot({path:path.join(out,(isCar?'car':'plate')+'-results-'+width+'.png')});result.views.push({isCar,width,height,...box});}
   }
   await page.setViewportSize({width:390,height:844});
   await page.locator('.ae-result-search').evaluate(n=>n.open=true);await page.locator('#ae-result-toolbar input').fill('zzzz-no-match');assert.equal(await page.locator('.ae-result-empty').count(),1);await page.locator('#ae-result-toolbar input').fill('');
   await page.locator('#ae-result-toolbar select').selectOption('price');
   const keptId=await page.evaluate(()=>batchCaseResults[0]._openingId);await page.evaluate(()=>sellBatchCaseResults(false));
   assert(await page.evaluate(id=>[...inventory,...myCars].some(i=>i._openingId===id),keptId));
   const final=await page.evaluate(()=>({balance,n:myCars.length+inventory.length}));await page.evaluate(()=>{sellBatchCaseResults(false);claimBatchCaseResults();claimBatchCaseResults();});assert.deepEqual(await page.evaluate(()=>({balance,n:myCars.length+inventory.length})),final);
  }
  result.cases.push({isCar,count,before,after});await page.evaluate(()=>closeRouletteModal());
 }
 // Each national layout must fit its preview without changing its format.
 await page.setViewportSize({width:320,height:740});
 for(const type of ['normal','kz_box','usa_box','jpn_box','uae_box']){
  await page.evaluate(type=>{setCaseAnimMode('instant');buyCase(type,5);NomeraProgressionCelebration.clear();},type);await page.waitForTimeout(100);
  const fit=await page.evaluate(()=>{const n=document.querySelector('.ae-drop .mini-plate'),v=n.parentElement,b=n.getBoundingClientRect(),a=v.getBoundingClientRect();return {w:b.width,h:b.height,within:b.left>=a.left-1&&b.right<=a.right+1&&b.top>=a.top-1&&b.bottom<=a.bottom+1};});
  assert(fit.within,JSON.stringify({type,...fit}));await page.locator('.ae-drop-visual').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'national-'+type+'-320.png')});await page.evaluate(()=>closeRouletteModal());
 }
 // The last garage car cannot be sold by either entry point.
 await page.evaluate(()=>{setCaseAnimMode('instant');buyCase('car_standard',5);});await page.waitForTimeout(100);
 const last=await page.evaluate(()=>{myCars=myCars.filter(i=>i._openingId===batchCaseResults[0]._openingId);const before=balance;sellSingleBatchDrop(0);sellBatchCaseResults(false,[0]);return{before,after:balance,n:myCars.length,sold:batchCaseResults[0]._sold};});assert.equal(last.after,last.before);assert.equal(last.n,1);assert(!last.sold);await page.evaluate(()=>closeRouletteModal());
 // Reduced motion and skip retain exactly one settlement.
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{setCaseAnimMode('standard');buyCase('normal',5);});await page.waitForFunction(()=>!isSpinning);const saved=await page.evaluate(()=>({balance,n:inventory.length}));await page.evaluate(()=>{skipCaseAnimation();skipCaseAnimation();claimBatchCaseResults();});assert.deepEqual(await page.evaluate(()=>({balance,n:inventory.length})),saved);
 assert.deepEqual(result.errors,[]);result.success=true;console.log('PASS: cases 1/5/10, protected and selected sales, commission, repeat sale, claim, filters, search, sizes 320/390/844/1280, reduced motion');
}finally{if(!result.success&&page){await page.screenshot({path:path.join(out,'failed.png')});result.failed=await page.evaluate(()=>({phase:document.getElementById('roulette-modal').dataset.casePhase,isSpinning,balance}));}fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
