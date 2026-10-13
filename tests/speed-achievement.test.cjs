const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('achievements catalog contains 20 distinct achievements with valid rewards', () => {
    const app = createApp();
    const catalog = app.run('ACHIEVEMENTS_CATALOG');

    assert.equal(catalog.length, 20, 'Catalog should contain 20 achievements');
    const ids = new Set();
    for (const ach of catalog) {
        assert.ok(ach.id, 'Achievement must have an id');
        assert.ok(!ids.has(ach.id), `Duplicate achievement id: ${ach.id}`);
        ids.add(ach.id);
        assert.ok(ach.name, `Achievement ${ach.id} must have a name`);
        assert.ok(ach.reward > 0, `Achievement ${ach.id} must offer a positive reward`);
        assert.equal(typeof ach.check, 'function', `Achievement ${ach.id} must have a check function`);
    }

    const expectedIds = [
        'first_million', 'billionaire', 'fleet_5', 'fleet_15', 'hypercar_owner',
        'speed_200', 'speed_350', 'drift_first', 'drift_king', 'drift_combo_5',
        'total_drift_50k', 'drag_champ', 'plate_777', 'blatnoy_plate', 'styling_master',
        'max_tune', 'cases_10', 'cases_50', 'distance_50km', 'overtakes_50'
    ];
    for (const id of expectedIds) {
        assert.ok(ids.has(id), `Expected achievement id ${id} missing from catalog`);
    }
});

test('live racing speed triggers speed_200 achievement at >= 200 km/h and pays reward', () => {
    const app = createApp({
        saved: {
            nickname: 'SpeedRacer',
            balance: 50000,
            achievements: {}
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('achievements.speed_200'), undefined);

    // Initial race player setup with speed below 200 km/h
    app.run(`
        racePlayer = {
            speed: 180,
            peakSpeed: 180,
            handling: 7,
            accel: 5,
            targetSpeed: 240,
            x: 200,
            vx: 0,
            fuelConsumption: 12,
            fuelLiters: 0,
            fuelCurrent: 30,
            shield: 0,
            isNitroActive: false,
            isDrafting: false
        };
        raceKeys = { gas: true, brake: false, left: false, right: false, nitro: false, drift: false };
    `);

    // Run physics step at 180 km/h: should not trigger achievement yet
    app.run('updateRacePhysics(0.016)');
    assert.equal(app.run('achievements.speed_200'), undefined);
    assert.equal(app.run('balance'), 50000);

    // Accelerate to 205 km/h: live physics step should detect >= 200 km/h and award speed_200 (+80 000 ₽)
    app.run('racePlayer.speed = 205;');
    app.run('updateRacePhysics(0.016)');

    assert.ok(app.run('achievements.speed_200') !== undefined, 'speed_200 should be unlocked');
    assert.equal(app.run('balance'), 50000 + 80000);
});

test('hypersonic speed >= 350 km/h unlocks speed_350 achievement', () => {
    const app = createApp({
        saved: {
            nickname: 'HypersonicPilot',
            balance: 100000,
            achievements: { speed_200: true }
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('achievements.speed_350'), undefined);

    app.run(`
        racePlayer = {
            speed: 355,
            peakSpeed: 355,
            handling: 9,
            accel: 8,
            targetSpeed: 400,
            x: 200,
            vx: 0,
            fuelConsumption: 25,
            fuelLiters: 0,
            fuelCurrent: 40,
            shield: 0,
            isNitroActive: false,
            isDrafting: false
        };
        raceKeys = { gas: true, brake: false, left: false, right: false, nitro: false, drift: false };
    `);

    app.run('updateRacePhysics(0.016)');

    assert.ok(app.run('achievements.speed_350') !== undefined, 'speed_350 should be unlocked');
    assert.equal(app.run('balance'), 100000 + 500000);
});

test('drift achievements unlock when drift score and combo thresholds are reached', () => {
    const app = createApp({
        saved: {
            nickname: 'DriftKingCandidate',
            balance: 10000,
            achievements: {}
        }
    });
    app.run('loadProgress()');

    // 1. First drift achievement (1,000 pts)
    app.run('racePlayer = { driftScore: 1200, driftCombo: 2 }; checkAchievements();');
    assert.ok(app.run('achievements.drift_first') !== undefined, 'drift_first should unlock at 1200 pts');
    assert.equal(app.run('balance'), 10000 + 60000);

    // 2. Combo master x5
    app.run('racePlayer.driftCombo = 5; checkAchievements();');
    assert.ok(app.run('achievements.drift_combo_5') !== undefined, 'drift_combo_5 should unlock at x5 combo');
    assert.equal(app.run('balance'), 10000 + 60000 + 150000);

    // 3. Drift King (10,000 pts)
    app.run('racePlayer.driftScore = 10500; checkAchievements();');
    assert.ok(app.run('achievements.drift_king') !== undefined, 'drift_king should unlock at 10500 pts');
    assert.equal(app.run('balance'), 10000 + 60000 + 150000 + 250000);

    // 4. Drift Legend (50,000 cumulative pts)
    app.run('achievements.driftTotalScore = 52000; checkAchievements();');
    assert.ok(app.run('achievements.total_drift_50k') !== undefined, 'total_drift_50k should unlock at 52000 cumulative pts');
    assert.equal(app.run('balance'), 10000 + 60000 + 150000 + 250000 + 300000);
});
