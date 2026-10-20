const test=require('node:test'),assert=require('node:assert/strict'),mw=require('../js/authors-mw-physics'),golden=require('./fixtures/mw-engine-golden.json');
const states=['ENGAGED','ENGAGING','DISENGAGED'];
const near=(a,b,label='')=>assert(Math.abs(a-b)<=Math.max(.004,Math.abs(b)*3e-5),`${label}: ${a} != ${b}`);
for(const{name,spec:p,input:i,steps,expected}of golden.cases)test('MW C++ angular engine: '+name,()=>{
 const e=new mw.AngularEngine({engine:p,gears:p.gears,powertrain:{...p,frontShare:p.torqueSplit,finalDrive:p.finalGear}}),clutch=new mw.Clutch();
 for(const key of ['angularVelocity','angularAcceleration','transmissionVelocity','clutchRpmDiff','rpm'])e[key]=i[key];
 Object.assign(clutch,{state:states[i.clutchState],time:i.clutchTime,engageTime:i.clutchEngageTime});
 const wheels=i.wheels.map((omega,k)=>({omega,load:i.contacts[k]?1:0,slip:i.slips[k]}));
 steps.forEach((dt,j)=>{
  e.step(dt,{...i,gas:i.throttle,wheels,clutch});const expectedState=expected[j];
  for(const key of ['angularVelocity','angularAcceleration','transmissionVelocity','clutchRpmDiff','rpm','driveTorque','driveTorqueAtEngine'])near(e[key],expectedState[key],key+' step '+j);
  assert.equal(e.engineBraking,expectedState.engineBraking);assert.equal(clutch.state,states[expectedState.clutchState]);
  near(clutch.time,expectedState.clutchTime);near(clutch.engageTime,expectedState.clutchEngageTime);
  wheels.forEach((w,k)=>near(w.omega,expectedState.wheels[k],'wheel '+k));
 });
});
for(const{name,input:i,expected:e}of golden.engineTorque)test('MW C++ engine torque: '+name,()=>near(mw.engineOutputTorque({...mw.REFERENCE,torque:i.torqueFtlb},i.rpm,{...i,ftlb:true}),e));
for(const{name,input:i,expected:e}of golden.brakingTorque)test('MW C++ engine braking: '+name,()=>near(mw.brakingTorque(i.engineTorqueNm,i.rpm,mw.REFERENCE,i.table),e));
for(const{name,input:i,steps,expected}of golden.induction)test('MW C++ induction: '+name,()=>{
 const n=new mw.Induction(i);n.spool=i.spool;n.psi=i.currentPsi;
 steps.forEach((dt,j)=>{n.step(dt,i);for(const key of ['spool','psi','boost'])near(n[key],expected[j][key],key+' step '+j);});
});
const{NfsVehiclePhysics:P,VEHICLE_PROFILES:profiles}=require('../js/nfs-physics');
const car=options=>new P({carName:'Subaru Impreza WRX STI',physicsKernel:mw,...options});
test('MW neutral revs independently of wheels and engages through angular slip',()=>{
 const p=car({transmissionMode:'manual'});p.state.gear=0;
 for(let i=0;i<24;i++)p.update(1/120,{gas:true});
 assert(p.state.engineRpm>p.state.transmissionRpm+1000);near(p.speedKmh,0);near(p.state.wheelDriveTorqueNm,0);
 assert(p.shiftUp());let slip=0,nonScalar=0;
 for(let i=0;i<24;i++){
  p.update(1/120,{gas:true});slip=Math.max(slip,Math.abs(p.state.engineRpm-p.state.transmissionRpm));
  nonScalar=Math.max(nonScalar,Math.abs(p.state.angularEngine.driveTorque-p.state.engineTorqueNm*p.state.clutchRatio));
 }
 assert(slip>500&&nonScalar>100);assert(p.speedKmh>1);
});
test('MW engine and induction reset completely; catalogue NA engines stay naturally aspirated',()=>{
 const p=car();for(let i=0;i<360;i++)p.update(1/120,{gas:true,nitro:true});
 assert(p.state.angularEngine&&p.mwInduction.spool>0);p.reset({speedKmh:0});
 assert.equal(p.mwEngine.clutchRpmDiff,0);assert.equal(p.mwEngine.angularAcceleration,0);assert.equal(p.mwInduction.spool,0);
 near(p.mwEngine.angularVelocity,p.profile.idleRpm*Math.PI/30);assert.equal(p.state.angularEngine,undefined);
 for(const[name,profile]of Object.entries(profiles))if(profile.inductionType==='na'){
  const n=car({carName:name});for(let i=0;i<120;i++)n.update(1/60,{gas:true});near(n.mwInduction.boost,0,name);near(n.state.turboPsi,0,name);
 }
});
test('MW airborne engine free-revs without creating chassis traction',()=>{
 const p=car({speedKmh:90});const speed=p.speedKmh;
 for(let i=0;i<60;i++){
  p.update(1/120,{gas:true,nitro:true,groundHeights:{fl:-5,fr:-5,rl:-5,rr:-5}});
  assert(Object.values(p.mwTires).every(t=>t.load===0&&t.fx===0&&t.fy===0));
  assert(p.state.engineRpm<=p.profile.redlineRpm+.01);
 }
 assert(p.speedKmh<=speed);assert(Object.values(p.mwTires).some(t=>Math.abs(t.omega)>10));
});
test('MW clutch feedback preserves brake-to-reverse and return-to-drive across catalogue',()=>{
 for(const name of Object.keys(profiles)){
  const p=car({carName:name});for(let i=0;i<120;i++)p.update(1/60,{brake:true});
  assert(p.gear===-1&&p.state.vForward<0,name+' reverse');
  for(let i=0;i<240;i++)p.update(1/60,{gas:true});assert(p.gear>=1&&p.state.vForward>0,name+' forward');
  assert(Number.isFinite(p.mwEngine.angularVelocity)&&Number.isFinite(p.state.angularEngine.roadTorque));
 }
});
test('MW no-fuel engine cannot launch or spend NOS',()=>{
 const p=car({fuelCurrent:0});for(let i=0;i<120;i++)p.update(1/120,{gas:true,nitro:true});
 near(p.speedKmh,0);near(p.state.nitroLevel,100);near(p.state.wheelDriveTorqueNm,0);
 assert(p.state.steerAngleDeg===0&&p.mwEngine.rpm>=p.profile.idleRpm);
});
