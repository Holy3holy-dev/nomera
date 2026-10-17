'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');

function setup3DContext() {
    global.window = global;
    global.self = global;
    global.document = {
        createElement: (tag) => {
            const el = {
                getContext: () => ({
                    fillRect: () => {},
                    clearRect: () => {},
                    fillText: () => {},
                    drawImage: () => {},
                    measureText: () => ({ width: 100 }),
                    beginPath: () => {},
                    ellipse: () => {},
                    fill: () => {},
                    createRadialGradient: () => ({ addColorStop: () => {} }),
                    createLinearGradient: () => ({ addColorStop: () => {} })
                }),
                width: 512,
                height: 512,
                style: {},
                classList: {
                    add: () => {},
                    remove: () => {},
                    contains: () => false
                },
                appendChild: () => {},
                removeChild: () => {},
                parentNode: null,
                closest: () => null
            };
            el.parentNode = el;
            return el;
        },
        createElementNS: () => ({ style: {} }),
        getElementById: () => null,
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    try {
        if (!global.navigator) {
            Object.defineProperty(global, 'navigator', { value: { userAgent: 'NodeTest' }, configurable: true });
        }
    } catch (_) {}
    global.requestAnimationFrame = () => 0;
    global.cancelAnimationFrame = () => {};

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = global.document.createElement('canvas');
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
        dispose() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/race-effects.js')];
    delete require.cache[require.resolve('../js/car-3d.js')];
    const RaceEffectsManager = require('../js/race-effects.js');
    global.RaceEffectsManager = RaceEffectsManager;
    const Car3DManager = require('../js/car-3d.js');

    const mockContainer = {
        clientWidth: 800,
        clientHeight: 500,
        style: {},
        appendChild: () => {},
        removeChild: () => {}
    };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        styling: { wheels: 'stamps' },
        performance: { speed: 180, accel: 3.5 }
    });

    return { THREE, RaceEffectsManager, Car3DManager, engine };
}

test('3D Race: Handbrake applies strong rear braking force (~85-110 km/h/s) and decelerates to 0', () => {
    const { engine } = setup3DContext();
    engine.state.speed = 100;
    engine.keys.drift = true;
    engine.keys.gas = false;

    // Step physics for 0.1s
    const dt = 0.1;
    const initialSpeed = engine.state.speed;
    engine.update(dt);

    const decelRate = (initialSpeed - engine.state.speed) / dt;
    assert.ok(decelRate >= 85 && decelRate <= 115, `3D handbrake deceleration (${decelRate.toFixed(1)} km/h/s) must be in ~85-110 km/h/s range`);

    // Hold handbrake until vehicle stops: must decelerate smoothly all the way to 0 km/h
    for (let i = 0; i < 30; i++) {
        engine.update(0.05);
    }
    assert.equal(engine.state.speed, 0, 'Handbrake held down must bring car speed to complete stop (0 km/h)');
    engine.destroy();
});

test('3D Race: Handbrake cuts or dramatically overpowers engine acceleration when holding gas', () => {
    const { engine } = setup3DContext();
    engine.state.speed = 120;
    engine.keys.drift = true;
    engine.keys.gas = true; // Player holding gas AND handbrake

    const dt = 0.1;
    const initialSpeed = engine.state.speed;
    engine.update(dt);

    assert.ok(engine.state.speed < initialSpeed, 'Handbrake must decelerate the car even when gas is held');
    const decelRate = (initialSpeed - engine.state.speed) / dt;
    assert.ok(decelRate >= 80, `Deceleration with gas (${decelRate.toFixed(1)} km/h/s) must overpower engine acceleration`);
    engine.destroy();
});

test('3D Race: Handbrake spawns rear tire smoke and skid marks at speed', () => {
    const { engine } = setup3DContext();
    engine.state.speed = 90;
    engine.keys.drift = true;
    engine.keys.gas = false;

    // Step physics
    engine.state.z = 10;
    engine.update(0.05);
    engine.state.z = 12;
    engine.update(0.05);

    assert.ok(engine.vfx.activeSmoke.length >= 2, 'Handbrake at speed must spawn rear wheel tire smoke puffs');
    assert.ok(engine.vfx.activeSkids.length >= 2, 'Handbrake at speed must lay down rear wheel skid marks on asphalt');
    engine.destroy();
});

