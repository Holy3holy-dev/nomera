const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../js/vendor/three.min'),A=require('../js/authors-traffic'),mw=require('../js/authors-mw-physics'),{NfsVehiclePhysics:P}=require('../js/nfs-physics');
function car(x,z){const c=new T.Group();c.position.set(x,0,z);Object.assign(c.userData,{type:'sedan',speed:90,baseSpeed:90,halfWidth:.95,halfLength:2.2});return c;}
function engine(cars,speed=400,z=500){return{trafficCars:cars,trafficLanes:[-6.375,-2.125,2.125,6.375],state:{x:0,z,speed,fuelCurrent:32,wantedStars:0},getLaneSpeed:()=>90,trafficGroundAt:()=>({height:3,normal:[0,1,0]}),mwLongitudinal:{mwKernel:mw}};}
test('A recycled overturned body spawns upright on the terrain, with no swept path through traffic',()=>{
 const a=car(-6.375,460),b=car(-6.375,730),e=engine([a,b]);a.rotation.x=Math.PI;Object.assign(a.userData,{contactBody:{},damageState:{},deflectVx:20,disabledUntil:999});A.begin(e,1/60);let reset=0;e.resetTrafficDamage=()=>reset++;
 assert(A.spawn(e,a,{lane:0}));assert.equal(a.position.y,3);assert(a.quaternion.angleTo(new T.Quaternion())<1e-7);assert.equal(a.userData.contactBody,null);assert.equal(a.userData.damageState,null);assert.equal(a.userData.deflectVx,0);assert.equal(a.userData.disabledUntil,999);assert.equal(reset,1);assert.deepEqual(a.userData.authorsPreviousPose,a.userData.collisionPreviousPose);assert.equal(a.userData.authorsPreviousPose.z,a.position.z);assert.equal(e.state.fuelCurrent,32);
 A.finish(e,1/60);assert.equal(e.trafficContactTelemetry.contacts,0);assert.equal(a.userData.contactBody,null);
});
test('Spawn slots reserve longitudinal and lateral space and scale lead time at high speed',()=>{
 const cars=Array.from({length:16},()=>car(0,-999)),e=engine(cars,500);for(const c of cars){c.position.y=-999;assert(A.spawn(e,c,{lane:0}));assert(c.position.z-e.state.z>400);}
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)assert(Math.abs(cars[i].position.x-cars[j].position.x)>2.3||Math.abs(cars[i].position.z-cars[j].position.z)>16);
});
test('Visual swaps are deferred near the driver at high speed, with a visible fallback retained',()=>{
 const c=car(0,680),e=engine([c],400);assert(!A.visualSafe(e,c));c.position.z=710;assert(A.visualSafe(e,c));c.position.z=300;assert(!A.visualSafe(e,c));c.position.z=280;assert(A.visualSafe(e,c));c.position.y=-999;assert(A.visualSafe(e,c));
});
test('Highway quick taps respond earlier and countersteer at mobile frame rates without pose snapping',()=>{
 for(const fps of [30,60,120])for(const speed of [90,250]){
  const p=new P({carName:'Bugatti Chiron Super Sport',physicsKernel:mw,speedKmh:speed});for(let i=0;i<fps*.2;i++)p.update(1/fps,{gas:true,steer:A.highwaySteer(1,p.state)});assert(p.x>.15,`${fps}/${speed} tap ${p.x}`);const turn=p.heading;for(let i=0;i<fps*.2;i++)p.update(1/fps,{gas:true,steer:A.highwaySteer(-1,p.state)});assert(p.heading<turn);assert(p.state.steerInput<0);for(let i=0;i<fps*2;i++)p.update(1/fps,{gas:true,steer:A.highwaySteer(0,p.state)});assert(p.state.rollover.up>.9);assert(Math.abs(p.heading)<.02);assert(Math.abs(p.yawRate)<.03);
 }
});
