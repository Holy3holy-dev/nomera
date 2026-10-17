'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

function setupTestContext() {
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
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    // Load Three.js
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

    // Load RaceEffectsManager and Car3DManager
    delete require.cache[require.resolve('../js/race-effects.js')];
    delete require.cache[require.resolve('../js/car-3d.js')];
    const RaceEffectsManager = require('../js/race-effects.js');
    global.RaceEffectsManager = RaceEffectsManager;
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, RaceEffectsManager, Car3DManager };
}

function createMockEngine(THREE) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100);
    const container = global.document.createElement('div');

    const state = {
        x: 0,
        z: 0,
        vx: 0,
        speed: 0,
        maxSpeed: 280,
        rpm: 1000,
        maxRpm: 8500,
        gear: 'D1',
        isDrifting: false,
        driftCombo: 1,
        driftScore: 0,
        isNitroActive: false,
        nitroLevel: 100,
        shakeAmount: 0
    };

    const keys = {
        gas: false,
        brake: false,
        left: false,
        right: false,
        drift: false,
        nitro: false
    };

    const playerCar = new THREE.Group();
    // Bounding dimensions
    const bodyGeo = new THREE.BoxGeometry(1.9, 1.4, 4.4);
    const bodyMat = new THREE.MeshBasicMaterial();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    playerCar.add(body);
    scene.add(playerCar);

    return {
        THREE,
        scene,
        camera,
        container,
        playerCar,
        state,
        keys,
        currentActiveWeather: 'night'
    };
}

test('1. Tire Smoke Billows: volumetric puffs generated during burnouts, high slip drifts, and hard braking', () => {
    const { THREE, RaceEffectsManager } = setupTestContext();
    const engine = createMockEngine(THREE);
    const vfx = new RaceEffectsManager(engine);

    assert.ok(vfx.smokePool.length > 30, 'Smoke pool must pre-allocate at least 30 puffs');
    assert.equal(vfx.activeSmoke.length, 0, 'Initially no active smoke puffs');

    // Case A: Burnout launch (gas pressed, speed < 30, high RPM)
    engine.keys.gas = true;
    engine.state.speed = 10;
    engine.state.rpm = 4500;
    vfx.update(0.05);

    assert.ok(vfx.activeSmoke.length >= 2, 'Burnout launch must generate smoke puffs at rear wheels');
    const firstPuff = vfx.activeSmoke[0];
    assert.ok(firstPuff.mesh.visible, 'Puff mesh must be visible in scene');
    assert.ok(firstPuff.vy > 0, 'Puff must rise upward with vertical velocity');
    assert.ok(firstPuff.maxScale > firstPuff.startScale, 'Puff must expand volumetric scale over time');

    // Step simulation: puff expands and tumbles
    const prevScale = firstPuff.mesh.scale.x;
    vfx.update(0.1);
    assert.ok(firstPuff.mesh.scale.x > prevScale, 'Puff scale must expand as it billows outward');

    // Case B: High slip angle drift
    vfx.activeSmoke.length = 0; // clear
    engine.keys.gas = false;
    engine.state.speed = 120;
    engine.state.isDrifting = true;
    engine.state.vx = 4.5;
    vfx.update(0.05);
    assert.ok(vfx.activeSmoke.length >= 2, 'High slip angle drift must generate dense rear wheel smoke');

    // Case C: Hard braking lockup
    vfx.activeSmoke.length = 0;
    engine.state.isDrifting = false;
    engine.state.vx = 0;
    engine.keys.brake = true;
    engine.state.speed = 95;
    vfx.update(0.05);
    assert.ok(vfx.activeSmoke.length >= 2, 'Hard braking lockup at high speed must generate tire smoke');
});

