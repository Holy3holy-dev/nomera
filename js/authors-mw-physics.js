/* SPDX-License-Identifier: MPL-2.0
 * MW algorithm adapter, translated/adapted from ProStreetMWPhysics (9c6e261),
 * which credits Brawltendo's Most-Wanted-Vehicles-Decomp (de70279).
 * Source lineage, units, deviations and license: docs/MW_PHYSICS_PORT.md.
 * Tire/contact integration and remaining limits: docs/MW_TIRES_COLLISIONS.md.
 * Traction control, burnout and drift: docs/MW_TRACTION_DRIFT.md.
 * This partial adapter does not claim Xbox retail equivalence.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NomeraMW = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mix = (a, b, t) => a + (b - a) * t;
    function table(values, x, lo, hi) {
        const position = clamp((x - lo) / (hi - lo), 0, 1) * (values.length - 1);
        const index = Math.floor(position);
        return mix(values[index], values[Math.min(index + 1, values.length - 1)], position - index);
    }
    const LOAD = Object.freeze([
        [0, 0, 0, 0, 0, 0], [0, 1.2, 2.3, 3, 3, 2.8],
        [0, 1.7, 3.2, 4.3, 5.1, 5.2], [0, 1.8, 3.5, 4.9, 5.8, 6.1],
        [0, 1.83, 3.6, 5, 5.96, 6.4], [0, 1.86, 3.7, 5.1, 6.13, 6.7],
        [0, 1.9, 3.8, 5.2, 6.3, 7.1]
    ].map(Object.freeze));
    const RANGE = Object.freeze([40, 20, 10, 5.5, 4.5, 3.25, 2.9, 2.9, 2.9, 2.9]);
    const RATE = Object.freeze([1, 1, 1, .56, .5, .35, .3, .3, .3, .3]);
    // Original MW bmwm3gtr dump; native torque values are lb-ft, NOT Nm.
    // This is not a promise of original data for NOMERA cars.
    const REFERENCE = Object.freeze({ idle: 800, redline: 8500, maxRpm: 9500,
        torque: Object.freeze([149, 179, 222, 266, 283, 275, 255, 235, 228]),
        gears: Object.freeze([3.79, 0, 3.4, 2.085, 1.5, 1.25, 1.09, .91]) });
    function torque(engine, rpm) {
        if (engine.torque.length < 2) return 0;
        return table(engine.torque, clamp(rpm, engine.idle, engine.redline), engine.idle, engine.maxRpm);
    }
    // Physics::Info::ShiftPoints, naturally aspirated path. Induction and the
    // suspect swapped spool/rpm call in the decomp are intentionally not claimed.
    function shiftPoints(engine, gears) {
        const up = Array(gears.length).fill(0), down = Array(gears.length).fill(0);
        for (let j = 2; j < gears.length - 1; j++) {
            const ratio = Math.abs(gears[j]) > .00001 ? gears[j + 1] / gears[j] : 0;
            let rpm = (engine.redline + engine.idle) * .5;
            while (rpm < engine.redline && torque(engine, ratio * rpm) * ratio <= torque(engine, rpm)) rpm += 50;
            up[j] = rpm < engine.redline ? rpm : engine.redline - 100;
            down[j + 1] = ratio * up[j];
        }
        up[gears.length - 1] = engine.redline;
        return { up, down };
    }
    // EngineRacer::Clutch::Update. State remains DISENGAGED until caller engages.
    function clutch(state, time, engageTime, dt) {
        time = Math.max(0, time - dt);
        if (state === 'ENGAGING' && time <= 0) state = 'ENGAGED';
        const ratio = state === 'DISENGAGED' ? .25 : state === 'ENGAGING'
            ? 1 - .75 * clamp(time / Math.max(.00001, engageTime), 0, 1) : 1;
        return { state, time, ratio };
    }
    // Public API accepts radians; MW's original angle unit is turns (1=360deg).
    // Signed force is a NOMERA wrapper around original absolute slip magnitude.
    function tireForce(loadN, slipRad, gripScale = 1, gripBoost = 1) {
        const angle = clamp(Math.abs(slipRad) * 180 / Math.PI * .5, 0, 6);
        const row = Math.floor(angle), load = Math.max(0, loadN) * .001 * .8;
        const low = table(LOAD[row], load, 0, 10);
        const high = table(LOAD[Math.min(row + 1, 6)], load, 0, 10);
        return Math.sign(slipRad) * mix(low, high, angle - row) * gripScale * gripBoost * 2500;
    }
    function steeringRange(speedMps) { return table(RANGE, Math.abs(speedMps), 0, 160); }
    function steeringRate(speedMps) { return table(RATE, Math.abs(speedMps), 0, 160); }
    // SuspensionRacer::Tire, SI interface. Brake/drive specifications supplied
    // here are already Nm; the catalogue bridge performs no lb-ft conversion.
    class Tire {
        constructor({radius=.34,front=true,gripScale=1,staticGrip=front?1.8:2,dynamicGrip=1.7,brakeLock=front?1:3.5}={}) {
            Object.assign(this,{radius:Math.max(.1,radius),front,gripScale,staticGrip,dynamicGrip,brakeLock});
            this.omega=0;this.load=0;this.roadSpeed=0;this.angularAcc=0;this.lastTorque=0;
            this.traction=1;this.slip=0;this.slipAngle=0;this.locked=false;this.lastSign=0;
            this.fx=0;this.fy=0;this.lateralSpeed=0;
        }
        checkLock(groundForce,brakeTorque,ebrakeTorque) {
            const available=(brakeTorque*this.brakeLock+ebrakeTorque)*1.2;
            if(available>groundForce*this.radius+Math.abs(this.omega)*100){this.locked=available>1;this.omega=0;}
            else this.locked=false;
        }
        checkSign(){
            if(this.lastSign*this.omega<0)this.omega=0;
            this.lastSign=Math.abs(this.omega)>1e-7?Math.sign(this.omega):0;
        }
        visualOmega(){return this.locked?0:this.load>0&&this.traction>=1?this.roadSpeed/this.radius:this.omega;}
        step(dt,{lateral=0,forward=0,speed=Math.hypot(lateral,forward),load=0,driveTorque=0,
            brake=0,handbrake=0,brakeCapacity=0,ebrakeCapacity=0,tractionBoost=1,lateralBoost=1,gripBoost=1,
            driftFriction=1,maxSlip=.5,dragReduction=.15,lateralGrip=1,driveGrip=1,rollingResistance=1,circleX=1,circleY=1}={}){
            if(!(dt>0))return this;
            const r=this.radius,I=10,bt=brake*brakeCapacity,ebt=handbrake*ebrakeCapacity;
            this.fx=0;this.fy=0;
            let torque=this.locked?0:driveTorque;
            if(load<=0){
                this.load=0;this.slip=0;this.slipAngle=0;this.traction=0;
                this.checkLock(0,bt,ebt);
                if(this.locked){this.angularAcc=0;this.omega=0;}
                else {torque+=(this.omega>0?-1:1)*(bt+ebt);this.angularAcc=torque/I;this.omega+=this.angularAcc*dt;}
                this.checkSign();return this;
            }
            if(this.load<=0&&!this.locked)this.omega=forward/r;
            const roadAcc=(forward-this.roadSpeed)/dt;
            this.roadSpeed=forward;this.load=Math.max(0,load);this.lateralSpeed=lateral;
            if(!this.locked){
                if(Math.abs(forward)<1)torque=torque*(1-handbrake)-(brake+handbrake)*load*forward/r;
                else torque+=(this.omega>0?-1:1)*(bt+ebt);
            }
            this.slipAngle=Math.atan2(lateral,Math.abs(forward));
            this.slip=this.omega*r-forward;
            const skid=Math.hypot(this.slip,lateral);
            const pilot=this.front||this.locked||this.omega<0?1:mix(.85,1,clamp((speed-30*.44703)/(20*.44703),0,1));
            let friction=0,dynamic=1;
            if(skid>1e-7&&(lateral!==0||forward!==0)){
                dynamic=this.dynamicGrip*tractionBoost*pilot;
                friction=load*dynamic/skid;
                this.checkLock(Math.abs(forward)*load*dynamic/Math.hypot(forward,lateral),bt,ebt);
            }
            if(this.traction<1||this.locked){
                this.fx=friction*this.slip;this.fy=-friction*lateral;
                if(speed<.44703&&dynamic>.1){this.fx/=dynamic;this.fy/=dynamic;}
                // UMath::Limit only caps force when force and limit share sign.
                const limit=torque/r;
                if(this.fx*limit>0)this.fx=Math.sign(this.fx)*Math.min(Math.abs(this.fx),Math.abs(limit));
            } else {
                this.locked=false;this.fx=torque/r;
                this.fy=-tireForce(load,this.slipAngle,this.gripScale,gripBoost);
            }
            this.fy*=lateralBoost;
            if(this.traction>=1&&!this.locked)this.fx+=(this.angularAcc*r-roadAcc)*I/r;
            const ellipse=torque*forward>0&&!this.locked;
            if(ellipse)this.fx*=1.5;
            this.fy*=circleX;this.fx*=circleY;
            const force=Math.hypot(this.fx,this.fy),maximum=load*this.staticGrip*tractionBoost*driftFriction*pilot;
            this.traction=1;
            if(force>maximum&&force>.001){const ratio=maximum/force;this.traction=ratio;this.fx*=ratio;this.fy*=ratio;maxSlip*=ratio*ratio;}
            else if(ellipse)this.fx/=1.5;
            if(Math.abs(this.slip)>maxSlip)this.traction*=maxSlip/Math.abs(this.slip);
            this.fy*=lateralGrip;this.fx*=driveGrip;
            if(forward>1)this.fx-=Math.sin(this.slipAngle)*this.fy*dragReduction/this.gripScale;
            else this.fy*=Math.min(Math.abs(lateral),1);
            if(this.locked)this.angularAcc=0;
            else {
                if(this.traction<1){
                    const residual=(torque-this.fx*r+this.lastTorque)*.5;this.lastTorque=residual;
                    this.angularAcc=(residual-this.omega*2*rollingResistance)/I-this.traction*this.slip/(r*dt);
                }
                this.angularAcc=mix(this.angularAcc,roadAcc/r,this.traction);
            }
            this.omega+=this.angularAcc*dt;this.checkSign();
            return this;
        }
    }
    function tireFrame(speedMps,reverse=false){
        const speedMph=Math.abs(speedMps)/.44703;
        return{gripBoost:table([.833,.958,1.008,1.0167,1.033,1.033,1.033,1.0167,1,1],speedMph,0,85)*1.2,
            tractionBoost:reverse?2:table([.90899998,1.045,1.09,1.09,1.09,1.09,1.09,1.045,1,1],speedMph,0,85)*1.1,
            maxSlip:reverse?71:.5+clamp((Math.abs(speedMps)-10)/61,0,1)};
    }
    function differential({omega=[0,0],contact=[true,true],bias=.5,factor=.8,locked=false}={}){
        if(!contact[0]||!contact[1]||locked||factor<=0)return[bias,1-bias];
        const a=omega[0]*(1-bias),b=omega[1]*bias,sum=Math.abs(a+b);
        if(sum<1e-7)return[bias,1-bias];
        return[clamp((1-factor)*bias+factor*Math.abs(b)/sum,0,1),clamp((1-factor)*(1-bias)+factor*Math.abs(a)/sum,0,1)];
    }
    function graph(points,x){
        if(x<=points[0][0])return points[0][1];
        for(let i=1;i<points.length;i++)if(x<=points[i][0])return mix(points[i-1][1],points[i][1],(x-points[i-1][0])/(points[i][0]-points[i-1][0]));
        return points[points.length-1][1];
    }
    const DRIFT_STATES=Object.freeze(['D_OUT','D_ENTER','D_IN','D_EXIT']);
    const DRIFT_STABILIZER=[[0,0],[.2617994,.1],[.52359879,.45],[.78539819,.85],[1.0471976,.95],[1.5533431,1.15],[1.5707964,0]];
    const DRIFT_REAR=[1.1,.95,.87,.77,.67,.6,.51,.43,.37,.34];
    class Burnout {
        constructor(){this.reset();}
        reset(){this.state=0;this.time=0;this.traction=1;this.allow=0;}
        step(dt,{speedMph=0,slip=0,wheel=0,beta=0}={}){
            if(!(dt>0))return this;
            if(this.state){
                if(speedMph>5&&Math.abs(beta)>.5)this.reset();
                else if(slip<.5){this.allow+=dt;if(this.allow>1)this.reset();}
                else {this.allow=0;this.time-=dt;if(this.time<0){this.state--;this.time=2;}}
            }else if(speedMph<20&&slip>.5){
                const friction=graph([[0,1],[5,.8],[9,.9],[12.6,.833],[17.1,.72],[25,.65]],slip);
                this.traction=friction/1.4;this.state=Math.trunc(6*(1.5-friction)+(wheel&1));this.time=2;this.allow=0;
            }
            return this;
        }
    }
    // DoDriveForces consumes previous-frame tire telemetry and burnout state.
    // It limits the slipping side's torque; it does not filter steering input.
    function driveControl({torque=0,frontShare=0,wheels=[],burnout={state:0,traction:1},steer=0,forward=0,lateral=0,factor=[.8,.8]}={}){
        const output={torques:[0,0,0,0],boost:[1,1,1,1],control:[1,1,1,1],splits:[.5,.5,.5,.5],active:false};
        for(let axle=0;axle<2;axle++){
            const share=axle===0?frontShare:1-frontShare,axleTorque=torque*share;
            if(Math.abs(axleTorque)<1e-7)continue;
            const pair=wheels.slice(axle*2,axle*2+2);
            if(pair.length<2)continue;
            let bias=.5,locked=false;
            if(burnout.state&1){output.boost[axle*2+1]=burnout.traction;bias=burnout.traction*.5;locked=true;}
            else if(burnout.state&2){output.boost[axle*2]=burnout.traction;bias=1-burnout.traction*.5;locked=true;}
            else {
                const fwdSlip=share*(pair[0].slip+pair[1].slip)*.5;
                const latSlip=share*((pair[0].lateralSpeed||0)+(pair[1].lateralSpeed||0))*.5;
                const deltaLat=latSlip-lateral;
                if(deltaLat*steer>0&&axleTorque*fwdSlip>0){
                    const deltaFwd=fwdSlip-forward;
                    let limit=clamp((deltaFwd-1)/19,0,1);
                    if(limit>0){
                        const angle=Math.abs(steer*Math.atan2(deltaLat,Math.abs(deltaFwd))*180/Math.PI);
                        limit*=clamp((angle-1)/15,0,1);
                        if(limit>0){
                            const slipping=deltaLat>0?1:0,other=1-slipping;
                            output.control[axle*2+slipping]=1-limit;
                            output.control[axle*2+other]=1-limit*.5;
                            output.boost[axle*2+other]=1+limit;output.active=true;
                        }
                    }
                }
            }
            const split=differential({omega:pair.map(t=>t.omega),contact:pair.map(t=>t.load>0),bias,locked,factor:factor[axle]});
            for(let i=0;i<2;i++){
                const index=axle*2+i;output.splits[index]=split[i];
                if(pair[i].load>0)output.torques[index]=axleTorque*split[i]*output.control[index];
                else output.boost[index]=1;
            }
        }
        return output;
    }
    function yawFrictionBoost({beta=0,handbrake=0,speed=0,limit=0,grade=0}={}){
        const base=1+Math.abs(grade);
        return handbrake>.5&&Math.abs(beta)<20*Math.PI/180?base:base+Math.min(.35,Math.abs(beta)*limit*speed/30);
    }
    class DriftController {
        constructor({yawControl=[.1,.4,.6,1]}={}){this.yawCurve=yawControl;this.reset();}
        reset(){this.state=0;this.value=0;this.yawControl=1;this.result=null;}
        step(dt,{beta=0,yawRate=0,speed=0,maxSpeed=80,steer=0,averageSteer=0,gas=0,handbrake=0,grounded=4,grade=0,staging=false,drag=false,stabilityOff=false}={}){
            if(!(dt>0))return this.result||{state:0,stateName:'D_OUT',value:0,rearFriction:1,rearTractionBoost:1,dampingRate:0,counterSteer:0};
            // TuneWheelParams uses the old drift blend before DoDrifting.
            this.yawControl=handbrake>=.5?Math.max(.5,this.yawControl-20*dt):Math.min(1,this.yawControl+dt);
            let limit=maxSpeed>0?table(this.yawCurve,Math.abs(speed)/maxSpeed,0,1):0;
            if(drag)limit=.1;else if(stabilityOff)limit+=2.5;
            const absBeta=Math.abs(beta);
            const yawBoost=yawFrictionBoost({beta,handbrake,speed,limit,grade});
            const rearTractionBoost=1+this.yawControl*(1-this.value)*(yawBoost-1);
            let rearFriction=1,dampingRate=0,counterSteer=0;
            if(this.state&&(staging||drag)){this.state=0;this.value=0;}
            else {
                this.value+=([1,2].includes(this.state)?8:-2)*dt;
                if(this.value<=0){this.state=0;this.value=0;}else if(this.value>=1){this.state=2;this.value=1;}
                const threshold=12*Math.PI/180,minSpeed=30*.44703;
                if(this.state>1){
                    if(yawRate*beta<0&&absBeta<=Math.PI/2&&speed>minSpeed&&averageSteer*beta<=0&&absBeta>threshold)this.state=2;
                    else if(gas*steer*beta>threshold&&speed>minSpeed)this.state=2;
                    else if(gas*absBeta>threshold)this.state=1;
                    else this.state=3;
                }else if(speed>minSpeed&&(handbrake>.5||absBeta>threshold))this.state=1;
                if(this.value>0){
                    if(beta*yawRate<0&&grounded>=2)dampingRate=this.value*graph(DRIFT_STABILIZER,absBeta)*4;
                    if(steer*beta>0)counterSteer=Math.abs(steer);
                    rearFriction=table(DRIFT_REAR,(absBeta*.5+counterSteer*4+Math.abs(yawRate)*.5)*this.value,0,1);
                }
            }
            return this.result={state:this.state,stateName:DRIFT_STATES[this.state],value:this.value,rearFriction,rearTractionBoost,dampingRate,counterSteer};
        }
    }
    // Matching DoWallSteer nose branch. Contact eligibility/units are supplied
    // by our host, not by the unavailable original collision-event ABI.
    function wallSteer({wall=0,input=0,gas=0,grounded=4,dt=1/60}={}){
        const delta=.125*input*gas;
        return grounded>2&&gas>0&&wall*delta>=0?Math.abs(wall)*delta*dt*60:0;
    }
    const REMAP = [-1,-.736,-.542,-.4,-.292,-.214,-.16,-.123,-.078,-.036,0,.036,.078,.123,.16,.214,.292,.4,.542,.736,1];
    class SteeringController {
        constructor(){this.time=0;this.inputs=[];this.speeds=[];this.lastInput=0;this.angle=0;this.lastMaximum=0;}
        get averageInput(){return this.inputs.length?this.inputs.reduce((sum,s)=>sum+s.value,0)/this.inputs.length:0;}
        step(dt,{input=0,speedMps=0,gas=0,brake=0,handbrake=0,rearSlipDeg=0,collisionTimer=0}={}){
            if(!Number.isFinite(dt)||dt<=0)return{angleDeg:this.angle,maxSteerDeg:this.lastMaximum,rateDegPerSec:0};
            this.time+=dt;
            const record=(list,value,window)=>{list.push({value,time:this.time});while(list.length&&list[0].time<this.time-window+1e-7)list.shift();};
            const average=list=>list.length?list.reduce((sum,s)=>sum+s.value,0)/list.length:0;
            const avg=Math.abs(average(this.inputs)),rateScale=steeringRate(speedMps);
            const tb=1-(Number(gas)+1-(Number(brake)+Number(handbrake))*.5)*.5;
            let maximum=steeringRange(speedMps)*(1+1.45*tb*rateScale)*table([1,1,1.1,1.2,1.25,1.35],avg,0,1);
            if(collisionTimer>0){const secs=1-collisionTimer;const recovery=secs<.2?mix(.2,.5,secs/.2):secs<.5?mix(.5,.7,(secs-.2)/.3):secs<.7?mix(.7,1,(secs-.5)/.2):1;maximum*=recovery;}
            if(input*rearSlipDeg>0)maximum=Math.max(maximum,Math.abs(rearSlipDeg));
            else if(avg>=.5)maximum=Math.max(maximum,this.lastMaximum); // MW HardTurnTightenSpeed=0.
            maximum=clamp(maximum,0,45);this.lastMaximum=maximum;
            record(this.speeds,table([1,1.05,1.1,1.5,2.2,3.1],Math.abs((input-this.lastInput)/dt),0,10),.15);
            const rate=180*rateScale*average(this.speeds)*table([1,1.05,1.1,1.2,1.3,1.4],avg,0,1);
            this.angle=clamp(clamp(input*maximum,-45,45),this.angle-rate*dt,this.angle+rate*dt);
            this.lastInput=table(REMAP,input,-1,1);record(this.inputs,this.lastInput,.55);
            return{angleDeg:this.angle,maxSteerDeg:maximum,rateDegPerSec:rate};
        }
    }
    // Direct DoWheelForces spring/shock equations, SI units. Terrain query and
    // the sprung-body integrator below are the NOMERA bridge, not MW WWorldPos.
    function springForce({compression,previous,dt,stiffness,compressionDamping,extensionDamping,valving=.4318,digression=.3,progression=7.5,sway=0,blowout=5,mass}){
        let rise=(compression-previous)/dt;
        if(valving>1e-7&&digression>0&&Math.abs(rise)>valving)rise=Math.sign(rise)*valving*Math.pow(Math.abs(rise)/valving,1-digression);
        let damping=rise*(rise>0?compressionDamping:extensionDamping);
        if(damping>blowout*mass*9.81)damping=0;
        return Math.max(0,stiffness*compression*(1+compression*progression)+damping+sway);
    }
    function staticCompression(load,stiffness,progression){return progression>0?(Math.sqrt(1+4*progression*load/stiffness)-1)/(2*progression):load/stiffness;}
    class Suspension {
        constructor(profile){
            this.profile=profile;this.y=0;this.vy=0;this.pitch=0;this.pitchRate=0;this.roll=0;this.rollRate=0;
            // Source BMW ROLL_CENTER=9 inches. Preserve relative catalogue body
            // height while avoiding the old, much taller arcade CG with MW grip.
            this.cgHeight=.2286*profile.cgHeight/.5;
            const kScale=profile.springStiffness/70050.72,dScale=profile.dampingRate/8756.34;
            this.wheels=['fl','fr','rl','rr'].map((key,index)=>{
                const front=index<2,bias=front?profile.frontWeightBias:1-profile.frontWeightBias;
                const stiffness=70050.72*kScale,progression=front?7.5:6,c0=staticCompression(profile.massKg*9.81*bias*.5,stiffness,progression);
                return{key,front,x:(index%2?1:-1)*profile.trackWidth*.5,z:front?profile.wheelbase*(1-profile.frontWeightBias):-profile.wheelbase*profile.frontWeightBias,
                    stiffness,progression,compressionDamping:7005.072*dScale,extensionDamping:8756.34*dScale,swayStiffness:(front?48159.87:35025.36)*kScale,
                    travel:Math.max(.1778,c0*1.8),neutral:c0,compression:c0,load:profile.massKg*9.81*bias*.5,contact:true,offset:0};
            });
        }
        step(dt,{longAccel=0,latAccel=0,downforce=0,groundHeights={}}={}){
            const p=this.profile,mass=p.massKg,steps=Math.max(1,Math.ceil(dt*240)),h=dt/steps;
            const pitchInertia=mass*(p.wheelbase*p.wheelbase*1.5+p.cgHeight*p.cgHeight)/12;
            const rollInertia=mass*(p.trackWidth*p.trackWidth+p.cgHeight*p.cgHeight)/12;
            for(let step=0;step<steps;step++){
                const previous=this.wheels.map(w=>w.compression);let force=0,pitchMoment=-mass*longAccel*this.cgHeight,rollMoment=mass*latAccel*this.cgHeight,bottomOut=0;
                const upness=Math.max(0,Math.cos(this.pitch)*Math.cos(this.roll));
                for(let i=0;i<4;i++){
                    const w=this.wheels[i],ground=Number(groundHeights[w.key])||0;
                    const raw=w.neutral+ground-this.y+this.pitch*w.z-this.roll*w.x;
                    bottomOut=Math.max(bottomOut,raw-w.travel);
                    const c=clamp(raw,0,w.travel),sway=(previous[i]-previous[i^1])*w.swayStiffness;
                    w.contact=c>0&&upness>.2;
                    w.load=w.contact?springForce({...w,compression:c,previous:previous[i],dt:h,sway,mass}):0;
                    w.compression=c;w.offset=c-w.neutral;
                    force+=w.load*upness;pitchMoment-=w.z*w.load;rollMoment+=w.x*w.load;
                }
                this.vy+=(force-mass*9.81-downforce)/mass*h;
                this.pitchRate+=pitchMoment/pitchInertia*h;this.rollRate+=rollMoment/rollInertia*h;
                this.y+=this.vy*h;this.pitch=clamp(this.pitch+this.pitchRate*h,-.45,.45);this.roll=clamp(this.roll+this.rollRate*h,-.45,.45);
                if(bottomOut>0){this.y+=bottomOut;if(this.vy<0)this.vy=0;}
            }
            return this;
        }
    }
    // Adapter policy: keep NOMERA's mass, gearing, RPM limits, car condition and
    // upgrades; use the source curve's shape scaled to the resolved peak torque.
    function createSpec(profile) {
        const engine = { idle: profile.idleRpm, redline: profile.redlineRpm, maxRpm: profile.maxRpm,
            torque: REFERENCE.torque.map(value => value / 283 * profile.baseTorqueNm) };
        return { engine, shifts: shiftPoints(engine, profile.gearRatios), shiftTime: .25 };
    }
    function selected() {
        if (typeof window === 'undefined' || !window.NOMERA_AUTHORS_PREVIEW) return false;
        try { return window.localStorage.getItem('authors_mw_physics_v1') !== 'classic'; }
        catch (_) { return true; }
    }
    return Object.freeze({ torque, shiftPoints, clutch, tireForce, Tire, tireFrame, differential, driveControl, Burnout, DriftController, yawFrictionBoost, wallSteer, steeringRange, steeringRate, SteeringController, springForce, staticCompression, Suspension,
        createSpec, selected, REFERENCE, LOAD });
}));
