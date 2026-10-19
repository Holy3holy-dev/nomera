const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve(process.env.NOMERA_QA_DIR||'work/mw-tire-collision-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const result={checks:[],errors:[]};
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
  await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.stack));
  await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(700);
  for(const mode of ['3d','nfs']){
   await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode);NomeraAuthorsExpansion.goStep(3)},mode);
   await page.locator('#ae-physics-model').selectOption('mw');
   await page.evaluate(()=>startRaceGame());await page.waitForTimeout(500);
   await page.evaluate(()=>{const e=car3DRacingEngine;e.stop();e.state.racePhase='racing';});
   for(const[width,height]of [[320,740],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    const targets=await page.evaluate(()=>{
     const ids=['gas','brake','left','right','drift','nitro'];return ids.map(id=>{const el=document.querySelector('#btn-3d-touch-'+id),r=el.getBoundingClientRect();return{id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}});
    });
    for(const t of targets){assert(t.x>=-1&&t.right<=width+1&&t.y>=-1&&t.bottom<=height+1,JSON.stringify(t));assert(t.width>=40&&t.height>=40);}
    const sample=await page.evaluate(()=>{
     const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;
     e.resetKeys();p.reset({speedKmh:80,x:p.x,z:p.z,heading:p.heading});
     e.state.speed=80;e.state.vx=0;
     if(!e.playerPhysics){e.state.x=0;e.roadCurve=0;e.targetRoadCurve=0;e.curveTimer=10;}
     return{startHeading:p.heading,startX:e.state.x,startSpeed:80};
    });
    const gas=page.locator('#btn-3d-touch-gas'),left=page.locator('#btn-3d-touch-left');
    await gas.dispatchEvent('pointerdown',{pointerId:41,pointerType:'touch',isPrimary:true,bubbles:true});
    await left.dispatchEvent('pointerdown',{pointerId:42,pointerType:'touch',isPrimary:false,bubbles:true});
    const driven=await page.evaluate(()=>{
     const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal,start=performance.now();
     // 30 FPS: two physics ticks per display update in the circuit, four for MW.
     for(let i=0;i<15;i++)e.update(1/30);
     return{elapsedMs:performance.now()-start,keys:{...e.keys},speed:e.state.speed,vx:e.state.vx,
      heading:p.heading,angle:p.state.steerAngleDeg,wheels:{...p.state.wheelAngles},loads:{...p.state.wheelLoads},
      tires:Object.values(p.mwTires).map(t=>({load:t.load,traction:t.traction,omega:t.omega})),u:e.authorsSteerInput};
    });
    assert(driven.keys.left&&driven.keys.gas);assert(Math.abs(driven.angle)>5);assert(driven.speed>20);
    assert(driven.tires.length===4&&driven.tires.every(t=>Number.isFinite(t.omega)&&Number.isFinite(t.traction)));
    result.lastSample={mode,width,height,sample,driven};
    if(mode==='3d')assert(driven.vx>.5,'highway must move into the requested lane promptly');
    else assert(Math.abs(driven.heading-sample.startHeading)>.05,'circuit must turn on touch input');
    await left.dispatchEvent('pointercancel',{pointerId:42,pointerType:'touch',bubbles:true});
    await gas.dispatchEvent('pointercancel',{pointerId:41,pointerType:'touch',bubbles:true});
    assert.equal(await page.evaluate(()=>car3DRacingEngine.keys.left||car3DRacingEngine.keys.gas),false);
    const release=await page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;for(let i=0;i<45;i++)e.update(1/30);e.render?.();e._render?.();return{angle:p.state.steerAngleDeg,vx:e.state.vx,yaw:p.yawRate,speed:e.state.speed}});
    assert(Math.abs(release.angle)<.1);assert(Number.isFinite(release.vx));
    await page.screenshot({path:path.join(out,`mobile-${mode}-${width}.png`)});
    result.checks.push({mode,width,height,targets,driven,release});
   }
   const wall=await page.evaluate(()=>{
    const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.resetKeys();
    if(e.playerPhysics){
     // Use the actual barrier projection/caller, including positional correction.
     const track=e.track.projectPointToTrack(p.x,p.z),side=1;
     p.x=track.centerX+track.nx*(track.halfWidth+.1)*side;p.z=track.centerZ+track.nz*(track.halfWidth+.1)*side;
     p.state.vx=0;p.state.vz=0;p.state.vForward=0;p.state.vLateral=0;p.state.yawRate=0;
     e.update(1/30);const after=e.track.projectPointToTrack(p.x,p.z);
     return{mode:'nfs',remainingPenetration:after.wallPenetration,damage:p.state.damageTaken};
    }
    p.reset({speedKmh:90});e.state.speed=90;e.state.vx=0;e.state.x=8.21;
    const damage=e.state.damageTaken;e.roadCurve=0;e.targetRoadCurve=0;e.curveTimer=10;
    e.update(1/30);
    return{mode:'3d',x:e.state.x,damageAdded:e.state.damageTaken-damage,speed:e.state.speed};
   });
   if(mode==='3d'){assert(Math.abs(wall.x)<=8.20001);assert.equal(wall.damageAdded,0);assert(wall.speed>85);}
   else assert(wall.remainingPenetration<.001);
   result.checks.push({mode,liveBarrier:wall});
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
  }
  assert.deepEqual(result.errors,[]);result.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close();}
 console.log('PASS four tires, touch gas+steering, cancel/release, 30 FPS, 320/390/844, both race modes');
})().catch(e=>{console.error(e);process.exitCode=1});