test('2. Sparks on Collision: dynamic orange/yellow sparks with gravity, scatter, and asphalt bounce', () => {
    const { THREE, RaceEffectsManager } = setupTestContext();
    const engine = createMockEngine(THREE);
    const vfx = new RaceEffectsManager(engine);

    assert.ok(vfx.sparkPool.length >= 50, 'Spark pool must pre-allocate at least 50 sparks');
    assert.ok(vfx.sparkMats.length >= 3, 'Sparks must use a multi-tone incandescent palette');

    // Spawn sparks burst from impact
    vfx.spawnSparks(0, 0.5, 10, 15);
    assert.equal(vfx.activeSparks.length, 15, 'Must spawn requested count of sparks');

    const spark = vfx.activeSparks[0];
    assert.ok(spark.mesh.visible, 'Active spark must be visible');
    assert.ok(spark.gravity > 0, 'Spark must have downward gravity');
    assert.ok(spark.bounciness > 0, 'Spark must have asphalt restitution/bounciness');

    // Verify gravity integration
    const initialVy = spark.vy;
    vfx.update(0.02);
    assert.ok(spark.vy < initialVy, 'Gravity must reduce vertical velocity vy over time');

    // Test asphalt surface bounce: force spark to ground level y = 0.01 with downward vy = -5.0
    spark.mesh.position.y = 0.01;
    spark.vy = -5.0;
    const preBounceVx = spark.vx;
    vfx.update(0.01);
    assert.ok(spark.vy > 0, 'Spark hitting asphalt surface (y <= 0.02) must invert vy and bounce upward');
    assert.ok(spark.mesh.position.y >= 0.02, 'Spark position must be clamped above road surface');
    assert.ok(Math.abs(spark.vx) <= Math.abs(preBounceVx), 'Kinetic friction on road contact must damp horizontal motion');

    // Test continuous barrier/curb brushing at guardrail boundary (|x| >= 7.6)
    vfx.activeSparks.length = 0;
    engine.state.x = 7.9; // brushing right guardrail
    engine.state.speed = 90;
    vfx.update(0.05);
    assert.ok(vfx.activeSparks.length > 0, 'Brushing guardrail barrier at speed must emit scraping sparks stream');
});

test('3. Tire Skid Marks on Asphalt: dark ribbon trails during intense slides and hard braking with persistence & fade', () => {
    const { THREE, RaceEffectsManager } = setupTestContext();
    const engine = createMockEngine(THREE);
    const vfx = new RaceEffectsManager(engine);

    assert.ok(vfx.skidPool.length >= 100, 'Skid mark pool must pre-allocate at least 100 segments');

    // Drive forward while drifting
    engine.state.speed = 110;
    engine.state.isDrifting = true;
    engine.state.vx = 3.2;

    // Anchor first position
    engine.state.z = 10;
    vfx.update(0.05);

    // Move forward past distance threshold (>= 0.55m)
    engine.state.z = 12;
    vfx.update(0.05);

    assert.ok(vfx.activeSkids.length >= 2, 'Drifting must lay down dual tire skid mark ribbon segments');
    const skid = vfx.activeSkids[0];
    assert.ok(skid.mesh.visible, 'Active skid mark must be visible');
    assert.ok(Math.abs(skid.mesh.position.y - 0.012) < 0.005, 'Skid mark must sit at y ≈ 0.012 above asphalt to prevent z-fighting');
    assert.ok(skid.mesh.material.opacity > 0.4, 'New skid mark must be dark with strong opacity');
    assert.ok(skid.maxLife >= 5.0, 'Skid marks must persist on road for several seconds');

    // Test persistence: after 1 second, opacity remains dark
    skid.life = 1.0;
    vfx.update(0.01);
    assert.ok(skid.mesh.material.opacity > 0.4, 'Skid mark must remain dark during initial persistence period');

    // Test smooth fade out: near end of life (life > 3.5s), opacity fades towards 0
    skid.life = 5.5;
    vfx.update(0.01);
    assert.ok(skid.mesh.material.opacity < 0.35, 'Skid mark must smoothly fade opacity as it approaches end of life');
});

test('4. Sensation of High Speed: dynamic FOV widening approaching 250+ km/h and peripheral speed streaks', () => {
    const { THREE, RaceEffectsManager } = setupTestContext();
    const engine = createMockEngine(THREE);
    const vfx = new RaceEffectsManager(engine);

    // A. Dynamic FOV widening
    const baseFov = 58;
    const fovLow = vfx.enhanceCameraFOV(baseFov, { speed: 100, isNitroActive: false });
    assert.equal(fovLow, baseFov, 'Sub-220 km/h speed should not add high-speed warp widening');

    const fov250 = vfx.enhanceCameraFOV(baseFov, { speed: 255, isNitroActive: false });
    assert.ok(fov250 > baseFov + 1.0, 'Speed approaching 255 km/h must begin dynamic camera FOV widening');

    const fovHypersonic = vfx.enhanceCameraFOV(baseFov, { speed: 380, isNitroActive: true });
    assert.ok(fovHypersonic >= baseFov + 12.0, 'Hypersonic speed (380 km/h) with nitro must widen FOV substantially (+12° or more)');

    // B. Peripheral speed streak lines
    assert.ok(vfx.speedStreaksMesh, 'Speed streak mesh must be initialized in scene');
    assert.equal(vfx.speedStreaksMesh.visible, false, 'Streaks invisible at low speeds');

    // At hypersonic speed
    engine.state.speed = 320;
    vfx.update(0.02);
    assert.equal(vfx.speedStreaksMesh.visible, true, 'Speed streaks must become visible at high speed');
    assert.ok(vfx.speedStreaksMesh.material.opacity > 0.3, 'Speed streaks opacity must scale up at high speeds');
});

