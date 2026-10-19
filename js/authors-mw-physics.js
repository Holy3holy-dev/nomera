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
    return Object.freeze({ torque, shiftPoints, clutch, tireForce, steeringRange, steeringRate,
        createSpec, selected, REFERENCE, LOAD });
}));