test('3D Race: Straight-line stability tracks laser straight with zero phantom veering or swaying', () => {
    const { engine } = setup3DContext();
    engine.mode = 'highway';
    engine.state.speed = 160;
    engine.state.x = 2.125;
    engine.state.vx = 0;
    engine.state.yawAngle = 0;
    engine.keys.left = false;
    engine.keys.right = false;
    engine.keys.drift = false;
    engine.keys.gas = true;

    const initialX = engine.state.x;

    // Simulate 3 seconds of high-speed straight driving
    for (let frame = 0; frame < 60; frame++) {
        engine.update(0.05);
    }

    assert.equal(engine.state.x, initialX, 'Car must maintain laser-straight lane position with steer neutral');
    assert.equal(engine.state.vx, 0, 'Lateral velocity must remain 0 when driving straight');
    assert.equal(engine.state.yawAngle, 0, 'Heading yawAngle must remain 0 straight forward');
    engine.destroy();
});

test('3D Race: Straight-line stability rapidly damps residual lateral velocity and aligns yaw to 0', () => {
    const { engine } = setup3DContext();
    engine.mode = 'highway';
    engine.state.speed = 140;
    engine.state.vx = 2.0; // small perturbance
    engine.state.yawAngle = 0.08;
    engine.keys.left = false;
    engine.keys.right = false;
    engine.keys.drift = false;
    engine.keys.gas = true;

    // Step for 0.5s: straight-line directional stability should damp vx and yawAngle to 0
    for (let i = 0; i < 15; i++) {
        engine.update(0.033);
    }

    assert.ok(Math.abs(engine.state.vx) < 0.01, 'Residual lateral velocity must be damped to 0');
    assert.ok(Math.abs(engine.state.yawAngle) < 0.005, 'Vehicle heading must align straight forward');
    engine.destroy();
});

test('2D Race: Handbrake aggressively slows down car (~85-110 km/h/s) all the way to 0 km/h', () => {
    const app = createApp();
    app.run(`
        setRaceMode('highway');
        racePlayer = {
            x: 200,
            y: 500,
            vx: 0,
            speed: 120,
            maxSpeed: 240,
            targetSpeed: 240,
            handling: 8,
            accel: 6,
            isDrifting: false,
            driftDuration: 0,
            driftCombo: 1,
            driftCurrentScore: 0,
            driftScore: 0,
            yawAngle: 0,
            tilt: 0,
            damageTaken: 0,
            fuelConsumption: 10,
            fuelLiters: 0,
            fuelCurrent: 25,
            shield: 0,
            isNitroActive: false,
            isDrafting: false
        };
        raceKeys = { gas: true, brake: false, left: false, right: false, nitro: false, drift: true };
    `);

    // Step 0.1s: check deceleration with gas pressed
    const speedBefore = app.run('racePlayer.speed');
    app.run('updateRacePhysics(0.1)');
    const speedAfter = app.run('racePlayer.speed');
    const decel = (speedBefore - speedAfter) / 0.1;

    assert.ok(decel >= 85 && decel <= 115, `2D handbrake deceleration (${decel.toFixed(1)} km/h/s) must be in ~85-110 km/h/s range`);

    // Hold handbrake: must decelerate all the way to 0 km/h (not stuck at 25 km/h)
    for (let step = 0; step < 25; step++) {
        app.run('updateRacePhysics(0.06)');
    }
    const finalSpeed = app.run('racePlayer.speed');
    assert.equal(finalSpeed, 0, '2D handbrake must decelerate all the way down to 0 km/h');
});

test('2D Race: Handbrake at speed generates rear tire smoke and dual skid marks', () => {
    const app = createApp();
    app.run(`
        setRaceMode('highway');
        raceDriftSmoke = [];
        raceSkidmarks = [];
        racePlayer = {
            x: 200,
            y: 500,
            vx: 0,
            speed: 100,
            maxSpeed: 240,
            targetSpeed: 240,
            handling: 8,
            accel: 6,
            isDrifting: false,
            driftDuration: 0,
            driftCombo: 1,
            driftCurrentScore: 0,
            driftScore: 0,
            yawAngle: 0,
            tilt: 0,
            damageTaken: 0,
            fuelConsumption: 10,
            fuelLiters: 0,
            fuelCurrent: 25,
            shield: 0,
            isNitroActive: false,
            isDrafting: false
        };
        raceKeys = { gas: false, brake: false, left: false, right: false, nitro: false, drift: true };
        updateRacePhysics(0.05);
    `);

    const smokeCount = app.run('raceDriftSmoke.length');
    const skidmarksCount = app.run('raceSkidmarks.length');

    assert.ok(smokeCount >= 2, 'Handbrake at speed in 2D must spawn rear tire smoke particles');
    assert.ok(skidmarksCount >= 2, 'Handbrake at speed in 2D must spawn dual rear wheel skidmarks');
});
