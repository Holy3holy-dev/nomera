const test=require('node:test'),assert=require('node:assert/strict');
const mw=require('../js/authors-mw-physics'),{NfsVehiclePhysics:P}=require('../js/nfs-physics');
const golden=require('./fixtures/mw-tire-golden.json');
const near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
const car=options=>new P({carName:'Subaru Impreza WRX STI',physicsKernel:mw,...options});
const energy=p=>.5*p.profile.massKg*(p.state.vx**2+p.state.vz**2)+.5*p.state.yawInertia*p.yawRate**2;

test('MW tire matches ten independently compiled upstream C++ float fixtures',()=>{
 for(const {name,input:i,expected:e} of golden.fixtures){
  const t=new mw.Tire({radius:i.radius,front:i.index<2});
  Object.assign(t,{omega:i.omega,traction:i.traction,load:i.previousLoad,roadSpeed:i.previousRoadSpeed});
  t.step(i.dt,{forward:i.fwd,lateral:i.lat,speed:Math.hypot(i.fwd,i.lat),load:i.airborne?0:i.load,driveTorque:i.driveTorque,
   brake:i.brake,handbrake:i.ebrake,brakeCapacity:golden.params.brakesFtLb[i.index>>1]*1.3558*4,
   ebrakeCapacity:850*1.3558*10,maxSlip:i.maxSlip,tractionBoost:i.tractionBoost,dragReduction:i.dragReduction});
  for(const [actual,expected] of [['fx','fx'],['fy','fy'],['omega','omega'],['angularAcc','angularAcc'],['traction','traction'],['slip','slip'],['slipAngle','slipAngleRadians'],['lastTorque','lastTorque']]){
   const tolerance=Math.max(.002,Math.abs(e[expected])*3e-5);
   assert(Math.abs(t[actual]-e[expected])<tolerance,`${name} ${actual}: ${t[actual]} vs C++ ${e[expected]}`);
  }
  assert.equal(t.locked,e.brakeLocked,name);
 }
});

test('MW tires lock, release at rest, spin airborne, and keep all state finite through reverse',()=>{
 const p=car({speedKmh:100});
 p.update(1/60,{handbrake:true});assert(p.mwTires.rl.locked&&p.mwTires.rr.locked);
 const angle=p.state.wheelAngles.rr;p.update(1/60,{handbrake:true});near(p.state.wheelAngles.rr,angle);
 p.state.vForward=0;p.state.vLateral=0;p.state.yawRate=0;
 for(let i=0;i<240;i++)p.update(1/60,{gas:true});assert(p.speedKmh>50);assert(!p.mwTires.rr.locked);
 p.suspension.y=2;p.suspension.vy=0;p.update(1/60,{gas:true});
 assert(Object.values(p.mwTires).every(t=>t.load===0&&t.fx===0&&t.fy===0));
 assert(p.mwTires.rr.visualOmega()!==0);
 const r=car();for(let i=0;i<180;i++)r.update(1/60,{brake:true});
 assert(r.state.gear===-1&&r.state.vForward<0);
 for(let i=0;i<180;i++)r.update(1/60,{brake:true,steer:-.5});
 for(const t of Object.values(r.mwTires))for(const k of ['fx','fy','omega','traction'])assert(Number.isFinite(t[k]));
});

test('MW turn response improves at city and highway speed and settles on release',()=>{
 for(const [speed,minimum]of [[60,42],[100,34],[160,28]]){
  const p=car({speedKmh:speed});let angle=0;
  for(let i=0;i<60;i++){p.update(1/60,{gas:true,steer:1});angle+=p.yawRate/60;}
  assert(angle*180/Math.PI>minimum);assert(Math.abs(p.state.roll)<.12);
  for(let i=0;i<180;i++)p.update(1/60,{gas:true});
  assert(Math.abs(p.yawRate)<.05);assert(Math.abs(p.state.vLateral)<.15);
 }
});

