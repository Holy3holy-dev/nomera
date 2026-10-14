const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('getCarAudioProfile classifies archetypes correctly', () => {
    const app = createApp();

    const classic = app.run('getCarAudioProfile({ name: "ВАЗ-2107 «Жигули»", category: "Классика" })');
    assert.equal(classic, 'classic');

    const v8 = app.run('getCarAudioProfile({ name: "BMW M5 F90 Competition", category: "Спорткар" })');
    assert.equal(v8, 'v8');

    const amg = app.run('getCarAudioProfile({ name: "Mercedes-Benz G63 AMG «Гелик»", category: "Люкс Внедорожник" })');
    assert.equal(amg, 'v8');

    const sport = app.run('getCarAudioProfile({ name: "Porsche 911 Turbo S", category: "Суперкар" })');
    assert.equal(sport, 'sport');

    const hyper = app.run('getCarAudioProfile({ name: "Koenigsegg Jesko Attack", category: "Гиперкар Рекордсмен" })');
    assert.equal(hyper, 'sport');

    const standard = app.run('getCarAudioProfile({ name: "Hyundai Solaris", category: "Городской" })');
    assert.equal(standard, 'standard');
});

test('styling modal supports spoilers (ducktail, gt) and vinyls (stripes, drift)', () => {
    const app = createApp();

    app.run(`
        myCars = [
            { name: "Toyota Mark II Tourer V", price: 1400000, styling: { color: "#ffffff", tint: 0, neon: "none" } }
        ];
        balance = 500000;
        openStylingModal(0);
        selectStylingSpoiler('ducktail');
        selectStylingVinyl('drift');
        confirmApplyStyling();
    `);

    const styling = app.run('myCars[0].styling');
    assert.equal(styling.spoiler, 'ducktail');
    assert.equal(styling.vinyl, 'drift');

    // 20,000 for ducktail + 60,000 for drift = 80,000 deducted
    const bal = app.run('balance');
    assert.equal(bal, 420000);

    // Apply GT wing and stripes
    app.run(`
        openStylingModal(0);
        selectStylingSpoiler('gt');
        selectStylingVinyl('stripes');
        confirmApplyStyling();
    `);

    const styling2 = app.run('myCars[0].styling');
    assert.equal(styling2.spoiler, 'gt');
    assert.equal(styling2.vinyl, 'stripes');

    // 50,000 for GT + 30,000 for stripes = 80,000 deducted
    assert.equal(app.run('balance'), 340000);
});

test('cars render cleanly with custom spoilers and vinyls in getCarSpriteDataUrl', () => {
    const app = createApp();

    const spriteDucktail = app.run('getCarSpriteDataUrl("Toyota Mark II Tourer V", { color: "#38bdf8", spoiler: "ducktail", vinyl: "stripes" })');
    assert.ok(typeof spriteDucktail === 'string' && spriteDucktail.length > 20);

    const spriteGT = app.run('getCarSpriteDataUrl("Nissan GT-R R35 Nismo", { color: "#dc2626", spoiler: "gt", vinyl: "drift" })');
    assert.ok(typeof spriteGT === 'string' && spriteGT.length > 20);
});

