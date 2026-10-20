const test=require('node:test'),assert=require('node:assert/strict');
const mw=require('../js/authors-mw-physics'),{NfsVehiclePhysics:P,VEHICLE_PROFILES,buildVehicleSpec}=require('../js/nfs-physics');
const fixture=require('./fixtures/mw-driveline-golden.json');
const near=(a,b,e=Math.max(.004,Math.abs(b)*3e-5))=>assert(Math.abs(a-b)<=e,`${a} != C++ ${b}`);
for(const{name,input,expected}of fixture.differential)test('MW C++ differential: '+name,()=>{
 mw.differential(input).forEach((v,i)=>near(v,expected[i]));
});
for(const{name,input:i,expected}of fixture.drive)test('MW C++ four-wheel drive: '+name,()=>{
 const wheels=i.omega.map((omega,k)=>({omega,load:i.contactMask&(1<<k)?4000:0,slip:i.slip,lateralSpeed:i.lateral}));
 const r=mw.driveControl({torque:i.transmission?i.torque:0,frontShare:i.frontShare,factor:i.factor,wheels,
  burnout:{state:i.burnoutState,traction:i.burnoutTraction},steer:i.steer,forward:i.forward,lateral:i.bodyLateral});
 for(let k=0;k<4;k++){
  // ApplyDriveTorque rejects locked tires downstream; Tire.step owns this gate
  // in NOMERA too. Compare the torque that actually reaches the source tire.
  near(i.lockedMask&(1<<k)?0:r.torques[k],expected.torques[k]);near(r.boost[k],expected.boost[k]);
 }
});
test('AWD transfers torque away from the faster axle and preserves source airborne policy',()=>{
 const wheels=[200,200,80,80].map(omega=>({omega,load:1,slip:0,lateralSpeed:0}));
 const front=mw.driveControl({torque:1000,frontShare:.5,factor:[.7,.75,.75],wheels});assert(front.centerSplit[0]<.5);
 wheels.forEach((w,i)=>{w.omega=i<2?80:200});const rear=mw.driveControl({torque:1000,frontShare:.5,factor:[.7,.75,.75],wheels});assert(rear.centerSplit[0]>.5);
 wheels[0].load=wheels[1].load=0;
 mw.driveControl({torque:1000,frontShare:.41,factor:[.7,.75,.75],wheels}).centerSplit.forEach((v,k)=>near(v,[.41,.59][k]));
});
test('Host adaptation conserves total torque when wheels or axles counter-rotate',()=>{
 for(const omega of [[100,100,-80,-80],[100,-80,100,-80]]){
  const options={torque:1000,frontShare:.5,factor:[.8,.8,.8],wheels:omega.map(omega=>({omega,load:1,slip:0,lateralSpeed:0}))};
  const original=mw.driveControl(options),safe=mw.driveControl({...options,conserveTorque:true});
  assert(original.torques.reduce((a,b)=>a+b)>1000);near(safe.torques.reduce((a,b)=>a+b),1000);assert(safe.normalized);
 }
});
test('All catalogue profiles send torque only to the specified driven axles',()=>{
 for(const[name,spec]of Object.entries(VEHICLE_PROFILES)){
  const p=new P({carName:name,physicsKernel:mw});for(let i=0;i<120;i++)p.update(1/60,{gas:true});
  const d=p.state.driveline;assert.equal(d.type,spec.drivetrain,name);near(d.frontShare+d.rearShare,1);
  if(d.type==='FWD'){assert.equal(d.rearShare,0);assert.deepEqual(d.torques.slice(2),[0,0]);}
  else if(d.type==='RWD'){assert.equal(d.frontShare,0);assert.deepEqual(d.torques.slice(0,2),[0,0]);}
  else{assert(d.frontShare>0&&d.rearShare>0,name);assert(d.factors[2]>0,name);}
  assert(Object.values(p.state.wheelAngles).every(v=>Number.isFinite(v)&&v!==0),name+' free wheels still roll');
 }
});
test('Drive overrides cannot silently leave AWD with a RWD/FWD torque split',()=>{
 for(const drivetrain of ['FWD','RWD','AWD']){
  const s=buildVehicleSpec('BMW M3 GTR',{drivetrain});assert.equal(s.drivetrain,drivetrain);
  assert.equal(s.torqueSplit,drivetrain==='FWD'?1:drivetrain==='RWD'?0:.5);
 }
 for(const[torqueSplit,drivetrain]of [[0,'RWD'],[1,'FWD'],[.3,'AWD']]){
  const s=buildVehicleSpec('BMW M3 GTR',{drivetrain:'RWD',torqueSplit});assert.equal(s.drivetrain,drivetrain);assert.equal(s.torqueSplit,torqueSplit);
 }
});
test('AWD retains immediate steering, handbrake recovery and fixed-step mobile determinism',()=>{
 const runs=[30,60,120].map(fps=>{
  const p=new P({carName:'Subaru Impreza WRX STI',physicsKernel:mw,speedKmh:90});let peakYaw=0,steer=0;
  for(let i=0;i<fps*4;i++){const t=i/fps;p.update(1/fps,{gas:t<1.2,steer:t<.3?.7:t<.6?-.5:0,handbrake:t>=.1&&t<.2});peakYaw=Math.max(peakYaw,Math.abs(p.yawRate));if(t<.1)steer=Math.max(steer,Math.abs(p.state.steerAngleDeg));}
  assert(steer>5&&peakYaw<2.5);assert(Math.abs(p.yawRate)<.1);return p;
 });
 for(const p of [runs[0],runs[2]])for(const k of ['x','z','heading','vForward','vLateral'])near(p.state[k],runs[1].state[k],1e-7);
});
