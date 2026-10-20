const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('work/mw-contact-mobile-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),results={checks:[],errors:[]};
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
  await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  const page=await ctx.newPage();page.on('pageerror',e=>results.errors.push(e.stack));await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(500);
  const pointer=async(id,n,type)=>{const el=page.locator('#btn-3d-touch-'+id),r=await el.boundingBox();return el.dispatchEvent(type,{pointerId:n,pointerType:'touch',isPrimary:n===1,bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2});};
  const step=async frames=>page.evaluate(frames=>{
   const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal,samples=[];
   for(let i=0;i<frames;i++){
    e.update(1/30);e.updateRoadChunks?.();e.updateChaseCamera?.(1/30);
    const r=p.state.roadContact,model=e.playerCar,center=model.position.clone().add(new THREE.Vector3(0,.7,0)).project(e.camera);
    samples.push({x:p.x,y:p.y,z:p.z,speed:p.speedKmh,vy:p.suspension.vy,pitch:p.state.pitch,roll:p.state.roll,steer:p.state.steerAngleDeg,
     groundHeight:e.roadSurface?e.roadSurface.sample(p.x,p.z).height:NomeraRoadSurface.highway(p.x,p.z).height,
     contact:r,tires:Object.values(p.mwTires).map(t=>({fx:t.fx,fy:t.fy,load:t.load})),keys:{...e.keys},screen:{x:(center.x+1)/2,y:(1-center.y)/2},cameraY:e.camera.position.y});
   }
   e.notifyHUD();e.render?.();e._render?.();return samples;
  },frames);
  for(const mode of ['3d','nfs','drift']){
   await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode==='drift'?'3d':mode);if(mode==='drift')setRaceMode('drift');selectRaceCar(myCars[2].name,2);NomeraAuthorsExpansion.goStep(3)},mode);
   await page.locator('#ae-physics-model').selectOption('mw');await page.evaluate(()=>startRaceGame());
   await page.waitForFunction(()=>{const e=car3DRacingEngine;return e.playerPhysics?e.playerWheels?.length===4&&e.playerWheels.every(w=>!w.procedural):e.authorsWheelRig?.imported&&e.authorsWheelRig.wheels.length===4&&!e.authorsWheelRig.pending},null,{timeout:45000});
   await page.evaluate(()=>{const e=car3DRacingEngine;e.stop();e.state.racePhase='racing';e.setWeather('day',true);if(e.playerPhysics)e.rivals=[];else e.trafficCars=[];});
   for(const[width,height]of [[320,740],[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal;e.resetKeys();
     const point=e.track?.sampleTrackAtS(65)||{x:0,z:270,heading:0};p.reset({speedKmh:220,...point});e.state.speed=220;e.state.damageTaken=0;e.state.nitroLevel=100;
     if(!e.playerPhysics){e.state.x=0;e.state.z=270;e.state.vx=0;e.state.yawAngle=0;e.roadCurve=0;e.targetRoadCurve=0;e.roadCurvature=0;e.targetCurvature=0;e.curveTimer=30;
      e.roadChunks.forEach((c,i)=>c.position.z=(Math.floor(270/e.chunkLength)-1+i)*e.chunkLength);e.highestChunkZ=Math.max(...e.roadChunks.map(c=>c.position.z));
     }
     e.updateRoadChunks?.();
     if(e.playerPhysics)e._sync3DMeshes(true);else{e.playerCar.position.set(0,p.y,270);e.updateChaseCamera(1);}
    });
    const boxes=await page.evaluate(()=>['left','right','gas','brake','drift','nitro'].map(id=>{const r=document.querySelector('#btn-3d-touch-'+id).getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));
    for(const b of boxes)assert(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1&&b.width>=40&&b.height>=40);
    await pointer('gas',1,'pointerdown');let samples=[],flightShot=false,landingShot=false,apexShot=false,renderMatch=null,landingFrame=-1;
    for(let i=0;i<135;i++){
     const row=(await step(1))[0];samples.push(row);
     if(row.contact.airborne&&!flightShot){
      renderMatch=await page.evaluate(()=>{const e=car3DRacingEngine,p=e.playerPhysics||e.mwLongitudinal,meshes=[];e.scene.updateMatrixWorld(true);e.scene.traverse(n=>{if(n.isMesh&&n.userData.mwRoadSurface)meshes.push(n)});
       const g=e.roadSurface?e.roadSurface.sample(p.x,p.z):NomeraRoadSurface.highway(p.x,p.z),ray=new THREE.Raycaster(new THREE.Vector3(e.playerPhysics?-p.x:p.x,100,p.z),new THREE.Vector3(0,-1,0)),hit=ray.intersectObjects(meshes,false)[0];
       return{groundHeight:g.height,renderHeight:hit?.point.y,error:hit?Math.abs(hit.point.y-g.height):Infinity};});
      await page.screenshot({path:path.join(out,`flight-${mode}-${width}.png`)});flightShot=true;
     }
     if(row.contact.airborne&&!apexShot&&row.y-row.groundHeight>.4){await page.screenshot({path:path.join(out,`flight-${mode}-${width}.png`)});apexShot=true;}
     if(row.contact.landings>0&&!landingShot){await page.screenshot({path:path.join(out,`landing-${mode}-${width}.png`)});landingShot=true;landingFrame=i;}
     if(landingShot&&i>=landingFrame+6)break;
    }
    results.lastScenario={mode,width,samples,renderMatch};
    assert(flightShot&&landingShot,'road crest must produce flight and landing');
    assert(renderMatch.error<1e-4,'rendered road matches the physical triangle surface');
    assert(samples.some(s=>s.vy>1)&&samples.some(s=>s.vy< -1));
    for(const s of samples){assert([s.x,s.y,s.z,s.vy,s.pitch,s.roll].every(Number.isFinite));assert(Math.abs(s.pitch)<.7&&Math.abs(s.roll)<.5);
     if(s.contact.airborne)assert(s.tires.every(t=>t.load===0&&t.fx===0&&t.fy===0),'no tire traction in flight');
     if(s.contact.airborne||s.contact.landed)assert(s.screen.x>.1&&s.screen.x<.9&&s.screen.y>.1&&s.screen.y<.9,'camera keeps the airborne/landing car in frame');
    }
    await pointer('left',2,'pointerdown');const turn=await step(6);await pointer('left',2,'pointercancel');await pointer('right',3,'pointerdown');const counter=await step(6);
    assert(Math.abs(turn.at(-1).steer)>(mode==='3d'?.25:5)&&turn.at(-1).steer*counter.at(-1).steer<0,'responsive physical steering after landing');
    if(mode==='3d')assert(turn.at(-1).x>samples.at(-1).x+.01,'highway lane guidance creates immediate lateral movement after landing');
    await pointer('right',3,'pointercancel');await pointer('gas',1,'pointercancel');await step(12);
    await pointer('gas',1,'pointerdown');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert(await page.evaluate(()=>Object.values(car3DRacingEngine.keys).every(v=>!v)));
    await page.screenshot({path:path.join(out,`settled-${mode}-${width}.png`)});
    results.checks.push({mode,width,height,boxes,samples,turn,counter,flightShot,landingShot,apexShot,renderMatch,blurCleared:true});
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log('PASS',mode,width,'flight/landing');
   }
   await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
  }
  assert.deepEqual(results.errors,[]);results.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS visible road crests, flight, no air tire forces, landing, camera and responsive touch controls at 320/390/844 on highway/circuit/drift');
})().catch(e=>{console.error(e);process.exitCode=1});
