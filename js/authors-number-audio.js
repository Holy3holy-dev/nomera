/* Selected reveal themes, event-timed. No gameplay state or random draws. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else if(root.NOMERA_AUTHORS_PREVIEW)root.NomeraNumberAudio=factory(root,root.NomeraNumberBanks);})(typeof globalThis!=='undefined'?globalThis:this,function(root,banks){'use strict';
 const cached=new Map(),pending=new Map(),retry=new Map(),voices=new Set(),counts={};let epoch=0,tick=0,lock=0,last=null;
 const select=scene=>banks?.selection?.[scene]||null;
 const supports=(kind,scene)=>!!select(scene)&&['spin','open','tick','lock','reward','car'].includes(kind);
 function load(ctx,theme){if(cached.has(theme))return Promise.resolve(cached.get(theme));if(pending.has(theme))return pending.get(theme);if(ctx.currentTime<(retry.get(theme)||0))return Promise.resolve(null);const bank=banks.banks[theme];const task=root.fetch('./assets/authors-audio/numbers/'+bank.file).then(r=>{if(!r.ok)throw Error(theme);return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).then(b=>{cached.set(theme,b);retry.delete(theme);return b;}).catch(()=>{retry.set(theme,ctx.currentTime+10);return null;}).finally(()=>pending.delete(theme));pending.set(theme,task);return task;}
 function warm(context){if(!context?.decodeAudioData)return Promise.resolve([]);return Promise.all(Object.values(banks.selection).map(theme=>load(context,theme)));}
 function release(v){voices.delete(v);try{v.source.disconnect();v.gain.disconnect();}catch(_){}}
 function fade(v,ctx){try{const now=ctx.currentTime;v.gain.gain.cancelScheduledValues(now);v.gain.gain.setTargetAtTime(0,now,.008);v.source.stop(now+.045);}catch(_){release(v);}}
 function stop(scene){epoch++;for(const v of [...voices])if(!scene||v.scene===scene)fade(v,v.ctx);}
 function play({context:ctx,master,kind,scene,rank=0,volume=1,pitch=1}={}){const theme=select(scene);if(!supports(kind,scene))return false;if(!ctx||ctx.state!=='running'||!(volume>0)||root.document?.hidden)return true;
  if(kind==='spin'||kind==='open'){stop();tick=0;lock=0;warm(ctx);}
  const reward=kind==='reward'||kind==='car',key=reward?'win-'+Math.max(0,Math.min(6,rank|0)):kind==='tick'?'tick-'+tick++%3:kind==='lock'?'lock-'+Math.min(5,lock++):'start',token=epoch,requested=ctx.currentTime,rate=kind==='lock'?Math.max(.94,Math.min(1.04,Number(pitch)/1.25||1)):1;
  function start(buffer){if(!buffer||token!==epoch||ctx.state!=='running'||root.document?.hidden||ctx.currentTime-requested>(reward?.85:.20))return;
   if(reward)for(const v of [...voices])if(v.reward)fade(v,v.ctx);
   if(voices.size>=8){const oldest=[...voices].find(v=>!v.reward);if(!oldest)return;try{oldest.source.stop();}catch(_){}release(oldest);}
   const clip=banks.banks[theme].clips[key],source=ctx.createBufferSource(),gain=ctx.createGain(),now=ctx.currentTime,duration=clip.seconds/rate;source.buffer=buffer;source.playbackRate.value=rate;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.002);gain.gain.setValueAtTime(volume,Math.max(now+.003,now+duration-.008));gain.gain.linearRampToValueAtTime(0,now+duration);source.connect(gain);gain.connect(master);const v={source,gain,ctx,reward,scene};voices.add(v);source.onended=()=>release(v);source.start(now,clip.offset,clip.seconds);source.stop(now+duration+.002);counts[theme+':'+kind]=(counts[theme+':'+kind]||0)+1;last={scene,theme,kind,key,rank:rank|0};if(reward)root.NomeraRadio?.duck(Math.min(1600,duration*1000));
  }
  if(cached.has(theme))start(cached.get(theme));else load(ctx,theme).then(start);return true;
 }
 root.document?.addEventListener('visibilitychange',()=>{if(root.document.hidden)stop();});root.addEventListener?.('pagehide',()=>stop());
 return{supports,select,warm,play,stop,stats:()=>({voices:voices.size,cached:[...cached.keys()],pending:[...pending.keys()],failed:[...retry.keys()],counts:{...counts},last})};
});
