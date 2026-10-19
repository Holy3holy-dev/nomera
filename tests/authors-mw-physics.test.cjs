const test = require('node:test');
const assert = require('node:assert/strict');
const mw = require('../js/authors-mw-physics.js');
const {NfsVehiclePhysics} = require('../js/nfs-physics.js');
const {NomeraCircuitRaceEngine} = require('../js/nfs-circuit-race.js');
const near = (a,b,epsilon=1e-8) => assert.ok(Math.abs(a-b)<epsilon, `${a} != ${b}`);

// Golden values calculated from the pinned source tables, not a second copy
// of the JS algorithm. See docs/MW_PHYSICS_PORT.md for units and source paths.
test('MW source fixtures: torque knots, interpolation and idle/redline clamp',()=>{
    near(mw.torque(mw.REFERENCE, 5150),283);
    near(mw.torque(mw.REFERENCE, 1343.75),164);
    near(mw.torque(mw.REFERENCE,-200),149);
    near(mw.torque(mw.REFERENCE,9500),234.4367816091954);
    near(mw.torque({...mw.REFERENCE,torque:[42]},5000),0);
});
test('MW source fixtures: clutch at disengagement, halfway, full engagement',()=>{
    near(mw.clutch('DISENGAGED',.25,.25,.125).ratio,.25);
    near(mw.clutch('ENGAGING',.25,.25,.125).ratio,.625);
    assert.deepEqual(mw.clutch('ENGAGING',.1,.25,.2),{state:'ENGAGED',time:0,ratio:1});
});
test('MW source fixtures: tire load/slip interpolation, saturation, radians and sign',()=>{
    near(mw.tireForce(5000,4*Math.PI/180),8000);
    near(mw.tireForce(5000,3*Math.PI/180),6875);
    near(mw.tireForce(5000,8*Math.PI/180),9000);
    near(mw.tireForce(0,1),0);
    near(mw.tireForce(5000,-4*Math.PI/180),-8000);
    near(mw.tireForce(5000,40*Math.PI/180),mw.tireForce(5000,12*Math.PI/180));
    near(mw.tireForce(5000,4*Math.PI/180,1.2,.5),4800);
    assert(mw.tireForce(10000,8*Math.PI/180)<2*mw.tireForce(5000,8*Math.PI/180));
});
test('MW source fixtures: steering table range is 0..160 m/s, not km/h',()=>{
    near(mw.steeringRange(0),40);near(mw.steeringRange(160/9),20);
    near(mw.steeringRange(160),2.9);near(mw.steeringRate(160/3),.56);
});
test('MW shift search: redline fallback and actual earlier torque crossover',()=>{
    const shifts=mw.shiftPoints(mw.REFERENCE,mw.REFERENCE.gears);
    assert.deepEqual(shifts.up,[0,0,8400,8400,8400,8400,8400,8500]);
    near(shifts.down[3],5151.176470588236);
    const declining={idle:1000,redline:7000,maxRpm:7000,torque:[100,400,400,10]};
    const crossover=mw.shiftPoints(declining,[3,0,4,3]);
    assert(crossover.up[2]<6900 && crossover.up[2]>=4000);
});
function drive(fps, side=1, weather='dry') {
    const car=new NfsVehiclePhysics({carName:'Subaru Impreza WRX STI',weather,physicsKernel:mw});
    for(let i=0;i<fps*8;i++)car.update(1/fps,{gas:true,steer:i>=fps*4&&i<fps*5?side*.5:0});
    return car;
}
test('MW adapter: fixed timestep, mirrored turns and mobile 30/60/120 FPS',()=>{
    const a=drive(30),b=drive(60),c=drive(120),mirror=drive(60,-1);
    for(const state of [a.state,c.state])for(const key of ['x','z','vForward','heading'])near(state[key],b.state[key],1e-6);
    near(b.state.x,-mirror.state.x,1e-6);near(b.state.z,mirror.state.z,1e-6);
    assert(b.state.speedKmh>100 && b.state.gear>=2);
});
test('MW adapter: no fuel means no drive torque; brake wins over gas',()=>{
    const empty=new NfsVehiclePhysics({carName:'BMW M5 F90',physicsKernel:mw,fuelCurrent:0});
    const both=new NfsVehiclePhysics({carName:'BMW M5 F90',physicsKernel:mw,speedKmh:100});
    const brake=new NfsVehiclePhysics({carName:'BMW M5 F90',physicsKernel:mw,speedKmh:100});
    for(let i=0;i<60;i++){
        empty.update(1/60,{gas:true,nitro:true});
        both.update(1/60,{gas:true,brake:true});brake.update(1/60,{brake:true});
    }
    near(empty.state.speedKmh,0);assert.equal(empty.state.isNitroActive,false);
    near(both.state.vForward,brake.state.vForward,1e-6);
});
test('MW adapter: car upgrades and different grip/weather still affect racing',()=>{
    const base=new NfsVehiclePhysics({carName:'Subaru Impreza WRX STI',physicsKernel:mw});
    const tuned=new NfsVehiclePhysics({carName:'Subaru Impreza WRX STI',physicsKernel:mw,upgrades:{engine:3}});
    assert(tuned.profile.baseTorqueNm>base.profile.baseTorqueNm);
    assert(tuned.mwSpec.engine.torque[4]>base.mwSpec.engine.torque[4]);
    const wet=drive(60,1,'rain'),dry=drive(60,1,'dry');
    assert(wet.state.effectiveGrip<dry.state.effectiveGrip);
    assert(Math.abs(wet.state.x-dry.state.x)>.1);
});
for(const trackId of ['rockport_ring','canyon_pass','bayview_sprint'])test(`MW circuit ${trackId}: same model for rivals, progress, fuel, single finish`,()=>{
    let finishes=0;
    const engine=new NomeraCircuitRaceEngine(null,{trackId,totalLaps:1,skipCountdown:true,onGameOver:()=>finishes++});
    engine.start({physicsKernel:mw,trackId,carName:'BMW M5 F90',skipCountdown:true,performance:{speed:305,accel:4.5,handling:8.8,tankCapacity:60}});
    assert.equal(engine.playerPhysics.mwKernel,mw);
    assert(engine.rivals.every(r=>r.physics.mwKernel===mw));
    for(let i=0;i<900;i++){
        const proj=engine.playerTrackProj;
        let diff=Math.atan2(proj.tx,proj.tz)-engine.playerPhysics.heading;
        diff=Math.atan2(Math.sin(diff),Math.cos(diff));
        engine.setKey('gas',true);engine.setKey('left',diff<-.04);engine.setKey('right',diff>.04);
        engine.stepSimulation(1/60);
    }
    assert(engine.state.distanceKm>.2);assert(engine.state.fuelLiters>0);
    assert(engine.rivals.every(r=>r.physics.distanceKm>.15));
    engine.playerProgress.checkpointsPassed=engine.track.checkpoints.length-1;
    engine.playerProgress.nextCheckpoint=0;
    engine.playerPhysics.x=engine.track.checkpoints[0].x;engine.playerPhysics.z=engine.track.checkpoints[0].z;
    engine.stepSimulation(1/60);
    assert.equal(engine.finished,true);
    for(let i=0;i<20;i++)engine.stepSimulation(1/60);
    assert.equal(finishes,1);
    engine.destroy();
});
test('MW rivals complete two full laps on every track without getting stuck',()=>{
    for(const trackId of ['rockport_ring','canyon_pass','bayview_sprint']){
        const engine=new NomeraCircuitRaceEngine(null,{trackId,skipCountdown:true});
        engine.start({trackId,physicsKernel:mw,skipCountdown:true});
        for(let i=0;i<7200;i++)engine.update(1/60);
        assert(engine.rivals.every(r=>r.progress.finished),trackId);
        assert(engine.rivals.every(r=>r.physics.speedKmh>40),trackId);
        engine.destroy();
    }
});
