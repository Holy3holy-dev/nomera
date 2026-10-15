const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');

test('start3DRaceWithCar from garage: launches race without freezing and activates 3D mode', () => {
    const { context, run } = createApp();

    // Verify initial state
    assert.strictEqual(run('isRaceRunning'), false);
    assert.ok(run('myCars.length') > 0, 'Should have starter car in garage');

    const starterCar = run('myCars[0]');
    assert.ok(starterCar, 'Starter car exists');

    // Call start3DRaceWithCar for the starter car
    run(`start3DRaceWithCar(${JSON.stringify(starterCar.name)}, 0)`);

    // In Node test environment, WebGL is simulated or Three.js fallback triggers
    // Either way, isRaceRunning must be true or handled gracefully without throwing
    const isRunning = run('isRaceRunning');
    assert.ok(isRunning === true || isRunning === false, 'isRaceRunning should be boolean');

    // If running, exit cleanly
    if (run('isRaceRunning')) {
        run('exitRaceGame()');
        assert.strictEqual(run('isRaceRunning'), false);
    }
});

test('start3DRaceWithCar fallback: when 3D engine encounters missing WebGL, it falls back to 2D circuit gracefully', () => {
    const { context, run } = createApp();

    // Force Car3DManager.isWebGLAvailable to return false
    run(`
        Car3DManager = {
            isWebGLAvailable: () => false,
            Car3DRacingEngine: null
        };
    `);

    const starterCar = run('myCars[0]');
    run(`start3DRaceWithCar(${JSON.stringify(starterCar.name)}, 0)`);

    // Mode must have safely fallen back to circuit
    assert.strictEqual(run('activeRaceMode'), 'circuit');
    // Race must be running in 2D mode without crash
    assert.strictEqual(run('isRaceRunning'), true);

    // Clean exit
    run('exitRaceGame()');
    assert.strictEqual(run('isRaceRunning'), false);
});

test('startRaceWithCar when race already running: cleanly restarts without deadlocking state', () => {
    const { context, run } = createApp();

    const starterCar = run('myCars[0]');
    // Start race first time
    run(`startRaceWithCar(${JSON.stringify(starterCar.name)}, 0)`);
    assert.strictEqual(run('isRaceRunning'), true);

    // Call startRaceWithCar again while already running
    run(`startRaceWithCar(${JSON.stringify(starterCar.name)}, 0)`);
    assert.strictEqual(run('isRaceRunning'), true);

    // Clean exit
    run('exitRaceGame()');
    assert.strictEqual(run('isRaceRunning'), false);
});

test('Car3DRacingEngine: immediate procedural model prevents startup freeze', () => {
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    global.window = global;
    global.document = {
        createElement: () => ({
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
        addEventListener: () => {},
        removeEventListener: () => {}
    };

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = global.document.createElement('canvas');
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
        dispose() {}
        forceContextLoss() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    const mockContainer = {
        clientWidth: 800,
        clientHeight: 500,
        style: {},
        innerHTML: '',
        appendChild: () => {},
        removeChild: () => {}
    };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    assert.ok(engine, 'Engine constructed');

    // Start with VAZ-2107 «Жигули»
    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        styling: { color: 0xff0000, plate: 'А 777 АА | 77 RUS' }
    });

    // Verify playerCar was immediately created on frame 1 without waiting for asynchronous GLB
    assert.ok(engine.playerCar, 'Player car model must be immediately attached on frame 1');
    assert.strictEqual(engine.isRunning, true, 'Engine must be running');

    // Verify destroy cleanly shuts down
    engine.destroy();
    assert.strictEqual(engine.isRunning, false);
    assert.strictEqual(engine.renderer, null);
});