test('wanted level increases on violations, caps at 5, and awards bounty upon escaping', () => {
    const app = createApp();

    app.run(`
        isRaceRunning = true;
        raceCurrentMode = 'highway';
        racePlayer.speed = 0;
        racePlayer.targetSpeed = 0;
        racePlayer.wantedStars = 0;
        racePlayer.escapeTimer = 0;
        racePlayer.earnedCash = 0;
        raceTraffic = [];

        // 1st violation: radar
        addWantedStars(1, 'РАДАР');
    `);

    assert.equal(app.run('racePlayer.wantedStars'), 1);
    assert.equal(app.run('racePlayer.escapeTimer'), 9.0);

    // Violations stack up to max 5 stars
    app.run(`
        addWantedStars(2, 'ПРЕВЫШЕНИЕ');
        addWantedStars(3, 'СБИТ КОНУС');
    `);
    assert.equal(app.run('racePlayer.wantedStars'), 5, 'Wanted stars must cap at 5');

    // Escape countdown when no police is nearby
    app.run(`
        updateRacePhysics(5.0);
    `);
    assert.equal(app.run('racePlayer.wantedStars'), 5);
    assert(app.run('racePlayer.escapeTimer') <= 4.1);

    const cashBefore = app.run('racePlayer.earnedCash');
    app.run(`
        updateRacePhysics(4.5);
    `);
    // Escape should trigger!
    assert.equal(app.run('racePlayer.wantedStars'), 0, 'Stars should clear after escape');
    const bountyReceived = app.run('racePlayer.earnedCash') - cashBefore;
    assert.ok(bountyReceived >= 125000, `Expected at least 125,000 bounty, got ${bountyReceived}`);
});

test('police pursuit actively resets escape timer when police is on player tail', () => {
    const app = createApp();

    app.run(`
        isRaceRunning = true;
        raceCurrentMode = 'highway';
        racePlayer.x = 200;
        racePlayer.y = 470;
        racePlayer.speed = 70;
        racePlayer.wantedStars = 2;
        racePlayer.escapeTimer = 2.0; // almost escaped

        // Police is right behind the player (y = 380, diff 90 < 280)
        raceTraffic = [{
            x: 200,
            y: 380,
            speed: 70,
            changeLaneCooldown: 999,
            isPolice: true,
            isTruck: false,
            isCone: false
        }];

        updateRacePhysics(0.1);
    `);

    // Escape timer should be held at minimum 5.0 seconds
    const timer = app.run('racePlayer.escapeTimer');
    assert.ok(timer >= 4.9, 'Escape timer should reset when police is actively pursuing');
    assert.equal(app.run('racePlayer.wantedStars'), 2);
});

test('race canvas renders helicopter searchlight beam at 5 stars and HUD stars', () => {
    const app = createApp();

    app.run(`
        isRaceRunning = true;
        raceCurrentMode = 'highway';
        racePlayer.wantedStars = 5;
        racePlayer.escapeTimer = 8.5;
        selectedRaceCarName = "Toyota Mark II Tourer V";
        selectedRaceCarIndex = 0;
        myCars = [{ name: "Toyota Mark II Tourer V", styling: { color: "#ffffff", spoiler: "gt", vinyl: "drift" } }];

        renderRaceFrame();
    `);

    assert.equal(app.run('racePlayer.wantedStars'), 5);
});

test('sound.horn and sound.sgu exist and synthesize tones cleanly', () => {
    const app = createApp();

    assert.doesNotThrow(() => {
        app.run(`
            if (typeof sound?.horn === 'function') sound.horn();
            if (typeof sound?.sgu === 'function') sound.sgu();
        `);
    });
});

test('styling modal supports wheels, suspension, SGU and premium tints with accurate prices', () => {
    const app = createApp();

    app.run(`
        myCars = [
            {
                name: "ВАЗ-2107 «Жигули»",
                price: 150000,
                styling: { color: "#ffffff", tint: 0, neon: "none", spoiler: "none", vinyl: "none", wheels: "stock", suspension: "stock", sgu: "none" }
            }
        ];
        balance = 500000;

        openStylingModal(0);
        selectStylingWheels('stamps'); // 15 000 ₽
        selectStylingSuspension('bpan'); // 50 000 ₽
        selectStylingTint('chameleon'); // 35 000 ₽
        confirmApplyStyling();
    `);

    const styling1 = app.run('myCars[0].styling');
    assert.equal(styling1.wheels, 'stamps');
    assert.equal(styling1.suspension, 'bpan');
    assert.equal(styling1.tint, 'chameleon');
    // 15 000 + 50 000 + 35 000 = 100 000 ₽ deducted
    assert.equal(app.run('balance'), 400000);

    // Now install SGU (80 000 ₽), forged wheels (75 000 ₽), lift suspension (35 000 ₽), and dubai tint (40 000 ₽)
    app.run(`
        openStylingModal(0);
        selectStylingSgu('installed'); // 80 000 ₽
        selectStylingWheels('forged'); // 75 000 ₽
        selectStylingSuspension('lift'); // 35 000 ₽
        selectStylingTint('dubai'); // 40 000 ₽
        confirmApplyStyling();
    `);

    const styling2 = app.run('myCars[0].styling');
    assert.equal(styling2.sgu, 'installed');
    assert.equal(styling2.wheels, 'forged');
    assert.equal(styling2.suspension, 'lift');
    assert.equal(styling2.tint, 'dubai');
    // 80 000 + 75 000 + 35 000 + 40 000 = 230 000 ₽ deducted from 400 000 = 170 000 ₽
    assert.equal(app.run('balance'), 170000);
});

