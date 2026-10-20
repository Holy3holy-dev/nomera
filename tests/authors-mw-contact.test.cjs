const test=require('node:test'),assert=require('node:assert/strict');
const mw=require('../js/authors-mw-physics'),C=mw.Contact3D,golden=require('./fixtures/mw-contact-golden.json');
const near=(a,b,e=Math.max(.015,Math.abs(b)*5e-5))=>assert(Math.abs(a-b)<=e,`${a} != C++ ${b}`),vec=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
for(const{kind,name,input:i,expected:e}of golden.cases)test('MW C++ 3D '+kind+': '+name,()=>{
 if(kind==='wheelPosition'){const r=C.wheelPosition(i);vec(r.arm,e.worldArm);vec(r.position,e.position);vec(r.velocity,e.velocity);near(r.tolerance,e.tolerance);}
 else if(kind==='jumpStabilizer'){
  const r=C.jump({...i,vy:i.linearVelocity[1],touching:i.grounded,angularVelocity:i.localAngularVelocity,jumpAltitude:i.peakAltitude});
  vec(r.force,e.force);vec(r.torque,e.torque);near(r.jumpTime,e.jumpTime);near(r.jumpAltitude,e.peakAltitude);
 }else{
  const spec=i.springSpecs;let total=[0,0,0],torque=[0,0,0],grounded=0,correction=0;
  const rows=i.arms.map((arm,k)=>{
   const axle=k>>1,ride=spec.rideHeightInches[axle]*.0254;
   const f=C.frame({normal:i.normal,forward:i.matrix.forward,up:i.matrix.up,rideHeight:ride,penetration:i.penetrations[k],travel:spec.travelInches[axle]*.0254});
   const position=C.wheelPosition({matrix:i.matrix,localArm:arm,worldCG:i.worldCG,linearVelocity:i.linearVelocity,angularVelocity:i.angularVelocity,dt:i.dt,radius:.33,vehicleHeight:1.5});
   const spring=f.contact?mw.springForce({compression:f.compression,previous:i.previousCompression[k],dt:i.dt,
    stiffness:spec.stiffness[axle]*175.1268,compressionDamping:spec.shock[axle]*175.1268,extensionDamping:spec.extension[axle]*175.1268,
    valving:spec.valvingInches[axle]*.0254,digression:spec.digression[axle],progression:spec.progression[axle],sway:(i.previousCompression[k]-i.previousCompression[k^1])*spec.sway[axle]*175.1268,blowout:spec.blowout,mass:i.mass}):0;
   const r=C.wheelForce({frame:f,up:i.matrix.up,springForce:spring,fx:i.longitudeForces[k],fy:i.lateralForces[k],velocity:position.velocity,dt:i.dt,mass:i.mass,localArm:arm,compression:f.compression,rideHeight:ride,matrix:i.matrix,worldCG:i.worldCG});
   total=C.add(total,r.force);torque=C.add(torque,r.torque);grounded+=Number(f.contact);correction=Math.max(correction,f.bottomDelta);
   return{f,r,position,spring};
  });
  const yaw=C.dot(i.matrix.up,torque),gain=spec.yawSpeed*(i.driverStyle===1?1.6:1);torque=C.add(torque,C.scale(i.matrix.up,yaw*(gain-1)));
  vec(total,e.force);vec(torque,e.torque);near(correction,e.correction);assert.equal(grounded,e.grounded);
  rows.forEach(({f,r,position,spring},k)=>{const w=e.wheels[k];near(f.compression,w.compression);assert.equal(!f.contact,w.free);
   if(f.contact){near(spring*f.loadFactor,w.load);near(r.lateralSpeed,w.xspeed);near(r.forwardSpeed,w.zspeed);}
   vec(r.force,w.force);const p=(grounded?r.point:position.position).slice();p[1]+=correction;vec(p,w.position);
  });
  if(e.landing){const angular=i.localAngularVelocity.slice();angular[1]*=.5;angular[2]*=.5;vec(C.rotate(angular,i.matrix),e.angularVelocity);}
 }
});

