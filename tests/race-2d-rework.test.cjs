const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('2D Highway Smart Traffic AI: slower car ahead triggers brake lights, 0.8s blinker, and lane change', () => {
    const app = createApp();
    app.run(`
        myCars = [{ name: 'Toyota Camry 3.5', plate: { text: 'А 123 ВС | 77 RUS' } }];
        selectedRaceCarName = 'Toyota Camry 3.5';
        selectedRaceCarIndex = 0;
        setRaceMode('highway');
        startRaceGame();

        racePlayer.speed = 110;
        racePlayer.x = 305; // Keep player out of lane 1 & 2

        // Place a slow truck ahead in lane 1 (x = 165) and a faster sedan behind it in lane 1
        raceTraffic.length = 0;
        raceTraffic.push({
            x: 165,
            y: 180,
            laneIdx: 1,
            targetX: 165,
            speed: 65,
            targetSpeed: 65,
            name: 'КАМАЗ / Фура',
            role: 'truck',
            isTruck: true,
            isPolice: false,
            isCone: false,
            tilt: 0,
            blinker: null,
            blinkerDir: 0,
            blinkerTimer: 0,
            isBraking: false,
            changeLaneCooldown: 999,
            overtaken: false
        });
        raceTraffic.push({
            x: 165,
            y: 260,
            laneIdx: 1,
            targetX: 165,
            speed: 110,
            targetSpeed: 110,
            name: 'Hyundai Solaris',
            role: 'taxi',
            isTaxi: true,
            isTruck: false,
            isPolice: false,
            isCone: false,
            tilt: 0,
            blinker: null,
            blinkerDir: 0,
            blinkerTimer: 0,
            isBraking: false,
            changeLaneCooldown: 0,
            overtaken: false
        });
    `);

    // Step 1 frame so the faster car detects the slower truck ahead and activates its blinker + brakes
    app.run(`updateRacePhysics(0.05);`);

    const initialSignal = app.run(`({
        isBraking: raceTraffic[1].isBraking,
        blinker: raceTraffic[1].blinker,
        blinkerDir: raceTraffic[1].blinkerDir,
        blinkerTimer: raceTraffic[1].blinkerTimer,
        x: raceTraffic[1].x,
        targetX: raceTraffic[1].targetX
    })`);

    assert.equal(initialSignal.isBraking, true, 'Traffic car should brake when approaching a slower vehicle ahead');
    assert.ok(initialSignal.blinker === 'left' || initialSignal.blinker === 'right', 'Traffic car should activate left or right turn signal');
    assert.ok(initialSignal.blinkerDir === -1 || initialSignal.blinkerDir === 1, 'Traffic car should set blinkerDir (-1 or 1)');
    assert.equal(initialSignal.x, 165, 'Traffic car should hold its current lane X while pre-signaling with blinker (~0.8s)');
    assert.notEqual(initialSignal.targetX, 165, 'Traffic car should select a free adjacent target lane');

    // Step through the 0.8s pre-signal window so the car begins steering into the free adjacent lane
    app.run(`
        for (let i = 0; i < 20; i++) {
            raceTraffic[0].y = 180;
            raceTraffic[1].y = 260;
            updateRacePhysics(0.05);
        }
    `);

    const afterSignal = app.run(`({
        x: raceTraffic[1].x,
        targetX: raceTraffic[1].targetX,
        laneIdx: raceTraffic[1].laneIdx
    })`);

    assert.notEqual(afterSignal.targetX, 165, 'Traffic car should commit to an adjacent lane targetX after ~0.8s blinker');
    assert.ok(Math.abs(afterSignal.x - 165) > 5, `Traffic car should smoothly steer toward the new lane, got x=${afterSignal.x}`);
});

test('2D Highway spawnTrafficCar spawns distinct traffic roles (taxi, ambulance, streetracer, truck, police)', () => {
    const app = createApp();
    const rolesSeen = app.run(`
        myCars = [{ name: 'Toyota Camry 3.5', plate: { text: 'А 123 ВС | 77 RUS' } }];
        selectedRaceCarName = 'Toyota Camry 3.5';
        selectedRaceCarIndex = 0;
        setRaceMode('highway');
        startRaceGame();

        const roles = new Set();
        for (let i = 0; i < 180; i++) {
            raceTraffic.length = 0;
            spawnTrafficCar();
            for (const t of raceTraffic) {
                if (t.role) roles.add(t.role);
            }
        }
        Array.from(roles);
    `);

    assert.ok(rolesSeen.includes('taxi'), 'Should spawn Яндекс-style Taxi role');
    assert.ok(rolesSeen.includes('ambulance'), 'Should spawn Ambulance role');
    assert.ok(rolesSeen.includes('truck'), 'Should spawn Truck role');
    assert.ok(rolesSeen.includes('sedan'), 'Should spawn Sedan role');
});

