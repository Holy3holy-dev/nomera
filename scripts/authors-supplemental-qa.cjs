const {chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const output=process.env.NOMERA_QA_DIR || require('node:path').resolve(__dirname,'../work/authors-qa');fs.mkdirSync(output+'/screenshots',{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];const checks=[];
 try {
  const context=await browser.newContext({viewport:{width:320,height:740},hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4317/');
  await page.evaluate(()=>{checkAchievements();document.querySelector('#turbo-toggle').checked=true;window.__charges=[];const original=deductPlayerBalance;deductPlayerBalance=function(amount,...rest){__charges.push(amount);return original(amount,...rest);};});
  for(const country of ['RUS','KZ','USA','UAE','JPN']) {
   await page.locator('#btn-country-'+country).click();
   const expected=Number((await page.locator('#spin-cost-both').textContent()).replace(/\D/g,''));
   const start=await page.evaluate(()=>__charges.length);
   await page.locator('#btn-spin-both').click();await page.waitForFunction(()=>!isSpinning && !document.querySelector('#btn-save').disabled);
   assert.deepEqual(await page.evaluate(start=>__charges.slice(start),start),[expected]);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const count=await page.evaluate(()=>inventory.length);
   await page.locator('#btn-save').click();await page.evaluate(()=>savePlate());
   assert.equal(await page.evaluate(()=>inventory.length),count+1);
   checks.push({country,charge:expected,savedOnce:true});
  }
  await page.evaluate(()=>switchTab('garage'));await page.waitForFunction(()=>garageShowroom?.glbCar && document.querySelector('#garage-3d-loader').style.display==='none');
  const box=await page.locator('#garage-preview-3d-wrap').boundingBox();
  const angle=await page.evaluate(()=>garageShowroom.targetAngleY);
  await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.5,{steps:12});await page.mouse.up();
  assert.notEqual(await page.evaluate(()=>garageShowroom.targetAngleY),angle);
  const distance=await page.evaluate(()=>garageShowroom.targetDistance);
  await page.mouse.wheel(0,200);await page.waitForTimeout(150);
  assert.notEqual(await page.evaluate(()=>garageShowroom.targetDistance),distance);
  checks.push({mouseDrag:true,wheelZoom:true});
  await page.evaluate(()=>{myCars=[];renderCars();});await page.waitForTimeout(200);
  assert(await page.locator('.ae-empty-garage').isVisible());
  assert(!(await page.locator('#garage-3d-podium-card').isVisible()));
  await page.screenshot({path:output+'/screenshots/garage-empty-320.png',fullPage:true});checks.push({emptyGarage:true});
  await context.close();
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844}});
  await fallbackContext.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  const fallback=await fallbackContext.newPage();fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.goto('http://127.0.0.1:4317/?screen=garage');
  await fallback.waitForSelector('.ae-webgl-fallback');
  assert(await fallback.locator('.ae-webgl-fallback img').evaluate(img=>img.complete&&img.naturalWidth>0));
  await fallback.locator('#btn-gtab-tuning').click();assert(await fallback.locator('#inspector-tuning-box').isVisible());
  await fallback.screenshot({path:output+'/screenshots/garage-no-webgl-390.png',fullPage:true});checks.push({noWebGLFallback:true,inspectorAvailable:true});
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(output+'/supplemental-results.json',JSON.stringify({success:true,checks,errors},null,2));
  console.log(JSON.stringify({success:true,checks,errors}));
 }finally{await browser.close();}
})().catch(error=>{fs.writeFileSync(output+'/supplemental-results.json',JSON.stringify({success:false,error:error.stack},null,2));console.error(error);process.exitCode=1;});

