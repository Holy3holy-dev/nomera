const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('nitro depletes cleanly to 0, shuts off boost, and prevents infinite stutter loop while holding key', () => {
    const app = createApp();

    app.run(`
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();

        // Set nitro to a very low level (1%) and hold nitro key
        racePlayer.nitro = 1.0;
        racePlayer.nitroDepleted = false;
        racePlayer.isNitroActive = true;
        raceKeys.nitro = true;
    `);

    // Advance physics frame by 0.1s (nitro drains at ~28%/s, so 1% drops to 0)
    app.run('updateRacePhysics(0.1)');

    assert.equal(app.run('racePlayer.nitro'), 0, 'Nitro must drop to exactly 0');
    assert.equal(app.run('racePlayer.isNitroActive'), false, 'Nitro boost must deactivate when tank is empty');
    assert.equal(app.run('racePlayer.nitroDepleted'), true, 'nitroDepleted flag must lock nitro');

    // Keep holding the key for another 5 frames: nitro must NEVER turn back on or stutter
    for (let i = 0; i < 5; i++) {
        app.run('updateRacePhysics(0.05)');
        assert.equal(app.run('racePlayer.isNitroActive'), false, 'Nitro must remain off while held when depleted');
        assert.equal(app.run('racePlayer.nitro'), 0, 'Nitro must not passively recharge while nitro key is pressed');
    }
});

test('depleted nitro recharges only when key is released and unlocks at 20%', () => {
    const app = createApp();

    app.run(`
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();

        racePlayer.nitro = 0;
        racePlayer.nitroDepleted = true;
        racePlayer.isNitroActive = false;
        raceKeys.nitro = false; // Key released!
    `);

    // Let it recharge slightly (e.g. up to 10%)
    app.run('updateRacePhysics(2.0)'); // 2.0s * 4% = ~8%
    const partialNitro = app.run('racePlayer.nitro');
    assert.ok(partialNitro > 0 && partialNitro < 20, 'Nitro should be partially recharged');
    assert.equal(app.run('racePlayer.nitroDepleted'), true, 'nitroDepleted must stay true below 20%');

    // Tapping nitro while below 20% must NOT activate nitro
    app.run('raceKeys.nitro = true; updateRacePhysics(0.05);');
    assert.equal(app.run('racePlayer.isNitroActive'), false, 'Cannot activate nitro below 20% threshold');

    // Now release and let it recharge past 20%
    app.run('raceKeys.nitro = false; racePlayer.nitro = 22; updateRacePhysics(0.05);');
    assert.equal(app.run('racePlayer.nitroDepleted'), false, 'nitroDepleted unlocks once past 20%');

    // Now pressing nitro activates successfully
    app.run('raceKeys.nitro = true; updateRacePhysics(0.05);');
    assert.equal(app.run('racePlayer.isNitroActive'), true, 'Nitro activates successfully once unlocked');
});

test('collecting a nitro canister restores nitro and immediately clears depleted lock', () => {
    const app = createApp();

    app.run(`
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();

        racePlayer.nitro = 0;
        racePlayer.nitroDepleted = true;
        racePlayer.isNitroActive = false;

        // Place a nitro collectible right on the player
        raceCollectibles = [{
            x: racePlayer.x,
            y: racePlayer.y,
            type: 'nitro'
        }];

        updateRacePhysics(0.05);
    `);

    assert.ok(app.run('racePlayer.nitro') >= 50, 'Canister should add 50% nitro');
    assert.equal(app.run('racePlayer.nitroDepleted'), false, 'Canister should clear depleted lock');
});

test('highway race mode incorporates balanced overtakes and highway events', () => {
    const app = createApp();

    app.run(`
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();
    `);

    assert.equal(app.run('raceCurrentMode'), 'highway', 'Race should default to highway mode');

    // Simulate near-miss overtake
    app.run(`
        racePlayer.earnedCash = 0;
        racePlayer.overtakesCount = 0;
        racePlayer.combo = 1;
        raceTraffic = [{
            x: racePlayer.x + 25, // Within near-miss dx (20..46)
            y: racePlayer.y,      // Passing player
            speed: 50,
            overtaken: false,
            isTruck: false,
            isPolice: false,
            isCone: false
        }];
        updateRacePhysics(0.05);
    `);

    assert.equal(app.run('raceTraffic[0].overtaken'), true, 'Traffic car should be flagged overtaken');
    assert.ok(app.run('racePlayer.earnedCash') > 0, 'Overtake should award cash');
    assert.ok(app.run('racePlayer.earnedCash') < 5000, 'Single overtake reward should be reasonably balanced');
});