test('MW wall: resting/outgoing scrape preserves momentum, yaw and damage at any FPS',()=>{
 for(const fps of [30,60,120]){
  const p=car({speedKmh:100});p.state.yawRate=.2;
  for(let i=0;i<fps;i++)p.resolveWallCollision({normalX:1,normalZ:0,penetration:.01,pointX:p.x,pointZ:p.z});
  near(p.state.vz,100/3.6);near(p.yawRate,.2);near(p.state.damageTaken,0);near(p.state.collisionTimer,0);
  p.state.vx=2;const before=energy(p);p.resolveWallCollision({normalX:1,normalZ:0,penetration:0,pointX:p.x,pointZ:p.z});near(energy(p),before);
 }
});

test('MW impact: off-center wall produces yaw and never gains kinetic energy',()=>{
 const p=car();p.state.vx=-12;p.state.vz=25;
 const before=energy(p),x=p.x;
 const result=p.resolveWallCollision({normalX:1,normalZ:0,penetration:.4,pointX:p.x-1,pointZ:p.z+1,restitution:.2});
 near(p.x-x,.4);assert(result.closingSpeedMps>0);assert(energy(p)<=before);assert(Math.abs(p.yawRate)>.01);
 assert(result.damageAdded>0);
});

test('MW car impact is symmetric, conserves linear momentum and loses no energy to overlap correction',()=>{
 const make=()=>{const a=car({x:0,z:0}),b=car({x:1.5,z:0});a.state.vx=10;b.state.vx=-2;return[a,b];};
 const[a,b]=make(),[c,d]=make(),momentum=a.profile.massKg*8;
 const contact={normalX:-1,normalZ:0,penetration:.3,pointX:.75,pointZ:0,restitution:0,friction:0};
 const before=energy(a)+energy(b);a.resolveVehicleCollision(b,contact);
 near(a.profile.massKg*a.state.vx+b.profile.massKg*b.state.vx,momentum,1e-6);
 assert(energy(a)+energy(b)<=before);near(a.yawRate,0);near(b.yawRate,0);
 d.resolveVehicleCollision(c,{...contact,normalX:1});
 near(a.state.vx,c.state.vx);near(b.state.vx,d.state.vx);near(a.x,c.x);near(b.x,d.x);
 near(a.state.damageTaken,b.state.damageTaken);
 a.state.vx=-5;b.state.vx=5;const outgoing=energy(a)+energy(b),damage=a.state.damageTaken;
 a.resolveVehicleCollision(b,contact);near(energy(a)+energy(b),outgoing);near(a.state.damageTaken,damage);
});

test('MW oriented shapes allow side-by-side cars and detect nose contact',()=>{
 const a=car(),b=car({x:2.2});assert.equal(a.getVehicleContact(b),null);
 b.x=0;b.z=3.5;assert(a.getVehicleContact(b));b.z=6;assert.equal(a.getVehicleContact(b),null);
});

test('MW source wall escape requires grounded wheels, throttle and matching direction',()=>{
 near(mw.wallSteer({wall:.8,input:1,gas:1}),.1);
 for(const options of [{wall:-.8,input:1,gas:1},{wall:.8,input:1,gas:0},{wall:.8,input:1,gas:1,grounded:2}])near(mw.wallSteer(options),0);
 for(const fps of [30,60,120]){let yaw=0;for(let i=0;i<fps;i++)yaw+=mw.wallSteer({wall:.8,input:1,gas:1,dt:1/fps});near(yaw,6);}
});

test('MW source speed grip tables and differential redistribute torque without locking steering',()=>{
 near(mw.tireFrame(0).gripBoost,.9996);near(mw.tireFrame(85*.44703).gripBoost,1.2);
 near(mw.tireFrame(85*.44703).tractionBoost,1.1);near(mw.tireFrame(0,true).tractionBoost,2);
 near(mw.tireFrame(0,true).maxSlip,71);
 const split=mw.differential({omega:[100,50]});near(split[0],11/30);near(split[1],19/30);
 assert.deepEqual(mw.differential({omega:[100,50],contact:[true,false]}),[.5,.5]);
 assert.deepEqual(mw.differential({omega:[100,50],locked:true}),[.5,.5]);
});
