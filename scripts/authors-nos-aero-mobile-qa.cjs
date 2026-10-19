const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('work/mw-nos-aero-mobile-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),results={checks:[],errors:[]};
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
  await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>results.errors.push(e.stack));
  await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(600);
  const pointer=async(id,n,type)=>{const el=page.locator('#btn-3d-touch-'+id),r=await el.boundingBox();return el.dispatchEvent(type,{pointerId:n,pointerType:'touch',isPrimary:n===1,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2});};
  const step=async frames=>page.evaluate(frames=>{
   const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal,samples=[];
   for(let i=0;i<frames;i++){
    e.update(1/30);e.updateChaseCamera?.(1/30);
    const center=e.playerCar.position.clone().add(new THREE.Vector3(0,.7,0)).project(e.camera);
    samples.push({beta:p.state.chassisSlipAngle,yaw:p.yawRate,steer:p.state.steerAngleDeg,speed:e.state.speed,y:p.state.y,
     level:p.state.nitroLevel,hostLevel:e.state.nitroLevel,active:p.state.isNitroActive,hostActive:e.state.isNitroActive,cooldown:p.state.nosCooldown,
     pressure:p.state.handbrakePressure,fuel:e.state.fuelLiters,screenX:(center.x+1)/2,keys:{...e.keys},aero:p.state.aerodynamics,wheels:{...p.state.wheelAngles}});
   }
   e.notifyHUD();e.render?.();e._render?.();return samples;
  },frames);
  for(const mode of ['3d','nfs']){
   await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode);NomeraAuthorsExpansion.goStep(3)},mode);
   await page.locator('#ae-physics-model').selectOption('mw');await page.evaluate(()=>startRaceGame());
   await page.waitForFunction(()=>{const e=car3DRacingEngine;return e.playerPhysics?e.playerWheels?.length===4:e.authorsWheelRig?.wheels.length===4&&!e.authorsWheelRig.pending},null,{timeout:30000});
   await page.evaluate(()=>{car3DRacingEngine.stop();car3DRacingEngine.state.racePhase='racing';car3DRacingEngine.setWeather('night',true)});
   for(const[width,height]of [[320,740],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    const reset=async()=>page.evaluate(()=>{
     const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.resetKeys();
     p.reset({speedKmh:100,...(e.track?.sampleTrackAtS(40)||{x:0,z:0,heading:0})});
     e.state.speed=100;e.state.nitroLevel=100;e.state.damageTaken=0;
     if(!e.playerPhysics){e.state.x=0;e.state.vx=0;e.state.yawAngle=0;e.roadCurve=0;e.targetRoadCurve=0;e.curveTimer=10;}
     return{drain:p.profile.nitroDrainRate};
    });
    const spec=await reset(),boxes=await page.evaluate(()=>['left','right','gas','brake','drift','nitro'].map(id=>{const r=document.querySelector('#btn-3d-touch-'+id).getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));
    for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1&&b.width>=40&&b.height>=40);
    await pointer('gas',1,'pointerdown');await pointer('nitro',2,'pointerdown');const nos=await step(30);
    assert(nos.every(s=>s.active&&s.hostActive&&Math.abs(s.level-s.hostLevel)<1e-8),'tank and HUD use one owner');
    assert(Math.abs(nos.at(-1).level-(100-spec.drain))<.001,'exactly one second drain');
    assert.equal(await page.locator('#hud-3d-touch-nitro-val').textContent(),Math.round(nos.at(-1).level)+'%','touch HUD reflects physical tank');
    assert.equal(await page.locator('#hud-3d-nitro-text').textContent(),Math.round(nos.at(-1).level)+'%','dashboard reflects physical tank');
    assert(nos.at(-1).aero.downforce>1000&&nos.at(-1).aero.dragForward<0);
    assert(nos.at(-1).wheels.rr!==nos[0].wheels.rr,'wheels rotate');
    await page.screenshot({path:path.join(out,`nos-${mode}-${width}.png`)});
    await pointer('nitro',2,'pointercancel');const cooldown=await step(30);
    assert(cooldown.every(s=>!s.active&&s.level===cooldown[0].level)&&cooldown.at(-1).cooldown>0,'immediate off, cooldown does not recharge');
    const recharge=await step(75);assert(recharge.at(-1).level>cooldown.at(-1).level,'speed recharge after cooldown');
    assert(recharge.at(-1).fuel>0);
    await reset();await pointer('gas',1,'pointerdown');await pointer('left',2,'pointerdown');
    const pulses=[];for(let i=0;i<7;i++){
     await pointer('drift',3,'pointerdown');pulses.push(...await step(3));
     await pointer('drift',3,'pointerup');pulses.push(...await step(3));
    }
    assert(pulses.every(s=>Number.isFinite(s.yaw)&&Math.abs(s.y)<.3&&s.speed<110));
    assert(Math.max(...pulses.map(s=>Math.abs(s.beta)))<1,'tap sequence avoids sideways spin');
    await pointer('left',2,'pointerup');await pointer('right',4,'pointerdown');const counter=await step(9);
    assert(counter.at(-1).steer*pulses[0].steer<0,'countersteer responds within 300ms');
    if(width<height)assert(counter.at(-1).screenX>.15&&counter.at(-1).screenX<.85,'portrait chase keeps car in frame');
    await page.screenshot({path:path.join(out,`pulse-${mode}-${width}.png`)});
    await pointer('right',4,'pointercancel');await pointer('gas',1,'pointercancel');const release=await step(60);
    assert(Math.abs(release.at(-1).steer)<.1);
    await pointer('nitro',5,'pointerdown');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert(await page.evaluate(()=>Object.values(car3DRacingEngine.keys).every(v=>!v)));
    results.checks.push({mode,width,height,boxes,spec,nos,cooldown,recharge,pulses,counter,release,blurCleared:true});
   }
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
  }
  assert.deepEqual(results.errors,[]);results.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS NOS tank/torque/cooldown/recharge, repeated 100ms handbrake pulls, countersteer, wheel rotation, touch cancel/blur, 320/390/844, highway/circuit');
})().catch(e=>{console.error(e);process.exitCode=1});