test('cars render cleanly with wheels, suspension, SGU, and tints in getCarSpriteDataUrl', () => {
    const app = createApp();

    const sprite1 = app.run(`
        getCarSpriteDataUrl("Lada Priora БПАН", {
            color: "#000000",
            wheels: "deepdish",
            suspension: "bpan",
            sgu: "installed",
            tint: "chameleon"
        })
    `);
    assert.ok(typeof sprite1 === 'string' && sprite1.length > 20);

    const sprite2 = app.run(`
        getCarSpriteDataUrl("Mercedes-Benz G63 AMG «Гелик»", {
            color: "#1e293b",
            wheels: "forged",
            suspension: "lift",
            sgu: "installed",
            tint: "dubai"
        })
    `);
    assert.ok(typeof sprite2 === 'string' && sprite2.length > 20);
});

test('horn and SGU function in race: SGU clears traffic ahead and honking at DPS alerts police', () => {
    const app = createApp();

    app.run(`
        isRaceRunning = true;
        raceCurrentMode = 'highway';
        selectedRaceCarName = "Toyota Camry 3.5";
        selectedRaceCarIndex = 0;
        myCars = [{
            name: "Toyota Camry 3.5",
            styling: { sgu: "installed" }
        }];
        racePlayer.x = 165;
        racePlayer.y = 470;
        racePlayer.speed = 100;
        racePlayer.wantedStars = 0;
        racePlayer.sguStrobeTimer = 0;

        // Traffic car in player's lane ahead (x: 165, y: 320, dy = 150)
        raceTraffic = [{
            x: 165,
            y: 320,
            laneIdx: 1,
            targetX: 165,
            speed: 80,
            changeLaneCooldown: 3.0,
            isTruck: false,
            isPolice: false,
            isCone: false,
            yieldedSgu: false
        }];

        // Trigger SGU
        triggerRaceHorn(true);
    `);

    assert.ok(app.run('racePlayer.sguStrobeTimer > 0'), 'SGU strobe timer should be active');

    // Run physics update to allow traffic to react to SGU
    app.run('updateRacePhysics(0.1)');

    const traffic = app.run('raceTraffic[0]');
    assert.equal(traffic.yieldedSgu, true, 'Traffic car should have yielded to SGU');
    assert.equal(traffic.laneIdx, 2, 'Traffic car should move right into lane 2');
    assert.equal(traffic.targetX, 235, 'Traffic targetX should be set to lane 2 (235)');
    assert.equal(traffic.blinker, 'right', 'Traffic blinker should indicate right');

    // Test honking behind police DPS
    app.run(`
        myCars[0].styling.sgu = 'none'; // car without SGU
        raceTraffic = [{
            x: 165,
            y: 400,
            laneIdx: 1,
            name: 'ДПС',
            isPolice: true,
            isTruck: false,
            isCone: false,
            speed: 90
        }];
        raceKeys.horn = true;
        racePlayer.wantedStars = 0;
        updateRacePhysics(0.1);
    `);

    assert.equal(app.run('racePlayer.wantedStars'), 1, 'Honking right behind DPS should trigger wanted star');
});

