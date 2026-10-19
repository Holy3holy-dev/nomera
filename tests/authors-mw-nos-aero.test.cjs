const test=require('node:test'),assert=require('node:assert/strict');
const mw=require('../js/authors-mw-physics'),{NfsVehiclePhysics:P,VEHICLE_PROFILES:profiles}=require('../js/nfs-physics');
const golden=require('./fixtures/mw-nos-aero-golden.json');
const near=(a,b,label='')=>assert(Math.abs(a-b)<=Math.max(2e-6,Math.abs(b)*4e-6),`${label}: ${a} != ${b}`);
for(const{name,input:i,expected:e}of golden.nos)test('MW C++ NOS: '+name,()=>{
 const n=new mw.Nitrous({capacitySeconds:i.capacitySeconds,boost:i.boost});n.tank=i.tank;n.timer=i.timer;
 near(n.step(i.dt,{...i,speedMps:i.speedMph/2.23699,gear:i.gear-1}),e.multiplier,'multiplier');
 near(n.tank,e.tank,'tank');near(n.timer,e.timer,'timer');
});
for(const{name,input:i,expected:e}of golden.aero)test('MW C++ aerodynamics: '+name,()=>{
 const a=mw.aerodynamics(i);assert.equal(a.forces.length,e.forces.length);
 e.forces.forEach((f,j)=>['force','point'].forEach(key=>f[key].forEach((v,k)=>near(a.forces[j][key][k],v,`${key}[${j}][${k}]`))));
});
test('MW nitrous fixed-step tank, immediate torque off, cooldown, recharge and empty fuel',()=>{
 const p=new P({carName:'BMW M5 F90',speedKmh:130,physicsKernel:mw}),drain=p.profile.nitroDrainRate;
 for(let i=0;i<60;i++)p.update(1/60,{gas:true,nitro:true});
 near(p.state.nitroLevel,100-drain);assert(p.state.isNitroActive&&p.state.nosMultiplier>1);
 p.update(1/60,{gas:true});assert(!p.state.isNitroActive);near(p.state.nosMultiplier,1);
 const level=p.state.nitroLevel;for(let i=0;i<60;i++)p.update(1/60,{gas:true});near(p.state.nitroLevel,level);
 for(let i=0;i<120;i++)p.update(1/60,{gas:true});assert(p.state.nitroLevel>level);
 p.state.fuelCurrent=0;p.update(1/60,{gas:true,nitro:true});assert(!p.state.isNitroActive);
});
test('MW short handbrake pulses stay controlled across catalogue and dry/rain',()=>{
 for(const name of Object.keys(profiles))for(const weather of ['dry','rain'])for(const speed of [60,100,160]){
  const p=new P({carName:name,speedKmh:speed,physicsKernel:mw}),straight=new P({carName:name,speedKmh:speed,physicsKernel:mw});p.setWeather(weather);straight.setWeather(weather);
  let beta=0,yaw=0,peakSpeed=speed,straightPeak=speed;
  for(let i=0;i<360;i++){
   const oldYaw=p.yawRate;p.update(1/60,{gas:i<90,steer:i<90?1:0,handbrake:i<90&&i%12<6});
   straight.update(1/60,{gas:i<90});straightPeak=Math.max(straightPeak,straight.speedKmh);
   if(p.state.handbrakeAssistTorque)assert(p.state.handbrakeAssistTorque*oldYaw<=1e-6,'assist only removes rotation');
   beta=Math.max(beta,Math.abs(p.state.chassisSlipAngle)*180/Math.PI);yaw=Math.max(yaw,Math.abs(p.yawRate));peakSpeed=Math.max(peakSpeed,p.speedKmh);
   assert(Number.isFinite(p.speedKmh)&&Math.abs(p.state.y)<.3,`${name} body stable`);
  }
  assert(beta<55&&yaw<2,`${name} ${weather} ${speed}: beta ${beta}, yaw ${yaw}`);
  assert(peakSpeed<=straightPeak+1e-6,`${name}: pulsed turn cannot accelerate beyond straight-line control ${peakSpeed} > ${straightPeak}`);
  assert(Math.abs(p.yawRate)<.1,`${name}: release settles`);
 }
});
test('MW NOS and pulsed handbrake agree at 30/60/120 rendered FPS',()=>{
 const rows=[30,60,120].map(fps=>{
  const p=new P({carName:'Nissan Silvia S15 Spec-R',speedKmh:100,physicsKernel:mw});
  for(let i=0;i<fps*3;i++)p.update(1/fps,{gas:true,steer:i<fps*1.5?1:0,handbrake:i<fps*1.5&&i%(fps/5)<fps/10,nitro:i>=fps*2});
  return[p.x,p.z,p.heading,p.yawRate,p.state.nitroLevel];
 });
 rows.slice(1).forEach(r=>r.forEach((v,i)=>near(v,rows[0][i],'FPS '+i)));
});
test('MW rotation of body axes cannot add world speed in force-free airborne motion',()=>{
 const kernel={...mw,aerodynamics:()=>({downforce:0,drag:[0,0,0],forces:[]})};
 const p=new P({carName:'Subaru Impreza WRX STI',speedKmh:160,physicsKernel:kernel,stabilityAssist:false});
 p.state.yawRate=8;p.state.vLateral=12;p.suspension.y=5;p.suspension.wheels.forEach(w=>{w.contact=false;w.load=0});
 const speed=Math.hypot(p.state.vForward,p.state.vLateral);
 p.update(1/30,{});near(Math.hypot(p.state.vx,p.state.vz),speed,'world speed');
 assert.equal(p.state.handbrakeAssistTorque,0,'no handling assist in air');
});