test('5. Headlight & Taillight Beams: projected cones onto asphalt and optical brake light flares', () => {
    const { THREE, RaceEffectsManager } = setupTestContext();
    const engine = createMockEngine(THREE);
    const vfx = new RaceEffectsManager(engine);

    // Verify projected headlight flares, ground patches, and subtle SpotLights
    assert.equal(vfx.headlightCones.length, 2, 'Must maintain backward compatibility alias for headlightCones');
    assert.equal(vfx.headlightFlares.length, 2, 'Must create 2 clean bright lens flare points on headlight glass');
    assert.ok(!vfx.headlightFlares.some(f => f.geometry && (f.geometry.type === 'CylinderGeometry' || f.geometry.type === 'ConeGeometry')), 'Must not use polygonal 3D wedge or umbrella meshes');
    assert.equal(vfx.headlightGroundPatches.length, 2, 'Must create 2 ground projected light patches on asphalt');
    assert.equal(vfx.headlightSpots.length, 2, 'Must configure 2 subtle Three.js SpotLights angled forward down the road');
    assert.ok(vfx.headlightSpots[0].isSpotLight, 'Headlight spots must be Three.js SpotLight instances');
    assert.equal(vfx.taillightFlares.length, 2, 'Must create 2 optical brake flares at taillights');
    assert.ok(vfx.brakeGroundDecal, 'Must create rear red brake ground illumination wash decal');

    // Weather sensitivity test
    vfx.setWeather('night');
    const nightPatchOp = vfx.headlightGroundPatches[0].material.opacity;
    assert.ok(nightPatchOp >= 0.30, 'Night weather must produce vivid headlight illumination on asphalt');

    vfx.setWeather('rain');
    const rainPatchOp = vfx.headlightGroundPatches[0].material.opacity;
    assert.ok(rainPatchOp >= nightPatchOp, 'Rain weather must intensify light reflection on wet mirror asphalt');

    vfx.setWeather('day');
    const dayPatchOp = vfx.headlightGroundPatches[0].material.opacity;
    assert.ok(dayPatchOp < nightPatchOp, 'Daylight must dim ground light projection');

    // Brake light flares bloom on braking
    vfx.updateLightsVFX(0.05, false); // cruising
    const cruiseFlareScale = vfx.taillightFlares[0].scale.x;
    const cruiseRedGroundOp = vfx.brakeGroundDecal.material.opacity;

    vfx.updateLightsVFX(0.05, true); // hard braking
    const brakingFlareScale = vfx.taillightFlares[0].scale.x;
    const brakingRedGroundOp = vfx.brakeGroundDecal.material.opacity;

    assert.ok(brakingFlareScale > cruiseFlareScale * 2.0, 'Brake flares must bloom substantially when braking');
    assert.ok(brakingRedGroundOp > cruiseRedGroundOp * 3.0, 'Rear red ground wash must brighten significantly during braking');
});

test('6. Clean separation and Car3DManager integration: export, hook into loop, and memory disposal', () => {
    const { THREE, RaceEffectsManager, Car3DManager } = setupTestContext();
    assert.equal(Car3DManager.RaceEffectsManager, RaceEffectsManager, 'Car3DManager must export RaceEffectsManager');

    const container = global.document.createElement('div');
    const raceEngine = new Car3DManager.Car3DRacingEngine(container);
    assert.ok(raceEngine.vfx, 'Car3DRacingEngine must automatically instantiate vfx');

    // Test delegation of spark and smoke methods
    let sparksCalled = false;
    raceEngine.vfx.spawnSparks = (x, y, z, count) => { sparksCalled = true; };
    raceEngine.spawnSparks(0, 0.5, 0, 10);
    assert.ok(sparksCalled, 'spawnSparks must delegate to vfx');

    let smokeCalled = false;
    raceEngine.vfx.spawnDriftSmoke = () => { smokeCalled = true; };
    raceEngine.spawnDriftSmoke(0.05);
    assert.ok(smokeCalled, 'spawnDriftSmoke must delegate to vfx');

    // Test destruction cleanup without memory leak
    assert.doesNotThrow(() => {
        raceEngine.destroy();
    }, 'Engine and VFX destruction must complete without errors');
    assert.equal(raceEngine.vfx, null, 'VFX instance reference must be nullified upon destroy');
});
