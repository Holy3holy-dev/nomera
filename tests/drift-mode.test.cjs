const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('setRaceMode switches mode between highway and drift', () => {
    const app = createApp();
    assert.equal(app.run('raceCurrentMode'), 'highway');

    app.run('setRaceMode("drift")');
    assert.equal(app.run('raceCurrentMode'), 'drift');
    assert.equal(app.run('document.getElementById("race-mode-label").textContent'), 'Дрифт (Заносы)');

    app.run('setRaceMode("highway")');
    assert.equal(app.run('raceCurrentMode'), 'highway');
    assert.equal(app.run('document.getElementById("race-mode-label").textContent'), 'Шоссе (Трафик)');
});

test('handbrake input and drift physics accumulate drift score and combo', () => {
    const app = createApp();

    app.run(`
        setRaceMode('drift');
        racePlayer = {
            x: 200,
            y: 500,
            vx: 60,
            speed: 120,
            targetSpeed: 160,
            handling: 8,
            accel: 6,
            driftFactor: 1.5,
            isDrifting: false,
            driftDuration: 0,
            driftCombo: 1,
            maxDriftCombo: 1,
            driftComboTimer: 0,
            driftCurrentScore: 0,
            driftScore: 0,
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

    // Run physics frame
    app.run('updateRacePhysics(0.05)');

    assert.equal(app.run('racePlayer.isDrifting'), true, 'Vehicle should be in drifting state');
    assert.ok(app.run('racePlayer.driftScore') > 0, 'Drift score must increase during slide');
    assert.ok(app.run('racePlayer.driftDuration') > 0, 'Drift duration must track elapsed slide time');
});

test('settleRaceRun includes drift bonus in earnings and updates drift achievements', () => {
    const app = createApp({
        saved: {
            nickname: 'Drifter',
            balance: 50000,
            achievements: { first_million: true, drift_first: true }
        }
    });
    app.run('loadProgress()');

    app.run(`
        isRaceRunning = true;
        activeRaceCar = myCars[0];
        racePlayer = {
            distanceKm: 2.5,
            peakSpeed: 180,
            speed: 100,
            overtakesCount: 4,
            damageTaken: 2,
            earnedCash: 10000,
            driftScore: 2500,
            maxDriftCombo: 3,
            fuelLiters: 0.8,
            tunedStats: { rewardMult: 1.5 }
        };
        settleRaceRun(false);
    `);

    assert.equal(app.run('isRaceRunning'), false);
    // Drift bonus: Math.round(2500 * 0.8 * 1.5) = 3000 ₽.
    // Gross: 10000 + 3000 = 13000 ₽.
    // Fuel cost: 0.8 * 82 = 65.6 -> 66 ₽.
    // Net credited: 12934 ₽.
    // Balance: 50000 + 12934 = 62934 ₽.
    assert.equal(app.run('balance'), 62934);
    assert.equal(app.run('achievements.driftBestScore'), 2500);
    assert.equal(app.run('achievements.driftTotalScore'), 2500);
    assert.equal(app.run('achievements.driftMaxCombo'), 3);
});

test('drift physics simulates realistic yaw angle, counter-steering dynamics, and angle rating', () => {
    const app = createApp();

    app.run(`
        setRaceMode('drift');
        racePlayer = {
            x: 200,
            y: 500,
            vx: 80,
            speed: 130,
            targetSpeed: 160,
            handling: 8,
            accel: 6,
            driftFactor: 1.6,
            isDrifting: false,
            driftDuration: 0,
            driftCombo: 1,
            maxDriftCombo: 1,
            driftComboTimer: 0,
            driftCurrentScore: 0,
            driftScore: 0,
            tilt: 0,
            yawAngle: 0,
            isCounterSteering: false,
            counterSteerTimer: 0,
            driftQuality: '',
            driftAngleDeg: 0,
            damageTaken: 0,
            fuelConsumption: 10,
            fuelLiters: 0,
            fuelCurrent: 25,
            shield: 0,
            isNitroActive: false,
            isDrafting: false
        };
        // Sliding right (vx > 0) while steering left: counter-steering!
        raceKeys = { gas: true, brake: false, left: true, right: false, nitro: false, drift: false };
    `);

    app.run('updateRacePhysics(0.05)');

    assert.equal(app.run('racePlayer.isDrifting'), true, 'Should detect drift state');
    assert.equal(app.run('racePlayer.isCounterSteering'), true, 'Should detect counter-steering');
    assert.ok(app.run('racePlayer.yawAngle') > 0, 'yawAngle must rotate in slide direction');
    assert.ok(app.run('racePlayer.driftAngleDeg') > 0, 'driftAngleDeg must track angular magnitude');
    assert.ok(typeof app.run('racePlayer.driftQuality') === 'string' && app.run('racePlayer.driftQuality').length > 0, 'driftQuality label must be set');
    assert.ok(app.run('raceDriftSmoke').length > 0, 'Tire smoke particles must spawn from rear tires');
    assert.ok(app.run('raceSkidmarks').length >= 2, 'Twin tire skidmarks must be produced');
});

test('mobile multi-touch controls track independent keys without dropping inputs', () => {
    const app = createApp();

    // 1. Simultaneous gas + left steering
    app.run(`
        setRaceKey('gas', true);
        setRaceKey('left', true);
    `);
    assert.equal(app.run('raceKeys.gas'), true);
    assert.equal(app.run('raceKeys.left'), true);

    // 2. Tapping drift or nitro does not drop gas or steer
    app.run(`
        setRaceKey('nitro', true);
        setRaceKey('drift', true);
    `);
    assert.equal(app.run('raceKeys.gas'), true);
    assert.equal(app.run('raceKeys.left'), true);
    assert.equal(app.run('raceKeys.nitro'), true);
    assert.equal(app.run('raceKeys.drift'), true);

    // 3. Releasing steer leaves gas, nitro, and drift active
    app.run(`
        setRaceKey('left', false);
    `);
    assert.equal(app.run('raceKeys.left'), false);
    assert.equal(app.run('raceKeys.gas'), true);
    assert.equal(app.run('raceKeys.nitro'), true);

    // 4. Pointer-based tracking via handleTouchControl
    app.run(`
        const fakePointerEvent = { pointerId: 42, preventDefault: () => {} };
        handleTouchControl(fakePointerEvent, 'gas', true);
    `);
    assert.equal(app.run('raceKeys.gas'), true);
    assert.equal(app.run('activeRacePointers.get(42)'), 'gas');

    app.run(`
        handleTouchControl({ pointerId: 42, preventDefault: () => {} }, 'gas', false);
    `);
    assert.equal(app.run('raceKeys.gas'), false);
    assert.equal(app.run('activeRacePointers.has(42)'), false);
});
