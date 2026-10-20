const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('work/mw-contact-live-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),results={runs:[],errors:[]};
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
  await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>results.errors.push(e.stack));await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(500);
  for(const mode of ['3d','nfs']){
   await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode);selectRaceCar(myCars[2].name,2);NomeraAuthorsExpansion.goStep(3)},mode);
   await page.locator('#ae-physics-model').selectOption('mw');await page.evaluate(()=>startRaceGame());
   await page.waitForFunction(()=>{const e=car3DRacingEngine;return e.playerPhysics?e.playerWheels?.length===4&&e.playerWheels.every(w=>!w.procedural):e.authorsWheelRig?.imported&&e.authorsWheelRig.wheels.length===4&&!e.authorsWheelRig.pending},null,{timeout:45000});
   await page.evaluate(()=>{
    const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.state.racePhase='racing';e.resetKeys();
    p.reset({speedKmh:220,...(e.track?.sampleTrackAtS(65)||{x:0,z:270,heading:0})});e.state.speed=220;
    if(!e.playerPhysics){e.state.x=0;e.state.z=270;e.state.vx=0;e.state.yawAngle=0;e.roadCurve=0;e.roadCurvature=0;e.targetRoadCurve=0;e.targetCurvature=0;e.curveTimer=30;
     e.roadChunks.forEach((c,i)=>c.position.z=(Math.floor(270/e.chunkLength)-1+i)*e.chunkLength);e.highestChunkZ=Math.max(...e.roadChunks.map(c=>c.position.z));e.updateRoadChunks();
    }
    window.contactLive={samples:[],active:true,start:performance.now()};
    const capture=()=>{if(!contactLive.active)return;contactLive.samples.push({ms:performance.now()-contactLive.start,y:p.y,vy:p.suspension.vy,pitch:p.state.pitch,grounded:p.state.roadContact?.grounded,landings:p.state.roadContact?.landings,steps:p.stepCount,speed:p.speedKmh,running:e.isRunning});requestAnimationFrame(capture);};requestAnimationFrame(capture);
   });
   await page.locator('#btn-3d-touch-gas').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,bubbles:true});
   await page.waitForFunction(()=>contactLive.samples.some(s=>s.grounded===0)&&contactLive.samples.at(-1).landings>0,null,{timeout:30000});
   const run=await page.evaluate(()=>{contactLive.active=false;const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;return{...contactLive,engine:e.constructor.name,fuel:e.state.fuelCurrent,landings:p.state.roadContact.landings,traffic:e.trafficCars?.length,rivals:e.rivals?.length};});
   assert(run.samples.length>10&&run.samples.every(s=>s.running&&Number.isFinite(s.y)&&Math.abs(s.pitch)<.7));assert(run.landings>0&&run.fuel>0);
   results.runs.push({mode,...run});await page.screenshot({path:path.join(out,`live-${mode}-390.png`)});
   await page.locator('#btn-3d-touch-gas').dispatchEvent('pointercancel',{pointerId:1,pointerType:'touch',bubbles:true});await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});console.log('PASS live RAF',mode,run.samples.length,'frames',run.landings,'landing');
  }
  assert.deepEqual(results.errors,[]);results.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
