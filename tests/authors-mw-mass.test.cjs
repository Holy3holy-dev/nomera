const test=require('node:test'),assert=require('node:assert/strict');
const mw=require('../js/authors-mw-physics'),M=mw.Mass,{NfsVehiclePhysics:P,VEHICLE_PROFILES:profiles,resolveVehicleProfile:resolve}=require('../js/nfs-physics');
const near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
for(const row of require('./fixtures/mw-cog-golden.json').cases)test('Pinned C++ SetCOG: '+row.name,()=>M.sourceCOG(row).forEach((v,i)=>near(v,row.expected[i])));
test('49 selectable models resolve to distinct intended profiles and engine types',()=>{
 const voices=require('../js/authors-engine-voices'),catalogue=require('./fixtures/wheel-model-catalogue.json');
 assert.equal(Object.keys(profiles).length,49);
 for(const car of catalogue){const p=resolve(car.name);assert(voices.models[p.id],car.name+' voice classification');assert(p.massKg>900&&p.wheelbase>2.3);}
 assert.equal(resolve('Maserati GranTurismo').drivetrain,'RWD');assert.equal(resolve('Porsche Panamera Turbo').id,'panamera');assert(resolve('Porsche Panamera Turbo').wheelbase>2.9);
 assert.equal(voices.profile('', 'BMW M5 E60 V10','m5e60').type,'V10');assert.equal(voices.profile('', 'Toyota Land Cruiser 300','lc300').type,'V6 turbo');
 assert.equal(voices.profile('', 'Mercedes-Benz SLR McLaren','mclaren').key,'slr');assert.equal(voices.profile('', 'Maserati GranTurismo','granturismo').type,'V8');
});
test('Source tensor scales and converted CG apply to actual 3D moments; classic remains separate',()=>{
 const p=new P({carName:'Ford Mustang GT',physicsKernel:mw}),s=p.suspension,m=p.massProperties;
 assert.deepEqual(m.tensor,[1,3.5,1]);near(p.state.yawInertia,m.inertia[1]);near(p.profile.frontWeightBias,.53);
 near(s.cgHeight,m.rollCenter-s.staticCompression);
 for(const w of s.wheels)near(w.queryY,m.ride[w.front?0:1]-w.neutral);
 p.update(1/120,{gas:true,steer:1});
 assert.deepEqual(p.state.roadContact.inertia,m.inertia);assert.equal(p.state.roadContact.centerOfGravity[2],0);
 s.grounded=0;s.y=3;p.update(1/120,{});near(p.state.roadContact.centerOfGravity[2],p.profile.wheelbase*(.5-p.profile.frontWeightBias));
 const classic=new P({carName:'Ford Mustang GT'});assert(!classic.massProperties);assert(classic.state.yawInertia<p.state.yawInertia);
});
test('Angular inertia controls impulse and gyroscopic exchange conserves instantaneous energy',()=>{
 const I=[1200,6000,550],omega=[.4,.7,-.2],torque=[300,40,-60],a=M.angularAcceleration(I,omega,torque);
 const power=omega.reduce((sum,w,i)=>sum+w*I[i]*a[i],0),external=omega.reduce((sum,w,i)=>sum+w*torque[i],0);near(power,external);
 M.angularAcceleration(I,[0,0,0],torque).forEach((v,i)=>near(v,torque[i]/I[i]));
});
function circle(name,fps){const p=new P({carName:name,physicsKernel:mw,speedKmh:100});let yaw=0,roll=0,reversed=null;
 for(let i=0;i<fps*2;i++){p.update(1/fps,{throttle:.25,steer:i<fps?1:-1});yaw=Math.max(yaw,Math.abs(p.yawRate));roll=Math.max(roll,Math.abs(p.state.roll));if(i>=fps&&p.yawRate<0&&reversed===null)reversed=(i-fps+1)/fps;}
 return{p,yaw,roll,reversed};
}
test('Every catalogue mass/inertia responds to turn and countersteer without rolling away',()=>{
 for(const name of Object.keys(profiles)){const r=circle(name,120);assert(r.yaw>.1&&r.yaw<3,name+' yaw');assert(r.roll<.2,name+' roll');assert(r.reversed!==null&&r.reversed<.7,name+' countersteer');assert(r.p.state.roadContact.grounded>=3,name+' contact');}
});
test('Mass/CG and countersteering remain deterministic at mobile 30/60/120 FPS',()=>{
 const rows=[30,60,120].map(fps=>circle('Porsche Panamera Turbo',fps));for(const r of rows.slice(1))for(const k of ['x','y','z','heading','vForward','vLateral','yawRate','pitch','roll'])near(r.p.state[k],rows[0].p.state[k],1e-7);
});
test('Circuit chase camera has the same response at 30/60/120 FPS in both orientations',()=>{
 const{NomeraCircuitRaceEngine:E}=require('../js/nfs-circuit-race');
 for(const aspect of [.475,2.16]){
  const values=[30,60,120].map(fps=>{const e=new E();e.scene={};e.cameraMode='chase';e.playerPhysics={mwKernel:mw,state:{renderX:0,renderZ:0,renderHeading:0,heave:0,pitch:0,speedMs:25,vx:0,vz:25,speedKmh:90}};
   e.camera={aspect,position:{set(){}},lookAt(){},fov:60,updateProjectionMatrix(){}};e._sync3DMeshes(true);const p=e.playerPhysics.state;p.renderHeading=.5;p.vx=Math.sin(.5)*25;p.vz=Math.cos(.5)*25;
   for(let i=0;i<fps*.1;i++)e._sync3DMeshes(false,1/fps);return[e._camPos.x,e._camLook.x,e.camera.fov];});
  for(const v of values.slice(1))v.forEach((n,i)=>near(n,values[0][i]));
 }
});
