'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const out=path.resolve('work/race-circuit-polish');fs.mkdirSync(out,{recursive:true});
const result={errors:[],localFailures:[],runs:[]},viewports=[[320,740],[390,844],[844,390]];
const clear=(a,b)=>a.right<=b.x||a.x>=b.right||a.bottom<=b.y||a.y>=b.bottom;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
  await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
  const p=await context.newPage();p.on('pageerror',e=>result.errors.push(e.stack));
  p.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:4317/')&&r.status()>=400)result.localFailures.push([r.status(),r.url()]);});
  p.on('console',m=>{if(/shader error|VALIDATE_STATUS|GL_INVALID/i.test(m.text()))result.errors.push(m.text());});
  await p.goto('http://127.0.0.1:4317/authors.html');
  for(const[mode,track,car]of[['nfs','rockport_ring','Mercedes-Benz G63 AMG «Гелик»'],['nfs','canyon_pass','Toyota Camry 3.5'],['nfs','bayview_sprint','Toyota Camry 3.5'],['3d','rockport_ring','Toyota Camry 3.5']]){
   if(process.argv.includes('--only=3d')&&mode!=='3d')continue;
   await p.setViewportSize({width:390,height:844});
   await p.evaluate(({mode,track,car})=>{let i=myCars.findIndex(c=>c.name===car);if(i<0){i=myCars.length;myCars.push({...myCars[1],name:car,condition:100,upgrades:{},styling:{}});}myCars[i].condition=100;switchTab('racegame');switchRaceMode(mode);selectRaceCar(car,i);nfsSelectedTrack=track;raceSelectedWeather='day';NomeraAuthorsExpansion.goStep(3);},{mode,track,car});
   await p.locator('#ae-physics-model').selectOption('mw');await p.locator('#btn-start-race').click();
   await p.waitForFunction(()=>{const e=car3DRacingEngine;return e.authorsRoute&&e.authorsWorld?.ready&&(e.playerPhysics?e.playerWheels?.length===4&&e.playerWheels.every(w=>!w.procedural):e.authorsWheelRig?.imported&&!e.authorsWheelRig.pending&&e.authorsWheelRig.wheels.length===4);},null,{timeout:60000});
   await p.evaluate(()=>{const e=car3DRacingEngine;e.stop();e.resetKeys();e.setWeather('day',true);e.setCameraMode?.('chase');e.cameraMode='chase';});
   const run={mode,track,car,views:[]};
   if(mode==='nfs'){
    run.start=await p.evaluate(()=>{const e=car3DRacingEngine;e.state.racePhase='countdown';e.state.countdownTimer=2.4;e.state.raceTimeSec=0;e.authorsRun.lastUI=-1;const pos=JSON.stringify([e.playerPhysics.x,e.playerPhysics.z]),stages=[];
     for(const timer of[2.4,1.5,.7]){e.state.countdownTimer=timer;NomeraRaceExperience.update(e);stages.push(+e.authorsRun.signal.dataset.stage);}e.state.countdownTimer=.01;e.update(.02);stages.push(+e.authorsRun.signal.dataset.stage);const unchanged=pos===JSON.stringify([e.playerPhysics.x,e.playerPhysics.z]);e.state.raceTimeSec=1.3;NomeraRaceExperience.update(e);return{stages,unchanged,hidden:e.authorsRun.signal.hidden,count:document.querySelectorAll('.ae-start-signal').length};});
    assert.deepEqual(run.start.stages,[1,2,3,4]);assert(run.start.unchanged&&run.start.hidden&&run.start.count===1);
   }
   for(const[width,height]of viewports){
    await p.setViewportSize({width,height});await p.waitForTimeout(100);
    const boxes=await p.evaluate(()=>['left','right','gas','brake','drift','nitro'].map(id=>({id,...document.getElementById('btn-3d-touch-'+id).getBoundingClientRect().toJSON()})));
    assert(boxes.every(b=>b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1&&b.width>=40&&b.height>=40));
    const client=await context.newCDPSession(p);for(const id of['left','right']){const b=boxes.find(b=>b.id===id);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});assert(await p.evaluate(id=>car3DRacingEngine.keys[id],id));await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(!await p.evaluate(id=>car3DRacingEngine.keys[id],id));}await client.detach();
    const motion=await p.evaluate(()=>{const e=car3DRacingEngine,phys=e.playerPhysics||e.mwLongitudinal;e.state.racePhase='racing';e.state.raceTimeSec=5;
     if(e.track){const q=e.track.sampleTrackAtS(40);phys.reset({...q,speedKmh:60});e.playerProgress.lastS=q.s;e.rivals.forEach((r,i)=>{r.physics.reset({...e.track.sampleTrackAtS(300+i*30),speedKmh:60});});}else{phys.state.speedKmh=60;e.trafficCars?.forEach((c,i)=>c.position.z=e.state.z+300+i*20);}
     const start=phys.heading;e.keys.gas=true;e.keys.left=true;for(let i=0;i<12;i++)e.update(1/60);const left=phys.heading;e.keys.left=false;e.keys.right=true;for(let i=0;i<24;i++)e.update(1/60);const right=phys.heading;e.resetKeys();return{start,left,right,finite:[phys.x,phys.z,phys.heading].every(Number.isFinite),wheels:(e.playerPhysics?e.playerWheels:e.authorsWheelRig?.wheels||[]).length};});
    assert(motion.finite&&motion.wheels===4,JSON.stringify({mode,track,width,motion}));assert(Math.abs(motion.left-motion.start)>1e-5);assert(Math.abs(motion.right-motion.left)>1e-5);
    if(mode==='nfs'){
     await p.evaluate(()=>{const e=car3DRacingEngine,q=e.track.sampleTrackAtS(e.track.totalLength-25);e.playerPhysics.reset({...q,speedKmh:0});e.playerProgress.lastS=q.s;Object.assign(e.state,{racePhase:'countdown',countdownTimer:.7,raceTimeSec:0,lapTimeSec:0,x:q.x,z:q.z,speed:0,speedKmh:0});e.authorsRun.lastUI=-1;NomeraRaceExperience.update(e);e._sync3DMeshes(true);e.render();});
     const signal=await p.locator('.ae-start-signal').boundingBox();assert(signal.x>=0&&signal.x+signal.width<=width+1&&signal.y+signal.height<height-100);
     assert(boxes.every(b=>clear({...signal,right:signal.x+signal.width,bottom:signal.y+signal.height},b)));
     await p.screenshot({path:path.join(out,track+'-grid-'+width+'.png')});
    }
    const check=await p.evaluate(()=>{const e=car3DRacingEngine,phys=e.playerPhysics||e.mwLongitudinal;e.state.racePhase='racing';e.state.raceTimeSec=8;e.authorsRun.lastUI=-1;
     if(e.track){const plans=NomeraRouteDressing.brakingPlan(e.track),s=plans[0]?.s??160,q=e.track.sampleTrackAtS(s);phys.reset({...q,speedKmh:100});e.playerProgress.lastS=q.s;Object.assign(e.state,{x:q.x,z:q.z,speed:100});e._sync3DMeshes(true);}else e.updateChaseCamera(1);
     const before=JSON.stringify({state:phys.state,keys:e.keys,cash:e.state.earnedCash,balance});for(let i=0;i<8;i++){e.state.raceTimeSec+=.3;NomeraScene.update(e);}e.render();e.notifyHUD();const after=JSON.stringify({state:phys.state,keys:e.keys,cash:e.state.earnedCash,balance}),hud=e.authorsRun.hud;
     const bounds=n=>n&&!n.hidden?n.getBoundingClientRect().toJSON():null;
     return{route:e.routeDressingTelemetry,physicsUnchanged:before===after,hud:bounds(hud),text:hud.innerText,triangles:e.renderer.info.render.triangles,calls:e.renderer.info.render.calls,signalHidden:e.authorsRun.signal?.hidden??true,others:['.race-3d-speedo-box','#nfs-circuit-telemetry-bar','.nfs-minimap-canvas'].map(s=>bounds(document.querySelector(s))).filter(Boolean),banner:!!e.scene.getObjectByName('CircuitFinishBanner'),paint:!!e.scene.getObjectByName('CircuitFinishPaint')};});
    assert(check.physicsUnchanged&&check.signalHidden);assert(check.route.pool<40);if(mode==='nfs'){assert(check.banner&&check.paint);assert.equal(check.route.brakingBoards,track==='bayview_sprint'?0:track==='rockport_ring'?9:12);assert(check.route.finishPaintTriangles>0);}if(check.hud){assert(check.hud.x>=0&&check.hud.right<=width+1&&check.hud.bottom<height-100);if(width===844)assert(check.others.every(b=>clear(check.hud,b)),'landscape HUD overlaps telemetry');}
    await p.screenshot({path:path.join(out,mode+'-'+track+'-'+width+'.png')});run.views.push({width,height,motion,...check});
   }
   if(mode==='nfs'){
    run.context=await p.evaluate(()=>{const e=car3DRacingEngine;let straight=null,turn=null;for(let s=0;s<e.track.totalLength;s+=10){const c=NomeraRaceExperience.corner(e.track,s,100);if(!c&&straight===null)straight=s;if(c&&turn===null)turn=s;}const sample=s=>{e.playerProgress.lastS=s;e.state.raceTimeSec+=1;e.authorsRun.lastUI=-1;NomeraRaceExperience.update(e);return{hidden:e.authorsRun.hud.hidden,text:e.authorsRun.hud.innerText};},a=straight===null?null:sample(straight),b=sample(turn);e.state.raceTimeSec=20;e.playerProgress.checkpointsPassed=1;NomeraRaceExperience.checkpoint(e,e.playerProgress);NomeraRaceExperience.checkpoint(e,e.playerProgress);e.state.raceTimeSec=35;e.playerProgress.checkpointsPassed=2;NomeraRaceExperience.checkpoint(e,e.playerProgress);return{straight:a,turn:b,times:e.authorsRun.timing.times};});
    if(run.context.straight)assert(run.context.straight.hidden);assert(!run.context.turn.hidden&&run.context.turn.text.includes('Ориентир'));assert.deepEqual(run.context.times,[20,15]);
    run.markers=await p.evaluate(()=>{const e=car3DRacingEngine,s=e.authorsRoute,paint=e.scene.getObjectByName('CircuitFinishPaint'),pos=paint.geometry.attributes.position;let maxError=0;for(let i=0;i<pos.count;i++){const x=e.toThreeX(pos.getX(i)),z=e.toThreeZ(pos.getZ(i)),h=e.roadSurface.sample(x,z).height;maxError=Math.max(maxError,Math.abs(pos.getY(i)-h-.025));}return{maxError,boards:NomeraRouteDressing.brakingPlan(e.track).length,batches:e.scene.getObjectByName('RockportWayfinding').children.filter(n=>n.isInstancedMesh&&n.name.startsWith('CircuitBrake')).length,resources:s.resources.length};});assert(run.markers.maxError<.0002);assert(run.markers.batches<=4);
    if(track==='rockport_ring'){
     run.rebuild=await p.evaluate(()=>{const e=car3DRacingEngine,rows=[];for(let i=0;i<3;i++){const old=e.authorsRoute;let instanceDisposals=0,resourceDisposals=0;for(const resource of old.resources)resource.addEventListener('dispose',()=>resourceDisposals++);e.scene.traverse(n=>{if(n.name.startsWith('CircuitBrake')&&n.isInstancedMesh)n.addEventListener('dispose',()=>instanceDisposals++);});NomeraScenePerf.destroy(e);NomeraRouteDressing.destroy(e);NomeraRouteDressing.update(e);NomeraScenePerf.afterScene(e);e.render();rows.push({instanceDisposals,resourceDisposals,expected:old.resources.length,memory:{...e.renderer.info.memory},boards:e.routeDressingTelemetry.brakingBoards,banners:e.scene.getObjectByName('CircuitFinishBanner')?.parent.children.filter(n=>n.name==='CircuitFinishBanner').length});}return rows;});
     assert(run.rebuild.every(r=>r.instanceDisposals===4&&r.resourceDisposals===r.expected&&r.banners===1&&r.boards===9));assert(run.rebuild.at(-1).memory.geometries<=run.rebuild[0].memory.geometries+2);
    }
   }else{
    run.reuse=await p.evaluate(()=>{const e=car3DRacingEngine,rows=[];for(let i=0;i<100;i++){e.state.z+=35;e.updateRoadChunks();NomeraScene.update(e);e.render();if(i%20===0)rows.push({memory:{...e.renderer.info.memory},route:e.routeDressingTelemetry});}return rows;});assert(run.reuse.at(-1).memory.geometries<=run.reuse[1].memory.geometries+6);assert.equal(run.reuse.at(-1).route.pool,run.reuse[1].route.pool);
   }
   await p.evaluate(()=>exit3DRaceGame());await p.locator('#race-gameover-modal.show').waitFor();assert(await p.locator('#ae-run-analysis').isVisible());assert.equal(await p.locator('.ae-route-coach,.ae-start-signal').count(),0);if(mode==='nfs')assert.equal(await p.locator('#ae-run-analysis li').count(),2);
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);await p.screenshot({path:path.join(out,mode+'-'+track+'-result.png')});await p.locator('#race-gameover-modal .btn-blue').click();result.runs.push(run);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));console.log('PASS',mode,track,'three touch viewports, visuals, controls, sectors and cleanup');
  }
  await context.close();assert.deepEqual(result.errors,[]);assert.deepEqual(result.localFailures,[]);result.success=true;
 }finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
