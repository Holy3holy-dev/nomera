/* NOMERA tonal adaptation of related MW recordings, not exact-car recordings. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraEngineTone=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function settings(type='',id='',name=''){const text=(id+' '+name).toLowerCase(),race=/race|gtr v8/i.test(type),turbo=/turbo/i.test(type),plain=/^I4$|^V6$|diesel/i.test(type),manual=/ваз|лада|жигули|девят|волга|priora|vaz|gaz24|mark ii|supra|silvia|impreza|is300|rx.?[78]|evo|mustang/i.test(text),dct=/huracan|gallardo|porsche|cayman|911|golf|polo|sf90|chiron|jesko|g80|gtr.*r35|slr/i.test(text),shift=race?'race':manual?'manual':dct?'dct':'auto',cylinders=/W16/i.test(type)?16:/V12/i.test(type)?12:/V10/i.test(type)?10:/V8|GTR V8/i.test(type)?8:/I6|V6|flat 6/i.test(type)?6:4;
  const overrun=plain?0:race?.8:/rotary|V8 race|V10/.test(type)?.5:turbo?.25:.12;
  return{shift,shiftSeconds:{manual:.16,auto:.105,dct:.065,race:.075}[shift],cylinders,turbo,overrun,gain:plain?.86:race?.91:.9,presence:cylinders>=10?1300:cylinders===8?900:1700,presenceDb:race?1.1:plain?-.8:.3};
 }
 function condition(pcm,sr){const hp=Math.exp(-2*Math.PI*28/sr),lp=1-Math.exp(-2*Math.PI*Math.min(8800,sr*.31)/sr);let x0=0,y0=0,a=0,b=0;for(let i=0;i<pcm.length;i++){const x=Number.isFinite(pcm[i])?clamp(pcm[i],-1,1):0,y=hp*(y0+x-x0);x0=x;y0=y;a+=lp*(y-a);b+=lp*(a-b);pcm[i]=b;}return pcm;}
 function transient(kind,voice={},sr=48000){const shift=kind==='shift',duration=shift?(voice.shiftSeconds||.1):.22,n=Math.ceil(duration*sr),pcm=new Float32Array(n);let seed=32719+(voice.cylinders||4)*71,low=0,slow=0;const bass=shift?(voice.shift==='manual'?93:128):(voice.cylinders>=8?79:136),bursts=shift?1:voice.overrun>.6?3:2;
  for(let i=0;i<n;i++){const t=i/sr;seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;low+=.18*(noise-low);slow+=.018*(noise-slow);let value=0;for(let j=0;j<bursts;j++){const u=t-j*(shift?0:.055);if(u<0)continue;const attack=1-Math.exp(-u*1700),env=attack*Math.exp(-u*(shift?42:48+j*8));value+=(low-slow)*env*(shift?.34:.55)+Math.sin(2*Math.PI*(bass-j*7)*u)*env*(shift?.11:.19);}const fade=clamp((duration-t)/.02,0,1);pcm[i]=clamp(value*fade,-.6,.6);}
  return{pcm,duration:n/sr};
 }
 return{settings,condition,transient,grainPolicy:key=>({overlap:key==='flat6'?2:4,phaseAlign:!['flat6','supercar','db9'].includes(key)})};
});
