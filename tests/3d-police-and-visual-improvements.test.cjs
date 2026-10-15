const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
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
            this.lastSetSize = null;
        }
        setPixelRatio() {}
        setSize(w, h, updateStyle) {
            this.lastSetSize = { w, h, updateStyle };
        }
        render() {}
        dispose() {}
    };
    global.THREE = THREE;

    // Load Car3DManager
    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

test('Visual & Physics improvements: Siren volume is significantly reduced and softened in audio.js', () => {
    const audioCode = fs.readFileSync(path.join(__dirname, '../js/audio.js'), 'utf8');
    assert.ok(audioCode.includes('gain.gain.setValueAtTime(0.011'), 'Siren volume gain must be set to 0.011 (reduced by >70%)');
    assert.ok(audioCode.includes("osc.type = 'triangle'"), 'Siren oscillator should use smooth triangle waveform instead of screeching sawtooth');
});

test('Visual & Physics improvements: Wanted stars pursuit box is absolutely placed at top and does not push stats down', () => {
    const cssCode = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
    assert.ok(cssCode.includes('.race-3d-pursuit-box {'), 'CSS must define .race-3d-pursuit-box');
    assert.ok(cssCode.includes('position: absolute;'), 'Pursuit box must be position: absolute so it never shifts HUD flow');
    assert.ok(cssCode.includes('font-size: 13px;'), 'Wanted stars must be scaled down to compact size');
});

test('Visual & Physics improvements: Canvas aspect ratio and container resize synchronize without distortion', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = {
        clientWidth: 1200,
        clientHeight: 600,
        getBoundingClientRect: () => ({ width: 1200, height: 600 }),
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        innerHTML: ''
    };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    try {
        engine.start({
            carName: 'BMW M5 F90',
            performance: { speed: 250, accel: 20 }
        });

        // Aspect ratio must match width / height (1200 / 600 = 2.0)
        assert.strictEqual(engine.camera.aspect, 2.0, 'Camera aspect ratio must exactly match container aspect ratio');

        // Simulate resize to portrait container (400x800 = 0.5)
        mockContainer.clientWidth = 400;
        mockContainer.clientHeight = 800;
        mockContainer.getBoundingClientRect = () => ({ width: 400, height: 800 });
        engine.onResize();

        assert.strictEqual(engine.camera.aspect, 0.5, 'Camera aspect ratio must update on resize');
        assert.strictEqual(engine.width, 400);
        assert.strictEqual(engine.height, 800);
    } finally {
        engine.destroy();
    }
});

test('Visual & Physics improvements: Police car collides with and avoids civilian traffic cars instead of ghosting through', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    try {
        engine.start({
            carName: 'Lada Vesta Sport',
            performance: { speed: 200, accel: 15 }
        });

        const policeCar = engine.trafficCars.find(c => c.userData.type === 'police');
        const civilianCar = engine.trafficCars.find(c => c.userData.type !== 'police' && c.userData.type !== 'truck');
        assert.ok(policeCar, 'Police car should exist');
        assert.ok(civilianCar, 'Civilian car should exist');

        engine.addWantedStars(2, 'Погоня');

        // Position police car directly behind civilian car on the same lane
        policeCar.position.set(0, 0, 100);
        civilianCar.position.set(0, 0, 108); // 8m ahead of police on lane 0
        civilianCar.userData.speed = 90;
        policeCar.userData.speed = 170;

        // Step engine forward
        engine.update(0.1);

        // Police should steer away / change targetX to overtake rather than ghosting through lane 0
        assert.notStrictEqual(policeCar.userData.targetX, 0, 'Police should steer to an alternate lane to overtake civilian car');
    } finally {
        engine.destroy();
    }
});

test('Visual & Physics improvements: High-speed collision provides damage buffer rather than instant game over', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    let gameOverCalled = false;
    let popups = [];

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onGameOver: () => { gameOverCalled = true; },
        onPopup: (p) => { popups.push(p); }
    });

    try {
        engine.start({
            carName: 'Lada Vesta Sport',
            performance: { speed: 220, accel: 15 }
        });

        const civilianCar = engine.trafficCars.find(c => c.userData.type !== 'police');
        assert.ok(civilianCar);

        // Position player with high speed directly colliding with rear of civilian car
        engine.state.speed = 180;
        civilianCar.userData.speed = 80;
        engine.state.x = civilianCar.position.x;
        engine.state.z = civilianCar.position.z - 0.6;

        // Step physics frame
        engine.update(0.02);

        // Player must NOT immediately get Game Over! Damage buffer absorbs the impact
        assert.strictEqual(gameOverCalled, false, 'First high-speed collision should not cause instant Game Over');
        assert.strictEqual(engine.isRunning, true, 'Car should continue racing');
        assert.ok(engine.state.damageTaken >= 20, 'Damage buffer must record impact damage');
        assert.ok(engine.state.speed < 180, 'Speed must be significantly reduced');
        assert.ok(popups.some(p => p.includes('ПРОЧНОСТЬ') || p.includes('УДАР')), 'HUD should show crash durability warning');
    } finally {
        engine.destroy();
    }
});

test('Visual & Physics improvements: Showroom and race engine provide instant procedural 3D model fallback with zero lag', () => {
    const { THREE, Car3DManager } = setupTestContext();
    assert.strictEqual(typeof Car3DManager.buildDetailedCarModel, 'function');
    assert.strictEqual(typeof Car3DManager.preloadCarModel, 'function');

    const instantModel = Car3DManager.buildDetailedCarModel(THREE, 'Lada Vesta Sport', { color: '#ff0000', spoiler: 'high' });
    assert.ok(instantModel, 'Immediate procedural model should construct synchronously');
    assert.ok(instantModel.name.includes('Lada') || instantModel.name.includes('Vesta'), 'Procedural car root should be identified');
});
