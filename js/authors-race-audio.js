/* Original local MW Xbox360 banks. RPM/grain playback is a NOMERA adapter.
 * Exact archive offsets/hashes: assets/audio/mw/provenance.json. */
(()=>{'use strict';if(!window.NOMERA_AUTHORS_PREVIEW)return;
const BASE='./assets/audio/mw/',cache=new Map(),loading=new Map(),failed=new Set(),loadedKeys=new Set(),grains=new Set(),loops=new Map(),lastEffects=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),HANN=Float32Array.from({length:65},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/64));
let manifest=null,manifestPromise=null,context=null,master=null,params=null,engineGain=null,timer=null,nextTime=0,sequence=0,lastGear=null,skidUntil=0,generation=0,grainCount=0;
function keyFor(carClass,carName=''){const c=String(carClass).toLowerCase(),name=carName.toLowerCase();if(/m3.*gtr/.test(name))return'whine';if(/камаз|truck/.test(name))return'truck';if(/mustang|amg|corvette/.test(name))return'v8';if(/ferrari|gallardo|huracan|chiron|jesko|mclaren|viper|911/.test(name))return'supercar';return /kamaz|truck|diesel/.test(c)?'truck':/m3gtr|nfs_gtr|whine/.test(c)?'whine':/v8|muscle|luxury|supercharger/.test(c)?'v8':/hyper|supercar/.test(c)?'supercar':/sport|turbo/.test(c)?'sport':'standard';}
function getManifest(){if(!manifestPromise)manifestPromise=fetch(BASE+'manifest.json').then(r=>{if(!r.ok)throw Error('MW manifest');return r.json()}).then(m=>manifest=m).catch(()=>{failed.add('manifest');return null});return manifestPromise;}
function load(item){if(!item||cache.has(item.file)||loading.has(item.file)||failed.has(item.file))return;
loading.set(item.file,fetch(BASE+item.file).then(r=>{if(!r.ok)throw Error(item.file);return r.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>cache.set(item.file,buffer)).catch(()=>failed.add(item.file)).finally(()=>loading.delete(item.file)));}
function family(key){return manifest?.families[key==='whine'?'m3gtr':key];}
function warm(){if(!manifest||!context)return;const f=family(params?.key||'standard');if(f){load(f.accel);load(f.decel);if(cache.has(f.accel.file)&&cache.has(f.decel.file))loadedKeys.add(params?.key||'standard');}for(const item of Object.values(manifest.effects))for(const entry of Array.isArray(item)?item:[item])load(entry);}
function dispose(source,gain){try{source.disconnect();gain.disconnect()}catch(_){}}
function stopLoop(key){const voice=loops.get(key);if(!voice)return;loops.delete(key);const now=context.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.025);try{voice.source.stop(now+.12)}catch(_){}}
function loop(key,item,volume,rate=1){if(!item)return;load(item);if(volume<.001){stopLoop(key);return;}const buffer=cache.get(item.file);if(!buffer)return;let voice=loops.get(key);
if(!voice){const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=true;source.loopStart=(item.loop?.start||0)/item.sampleRate;source.loopEnd=(item.loop?.end||item.samples)/item.sampleRate;source.connect(gain);gain.connect(master);gain.gain.value=0;voice={source,gain};source.onended=()=>dispose(source,gain);source.start();loops.set(key,voice);}
voice.gain.gain.setTargetAtTime(volume,context.currentTime,.065);voice.source.playbackRate.setTargetAtTime(rate,context.currentTime,.08);}
function rpmAt(item,sample){const map=item.gin.rpmSamplePositions,up=map[map.length-1]>=map[0];let i=0;while(i<map.length-2&&(up?sample>map[i+1]:sample<map[i+1]))i++;const ratio=clamp((sample-map[i])/(map[i+1]-map[i]||1),0,1);return item.gin.rpmMin+(item.gin.rpmMax-item.gin.rpmMin)*(i+ratio)/(map.length-1);}
function positionAt(item,rpm){const g=item.gin,map=g.rpmSamplePositions,p=clamp((rpm-g.rpmMin)/(g.rpmMax-g.rpmMin),0,1)*(map.length-1),i=Math.floor(p);return map[i]+(map[Math.min(i+1,map.length-1)]-map[i])*(p-i);}
function grain(item,rpm,time,weight){const buffer=cache.get(item.file);if(!buffer||weight<.005)return;
const sr=item.sampleRate,window=.12,initialRpm=clamp(rpm,item.gin.rpmMin,item.gin.rpmMax),initialRate=clamp(rpm/initialRpm,.3,2.5),target=positionAt(item,initialRpm)-window*.5*initialRate*sr,positions=item.gin.grainSamplePositions;
let lo=0,hi=positions.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(positions[mid]<target)lo=mid+1;else hi=mid;}
const start=clamp(positions[Math.max(0,lo-1)],0,Math.max(0,item.samples-window*initialRate*sr)),ref=rpmAt(item,start+window*.5*initialRate*sr),rate=clamp(rpm/ref,.3,2.5);
const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=rate;
const normalization=clamp(.28/Math.max(.05,item.rms||.28),.35,1),curve=Float32Array.from(HANN,v=>v*weight*normalization);gain.gain.setValueCurveAtTime(curve,time,window);
source.connect(gain);gain.connect(engineGain);const voice={source,gain,ref};grains.add(voice);grainCount++;
source.onended=()=>{grains.delete(voice);dispose(source,gain)};source.start(time,start/sr);source.stop(time+window);}
function schedule(){if(!params||!context||context.state!=='running'||document.hidden)return;warm();const f=family(params.key);if(!f)return;const now=context.currentTime;if(nextTime<now)nextTime=now+.012;
while(nextTime<now+.085){const idle=params.rpm<f.decel.gin.rpmMin*.65,accelWeight=idle?1:(params.gas?1:0);grain(f.accel,params.rpm,nextTime,accelWeight);grain(f.decel,params.rpm,nextTime,1-accelWeight);nextTime+=.06;sequence++;}}
function oneShot(item,volume=.28){if(!item)return;load(item);const buffer=cache.get(item.file);if(!buffer)return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=volume*clamp(.3/Math.max(.05,item.rms||.3),.35,1);source.connect(gain);gain.connect(master);source.onended=()=>dispose(source,gain);source.start();}
function effect({context:ctx,master:bus,name,strength=1}={}){if(!ctx||!bus||ctx.state!=='running')return true;context=ctx;master=bus;const now=ctx.currentTime;
if(name==='handbrake'||name==='backfire'||name==='nitro')return true; // NOS edge is scheduled by update; no repeated shots during hold.
if(name==='skid'||name==='brake'){skidUntil=now+.35;return true;}
if(!manifest){const stamp=generation;getManifest().then(()=>{warm();if(stamp===generation)effect({context:ctx,master:bus,name,strength})});return true;}
const cooldown=name==='collision'?.12:.22;if(now-(lastEffects.get(name)??-100)<cooldown)return true;lastEffects.set(name,now);
const group=name==='gear'?manifest.effects.gear:name==='collision'||name==='scrape'?manifest.effects.collision:name==='turbo'?manifest.effects.turboOneShots:name==='nitroStart'?manifest.effects.nitroOneShots:name==='nearMiss'?manifest.effects.whoosh:null;
const item=Array.isArray(group)?group[Math.floor(sequence++%group.length)]:group;
if(item&&!cache.has(item.file)){load(item);const stamp=generation;loading.get(item.file)?.then(()=>{if(stamp===generation)oneShot(item,.3*strength)});}else oneShot(item,.3*strength);return true;}
function update({context:ctx,master:bus,speed=0,gas=false,nitro=false,rpm=null,carClass='standard',carName='',gear=null,drifting=false,braking=false}={}){
if(!ctx||!bus||!ctx.createBufferSource)return false;context=ctx;master=bus;const key=keyFor(carClass,carName);if(params&&params.key!==key){stop();context=ctx;master=bus;}
if(nitro&&!params?.nitro)effect({context:ctx,master:bus,name:'nitroStart'});if(params?.gas&&!gas&&key==='sport'&&Number(rpm)>2800)effect({context:ctx,master:bus,name:'turbo'});
params={key,rpm:Number.isFinite(rpm)?Math.max(400,rpm):950+Math.max(0,speed)*28,gas,nitro,speed};
if(!engineGain){engineGain=ctx.createGain();engineGain.gain.value=0;engineGain.connect(bus);nextTime=ctx.currentTime+.012;}engineGain.gain.setTargetAtTime(gas?.52:.3,ctx.currentTime,.05);
for(const voice of grains)voice.source.playbackRate.setTargetAtTime(clamp(params.rpm/voice.ref,.3,2.5),ctx.currentTime,.03);
if(lastGear!==null&&gear!==null&&gear!==lastGear)effect({context:ctx,master:bus,name:'gear'});lastGear=gear;getManifest().then(()=>warm());
if(manifest){const fx=manifest.effects;loop('skid',fx.skid,(drifting||braking&&speed>65||ctx.currentTime<skidUntil)&&speed>15?.22:0);loop('nitro',fx.nitroSustain,nitro?.2:0);loop('turbo',fx.turboSustain,gas&&key==='sport'&&params.rpm>2800?.045:0);loop('road',fx.road,clamp(speed/220,0,1)*.035,.8+clamp(speed/250,0,1)*.4);loop('wind',fx.wind,clamp((speed-70)/200,0,1)*.025);}
if(!timer)timer=setInterval(schedule,25);schedule();return true;}
function stop(){generation++;params=null;lastGear=null;nextTime=0;skidUntil=0;if(timer){clearInterval(timer);timer=null;}for(const voice of grains)try{voice.source.stop()}catch(_){};grains.clear();for(const key of [...loops.keys()])stopLoop(key);if(engineGain){const old=engineGain;old.gain.setTargetAtTime(0,context.currentTime,.02);setTimeout(()=>{try{old.disconnect()}catch(_){}},100);engineGain=null;}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
window.NomeraAuthorsSamples={update,stop,effect,keyFor,status:()=>({active:!!params&&grains.size>0,key:params?.key||null,loaded:[...loadedKeys],failed:[...failed],contextState:context?.state,playbackRate:grains.values().next().value?.source.playbackRate.value,grainCount,activeGrains:grains.size,loops:[...loops.keys()],source:'MW Xbox360 verified banks'})};
})();
