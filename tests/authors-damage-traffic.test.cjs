const test=require('node:test'),assert=require('node:assert/strict'),D=require('../js/authors-body-damage'),A=require('../js/authors-traffic'),mw=require('../js/authors-mw-physics'),R=mw.RigidBody,{NfsVehiclePhysics:P,VEHICLE_PROFILES:profiles}=require('../js/nfs-physics'),T=require('../js/vendor/three.min.js');
const near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
test('Cosmetic dents stay local, accumulate to a bounded depth and never alter untouched vertices',()=>{
 const hit={point:[1,0,0],normal:[-1,0,0],radius:.7,depth:.15};let p=[1,0,0];for(let i=0;i<50;i++)p=D.dent(p,[1,0,0],hit);near(1-p[0],.24);assert.deepEqual(D.dent([0,2,0],[0,2,0],hit),[0,2,0]);assert(p.every(Number.isFinite));
});
test('Real geometry is instance-owned, wheel rigs remain intact and deformation respects a frame budget',()=>{
 const shared=new T.BoxGeometry(2,1,4,8,4,16),root=new T.Group(),other=new T.Mesh(shared),body=new T.Mesh(shared),wheel=new T.Mesh(shared);wheel.name='MW_Spin_fl';root.add(body,wheel);const before=shared.attributes.position.array.slice();
 D.hit(T,root,{point:[1,.5,1],normal:[-1,0,0],severity:1});while(root.userData.bodyDeformation.queue.length)assert(D.process(T,root,100)<=100);
 assert(root.userData.bodyDeformation.changedVertices>0);assert.notEqual(body.geometry,shared);assert.equal(wheel.geometry,shared);assert.equal(other.geometry,shared);assert.deepEqual(shared.attributes.position.array,before);D.reset(root);assert.deepEqual(body.geometry.attributes.position.array,before);
});
test('Physical collision records deformations on both bodies; low-speed resting contact cannot spam dents',()=>{
 const p=new P({physicsKernel:mw,speedKmh:100}),o=R.createBody({position:[0,0,3.8],velocity:[0,0,3]});const c=p.getVehicleContact(o);assert(c);p._resolve3DContact(o,[c]);assert(p.state.impactEvents.length&&o.state.impactEvents.length);near(p.state.impactEvents[0].normal[2],-o.state.impactEvents[0].normal[2]);
 const s={};for(let i=0;i<100;i++)D.record(s,[0,0,0],[1,0,0],{closingSpeedMps:.1,normalImpulse:10});assert.equal(s.impactSequence,undefined);
});
test('Highway control commands tires without mutating pose; handbrake, inversion and flight keep direct control',()=>{
 const s={x:4,z:50,heading:.2,yawRate:.3,speedMps:30},before={...s};assert(A.highwaySteer(0,s)<0);assert.deepEqual(s,before);for(const extra of [{handbrake:true},{rollover:{up:-1}},{roadContact:{airborne:true}}])near(A.highwaySteer(1,{...s,...extra}),1);
});
test('A hard roof landing records a cosmetic hull impact without silently changing vehicle resources',()=>{
 const p=new P({physicsKernel:mw,y:2});p.suspension.roll=Math.PI;p.suspension.vy=-4;p.state.nitroLevel=37;p.state.damageTaken=11;for(let i=0;i<160;i++)p.update(1/120,{});assert(p.state.impactEvents?.some(e=>e.normal[1]>.9));near(p.state.damageTaken,11);near(p.state.nitroLevel,37);
});
for(const speed of [90,250])test(`All49 profiles change lanes and settle without highway spins at ${speed}km/h`,()=>{
 for(const name of Object.keys(profiles)){const p=new P({carName:name,physicsKernel:mw,speedKmh:speed});let maxHeading=0;for(let i=0;i<360;i++){p.update(1/120,{gas:true,steer:A.highwaySteer(i<90?1:0,p.state)});maxHeading=Math.max(maxHeading,Math.abs(p.heading));assert(p.state.rollover.up>.8,name+' upright');}assert(maxHeading<.24,name+' no large heading');assert(p.x>1&&p.x<5,name+' keeps the new lane');assert(Math.abs(p.heading)<.02&&Math.abs(p.yawRate)<.03,name+' settles');}
});
const car=(x,z,speed)=>{const c=new T.Group();c.position.set(x,0,z);Object.assign(c.userData,{type:'sedan',speed,baseSpeed:speed,targetX:x,halfWidth:.95,halfLength:2.2});return c;};
test('Predictive following brakes early and adjacent-lane checks reject an occupied destination',()=>{
 const rear=car(0,0,170),front=car(0,14,40),side=car(4.2,1,100),e={trafficCars:[rear,front,side]};A.cruise(e,rear,1/30);assert(rear.userData.speed<100);assert(!A.laneClear(e,rear,4.2));assert(A.laneClear(e,rear,-4.2));
});
test('Unordered traffic pairs receive actual symmetric 3D contacts instead of interpenetrating',()=>{
 const a=car(0,0,140),b=car(.1,3.8,40),e={trafficCars:[a,b],state:{wantedStars:0},mwLongitudinal:{mwKernel:mw}};A.begin(e,1/60);A.finish(e,1/60);assert.equal(e.trafficContactTelemetry.contacts,1);assert(a.userData.contactBody&&b.userData.contactBody);const c=R.contact(R.descriptor(a.userData.contactBody),R.descriptor(b.userData.contactBody));assert(!c||c.penetration<.002);assert(a.userData.speed<140&&b.userData.speed>40);
});
test('Police take accumulated impact damage, not a held key or a light scrape; dispatch has a real cooldown',()=>{
 const c=car(0,0,70);c.userData.type='police';const e={trafficCars:[c],state:{wantedStars:2},keys:{left:true},addWantedStars(){}};A.begin(e,.1);
 assert(!A.policeHit(e,c,{closingSpeedMps:3,normalImpulse:500}).disabled);near(c.userData.integrity,100);
 let hits=0;for(;hits<10&&!c.userData.isWrecked;hits++){A.begin(e,1);const h=A.policeHit(e,c,{closingSpeedMps:20,normalImpulse:16000});if(h.disabled){c.userData.isWrecked=true;A.retire(e,c);}}
 assert(hits>1&&hits<10);assert(c.userData.disabledUntil>e.authorsPursuit.time+30);c.position.y=-999;assert(!A.dispatch(e,c));let resets=0;e.resetTrafficDamage=()=>resets++;A.begin(e,45);assert(A.dispatch(e,c));assert.equal(resets,1);assert(!A.dispatch(e,c));
});
test('Police require sustained observation, cannot stack stars every frame, and allow a quiet interval after escape',()=>{
 const c=car(0,0,70);c.userData.type='police';const e={trafficCars:[c],state:{wantedStars:0,speed:230},keys:{},addWantedStars(n){this.state.wantedStars+=n;}};
 for(let i=0;i<240;i++){A.begin(e,1/60);A.observe(e,c,1/60,2,10);}assert.equal(e.state.wantedStars,1);e.state.wantedStars=0;A.begin(e,1/60);for(let i=0;i<300;i++){A.begin(e,1/60);A.observe(e,c,1/60,2,10);}assert.equal(e.state.wantedStars,0);
});
