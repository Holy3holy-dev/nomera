const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

function setupTestContext() {
    global.window = global;
    global.self = global;
    global.document = {
        createElement: (tag) => ({
            getContext: () => ({
                fillRect: () => {},
                clearRect: () => {},
                fillText: () => {},
                drawImage: () => {},
                measureText: () => ({ width: 100 })
            }),
            width: 512,
            height: 512,
            style: {}
        }),
        createElementNS: () => ({ style: {} }),
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    global.navigator = { userAgent: 'NodeTest' };
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
    };
    global.THREE = THREE;

    // Load Car3DManager
    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

test('3D procedural wheels: WheelSpinner is tagged with isWheelSpinner, and caliper remains stationary', () => {
    const { THREE, Car3DManager } = setupTestContext();
    assert.ok(Car3DManager, 'Car3DManager must be exported');

    const carModel = Car3DManager.buildDetailedCarModel(THREE, 'ВАЗ-2107 «Жигули»', { wheels: 'stamps' });
    assert.ok(carModel, 'Model should build successfully');

    // Check WheelsRig name
    let foundRig = false;
    let foundOldWheelsGroup = false;
    const spinners = [];
    const steerables = [];

    carModel.traverse(c => {
        if (c.name === 'WheelsRig') foundRig = true;
        if (c.name === 'WheelsGroup') foundOldWheelsGroup = true;
        if (c.userData && c.userData.isWheelSpinner) spinners.push(c);
        if (c.userData && c.userData.isSteerable) steerables.push(c);
    });

    assert.equal(foundRig, true, 'Wheels rig must be named WheelsRig (not WheelsGroup)');
    assert.equal(foundOldWheelsGroup, false, 'WheelsGroup must not exist to prevent substring collision');
    assert.equal(spinners.length, 4, 'There must be exactly 4 dedicated wheel spinners for 4 wheels');
    assert.equal(steerables.length, 2, 'Front 2 wheels must be tagged as steerable');

    // Check local position of spinners: should be centered at (0,0,0) of the wheel hub
    spinners.forEach(s => {
        assert.equal(s.position.x, 0, 'Spinner local X position must be 0');
        assert.equal(s.position.y, 0, 'Spinner local Y position must be 0');
        assert.equal(s.position.z, 0, 'Spinner local Z position must be 0');
    });
});

test('3D race engine: only dedicated wheel spinners are rotated, never car body, fenders, or GLB nodes', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const mockContainer = {
        clientWidth: 800,
        clientHeight: 500,
        style: {},
        appendChild: () => {},
        removeChild: () => {}
    };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    assert.ok(engine, 'Car3DRacingEngine instance should be created');

    // Start with procedural car
    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        styling: { wheels: 'stamps' },
        performance: { speed: 180, accel: 3.0 }
    });

    // Check playerWheels collection
    assert.equal(engine.playerWheels.length, 4, 'playerWheels must only contain 4 dedicated spinners');
    assert.equal(engine.playerSteerWheels.length, 2, 'playerSteerWheels must only contain 2 steerable assemblies');

    // Run physics update for 1 second forward at 90 km/h
    engine.state.speed = 90;
    engine.keys.gas = true;
    engine.update(0.1);

    // Spinners should have rotated
    const rotValues = engine.playerWheels.map(w => w.rotation.x);
    assert.ok(rotValues.some(r => Math.abs(r) > 0), 'Wheel spinners must rotate with vehicle motion');

    // Spinners must NOT translate vertically or orbit over the car
    engine.playerWheels.forEach(w => {
        assert.equal(w.position.y, 0, 'Wheel spinner must rotate in place around hub (local Y=0)');
        assert.equal(w.position.z, 0, 'Wheel spinner must rotate in place around hub (local Z=0)');
    });

    engine.destroy();
});

