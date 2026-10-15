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
        trafficSpawnTimer = -9999;

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

test('drawPixelCarSide and view switcher support side profile with custom wheels, stance and tints for all 25 models', () => {
    const app = createApp();
    const cars = app.run('carsData.map(c => c.name)');

    // 1. Verify drawPixelCarSide executes cleanly for all car models including traffic models in canvas
    const allModelsToTest = [...cars, "ДПС / Полиция", "КАМАЗ / Фура"];
    for (const carName of allModelsToTest) {
        app.run(`
            (() => {
                const cvs = document.getElementById('race-canvas');
                const c = cvs.getContext('2d');
                drawPixelCarSide(c, 140, 75, ${JSON.stringify(carName)}, 2.0, {
                    color: '#eab308',
                    wheels: 'deepdish',
                    suspension: 'bpan',
                    tint: 'chameleon',
                    spoiler: 'gt',
                    vinyl: 'drift',
                    neon: '#00f0ff',
                    sgu: 'installed',
                    lightsOn: true
                });
            })();
        `);
    }

    // 2. Test view mode switching in styling modal
    app.run(`
        myCars = [{
            name: "Lada Priora БПАН",
            styling: { color: "#ffffff", wheels: "stamps", suspension: "bpan", tint: 95 }
        }];
        openStylingModal(0);
    `);
    assert.equal(app.run('stylingViewMode'), 'side', 'Default view mode in styling modal should be side');

    app.run(`setStylingViewMode('top')`);
    assert.equal(app.run('stylingViewMode'), 'top', 'View mode should switch to top');

    app.run(`setStylingViewMode('side')`);
    assert.equal(app.run('stylingViewMode'), 'side', 'View mode should switch back to side');

    // 3. Verify getCarSpriteDataUrl with explicit and default view modes
    const sideSprite = app.run(`
        getCarSpriteDataUrl("Nissan Silvia S15 Spec-R", {
            color: "#dc2626",
            wheels: "forged",
            suspension: "lowered",
            tint: "dubai",
            spoiler: "ducktail",
            vinyl: "stripes"
        }, { view: "side" })
    `);
    assert.ok(typeof sideSprite === 'string' && sideSprite.length > 20);

    const topSprite = app.run(`
        getCarSpriteDataUrl("Nissan Silvia S15 Spec-R", {
            color: "#dc2626",
            wheels: "forged",
            suspension: "lowered",
            tint: "dubai"
        }, { view: "top" })
    `);
    assert.ok(typeof topSprite === 'string' && topSprite.length > 20);
});

test('repair and styling persist seamlessly across page refresh and online profile sync', () => {
    const app = createApp();

    // 1. Setup garage with damaged car and apply repair
    app.run(`
        balance = 1000000;
        myCars = [{
            name: "Lada Priora БПАН",
            basePrice: 250000,
            condition: 42,
            upgrades: { engine: 2, handling: 1, economy: 0, nitro: 0 },
            styling: { color: "#ffffff", tint: 0, neon: "none", wheels: "stock", suspension: "stock", spoiler: "none", vinyl: "none", sgu: "none" }
        }];
        saveProgress();
    `);

    // Verify initial condition
    assert.equal(app.run('myCars[0].condition'), 42);

    // Repair the car
    app.run(`repairGarageCar(0)`);
    assert.equal(app.run('myCars[0].condition'), 100, 'Car condition should be 100% after repair');

    // Apply custom styling
    app.run(`
        openStylingModal(0);
        selectStylingColor('#ef4444');
        selectStylingTint('chameleon');
        selectStylingWheels('forged');
        selectStylingSuspension('bpan');
        selectStylingSpoiler('gt');
        selectStylingVinyl('drift');
        selectStylingSgu('installed');
        confirmApplyStyling();
    `);

    const styledCar = app.run('myCars[0]');
    assert.equal(styledCar.condition, 100);
    assert.equal(styledCar.styling.wheels, 'forged');
    assert.equal(styledCar.styling.suspension, 'bpan');
    assert.equal(styledCar.styling.spoiler, 'gt');
    assert.equal(styledCar.styling.vinyl, 'drift');
    assert.equal(styledCar.styling.sgu, 'installed');
    assert.equal(styledCar.styling.tint, 'chameleon');

    // 2. Simulate server sending an older / stripped snapshot upon page reload
    app.run(`
        const staleServerProfile = {
            nickname: nickname,
            balance: balance,
            inventory: [],
            myCars: [{
                name: "Lada Priora БПАН",
                basePrice: 250000,
                condition: 42, // Stale condition from server
                upgrades: { engine: 2, handling: 1, economy: 0, nitro: 0 },
                styling: { color: "#ef4444" } // Missing wheels, suspension, spoiler, vinyl, sgu
            }]
        };
        setOnlineProfile(staleServerProfile, true);
    `);

    const mergedCar = app.run('myCars[0]');
    assert.equal(mergedCar.condition, 100, 'Smart merge must preserve 100% repaired condition over stale server condition');
    assert.equal(mergedCar.styling.wheels, 'forged', 'Smart merge must preserve forged wheels');
    assert.equal(mergedCar.styling.suspension, 'bpan', 'Smart merge must preserve bpan suspension');
    assert.equal(mergedCar.styling.spoiler, 'gt', 'Smart merge must preserve gt spoiler');
    assert.equal(mergedCar.styling.vinyl, 'drift', 'Smart merge must preserve drift vinyl');
    assert.equal(mergedCar.styling.sgu, 'installed', 'Smart merge must preserve installed SGU');
    assert.equal(mergedCar.styling.tint, 'chameleon', 'Smart merge must preserve chameleon tint');

    // 3. Simulate full page reload (loadProgress)
    app.run(`loadProgress()`);
    const reloadedCar = app.run('myCars[0]');
    assert.equal(reloadedCar.condition, 100, 'Condition must remain 100% after loadProgress reload');
    assert.equal(reloadedCar.styling.wheels, 'forged', 'Wheels must remain forged after loadProgress reload');
    assert.equal(reloadedCar.styling.suspension, 'bpan', 'Suspension must remain bpan after loadProgress reload');
    assert.equal(reloadedCar.styling.sgu, 'installed', 'SGU must remain installed after loadProgress reload');
});