test('2D Highway «Шашки в потоке» (Near-Miss Overtake Combo) chains x1..x10 and awards extra cash', () => {
    const app = createApp();
    const res = app.run(`
        myCars = [{ name: 'BMW M5 F90', plate: { text: 'В 100 ОО | 77 RUS' } }];
        selectedRaceCarName = 'BMW M5 F90';
        selectedRaceCarIndex = 0;
        setRaceMode('highway');
        startRaceGame();

        racePlayer.speed = 185;
        racePlayer.x = 165;
        racePlayer.y = 470;
        const mult = racePlayer.tunedStats.rewardMult || 1;
        const cashBefore = racePlayer.earnedCash;

        // Place a traffic car right next to player (within 44px laterally, passing player.y)
        raceTraffic.length = 0;
        raceTraffic.push({
            x: 198, // |165 - 198| = 33px (< 44px near-miss threshold, > 24px collision threshold)
            y: 472,
            laneIdx: 2,
            targetX: 198,
            speed: 90,
            targetSpeed: 90,
            name: 'Hyundai Solaris',
            role: 'taxi',
            isTaxi: true,
            isTruck: false,
            isPolice: false,
            isCone: false,
            overtaken: false,
            shashkaAwarded: false
        });

        updateRacePhysics(0.05);
        const combo1 = racePlayer.shashkiCombo;
        const timer1 = racePlayer.shashkiTimer;
        const cashAfter1 = racePlayer.earnedCash;

        // Second close overtake within 4 seconds
        raceTraffic.push({
            x: 132, // |165 - 132| = 33px
            y: 472,
            laneIdx: 1,
            targetX: 132,
            speed: 90,
            targetSpeed: 90,
            name: 'Volkswagen Polo',
            role: 'sedan',
            isTruck: false,
            isPolice: false,
            isCone: false,
            overtaken: false,
            shashkaAwarded: false
        });
        updateRacePhysics(0.05);
        const combo2 = racePlayer.shashkiCombo;
        const cashAfter2 = racePlayer.earnedCash;

        ({
            mult,
            combo1,
            timer1,
            combo2,
            delta1: cashAfter1 - cashBefore,
            delta2: cashAfter2 - cashAfter1,
            floatingCount: raceFloatingTexts.length
        });
    `);

    assert.equal(res.combo1, 1, 'First close high-speed overtake should set shashkiCombo = 1');
    assert.ok(res.timer1 > 3.8, 'shashkiTimer should be set to ~4.0s');
    assert.equal(res.combo2, 2, 'Second close high-speed overtake within 4s should increment shashkiCombo = 2');
    assert.ok(res.delta2 > res.delta1, `Second shashka bonus (${res.delta2}) should exceed first (${res.delta1})`);
    assert.ok(res.floatingCount >= 2, 'Near-miss shashki overtakes should spawn floating text popups');
});

