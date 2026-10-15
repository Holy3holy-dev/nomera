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

test('3D camera turn dynamics: banking roll is smoothly clamped under 0.06 rad and body roll is damped', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        performance: { speed: 180, handling: 6.0 }
    });
    engine.state.speed = 120;

    // Steer right for 10 frames to build up max lateral velocity
    engine.keys.right = true;
    for (let i = 0; i < 10; i++) {
        engine.update(0.05);
    }

    assert.ok(Math.abs(engine.state.vx) > 5.0, 'Lateral velocity should be active during sharp turn');
    // Camera roll must be subtle and clamped under 0.06 rad (~3.4 deg), NOT 0.40 rad (23 deg)
    assert.ok(Math.abs(engine.camRoll) <= 0.055, `Camera roll (${engine.camRoll}) must be clamped under 0.055 rad`);
    assert.ok(Math.abs(engine.camRoll) > 0.005, 'Camera roll should have subtle non-zero banking');
    // Car body roll must be subtle and damped
    assert.ok(Math.abs(engine.state.bodyRoll) <= 0.065, `Body roll (${engine.state.bodyRoll}) must be damped under 0.065 rad`);

    // Release steering: camRoll must smoothly decay towards 0
    engine.keys.right = false;
    for (let i = 0; i < 15; i++) {
        engine.update(0.05);
    }
    assert.ok(Math.abs(engine.camRoll) < 0.02, `Camera roll should smoothly return near level: ${engine.camRoll}`);

    engine.destroy();
});

test('3D car visual fixes: Ferrari faces forward down the road, no floating red box taillights, and nitro button is compact', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const fs = require('fs');
    const path = require('path');
    const car3dCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'car-3d.js'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

    // 1. Ferrari sf90 model orientation: rotated Math.PI so headlights face forward (+Z) instead of backwards
    assert.ok(car3dCode.includes("carId === 'sf90'"), 'Ferrari sf90 must have rotation alignment');
    assert.ok(car3dCode.includes("clonedScene.rotation.y += Math.PI"), 'Orientation must rotate by Math.PI to face forward');

    // 2. Floating red boxes (BoxGeometry taillights) eliminated in favor of real mesh traversal & dynamic PointLight
    assert.ok(!car3dCode.includes('tlMesh.position.set'), 'Artificial floating tlMesh BoxGeometry must be eliminated');
    assert.ok(car3dCode.includes('this.playerBrakeLight = new THREE.PointLight'), 'Authentic dynamic brake point light must be added');

    // 3. Engine setupCarLightingAndFX initializes playerBrakeLight on start
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    engine.start({ carName: 'ВАЗ-2107 «Жигули»', performance: { speed: 180 } });
    assert.ok(engine.playerBrakeLight, 'Engine must create playerBrakeLight');
    assert.equal(engine.playerBrakeLight.isPointLight, true, 'playerBrakeLight must be a THREE.PointLight');

    // On braking, brake light intensity increases
    engine.keys.brake = true;
    engine.update(0.05);
    assert.ok(engine.playerBrakeLight.intensity > 1.0, 'Brake light must intensify on braking');
    engine.keys.brake = false;
    engine.update(0.05);
    assert.ok(engine.playerBrakeLight.intensity < 1.0, 'Brake light must return to idle glow');
    engine.destroy();

    // 4. Styles: touch-nitro in styles.css must NOT truncate НИТРО into Н
    assert.ok(css.includes('.touch-actions-bar .touch-nitro .touch-action-label'), 'Must have specific unclipped label rule for touch-actions-bar nitro');
    assert.ok(css.includes('margin-left: 3px') || css.includes('margin-left: 2px'), 'Must not push nitro badge off with excessive margin-left');
});

