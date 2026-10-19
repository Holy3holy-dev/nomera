const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('work/mw-drift-mobile-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const results={checks:[],errors:[]};
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
  await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>results.errors.push(e.stack));
  await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(600);
  const pointer=async(id,n,type)=>{const el=page.locator('#btn-3d-touch-'+id),r=await el.boundingBox();return el.dispatchEvent(type,{pointerId:n,pointerType:'touch',isPrimary:n===1,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2});};
  const step=async frames=>page.evaluate(frames=>{
   const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal,samples=[],started=performance.now();
   for(let i=0;i<frames;i++){e.update(1/30);e.updateChaseCamera?.(1/30);samples.push({beta:p.state.chassisSlipAngle,yaw:p.yawRate,angle:p.state.steerAngleDeg,
    value:p.state.driftValue,drifting:p.state.isDrifting,rear:p.state.driftControl.rearFriction,counter:p.state.isCounterSteering,score:e.state.driftScore,
    speed:e.state.speed,heading:p.heading,keys:{...e.keys},wheels:{...p.state.wheelAngles}});}
   e.render?.();e._render?.();const center=e.playerCar?e.playerCar.position.clone().add(new THREE.Vector3(0,.7,0)).project(e.camera):null;
   return{samples,ms:performance.now()-started,visual:e.playerCar?{visible:e.playerCar.visible,position:e.playerCar.position.toArray(),camera:e.camera.position.toArray(),bodyY:p.state.y,cameraMode:e.cameraMode,screenX:(center.x+1)/2}:null};
  },frames);
  for(const mode of ['3d','nfs','drift']){
   await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode==='drift'?'3d':mode);if(mode==='drift')setRaceMode('drift');NomeraAuthorsExpansion.goStep(3)},mode);
   await page.locator('#ae-physics-model').selectOption('mw');await page.evaluate(()=>startRaceGame());
   await page.waitForFunction(()=>{const e=car3DRacingEngine;return e.playerPhysics?e.playerWheels?.length===4:e.authorsWheelRig?.wheels.length===4&&!e.authorsWheelRig.pending},null,{timeout:30000});
   await page.evaluate(()=>{car3DRacingEngine.stop();car3DRacingEngine.state.racePhase='racing'});
   for(const[width,height]of [[320,740],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{
     const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.resetKeys();
     const point=e.track?.sampleTrackAtS(40)||{x:0,z:0,heading:0};
     p.reset({speedKmh:90,...point});e.state.speed=90;e.state.vx=0;e.state.damageTaken=0;
     if(!e.playerPhysics){e.state.x=0;e.state.yawAngle=0;e.roadCurve=0;e.targetRoadCurve=0;e.curveTimer=10;}
    });
    const boxes=await page.evaluate(()=>['left','right','gas','brake','drift','nitro'].map(id=>{const r=document.querySelector('#btn-3d-touch-'+id).getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));
    for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1&&b.width>=40&&b.height>=40);
    await pointer('gas',1,'pointerdown');await pointer('left',2,'pointerdown');const turn=await step(9);
    assert(Math.abs(turn.samples.at(-1).angle)>10);
    await pointer('drift',3,'pointerdown');const entry=await step(12);
    assert(entry.samples.at(-1).keys.drift&&entry.samples.at(-1).keys.left&&entry.samples.at(-1).keys.gas);
    await pointer('drift',3,'pointercancel');await pointer('left',2,'pointerup');await pointer('right',4,'pointerdown');
    const counter=await step(9);assert(!counter.samples.at(-1).keys.drift);
    results.lastSample={mode,width,turn,entry,counter};
    if(mode!=='nfs'&&width<height)assert(counter.visual.screenX>.2&&counter.visual.screenX<.8,'portrait chase camera keeps drifting car in frame');
    assert(counter.samples.at(-1).angle*turn.samples.at(-1).angle<0,'countersteer must respond');
    const all=[...turn.samples,...entry.samples,...counter.samples];
    assert(all.some(s=>s.value>.18&&s.drifting),'touch handbrake must initiate a real physical drift');
    assert(all.every(s=>Number.isFinite(s.yaw)&&Number.isFinite(s.speed)&&s.rear>=.339&&s.rear<=1.101));
    results.lastSample={mode,width,all};
    await page.screenshot({path:path.join(out,`drift-${mode}-${width}.png`)});
    await pointer('right',4,'pointercancel');await pointer('gas',1,'pointercancel');
    const release=await step(45);assert(!release.samples.at(-1).keys.right&&!release.samples.at(-1).keys.gas);
    assert(Math.abs(release.samples.at(-1).angle)<.1);
    await pointer('left',2,'pointerdown');await step(2);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    const cleared=await page.evaluate(()=>{const e=car3DRacingEngine;return Object.values(e.keys).every(v=>!v)});assert(cleared,'blur clears every pedal/steering key');
    results.checks.push({mode,width,height,boxes,turn,entry,counter,release,blurCleared:true});
   }
   const tc=await page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;p.reset({speedKmh:36});p.state.gear=2;
    for(const t of Object.values(p.mwTires)){t.slip=100;t.lateralSpeed=50;}
    p.step(1/120,{gas:true,steer:1});return{...p.state.tractionControl,angle:p.state.steerAngleDeg};});
   assert(tc.active&&tc.angle>0);results.checks.push({mode,injectedExcessSlipTC:tc});
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
  }
  assert.deepEqual(results.errors,[]);results.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS touch drift/countersteer/release/blur, four-wheel TC, 30 FPS, 320/390/844, highway/circuit/drift');
})().catch(e=>{console.error(e);process.exitCode=1});
