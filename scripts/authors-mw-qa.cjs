const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve(__dirname,'../work/mw-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error'&&/Failed to initialize 3D|ReferenceError|TypeError/.test(msg.text()))errors.push(msg.text());});
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(800);
  for(const mode of ['3d','nfs']){
   await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode);NomeraAuthorsExpansion.goStep(3)},mode);
   await page.locator('#ae-physics-model').selectOption('mw');
   await page.screenshot({path:path.join(out,`prepare-${mode}-390.png`)});
   for(const width of [320,390,844]){
    await page.setViewportSize({width,height:width===844?390:844});
    const bounds=await page.locator('#ae-physics-model').boundingBox();assert(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width+1);
   }
   await page.setViewportSize({width:390,height:844});
   await page.evaluate(()=>startRaceGame());await page.waitForTimeout(900);
   const start=await page.evaluate(()=>({name:car3DRacingEngine.constructor.name,mw:!!(car3DRacingEngine.playerPhysics?.mwSpec||car3DRacingEngine.mwLongitudinal?.mwSpec),phase:car3DRacingEngine.state.racePhase}));
   assert(start.mw);assert.equal(start.name,mode==='nfs'?'NomeraCircuitRaceEngine':'Car3DRacingEngine');
   // Stop RAF for deterministic simulation, while keeping real DOM input handlers.
   await page.evaluate(()=>{car3DRacingEngine.stop();if(car3DRacingEngine.state.racePhase==='countdown')car3DRacingEngine.state.racePhase='racing';});
   const gas=page.locator('#btn-3d-touch-gas');await gas.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});
   const driven=await page.evaluate(()=>{const e=car3DRacingEngine;for(let i=0;i<180;i++)e.update(1/60);return{speed:e.state.speed,gear:e.state.gear,fuel:e.state.fuelLiters,distance:e.state.distanceKm,keys:{...e.keys}}});
   assert(driven.speed>30);assert(driven.fuel>0);assert(driven.distance>.02);assert(driven.keys.gas);
   await gas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'touch'});
   assert.equal(await page.evaluate(()=>car3DRacingEngine.keys.gas),false);
   await page.evaluate(()=>{car3DRacingEngine.render?.();car3DRacingEngine._render?.();});
   await page.screenshot({path:path.join(out,`race-${mode}-390.png`)});
   const camera=await page.evaluate(()=>{const before=car3DRacingEngine.cameraMode;toggle3DCameraView();return{before,after:car3DRacingEngine.cameraMode}});assert.notEqual(camera.before,camera.after);
   results.push({mode,start,driven,camera});
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
   await page.evaluate(()=>NomeraAuthorsExpansion.goStep(3));
   await page.locator('#ae-physics-model').selectOption('classic');
   await page.evaluate(()=>startRaceGame());await page.waitForTimeout(400);
   assert.equal(await page.evaluate(()=>!!car3DRacingEngine.mwLongitudinal||!!car3DRacingEngine.playerPhysics?.mwSpec),false);
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
  }
  await page.reload();await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>NomeraMW.selected()),false,'choice must survive reload');
  await page.goto('http://127.0.0.1:4317/antigravity.html');await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>typeof NomeraMW),'undefined');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({success:true,results,errors},null,2));
  console.log('PASS MW/classic start, physical movement, fuel, touch cancellation, camera, 3 widths, persistent choice, comparison isolation');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