test('2D Highway Speed Radar Cameras («Автоураган»): regular plate gets wanted star, special plate (АМР/ЕКХ) gets VIP immunity + 1500 ₽', () => {
    const app = createApp();

    // Case 1: Regular plate exceeding 160 km/h
    const regularResult = app.run(`
        myCars = [{ name: 'BMW M5 F90', plate: { text: 'В 321 СМ | 77 RUS' } }];
        selectedRaceCarName = 'BMW M5 F90';
        selectedRaceCarIndex = 0;
        setRaceMode('highway');
        startRaceGame();

        racePlayer.speed = 210;
        racePlayer.y = 470;
        racePlayer.wantedStars = 0;
        raceSpeedCameras.length = 0;
        spawnSpeedCamera();
        raceSpeedCameras[0].y = 468; // crossing player.y

        updateRacePhysics(0.05);
        ({
            wantedStars: racePlayer.wantedStars,
            flash: raceCameraShutterFlash,
            triggered: raceSpeedCameras[0].triggered
        });
    `);

    assert.equal(regularResult.triggered, true, 'Speed camera should trigger when player crosses it');
    assert.equal(regularResult.wantedStars, 1, 'Regular plate exceeding 160 km/h should receive +1 Wanted Star');
    assert.ok(regularResult.flash > 0, 'Speed camera violation should trigger camera shutter flash');

    // Case 2: Special series plate АМР exceeding 160 km/h -> Immunity + 1500 ₽
    const specialResult = app.run(`
        myCars = [{ name: 'BMW M5 F90', plate: { text: 'А 777 МР | 97 RUS' } }];
        selectedRaceCarName = 'BMW M5 F90';
        selectedRaceCarIndex = 0;
        racePlayer.speed = 225;
        racePlayer.y = 470;
        racePlayer.wantedStars = 0;
        const cashBefore = racePlayer.earnedCash;
        raceSpeedCameras.length = 0;
        spawnSpeedCamera();
        raceSpeedCameras[0].y = 468;

        updateRacePhysics(0.05);
        ({
            wantedStars: racePlayer.wantedStars,
            cashDelta: racePlayer.earnedCash - cashBefore,
            triggered: raceSpeedCameras[0].triggered,
            hasImmuneText: raceFloatingTexts.some(ft => ft.text.includes('ИММУНИТЕТ'))
        });
    `);

    assert.equal(specialResult.triggered, true, 'Speed camera should mark triggered on special plate pass');
    assert.equal(specialResult.wantedStars, 0, 'АМР special plate should have full immunity from speed camera wanted stars');
    assert.ok(specialResult.cashDelta >= 1500, `АМР special plate should earn +1500 ₽ immunity bonus, got ${specialResult.cashDelta}`);
    assert.equal(specialResult.hasImmuneText, true, 'Should spawn 🛡️ ИММУНИТЕТ floating text');
});

test('2D Drift Mode: «Kiss the Wall» proximity bonus awards +600*combo PTS and titanium sparks within 8px of wall without scraping', () => {
    const app = createApp();
    const kissRes = app.run(`
        myCars = [{ name: 'BMW M5 F90', plate: { text: 'Е 777 КХ | 77 RUS' } }];
        selectedRaceCarName = 'BMW M5 F90';
        selectedRaceCarIndex = 0;
        setRaceMode('drift');
        startRaceGame();

        racePlayer.speed = 135;
        racePlayer.x = 63; // Within 8px of left wall (58 + 8 = 66), but > 58 so not scraping wall
        racePlayer.isDrifting = true;
        racePlayer.driftAngle = 0.65;
        racePlayer.driftCombo = 2;
        racePlayer.kissWallCooldown = 0;
        raceKeys.gas = true;
        raceKeys.drift = true;
        raceKeys.left = true;
        raceSparks.length = 0;

        const scoreBefore = racePlayer.driftScore;
        updateRacePhysics(0.05);

        ({
            isOnWall: racePlayer.isOnWall,
            kissWallCount: racePlayer.kissWallCount,
            kissWallCooldown: racePlayer.kissWallCooldown,
            driftScoreAfter: racePlayer.driftScore,
            scoreDelta: racePlayer.driftScore - scoreBefore,
            driftCombo: racePlayer.driftCombo,
            sparksCount: raceSparks.length,
            hasKissText: raceFloatingTexts.some(ft => ft.text.includes('KISS THE WALL'))
        });
    `);

    assert.equal(kissRes.isOnWall, false, 'Player at x=63 should not be scraping the wall (x=58)');
    assert.equal(kissRes.kissWallCount, 1, 'Kiss the Wall counter should increment');
    assert.ok(kissRes.kissWallCooldown > 1.3, 'Kiss the Wall cooldown should be set to ~1.5s');
    assert.ok(kissRes.scoreDelta >= 1200, `Kiss the Wall with x2 combo should add at least 600*2=1200 PTS, got ${kissRes.scoreDelta}`);
    assert.ok(kissRes.driftCombo >= 3, 'Kiss the Wall should increment driftCombo');
    assert.ok(kissRes.sparksCount >= 10, 'Kiss the Wall should emit titanium sparks');
    assert.equal(kissRes.hasKissText, true, 'Kiss the Wall should spawn floating canvas text');
});

