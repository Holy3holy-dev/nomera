const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');
const E = require('../js/race-economy.js');

test('toggleRaceAutoGas toggles state and effectively applies throttle when brake is released', () => {
    const app = createApp();
    assert.equal(app.run('raceAutoGasEnabled'), false);

    app.run('toggleRaceAutoGas()');
    assert.equal(app.run('raceAutoGasEnabled'), true);
    assert.equal(app.run('document.getElementById("touch-autogas-label").textContent'), 'АВТО-ГАЗ: ВКЛ');

    // Start game and test physics with auto-gas active
    app.run(`
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();
        raceKeys.gas = false;
        raceKeys.brake = false;
        raceKeys.drift = false;
        racePlayer.speed = 80;
        updateRacePhysics(0.05);
    `);
    assert.ok(app.run('racePlayer.speed') > 80, 'Auto-gas should accelerate vehicle without manual gas key');

    // Test that pressing brake overrides auto-gas
    app.run(`
        raceKeys.brake = true;
        updateRacePhysics(0.05);
    `);
    assert.ok(app.run('racePlayer.targetSpeed') <= 50, 'Brake key must override auto-gas');

    app.run('toggleRaceAutoGas()');
    assert.equal(app.run('raceAutoGasEnabled'), false);
});

test('high-speed racing dynamically adjusts look-ahead player position for better road visibility', () => {
    const app = createApp();
    app.run(`
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();
        racePlayer.speed = 100;
        updateRacePhysics(0.05);
    `);
    const lowSpeedY = app.run('racePlayer.y');

    app.run(`
        racePlayer.speed = 320;
        updateRacePhysics(0.1);
        updateRacePhysics(0.1);
    `);
    const highSpeedY = app.run('racePlayer.y');

    assert.ok(highSpeedY > lowSpeedY, 'Player car should dynamically shift down at high speed to open up forward road view');
});

test('drift mode spawns touge apex clipping zones and awards bonus score when sliding past them', () => {
    const app = createApp();
    app.run(`
        setRaceMode('drift');
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();
        raceKeys.drift = true;
        raceKeys.gas = true;
        racePlayer.speed = 120;
        racePlayer.vx = 45;
        racePlayer.yawAngle = 0.45; // ~26 degrees drift
        racePlayer.driftScore = 0;
        racePlayer.driftCombo = 2;

        // Manually place a clipping zone right in front of player
        raceClippingZones = [{
            x: racePlayer.x + 10,
            y: racePlayer.y - 15,
            side: 'right',
            hit: false
        }];
        updateRacePhysics(0.05);
    `);

    assert.equal(app.run('raceClippingZones[0].hit'), true, 'Clipping zone should register hit');
    assert.ok(app.run('racePlayer.driftScore') > 0, 'Clipping apex should award drift score');
});

test('arcade fuel consumption burns fuel rapidly enough to make tank survival meaningful', () => {
    const frameRate = E.fuelForFrame({ speed: 200, seconds: 0.05, consumption: 16, gas: true });
    // In 60 seconds (1200 frames of 0.05s / 20 steps per sec), burns ~2.3 liters
    const perMinute = frameRate * 20 * 60;
    assert.ok(perMinute > 1.5, 'Per minute fuel consumption should be intense enough for realistic arcade tank life');
});
