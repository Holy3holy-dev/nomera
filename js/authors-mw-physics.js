/* SPDX-License-Identifier: MPL-2.0
 * MW algorithm adapter, translated/adapted from ProStreetMWPhysics (9c6e261),
 * which credits Brawltendo's Most-Wanted-Vehicles-Decomp (de70279).
 * Source lineage, units, deviations and license: docs/MW_PHYSICS_PORT.md.
 * This file is not a claim of Xbox retail equivalence or a full suspension port.
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
    const REMAP = [-1,-.736,-.542,-.4,-.292,-.214,-.16,-.123,-.078,-.036,0,.036,.078,.123,.16,.214,.292,.4,.542,.736,1];
    class SteeringController {
        constructor(){this.time=0;this.inputs=[];this.speeds=[];this.lastInput=0;this.angle=0;this.lastMaximum=0;}
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
                const previous=this.wheels.map(w=>w.compression);let force=0,pitchMoment=-mass*longAccel*p.cgHeight,rollMoment=mass*latAccel*p.cgHeight,bottomOut=0;
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
    return Object.freeze({ torque, shiftPoints, clutch, tireForce, steeringRange, steeringRate, SteeringController, springForce, staticCompression, Suspension,
        createSpec, selected, REFERENCE, LOAD });
}));
