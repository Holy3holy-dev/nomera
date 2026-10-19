const test=require('node:test'),assert=require('node:assert/strict');
const mw=require('../js/authors-mw-physics'),{NfsVehiclePhysics:P,VEHICLE_PROFILES}=require('../js/nfs-physics');
const f=require('./fixtures/mw-tc-drift-golden.json');
const near=(a,b,e=3e-5)=>assert(Math.abs(a-b)<e,`${a} != C++ ${b}`);

test('MW drift transitions, rear friction and damping match 13 compiled C++ fixtures',()=>{
 for(const{input:i,expected:e}of f.drift){
  const c=new mw.DriftController();c.state=i.state;c.value=i.value;
  const r=c.step(i.dt,{speed:i.speed,beta:i.slipDegrees*Math.PI/180,yawRate:i.yawRate,gas:i.gas,steer:i.steer,
   averageSteer:i.averageSteer,handbrake:i.ebrake,grounded:i.groundWheels,staging:!!(i.flags&1)});
  assert.equal(r.state,e.state);near(r.value,e.value);near(r.rearFriction,e.rearFriction);
  // The sharp 90-degree endpoint differs by <8e-8 rad in float32/double.
  near(-i.yawRate*r.dampingRate*2000,e.dampingTorque,Math.abs(i.slipDegrees)===90?.03:.003);
 }
});

test('MW axle traction control and burnout bias match 11 compiled C++ fixtures',()=>{
 for(const{input:i,expected:e}of f.traction){
  const wheels=Array.from({length:4},(_,n)=>({omega:100,slip:i.slip,lateralSpeed:i.lateral,load:(n%2?i.groundRight:i.groundLeft)?4000:0}));
  const r=mw.driveControl({torque:1000,frontShare:i.frontSplit,wheels,burnout:{state:i.burnoutState,traction:i.burnoutTraction},
   steer:i.steer,forward:i.bodyForward,lateral:i.bodyLateral,factor:[.4,.4]});
  for(let n=0;n<4;n++){near(r.torques[n],e.tires[n].driveTorque,.003);near(r.boost[n],e.tires[n].tractionBoost);}
 }
});

test('MW burnout initiation, integer side selection, timers and cancellation match compiled C++',()=>{
 for(const{input:i,expected:e}of f.burnout){
  const b=new mw.Burnout();Object.assign(b,{state:i.state,time:i.time,allow:i.allow,traction:i.traction});
  b.step(i.dt,{speedMph:i.speedMph,slip:i.slip,wheel:i.wheel,beta:i.slipDegrees*Math.PI/180});
  assert.equal(b.state,e.state);for(const key of ['time','allow','traction'])near(b[key],e[key]);
 }
});

test('MW yaw boost and tune-before-drift frame ordering match compiled C++',()=>{
 for(const{input:i,expected:e}of f.yawBoost)near(mw.yawFrictionBoost({beta:i.slipRadians,handbrake:i.ebrake,speed:i.speed,limit:i.yawControl,grade:i.grade}),e);
 for(const row of f.tuneOrder){
  const d=new mw.DriftController({yawControl:[.5,1,1.5]});d.state=2;d.value=row.inputPreviousDriftValue;
  const r=d.step(1/60,{speed:30,maxSpeed:80,beta:Math.PI/6,yawRate:-1,steer:.5,gas:1});
  near(r.rearTractionBoost,row.expected.tires[2].tractionBoost);near(r.rearFriction,row.expected.rearFriction);
  near(r.value,row.expected.value);assert.equal(r.state,row.expected.state);
 }
});

function maneuver(fps,side=1,name='Nissan Silvia S15 Spec-R',weather='dry'){
 const p=new P({carName:name,speedKmh:100,physicsKernel:mw,weather});let peak=0,peakYaw=0,entry=false;
 for(let i=0;i<fps*5;i++){
  const t=i/fps;p.update(1/fps,{gas:t<1.8,handbrake:t>=.3&&t<.5,steer:t<.6?side*.8:t<.9?-side*.6:0});
  peak=Math.max(peak,Math.abs(p.state.chassisSlipAngle));peakYaw=Math.max(peakYaw,Math.abs(p.yawRate));entry ||=p.state.driftValue>.18;
 }
 return{p,peak,peakYaw,entry};
}

test('MW drift remains responsive, mirrored and deterministic at mobile 30/60/120 FPS',()=>{
 const a=maneuver(30),b=maneuver(60),c=maneuver(120),mirror=maneuver(60,-1);
 for(const row of[a,c])for(const key of['x','z','heading','vForward','vLateral'])near(row.p.state[key],b.p.state[key],1e-7);
 near(b.p.x,-mirror.p.x,1e-7);near(b.p.z,mirror.p.z,1e-7);
 assert(b.entry&&b.peak>18*Math.PI/180);assert(b.peakYaw<2.5);
 assert(Math.abs(b.p.yawRate)<.05&&Math.abs(b.p.state.vLateral)<.1);assert.equal(b.p.state.isDrifting,false);
});

test('MW TC consumes prior wheel telemetry, releases immediately and never filters steering',()=>{
 const p=new P({carName:'Nissan Silvia S15 Spec-R',speedKmh:36,physicsKernel:mw});
 p.state.gear=2;
 for(const t of Object.values(p.mwTires)){t.slip=40;t.lateralSpeed=20;}
 p.step(1/120,{gas:true,steer:1});
 assert(p.state.tractionControl.active);assert(p.state.tractionControl.control[3]<p.state.tractionControl.control[2]);
 assert(p.state.steerAngleDeg>0);assert(p.state.tractionControl.boost[2]>1);
 for(const t of Object.values(p.mwTires)){t.slip=0;t.lateralSpeed=0;}
 p.step(1/120,{gas:true,steer:-1});assert.equal(p.state.tractionControl.active,false);
 assert.deepEqual(p.state.tractionControl.control,[1,1,1,1]);
 p.reset();assert.equal(p.mwBurnout.state,0);assert.equal(p.mwDrift.value,0);
});

test('MW drift across all 43 profiles and weather preserves finite motion and recovers on release',()=>{
 for(const name of Object.keys(VEHICLE_PROFILES))for(const weather of ['dry','rain']){
  const{p,peakYaw}=maneuver(60,1,name,weather);
  assert(Number.isFinite(p.speedKmh)&&Number.isFinite(p.x),`${name} ${weather}`);
  assert(peakYaw<4,`${name} ${weather} spin ${peakYaw}`);
  assert(Math.abs(p.state.roll)<.2&&Math.abs(p.yawRate)<.1,`${name} ${weather} recovery`);
 }
});

test('MW grounded drift damping is dissipative; zero dt, airborne, reverse and handbrake control stay bounded',()=>{
 const d=new mw.DriftController();assert.equal(d.step(0).value,0);
 for(const beta of[-.5,.5])for(const yawRate of[-2,2]){
  d.state=2;d.value=1;const r=d.step(1/120,{beta,yawRate,speed:30,gas:1});
  assert((-yawRate*r.dampingRate)*yawRate<=0);
  d.state=2;d.value=1;near(d.step(1/120,{beta,yawRate,speed:30,gas:1,grounded:0}).dampingRate,0);
 }
 const p=new P({physicsKernel:mw});for(let i=0;i<180;i++)p.update(1/60,{brake:true,handbrake:false,steer:.4});
 assert.equal(p.state.chassisSlipAngle,0);assert.equal(p.state.driftValue,0);
 p.update(1/60,{gas:true,brake:true,handbrake:true});assert.equal(p.state.isNitroActive,false);
});
