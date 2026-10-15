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
        dispose() {}
    };
    global.THREE = THREE;

    // Load Car3DManager
    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

test('3D Police Pursuit: Speeding past DPS vehicle (>140 km/h) triggers wanted stars & pursuit', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    let lastHud = null;
    let popups = [];
    let sounds = [];

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onUpdateHUD: (hud) => { lastHud = hud; },
        onPopup: (text) => { popups.push(text); },
        onSound: (snd) => { sounds.push(snd); }
    });

    try {
        engine.start({
            carName: 'Lada Vesta Sport',
            performance: { speed: 220, accel: 15 }
        });

        // Find a police car in traffic
        const policeCar = engine.trafficCars.find(c => c.userData.type === 'police');
        assert.ok(policeCar, 'Traffic pool should include at least one police vehicle');

        // Position player next to police car while driving at 160 km/h (>140 km/h threshold)
        engine.state.speed = 160;
        engine.state.x = policeCar.position.x + 2.0; // adjacent lane
        engine.state.z = policeCar.position.z - 2.0; // alongside police car

        // Step engine forward
        engine.update(0.1);

        assert.ok(engine.state.wantedStars >= 1, 'Speeding past police at 160 km/h must trigger at least 1 wanted star');
        assert.strictEqual(engine.state.isPursuitActive, true, 'Pursuit must be active');
        assert.ok(sounds.includes('siren_start'), 'Siren start sound must be triggered');
        assert.ok(lastHud && lastHud.wantedStars >= 1, 'HUD should receive wantedStars update');
    } finally {
        engine.destroy();
    }
});

test('3D Police Pursuit: AI speeds up and chases player during hot pursuit', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    try {
        engine.start({
            carName: 'BMW M5 F90',
            performance: { speed: 260, accel: 25 }
        });

        const policeCar = engine.trafficCars.find(c => c.userData.type === 'police');
        assert.ok(policeCar, 'Police car exists');

        // Trigger wanted stars
        engine.addWantedStars(2, 'Тестовый розыск');
        assert.strictEqual(engine.state.wantedStars, 2);

        // Position police car behind moving player
        engine.state.x = 2.5;
        engine.state.z = 100;
        engine.state.speed = 180;
        policeCar.position.set(0, 0, 70); // 30m behind player

        // Run updates
        for (let i = 0; i < 10; i++) {
            engine.state.speed = 180;
            engine.state.x = 2.5;
            engine.state.z += (180 / 3.6) * 0.1;
            engine.updateTraffic(0.1);
        }

        // Police AI should aim for player's X coordinate (2.5) and accelerate
        assert.ok(policeCar.userData.targetX === 2.5, 'Police targetX must track player position');
        assert.ok(policeCar.userData.speed > policeCar.userData.baseSpeed, 'Police car must accelerate during pursuit');
    } finally {
        engine.destroy();
    }
});

test('3D Police Pursuit: Escape mechanics awards bounty after player breaks visual distance (>48m) for 8 seconds', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    let sounds = [];
    let popups = [];

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onSound: (s) => { sounds.push(s); },
        onPopup: (p) => { popups.push(p); }
    });

    try {
        engine.start({
            carName: 'Porsche 911 GT3 RS',
            performance: { speed: 300, accel: 30 }
        });

        // Give 2 wanted stars
        engine.addWantedStars(2, 'Превышение скорости');
        assert.strictEqual(engine.state.wantedStars, 2);
        assert.strictEqual(engine.state.escapeTimer, 8.0);

        const initialCash = engine.state.earnedCash;

        // Move all police cars far behind player (>48m)
        engine.state.z = 1000;
        engine.trafficCars.forEach(c => {
            if (c.userData.type === 'police') {
                c.position.z = 900; // 100m away (> 48m)
            }
        });

        // Step simulation for 8.5 seconds (in dt chunks)
        for (let t = 0; t < 85; t++) {
            // Keep police distant
            engine.trafficCars.forEach(c => {
                if (c.userData.type === 'police') {
                    c.position.z = 900;
                }
            });
            engine.update(0.1);
        }

        // Escape should have succeeded!
        assert.strictEqual(engine.state.wantedStars, 0, 'Wanted stars must reset to 0 upon escape');
        assert.strictEqual(engine.state.isPursuitActive, false, 'Pursuit must be inactive');
        assert.ok(engine.state.earnedCash > initialCash, 'Cash bounty must be awarded for successful escape');
        assert.ok(sounds.includes('escape'), 'Escape sound effect must be played');
    } finally {
        engine.destroy();
    }
});