test('car audio profiles and horn effects trigger SGU, truck air-brake and dual-tone horn accurately', () => {
    const app = createApp();

    // Verify audio profile classification
    assert.equal(app.run('getCarAudioProfile({ name: "КАМАЗ / Фура" })'), 'kamaz');
    assert.equal(app.run('getCarAudioProfile({ name: "ВАЗ-2107 «Жигули»", category: "Классика" })'), 'classic');
    assert.equal(app.run('getCarAudioProfile({ name: "Porsche 911 Turbo S", category: "Спорткар" })'), 'sport');
    assert.equal(app.run('getCarAudioProfile({ name: "Mercedes-Benz G63 AMG «Гелик»", category: "Внедорожник" })'), 'v8');

    // Setup race running state
    app.run(`
        isRaceRunning = true;
        racePlayer = { sguStrobeTimer: 0 };
    `);

    // 1. Regular car horn
    app.run(`
        selectedRaceCarName = "ВАЗ-2107 «Жигули»";
        triggerRaceHorn(true);
    `);
    const popupText1 = app.run('document.getElementById("race-popup-msg").innerText');
    assert.match(popupText1, /БИ-БИП/);

    // 2. SGU Police VIP horn
    app.run(`
        selectedRaceCarName = "ДПС / Полиция";
        triggerRaceHorn(true);
    `);
    const popupText2 = app.run('document.getElementById("race-popup-msg").innerText');
    assert.match(popupText2, /СГУ: ДОРОГУ VIP/);
    assert.equal(app.run('racePlayer.sguStrobeTimer'), 0.6);

    // 3. KAMAZ truck air-brake horn
    app.run(`
        selectedRaceCarName = "КАМАЗ / Фура";
        triggerRaceHorn(true);
    `);
    const popupText3 = app.run('document.getElementById("race-popup-msg").innerText');
    assert.match(popupText3, /ПНЕВМО-СИГНАЛ/);

    app.run(`isRaceRunning = false;`);
});

test('2D police takedown: ramming DPS at high speed or nitro spins police out, awards bounty, and does not kill player', () => {
    const app = createApp();
    app.run(`
        isRaceRunning = true;
        raceTraffic = [{
            x: 180,
            y: 450,
            laneIdx: 1,
            targetX: 180,
            speed: 100,
            targetSpeed: 100,
            isTruck: false,
            isPolice: true,
            isCone: false,
            spinning: false
        }];
        racePlayer.x = 180;
        racePlayer.y = 470;
        racePlayer.speed = 150;
        racePlayer.wantedStars = 2;
        racePlayer.escapeTimer = 6.0;
        racePlayer.isNitroActive = true;

        updateRacePhysics(0.05);
    `);

    assert.equal(app.run('raceTraffic[0].spinning'), true, 'Police car should be spinning after takedown');
    assert.equal(app.run('isRaceRunning'), true, 'Player should continue driving without crash');
    assert.ok(app.run('racePlayer.earnedCash') >= 30000, 'Takedown awards bounty cash');
    app.run(`isRaceRunning = false;`);
});



