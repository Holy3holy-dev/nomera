const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('work/mw-gearbox-mobile-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),results={checks:[],errors:[]};
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
  await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>results.errors.push(e.stack));
  await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(600);
  const pointer=async(id,n,type)=>{const el=page.locator('#btn-3d-touch-'+id),r=await el.boundingBox();return el.dispatchEvent(type,{pointerId:n,pointerType:'touch',isPrimary:n===1,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2});};
  const step=async(frames,follow=false)=>page.evaluate(({frames,follow})=>{
   const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal,samples=[];
   for(let i=0;i<frames;i++){
    if(follow&&e.playerTrackProj){const q=e.playerTrackProj,d=Math.atan2(q.tx,q.tz)-p.heading,a=Math.atan2(Math.sin(d),Math.cos(d));e.keys.left=a<-.04;e.keys.right=a>.04;}
    e.update(1/30);e.updateRoadChunks?.();e.updateChaseCamera?.(1/30);
    samples.push({gear:p.gear,hostGear:e.state.gear,rpm:p.rpm,hostRpm:e.state.rpm,speed:p.speedKmh,timer:p.state.shiftTimer,
     clutch:p.state.clutchRatio,clutchState:p.state.clutchState,potential:p.state.shiftPotential,steer:p.state.steerAngleDeg,
     nitro:p.state.nitroLevel,active:p.state.isNitroActive,fuel:e.state.fuelCurrent,keys:{...e.keys}});
   }
   e.notifyHUD();e.render?.();e._render?.();return samples;
  },{frames,follow});
  for(const mode of ['3d','nfs']){
   await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode);selectRaceCar(myCars[2].name,2);NomeraAuthorsExpansion.goStep(3)},mode);
   await page.locator('#ae-physics-model').selectOption('mw');await page.evaluate(()=>startRaceGame());
   await page.waitForFunction(()=>{const e=car3DRacingEngine;return e.playerPhysics?e.playerWheels?.length===4:e.authorsWheelRig?.wheels.length===4&&!e.authorsWheelRig.pending},null,{timeout:30000});
   await page.evaluate(()=>{const e=car3DRacingEngine;e.stop();e.state.racePhase='racing';e.setWeather('night',true);
    // Isolate drivetrain from random traffic; collision regressions run separately.
    if(e.playerPhysics)e.rivals=[];else e.trafficCars=[];
   });
   for(const[width,height]of [[320,740],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.resetKeys();
     p.reset({speedKmh:0,...(e.track?.sampleTrackAtS(40)||{x:0,z:0,heading:0})});e.state.speed=0;e.state.nitroLevel=100;e.state.damageTaken=0;
     if(!e.playerPhysics){e.state.x=0;e.state.vx=0;e.state.yawAngle=0;e.roadCurve=0;e.targetRoadCurve=0;e.roadCurvature=0;e.targetCurvature=0;e.curveTimer=30;}
    });
    const boxes=await page.evaluate(()=>['left','right','gas','brake','drift','nitro'].map(id=>{const r=document.querySelector('#btn-3d-touch-'+id).getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));
    for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1&&b.width>=40&&b.height>=40);
    await pointer('gas',1,'pointerdown');const launch=await step(150,true);
    await pointer('nitro',2,'pointerdown');const nitro=await step(45,true);
    assert(nitro.every(s=>s.active&&s.keys.gas&&s.keys.nitro));
    const acceleration=[...launch,...nitro],gears=[...new Set(acceleration.map(s=>s.gear))];
    assert(gears.length>=3&&Math.max(...gears)>=3,'several automatic upshifts during touch acceleration');
    assert(acceleration.every(s=>s.gear===s.hostGear&&Math.abs(s.rpm-s.hostRpm)<1e-6),'HUD host gear and RPM match physics');
    assert(acceleration.some(s=>s.timer>0&&s.clutch<.8)&&acceleration.some(s=>s.timer>0&&s.clutch===1),'clutch and shift timer independent');
    assert(nitro.at(-1).nitro<nitro[0].nitro&&nitro.at(-1).fuel>0);
    const hud=await page.locator('#hud-3d-touch-nitro-val').textContent();assert.equal(hud,Math.round(nitro.at(-1).nitro)+'%');
    await page.screenshot({path:path.join(out,`gearbox-${mode}-${width}.png`)});
    await pointer('nitro',2,'pointercancel');await pointer('gas',1,'pointercancel');const coast=await step(45,true);
    await pointer('brake',3,'pointerdown');const braking=await step(150,true);
    assert(braking.at(-1).speed<coast[0].speed&&braking.at(-1).gear<Math.max(...gears),'braking selects lower gear');
    await pointer('brake',3,'pointercancel');
    await page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.resetKeys();p.reset({speedKmh:100,...(e.track?.sampleTrackAtS(40)||{x:0,z:0,heading:0})});e.state.speed=100;e.state.vx=0;e.state.yawAngle=0;p.shiftUp()});
    await pointer('gas',1,'pointerdown');await pointer('right',4,'pointerdown');const steering=await step(6);
    assert(steering.some(s=>s.timer>0&&Math.abs(s.steer)>5),'steering responds during gear change');
    await pointer('right',4,'pointercancel');await pointer('gas',1,'pointercancel');await step(12);
    await pointer('gas',1,'pointerdown');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert(await page.evaluate(()=>Object.values(car3DRacingEngine.keys).every(v=>!v)));
    results.checks.push({mode,width,height,boxes,gears,launch,nitro,coast,braking,steering,blurCleared:true});
   }
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
   // A normal RAF run separately verifies that controlled stepping did not hide
   // an integration/render/audio lifecycle problem.
   await page.setViewportSize({width:390,height:844});
   await page.evaluate(()=>{NomeraAuthorsExpansion.goStep(3);startRaceGame();car3DRacingEngine.state.racePhase='racing'});
   await pointer('gas',1,'pointerdown');
   await page.waitForFunction(()=>{const p=car3DRacingEngine.playerPhysics||car3DRacingEngine.mwLongitudinal;return p.gear>=3},null,{timeout:20000});
   const live=await page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;return{mode:e.constructor.name,gear:p.gear,speed:p.speedKmh,steps:p.stepCount,running:e.isRunning,fuel:e.state.fuelCurrent}});
   assert(live.running&&live.steps>100&&live.fuel>0);results.checks.push({mode,live});
   await pointer('gas',1,'pointercancel');await page.screenshot({path:path.join(out,`live-${mode}-390.png`)});
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
  }
  assert.deepEqual(results.errors,[]);results.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS automatic shifts, clutch/timer, coasting/downshift, NOS across gears, steering during change, HUD, touch cancel/blur, 320/390/844, highway/circuit');
})().catch(e=>{console.error(e);process.exitCode=1});
