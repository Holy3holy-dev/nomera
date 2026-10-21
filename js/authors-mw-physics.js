/* SPDX-License-Identifier: MPL-2.0
 * MW algorithm adapter, translated/adapted from ProStreetMWPhysics (9c6e261),
 * which credits Brawltendo's Most-Wanted-Vehicles-Decomp (de70279).
 * Source lineage, units, deviations and license: docs/MW_PHYSICS_PORT.md.
 * Tire/contact integration and remaining limits: docs/MW_TIRES_COLLISIONS.md.
 * Traction control, burnout and drift: docs/MW_TRACTION_DRIFT.md.
 * Nitrous, aerodynamics and handbrake integration: docs/MW_NOS_AERO.md.
 * Gear selection, clutch scheduling and RPM smoothing: docs/MW_GEARBOX.md.
 * Angular engine/clutch solver and induction: docs/MW_ENGINE_CLUTCH.md.
 * Center differential and wheel rendering: docs/MW_DRIVELINE_WHEELS.md.
 * Spatial wheel contacts and jump stabilizer: docs/MW_3D_CONTACT.md.
 * This partial adapter does not claim Xbox retail equivalence.
 */
(function (root, factory) {
    const api = factory(typeof module==='object'&&module.exports?require('./authors-mw-contact.js'):root.NomeraMWContact,typeof module==='object'&&module.exports?require('./authors-mw-mass.js'):root.NomeraMWMass,typeof module==='object'&&module.exports?require('./authors-rigid-body.js'):root.NomeraRigidBody,typeof module==='object'&&module.exports?require('./authors-body-damage.js'):root.NomeraBodyDamage);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NomeraMW = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Contact3D,Mass,RigidBody,BodyDamage) {
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
    function shiftPoints(engine, gears, count=gears.length) {
        const up = Array(count).fill(0), down = Array(count).fill(0);
        if(count<gears.length)return{ok:false,up,down};
        for (let j = 2; j < gears.length - 1; j++) {
            const ratio = Math.abs(gears[j]) > .00001 ? gears[j + 1] / gears[j] : 0;
            let rpm = (engine.redline + engine.idle) * .5;
            while (rpm < engine.redline && torque(engine, ratio * rpm) * ratio <= torque(engine, rpm)) rpm += 50;
            up[j] = rpm < engine.redline ? rpm : engine.redline - 100;
            down[j + 1] = ratio * up[j];
        }
        up[gears.length - 1] = engine.redline;
        return { ok:true,up,down };
    }
    // EngineRacer::Clutch::Update. State remains DISENGAGED until caller engages.
    function clutch(state, time, engageTime, dt) {
        time = Math.max(0, time - dt);
        if (state === 'ENGAGING' && time <= 0) state = 'ENGAGED';
        const ratio = state === 'DISENGAGED' ? .25 : state === 'ENGAGING'
            ? 1 - .75 * clamp(time / Math.max(.00001, engageTime), 0, 1) : 1;
        return { state, time, ratio };
    }
    function smoothRPM({shifting=false,gear=2,dt=0,oldRpm=0,newRpm=0,inertia=.5}={}){
        const fast=shifting&&gear>2||gear===1,maxDecel=-(fast?15:2.5)*1000/inertia;
        let rpm=newRpm;
        if(dt>0&&(rpm-oldRpm)/dt<maxDecel)rpm=Math.max(rpm,oldRpm+maxDecel*dt);
        return rpm*.55+oldRpm*.45;
    }
    class Clutch {
        constructor(){this.engageTime=0;this.reset();}
        reset(){this.state='ENGAGED';this.time=0;this.shiftingUp=false;}
        disengage(){if(this.state==='ENGAGED')this.state='DISENGAGED';}
        engage(time){if(this.state==='DISENGAGED'){this.state=time>0?'ENGAGING':'ENGAGED';this.time=this.engageTime=Math.fround(time);}}
        update(dt){
            // Source float timing matters at .05/.25 second boundaries.
            if(this.time>0){this.time=Math.fround(Math.fround(this.time)-Math.fround(dt));if(this.time<=0&&this.state==='ENGAGING')this.state='ENGAGED';}
            return this.state==='DISENGAGED'?.25:this.state==='ENGAGING'?1-clamp(this.engageTime>1e-6?this.time/this.engageTime:0,0,1)*.75:1;
        }
    }
    // Gear indices follow MW: R=0, N=1, first=2. The host converts at its edge.
    class Gearbox {
        constructor({engine,gears,shifts,shiftSpeed=.25}={}){
            this.engine=engine;this.gears=gears;this.shifts=shifts;this.shiftSpeed=shiftSpeed;
            this.gear=2;this.timer=0;this.sportTimer=0;this.potential=0;
            this.clutch=new Clutch();this.shiftingUp=false;
        }
        guessRPM(speed,gear){
            const e=this.engine;
            if(!(this.radius>0))return e.idle;
            return clamp(e.idle+Math.abs(speed)/this.radius*this.finalDrive*(this.gears[gear]||0)*60/(2*Math.PI)*(e.redline-e.idle)/e.redline,e.idle,e.redline);
        }
        guessGear(speed){
            if(speed<0)return 0;
            let gear=2;
            while(gear<this.gears.length-1&&this.guessRPM(speed,gear)>this.shifts.up[gear])gear++;
            return gear;
        }
        findPotential(gear,rpm,gas=0){
            if(gear<=1)return 0;
            let down=this.shifts.down[gear];const up=this.shifts.up[gear],lower=this.gears[gear-1];
            if(gear!==2&&lower>0)down=Math.min(mix(mix(this.engine.idle,down,.65),down,gas),this.shifts.up[gear-1]*this.gears[gear]/lower-200);
            return rpm>=up&&gear<this.gears.length-1?2:rpm<=down&&gear>2?1:0;
        }
        changeGear(gear,{staging=false}={}){
            if(staging&&gear===1)gear=2; // ProStreet staging bridge from source.
            if(gear<0||gear>=this.gears.length||gear===this.gear)return false;
            this.timer=this.shiftSpeed*this.gears[gear]*(gear<this.gear?.25:1);
            this.shiftingUp=gear>this.gear;this.gear=gear;
            this.clutch.shiftingUp=this.shiftingUp;this.clutch.disengage();
            this.potential=0;return true;
        }
        sportShift(gear){
            if(gear===this.gear||gear<=1||this.timer>0||gear>this.gear&&this.potential===1||gear<this.gear&&this.potential===2)return false;
            if(!this.changeGear(gear))return false;
            this.sportTimer=1.25;return true;
        }
        stepShifting(dt,{automatic=true,override=0,staging=false,gas=0,controlGas=gas,transmissionRpm=0,contacts=[true,true,true,true],slips=[0,0,0,0],input=true}={}){
            automatic=input&&automatic;if(override)automatic=override===1;
            if(automatic&&this.gear!==0&&this.timer<=0&&!staging&&this.sportTimer<=0){
                if(this.gear===1)this.gear=2;
                else if(this.potential===1){
                    let next=this.gear-1;
                    const ratio=g=>this.gears[g]>0&&this.gears[this.gear]>1e-7?this.gears[g]/this.gears[this.gear]:0;
                    let rpm=transmissionRpm*ratio(next);
                    while(next>2&&this.findPotential(next,rpm,gas)===1)rpm=transmissionRpm*ratio(--next);
                    this.changeGear(next,{staging});
                }else if([2,4,5].includes(this.potential)&&contacts.length===4&&contacts.every((v,i)=>v&&slips[i]<4))this.changeGear(this.gear+1,{staging});
            }
            if(this.timer>0)this.timer=Math.max(0,this.timer-dt);
            if(this.sportTimer>0&&this.potential)this.sportTimer=input?Math.max(0,this.sportTimer-dt*(2-controlGas)):0;
        }
        updateClutch(dt,{gas=0,rpm=0,transmissionRpm=0}={}){
            const c=this.clutch,ratio=c.update(dt);
            if(this.gear===0||this.gear===2){
                const idle=this.engine.idle+(this.gear===0?2400:800);
                if(rpm>idle||transmissionRpm>idle||gas>=.1)c.engage(.05);
                else c.disengage();
            }else if(this.gear===1)c.disengage();
            else c.engage(.25);
            return ratio;
        }
        updatePotential(rpm,gas=0,staging=false){this.potential=this.clutch.state==='ENGAGED'&&!staging?this.findPotential(this.gear,rpm,gas):0;return this.potential;}
    }
    function engineInertia(flywheelMass,loaded=true){return(flywheelMass*.025+.25)*(loaded?1:.35);}
    function brakingTorque(engineTorque,rpm,engine,values=[.7,.8,.9]){
        return-engineTorque*(values.length>1?clamp(table(values,clamp(rpm,engine.idle,engine.redline),engine.idle,engine.maxRpm),0,1):values[0]);
    }
    function engineOutputTorque(engine,rpm,{inductionBoost=0,nosBoost=1,remote=false,ftlb=false}={}){return torque(engine,rpm)*(ftlb?1.3558:1)*(1+inductionBoost)*(remote?1:nosBoost);}
    class Induction {
        constructor(spec={}){this.spec={idle:800,redline:8500,spoolRpm:.3,highBoost:0,lowBoost:0,vacuum:0,psi:20,spoolUp:.5,spoolDown:.25,...spec};this.spool=0;this.psi=0;this.boost=0;}
        step(dt,{gas=0,rpm=800,gearChanging=false,tuning=0,tuningsPresent=true}={}){
            const p=this.spec,ramp=(v,a,b)=>b-a>1e-6?clamp((v-a)/(b-a),0,1):0;
            if(!(p.highBoost>0||p.lowBoost>0)){this.spool=this.psi=this.boost=0;return this;}
            let threshold=p.spoolRpm;
            if(tuningsPresent&&threshold>0)threshold+=(tuning<0?threshold:1-threshold)*.25*tuning;
            threshold=p.idle+threshold*(p.redline-p.idle);
            let desired=ramp(gas,0,.5);
            if(gearChanging||p.spoolRpm>0&&rpm<threshold)desired=0;
            if(this.spool>desired)this.spool=p.spoolDown>1e-6?Math.max(desired,this.spool-dt/p.spoolDown):desired;
            else if(this.spool<desired)this.spool=p.spoolUp>1e-6?Math.min(desired,this.spool+dt/p.spoolUp):desired;
            this.spool=clamp(this.spool,0,1);
            const low=p.lowBoost*(1-(tuningsPresent?tuning:0)*.25),high=p.highBoost*(1+(tuningsPresent?tuning:0)*.25);
            let boost=0,targetPsi=0;
            if(rpm>=threshold){const ratio=ramp(rpm,threshold,p.redline);boost=mix(low,high,ratio);targetPsi=this.spool*p.psi*ramp(boost,0,Math.max(low,high));}
            else if(p.vacuum<0){const ratio=ramp(rpm,p.idle,threshold);boost=ratio*p.vacuum;targetPsi=ratio*-p.psi*ramp(-boost,0,Math.max(low,high));}
            this.boost=boost*this.spool;
            if(this.psi>targetPsi)this.psi=Math.max(this.psi-dt*20,targetPsi);else if(this.psi<targetPsi)this.psi=Math.min(this.psi+dt*20,targetPsi);
            return this;
        }
    }
    // Complete angular coupling portion of EngineRacer::OnTaskSimulate. The
    // caller supplies throttle/NOS/ECU/induction and schedules gearbox first.
    class AngularEngine {
        constructor({engine,gears,powertrain={}}={}){
            this.engine=engine;this.gears=gears;
            this.spec={flywheelMass:10,torqueConverter:.2,frontShare:0,clutchSlip:.8,finalDrive:3.85,efficiencies:gears.map(()=>1),braking:[.7,.8,.9],...powertrain};
            this.angularVelocity=engine.idle*Math.PI/30;this.angularAcceleration=0;this.transmissionVelocity=0;
            this.clutchRpmDiff=0;this.rpm=engine.idle;this.driveTorque=0;this.driveTorqueAtEngine=0;this.engineBraking=false;
        }
        differential(wheels,locked,gear){
            let value=0;const front=this.spec.frontShare>0,rear=this.spec.frontShare<1;
            for(const[enabled,a,b]of [[front,0,1],[rear,2,3]])if(enabled){
                const w=(wheels[a].omega+wheels[b].omega)*.5;
                if(!locked){if(Math.abs(w)>Math.abs(value))value=w;}
                else value=gear===0?Math.min(w,value):Math.max(w,value);
            }
            return value;
        }
        setDifferential(wheels,omega,speedMps,gear){
            const delta=omega-this.differential(wheels,false,gear),front=this.spec.frontShare>0,rear=this.spec.frontShare<1;
            for(const[enabled,a,b]of [[rear,2,3],[front,0,1]])if(enabled){
                if(speedMps*2.23699<40||!wheels[a].load&&!wheels[b].load){const avg=(wheels[a].omega+wheels[b].omega)*.5;wheels[a].omega=wheels[b].omega=avg;}
                wheels[a].omega+=delta;wheels[b].omega+=delta;
            }
        }
        limitFreeWheels(wheels,limit){
            wheels.forEach((w,i)=>{
                if(w.load>0||(i<2?this.spec.frontShare<=0:this.spec.frontShare>=1))return;
                w.omega=w.omega*limit<0?0:w.omega>0?Math.min(w.omega,limit):w.omega<0?Math.max(w.omega,limit):0;
            });
        }
        step(dt,{gear=2,clutch,gas=0,wheels,speedMps=0,engineTorqueNm,brakingTorqueNm,inductionBoost=0,nosBoost=1,
            peakTorqueRpm=5000,peakTorque=0,staging=false,perfectLaunch=0,revLimiter=true,gearChanging=false,catchup=0,remote=false,
            inputPresent=true,suspensionPresent=true,numWheels=4}={}){
            if(!(dt>0)||!inputPresent||!suspensionPresent||numWheels!==4)return this.last;
            const p=this.spec,e=this.engine,toW=Math.PI/30,toR=30/Math.PI;
            const maxW=(revLimiter?e.redline:e.maxRpm)*toW,minW=e.idle*toW,inertia=engineInertia(p.flywheelMass,gear!==1);
            const axle=this.differential(wheels,false,gear),diff=this.differential(wheels,true,gear),grounded=wheels.filter(w=>w.load>0).length;
            const wheelRatio=Math.max(.25,grounded*.25),clutchRatio=clutch.update(dt),direction=gear===0?-1:1,rpm=this.angularVelocity*toR;
            let totalRatio=this.gears[gear]*p.finalDrive*direction;
            if(p.torqueConverter>0){let converter=p.torqueConverter*gas*(1-clamp((rpm-e.idle)/(peakTorqueRpm-e.idle),0,1));if(gearChanging)converter*=clutchRatio;totalRatio*=1+converter;}
            if(totalRatio===0&&gear!==1)return this.last;
            if(gear===0||gear===2){
                const idle=minW+(gear===0?2400:800)*toW;
                if(this.angularVelocity>idle||this.transmissionVelocity>idle||gas>=.1)clutch.engage(.05);else clutch.disengage();
            }else if(gear===1)clutch.disengage();else clutch.engage(.25);
            let engineTorque=engineTorqueNm??engineOutputTorque(e,rpm,{inductionBoost,nosBoost,remote});
            let brake=brakingTorqueNm??brakingTorque(engineTorque,rpm,e,p.braking);
            if(!staging&&perfectLaunch>0&&gas>0){gas=1;engineTorque=peakTorque*nosBoost;brake=0;}
            const oldTransmission=this.transmissionVelocity;
            this.transmissionVelocity=minW+diff*totalRatio*(maxW-minW)/maxW;
            const transAcceleration=(this.transmissionVelocity-oldTransmission)/dt;
            if(gear!==1&&clutch.state==='ENGAGED'&&brake*axle*direction>0)brake=-brake;
            const totalTorque=engineTorque*gas+brake*(1-gas);let drive=0,road=0;
            this.engineBraking=totalTorque<0;
            if(gear!==1){
                if(clutch.state==='ENGAGED'){this.clutchRpmDiff=0;drive=totalTorque;road-=totalTorque*wheelRatio;}
                else if(clutch.state==='ENGAGING'){
                    const delta=clamp(this.angularVelocity-this.transmissionVelocity,-300,300),rpmDiff=(this.transmissionVelocity-this.angularVelocity)*toR;
                    const stiffness=this.clutchRpmDiff!==0&&rpmDiff*this.clutchRpmDiff<0&&Math.abs(rpmDiff)>2000&&Math.abs(this.clutchRpmDiff)>2000?10:20;
                    this.clutchRpmDiff=rpmDiff;drive+=delta*stiffness*clutchRatio;road-=delta*stiffness*clutchRatio*wheelRatio;
                }else this.clutchRpmDiff=0;
                if(clutch.state==='ENGAGED'){
                    const acceleration=(totalTorque+road)/inertia;
                    let response=1/inertia;
                    if(p.frontShare>0)response+=p.frontShare*.1*totalRatio*totalRatio*.5;
                    if(p.frontShare<1)response+=(1-p.frontShare)*.1*totalRatio*totalRatio*.5;
                    const reaction=(acceleration-transAcceleration)/response;
                    drive+=Math.min(reaction,0);road-=reaction*wheelRatio;
                }
                if(clutch.state==='ENGAGED'&&grounded>0){
                    const driven=wheels.filter((_,i)=>i<2?p.frontShare>0:p.frontShare<1),slip=driven.reduce((sum,w)=>sum+w.slip,0)/driven.length;
                    const delta=this.transmissionVelocity-this.angularVelocity;
                    if(gas>.2&&slip*direction>.1&&gear<=2&&delta<0){this.transmissionVelocity=this.angularVelocity;this.setDifferential(wheels,this.angularVelocity/totalRatio,speedMps,gear);}
                    else road+=clamp(delta*20,-Math.abs(totalTorque),Math.abs(totalTorque));
                }
                if(gear===0||gear===2){const sum=totalTorque+road;if(road<totalTorque&&sum<0)road+=graph([[-10,1],[-7.5,.96],[-3.5,.925],[-.3,.875],[-.05,0]],sum*1000)*sum*p.clutchSlip;}
            }
            if(gear!==1&&gas>0&&gear<=2&&clutch.state==='ENGAGED'&&road*totalTorque<0){
                const slip=p.clutchSlip*gas*(1-gas*clamp((rpm-e.idle)/(peakTorqueRpm-e.idle),0,1));road*=(1-slip)*(1-slip);
            }
            this.angularAcceleration=(totalTorque+road)/inertia;
            this.angularVelocity=clamp(this.angularVelocity+this.angularAcceleration*dt,minW,maxW);
            if(totalRatio!==0)this.limitFreeWheels(wheels,maxW/totalRatio);
            if(this.transmissionVelocity>maxW&&totalRatio!==0){if(drive*totalRatio>0)drive=0;this.transmissionVelocity=maxW;this.setDifferential(wheels,maxW/totalRatio,speedMps,gear);}
            if(drive>0)drive*=1+catchup*.5;
            this.driveTorque=drive*totalRatio*(p.efficiencies[gear]??1);this.driveTorqueAtEngine=drive;
            this.rpm=smoothRPM({shifting:gearChanging||clutch.state==='DISENGAGED',gear,dt,oldRpm:this.rpm,newRpm:this.angularVelocity*toR,inertia});
            return this.last={driveTorque:this.driveTorque,driveTorqueAtEngine:drive,engineTorque,totalEngineTorque:totalTorque,roadTorque:road,
                clutchRatio,totalRatio,throttle:gas,engineRpm:this.angularVelocity*toR,transmissionRpm:this.transmissionVelocity*toR,rpm:this.rpm};
        }
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
    class Nitrous {
        constructor(spec={}){
            this.spec={capacitySeconds:5,boost:1,rechargeMinSpeed:50,rechargeMaxSpeed:100,rechargeMin:50,rechargeMax:30,disengage:2,...spec};
            this.tank=1;this.timer=0;this.active=false;
        }
        step(dt,{speedMps=0,gear=1,gas=0,button=false,canRecharge=true,blown=false,hasNOS=true,tuning=0,catchup=0,remote=false,infinite=false}={}){
            this.active=false;
            const p=this.spec,mph=speedMps*2.23699;
            if(!hasNOS||p.capacitySeconds<=0||p.boost<=0||!(dt>0))return 1;
            let recharge=0;
            if(canRecharge&&mph>=p.rechargeMinSpeed&&gear>=1)recharge=mix(p.rechargeMin,p.rechargeMax,clamp((mph-p.rechargeMinSpeed)/(p.rechargeMaxSpeed-p.rechargeMinSpeed),0,1));
            let engaged=button&&gear>=1&&gas>0&&!blown;
            if(mph<(this.timer>=1?5:10))engaged=false;
            const capacity=p.capacitySeconds*(1-.25*tuning);
            if(capacity<=0){this.tank=0;this.timer=0;return 1;}
            if(engaged&&this.tank>0){
                // Human/non-remote path is used by NOMERA; cheat arguments are
                // retained solely to compare the isolated upstream fixtures.
                this.tank=Math.max(0,this.tank-(infinite||remote?0:dt/capacity)*mix(1,.5,catchup));
                this.timer=1;this.active=true;return 1+p.boost*(1+.25*tuning);
            }
            if(this.timer>0&&p.disengage>0)this.timer=Math.max(0,this.timer-dt/p.disengage);
            else if(this.tank<1&&recharge>0){this.tank=Math.min(1,this.tank+dt/recharge*mix(1,2,catchup));this.timer=0;}
            else this.timer=0;
            return 1;
        }
    }
    // Body/pose-independent source aerodynamic force calculation. The pose
    // below is the same orthonormal basis used by the compiled C++ oracle.
    function aerodynamics({speed=0,lateral=0,forward=0,gas=1,groundEffect=1,roll=0,pitch=0,tuning=0,
        dragPct=1,aeroPct=1,cog=[0,0,0],frontZ=1.25,rearZ=-1.45,dragCoefficient=.32,aeroCoefficient=.24,aeroCG=47}={}){
        const cr=Math.cos(roll),sr=Math.sin(roll),cp=Math.cos(pitch),sp=Math.sin(pitch);
        const rotate=([x,y,z])=>[cr*x-sr*cp*y+sr*sp*z,sr*x+cr*cp*y-cr*sp*z,sp*y+cp*z];
        const forces=[];let downforce=0,drag=[0,0,0];
        if(dragPct>0){
            const amount=speed*dragPct*dragCoefficient*(2-gas)*(1+.25*tuning);
            drag=[-lateral*amount,0,-forward*amount];
            const center=[...cog];if(groundEffect>=.5)center[1]-=.1*(1-gas);
            forces.push({force:drag,point:rotate(center)});
        }
        if(aeroPct>0){
            const upness=groundEffect>=.5?1:Math.max(0,cr*cp);
            const dot=speed>.0001?(lateral*sr*sp+forward*cp)/speed:1;
            const forwardness=Math.max(.4,Math.sqrt(Math.max(dot,0)));
            downforce=aeroPct*upness*forwardness*speed*aeroCoefficient*2000;
            if(groundEffect===0)downforce*=.8;
            downforce*=1+.25*tuning;
            if(downforce>0){const center=[...cog];if(groundEffect!==0)center[2]=(frontZ-rearZ)*aeroCG*.01+rearZ;forces.push({force:rotate([0,-downforce,0]),point:rotate(center)});}
        }
        return{forces,downforce,drag};
    }
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
        if(sum<=1e-6)return[bias,1-bias];
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
    function driveControl({torque=0,frontShare=0,wheels=[],burnout={state:0,traction:1},steer=0,forward=0,lateral=0,factor=[.8,.8,0],conserveTorque=false}={}){
        const output={torques:[0,0,0,0],boost:[1,1,1,1],control:[1,1,1,1],splits:[.5,.5,.5,.5],active:false,centerSplit:[frontShare,1-frontShare],normalized:false};
        const conserve=split=>{const sum=split[0]+split[1];if(conserveTorque&&sum>1+1e-6){output.normalized=true;return split.map(v=>v/sum);}return split;};
        if(factor[2]>0&&wheels.length===4)output.centerSplit=conserve(differential({bias:frontShare,factor:factor[2],
            omega:[wheels[0].omega+wheels[1].omega,wheels[2].omega+wheels[3].omega],
            contact:[wheels[0].load>0||wheels[1].load>0,wheels[2].load>0||wheels[3].load>0]}));
        for(let axle=0;axle<2;axle++){
            const share=output.centerSplit[axle],axleTorque=torque*share;
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
            const split=conserve(differential({omega:pair.map(t=>t.omega),contact:pair.map(t=>t.load>0),bias,locked,factor:factor[axle]}));
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
        constructor({responsive=false}={}){this.responsive=responsive;this.time=0;this.inputs=[];this.speeds=[];this.lastInput=0;this.angle=0;this.lastMaximum=0;}
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
            const response=this.responsive?(input===0?1.75:input*this.angle<0?2:1.35):1;
            const rate=180*rateScale*average(this.speeds)*table([1,1.05,1.1,1.2,1.3,1.4],avg,0,1)*response;
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
            // Per-car source mass attributes; modern cars use explicit estimates.
            this.massProperties=Mass.properties(profile);this.cgHeight=this.massProperties.rollCenter;this.cgZ=0;
            const kScale=profile.springStiffness/70050.72,dScale=profile.dampingRate/8756.34;
            this.wheels=['fl','fr','rl','rr'].map((key,index)=>{
                const front=index<2,bias=front?profile.frontWeightBias:1-profile.frontWeightBias;
                const stiffness=70050.72*kScale,progression=front?7.5:6,c0=staticCompression(profile.massKg*9.81*bias*.5,stiffness,progression);
                return{key,front,x:(index%2?1:-1)*profile.trackWidth*.5,z:front?profile.wheelbase*(1-profile.frontWeightBias):-profile.wheelbase*profile.frontWeightBias,
                    stiffness,progression,compressionDamping:7005.072*dScale,extensionDamping:8756.34*dScale,swayStiffness:(front?48159.87:35025.36)*kScale,
                    travel:Math.max(.1778,c0*1.8),neutral:c0,compression:c0,load:profile.massKg*9.81*bias*.5,contact:true,offset:0};
            });
            this.staticCompression=this.wheels.reduce((sum,w)=>sum+w.neutral,0)/4;
            this.sourceOriginY=this.massProperties.dimensions[1]/2+Math.max(...this.massProperties.ride)-this.staticCompression;
            this.updateCenterOfGravity(4);
            for(const w of this.wheels)w.queryY=this.massProperties.ride[w.front?0:1]-w.neutral;
        }
        updateCenterOfGravity(touching){
            const p=this.profile,m=this.massProperties;
            const local=Mass.sourceCOG({frontAxle:p.wheelbase*(1-p.frontWeightBias),wheelbase:p.wheelbase,halfHeight:m.dimensions[1]/2,
                bias:p.frontWeightBias*100,rollCenter:m.rollCenter/.0254,ride:m.ride.map(v=>v/.0254),touching});
            this.cgHeight=local[1]+this.sourceOriginY;this.cgZ=local[2];
        }
        step(dt,{longAccel=0,latAccel=0,downforce=0,aeroCenterZ=0,dragPitchMoment=0,dragRollMoment=0,groundHeights={}}={}){
            const p=this.profile,mass=p.massKg,steps=Math.max(1,Math.ceil(dt*240)),h=dt/steps;
            const pitchInertia=mass*(p.wheelbase*p.wheelbase*1.5+p.cgHeight*p.cgHeight)/12;
            const rollInertia=mass*(p.trackWidth*p.trackWidth+p.cgHeight*p.cgHeight)/12;
            for(let step=0;step<steps;step++){
                const previous=this.wheels.map(w=>w.compression);let force=0,pitchMoment=-mass*longAccel*this.cgHeight+downforce*aeroCenterZ+dragPitchMoment,rollMoment=mass*latAccel*this.cgHeight+dragRollMoment,bottomOut=0;
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
        const inductionBoost=['turbo','supercharger'].includes(profile.inductionType)?profile.inductionBoost:0;
        const differential=profile.id==='wrx'?[.7,.75,.75]:profile.id==='evo8_earl'?[.7,.7,.7]:profile.id==='gallardo_ming'?[.8,.8,.8]:[.8,.8,profile.drivetrain==='AWD'?.75:0];
        return { engine, differential,gears:profile.gearRatios.map(Math.abs),shifts: shiftPoints(engine, profile.gearRatios), shiftTime: .25,shiftSpeed:.25,
            powertrain:{flywheelMass:10,torqueConverter:.2,frontShare:profile.torqueSplit,clutchSlip:.8,finalDrive:profile.finalDrive,efficiencies:profile.gearRatios.map(()=>.92),braking:[.7,.8,.9]},
            induction:{idle:profile.idleRpm,redline:profile.redlineRpm,spoolRpm:profile.inductionType==='turbo'?(profile.spoolRpmRatio||.34):0,
                highBoost:inductionBoost,lowBoost:inductionBoost,
                vacuum:0,psi:profile.inductionType==='supercharger'?12:18.5,spoolUp:1/2.8,spoolDown:1/4.5},
            nos:{capacitySeconds:100/profile.nitroDrainRate,boost:profile.nitroTorqueMult-1,rechargeMin:100/profile.nitroRechargeRate,rechargeMax:60/profile.nitroRechargeRate},
            // Calibrate the catalogue BMW M3 to the source BMW coefficients;
            // preserve relative car/wing/upgrade differences in NOMERA.
            aero:{dragCoefficient:profile.dragCoeff*.32/.24,aeroCoefficient:profile.downforceCoeff*.24/.76,aeroCG:47} };
    }
    // Source OnCollision notification; event impulse units belong to the host
    // ABI. Callers must explicitly map SI impacts before using these thresholds.
    function collisionResponse({type='WORLD',impulseA=0,impulseB=0,objAImmobile=false,objBImmobile=false,objB=0,ownerHandle=123,normal=[0,1,0],closingVel=[0,0,0],objAVel=[0,0,0],position=[0,0,0],bodyPosition=[0,0,0],forward=[0,0,1],right=[1,0,0],halfLength=2,signedVehicleSpeed=0,initialTimer=0,complexBody=true,time=0,lastGroundCollision=0,wallNoseTurn=0,wallSideTurn=0}={}){
        const dot=Contact3D.dot,sub=Contact3D.sub;let collisionTimer=initialTimer;
        if(type==='WORLD'||type==='OBJECT'){const impulse=objB===ownerHandle?(objBImmobile?0:impulseB):(objAImmobile?0:impulseA);if(impulse>10)collisionTimer=Math.max(collisionTimer,clamp((impulse-10)/30,0,1));}
        if(type==='GROUND')lastGroundCollision=time;
        if(type==='WORLD'&&Math.abs(normal[1])<.1&&complexBody&&dot(closingVel,closingVel)<56.25){const r=sub(position,bodyPosition),along=dot(r,forward),side=dot(normal,right);
            if(wallNoseTurn===0&&dot(objAVel,objAVel)<6.25&&dot(normal,forward)<=0&&along>halfLength*.75)wallNoseTurn=(side>0?1:-1)-side;
            if(wallSideTurn===0&&signedVehicleSpeed<0&&Math.abs(side)>1e-6&&Math.abs(along)>halfLength*.75)wallSideTurn=side;
        }return{collisionTimer,wallNoseTurn,wallSideTurn,lastGroundCollision};
    }
    function selected() {
        if (typeof window === 'undefined' || !window.NOMERA_AUTHORS_PREVIEW) return false;
        try { return window.localStorage.getItem('authors_mw_physics_v1') !== 'classic'; }
        catch (_) { return true; }
    }
    return Object.freeze({ torque, shiftPoints, clutch, Clutch, smoothRPM, engineInertia, brakingTorque, engineOutputTorque, Induction, AngularEngine, Gearbox, Nitrous, aerodynamics, tireForce, Tire, tireFrame, differential, driveControl, Burnout, DriftController, yawFrictionBoost, wallSteer, steeringRange, steeringRate, SteeringController, springForce, staticCompression, Suspension,
        Contact3D, Mass, RigidBody, BodyDamage, collisionResponse, createSpec, selected, REFERENCE, LOAD });
}));
