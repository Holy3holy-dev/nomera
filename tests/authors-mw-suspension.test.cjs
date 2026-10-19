const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const mw=require('../js/authors-mw-physics'),{NfsVehiclePhysics,resolveVehicleProfile}=require('../js/nfs-physics');
const near=(a,b,tolerance=1e-6)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('MW progressive spring, distinct compression/rebound, digression and blowout fixtures',()=>{
 const p={compression:.04,previous:.04,dt:1/60,stiffness:70050.72,compressionDamping:7005.072,extensionDamping:8756.34,mass:1500,progression:7.5};
 near(mw.springForce(p),3642.63744);
 near(mw.springForce({...p,previous:.039}),4062.94176);
 near(mw.springForce({...p,previous:.041}),3117.25704);
 const fast=mw.springForce({...p,previous:0});assert(fast<mw.springForce({...p,previous:0,digression:0}));
 near(mw.springForce({...p,previous:0,blowout:.01}),3642.63744);
 near(mw.springForce({...p,sway:-10000}),0);
});
test('Four MW springs settle at weight; braking transfers front load and cornering transfers outside',()=>{
 const profile=resolveVehicleProfile('BMW M5 F90'),suspension=new mw.Suspension(profile);
 for(let i=0;i<120;i++)suspension.step(1/60);
 near(suspension.y,0);near(suspension.wheels.reduce((sum,w)=>sum+w.load,0),profile.massKg*9.81,.01);
 const frontStatic=suspension.wheels[0].load;
 for(let i=0;i<90;i++)suspension.step(1/60,{longAccel:-5,latAccel:4});
 assert(suspension.wheels[0].load+suspension.wheels[1].load>frontStatic*2);
 assert(suspension.wheels[0].load>suspension.wheels[1].load);
 assert(suspension.pitch>0&&suspension.roll>0);
});
test('Four independent contacts: curb displacement, loss of contact and bounded bottom out',()=>{
 const s=new mw.Suspension(resolveVehicleProfile('Subaru Impreza WRX STI'));
 s.step(1/60,{groundHeights:{fl:.04}});assert(s.wheels[0].load>s.wheels[1].load);assert(s.wheels[0].offset>0);
 for(let i=0;i<60;i++)s.step(1/60,{groundHeights:{fl:-.8,fr:-.8,rl:-.8,rr:-.8}});
 assert(s.y<0);assert(s.wheels.every(w=>Number.isFinite(w.load)&&w.compression<=w.travel));
 const air=new mw.Suspension(resolveVehicleProfile('BMW M5 F90'));air.step(1/60,{groundHeights:{fl:-5,fr:-5,rl:-5,rr:-5}});
 assert(air.wheels.every(w=>!w.contact&&w.load===0));
 const airborne=new NfsVehiclePhysics({carName:'BMW M5 F90',physicsKernel:mw,speedKmh:80});
 airborne.update(1/60,{gas:true,right:true,groundHeights:{fl:-5,fr:-5,rl:-5,rr:-5}});
 near(airborne.state.longitudinalForceFront,0);near(airborne.state.longitudinalForceRear,0);
});
test('MW controller restores digital input rate, hard-turn hold, release and zero-dt safety',()=>{
 const c=new mw.SteeringController();near(c.step(0).angleDeg,0);
 const first=c.step(1/60,{input:1,gas:1,speedMps:30});assert(first.rateDegPerSec>195*mw.steeringRate(30)*2);
 for(let i=0;i<60;i++)c.step(1/60,{input:1,gas:1,speedMps:30});const held=c.lastMaximum;
 c.step(1/60,{input:1,gas:1,speedMps:90});assert(c.lastMaximum>=held);
 for(let i=0;i<60;i++)c.step(1/60,{input:0,gas:1,speedMps:30});near(c.angle,0);
});
test('MW response reaches sustained turn sooner without changing fixed-step determinism',()=>{
 const car=new NfsVehiclePhysics({carName:'Subaru Impreza WRX STI',speedKmh:100,physicsKernel:mw});
 for(let i=0;i<10;i++)car.update(1/60,{gas:true,right:true});assert(car.state.steerAngleDeg>15);assert(car.state.yawRate>.05);
 assert(car.state.wheelAngles.fl!==0&&car.state.wheelAngles.rr!==0);
 car.update(1/60,{gas:true,handbrake:true});assert(car.state.handbrakePressure>0&&car.state.handbrakePressure<1);
 for(let i=0;i<20;i++)car.update(1/60,{handbrake:true});
 assert(car.mwTires.rr.locked);const before=car.state.wheelAngles.rr;
 car.update(1/60,{handbrake:true});near(car.state.wheelAngles.rr,before);
});
test('Original MW audio bytes, native RPM/grain maps and loop bounds are intact',()=>{
 const base='assets/audio/mw/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json')),provenance=JSON.parse(fs.readFileSync(base+'provenance.json'));
 for(const file of provenance.files){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base+file.file)).digest('hex'),file.sha256);assert(file.source.offset%2048===0);}
 for(const family of Object.values(manifest.families))for(const phase of ['accel','decel']){
  const item=family[phase],g=item.gin;assert.equal(g.rpmSamplePositions.length,51);assert(g.rpmMax>g.rpmMin);
  assert(g.rpmSamplePositions.every(p=>p>=0&&p<=item.samples));assert(g.grainSamplePositions.every((p,i,a)=>p>=0&&p<=item.samples&&(i===0||p>a[i-1])));
 }
 for(const entry of Object.values(manifest.effects))for(const item of Array.isArray(entry)?entry:[entry])if(item.loop)assert(item.loop.end>item.loop.start&&item.loop.end<=item.samples);
});
