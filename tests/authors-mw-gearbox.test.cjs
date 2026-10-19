const test=require('node:test'),assert=require('node:assert/strict'),mw=require('../js/authors-mw-physics');
const{NfsVehiclePhysics:P,VEHICLE_PROFILES:profiles}=require('../js/nfs-physics'),golden=require('./fixtures/mw-gearbox-golden.json');
const near=(a,b,label='')=>assert(Math.abs(a-b)<=Math.max(3e-6,Math.abs(b)*5e-6),`${label}: ${a} != ${b}`);
const states=['ENGAGED','ENGAGING','DISENGAGED'];
const spec=golden.shiftPoints[0].spec;
const gearbox=()=>new mw.Gearbox({engine:spec,gears:spec.gears,shifts:mw.shiftPoints(spec,spec.gears),shiftSpeed:spec.shiftSpeed});
for(const{name,spec:s,count,expected:e}of golden.shiftPoints)test('MW C++ shift point search: '+name,()=>{
 const a=mw.shiftPoints(s,s.gears,count);assert.equal(a.ok,e.ok);
 for(const key of ['up','down'])a[key].forEach((v,i)=>near(v,e[key][i],key+i));
 // The induction fixture numerically coincides with the stock curve in the
 // pinned source's swapped-argument call. Full induction is not claimed here.
});
for(const{name,input:i,expected:e}of golden.potential)test('MW C++ shift potential: '+name,()=>near(gearbox().findPotential(i.gear,i.rpm,i.gas),e));
for(const{name,input:i,expected:e}of golden.operations)test('MW C++ gearbox operation: '+name,()=>{
 const g=gearbox();Object.assign(g,{gear:i.gear,timer:i.timer,sportTimer:i.sportTimer,potential:i.potential});g.clutch.state=states[i.clutchState];
 let result=-1;
 if(i.mode===1)result=Number(g.changeGear(i.target,{staging:i.staging}));
 else if(i.mode===2)result=Number(g.sportShift(i.target));
 else g.stepShifting(i.dt,{automatic:i.automatic,override:i.override,input:i.inputPresent,staging:i.staging,gas:i.gas,transmissionRpm:i.transmissionRpm,
  contacts:[0,1,2,3].map(k=>k!==i.airborneWheel),slips:[i.slip,0,0,0]});
 assert.equal(result,e.result);assert.equal(g.gear,e.gear);near(g.timer,e.timer);near(g.sportTimer,e.sportTimer);
 assert.equal(g.potential,e.potential);assert.equal(g.clutch.state,states[e.clutchState]);assert.equal(g.shiftingUp,e.shiftingUp);
});
for(const{name,input:i,expected:e}of golden.clutch)test('MW C++ persistent clutch: '+name,()=>{
 const c=new mw.Clutch();Object.assign(c,{state:states[i.state],time:i.time,engageTime:i.engageTime});
 if(i.action===1)c.disengage();if(i.action===2)c.engage(i.actionTime);if(i.action===3)c.reset();
 near(c.update(i.dt),e.ratio);assert.equal(c.state,states[e.state]);near(c.time,e.time);near(c.engageTime,e.engageTime);
});
for(const{name,input:i,expected:e}of golden.smoothRpm)test('MW C++ displayed RPM: '+name,()=>near(mw.smoothRPM(i),e));
for(const{name,input:i,expected:e}of golden.engineInertia)test('MW C++ flywheel inertia: '+name,()=>near(mw.engineInertia(i.flywheelMass,i.loaded),e));
for(const{name,input:i,expected:e}of golden.guess)test('MW C++ match speed gear/RPM: '+name,()=>{
 const g=gearbox();g.radius=(i.frontRadius+i.rearRadius)*.5;g.finalDrive=i.finalGear;
 near(g.guessRPM(i.speedMps,i.gear),e.rpm);assert.equal(g.guessGear(i.speedMps),e.gear);
});
const car=opts=>new P({carName:'Subaru Impreza WRX STI',physicsKernel:mw,...opts});
test('MW gearbox launches every catalogue car, preserves ordered upshifts and nitro',()=>{
 for(const name of Object.keys(profiles)){
  const p=car({carName:name});let old=p.gear,changes=0;
  for(let i=0;i<900;i++){
   p.update(1/60,{gas:true,nitro:i>=600&&i<720});
   assert(p.gear>=old&&p.gear<=p.profile.gearRatios.length-2,`${name} forward gears progress`);
   if(p.gear!==old){changes++;old=p.gear;}
   for(const key of ['rpm','engineRpm','transmissionRpm','clutchRatio','speedKmh'])assert(Number.isFinite(p.state[key]),`${name} ${key}`);
  }
  assert(changes>=1&&p.speedKmh>100,`${name} launch ${p.speedKmh}`);
  assert(p.state.nitroLevel<100&&p.state.nitroLevel>0);
 }
});
test('MW fixed 120Hz gearbox sequence agrees at 30/60/120 rendered FPS',()=>{
 const rows=[30,60,120].map(fps=>{
  const p=car();for(let i=0;i<fps*14;i++)p.update(1/fps,{gas:i<fps*10,nitro:i>=fps*6&&i<fps*8,brake:i>=fps*11,steer:i>=fps*4&&i<fps*4.5?.3:0});
  return[p.x,p.z,p.speedKmh,p.rpm,p.gear,p.state.nitroLevel,p.state.clutchRatio,p.state.shiftTimer];
 });
 rows.slice(1).forEach(row=>row.forEach((v,i)=>near(v,rows[0][i],'FPS '+i)));
});
test('MW shift timer only gates another change; clutch engages sooner and engine RPM falls',()=>{
 const p=car({speedKmh:60,transmissionMode:'manual'}),g=p.mwGearbox;
 assert(p.shiftUp());const initialTimer=g.timer,initialRpm=p.rpm;
 p.update(1/120,{gas:true});assert.equal(g.clutch.state,'ENGAGING');assert(p.state.clutchRatio<.3);
 for(let i=0;i<36;i++)p.update(1/120,{gas:true});
 assert.equal(g.clutch.state,'ENGAGED');near(p.state.clutchRatio,1);
 assert(g.timer>0&&g.timer<initialTimer);assert(p.rpm<initialRpm);
});
test('MW slip/contact shift gate never filters steering or nitro input',()=>{
 for(const variant of ['slip','air']){
  const p=car({speedKmh:60}),g=p.mwGearbox;g.potential=2;
  if(variant==='slip')p.mwTires.fl.slip=4;else p.mwTires.fl.load=0;
  const gear=p.gear;p.step(1/120,{gas:true,steer:1,nitro:true});
  assert.equal(p.gear,gear);assert(p.state.steerAngleDeg>0&&p.state.isNitroActive);
 }
});
test('MW manual held input shifts once, release permits next request, neutral disconnects',()=>{
 const p=car({speedKmh:60,transmissionMode:'manual'}),old=p.gear;
 for(let i=0;i<120;i++)p.update(1/60,{gas:true,shiftUp:true});assert.equal(p.gear,old+1);
 p.update(1/60,{gas:true});p.mwGearbox.potential=0;p.update(1/60,{gas:true,shiftUp:true});assert.equal(p.gear,old+2);
 p.state.gear=0;p.update(1/60,{});near(p.state.wheelDriveTorqueNm,0);
 // Source Disengage is deliberately a no-op while already ENGAGING.
 for(let i=0;i<30;i++)p.update(1/60,{});assert.equal(p.state.clutchState,'DISENGAGED');
});
test('MW match-speed spawn and reset select gear without a stale shift/clutch state',()=>{
 const p=car({speedKmh:180});assert(p.gear>1&&p.rpm>p.profile.idleRpm);
 p.shiftUp();p.reset({speedKmh:0});assert.equal(p.gear,1);near(p.state.shiftTimer,0);near(p.state.sportShiftTimer,0);
 assert.equal(p.mwGearbox.clutch.state,'ENGAGED');assert.equal(p.mwGearbox.potential,0);
 p.update(0,{gas:true,shiftUp:true});assert.equal(p.gear,1);
});
test('MW host feeds wheel deceleration into a single multi-gear downshift',()=>{
 const p=car({speedKmh:230}),old=p.gear;assert(old>=5);
 Object.assign(p.state,{vForward:10,vLateral:0,speedMps:10,speedKmh:36,vz:10,vx:0});
 Object.values(p.mwTires).forEach(t=>{t.omega=10/p.profile.wheelRadius;t.roadSpeed=10});
 p.update(1/60,{gas:true});assert(p.gear<=old-2&&p.gear>=1);assert(p.state.shiftTimer>0);
 assert(p.rpm>p.state.transmissionRpm,'displayed engine RPM falls gradually after a rapid slowdown');
});