const{NfsVehiclePhysics:P}=require('../js/nfs-physics'),Road=require('../js/authors-road-surface');
test('3D contacts settle on a bank/slope and start at the actual road height',()=>{
 const sample=(x,z)=>({height:3+.04*x+.07*z,normal:C.unit([-.04,1,-.07])});
 const p=new P({carName:'Subaru Impreza WRX STI',physicsKernel:mw,sampleGroundContact:sample});
 near(p.y,3,1e-6);for(let i=0;i<240;i++)p.update(1/120,{brake:true});
 assert(p.state.roadContact.grounded>=3);assert(Math.abs(p.y-sample(p.x,p.z).height)<.15);assert(p.state.pitch<-.04&&p.state.roll>.02);
});
function crest(fps){
 const p=new P({carName:'Subaru Impreza WRX STI',physicsKernel:mw,speedKmh:220,z:270,sampleGroundContact:Road.highway});let air=0,peak=0,landing=false,peakVy=0;
 for(let i=0;i<fps*5;i++){p.update(1/fps,{gas:true});const r=p.state.roadContact;air+=Number(r.airborne)/fps;landing ||=r.landings>0;peak=Math.max(peak,p.y-Road.highway(p.x,p.z).height);peakVy=Math.max(peakVy,p.suspension.vy);}
 return{p,air,peak,landing,peakVy};
}
test('Visible road crest launches through contact forces and lands without scripted upward impulses',()=>{
 const r=crest(60);assert(r.air>.15&&r.peak>.2&&r.landing&&r.peakVy>1,JSON.stringify({air:r.air,peak:r.peak,landing:r.landing,vy:r.peakVy}));
 assert(Number.isFinite(r.p.y)&&Math.abs(r.p.state.pitch)<.5&&Math.abs(r.p.suspension.vy)<1);
});
test('3D crest, flight and landing remain deterministic at mobile 30/60/120 FPS',()=>{
 const a=crest(30),b=crest(60),c=crest(120);for(const r of [a,c])for(const k of ['x','y','z','heading','vForward','vLateral','pitch','roll'])near(r.p.state[k],b.p.state[k],1e-7);
});
test('Air has no tire traction; landing preserves pitch rate and halves local yaw/roll',()=>{
 const p=new P({physicsKernel:mw,y:2,speedKmh:90});p.suspension.pitchRate=.2;p.suspension.rollRate=.3;p.state.yawRate=.8;
 p.update(1/120,{gas:true,right:true});assert(p.state.roadContact.airborne);assert(Object.values(p.mwTires).every(t=>t.load===0&&t.fx===0&&t.fy===0));
 const body=new mw.Suspension(p.profile);body.y=0;body.grounded=0;body.pitchRate=.2;body.rollRate=.3;const pose={...p.state,x:0,z:0,yawRate:.8,steerLeftRad:0,steerRightRad:0};
 C.begin(body,1/120,pose,()=>0,mw.springForce);near(pose.yawRate,.4,1e-9);near(body.rollRate,.15,1e-9);near(body.pitchRate,.2,1e-9);
});
test('Highway terrain has continuous triangle heights/normals and circuit sampling is spatially indexed',()=>{
 for(let z=240;z<380;z+=.17){const a=Road.highway(1,z),b=Road.highway(1,z+1e-5);assert(Math.abs(a.height-b.height)<1e-4);near(Math.hypot(...a.normal),1,1e-10);}
 const track=require('../js/nfs-circuit-race').buildCircuitTrack('rockport_ring',100),surface=Road.circuit(track);
 for(let s=0;s<track.totalLength;s+=3){const p=track.sampleTrackAtS(s),g=surface.sample(p.x,p.z);assert(g.valid&&Number.isFinite(g.height));}
 assert(surface.tests/surface.queries<180);assert(surface.triangles.length>1000);
});
test('Airborne cars cannot collide with another car underneath them',()=>{
 const a=new P({physicsKernel:mw,y:3}),b=new P({physicsKernel:mw});assert.equal(a.getVehicleContact(b),null);a.state.y=0;assert(a.getVehicleContact(b));
});
test('All 43 catalogue suspensions remain bounded through an actual crest and landing',()=>{
 const profiles=require('../js/nfs-physics').VEHICLE_PROFILES;
 for(const name of Object.keys(profiles)){
  const p=new P({carName:name,physicsKernel:mw,speedKmh:220,z:270,sampleGroundContact:Road.highway});let flew=false,peakY=0;
  for(let i=0;i<600;i++){
   p.update(1/120,{gas:false});flew ||=p.state.roadContact.airborne;peakY=Math.max(peakY,p.y);
   assert([p.y,p.state.pitch,p.state.roll,p.suspension.vy].every(Number.isFinite),name);assert(Math.abs(p.state.pitch)<.6&&Math.abs(p.state.roll)<.5,name);
  }
  assert(peakY>1,name+' traverses the visible crest');if(flew)assert(p.state.roadContact.landings>0,name+' landing');assert(Math.abs(p.suspension.vy)<1,name+' settles');
 }
});
test('Each wheel keeps its own road material when straddling asphalt and grass',()=>{
 const p=new P({physicsKernel:mw,speedKmh:70,sampleGroundContact:(x,z)=>({height:0,normal:[0,1,0],surface:x<0?'grass':'asphalt'})});
 p.update(1/120,{gas:true,steer:.5});const w=p.state.roadContact.wheels;
 assert.equal(w.fl.surface,'grass');assert.equal(w.rl.surface,'grass');assert.equal(w.fr.surface,'asphalt');assert.equal(w.rr.surface,'asphalt');
 assert(Math.abs(p.mwTires.fl.fy)<Math.abs(p.mwTires.fr.fy));
});
test('Raised cars clear a finite wall, while a tilted low corner still collides',()=>{
 const p=new P({physicsKernel:mw,y:3,speedKmh:60});p.state.vx=-10;p.state.vz=0;
 const wall={normalX:1,normalZ:0,penetration:.1,wallHeight:1.15,groundHeight:0};
 near(p.resolveWallCollision(wall).closingSpeedMps,0);near(p.state.vx,-10);
 p.state.y=1.5;p.state.pitch=.8;assert(p.resolveWallCollision(wall).closingSpeedMps>0);
});