test('Ferrari bottom fix and physics rework: undertray, gearbox, suspension squat, HUD rpm, and audio', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const fs = require('fs');
    const car3dCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'car-3d.js'), 'utf8');

    // 1. Ferrari bottom floor & undertray verification
    assert.ok(car3dCode.includes('DarkCarpet'), 'car-3d.js must replace white carpet/floor with DarkCarpet material');
    assert.ok(car3dCode.includes('ChassisUndertray'), 'car-3d.js must create aerodynamic ChassisUndertray to seal underside');
    assert.ok(car3dCode.includes('createRadialGradient') && car3dCode.includes('CanvasTexture'), 'car-3d.js must create soft radial gradient texture for underglow');

    // 2. Physics & Gearbox simulation
    let hudReceived = null;
    let soundsTriggered = [];
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onUpdateHUD: (hud) => { hudReceived = hud; },
        onSound: (sound) => { soundsTriggered.push(sound); }
    });
    engine.start({ carName: 'Ferrari SF90 Stradale', performance: { speed: 380, accel: 85 } });

    // Initial state: D1, idle RPM
    assert.equal(engine.state.gear, 1, 'Initial gear should be 1');
    assert.ok(engine.state.rpm >= 1000, 'Initial RPM should be at or above idle');

    // Simulate acceleration
    engine.keys.gas = true;
    for (let i = 0; i < 60; i++) {
        engine.update(0.05); // 3 seconds of acceleration
    }

    // Verify gear shifted up, suspension squatted backwards (negative pitchSquat), and HUD received gear & rpm
    assert.ok(engine.state.speed > 50, 'Car should accelerate to speed');
    assert.ok(engine.state.gear >= 2, `Car should have upshifted at speed, current gear: ${engine.state.gear}`);
    assert.ok(engine.state.pitchSquat < 0, `Suspension should squat on acceleration (pitchSquat < 0), got ${engine.state.pitchSquat}`);
    assert.ok(engine.state.downforceY < 0, `Downforce should pull chassis downwards at speed (downforceY < 0), got ${engine.state.downforceY}`);
    assert.ok(hudReceived, 'HUD should receive telemetry updates');
    assert.ok(hudReceived.gear.startsWith('D'), 'HUD gear should be formatted D1-D7');
    assert.ok(hudReceived.rpm > 1000, 'HUD RPM should be above idle during acceleration');
    assert.ok(hudReceived.rpmPercent > 0, 'HUD rpmPercent should be positive');

    // Simulate braking
    engine.keys.gas = false;
    engine.keys.brake = true;
    for (let i = 0; i < 30; i++) {
        engine.update(0.05);
    }
    assert.ok(engine.state.pitchSquat > 0, `Suspension should dive forward on braking (pitchSquat > 0), got ${engine.state.pitchSquat}`);

    engine.destroy();

    // 3. Audio synthesis verification
    const { createAudio } = require('../js/audio.js');
    function fakeCtx() {
        const ctx = { currentTime: 1, state: 'running', destination: {}, created: [] };
        const p = () => ({ values: [], setValueAtTime(v) { this.values.push(v); }, setTargetAtTime(v) { this.values.push(v); }, exponentialRampToValueAtTime(v) { this.values.push(v); } });
        const n = () => ({ gain: p(), frequency: p(), Q: p(), connect() {}, disconnect() {}, start() {}, stop() {} });
        ctx.createGain = n; ctx.createBiquadFilter = n;
        ctx.createOscillator = () => { const res = n(); ctx.created.push(res); return res; };
        return ctx;
    }
    const audioCtx = fakeCtx();
    const audio = createAudio({ contextFactory: () => audioCtx });
    audio.unlock();
    assert.equal(typeof audio.scrape, 'function', 'audio should have scrape() method');
    audio.scrape();
    assert.ok(audioCtx.created.length >= 2, 'scrape should create audio nodes');

    // Engine sport revs test with physical RPM parameter
    const sportCtx = fakeCtx();
    const sportAudio = createAudio({ contextFactory: () => sportCtx });
    sportAudio.unlock();
    sportAudio.updateEngine({ running: true, speed: 200, gas: true, carClass: 'sport', rpm: 8000 });
    const highRpmPitch = sportCtx.created[0].frequency.values.at(-1);
    assert.ok(highRpmPitch > 200, `Sport engine at 8000 RPM should produce high-frequency revs (> 200 Hz), got ${highRpmPitch}`);
    sportAudio.stopEngine();
});

test('Car animations: backfire flame pops, nitro road light, brake disc glow, engine tremor, and traffic wheel spinning', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        performance: { speed: 220, accel: 3.5 }
    });

    // 1. Verify animation objects created
    assert.ok(engine.playerBackfireFlames.length > 0, 'Backfire flame meshes must be created');
    assert.ok(engine.playerBackfireLight, 'Backfire point light must be created');
    assert.ok(engine.playerNitroLight, 'Nitro point light must be created');

    // 2. Nitro afterburner light activation
    engine.keys.nitro = true;
    engine.update(0.05);
    assert.ok(engine.state.isNitroActive, 'Nitro must be active');
    assert.ok(engine.playerNitroLight.intensity > 0, 'Nitro road light must illuminate on nitro');
    assert.ok(engine.playerNitroFlames.every(f => f.visible), 'Nitro flame meshes must be visible');
    engine.keys.nitro = false;
    engine.update(0.05);
    assert.equal(engine.playerNitroLight.intensity, 0, 'Nitro road light must turn off when nitro is released');

    // 3. Backfire flame pops on gear shift or lift-off
    engine.state.speed = 65; // Trigger up-shift threshold (gear 1 -> 2)
    engine.update(0.05);
    assert.ok(engine.state.backfireTimer > 0, 'Backfire timer should be active on gear up-shift');
    assert.ok(engine.playerBackfireLight.intensity > 0, 'Backfire point light must flash on upshift');
    assert.ok(engine.playerBackfireFlames.some(f => f.visible), 'Backfire flame meshes must be visible during pop');

    // 4. Glowing brake discs under heavy deceleration
    engine.state.speed = 150;
    engine.keys.brake = true;
    for (let i = 0; i < 20; i++) engine.update(0.05);
    assert.ok(engine.state.brakeHeat > 0.1, 'Brake heat should accumulate on heavy braking');

    // 5. Traffic vehicle animations: spinning wheels, suspension bounce, and police strobes
    const trafficCar = engine.trafficCars[0];
    assert.ok(trafficCar.userData.wheels && trafficCar.userData.wheels.length > 0, 'Traffic vehicles must track their wheel meshes');
    const initialRot = trafficCar.userData.wheels[0].rotation.x;
    for (let i = 0; i < 10; i++) engine.update(0.05);
    assert.ok(trafficCar.userData.wheels[0].rotation.x > initialRot, 'Traffic vehicle wheels must spin matching forward speed');

    // Check police car strobe alternation
    const policeCar = engine.trafficCars.find(c => c.userData.type === 'police');
    if (policeCar && policeCar.userData.policeRed) {
        assert.ok(policeCar.userData.policeRed.material, 'Police car must have strobe light materials');
    }

    engine.destroy();
});