test('3D drift physics: counter-steering gives score bonus without snapping yaw angle backwards', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    engine.start({
        carName: 'Toyota Mark II',
        styling: {},
        performance: { speed: 220, handling: 6.0, driftFactor: 1.5 }
    });

    engine.state.speed = 100;
    engine.keys.drift = true;
    engine.keys.right = true; // Initiate drift to the right

    // Simulate 5 frames of entering slide
    for (let i = 0; i < 5; i++) engine.update(0.05);

    assert.ok(engine.state.vx < 0, 'Car should have negative lateral velocity in world coords when steering right (sliding right on screen)');
    assert.ok(engine.state.isDrifting, 'Car should be in drift state');
    const yawInSlide = engine.state.yawAngle;

    // Now counter-steer: press Left while car is sliding Right
    engine.keys.right = false;
    engine.keys.left = true;
    engine.update(0.05);

    // Yaw should maintain direction without violently snapping
    assert.ok(Math.sign(engine.state.yawAngle) === Math.sign(yawInSlide), 'Yaw angle must not violently snap 180 deg when counter-steering');
    assert.ok(engine.state.isDrifting, 'Drift state should be maintained during counter-steering slide');

    engine.destroy();
});

test('3D traffic collision: overtaking traffic does not cause false rear-end crash from behind', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    let gameOverTriggered = false;
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onGameOver: () => { gameOverTriggered = true; }
    });

    engine.start({
        carName: 'Lada Vesta Sport',
        styling: {},
        performance: { speed: 200 }
    });

    engine.state.speed = 160;
    engine.state.x = 2.125;
    engine.state.z = 100;

    // Place a traffic car right next to player in adjacent lane that has just been passed (dz = -1.5m, dx = 1.6m)
    const trafficCar = engine.trafficCars[0];
    trafficCar.position.set(2.125 + 1.6, 0, 100 - 1.5);
    trafficCar.userData.speed = 90;
    trafficCar.userData.overtaken = false;

    // Run frame update
    engine.update(0.02);

    // Should NOT trigger crash or game over
    assert.equal(gameOverTriggered, false, 'Passing a car in adjacent lane must not trigger false crash game over');

    engine.destroy();
});

test('3D steering direction: right key turns car and wheels to screen right, left key turns to screen left', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        styling: {},
        performance: { speed: 180, handling: 5.0 }
    });
    engine.state.speed = 80;

    // 1. Steering RIGHT:
    // In Three.js with camera behind car facing +Z, world -X is screen RIGHT.
    // Pressing right must produce negative vx, negative wheel steer angle, and negative yaw angle.
    engine.keys.right = true;
    engine.keys.left = false;
    engine.update(0.1);

    assert.ok(engine.state.vx < 0, 'Steering right must produce negative vx (towards screen right / world -X)');
    assert.ok(engine.state.yawAngle < 0, 'Steering right must yaw vehicle nose towards screen right');
    const rightSteerDelta = engine.playerSteerWheels[0].rotation.y - (engine.playerSteerWheels[0].userData.baseRotY || 0);
    assert.ok(rightSteerDelta < 0, 'Front steer wheels must turn towards screen right (delta < 0)');

    // 2. Steering LEFT:
    // In Three.js with camera behind car facing +Z, world +X is screen LEFT.
    // Pressing left must produce positive vx, positive wheel steer angle, and positive yaw angle.
    engine.keys.right = false;
    engine.keys.left = true;
    for (let i = 0; i < 4; i++) engine.update(0.1);

    assert.ok(engine.state.vx > 0, 'Steering left must produce positive vx (towards screen left / world +X)');
    assert.ok(engine.state.yawAngle > 0, 'Steering left must yaw vehicle nose towards screen left');
    const leftSteerDelta = engine.playerSteerWheels[0].rotation.y - (engine.playerSteerWheels[0].userData.baseRotY || 0);
    assert.ok(leftSteerDelta > 0, 'Front steer wheels must turn towards screen left (delta > 0)');

    engine.destroy();
});

