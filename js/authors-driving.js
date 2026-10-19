/* Original arcade tuning for the local Author's Edition; not NFS source code. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NomeraAuthorsDriving=api})(typeof window!=='undefined'?window:null,function(){
 'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function steer(current,target,dt){current=Number(current)||0;target=clamp(Number(target)||0,-1,1);dt=clamp(Number(dt)||0,0,.1);const tau=current*target<0?.065:target===0?.08:.11;const next=target+(current-target)*Math.exp(-dt/tau);return Math.abs(next)<.001?0:next;}
 function lateral(current,input,speedKmh,max,authority,grip,dt){const speed=Math.max(0,Number(speedKmh)||0)/3.6;const target=input*Math.min(max,1.4+speed*.12)*clamp(authority,0,1);const rate=7*clamp(grip,.35,1.5);const next=target+(current-target)*Math.exp(-rate*clamp(dt,0,.1));return speed<.05?0:Math.abs(next)<.015?0:next;}
 function throttle(gas,brake,hasFuel){return Boolean(gas&&hasFuel&&!brake)}
 return{steer,lateral,throttle};
});
