/* Reward policy only: existing goals, money prizes, odds and driving controls stay unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraActivities=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';const ids=['spins','distance','tune'],xp={spins:80,distance:120,tune:100},setReward=Object.freeze({cash:50000,xp:150,repairs:1});
 function normalize(value={}){return{repairs:Number.isFinite(Number(value?.repairs))?Math.max(0,Math.min(9999,Math.floor(Number(value.repairs)))):0,extraAchievements:[...new Set(Array.isArray(value?.extraAchievements)?value.extraAchievements.filter(s=>typeof s==='string'&&/^[a-z0-9_]{1,60}$/.test(s)):[])].slice(0,200)};}
 function quest(def){return{...def,rewardXp:xp[def.id]??def.rewardXp};}
 function ready(def,progress={}){const n=Number(progress[def.id]);return Number.isFinite(n)&&n+1e-8>=def.target;}
 function setReady(claimed={}){return ids.every(id=>claimed[id]===true)&&!claimed.all;}
 function achievement(ach){const cash=Math.max(0,Number(ach.reward)||0);return{xp:Math.min(400,Math.max(80,Math.round(cash/1000))),repairs:cash>=150000?1:0};}
 function pending(catalog,achievements,ledger){const seen=new Set(normalize(ledger).extraAchievements);return catalog.filter(a=>achievements[a.id]&&!seen.has(a.id));}
 return{ids,xp,setReward,normalize,quest,ready,setReady,achievement,pending};
});
