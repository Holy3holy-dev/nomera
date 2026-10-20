const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('work/mw-driveline-mobile-qa');fs.mkdirSync(out,{recursive:true});
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
    e.update(1/30);e.updateRoadChunks?.();e.updateChaseCamera?.(1/30);
    const rig=e.authorsWheelRig||{wheels:e.playerWheels};
    const wheels=rig.wheels.map(w=>{const k=e.playerPhysics?w.key:w.key[0]+(w.key[1]==='l'?'r':'l');
     return{key:w.key,angle:w.angle,expectedAngle:p.state.wheelAngles[k],steer:w.steer.rotation.y,
      expectedSteer:w.key[0]==='f'?(w.procedural?(w.steer.userData.baseRotY||0):0)+(e.playerPhysics?-1:1)*(k==='fl'?p.state.steerLeftRad:p.state.steerRightRad):null,
      y:w.steer.position.y,expectedY:w.baseY+p.state.suspensionOffsets[k],axis:w.axis?.toArray(),
      axisError:w.axis?new THREE.Vector3(1,0,0).applyQuaternion(w.spin.quaternion).distanceTo(w.axis):0};});
    samples.push({drive:p.state.driveline,speed:p.speedKmh,steer:p.state.steerAngleDeg,yaw:p.yawRate,beta:p.state.chassisSlipAngle,keys:{...e.keys},wheels});
   }
   e.notifyHUD();e.render?.();e._render?.();return samples;
  },frames);
  for(const mode of ['3d','nfs'])for(const[name,type,id]of [['ВАЗ-2109 «Девятка»','FWD','vaz2109'],['ВАЗ-2107 «Жигули»','RWD','vaz2107'],['Subaru Impreza WRX STI','AWD','wrx']]){
   await page.evaluate(({mode,name})=>{let index=myCars.findIndex(c=>c.name===name);if(index<0){myCars.push({...myCars[1],name,condition:100,upgrades:{engine:0,handling:0,economy:0,nitro:0},styling:{}});index=myCars.length-1;}
    switchTab('racegame');switchRaceMode(mode);selectRaceCar(name,index);NomeraAuthorsExpansion.goStep(3);
   },{mode,name});
   await page.locator('#ae-physics-model').selectOption('mw');await page.evaluate(()=>startRaceGame());
   await page.waitForFunction(()=>{const e=car3DRacingEngine;return e.playerPhysics?e.playerWheels?.length===4&&e.playerWheels.every(w=>!w.procedural):e.authorsWheelRig?.imported&&e.authorsWheelRig.wheels.length===4&&!e.authorsWheelRig.pending},null,{timeout:45000});
   await page.evaluate(()=>{const e=car3DRacingEngine;e.stop();e.state.racePhase='racing';e.setWeather('night',true);if(e.playerPhysics)e.rivals=[];else e.trafficCars=[];});
   for(const[width,height]of [[320,740],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    const reset=async()=>page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.resetKeys();p.reset({speedKmh:60,...(e.track?.sampleTrackAtS(40)||{x:0,z:0,heading:0})});e.state.speed=60;e.state.damageTaken=0;e.state.nitroLevel=100;
     if(!e.playerPhysics){e.state.x=0;e.state.vx=0;e.state.yawAngle=0;e.roadCurve=0;e.targetRoadCurve=0;e.roadCurvature=0;e.targetCurvature=0;e.curveTimer=30;}
    });await reset();
    const boxes=await page.evaluate(()=>['left','right','gas','brake','drift','nitro'].map(id=>{const r=document.querySelector('#btn-3d-touch-'+id).getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));
    for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1&&b.width>=40&&b.height>=40);
    await pointer('gas',1,'pointerdown');const straight=await step(15);
    await pointer('left',2,'pointerdown');const turn=await step(9);
    assert(Math.abs(turn.at(-1).steer)>10,'responsive touch steering');
    await pointer('drift',3,'pointerdown');const pull=await step(9);
    assert(pull.at(-1).keys.gas&&pull.at(-1).keys.drift&&pull.at(-1).keys.left,'three touch pointers');
    await pointer('drift',3,'pointercancel');await pointer('left',2,'pointerup');await pointer('right',4,'pointerdown');const counter=await step(9);
    assert(turn.at(-1).steer*counter.at(-1).steer<0,'prompt countersteering');assert(!counter.at(-1).keys.drift);
    const samples=[...straight,...turn,...pull,...counter];
    results.lastScenario={mode,name,width,samples};
    for(const s of samples){assert.equal(s.drive.type,type);assert(Number.isFinite(s.yaw)&&Math.abs(s.yaw)<4);assert(Math.abs(s.drive.frontShare+s.drive.rearShare-1)<1e-6);
     if(type==='FWD')assert(s.drive.torques[2]===0&&s.drive.torques[3]===0);if(type==='RWD')assert(s.drive.torques[0]===0&&s.drive.torques[1]===0);
     for(const w of s.wheels){assert(Math.abs(w.angle-w.expectedAngle)<1e-7,'individual wheel spin');if(w.expectedSteer!==null)assert(Math.abs(w.steer-w.expectedSteer)<1e-7,`individual Ackermann angle ${w.key}: ${w.steer} vs ${w.expectedSteer}`);assert(Math.abs(w.y-w.expectedY)<1e-7,'same-side suspension');assert(w.axisError<1e-7,'stable imported axle');}
    }
    assert(straight.at(-1).wheels.every(w=>Math.abs(w.angle-straight[0].wheels.find(a=>a.key===w.key).angle)>.01),'non-driven wheels also roll');
    await page.screenshot({path:path.join(out,`${id}-${mode}-${width}.png`)});
    await pointer('right',4,'pointercancel');await pointer('gas',1,'pointercancel');const released=await step(30);assert(Math.abs(released.at(-1).steer)<.1);
    await pointer('left',2,'pointerdown');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert(await page.evaluate(()=>Object.values(car3DRacingEngine.keys).every(v=>!v)));
    results.checks.push({mode,name,type,width,height,boxes,straight,turn,pull,counter,released,blurCleared:true});
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log('PASS',mode,type,width);
   }
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
  }
  assert.deepEqual(results.errors,[]);results.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS FWD/RWD/AWD, individual spin/steer/travel, touch handbrake/counter/cancel/blur, 18 mobile highway/circuit scenarios');
})().catch(e=>{console.error(e);process.exitCode=1});
