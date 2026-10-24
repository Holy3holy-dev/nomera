/* Original short UI sound design. Bounded, cached PCM; no audio downloads. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraSoundscape=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){'use strict';
 const clamp=(v,f)=>Number.isFinite(Number(v))?Math.max(0,Math.min(1,Number(v))):f;
 function rank(s=''){return /блат|миф|крутой|ультра/i.test(s)?6:/легенд/i.test(s)?5:/эпич/i.test(s)?4:/супер ред/i.test(s)?3:/^редк/i.test(s)?2:/необыч/i.test(s)?1:0;}
 function normalize(p={}){return{menu:clamp(p.menu,.65),rewards:clamp(p.rewards,.8),radio:clamp(p.radio,.45)};}
 let prefs=normalize(),mix={volume:.45,muted:false};try{prefs=normalize(JSON.parse(root.localStorage?.getItem('nomera_authors_mix_v1')||'{}'));}catch(_){}
 const cache=new Map(),voices=new Set(),played={};let current=null,last={},tickSequence=0;
 function render(kind,r=0,sr=22050){r=Math.max(0,Math.min(6,r|0));const reward=kind==='reward'||kind==='car',duration=reward?.48+r*.19+(kind==='car'?.24:0):({click:.055,tick:.045,lock:.22,cash:.55,open:.32,spin:.36,error:.19})[kind]||.12,a=new Float32Array(Math.ceil(duration*sr));let seed=7919+r*31,low=0;
  const notes=[261.626,329.628,391.995,523.251,659.255,783.991];
  const bells=[1046.5,1318.51,1567.98,2093,2637.02],attack=['tick','lock','spin'].includes(kind)?.0008:.004,coin=(u,scale=1)=>u<0?0:(Math.sin(2*Math.PI*1387*u)*.10+Math.sin(2*Math.PI*2223*u)*.035+Math.sin(2*Math.PI*3329*u)*.012)*(1-Math.exp(-u*1100))*Math.exp(-u*24)*scale;
  for(let i=0;i<a.length;i++){const t=i/sr;seed=(Math.imul(seed,1664525)+1013904223)|0;const n=(seed>>>0)/2147483648-1;low+=.19*(n-low);let value=0;
   if(kind==='reward'){value=coin(t);for(let k=0;k<Math.min(5,2+r);k++){const u=t-.04-k*.055;if(u>0)value+=Math.sin(2*Math.PI*bells[k]*u)*(1-Math.exp(-u*250))*Math.exp(-u*(9-r*.6))*.055;}for(let j=1;j<=Math.min(4,r);j++)value+=coin(t-.09-j*.052,.4);value+=Math.sin(2*Math.PI*130*t)*Math.exp(-t*24)*.06;}
   else if(reward){value=.25*Math.sin(2*Math.PI*(85*t-24*t*t))*Math.exp(-t*18);if(r>0||kind==='car')for(let k=0;k<Math.min(6,2+r);k++){const u=t-k*.065;if(u>=0){const f=notes[k]*(kind==='car'?.75:1),attack=Math.min(1,u/.012);value+=(Math.sin(2*Math.PI*f*u)+.18*Math.sin(2*Math.PI*f*2.004*u))*Math.exp(-u*(4.8-r*.32))*attack*.08;}}if(kind==='car')value+=low*Math.sin(Math.PI*Math.min(1,t/.35))*Math.exp(-t*6)*.15;}
   else if(kind==='tick'){value=(n-low)*.10*Math.exp(-t*190)+Math.sin(2*Math.PI*1580*t)*Math.exp(-t*145)*.21+Math.sin(2*Math.PI*2870*t)*Math.exp(-t*190)*.04;}
   else if(kind==='spin'){value=(n-low)*.16*Math.exp(-t*110)+low*.12*Math.sin(Math.PI*t/duration)+Math.sin(2*Math.PI*(210*t+210*t*t))*Math.exp(-t*13)*.08;}
   else if(kind==='click'){const f=kind==='tick'?980:540;value=(low*.6+Math.sin(2*Math.PI*f*t)*.25+Math.sin(2*Math.PI*f*1.61*t)*.12)*Math.exp(-t*(kind==='tick'?160:105));}
   else if(kind==='lock'){value=(Math.sin(2*Math.PI*145*t)*.15+low*.2)*Math.exp(-t*75)+Math.sin(2*Math.PI*1440*t)*Math.exp(-t*35)*.13+Math.sin(2*Math.PI*2310*t)*Math.exp(-t*48)*.035;}
   else if(kind==='cash')for(let k=0;k<3;k++){const u=t-k*.045;if(u>0)value+=Math.sin(2*Math.PI*notes[k+1]*u)*Math.exp(-u*12)*.13;}
   else if(kind==='open')value=low*Math.sin(Math.PI*t/duration)*.24+Math.sin(2*Math.PI*74*t)*Math.exp(-t*15)*.12;
   else value=Math.sin(2*Math.PI*(260*t-160*t*t))*.15*Math.exp(-t*17);
   const fade=Math.min(1,t/attack,(duration-t)/.018);a[i]=Math.max(-.75,Math.min(.75,value))*Math.max(0,fade);
  }return{samples:a,sampleRate:sr,duration:a.length/sr};
 }
 function release(v){voices.delete(v);try{v.source.disconnect();v.gain.disconnect();}catch(_){} }
 function stop(){root.NomeraNumberAudio?.stop();for(const v of voices){try{v.source.stop();}catch(_){}release(v);}last={};}
 function play(context,master,kind,options={}){if(!context?.createBufferSource||!context?.createBuffer)return false;current={context,master};if(context.state!=='running'||mix.muted||mix.volume===0)return true;const now=context.currentTime||0,r=rank(options.rarity),reward=kind==='reward'||kind==='car',channel=reward||kind==='cash'?'rewards':'menu',volume=prefs[channel];if(!volume)return true;const key=reward?'reward':kind,limit=reward?.12:kind==='tick'?.045:.045;if(now-(last[key]??-Infinity)<limit)return true;last[key]=now;
  // New reveals replace their predecessor. Ten reels never create ten chords.
  if(reward)for(const v of [...voices])if(v.reward){try{v.gain.gain.setTargetAtTime(.0001,now,.025);v.source.stop(now+.12);}catch(_){} }
  if(root.NomeraNumberAudio?.supports(kind,options.scene)){played[kind]=(played[kind]||0)+1;return root.NomeraNumberAudio.play({context,master,kind,scene:options.scene,rank:r,pitch:options.pitch,volume:volume*(reward?.9:.7)});}if(voices.size>=10)return true;const cacheKey=kind+'-'+r;let buffer=cache.get(cacheKey);if(!buffer||buffer.sampleRate!==context.sampleRate){const pcm=render(kind,r,context.sampleRate||22050);buffer=context.createBuffer(1,pcm.samples.length,pcm.sampleRate);buffer.getChannelData(0).set(pcm.samples);cache.set(cacheKey,buffer);}const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;if(source.playbackRate)source.playbackRate.value=kind==='tick'?[.97,1.015,1.04][tickSequence++%3]:kind==='lock'?Math.max(.8,Math.min(1.3,Number(options.pitch)||1)):1;gain.gain.setValueAtTime(volume*(reward?.9:.7),now);source.connect(gain);gain.connect(master);const v={source,gain,reward};voices.add(v);source.onended=()=>release(v);played[kind]=(played[kind]||0)+1;source.start(now);source.stop(now+buffer.duration+.02);root.NomeraRadio?.duck(reward?Math.min(1600,buffer.duration*1000):0);return true;
 }
 function cue(kind,options){if(current)return play(current.context,current.master,kind,options);return false;}
 function configure(next){mix={...mix,...next};root.NomeraRadio?.setMaster(mix);if(mix.muted||mix.volume===0)stop();return{...mix};}
 function setMix(next){prefs=normalize({...prefs,...next});try{root.localStorage?.setItem('nomera_authors_mix_v1',JSON.stringify(prefs));}catch(_){}root.NomeraRadio?.setVolume(prefs.radio);return{...prefs};}
 return{bind:(context,master)=>{current={context,master};if(!mix.muted&&mix.volume>0)root.NomeraNumberAudio?.warm(context);},render,rank,normalize,play,cue,stop,configure,setMix,preferences:()=>({...prefs}),master:()=>({...mix}),stats:()=>({voices:voices.size,cached:cache.size,played:{...played}})};
});
