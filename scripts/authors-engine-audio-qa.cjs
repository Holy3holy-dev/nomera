const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('work/mw-engine-audio-qa');fs.mkdirSync(out,{recursive:true});
const capture=`class Capture extends AudioWorkletProcessor{constructor(){super();this.reset();this.port.onmessage=({data})=>{if(data.reset)this.reset();if(data.finish)this.port.postMessage({samples:this.samples,windows:this.windows},[this.samples.buffer]);};}reset(){this.samples=new Float32Array(sampleRate*4);this.index=0;this.windows=[];this.n=0;this.sum=0;this.peak=0;}process(ins,outs){const a=ins[0][0],o=outs[0][0];for(let i=0;i<o.length;i++){const value=a?.[i]||0;o[i]=value;if(this.index<this.samples.length)this.samples[this.index++]=value;this.sum+=value*value;this.peak=Math.max(this.peak,Math.abs(value));if(++this.n>=sampleRate*.05){this.windows.push({rms:Math.sqrt(this.sum/this.n),peak:this.peak});this.n=0;this.sum=0;this.peak=0;}}return true;}}registerProcessor('capture',Capture);`;
fs.writeFileSync(path.join(out,'capture.js'),capture);
function wav(samples,sr,file){const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));fs.writeFileSync(file,b);}
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']}),result={renders:[],errors:[]};
 try{
  const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});await c.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());const page=await c.newPage();page.on('pageerror',e=>result.errors.push(e.stack));await page.goto('http://127.0.0.1:4317/authors.html');
  const cars=['','Subaru Impreza WRX STI','Ford Mustang GT','Lamborghini Gallardo','BMW M3 E46 GTR','truck','BMW M5 E60 V10','Aston Martin DB9','Porsche Cayman S','Mazda RX-8','Mercedes-Benz SLR McLaren','Mercedes-Benz CLK 500','Dodge Viper SRT10','Chevrolet Corvette C6','Volkswagen Golf GTI','Toyota Supra MK4'];
  for(const sr of [44100,48000]){
   await page.evaluate(async sr=>{window.qaCtx=new AudioContext({sampleRate:sr});await qaCtx.resume();await qaCtx.audioWorklet.addModule('./work/mw-engine-audio-qa/capture.js');window.qaBus=qaCtx.createGain();window.qaCapture=new AudioWorkletNode(qaCtx,'capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});qaBus.connect(qaCapture);qaCapture.connect(qaCtx.destination);},sr);
   for(const name of cars){
    await page.evaluate(name=>NomeraAuthorsSamples.update({context:qaCtx,master:qaBus,carClass:name==='truck'?'truck':'standard',carName:name==='truck'?'':name,rpm:4200,speed:130,gas:true}),name);
    await page.waitForFunction(()=>{const s=NomeraAuthorsSamples.status();return s.renderThread&&s.active&&s.loaded.includes(s.key)},null,{timeout:15000});await page.waitForTimeout(200);
    await page.evaluate(()=>qaCapture.port.postMessage({reset:true}));await page.waitForTimeout(350);
    const row=await page.evaluate(()=>new Promise(resolve=>{qaCapture.port.onmessage=({data})=>resolve({...NomeraAuthorsSamples.status(),windows:data.windows});qaCapture.port.postMessage({finish:true});}));
    assert(row.renderThread&&!row.workerFailed);assert(row.windows.length>=4);assert(row.windows.every(w=>w.rms>.0001&&w.peak<.9),name+' engine output and headroom');assert.deepEqual(row.failed,[]);result.renders.push({name,sr,...row});await page.evaluate(()=>NomeraAuthorsSamples.stop());
   }
   await page.evaluate(()=>NomeraAuthorsSamples.update({context:qaCtx,master:qaBus,carName:'BMW M5 E60 V10',rpm:5000,speed:140,gas:true,nitro:true,drifting:true,gear:3}));await page.waitForFunction(()=>NomeraAuthorsSamples.status().active);await page.waitForTimeout(250);
   // Independent render-thread recorder continues during a deliberate page stall.
   await page.evaluate(()=>qaCapture.port.postMessage({reset:true}));await page.waitForTimeout(80);
   const stall=await page.evaluate(()=>{const t=performance.now();while(performance.now()-t<700){}return performance.now()-t;});await page.waitForTimeout(120);
   const recording=await page.evaluate(()=>new Promise(resolve=>{qaCapture.port.onmessage=({data})=>resolve({samples:Array.from(data.samples),windows:data.windows,status:NomeraAuthorsSamples.status()});qaCapture.port.postMessage({finish:true});}));
   assert(recording.windows.length>=14,'audio rendered throughout page stall');assert(recording.windows.slice(2,13).every(w=>w.rms>.0001&&w.peak<.9),'no engine dropout or clipping during stall');
   wav(recording.samples.slice(0,Math.floor(sr*.9)),sr,path.join(out,`m5-stall-${sr}.wav`));result.renders.push({sr,stallMs:stall,windows:recording.windows,status:recording.status,uninterruptedDuringStall:true});
   // The same actual runtime handles throttle release, shifts and overlapping FX.
   await page.evaluate(()=>{NomeraAuthorsSamples.update({context:qaCtx,master:qaBus,carName:'BMW M5 E60 V10',rpm:3000,speed:100,gas:false,gear:2});for(const name of ['collision','nearMiss','gear'])NomeraAuthorsSamples.effect({context:qaCtx,master:qaBus,name,strength:1});});await page.waitForTimeout(300);
   assert((await page.evaluate(()=>NomeraAuthorsSamples.status())).active);await page.evaluate(()=>{NomeraAuthorsSamples.stop();window.qaStoppedAt=qaCtx.currentTime;qaCapture.port.postMessage({reset:true})});await page.waitForFunction(()=>qaCtx.currentTime>qaStoppedAt+.4);
   const stopped=await page.evaluate(()=>new Promise(resolve=>{qaCapture.port.onmessage=({data})=>resolve(data.windows);qaCapture.port.postMessage({finish:true});}));result.stopped=stopped;result.stoppedStatus=await page.evaluate(()=>NomeraAuthorsSamples.status());assert(stopped.slice(-2).every(w=>w.peak<1e-5),'stopping engine leaves no residual sound');await page.evaluate(()=>qaCtx.close());
  }
  assert.deepEqual(result.errors,[]);result.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await b.close();}
 console.log('PASS 16 original engine families × 44.1/48kHz; main-thread stall, headroom, throttle/shift/FX and fade-out');
})().catch(e=>{console.error(e);process.exitCode=1});
