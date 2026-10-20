/* Original local MW Xbox360 banks. RPM/grain playback is a NOMERA adapter.
 * Exact archive offsets/hashes: assets/audio/mw/provenance.json. */
(()=>{'use strict';if(!window.NOMERA_AUTHORS_PREVIEW)return;
const BASE='./assets/audio/mw/',cache=new Map(),loading=new Map(),failed=new Set(),loadedKeys=new Set(),grains=new Set(),shots=new Set(),loops=new Map(),lastEffects=new Map(),seamless=new Map(),workletLoads=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),HANN=Float32Array.from({length:65},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/64));
let manifest=null,manifestPromise=null,context=null,master=null,params=null,engineGain=null,timer=null,nextTime=0,sequence=0,lastGear=null,skidUntil=0,generation=0,grainCount=0,worker=null,workerStatus=null,workerFamily=null,workerFailed=false,voiceProfile=null;
function profileFor(carClass,carName=''){let id=carName?window.NomeraNfsPhysics?.resolveVehicleProfile(carName)?.id:'';if(id==='vaz2107'&&!/ваз|2107/i.test(carName))id='';return window.NomeraEngineVoices.profile(carClass,carName,id);}
function keyFor(carClass,carName=''){return profileFor(carClass,carName).key;}
function getManifest(){if(!manifestPromise)manifestPromise=fetch(BASE+'manifest.json').then(r=>{if(!r.ok)throw Error('MW manifest');return r.json()}).then(m=>manifest=m).catch(()=>{failed.add('manifest');return null});return manifestPromise;}
function load(item){if(!item||cache.has(item.file)||loading.has(item.file)||failed.has(item.file))return;
loading.set(item.file,fetch(BASE+item.file).then(r=>{if(!r.ok)throw Error(item.file);return r.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>cache.set(item.file,buffer)).catch(()=>failed.add(item.file)).finally(()=>loading.delete(item.file)));}
function family(key){return manifest?.families[key==='whine'?'m3gtr':key];}
function warm(){if(!manifest||!context)return;const f=family(params?.key||'standard');if(f){load(f.accel);load(f.decel);if(cache.has(f.accel.file)&&cache.has(f.decel.file))loadedKeys.add(params?.key||'standard');}for(const item of Object.values(manifest.effects))for(const entry of Array.isArray(item)?item:[item])load(entry);}
function smoothLoop(item,buffer){
 if(seamless.has(item.file))return seamless.get(item.file);const start=Math.round((item.loop?.start||0)/item.sampleRate*buffer.sampleRate),end=Math.min(buffer.length,Math.round((item.loop?.end||item.samples)/item.sampleRate*buffer.sampleRate)),length=end-start;
 const fade=Math.min(Math.round(buffer.sampleRate*.025),Math.floor(length/8)),period=length-fade,result=context.createBuffer(buffer.numberOfChannels,period,buffer.sampleRate);
 for(let ch=0;ch<buffer.numberOfChannels;ch++){const src=buffer.getChannelData(ch),dst=result.getChannelData(ch);for(let i=0;i<period;i++){const t=i/fade;dst[i]=i<fade?src[start+period+i]*(1-t)+src[start+i]*t:src[start+i];}}
 seamless.set(item.file,result);return result;
}
function ensureWorker(){
 if(worker||workerFailed||!context.audioWorklet||!window.AudioWorkletNode)return;
 const ctx=context,stamp=generation;
 if(!workletLoads.has(ctx))workletLoads.set(ctx,ctx.audioWorklet.addModule('./js/authors-engine-worklet.js'));
 workletLoads.get(ctx).then(()=>{if(stamp!==generation||!params||worker||ctx!==context)return;
  worker=new AudioWorkletNode(ctx,'nomera-gin',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});worker.port.onmessage=({data})=>workerStatus=data;worker.connect(engineGain);workerFamily=null;for(const v of grains){try{v.source.stop(ctx.currentTime+.1)}catch(_){}}engineGain.gain.setTargetAtTime(1,ctx.currentTime,.05);sendWorker();
 }).catch(()=>workerFailed=true);
}
function sendWorker(){if(!worker||!params)return;const f=family(params.key);if(!f||!cache.has(f.accel.file)||!cache.has(f.decel.file))return;
 if(workerFamily!==params.key){const bank=item=>{const b=cache.get(item.file);return{gin:item.gin,sampleRate:item.sampleRate,bufferRate:b.sampleRate,rms:item.rms,pcm:b.getChannelData(0).slice()}};const banks={accel:bank(f.accel),decel:bank(f.decel)};worker.port.postMessage({banks},[banks.accel.pcm.buffer,banks.decel.pcm.buffer]);workerFamily=params.key;}
 worker.port.postMessage({params:{rpm:params.rpm,gas:params.gas,gain:params.gas?.52:.3,pitch:voiceProfile?.pitch||1}});
}
function fadeVoice(voice,now){const p=voice.gain.gain;if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(now);else p.cancelScheduledValues(now);p.setTargetAtTime(0,now,.015);try{voice.source.stop(now+.09)}catch(_){}}
function dispose(source,gain){try{source.disconnect();gain.disconnect()}catch(_){}}
function stopLoop(key){const voice=loops.get(key);if(!voice)return;loops.delete(key);const now=context.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.025);try{voice.source.stop(now+.12)}catch(_){}}
function loop(key,item,volume,rate=1){if(!item)return;load(item);if(volume<.001){stopLoop(key);return;}const buffer=cache.get(item.file);if(!buffer)return;let voice=loops.get(key);
if(!voice){const source=context.createBufferSource(),gain=context.createGain();source.buffer=smoothLoop(item,buffer);source.loop=true;source.connect(gain);gain.connect(master);gain.gain.value=0;voice={source,gain};source.onended=()=>dispose(source,gain);source.start();loops.set(key,voice);}
voice.gain.gain.setTargetAtTime(volume,context.currentTime,.065);voice.source.playbackRate.setTargetAtTime(rate,context.currentTime,.08);}
function rpmAt(item,sample){const map=item.gin.rpmSamplePositions,up=map[map.length-1]>=map[0];let i=0;while(i<map.length-2&&(up?sample>map[i+1]:sample<map[i+1]))i++;const ratio=clamp((sample-map[i])/(map[i+1]-map[i]||1),0,1);return item.gin.rpmMin+(item.gin.rpmMax-item.gin.rpmMin)*(i+ratio)/(map.length-1);}
function positionAt(item,rpm){const g=item.gin,map=g.rpmSamplePositions,p=clamp((rpm-g.rpmMin)/(g.rpmMax-g.rpmMin),0,1)*(map.length-1),i=Math.floor(p);return map[i]+(map[Math.min(i+1,map.length-1)]-map[i])*(p-i);}
function grain(item,rpm,time,weight){rpm*=voiceProfile?.pitch||1;const buffer=cache.get(item.file);if(!buffer||weight<.005)return;
const sr=item.sampleRate,window=.12,initialRpm=clamp(rpm,item.gin.rpmMin,item.gin.rpmMax),initialRate=clamp(rpm/initialRpm,.3,2.5),target=positionAt(item,initialRpm)-window*.5*initialRate*sr,positions=item.gin.grainSamplePositions;
let lo=0,hi=positions.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(positions[mid]<target)lo=mid+1;else hi=mid;}
let start=clamp(positions[Math.max(0,lo-1)],0,Math.max(0,item.samples-window*initialRate*sr)),ref=rpmAt(item,start+window*.5*initialRate*sr),rate=clamp(rpm/ref,.3,2.5);
start=Math.min(start,Math.max(0,item.samples-window*rate*sr-2));
const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=rate;
const normalization=clamp(.28/Math.max(.05,item.rms||.28),.35,1),curve=Float32Array.from(HANN,v=>v*weight*normalization);gain.gain.setValueCurveAtTime(curve,time,window);
source.connect(gain);gain.connect(engineGain);const voice={source,gain,ref};grains.add(voice);grainCount++;
source.onended=()=>{grains.delete(voice);dispose(source,gain)};source.start(time,start/sr);source.stop(time+window);}
function schedule(){if(!params||!context||context.state!=='running'||document.hidden)return;warm();ensureWorker();if(worker){sendWorker();return;}if(context.audioWorklet&&window.AudioWorkletNode&&!workerFailed)return;const f=family(params.key);if(!f)return;const now=context.currentTime;if(nextTime<now)nextTime=now+.012;
while(nextTime<now+.25){const idle=params.rpm<f.decel.gin.rpmMin*.65,accelWeight=idle?1:(params.gas?1:0);grain(f.accel,params.rpm,nextTime,accelWeight);grain(f.decel,params.rpm,nextTime,1-accelWeight);nextTime+=.06;sequence++;}}
function oneShot(item,volume=.28,duration=Infinity){if(!item)return;load(item);const buffer=cache.get(item.file);if(!buffer)return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;const level=volume*clamp(.3/Math.max(.05,item.rms||.3),.35,1),now=context.currentTime,end=now+Math.min(duration,buffer.duration);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+Math.min(.008,buffer.duration/4));gain.gain.setValueAtTime(level,Math.max(now+.008,end-.02));gain.gain.linearRampToValueAtTime(0,end);source.connect(gain);gain.connect(master);const voice={source,gain};shots.add(voice);source.onended=()=>{shots.delete(voice);dispose(source,gain)};source.start();source.stop(end);}
function effect({context:ctx,master:bus,name,strength=1}={}){if(!ctx||!bus||ctx.state!=='running')return true;context=ctx;master=bus;const now=ctx.currentTime;
if(name==='handbrake'||name==='backfire'||name==='nitro')return true; // NOS edge is scheduled by update; no repeated shots during hold.
if(name==='skid'||name==='brake'){skidUntil=now+.35;return true;}
if(!manifest){const stamp=generation;getManifest().then(()=>{warm();if(stamp===generation)effect({context:ctx,master:bus,name,strength})});return true;}
const cooldown=name==='collision'?.12:.22;if(now-(lastEffects.get(name)??-100)<cooldown)return true;lastEffects.set(name,now);
const group=name==='gear'?manifest.effects.gear:name==='collision'||name==='scrape'?manifest.effects.collision:name==='turbo'?manifest.effects.turboOneShots:name==='nitroStart'?manifest.effects.nitroOneShots:name==='nearMiss'?manifest.effects.wind:null;
const alternatives=Array.isArray(group)&&['gear','collision','scrape'].includes(name)?group.slice(0,2):group;
const item=Array.isArray(alternatives)?alternatives[Math.floor(sequence++%alternatives.length)]:alternatives;
if(item&&!cache.has(item.file)){load(item);const stamp=generation;loading.get(item.file)?.then(()=>{if(stamp===generation)oneShot(item,.3*clamp(strength,0,1.5),name==='nearMiss'?.35:Infinity)});}else oneShot(item,.3*clamp(strength,0,1.5),name==='nearMiss'?.35:Infinity);return true;}
function update({context:ctx,master:bus,speed=0,gas=false,nitro=false,rpm=null,carClass='standard',carName='',gear=null,drifting=false,braking=false}={}){
if(!ctx||!bus||!ctx.createBufferSource)return false;context=ctx;master=bus;const selected=profileFor(carClass,carName),key=selected.key;if(params&&(params.key!==key||voiceProfile?.id!==selected.id)){stop();context=ctx;master=bus;}
if(nitro&&!params?.nitro)effect({context:ctx,master:bus,name:'nitroStart'});if(params?.gas&&!gas&&(voiceProfile.turbo||key==='sport')&&Number(rpm)>2800)effect({context:ctx,master:bus,name:'turbo'});
voiceProfile=selected;params={key,rpm:Number.isFinite(rpm)?Math.max(400,rpm):950+Math.max(0,speed)*28,gas,nitro,speed};
if(!engineGain){engineGain=ctx.createGain();engineGain.gain.value=0;const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=voiceProfile.cutoff;tone.Q.value=.45;engineGain.connect(tone);tone.connect(bus);engineGain.tone=tone;nextTime=ctx.currentTime+.012;}engineGain.gain.setTargetAtTime(worker?1:(gas?.52:.3),ctx.currentTime,.05);sendWorker();
// Keep a grain's read rate fixed so it always ends inside its source window.
if(lastGear!==null&&gear!==null&&gear!==lastGear)effect({context:ctx,master:bus,name:'gear'});lastGear=gear;getManifest().then(()=>warm());
if(manifest){const fx=manifest.effects;loop('skid',fx.skid,(drifting||braking&&speed>65||ctx.currentTime<skidUntil)&&speed>15?.22:0);loop('nitro',fx.nitroSustain,nitro?.2:0);loop('turbo',fx.turboSustain,gas&&(voiceProfile.turbo||key==='sport')&&params.rpm>2800?.045:0);loop('road',fx.road,clamp(speed/220,0,1)*.035,.8+clamp(speed/250,0,1)*.4);loop('wind',fx.wind,clamp((speed-70)/200,0,1)*.025);}
if(!timer)timer=setInterval(schedule,25);schedule();return true;}
function stop(){generation++;params=null;lastGear=null;nextTime=0;skidUntil=0;if(timer){clearInterval(timer);timer=null;}if(worker){const old=worker;old.port.postMessage({stop:true});setTimeout(()=>{old.disconnect();old.port.close()},180);worker=null;workerStatus=null;workerFamily=null;}for(const voice of [...grains,...shots])fadeVoice(voice,context.currentTime);shots.clear();grains.clear();for(const key of [...loops.keys()])stopLoop(key);if(engineGain){const old=engineGain;old.gain.setTargetAtTime(0,context.currentTime,.02);setTimeout(()=>{try{old.disconnect();old.tone?.disconnect()}catch(_){}},100);engineGain=null;}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
window.NomeraAuthorsSamples={update,stop,effect,keyFor,status:()=>({active:!!params&&(grains.size>0||workerStatus?.voices>0),key:params?.key||null,loaded:[...loadedKeys],failed:[...failed],contextState:context?.state,playbackRate:grains.values().next().value?.source.playbackRate.value,grainCount,activeGrains:workerStatus?.voices||grains.size,renderThread:!!worker,voice:voiceProfile,workerFailed,loops:[...loops.keys()],source:'MW Xbox360 verified banks'})};
})();