test('3D mobile controls: resetKeys clears all keys, cycleCamera cycles modes, and setKey updates input state', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        styling: {},
        performance: { speed: 180 }
    });

    engine.setKey('gas', true);
    engine.setKey('left', true);
    engine.setKey('drift', true);
    engine.setKey('nitro', true);

    assert.equal(engine.keys.gas, true);
    assert.equal(engine.keys.left, true);
    assert.equal(engine.keys.drift, true);
    assert.equal(engine.keys.nitro, true);

    // Call resetKeys (triggered on blur or mobile sleep)
    engine.resetKeys();

    assert.equal(engine.keys.gas, false);
    assert.equal(engine.keys.left, false);
    assert.equal(engine.keys.drift, false);
    assert.equal(engine.keys.nitro, false);

    // Camera cycling
    const initialCam = engine.cameraMode;
    engine.cycleCamera();
    assert.equal(engine.cameraMode, (initialCam + 1) % engine.cameraModes.length);

    engine.destroy();
});

test('3D portrait camera framing elevates chase camera to prevent bottom HUD overlap on car bumper', () => {
    const { THREE, Car3DManager } = setupTestContext();
    
    // 1. Landscape container (aspect > 1.0)
    const landscapeContainer = { clientWidth: 800, clientHeight: 450, style: {}, appendChild: () => {}, removeChild: () => {} };
    const landEngine = new Car3DManager.Car3DRacingEngine(landscapeContainer, {});
    landEngine.start({ carName: 'ВАЗ-2107 «Жигули»', performance: { speed: 100 } });
    landEngine.update(0.1);
    const landCamY = landEngine.camera.position.y;
    landEngine.destroy();

    // 2. Portrait container (aspect < 1.0)
    const portraitContainer = { clientWidth: 380, clientHeight: 700, style: {}, appendChild: () => {}, removeChild: () => {} };
    const portEngine = new Car3DManager.Car3DRacingEngine(portraitContainer, {});
    portEngine.start({ carName: 'ВАЗ-2107 «Жигули»', performance: { speed: 100 } });
    portEngine.update(0.1);
    const portCamY = portEngine.camera.position.y;
    portEngine.destroy();

    assert.ok(portCamY > landCamY, `Portrait camera Y (${portCamY}) should be elevated higher than landscape camera Y (${landCamY})`);
});

test('3D mobile controls HTML and CSS enforce non-overlapping layout and unclipped 3-button actions bar', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

    // 1. In index.html, #race-3d-touch-controls must have 3 action buttons and NOT duplicate camera in the bottom bar
    assert.ok(html.includes('id="btn-3d-touch-drift"'), 'Must have 3D drift button');
    assert.ok(html.includes('id="btn-3d-touch-nitro"'), 'Must have 3D nitro button');
    assert.ok(html.includes('id="btn-3d-touch-horn"'), 'Must have 3D horn button');
    assert.ok(!html.includes('id="btn-3d-touch-cam"'), 'Must NOT have duplicate camera button in 3D touch actions bar');
    assert.ok(html.includes('id="btn-camera-view-3d"'), 'Must have top header camera toggle button');

    // 2. In styles.css, 3D touch actions bar has 3 columns to avoid mobile edge clipping
    assert.ok(css.includes('#race-3d-touch-controls .touch-actions-bar'), 'Must define specific 3D touch actions bar style');
    assert.ok(css.includes('grid-template-columns: repeat(3, 1fr)'), 'Must configure 3 equal columns for 3D action bar');

    // 3. In landscape media query, actions bar width is constrained and bottom HUD is elevated above pedals/steer
    assert.ok(css.includes('width: 210px'), 'Landscape action bar must be constrained to 210px to guarantee zero brake pedal collision');
    assert.ok(css.includes('bottom: max(64px'), 'Landscape HUD bottom must be elevated above 48px steer/pedal buttons');
});