test('2D Drift Mode: Tire Temperature (tireHeat) heats up during drift, produces golden hot smoke above 65%, and cools on straights', () => {
    const app = createApp();
    const heatRes = app.run(`
        myCars = [{ name: 'BMW M5 F90', plate: { text: 'Е 777 КХ | 77 RUS' } }];
        selectedRaceCarName = 'BMW M5 F90';
        selectedRaceCarIndex = 0;
        setRaceMode('drift');
        startRaceGame();

        racePlayer.speed = 140;
        racePlayer.x = 200;
        raceKeys.gas = true;
        raceKeys.drift = true;
        raceKeys.right = true;

        // Drift for several seconds to heat up tires above 65%
        for (let i = 0; i < 65; i++) {
            racePlayer.x = 200;
            racePlayer.speed = 140;
            racePlayer.driftCombo = 4;
            updateRacePhysics(0.05);
        }
        const hotTireHeat = racePlayer.tireHeat;
        const hasHotSmoke = raceDriftSmoke.some(s => s.isHot);
        const hasGoldenSmoke = raceDriftSmoke.some(s => s.isGolden);
        const hasHotSkidmark = raceSkidmarks.some(sm => (sm.heat || 0) > 65);

        // Now release drift and drive straight on a flat section to cool tires
        raceKeys.drift = false;
        raceKeys.right = false;
        raceKeys.left = false;
        racePlayer.isDrifting = false;
        racePlayer.driftAngle = 0;
        for (let i = 0; i < 30; i++) {
            roadCurve = 0;
            targetRoadCurve = 0;
            raceCurveTimer = 10;
            racePlayer.vx = 0;
            racePlayer.x = 200;
            updateRacePhysics(0.05);
        }
        const cooledTireHeat = racePlayer.tireHeat;

        // Verify renderRaceFrame runs cleanly with Touge curves, hot smoke, speed cameras, and floating texts
        roadCurve = 42;
        renderRaceFrame();

        ({
            hotTireHeat,
            hasHotSmoke,
            hasGoldenSmoke,
            hasHotSkidmark,
            cooledTireHeat
        });
    `);

    assert.ok(heatRes.hotTireHeat > 65, `Tires should heat above 65% during sustained drift, got ${heatRes.hotTireHeat}`);
    assert.equal(heatRes.hasHotSmoke, true, 'Should spawn hot thicker drift smoke when tireHeat > 65%');
    assert.equal(heatRes.hasGoldenSmoke, true, 'Should spawn golden/amber drift smoke when tireHeat > 65% and combo >= 4');
    assert.equal(heatRes.hasHotSkidmark, true, 'Skidmarks should record tireHeat > 65%');
    assert.ok(heatRes.cooledTireHeat < heatRes.hotTireHeat, `Tires should cool down when driving straight without drifting (${heatRes.cooledTireHeat} < ${heatRes.hotTireHeat})`);
});

test('2D Drift Mode: road does not wiggle back and forth on its own (getCurveX === 0) and car stays straight without steering input', () => {
    const app = createApp();
    const res = app.run(`
        myCars = [{ name: 'BMW M5 F90', plate: { text: 'Е 777 КХ | 77 RUS' } }];
        selectedRaceCarName = 'BMW M5 F90';
        selectedRaceCarIndex = 0;
        setRaceMode('drift');
        startRaceGame();

        // 1. Stationary check: roadCurve and player.x must not move at all when stationary
        const startX = racePlayer.x;
        for (let i = 0; i < 40; i++) {
            updateRacePhysics(0.05);
        }
        const stationaryX = racePlayer.x;
        const stationaryCurve = roadCurve;

        // 2. Driving straight check: even with non-zero roadCurve, getCurveX(y) stays 0 and car does not get pushed sideways
        raceKeys.gas = true;
        for (let i = 0; i < 60; i++) {
            updateRacePhysics(0.05);
        }
        const drivingStraightX = racePlayer.x;
        const sampleCurveXTop = getCurveX(0);
        const sampleCurveXMid = getCurveX(300);
        const sampleCurveXBot = getCurveX(600);

        ({
            startX,
            stationaryX,
            stationaryCurve,
            drivingStraightX,
            sampleCurveXTop,
            sampleCurveXMid,
            sampleCurveXBot
        });
    `);

    assert.equal(res.stationaryX, res.startX, 'Stationary car must not move horizontally');
    assert.equal(res.stationaryCurve, 0, 'roadCurve must stay 0 while car is stationary');
    assert.equal(res.sampleCurveXTop, 0, 'Top of road must stay centered (getCurveX(0) === 0)');
    assert.equal(res.sampleCurveXMid, 0, 'Middle of road must stay centered (getCurveX(300) === 0)');
    assert.equal(res.sampleCurveXBot, 0, 'Bottom of road must stay centered (getCurveX(600) === 0)');
    assert.equal(res.drivingStraightX, res.startX, 'Driving straight without left/right steering in Drift mode must not push the car sideways');
});