test('3D Police Pursuit: Busted arrest triggers when player stops (<25 km/h) cornered by police (<12m) for 2.8s', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    let gameOverReason = null;
    let sounds = [];

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onGameOver: (reason) => { gameOverReason = reason; },
        onSound: (s) => { sounds.push(s); }
    });

    try {
        engine.start({
            carName: 'Lada Priora',
            performance: { speed: 180, accel: 10 }
        });

        engine.addWantedStars(3, 'Таран ДПС');

        const policeCar = engine.trafficCars.find(c => c.userData.type === 'police');
        assert.ok(policeCar, 'Police car found');

        // Position player cornered right in front of police car (<12m) and stopped (0 km/h)
        engine.state.speed = 0;
        engine.state.x = 0;
        engine.state.z = 100;
        policeCar.position.set(0, 0, 96); // 4m distance

        // Simulate 3.0s of cornered arrest
        for (let t = 0; t < 32; t++) {
            policeCar.position.set(0, 0, 96);
            engine.state.speed = 0;
            engine.update(0.1);
            if (gameOverReason) break;
        }

        assert.strictEqual(gameOverReason, 'busted', 'Game over reason must be busted');
        assert.strictEqual(engine.state.isBusted, true, 'isBusted flag must be true');
        assert.ok(sounds.includes('busted'), 'Busted sound effect must be called');
    } finally {
        engine.destroy();
    }
});

test('3D Police Pursuit: 5-Star wanted level deploys dynamic helicopter spotlight', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    try {
        engine.start({
            carName: 'Audi RS6 Avant',
            performance: { speed: 280, accel: 20 }
        });

        assert.strictEqual(engine.helicopterLight, null, 'No helicopter light initially');

        // Escalate to 5 stars
        engine.addWantedStars(5, 'Угон и агрессивное вождение');
        assert.strictEqual(engine.state.wantedStars, 5);

        // Update engine
        engine.update(0.1);

        assert.ok(engine.helicopterLight, 'Helicopter SpotLight must be created at 5 stars');
        assert.ok(engine.helicopterLight.position.y > 15, 'Helicopter light must hover high above the road');

        // Clear pursuit
        engine.clearPursuit();
        assert.strictEqual(engine.helicopterLight, null, 'Helicopter light must be removed upon clearing pursuit');
    } finally {
        engine.destroy();
    }
});

test('3D Police Pursuit: HUD notification passes wanted stars, escape percent and siren state', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    let lastHud = null;
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onUpdateHUD: (hud) => { lastHud = hud; }
    });

    try {
        engine.start({
            carName: 'Lada Granta FL',
            performance: { speed: 170, accel: 10 }
        });

        engine.addWantedStars(3, 'ДПС погоня');
        engine.update(0.05);

        assert.ok(lastHud, 'HUD update was emitted');
        assert.strictEqual(lastHud.wantedStars, 3);
        assert.strictEqual(lastHud.isPursuitActive, true);
        assert.strictEqual(typeof lastHud.escapePercent, 'number');
        assert.strictEqual(typeof lastHud.nearestPoliceDist, 'number');
        assert.strictEqual(typeof lastHud.bustedTimer, 'number');
    } finally {
        engine.destroy();
    }
});
