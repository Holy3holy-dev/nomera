/* NOMERA highway lane assistance, traffic contacts and pursuit pacing.
 * These are host/gameplay policies, not recovered MW police AI. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraTraffic=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function highwaySteer(input,s){
  if(s.speedMps<4||s.vForward<0||s.gear<0||Math.abs(wrap(s.heading))>.55||s.handbrake||s.rollover?.inverted||s.rollover?.up<.65||s.roadContact?.airborne)return input;
  // A straight highway uses bounded lane-change heading. Only the wheel is
  // commanded: neither world position nor body orientation is overwritten.
  const speed=Math.max(4,s.speedMps),heading=wrap(s.heading),target=input*Math.atan2(Math.min(5.3,2.4+speed*.065),speed);
  return clamp((target-heading)*9-s.yawRate*1.1,-1,1);
 }
 function visualSafe(e,car){const distance=car.position.z-e.state.z;return car.position.y< -500||Math.abs(distance)>Math.max(85,(e.state.speed||0)/3.6*1.8);}
 function spawn(e,car,{lane=0,ahead=0}={}){
  const u=car.userData,lanes=e.trafficLanes||[-6.375,-2.125,2.125,6.375],playerSpeed=Math.max(0,e.state.speed||0)/3.6;
  const distance=Math.max(180,ahead,60+Math.max(0,playerSpeed-(u.baseSpeed||80)/3.6)*3.5);
  let chosen=null;for(let row=0;row<64&&!chosen;row++)for(let i=0;i<lanes.length&&!chosen;i++){
   const index=(lane+i)%lanes.length,x=lanes[index],z=e.state.z+distance+row*18;
   if(!globalThis.NomeraRoadEvents?.blocked(e,x,z,u.halfWidth||.95,(u.halfLength||2.2)+15)&&e.trafficCars.every(other=>other===car||other.position.y< -500||Math.abs(other.position.x-x)>(u.halfWidth||.95)+(other.userData.halfWidth||.95)+.5||Math.abs(other.position.z-z)>(u.halfLength||2.2)+(other.userData.halfLength||2.2)+12))chosen={index,x,z};
  }
  if(!chosen)return false;
  const ground=e.trafficGroundAt?.(chosen.x,chosen.z)||{height:0,normal:[0,1,0]};car.position.set(chosen.x,ground.height,chosen.z);car.quaternion.set(0,0,0,1);
  if(ground.normal&&car.quaternion.setFromUnitVectors)car.quaternion.setFromUnitVectors(car.position.clone().set(0,1,0),car.position.clone().fromArray(ground.normal));
  Object.assign(u,{contactBody:null,damageState:null,dynamicTime:0,deflectVx:0,laneVx:0,pursuitMode:'patrol',lastSeenTarget:null,lastSeenAt:0,playerVisible:false,decisionIn:0,policeTargetSpeed:0,observedTime:0,isWrecked:false,wrecked:false,wreckTimer:0,wreckSpinVx:0,changingLane:false,plannedLaneIndex:null,hazardTimer:0,evadeBoostTimer:0,isBraking:false,overtaken:false,nearMissed:false,collisionTimer:0,durabilityCooldown:0,integrity:100,laneIndex:chosen.index,targetX:chosen.x,prevDz:chosen.z-e.state.z});
  u.baseSpeed=e.getLaneSpeed(chosen.index,u.type);u.speed=u.baseSpeed;u.authorsPreviousPose={x:car.position.x,y:car.position.y,z:car.position.z};u.collisionPreviousPose={...u.authorsPreviousPose};e.resetTrafficDamage?.(car);return true;
 }
 function laneClear(e,car,target){const u=car.userData,half=u.halfLength||2.2;if(e.state&&Number.isFinite(e.state.x)&&Number.isFinite(e.state.z)){const gap=e.state.z-car.position.z,lo=Math.min(car.position.x,target)-2.1,hi=Math.max(car.position.x,target)+2.1,closing=Math.max(0,(gap>0?(u.speed||0)-(e.state.speed||0):(e.state.speed||0)-(u.speed||0))/3.6);if(e.state.x>lo&&e.state.x<hi&&Math.abs(gap)<half+2.3+3+closing*.9)return false;}return e.trafficCars.every(other=>{
  if(other===car||other.position.y< -500)return true;const v=other.userData,gap=other.position.z-car.position.z,closing=Math.max(0,((gap>0?u.speed:v.speed)-(gap>0?v.speed:u.speed))/3.6);
  return Math.abs(other.position.x-target)>((u.halfWidth||.95)+(v.halfWidth||.95)+.35)||Math.abs(gap)>half+(v.halfLength||2.2)+4+closing*1.2;
 });}
 function begin(e,dt){const a=e.authorsPursuit||(e.authorsPursuit={time:0,nextDispatch:12,quietUntil:0,violationAt:0,wasWanted:false});a.time+=dt;
  if(a.wasWanted&&!e.state.wantedStars){a.quietUntil=a.time+20;a.violationAt=a.time+20;}a.wasWanted=!!e.state.wantedStars;
  for(const car of e.trafficCars){const u=car.userData;u.authorsPreviousPose={x:car.position.x,y:car.position.y,z:car.position.z};u.durabilityCooldown=Math.max(0,(u.durabilityCooldown||0)-dt);}
 }
 function cruise(e,car,dt){const u=car.userData;if(u.contactBody||u.isWrecked)return;
  let target=u.speed,minGap=Infinity;for(const other of e.trafficCars){if(other===car||other.position.y< -500)continue;const v=other.userData,gap=other.position.z-car.position.z-(u.halfLength||2.2)-(v.halfLength||2.2),width=(u.halfWidth||.95)+(v.halfWidth||.95)+.3;
   if(gap>=0&&Math.abs(other.position.x-car.position.x)<width){const relative=Math.max(0,(u.speed-v.speed)/3.6),safe=5+u.speed/3.6*.9+relative*relative/(2*7);if(gap<safe){target=Math.min(target,Math.max(0,v.speed+(gap-5)*1.2));minGap=Math.min(minGap,gap);u.isBraking=true;} }
  }const incident=globalThis.NomeraRoadEvents?.gap(e,car)??Infinity;if(incident<Math.max(40,u.speed/3.6*2+12)){minGap=Math.min(minGap,incident);target=Math.min(target,Math.sqrt(Math.max(0,2*5*(incident-5)))*3.6);u.isBraking=true;}u.speed=Math.max(target,u.speed-(minGap<5?10:7)*dt*3.6);
  if(Math.abs(u.targetX-car.position.x)>.15&&!laneClear(e,car,u.targetX)){u.targetX=car.position.x;u.changingLane=false;u.plannedLaneIndex=null;}
 }
 function observe(e,car,dt,dx,dz){const a=e.authorsPursuit,u=car.userData;if(!a||u.isWrecked)return;const close=Math.abs(dz)<28&&dx<6;
  const violation=close&&perceive(e,car)&&(e.state.speed>175||e.keys?.horn&&e.state.speed>120);u.observedTime=violation?(u.observedTime||0)+dt:Math.max(0,(u.observedTime||0)-dt*2);
  if(u.observedTime>.85&&a.time>=a.violationAt&&a.time>=a.quietUntil&&(e.state.wantedStars===0||e.state.speed>245&&e.state.wantedStars<3)){a.violationAt=a.time+18;u.observedTime=0;e.addWantedStars(1,'Опасное вождение замечено экипажем');}
 }
 function dispatch(e,car){const a=e.authorsPursuit,u=car.userData;if(!a||!e.state.wantedStars||a.time<a.nextDispatch||a.time<(u.disabledUntil||0)||a.time<a.quietUntil)return false;
  if(e.state.pursuitPhase==='search'&&e.state.escapeTimer<6)return false;
  const active=e.trafficCars.filter(c=>c!==car&&c.userData.type==='police'&&!c.userData.isWrecked&&c.position.y> -500&&Math.abs(c.position.z-e.state.z)<180&&['chase','search'].includes(c.userData.pursuitMode)).length;
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
 function perceive(e,car){const u=car.userData;if(u.isWrecked||car.position.y< -500)return false;const dx=e.state.x-car.position.x,dz=e.state.z-car.position.z,range=['night','rain','fog'].includes(e.currentActiveWeather)?95:140;if(Math.hypot(dx,dz)>range||dz< -48||Math.abs(car.position.y-(e.mwLongitudinal?.y||0))>3)return false;
  return !e.trafficCars.some(other=>{if(other===car||other.position.y< -500||!['truck','kamaz','suv','ambulance'].includes(other.userData.type))return false;const t=(other.position.z-car.position.z)/(dz||.0001);return t>.05&&t<.95&&Math.abs(other.position.x-(car.position.x+dx*t))<(other.userData.halfWidth||1.1)+.25;});
 }
 function policeStep(e,car,dt){const u=car.userData,a=e.authorsPursuit;if(!a||u.isWrecked)return;const seen=perceive(e,car);u.playerVisible=seen;if(seen){u.lastSeenAt=a.time;u.lastSeenTarget={x:e.state.x,z:e.state.z,speed:e.state.speed,vx:e.state.vx||0};}if(!e.state.wantedStars){u.pursuitMode='patrol';return;}const target=u.lastSeenTarget;if(!target||a.time-(u.lastSeenAt||0)>5){u.pursuitMode='disengage';return;}u.pursuitMode=seen?'chase':'search';if(u.contactBody)return;u.decisionIn=(u.decisionIn||0)-dt;
  if(u.decisionIn<=0){u.decisionIn=.25;const dz=car.position.z-target.z,side=car.position.x>=target.x?1:-1,idx=e.trafficCars.filter(c=>c.userData.type==='police').indexOf(car);u.pursuitRole=['tail','flank','block'][Math.max(0,idx)%3];let x=target.x+clamp(target.vx*.3,-1.3,1.3);if(u.pursuitRole==='flank'&&Math.abs(dz)<30)x+=side*2.6;u.targetX=clamp(x,-7.2,7.2);const cap=[130,170,195,220,245,265][Math.min(5,e.state.wantedStars)];u.policeTargetSpeed=seen?Math.min(cap,Math.max(70,target.speed+(dz< -10?12:0))):Math.min(u.baseSpeed||100,130);}
  const delta=(u.policeTargetSpeed||u.baseSpeed||90)-u.speed;u.speed+=clamp(delta,-6*3.6*dt,4*3.6*dt);
 }
 function moveLateral(e,car,dt){const u=car.userData;if(u.contactBody){u.laneVx=0;return;}if(!laneClear(e,car,u.targetX)){u.targetX=car.position.x;u.changingLane=false;u.plannedLaneIndex=null;}const distance=u.targetX-car.position.x,max=u.type==='police'?2.6:1.7,target=clamp(distance*1.8,-max,max),old=u.laneVx||0;u.laneVx=old+clamp(target-old,-3.8*dt,3.8*dt);let step=u.laneVx*dt;if(Math.abs(step)>Math.abs(distance)){step=distance;u.laneVx=0;}car.position.x+=step;u.changingLane=Math.abs(distance)>.08;u.laneChangeDirection=distance>=0?1:-1;car.rotation.y=clamp(u.laneVx/Math.max(8,u.speed/3.6),-.12,.12);car.rotation.z=-u.laneVx*.012;
 }
 function threat(e){let nearest=999,seen=false,blocking=false;for(const car of e.trafficCars){const u=car.userData;if(u.type!=='police'||u.isWrecked||car.position.y< -500)continue;const dx=Math.abs(car.position.x-e.state.x),dz=Math.abs(car.position.z-e.state.z),distance=Math.hypot(dx,dz),visible=perceive(e,car);nearest=Math.min(nearest,distance);if(visible){seen=true;if(dx<2.2&&dz<8&&Math.abs(u.speed-e.state.speed)<14)blocking=true;}}return{nearest,seen,blocking};}
 function owner(e,car){const u=car.userData;if(u.contactBody)return u.contactBody;const R=e.mwLongitudinal?.mwKernel.RigidBody||e.config?.physicsKernel?.RigidBody;if(!R)return null;const truck=u.type==='truck'||u.type==='kamaz',body=R.createBody({position:car.position.toArray(),velocity:[(u.laneVx||0)+(u.deflectVx||0),0,(u.speed||0)/3.6],orientation:car.quaternion.toArray(),half:[u.halfWidth||.95,truck?1.4:.7,u.halfLength||2.2],mass:truck?6500:u.type==='police'?1850:1500});body.state.impactSequence=u.damageState?.impactSequence||0;body.state.impactEvents=u.damageState?.impactEvents||[];return body;}
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
 return{highwaySteer,visualSafe,spawn,laneClear,begin,cruise,observe,dispatch,policeHit,retire,owner,finish,perceive,policeStep,moveLateral,threat};
});
