/* SPDX-License-Identifier: MPL-2.0
 * MW vector contact/jump algorithms, adapted from pinned ProStreetMWPhysics
 * 9c6e261 (gaycoderprincess/Brawltendo). Terrain and body integration are the
 * NOMERA bridge, not recovered WWorldPos/IRigidBody. See MW_3D_CONTACT.md. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraMWContact=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ramp=(v,a,b)=>clamp((v-a)/(b-a),0,1);
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>{const length=Math.hypot(...a);return length>1e-10?scale(a,1/length):[0,0,0];};
 const rotate=(a,m)=>add(add(scale(m.right,a[0]),scale(m.up,a[1])),scale(m.forward,a[2]));
 function basis(heading=0,pitch=0,roll=0){
  const ch=Math.cos(heading),sh=Math.sin(heading),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
  return{right:[ch*cr,sr,-sh*cr],up:[-ch*sr*cp+sh*sp,cr*cp,sh*sr*cp+ch*sp],forward:[ch*sr*sp+sh*cp,-cr*sp,-sh*sr*sp+ch*cp]};
 }
 function wheelPosition({matrix,localArm,worldCG,linearVelocity,angularVelocity,dt,radius,vehicleHeight}){
  const arm=rotate(localArm,matrix),position=add(arm,matrix.position),velocity=add(cross(angularVelocity,sub(arm,worldCG)),linearVelocity);
  return{arm,position,velocity,tolerance:Math.min(Math.max(-velocity[1]*dt,0)+radius+Math.hypot(velocity[0],velocity[2])*dt,vehicleHeight*.5)};
 }
 function frame({normal,forward,up,rideHeight,penetration,travel}){
  const lateral=unit(cross(normal,forward)),drive=unit(cross(lateral,normal)),upness=clamp(dot(normal,up),0,1);
  const raw=rideHeight*upness+penetration,compression=clamp(raw,0,travel);
  const loadFactor=Math.max(4*dot(cross(cross(forward,normal),forward),normal)-3,.3);
  return{lateral,drive,forward,normal,upness,compression,bottomDelta:Math.max(0,raw-travel),contact:compression>0&&upness>.2,loadFactor};
 }
 function wheelForce({frame:f,up,springForce,fx,fy,velocity,dt,mass,localArm,compression,rideHeight,matrix,worldCG}){
  const xspeed=dot(velocity,f.lateral),cap=Math.abs(xspeed/dt*.25*mass);
  const force=f.contact?add(add(scale(up,springForce),scale(f.drive,fx)),scale(f.lateral,clamp(fy,-cap,cap))):[0,0,0];
  const point=add(rotate(add(localArm,[0,compression-rideHeight,0]),matrix),matrix.position),arm=sub(sub(point,matrix.position),worldCG);
  return{force,torque:cross(arm,force),point,lateralSpeed:xspeed,forwardSpeed:dot(velocity,f.forward)};
 }
 function jump({dt,mass,speed,vy,normal,altitude,touching,groundContact=false,matrix,angularVelocity,inertia,jumpTime=0,jumpAltitude=0,enabled=true,landingGravity=true,active=true}){
  let force=[0,0,0],torque=[0,0,0];if(!enabled)return{force,torque,jumpTime,jumpAltitude};
  const up=matrix.up,groundDot=dot(up,normal);
  if(!touching){
   jumpTime+=dt;jumpAltitude=Math.max(jumpAltitude,altitude);
   if(landingGravity){let accel=3;if(jumpTime>1&&groundDot>.96&&jumpAltitude>2&&vy<0&&altitude<6)accel+=(1-ramp(altitude,0,6))*10*ramp(speed,0,20);force[1]=-mass*accel;}
  }else{jumpTime=0;jumpAltitude=0;}
  if(touching<2&&up[1]>.8&&!groundContact){
   const magnitude=Math.hypot(...angularVelocity),damping=ramp(speed,0,5)*(magnitude<.4?magnitude*.15/.4:magnitude<2?.15+(magnitude-.4)*4.85/1.6:5);
   torque=rotate([-angularVelocity[0]*inertia[0]*damping,0,-angularVelocity[2]*inertia[2]*damping],matrix);
  }
  if(active&&!touching&&normal[1]>.9&&up[1]>.1&&groundDot>.8&&altitude>1e-6){
   const gain=mass*ramp(speed,0,5)*(1-ramp(altitude,0,15)),flatForward=unit(cross(matrix.right,normal)),flatRight=unit(cross(normal,matrix.forward));
   for(const[target,current,action]of [[flatForward,matrix.forward,40],[flatRight,matrix.right,20]]){
    const d=dot(target,current);if(d<.99)torque=add(torque,scale(unit(cross(target,current)),gain*action*(d-1)));
   }
  }
  return{force,torque,jumpTime,jumpAltitude};
 }
 function ground(sample,x,z,key){
  const value=sample?sample(x,z,key):0;
  if(value===null||value?.valid===false)return{height:0,normal:[0,1,0],valid:false,surface:'air'};
  if(typeof value==='number')return{height:Number.isFinite(value)?value:0,normal:[0,1,0],valid:true};
  return{height:Number(value?.height)||0,normal:unit(value?.normal||[0,1,0]),valid:true,surface:value?.surface||'asphalt'};
 }
 function initialize(body,pose,sample,explicitHeight=false){
  const p=body.profile,g=ground(sample,pose.x,pose.z);
  if(!explicitHeight&&g.valid){body.y=g.height;const n=g.normal,h=pose.heading||0;
   body.pitch=Math.atan2(n[0]*Math.sin(h)+n[2]*Math.cos(h),Math.max(.01,n[1]));
   body.roll=-Math.atan2(n[0]*Math.cos(h)-n[2]*Math.sin(h),Math.max(.01,n[1]));
  }else body.y=pose.y||0;
  body.jumpTime=0;body.jumpAltitude=0;body.grounded=4;body.landings=0;
 }
 function begin(body,dt,pose,sample,springForce){
  const p=body.profile,m=basis(pose.heading,body.pitch,body.roll);m.position=[pose.x,body.y,pose.z];
  const cog=rotate([0,body.cgHeight,0],m),angular=rotate([body.pitchRate,pose.yawRate,body.rollRate],m),velocity=[pose.vx,body.vy,pose.vz],previous=body.wheels.map(w=>w.compression);
  let touching=0,bottomDelta=0;
  for(let i=0;i<4;i++){
   const w=body.wheels[i],arm=[w.x,0,w.z],position=wheelPosition({matrix:m,localArm:arm,worldCG:cog,linearVelocity:velocity,angularVelocity:angular,dt,radius:p.wheelRadius,vehicleHeight:1.5});
   const g=ground(sample,position.position[0],position.position[2],w.key),angle=w.front?(w.key==='fl'?pose.steerLeftRad:pose.steerRightRad):0;
   const forward=rotate([Math.sin(angle),0,Math.cos(angle)],m);
   const f=frame({normal:g.normal,forward,up:m.up,rideHeight:w.neutral,penetration:(g.height-position.position[1])*g.normal[1],travel:w.travel});
   if(!g.valid){f.contact=false;f.compression=0;f.bottomDelta=0;}
   w.springForce=f.contact?springForce({...w,compression:f.compression,previous:previous[i],dt,sway:(previous[i]-previous[i^1])*w.swayStiffness,mass:p.massKg}):0;
   w.load=f.contact?w.springForce*f.loadFactor:0;w.contact=f.contact;w.compression=f.compression;w.offset=f.compression-w.neutral;
   w.contact3D={...position,frame:f,localArm:arm,ground:g,force:[0,0,0],torque:[0,0,0]};
   w.airTime=f.compression?0:(w.airTime||0)+dt;touching+=Number(f.contact);bottomDelta=Math.max(bottomDelta,f.bottomDelta);
  }
  const landed=touching>0&&body.grounded===0;
  if(landed){pose.yawRate*=.5;body.rollRate*=.5;body.landings++;}
  body.grounded=touching;
  return{matrix:m,worldCG:cog,touching,bottomDelta,landed,ground:ground(sample,pose.x,pose.z)};
 }
 function resolve(body,context,wheel,fx,fy,dt){
  const q=wheel.contact3D;
  const result=wheelForce({frame:q.frame,up:context.matrix.up,springForce:wheel.springForce,fx,fy,velocity:q.velocity,dt,mass:body.profile.massKg,
   localArm:q.localArm,compression:wheel.compression,rideHeight:wheel.neutral,matrix:context.matrix,worldCG:context.worldCG});
  q.force=result.force;q.torque=result.torque;q.point=result.point;return result;
 }
 function finish(body,dt,pose,context,{downforce=0,aeroCenterZ=0,dragPitchMoment=0,dragRollMoment=0}={}){
  const p=body.profile,mass=p.massKg,inertia=[mass*(p.wheelbase*p.wheelbase*1.5+p.cgHeight*p.cgHeight)/12,pose.yawInertia,mass*(p.trackWidth*p.trackWidth+p.cgHeight*p.cgHeight)/12];
  let force=[0,-mass*9.81-downforce,0],torque=cross(rotate([0,0,aeroCenterZ],context.matrix),[0,-downforce,0]);
  for(const w of body.wheels){force=add(force,w.contact3D.force);torque=add(torque,w.contact3D.torque);}
  const j=jump({dt,mass,speed:pose.speedMps,vy:body.vy,normal:context.ground.normal,altitude:Math.max(0,body.y-context.ground.height),touching:context.touching,
   matrix:context.matrix,angularVelocity:[body.pitchRate,pose.yawRate,body.rollRate],inertia,jumpTime:body.jumpTime,jumpAltitude:body.jumpAltitude});
  body.jumpTime=j.jumpTime;body.jumpAltitude=j.jumpAltitude;force=add(force,j.force);torque=add(torque,j.torque);
  body.vy+=force[1]/mass*dt;body.y+=body.vy*dt;
  body.pitchRate+=(dot(torque,context.matrix.right)+dragPitchMoment)/inertia[0]*dt;
  body.rollRate+=(dot(torque,context.matrix.forward)+dragRollMoment)/inertia[2]*dt;
  body.pitch=clamp(body.pitch+body.pitchRate*dt,-1.3,1.3);body.roll=clamp(body.roll+body.rollRate*dt,-1.3,1.3);
  const newCG=rotate([0,body.cgHeight,0],basis(pose.heading,body.pitch,body.roll));
  pose.x+=context.worldCG[0]-newCG[0];pose.z+=context.worldCG[2]-newCG[2];body.y+=context.worldCG[1]-newCG[1];
  // MW lifts world Y at bottom-out; velocity is resolved by the spring forces.
  body.y+=context.bottomDelta;
  body.telemetry={grounded:context.touching,airborne:!context.touching,landed:context.landed,landings:body.landings,flightTime:body.jumpTime,
   verticalVelocity:body.vy,force,torque,bottomDelta:context.bottomDelta,normal:context.ground.normal,wheels:Object.fromEntries(body.wheels.map(w=>[w.key,{normal:w.contact3D.ground.normal,surface:w.contact3D.ground.surface,point:w.contact3D.point,velocity:w.contact3D.velocity,load:w.load,contact:w.contact,compression:w.compression}]))};
 }
 return{add,sub,scale,dot,cross,unit,rotate,basis,wheelPosition,frame,wheelForce,jump,ground,initialize,begin,resolve,finish};
});
