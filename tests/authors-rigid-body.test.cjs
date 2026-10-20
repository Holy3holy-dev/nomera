const test=require('node:test'),assert=require('node:assert/strict'),R=require('../js/authors-rigid-body'),mw=require('../js/authors-mw-physics'),{NfsVehiclePhysics:P,VEHICLE_PROFILES:profiles}=require('../js/nfs-physics');
const near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`),vec=(a,b,e)=>a.forEach((v,i)=>near(v,b[i],e));
for(const{name,input,expected}of require('./fixtures/mw-collision-callback-golden.json').cases)test('Independent C++ collision callback '+name,()=>{const r=mw.collisionResponse({...input,time:12.5});for(const k of Object.keys(expected))near(r[k],expected[k]);});
test('Quaternion basis matches MW axes and remains continuous through a full roll',()=>{
 for(const h of [-2,-.2,0,1.5])for(const p of [-2,-.3,0,2])for(const r of [-3,-1.6,0,1.6,3]){const q=R.quaternion(h,p,r),a=R.matrix(q),b=mw.Contact3D.basis(h,p,r);for(const k of ['right','up','forward'])vec(a[k],b[k]);const angles=R.angles(a,h),round=R.matrix(R.quaternion(angles.heading,angles.pitch,angles.roll));for(const k of ['right','up','forward'])vec(round[k],a[k]);}
 let q=R.quaternion();for(let i=0;i<120;i++)q=R.integrate(q,[0,0,2*Math.PI],1/120);near(Math.abs(q[3]),1);near(Math.hypot(...q),1);
});
const energy=o=>{const b=R.descriptor(o),w=R.local(R.omega(b),b.m);return .5*b.mass*R.dot(R.linear(b),R.linear(b))+.5*w.reduce((s,v,i)=>s+v*v*b.inertia[i],0);};
test('Full 3D contact conserves linear momentum, creates pitch/roll and dissipates energy',()=>{
 const a=R.createBody({position:[0,0,0],velocity:[12,-2,5]}),b=R.createBody({position:[1.5,.2,.4],velocity:[-3,0,1],mass:2000}),A=R.descriptor(a),B=R.descriptor(b),contact=R.contact(A,B);assert(contact&&Number.isFinite(contact.normalY));
 const momentum=R.add(R.scale(R.linear(A),A.mass),R.scale(R.linear(B),B.mass)),before=energy(a)+energy(b);R.solve(A,B,[contact],{restitution:.2,friction:.3,correct:false});
 vec(R.add(R.scale(R.linear(R.descriptor(a)),A.mass),R.scale(R.linear(R.descriptor(b)),B.mass)),momentum,1e-6);assert(energy(a)+energy(b)<=before+1e-5);assert(Math.abs(a.suspension.rollRate)+Math.abs(a.suspension.pitchRate)>.01);
});
test('OBBs distinguish above/below, side slopes and genuine roof-to-car contact',()=>{
 const a=R.createBody({position:[0,3,0]}),b=R.createBody({position:[0,0,0]});assert.equal(R.contact(R.descriptor(a),R.descriptor(b)),null);a.state.y=1.3;a.suspension.y=1.3;const c=R.contact(R.descriptor(a),R.descriptor(b));assert(c&&c.normalY>.9);
 a.state.x=3;assert.equal(R.contact(R.descriptor(a),R.descriptor(b)),null);a.state.x=1.5;a.suspension.roll=1;assert(R.contact(R.descriptor(a),R.descriptor(b)));
});
test('A long ceiling contacts the local hull instead of applying a distant spurious lever arm',()=>{
 const a=R.createBody({position:[1,9,35],velocity:[0,4,0],orientation:R.quaternion(0,.12,0)}),roof={immovable:true,state:{x:0,y:10.3,z:50},collisionShape:{center:[0,0,0],half:[6,.2,25]}},A=R.descriptor(a),B=R.descriptor(roof),c=R.contact(A,B);
 assert(c&&c.normalY<-.9);const point=[c.pointX,c.pointY,c.pointZ];assert(R.contains(A,point)&&R.contains(B,point));assert(Math.abs(c.pointZ-A.center[2])<=A.half[2]+.2);
 R.solve(A,null,[c]);assert(R.dot(R.pointVelocity(R.descriptor(a),point),[0,-1,0])>=-1e-6);
});
test('Swept SAT catches a fast car crossing a body between two non-overlapping endpoints',()=>{
 const a=R.createBody({position:[10,0,0],velocity:[100,0,0]}),b=R.createBody({position:[0,0,0]}),A=R.descriptor(a),B=R.descriptor(b);assert.equal(R.contact(A,B),null);
 const c=R.sweptContact(A,B,{x:-10,y:0,z:0},{x:0,y:0,z:0});assert(c&&c.timeOfImpact>0&&c.timeOfImpact<1&&c.normalX<-.99);near(c.sweptPositions.a[0],-1.9);near(c.pointX,-.95);
 assert.equal(R.sweptContact(A,B,{x:5,y:0,z:0},{x:0,y:0,z:0}),null);
});
test('An off-centre impact can cause a genuine full rollover without a scripted flip',()=>{
 const p=new P({carName:'Bugatti Chiron Super Sport',physicsKernel:mw,y:1,speedKmh:60});Object.assign(p.state,{vx:25,vz:10,vForward:10,vLateral:25});
 p._resolve3DContact(null,[{normalX:-1,normalY:0,normalZ:0,penetration:.01,pointX:.8,pointY:2,pointZ:0}],{restitution:.2,friction:.15});assert(Math.abs(p.suspension.rollRate)>1);
 let inverted=false;for(let i=0;i<360;i++){p.update(1/120,{});inverted ||=p.state.rollover.inverted;}assert(inverted);near(Math.hypot(...p.suspension.orientation),1);
});
test('Midpoint angular momentum stays finite and conserves world momentum through fast tumbling',()=>{
 const o=R.createBody({position:[0,20,0]}),b=o.suspension,s=o.state;b.pitchRate=7;s.yawRate=3;b.rollRate=11;const d=R.descriptor(o),momentum=R.rotate([b.pitchRate,s.yawRate,b.rollRate].map((v,i)=>v*d.inertia[i]),d.m),initial=energy(o);
 for(let i=0;i<1200;i++)R.stepAngular(b,s,[0,0,0],1/120);
 const end=R.descriptor(o);vec(R.rotate([b.pitchRate,s.yawRate,b.rollRate].map((v,i)=>v*end.inertia[i]),end.m),momentum,1e-4);assert(energy(o)<initial*1.05);near(Math.hypot(...b.orientation),1);
});
test('Low barriers hit the side face, high cars pass above, edge hits create full angular response',()=>{
 const p=new P({physicsKernel:mw,x:8.5,speedKmh:80}),wall={normalX:-1,normalZ:0,planePoint:[9,0,0],wallHeight:.7,groundHeight:0};p.state.vx=12;
 const hit=p.resolveWallCollision(wall);assert(hit.contacts>0&&hit.closingSpeedMps>0);assert(Math.abs(p.suspension.rollRate)>.01);
 const air=new P({physicsKernel:mw,x:8.5,y:4,speedKmh:80});air.state.vx=12;assert.equal(air.resolveWallCollision(wall).closingSpeedMps,0);near(air.state.vx,12);
});
test('Every catalogue car can rotate past 90°, land on its roof, recover and keep fuel/NOS/damage',()=>{
 for(const name of Object.keys(profiles)){const p=new P({carName:name,physicsKernel:mw,y:2});p.suspension.roll=Math.PI;p.state.fuelCurrent=30;p.state.nitroLevel=43;p.state.damageTaken=12;let inverted=false;
  for(let i=0;i<600;i++){p.update(1/120,{});inverted ||=p.state.rollover.inverted;assert([p.x,p.y,p.z,p.yawRate,p.suspension.rollRate,p.suspension.pitchRate].every(Number.isFinite),name);}
  assert(inverted&&p.state.rollover.recoverable,name);assert(p.y>.5&&p.y<3,name+' roof support');assert(Object.values(p.mwTires).every(t=>t.load===0),name+' no upside-down tire traction');const fuel=p.state.fuelCurrent,nos=p.state.nitroLevel,damage=p.state.damageTaken;assert(p.recoverRollover());near(p.y,.08);near(p.state.fuelCurrent,fuel);near(p.state.nitroLevel,nos);near(p.state.damageTaken,damage);for(let i=0;i<120;i++)p.update(1/120,{gas:true});assert(p.state.rollover.up>.95&&p.speedKmh>0,name+' drives after recovery');
 }
});
test('Rollover, roof friction and recovery availability agree at 30/60/120 rendered FPS',()=>{
 const rows=[30,60,120].map(fps=>{const p=new P({physicsKernel:mw,y:2,speedKmh:70});p.suspension.roll=1.7;p.suspension.rollRate=2;for(let i=0;i<fps*4;i++)p.update(1/fps,{});return p;});for(const b of rows.slice(1))for(const k of ['x','y','z','heading','yawRate','roll','pitch'])near(b.state[k],rows[0].state[k],1e-7);
});
