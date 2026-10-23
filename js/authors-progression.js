/* Account progression policy. No XP, odds, handling or vehicle geometry changes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraProgression=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const MAX=777;
 const stages=[
  [5,'Дебютант','First Light','chevron','#b8f76d','05','DEBUT'],
  [10,'Клубный пилот','Club Cyan','circuit','#68dbf5','10','CLUB'],
  [25,'Мастер линии','Redline','chevron','#ff706f','25','REDLINE'],
  [50,'Ночной ас','Midnight Violet','circuit','#b69aff','50','MIDNIGHT'],
  [100,'Золотая серия','Aurum','chevron','#f7d58a','01','AURUM'],
  [200,'Платиновая лига','Platinum','circuit','#d6edf5','02','PLATINUM'],
  [400,'Икона дорог','Prism','chevron','#81ead5','04','PRISM'],
  [777,'Легенда NOMERA','Signature 777','circuit','#fff1bd','77','SIGNATURE']
 ].map(([level,title,name,pattern,color,number,team],i)=>Object.freeze({
  level,id:'level_'+level,title,name,color,bonus:level*1000,
  livery:Object.freeze({pattern,color,number,team,width:i<4?.075:.11,offset:i%2?-.04:.04})
 }));
 const titles=Object.fromEntries(stages.map(s=>[s.id,{id:s.id,label:s.title,color:s.color,level:s.level}]));
 const level=v=>Number.isFinite(Number(v))?Math.max(1,Math.min(MAX,Math.floor(Number(v)))):1;
 function reward(lvl){lvl=level(lvl);return lvl===1?0:Math.min(25000,2500+lvl*500)+(stages.find(s=>s.level===lvl)?.bonus||0);}
 function pending(lvl,through){lvl=level(lvl);through=level(through);let cash=0;for(let n=through+1;n<=lvl;n++)cash+=reward(n);return{from:through+1,to:lvl,count:Math.max(0,lvl-through),cash};}
 function claim(lvl,through){const p=pending(lvl,through);return{...p,through:p.count?p.to:level(through)};}
 function xpTo(lvl,xp,target){lvl=level(lvl);target=level(target);if(target<=lvl)return 0;let total=0;for(let n=lvl;n<target;n++)total+=100+(n-1)*10;return Math.max(0,total-Math.max(0,Number(xp)||0));}
 function snapshot(lvl,xp,through){lvl=level(lvl);const unlocked=stages.filter(s=>s.level<=lvl),next=stages.find(s=>s.level>lvl)||null;return{level:lvl,pending:pending(lvl,through),unlocked,next,xpToStage:next?xpTo(lvl,xp,next.level):0,nextCash:lvl<MAX?reward(lvl+1):0};}
 function canUse(id,lvl){const stage=stages.find(s=>s.id===id);return !!stage&&stage.level<=level(lvl);}
 return{MAX,stages,titles,level,reward,pending,claim,xpTo,snapshot,canUse};
});
