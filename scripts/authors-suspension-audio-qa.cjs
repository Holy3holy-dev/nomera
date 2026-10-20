const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright'),out=path.resolve(process.env.NOMERA_QA_DIR||'work/suspension-audio-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const errors=[],results={audio:[],race:[]};try{
 const page=await b.newPage({viewport:{width:390,height:844},hasTouch:true});if(process.env.NOMERA_AUDIO_FORCE_FALLBACK==='1')await page.addInitScript(()=>{window.AudioWorkletNode=undefined;});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());await page.goto('http://127.0.0.1:4317/authors.html');await page.waitForTimeout(500);
 for(const sampleRate of [44100,48000]){
  await page.evaluate(async sampleRate=>{window.mwQaCtx=new AudioContext({sampleRate});await mwQaCtx.resume();window.mwQaGain=mwQaCtx.createGain();window.mwQaAnalyser=mwQaCtx.createAnalyser();mwQaGain.connect(mwQaAnalyser);mwQaAnalyser.connect(mwQaCtx.destination);},sampleRate);
  for(const carClass of ['standard','sport','v8','supercar','m3gtr','kamaz']){
   await page.evaluate(carClass=>NomeraAuthorsSamples.update({context:mwQaCtx,master:mwQaGain,carClass,rpm:4000,speed:100,gas:true}),carClass);
   await page.waitForFunction(()=>NomeraAuthorsSamples.status().active&&NomeraAuthorsSamples.status().loaded.includes(NomeraAuthorsSamples.status().key));
   await page.waitForTimeout(250);
   const audio=await page.evaluate(()=>{const a=new Float32Array(mwQaAnalyser.fftSize);mwQaAnalyser.getFloatTimeDomainData(a);return{...NomeraAuthorsSamples.status(),sampleRate:mwQaCtx.sampleRate,rms:Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length),peak:Math.max(...a.map(Math.abs))}});
   assert(audio.rms>.0001);assert(audio.peak<1);assert.deepEqual(audio.failed,[]);results.audio.push({carClass,...audio});
   await page.evaluate(()=>NomeraAuthorsSamples.stop());
  }
  await page.evaluate(()=>NomeraAuthorsSamples.update({context:mwQaCtx,master:mwQaGain,carClass:'sport',rpm:4500,speed:130,gas:true,nitro:true,drifting:true}));await page.waitForTimeout(400);
  const layers=await page.evaluate(()=>NomeraAuthorsSamples.status().loops);assert(layers.includes('nitro')&&layers.includes('skid')&&layers.includes('turbo'));
  await page.evaluate(()=>NomeraAuthorsSamples.stop());await page.waitForTimeout(170);assert.deepEqual(await page.evaluate(()=>NomeraAuthorsSamples.status().loops),[]);await page.evaluate(()=>mwQaCtx.close());
 }
 for(const mode of ['3d','nfs']){
  await page.evaluate(mode=>{switchTab('racegame');switchRaceMode(mode);NomeraAuthorsExpansion.goStep(3);startRaceGame()},mode);
  await page.waitForFunction(()=>{const e=car3DRacingEngine;return e.playerPhysics?e.playerWheels?.length===4&&e.playerWheels.every(w=>!w.procedural):e.authorsWheelRig?.imported&&e.authorsWheelRig.wheels.length===4&&!e.authorsWheelRig.pending},null,{timeout:30000});
  const check=await page.evaluate(()=>{const e=car3DRacingEngine;e.stop();if(e.state.racePhase==='countdown')e.state.racePhase='racing';e.keys.gas=true;e.keys.left=true;const wheels=e.playerPhysics?e.playerWheels:e.authorsWheelRig.wheels,before=wheels.map(w=>w.spin.rotation.x);for(let i=0;i<20;i++)e.update(1/60);e.render();return{wheels:wheels.map((w,i)=>({key:w.key,spinDelta:w.spin.rotation.x-before[i],steer:w.steer.rotation.y})),pose:e.playerPhysics?{pitch:e.playerPhysics.state.pitch,roll:e.playerPhysics.state.roll}:e.mwLongitudinal.state.suspensionOffsets}});
  assert(check.wheels.every(w=>Math.abs(w.spinDelta)>.05));assert(check.wheels.filter(w=>w.key[0]==='f').every(w=>Math.abs(w.steer)>.02));results.race.push({mode,...check});
  await page.screenshot({path:path.join(out,mode+'-390.png')});await page.evaluate(()=>{exit3DRaceGame();closeGameOverToMenu()});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({success:true,errors,...results},null,2));console.log('PASS 12 real PCM/grain renders at44.1/48kHz, layered SFX, both live wheel rigs and suspension');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
