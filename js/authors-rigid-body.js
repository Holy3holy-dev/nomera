/* NOMERA 3D rigid-body bridge. Quaternion orientation, OBB SAT and impulse
 * solver are original adapter code, NOT recovered MW IRigidBody/collision. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRigidBody=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>scale(a,1/(Math.hypot(...a)||1)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const mul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
 function quaternion(h=0,p=0,r=0){return mul(mul([0,Math.sin(h/2),0,Math.cos(h/2)],[0,0,Math.sin(r/2),Math.cos(r/2)]),[Math.sin(p/2),0,0,Math.cos(p/2)]);}
 function matrix(q){const[x,y,z,w]=q;return{right:[1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w)],up:[2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w)],forward:[2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y)]};}
 const rotate=(a,m)=>add(add(scale(m.right,a[0]),scale(m.up,a[1])),scale(m.forward,a[2])),local=(a,m)=>[dot(a,m.right),dot(a,m.up),dot(a,m.forward)];
 function integrate(q,omega,dt){const angle=Math.hypot(...omega)*dt;if(angle<1e-12)return q.slice();const k=Math.sin(angle/2)/(Math.hypot(...omega)||1),next=mul(q,[...scale(omega,k),Math.cos(angle/2)]);return scale(next,1/Math.hypot(...next));}
 function angles(m,oldHeading=0){
  // Extract Ry*Rz*Rx without a pitch/roll clamp. Near its Euler singularity
  // retain yaw; the authoritative quaternion remains well-conditioned.
  const roll=Math.asin(clamp(m.right[1],-1,1)),c=Math.cos(roll);
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  if(Math.abs(c)<1e-5)return{heading:oldHeading,pitch:wrap((Math.atan2(m.forward[0],m.forward[2])-oldHeading)*Math.sign(roll)),roll};
  let heading=Math.atan2(-m.right[2],m.right[0]),pitch=Math.atan2(-m.forward[1],m.up[1]),r=roll;
  if(Math.abs(wrap(heading+Math.PI-oldHeading))<Math.abs(wrap(heading-oldHeading))){heading=wrap(heading+Math.PI);pitch=wrap(pitch+Math.PI);r=wrap(Math.PI-roll);}
  return{heading,pitch,roll:r};
 }
 function syncOrientation(body,pose){const a=body.orientationAngles;
  if(!body.orientation||!a||Math.abs(a.heading-pose.heading)>1e-7||Math.abs(a.pitch-body.pitch)>1e-7||Math.abs(a.roll-body.roll)>1e-7)body.orientation=quaternion(pose.heading,body.pitch,body.roll);
  return matrix(body.orientation);
 }
 function integrateBody(body,pose,dt){body.orientation=integrate(body.orientation||quaternion(pose.heading,body.pitch,body.roll),[body.pitchRate,pose.yawRate,body.rollRate],dt);const a=angles(matrix(body.orientation),pose.heading);body.pitch=a.pitch;body.roll=a.roll;pose.heading=a.heading;body.orientationAngles={...a};return matrix(body.orientation);}
 function stepAngular(body,pose,torque,dt,start=[body.pitchRate,pose.yawRate,body.rollRate]){
  const q0=body.orientation||quaternion(pose.heading,body.pitch,body.roll),m0=matrix(q0),I=body.massProperties.inertia,L0=rotate(start.map((v,i)=>v*I[i]),m0),L1=add(L0,scale(rotate(torque,m0),dt)),mid=scale(add(L0,L1),.5);
  let world=rotate(local(mid,m0).map((v,i)=>v/I[i]),m0);
  for(let i=0;i<2;i++){const qm=integrate(q0,local(world,m0),dt*.5),mm=matrix(qm);world=rotate(local(mid,mm).map((v,k)=>v/I[k]),mm);}
  body.orientation=integrate(q0,local(world,m0),dt);const m=matrix(body.orientation),w=local(L1,m).map((v,i)=>v/I[i]),a=angles(m,body.orientationAngles?.heading??pose.heading);
  body.pitchRate=w[0];pose.yawRate=w[1];body.rollRate=w[2];body.pitch=a.pitch;body.roll=a.roll;pose.heading=a.heading;body.orientationAngles={...a};return m;
 }
 function descriptor(owner){const s=owner.state||owner,b=owner.suspension,p=owner.profile||s.profile||{},mass=p.massKg||s.massKg||1350;
  const m=b?syncOrientation(b,s):matrix(s.orientation||quaternion(s.heading||0,s.pitch||0,s.roll||0));
  const dims=b?.massProperties.dimensions||[p.trackWidth*1.15||1.9,1.35,p.wheelbase*1.65||4.5],shape=owner.collisionShape||s.collisionShape;
  const half=shape?.half||[dims[0]/2,Math.max(.3,dims[1]/2-.08),dims[2]/2],centerLocal=shape?.center||[0,dims[1]/2+.08,0],origin=[s.x||0,s.y??b?.y??0,s.z||0];
  if(b)b.y=origin[1];
  const cg=rotate([0,b?.cgHeight??.22,b?.cgZ||0],m),center=add(origin,rotate(centerLocal,m));
  const inertia=b?.massProperties.inertia||s.inertia||[mass*1.6,s.yawInertia||mass*3,mass*.4];
  return{owner,s,b,m,origin,cg,center,half,centerLocal,axes:[m.right,m.up,m.forward],mass,inertia,invMass:owner.immovable||s.immovable?0:1/mass};
 }
 function vertices(box){const list=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])list.push(add(box.center,rotate([x*box.half[0],y*box.half[1],z*box.half[2]],box.m)));return list;}
 function support(box,n){return box.axes.reduce((a,v,i)=>{const d=dot(v,n);return add(a,scale(v,Math.abs(d)<1e-8?0:Math.sign(d)*box.half[i]));},box.center.slice());}
 function contains(box,p,tolerance=.025){const d=local(sub(p,box.center),box.m);return d.every((v,i)=>Math.abs(v)<=box.half[i]+tolerance);}
 function closest(box,p){return add(box.center,rotate(local(sub(p,box.center),box.m).map((v,i)=>clamp(v,-box.half[i],box.half[i])),box.m));}
 function contactPoint(a,b,n){const sa=support(a,scale(n,-1)),sb=support(b,n),ia=contains(a,sb),ib=contains(b,sa);if(ia&&ib)return scale(add(sa,sb),.5);if(ib)return sa;if(ia)return sb;let x=closest(a,sb),y=closest(b,x);for(let i=0;i<3;i++){x=closest(a,y);y=closest(b,x);}return scale(add(x,y),.5);}
 function contact(a,b){const delta=sub(a.center,b.center);if(dot(delta,delta)>(Math.hypot(...a.half)+Math.hypot(...b.half))**2)return null;const candidates=[...a.axes,...b.axes];for(const x of a.axes)for(const y of b.axes)candidates.push(cross(x,y));let penetration=Infinity,normal;
  for(const axis of candidates){const length=Math.hypot(...axis);if(length<1e-7)continue;const n=scale(axis,1/length),radius=box=>box.axes.reduce((s,v,i)=>s+Math.abs(dot(v,n))*box.half[i],0),d=dot(delta,n),overlap=radius(a)+radius(b)-Math.abs(d);if(overlap<=0)return null;if(overlap<penetration){penetration=overlap;normal=scale(n,d<0?-1:1);}}
  const point=contactPoint(a,b,normal);
  return{normalX:normal[0],normalY:normal[1],normalZ:normal[2],penetration,pointX:point[0],pointY:point[1],pointZ:point[2]};
 }
 function sweptContact(a,b,pa,pb){if(!pa||!pb)return null;const startA=add([pa.x,pa.y||0,pa.z],rotate(a.centerLocal,a.m)),startB=add([pb.x,pb.y||0,pb.z],rotate(b.centerLocal,b.m)),d0=sub(startA,startB),d1=sub(a.center,b.center),motion=sub(d1,d0),axes=[...a.axes,...b.axes];for(const x of a.axes)for(const y of b.axes)axes.push(cross(x,y));let enter=0,exit=1,normal=null;
  for(const axis of axes){if(Math.hypot(...axis)<1e-7)continue;const n=unit(axis),radius=[a,b].reduce((sum,box)=>sum+box.axes.reduce((s,v,i)=>s+Math.abs(dot(v,n))*box.half[i],0),0),d=dot(d0,n),v=dot(motion,n);
   if(Math.abs(v)<1e-9){if(Math.abs(d)>radius)return null;continue;}const times=[(-radius-d)/v,(radius-d)/v].sort((x,y)=>x-y);if(times[0]>enter){enter=times[0];normal=scale(n,d+v*enter<0?-1:1);}exit=Math.min(exit,times[1]);if(enter>exit)return null;
  }if(!normal||enter<0||enter>=1||exit<=0)return null;
  const lerp=(x,y)=>add(x,scale(sub(y,x),enter)),A={...a,center:lerp(startA,a.center)},B={...b,center:lerp(startB,b.center)},point=contactPoint(A,B,normal);
  return{normalX:normal[0],normalY:normal[1],normalZ:normal[2],penetration:0,pointX:point[0],pointY:point[1],pointZ:point[2],timeOfImpact:enter,sweptPositions:{a:lerp([pa.x,pa.y||0,pa.z],a.origin),b:lerp([pb.x,pb.y||0,pb.z],b.origin)}};
 }
 function inertiaInverse(box,v){return rotate(local(v,box.m).map((a,i)=>a/box.inertia[i]),box.m);}
 function omega(box){return rotate([box.b?.pitchRate??box.s.pitchVel??0,box.s.yawRate||0,box.b?.rollRate??box.s.rollVel??0],box.m);}
 const linear=box=>[box.s.vx||0,box.b?.vy??box.s.vy??0,box.s.vz||0];
 function pointVelocity(box,point){return add(linear(box),cross(omega(box),sub(point,add(box.origin,box.cg))));}
 function apply(box,point,impulse){if(!box.invMass)return;const v=add(linear(box),scale(impulse,box.invMass)),w=add(omega(box),inertiaInverse(box,cross(sub(point,add(box.origin,box.cg)),impulse))),l=local(w,box.m);box.s.vx=v[0];box.s.vz=v[2];box.s.yawRate=l[1];if(box.b){box.b.vy=v[1];box.b.pitchRate=l[0];box.b.rollRate=l[2];}else{box.s.vy=v[1];box.s.pitchVel=l[0];box.s.rollVel=l[2];}}
 function denominator(box,point,n){if(!box||!box.invMass)return 0;const r=sub(point,add(box.origin,box.cg));return box.invMass+dot(n,cross(inertiaInverse(box,cross(r,n)),r));}
 function translate(box,delta){box.s.x+=delta[0];box.s.z+=delta[2];if(box.b){box.b.y+=delta[1];box.s.y=box.b.y;}else box.s.y=(box.s.y||0)+delta[1];box.origin=add(box.origin,delta);box.center=add(box.center,delta);}
 function sync(box){const s=box.s,sn=Math.sin(s.heading||0),cs=Math.cos(s.heading||0);s.vForward=(s.vx||0)*sn+(s.vz||0)*cs;s.vLateral=(s.vx||0)*cs-(s.vz||0)*sn;s.speedMps=Math.hypot(s.vx||0,s.vz||0);s.speedKmh=s.speedMps*3.6;if(box.b){s.y=box.b.y;s.pitch=box.b.pitch;s.roll=box.b.roll;s.heave=box.b.y;s.heaveVel=box.b.vy;s.pitchVel=box.b.pitchRate;s.rollVel=box.b.rollRate;}box.owner._syncStateAliases?.(s,s);}
 function solve(a,b,contacts,{restitution=.15,friction=.4,iterations=6,correct=true}={}){
  let closing=0,impulse=0;
  const rows=contacts.map(c=>{const n=unit([c.normalX,c.normalY||0,c.normalZ]),point=[c.pointX,c.pointY,c.pointZ],relative=sub(pointVelocity(a,point),b?pointVelocity(b,point):[0,0,0]),vn=dot(relative,n);closing=Math.max(closing,-vn);return{c,n,point,normalImpulse:0,tangentImpulse:[0,0,0],goal:vn< -2?-clamp(restitution,0,.6)*vn:0};});
  if(correct&&rows.length){const row=rows.reduce((x,y)=>x.c.penetration>y.c.penetration?x:y),sum=a.invMass+(b?.invMass||0),distance=Math.max(0,row.c.penetration-.001);if(sum>0){translate(a,scale(row.n,distance*a.invMass/sum));if(b)translate(b,scale(row.n,-distance*b.invMass/sum));}}
  for(let k=0;k<iterations;k++)for(const row of rows){const{n,point}=row,relative=()=>sub(pointVelocity(a,point),b?pointVelocity(b,point):[0,0,0]),K=denominator(a,point,n)+denominator(b,point,n);if(K<1e-12)continue;
   const old=row.normalImpulse;row.normalImpulse=Math.max(0,old+(row.goal-dot(relative(),n))/K);const j=row.normalImpulse-old;apply(a,point,scale(n,j));if(b)apply(b,point,scale(n,-j));impulse+=Math.max(0,j);
   const rv=relative(),tangent=sub(rv,scale(n,dot(rv,n))),speed=Math.hypot(...tangent);if(speed>1e-7){const t=scale(tangent,1/speed),kt=denominator(a,point,t)+denominator(b,point,t),desired=add(row.tangentImpulse,scale(t,-speed/kt)),limit=friction*row.normalImpulse,length=Math.hypot(...desired),next=length>limit?scale(desired,limit/length):desired,dj=sub(next,row.tangentImpulse);row.tangentImpulse=next;apply(a,point,dj);if(b)apply(b,point,scale(dj,-1));}
  }
  sync(a);if(b)sync(b);return{closingSpeedMps:Math.max(0,closing),normalImpulse:impulse,contacts:rows.length};
 }
 function groundContacts(box,sample){const rows=[];for(const point of vertices(box)){const g=sample(point[0],point[2]);if(g?.valid===false||g===null)continue;const h=typeof g==='number'?g:Number(g?.height)||0,n=unit(g?.normal||[0,1,0]),penetration=(h-point[1])*n[1];if(penetration>=-.004)rows.push({normalX:n[0],normalY:n[1],normalZ:n[2],penetration:Math.max(0,penetration),pointX:point[0],pointY:h,pointZ:point[2]});}return rows;}
 function groundStep(owner,dt,sample){const box=descriptor(owner),rows=groundContacts(box,sample),result=rows.length?solve(box,null,rows,{friction:.48,restitution:.08}):{closingSpeedMps:0,contacts:0};const b=owner.suspension,s=owner.state,up=box.m.up[1];
  b.chassisContact=rows.length>0;if(rows.length)s.lastGroundCollision=s.time||0;b.stuckTime=up<.25&&rows.length&&s.speedMps<3&&Math.hypot(...omega(box))<1.5?(b.stuckTime||0)+dt:0;
  s.rollover={up,inverted:up<0,chassisContact:rows.length>0,contacts:rows.length,stuckTime:b.stuckTime,recoverable:b.stuckTime>=2,quaternion:b.orientation.slice(),impact:result.closingSpeedMps};return result;
 }
 function wallContacts(box,{normalX,normalZ,planePoint,wallHeight=1.15,groundHeight=0}){const n=unit([normalX,0,normalZ]),rows=[],up=[0,1,0],forward=cross(n,up),wall={center:add(sub(planePoint,scale(n,.1)),[0,groundHeight+wallHeight*.5,0]),half:[.1,wallHeight*.5,Math.max(12,box.half[2]*4)],axes:[n,up,forward],m:{right:n,up,forward}};
  const hull=contact(box,wall);if(hull)return[hull];
  for(const v of vertices(box)){const d=dot(sub(v,planePoint),n);if(d<0&&v[1]<=groundHeight+wallHeight&&v[1]>=groundHeight-.3)rows.push({normalX:n[0],normalY:0,normalZ:n[2],penetration:-d,pointX:v[0]-n[0]*d,pointY:clamp(v[1],groundHeight,groundHeight+wallHeight),pointZ:v[2]-n[2]*d});}
  // A low wall may lie between the hull's top/bottom vertices. Its top edge
  // still intersects the side face; do not let tall cars pass through it.
  if(!rows.length){const low=Math.min(...vertices(box).map(v=>v[1])),high=Math.max(...vertices(box).map(v=>v[1])),v=support(box,scale(n,-1)),d=dot(sub(v,planePoint),n);if(d<0&&low<=groundHeight+wallHeight&&high>=groundHeight)rows.push({normalX:n[0],normalY:0,normalZ:n[2],penetration:-d,pointX:v[0]-n[0]*d,pointY:clamp(v[1],Math.max(low,groundHeight),Math.min(high,groundHeight+wallHeight)),pointZ:v[2]-n[2]*d});}
  return rows;
 }
 function createBody({position,velocity=[0,0,0],orientation=[0,0,0,1],half=[.95,.7,2.2],mass=1500}){
  const dims=half.map(v=>v*2),a=angles(matrix(orientation)),inertia=[mass*(dims[1]**2+dims[2]**2)/12,mass*(dims[0]**2+dims[2]**2)/12,mass*(dims[0]**2+dims[1]**2)/12],s={x:position[0],y:position[1],z:position[2],vx:velocity[0],vy:velocity[1],vz:velocity[2],yawRate:0,...a};
  return{state:s,profile:{massKg:mass,trackWidth:dims[0]/1.15,wheelbase:dims[2]/1.65},collisionShape:{half,center:[0,half[1],0]},suspension:{y:position[1],vy:velocity[1],pitch:a.pitch,roll:a.roll,pitchRate:0,rollRate:0,orientation:orientation.slice(),orientationAngles:a,cgHeight:dims[1]*.4,cgZ:0,massProperties:{dimensions:dims,inertia}}};
 }
 function stepFree(owner,dt,sample){const s=owner.state,b=owner.suspension,count=Math.max(1,Math.ceil(dt*120)),h=dt/count;for(let i=0;i<count;i++){
  const m=syncOrientation(b,s),oldCG=rotate([0,b.cgHeight,b.cgZ],m);
  b.vy-=9.81*h;b.y+=b.vy*h;s.x+=s.vx*h;s.z+=s.vz*h;
  const next=stepAngular(b,s,[0,0,0],h),newCG=rotate([0,b.cgHeight,b.cgZ],next);s.x+=oldCG[0]-newCG[0];s.z+=oldCG[2]-newCG[2];b.y+=oldCG[1]-newCG[1];s.y=b.y;groundStep(owner,h,sample);
 }return s;}
 function meshContacts(engine,physics){const T=engine.THREE;if(!T||!engine.roadChunks)return;for(const chunk of engine.roadChunks){if(Math.abs(chunk.position.z-physics.z)>engine.chunkLength*.7+physics.profile.wheelbase*2)continue;
   if(!chunk.userData.bodyColliders){const list=[];chunk.traverse(n=>{if(n.isMesh&&(n.userData.solidBody||/^Tunnel(WallL|WallR|VaultRoof)$/.test(n.name)))list.push(n)});chunk.userData.bodyColliders=list;}
   chunk.updateMatrixWorld(true);for(const mesh of chunk.userData.bodyColliders){let visible=true;for(let n=mesh;n;n=n.parent)if(!n.visible){visible=false;break;}if(!visible)continue;
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),fixed={state:{x:center.x,y:center.y,z:center.z,immovable:true},immovable:true,collisionShape:{center:[0,0,0],half:[size.x/2,size.y/2,size.z/2]}};
    const c=contact(descriptor(physics),descriptor(fixed));if(c){physics._resolve3DContact(null,[c],{restitution:.08,friction:.35});physics.suspension.chassisContact=true;if(physics.state.rollover)physics.state.rollover.chassisContact=true;}
   }
  }}
 return{add,sub,scale,dot,cross,unit,quaternion,mul,matrix,rotate,local,integrate,angles,syncOrientation,integrateBody,stepAngular,descriptor,vertices,support,contains,contact,sweptContact,inertiaInverse,omega,linear,pointVelocity,apply,solve,sync,groundContacts,groundStep,wallContacts,createBody,stepFree,meshContacts};
});
