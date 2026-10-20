/* NOMERA highway lane assistance, traffic contacts and pursuit pacing.
 * These are host/gameplay policies, not recovered MW police AI. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraTraffic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function highwaySteer(input,s){
  if(s.speedMps<4||s.handbrake||s.rollover?.inverted||s.rollover?.up<.65||s.roadContact?.airborne)return input;
  // A straight highway uses bounded lane-change heading. Only the wheel is
  // commanded: neither world position nor body orientation is overwritten.
  const speed=Math.max(4,s.speedMps),heading=wrap(s.heading),target=input*Math.atan2(Math.min(4.3,1.8+speed*.055),speed);
  return clamp((target-heading)*3.8-s.yawRate*.72,-1,1);
 }
 function laneClear(e,car,target){const u=car.userData,half=u.halfLength||2.2;return e.trafficCars.every(other=>{
  if(other===car||other.position.y< -500)return true;const v=other.userData,gap=other.position.z-car.position.z,closing=Math.max(0,((gap>0?u.speed:v.speed)-(gap>0?v.speed:u.speed))/3.6);
  return Math.abs(other.position.x-target)>((u.halfWidth||.95)+(v.halfWidth||.95)+.35)||Math.abs(gap)>half+(v.halfLength||2.2)+4+closing*1.2;
 });}
 function begin(e,dt){const a=e.authorsPursuit||(e.authorsPursuit={time:0,nextDispatch:12,quietUntil:0,violationAt:0,wasWanted:false});a.time+=dt;
  if(a.wasWanted&&!e.state.wantedStars){a.quietUntil=a.time+20;a.violationAt=a.time+20;}a.wasWanted=!!e.state.wantedStars;
  for(const car of e.trafficCars){const u=car.userData;u.authorsPreviousPose={x:car.position.x,y:car.position.y,z:car.position.z};u.durabilityCooldown=Math.max(0,(u.durabilityCooldown||0)-dt);}
 }
 function cruise(e,car,dt){const u=car.userData;if(u.contactBody||u.isWrecked)return;
  let speed=u.speed;for(const other of e.trafficCars){if(other===car||other.position.y< -500)continue;const v=other.userData,gap=other.position.z-car.position.z-(u.halfLength||2.2)-(v.halfLength||2.2),width=(u.halfWidth||.95)+(v.halfWidth||.95)+.3;
   if(gap>=0&&Math.abs(other.position.x-car.position.x)<width){const relative=Math.max(0,(speed-v.speed)/3.6),safe=4+speed/3.6*.7+relative*relative/(2*6);if(gap<safe){speed=Math.max(0,Math.min(speed-24*dt*3.6,v.speed+Math.max(0,gap-4)*1.1));u.isBraking=true;} }
  }u.speed=Math.max(0,speed);
  if(Math.abs(u.targetX-car.position.x)>.15&&!laneClear(e,car,u.targetX)){u.targetX=car.position.x;u.changingLane=false;u.plannedLaneIndex=null;}
 }
 function observe(e,car,dt,dx,dz){const a=e.authorsPursuit,u=car.userData;if(!a||u.isWrecked)return;const close=Math.abs(dz)<28&&dx<6;
  const violation=close&&(e.state.speed>175||e.keys?.horn&&e.state.speed>120);u.observedTime=violation?(u.observedTime||0)+dt:Math.max(0,(u.observedTime||0)-dt*2);
  if(u.observedTime>.85&&a.time>=a.violationAt&&a.time>=a.quietUntil&&(e.state.wantedStars===0||e.state.speed>245&&e.state.wantedStars<3)){a.violationAt=a.time+18;u.observedTime=0;e.addWantedStars(1,'Опасное вождение замечено экипажем');}
 }
 function dispatch(e,car){const a=e.authorsPursuit,u=car.userData;if(!a||!e.state.wantedStars||a.time<a.nextDispatch||a.time<(u.disabledUntil||0)||a.time<a.quietUntil)return false;
  const active=e.trafficCars.filter(c=>c!==car&&c.userData.type==='police'&&!c.userData.isWrecked&&c.position.y> -500).length;
  if(active>=Math.min(3,Math.max(1,Math.ceil(e.state.wantedStars/2))))return false;
  a.nextDispatch=a.time+14;u.integrity=100;u.durabilityCooldown=0;u.damageState=null;e.resetTrafficDamage?.(car);return true;
 }
 function policeHit(e,car,result){const u=car.userData;if(u.isWrecked||u.durabilityCooldown>0||!result||result.closingSpeedMps<2)return{damage:0,disabled:false};
  const mass=u.contactBody?.profile.massKg||1850,dv=(result.normalImpulse||0)/mass,damage=clamp(Math.max(0,dv-1.8)*3.2+Math.max(0,result.closingSpeedMps-6)*.4,0,100);
  u.integrity=Math.max(0,(u.integrity??100)-damage);if(damage>0)u.durabilityCooldown=.45;
  if(damage>3&&e.state.wantedStars===0&&e.authorsPursuit.time>=e.authorsPursuit.quietUntil)e.addWantedStars(1,'Столкновение с экипажем ДПС');
  return{damage,disabled:u.integrity<=0};
 }
 function retire(e,car){const a=e.authorsPursuit,u=car.userData;u.disabledUntil=a.time+40;u.respawnTimer=40;a.nextDispatch=Math.max(a.nextDispatch,a.time+16);u.wreckSpinVx=0;u.wreckTimer=7;}
 function owner(e,car){const u=car.userData;if(u.contactBody)return u.contactBody;const R=e.mwLongitudinal?.mwKernel.RigidBody||e.config?.physicsKernel?.RigidBody;if(!R)return null;const truck=u.type==='truck'||u.type==='kamaz',body=R.createBody({position:car.position.toArray(),velocity:[u.deflectVx||0,0,(u.speed||0)/3.6],orientation:car.quaternion.toArray(),half:[u.halfWidth||.95,truck?1.4:.7,u.halfLength||2.2],mass:truck?6500:u.type==='police'?1850:1500});body.state.impactSequence=u.damageState?.impactSequence||0;body.state.impactEvents=u.damageState?.impactEvents||[];return body;}
 function finish(e,dt){const R=e.mwLongitudinal?.mwKernel.RigidBody||e.config?.physicsKernel?.RigidBody;if(!R)return;let contacts=0;
  const cars=e.trafficCars.filter(c=>c.position.y> -500);for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
   const a=cars[i],b=cars[j],ua=a.userData,ub=b.userData;if(Math.abs(a.position.x-b.position.x)>5||Math.abs(a.position.z-b.position.z)>Math.max(18,dt*Math.abs((ua.speed||0)-(ub.speed||0))/3.6+12))continue;
   const A=owner(e,a),B=owner(e,b),da=R.descriptor(A),db=R.descriptor(B),c=R.contact(da,db)||R.sweptContact(da,db,ua.authorsPreviousPose,ub.authorsPreviousPose);if(!c)continue;
   if(c.sweptPositions){for(const[o,p]of [[A,c.sweptPositions.a],[B,c.sweptPositions.b]]){[o.state.x,o.state.y,o.state.z]=p;o.suspension.y=o.state.y;}}
   const result=R.solve(R.descriptor(A),R.descriptor(B),[c],{restitution:.04,friction:.12});ua.contactBody=A;ub.contactBody=B;ua.dynamicTime=0;ub.dynamicTime=0;contacts++;
   for(const[car,o,sign]of [[a,A,1],[b,B,-1]]){const u=car.userData;car.position.set(o.state.x,o.state.y,o.state.z);car.quaternion.fromArray(o.suspension.orientation);u.speed=o.state.vz*3.6;u.hazardTimer=result.closingSpeedMps>3?3:u.hazardTimer;
    if(result.closingSpeedMps>3)e.authorsTrafficImpact?.(car,{...result,point:[c.pointX,c.pointY,c.pointZ],normal:[c.normalX*sign,c.normalY*sign,c.normalZ*sign]});}
  }
  e.trafficContactTelemetry={contacts,cars:cars.length};
  for(const car of cars){const u=car.userData,b=u.contactBody;if(!b||u.isWrecked)continue;u.dynamicTime=(u.dynamicTime||0)+dt;const d=R.descriptor(b),w=R.omega(d);
   if(u.dynamicTime>1.2&&d.m.up[1]>.97&&Math.abs(b.suspension.vy)<.4&&Math.hypot(...w)<.5){u.speed=Math.max(0,b.state.vz*3.6);u.targetX=car.position.x;u.damageState=b.state;u.contactBody=null;}
  }
 }
 return{highwaySteer,laneClear,begin,cruise,observe,dispatch,policeHit,retire,owner,finish};
});
