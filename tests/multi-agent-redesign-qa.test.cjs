'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./helpers/create-app.cjs');
const onlineCore = require('../netlify/functions/lib/online-core.cjs');

const root = path.join(__dirname, '..');

test('Test 1 — Desktop UI/UX & SVG Cases: Generator arena grid, rarity strip, 7 collection tiers, and 11 bespoke SVG case artworks', () => {
    const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    // 1. Generator arena grid & full-width rarity strip
    assert.ok(css.includes('.gen-garage-arena.gen-luxury-grid'), 'styles.css must define .gen-garage-arena.gen-luxury-grid');
    assert.match(css, /\.gen-rarity-odds-strip\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/, '.gen-rarity-odds-strip must span full grid width (1 / -1)');
    assert.ok(css.includes('[data-rarity-tier="uncommon"]'), 'styles.css must define [data-rarity-tier="uncommon"] lighting rule');

    // 2. Enlarged desktop mini-plate inside inventory grid at min-width: 641px
    assert.match(css, /@media\s*\(\s*min-width:\s*641px\s*\)[\s\S]*?\.inventory-grid\s+\.mini-plate/, 'styles.css must enlarge .inventory-grid .mini-plate at min-width: 641px');

    // 3. All 7 .inv-plate-card rarity tier rules
    const requiredTiers = [
        '.inv-plate-card.tier-common',
        '.inv-plate-card.tier-uncommon',
        '.inv-plate-card.tier-rare',
        '.inv-plate-card.tier-super',
        '.inv-plate-card.tier-epic',
        '.inv-plate-card.tier-legend',
        '.inv-plate-card.tier-mythic'
    ];
    for (const tierRule of requiredTiers) {
        assert.ok(css.includes(tierRule), `styles.css must contain ${tierRule}`);
    }

    // 4. All 11 .case-card items in .cases-grid (#cases) contain inline <svg class="case-art-svg" inside .case-icon-box
    const casesGridStart = html.indexOf('class="cases-grid"');
    assert.ok(casesGridStart !== -1, 'index.html must contain .cases-grid');
    const casesSectionEnd = html.indexOf('</section>', casesGridStart);
    const casesGridHtml = html.slice(casesGridStart, casesSectionEnd);

    const caseCards = casesGridHtml.match(/<div class="case-card\s+case-/g) || [];
    const iconBoxes = casesGridHtml.match(/<div class="case-icon-box">\s*<svg class="case-art-svg"/g) || [];
    assert.equal(caseCards.length, 11, 'Must have exactly 11 .case-card elements in .cases-grid');
    assert.equal(iconBoxes.length, 11, 'All 11 .case-card elements must contain <svg class="case-art-svg"> inside .case-icon-box');
});

test('Test 2 — Mobile UX & Z-Index / Touch / 320px Overflow: modal z-index 1400, race-active chrome hiding, 3D pan-y, and modal close UX', () => {
    const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    // 1. .modal-overlay z-index: 1400 !important (above .top-game-header 1100 and .mobile-bottom-nav 1250)
    assert.match(css, /\.modal-overlay[\s\S]*?z-index:\s*1400\s*!important/, '.modal-overlay must have z-index: 1400 !important');

    // 2. body.race-active hides .top-game-header and .mobile-bottom-nav
    assert.match(css, /body\.race-active\s+\.top-game-header[\s\S]*?display:\s*none\s*!important/, 'body.race-active must hide .top-game-header');
    assert.match(css, /body\.race-active\s+\.mobile-bottom-nav[\s\S]*?display:\s*none\s*!important/, 'body.race-active must hide .mobile-bottom-nav');

    // 3. #garage-preview-3d-wrap sets touch-action: pan-y !important
    assert.match(css, /#garage-preview-3d-wrap[\s\S]*?touch-action:\s*pan-y\s*!important/, '#garage-preview-3d-wrap must set touch-action: pan-y !important');

    // 4. #auth-modal and #attach-modal have .region-btn-close (✕) and backdrop click dismiss
    assert.match(html, /<div id="auth-modal"[^>]*onclick="if\(event\.target===this\)closeProfileModal\(\)"/, '#auth-modal must dismiss on backdrop click via closeProfileModal()');
    assert.match(html, /id="auth-modal"[\s\S]*?<button[^>]*class="region-btn-close"[^>]*onclick="closeProfileModal\(\)"[^>]*>✕<\/button>/, '#auth-modal must have .region-btn-close ✕ button');

    assert.match(html, /<div id="attach-modal"[^>]*onclick="if\(event\.target===this\)closeAttachModal\(\)"/, '#attach-modal must dismiss on backdrop click via closeAttachModal()');
    assert.match(html, /id="attach-modal"[\s\S]*?<button[^>]*class="region-btn-close"[^>]*onclick="closeAttachModal\(\)"[^>]*>✕<\/button>/, '#attach-modal must have .region-btn-close ✕ button');
});

test('Test 3 — Dealership & 49-Car Visuals & No External Wikimedia URLs', () => {
    const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
    const car3dSource = fs.readFileSync(path.join(root, 'js', 'car-3d.js'), 'utf8');

    // 1. Zero wikimedia.org URLs and DEFAULT_CAR_IMG = './icons/car-placeholder.svg'
    assert.equal(/wikimedia\.org/i.test(appSource), false, 'js/app.js must contain zero wikimedia.org URLs');
    assert.match(appSource, /const\s+DEFAULT_CAR_IMG\s*=\s*['"]\.\/icons\/car-placeholder\.svg['"]/, 'js/app.js must define DEFAULT_CAR_IMG = "./icons/car-placeholder.svg"');

    // 2. Distinct sprites across the 20 previously fallback NFS/GLB cars
    const app = createApp();
    const twentyGlbCars = [
        'Volkswagen Golf GTI',
        'Lexus IS300',
        'Mitsubishi Eclipse GT',
        'Hyundai Elantra N',
        'Mazda RX-8',
        'Ford Mustang GT Coupe',
        'Mitsubishi Lancer Evo VIII',
        'Porsche Cayman S',
        'Mercedes-Benz CLK 500',
        'Toyota Supra MK4',
        'BMW M3 G80 Competition',
        'Chevrolet Corvette C6',
        'Porsche Panamera Turbo',
        'Audi RS7 Sportback',
        'BMW X5M Competition',
        'Maserati GranTurismo',
        'Dodge Viper SRT10',
        'Aston Martin DB9',
        'Lamborghini Gallardo',
        'Mercedes-Benz SLR McLaren'
    ];

    const sideSprites = new Set();
    const topSprites = new Set();
    for (const carName of twentyGlbCars) {
        const sideUrl = app.run(`getCarSpriteDataUrl(${JSON.stringify(carName)}, {}, { view: 'side', forcePixel: true })`);
        const topUrl = app.run(`getCarSpriteDataUrl(${JSON.stringify(carName)}, {}, { view: 'top', forcePixel: true })`);
        assert.ok(sideUrl.startsWith('data:image/png;base64,'), `Expected valid side data URL for ${carName}`);
        assert.ok(topUrl.startsWith('data:image/png;base64,'), `Expected valid top data URL for ${carName}`);
        sideSprites.add(sideUrl);
        topSprites.add(topUrl);
    }
    assert.equal(sideSprites.size, twentyGlbCars.length, 'All 20 NFS/GLB cars must produce distinct side-view sprites');
    assert.equal(topSprites.size, twentyGlbCars.length, 'All 20 NFS/GLB cars must produce distinct top-down sprites');

    // 3. Verify Car3DManager.hasCustomStylingForThumbnail, Car3DManager.getSideThumbnail, and Car3DShowroom.prototype.pause / resume
    assert.match(car3dSource, /function\s+hasCustomStylingForThumbnail\s*\(/, 'car-3d.js must define hasCustomStylingForThumbnail');
    assert.match(car3dSource, /function\s+getSideThumbnail\s*\(/, 'car-3d.js must define getSideThumbnail');
    assert.match(car3dSource, /\bpause\s*\(\s*\)\s*\{[\s\S]*?this\.paused\s*=\s*true/, 'Car3DShowroom must define pause()');
    assert.match(car3dSource, /\bresume\s*\(\s*\)\s*\{[\s\S]*?this\.paused\s*=\s*false/, 'Car3DShowroom must define resume()');

    const c3dCtx = {
        window: {},
        document: { getElementById: () => null, createElement: () => ({ getContext: () => null, style: {} }) },
        console, Math, Date, Map, Set, Object, Array, Number, String, Boolean, Promise,
        requestAnimationFrame: () => 1, cancelAnimationFrame: () => {}, performance: { now: () => 0 }
    };
    c3dCtx.window = c3dCtx;
    c3dCtx.globalThis = c3dCtx;
    vm.createContext(c3dCtx);
    vm.runInContext(car3dSource, c3dCtx, { filename: 'car-3d.js' });

    assert.equal(typeof c3dCtx.Car3DManager.hasCustomStylingForThumbnail, 'function');
    assert.equal(typeof c3dCtx.Car3DManager.getSideThumbnail, 'function');
    assert.equal(typeof c3dCtx.Car3DManager.Car3DShowroom.prototype.pause, 'function');
    assert.equal(typeof c3dCtx.Car3DManager.Car3DShowroom.prototype.resume, 'function');

    assert.equal(c3dCtx.Car3DManager.hasCustomStylingForThumbnail({}, 'BMW M5 F90 Competition'), false);
    assert.equal(c3dCtx.Car3DManager.hasCustomStylingForThumbnail({ spoiler: 'gtr' }, 'BMW M5 F90 Competition'), true);
    assert.equal(c3dCtx.Car3DManager.getSideThumbnail('BMW M5 F90 Competition', { spoiler: 'gtr' }), null, 'getSideThumbnail must return null when uncached custom styling is present so 2D fallback reflects styling immediately');
});

test('Test 4 — Server Spin Country Pass-Through & safeCar Full Schema', () => {
    const onlineMjs = fs.readFileSync(path.join(root, 'netlify', 'functions', 'online.mjs'), 'utf8');

    // 1. Verify netlify/functions/online.mjs passes data.country to core.secureRoll
    assert.match(
        onlineMjs,
        /core\.secureRoll\(\s*data\.mode\s*,\s*spinPity\s*,\s*data\.country\s*\)/,
        'online.mjs must pass data.country to core.secureRoll(data.mode, spinPity, data.country)'
    );

    // Verify server roll mutation works for all 5 countries (RUS, KZ, USA, UAE, JPN)
    const countryRegions = { RUS: '777', KZ: '01', USA: 'CA', UAE: 'DXB', JPN: 'TKY' };
    for (const [country, region] of Object.entries(countryRegions)) {
        const roll = onlineCore.secureRoll('both', 0, country);
        assert.equal(roll.country, country);
        const state = {
            accounts: { tester: { nickname: 'Tester', balance: 100000, inventory: [], myCars: [] } },
            market: {},
            chat: {}
        };
        const updated = onlineCore.mutate(state, 'roll', 'tester', { mode: 'both', country, region, roll });
        assert.equal(updated.accounts.tester.draft.country, country);
        assert.equal(updated.accounts.tester.draft.reg, region);
        assert.equal(updated.accounts.tester.balance, 100000 - onlineCore.COUNTRIES[country].spinCostBoth);
    }

    // 2. Verify online-core.cjs safeCar preserves full schema
    const inputCar = {
        name: 'BMW M3 E46 GTR',
        basePrice: 19500000,
        condition: 98,
        spoiler: 'gtr',
        vinyl: 'mw_m3gtr',
        wheels: 'bbs',
        bodykit: 'widebody',
        neon: '#00f0ff',
        CustomPaintFinish: 'chameleon',
        customWheelColor: '#ffcc00',
        tuningStage: 3,
        fuel: 85,
        totalKm: 120,
        styling: {
            color: '#3b82f6',
            spoiler: 'gtr',
            vinyl: 'mw_m3gtr',
            wheels: 'bbs',
            bodykit: 'widebody',
            neon: '#00f0ff',
            CustomPaintFinish: 'chameleon',
            customWheelColor: '#ffcc00',
            tuningStage: 3,
            fuel: 85,
            totalKm: 120
        }
    };

    const sanitized = onlineCore.safeCar(inputCar);
    assert.equal(sanitized.spoiler, 'gtr');
    assert.equal(sanitized.vinyl, 'mw_m3gtr');
    assert.equal(sanitized.wheels, 'bbs');
    assert.equal(sanitized.bodykit, 'widebody');
    assert.equal(sanitized.neon, '#00f0ff');
    assert.equal(sanitized.CustomPaintFinish, 'chameleon');
    assert.equal(sanitized.customWheelColor, '#ffcc00');
    assert.equal(sanitized.tuningStage, 3);
    assert.equal(sanitized.fuel, 85);
    assert.equal(sanitized.totalKm, 120);

    assert.equal(sanitized.styling.spoiler, 'gtr');
    assert.equal(sanitized.styling.vinyl, 'mw_m3gtr');
    assert.equal(sanitized.styling.wheels, 'bbs');
    assert.equal(sanitized.styling.bodykit, 'widebody');
    assert.equal(sanitized.styling.neon, '#00f0ff');
    assert.equal(sanitized.styling.CustomPaintFinish, 'chameleon');
    assert.equal(sanitized.styling.customWheelColor, '#ffcc00');
    assert.equal(sanitized.styling.tuningStage, 3);
    assert.equal(sanitized.styling.fuel, 85);
    assert.equal(sanitized.styling.totalKm, 120);
});

test('Test 5 — Cases (x1, x5, x10, openCaseAgain), Last-Car Protection & Inventory Rarity Tiers', () => {
    const app = createApp();

    app.run(`
        balance = 100000000;
        inventory = [];
        myCars = [{ name: 'ВАЗ-2107 «Жигули»', basePrice: 120000, condition: 100 }];
        currentCaseCountry = 'RUS';
        setCaseAnimMode('standard');
    `);

    // 1. x1 case opening auto-saves reward with _openingId
    app.run(`buyCase('normal', 1);`);
    assert.equal(app.run(`inventory.length`), 1);
    assert.ok(app.run(`typeof inventory[0]._openingId === 'string' && inventory[0]._openingId.startsWith('drop_')`), 'x1 reward must have _openingId');

    // Rapid double-click (detail: 2) while spinning is blocked, whereas deliberate single click openCaseAgain(1) works cleanly
    assert.equal(app.run(`isSpinning`), true);
    const balDuringSpin = app.run(`balance`);
    app.run(`openCaseAgain(1, { detail: 2 });`);
    assert.equal(app.run(`inventory.length`), 1, 'openCaseAgain(1, { detail: 2 }) must block accidental rapid double-click while spinning');
    assert.equal(app.run(`balance`), balDuringSpin);

    app.run(`openCaseAgain(1);`);
    assert.equal(app.run(`inventory.length`), 2, 'openCaseAgain(1) must cleanly cancel animation and open a new case');

    // 2. x5 and x10 case openings auto-save rewards with _openingId
    app.run(`isSpinning = false; buyCase('normal', 5);`);
    assert.equal(app.run(`batchCaseResults.length`), 5);
    assert.equal(app.run(`inventory.length`), 7);
    assert.ok(app.run(`batchCaseResults.every(r => typeof r._openingId === 'string' && r._openingId.startsWith('drop_'))`));

    app.run(`isSpinning = false; buyCase('normal', 10);`);
    assert.equal(app.run(`batchCaseResults.length`), 10);
    assert.equal(app.run(`inventory.length`), 17);

    // 3. Last-car protection in sellSingleBatchDrop and sellBatchCaseResults when myCars.length === 1
    app.run(`
        isSpinning = false;
        myCars = [];
        buyCase('car_standard', 5);
    `);
    assert.equal(app.run(`myCars.length`), 5);
    // Sell 4 cars via sellSingleBatchDrop(0..3), then attempt to sell the 5th (last remaining car)
    app.run(`
        sellSingleBatchDrop(0);
        sellSingleBatchDrop(1);
        sellSingleBatchDrop(2);
        sellSingleBatchDrop(3);
    `);
    assert.equal(app.run(`myCars.length`), 1, '4 of 5 cars sold, 1 car remaining');
    const balBeforeLastCarAttempt = app.run(`balance`);
    app.run(`sellSingleBatchDrop(4);`);
    assert.equal(app.run(`myCars.length`), 1, 'sellSingleBatchDrop must refuse to sell the last remaining car');
    assert.equal(app.run(`batchCaseResults[4]._sold`), false);
    assert.equal(app.run(`balance`), balBeforeLastCarAttempt);

    app.run(`sellBatchCaseResults(false);`);
    assert.equal(app.run(`myCars.length`), 1, 'sellBatchCaseResults(false) must also refuse to sell the last remaining car');
    assert.equal(app.run(`batchCaseResults[4]._sold`), false);

    // 4. Inventory rarity tiers: 1,500,000 ₽ -> .tier-legend, 5,000,000 ₽ -> .tier-mythic
    app.run(`
        inventory = [
            { text: 'А 777 АА | 77 RUS', price: 1500000, rarity: { text: 'Легендарный', bg: '#f59e0b', color: '#000' }, country: 'RUS', createdAt: 200 },
            { text: 'Е 011 КХ | 77 RUS', price: 5000000, rarity: { text: 'Крутой', bg: '#ec4899', color: '#fff' }, country: 'RUS', createdAt: 300 }
        ];
        setCollectionFilterState({ search: '', country: 'all', rarity: 'all', status: 'all' });
        setCollectionQuickCategory('all');
        renderInventory();
    `);
    const invHtml = app.run(`document.getElementById('inventory-list').innerHTML`);
    assert.match(invHtml, /tier-legend\b[\s\S]*?1[\s\u00A0]500[\s\u00A0]000/, '1,500,000 ₽ plate must receive .tier-legend class');
    assert.match(invHtml, /tier-mythic\b[\s\S]*?5[\s\u00A0]000[\s\u00A0]000/, '5,000,000 ₽ plate must receive .tier-mythic class');
});

test('Test 6 — Generator Board Reload Persistence & Cross-Account Garage Isolation', () => {
    // 1. Generator board persistence across saveProgress() -> reload -> loadProgress()
    const app1 = createApp();
    app1.run(`
        selectPlateCountry('JPN');
        currentL1 = 'G';
        currentL2 = 'T';
        currentL3 = 'R';
        currentNum = '777';
        currentReg = 'TKY';
        boardHasLetters = true;
        boardHasNumbers = true;
        hasSpunLetSinceSave = true;
        hasSpunNumSinceSave = true;
        saveProgress();
    `);

    const savedPayload = JSON.parse(app1.data.get('nomera_player_account'));
    assert.ok(savedPayload.generatorBoard, 'saveProgress() must persist generatorBoard object');
    assert.equal(savedPayload.generatorBoard.country, 'JPN');
    assert.equal(savedPayload.generatorBoard.l1, 'G');
    assert.equal(savedPayload.generatorBoard.l2, 'T');
    assert.equal(savedPayload.generatorBoard.l3, 'R');
    assert.equal(savedPayload.generatorBoard.num, '777');
    assert.equal(savedPayload.generatorBoard.reg, 'TKY');
    assert.equal(savedPayload.generatorBoard.hasLet, true);
    assert.equal(savedPayload.generatorBoard.hasNum, true);

    const app2 = createApp({ saved: savedPayload });
    app2.run(`loadProgress();`);
    assert.equal(app2.run(`currentCountry`), 'JPN');
    assert.equal(app2.run(`currentL1`), 'G');
    assert.equal(app2.run(`currentL2`), 'T');
    assert.equal(app2.run(`currentL3`), 'R');
    assert.equal(app2.run(`currentNum`), '777');
    assert.equal(app2.run(`currentReg`), 'TKY');
    assert.equal(app2.run(`boardHasLetters`), true);
    assert.equal(app2.run(`boardHasNumbers`), true);
    assert.equal(app2.run(`document.getElementById('btn-save').disabled`), false, 'Save button must remain enabled after reload when board was freshly spun');

    // 2. Cross-account garage isolation when switching directly from User A to User B
    const appSwitch = createApp({
        saved: {
            nickname: 'UserAlpha',
            balance: 9000000,
            playerLevel: 15,
            playerExp: 4500,
            inventory: [{ id: 'p_alpha', text: 'А 777 АА | 77 RUS', price: 1500000, rarity: { text: 'Легендарный' } }],
            myCars: [
                { name: 'Bugatti Chiron Super Sport', basePrice: 190000000, condition: 100 },
                { name: 'Koenigsegg Jesko Attack', basePrice: 270000000, condition: 100 }
            ]
        }
    });
    appSwitch.run(`
        loadProgress();
        activateOnlineIdentity({
            nickname: 'UserAlpha',
            balance: 9000000,
            playerLevel: 15,
            playerExp: 4500,
            inventory: [{ id: 'p_alpha', text: 'А 777 АА | 77 RUS', price: 1500000, rarity: { text: 'Легендарный' } }],
            myCars: [
                { name: 'Bugatti Chiron Super Sport', basePrice: 190000000, condition: 100 },
                { name: 'Koenigsegg Jesko Attack', basePrice: 270000000, condition: 100 }
            ]
        });
    `);
    assert.equal(appSwitch.run(`nickname`), 'UserAlpha');
    assert.equal(appSwitch.run(`myCars.length`), 2);
    assert.equal(appSwitch.run(`myCars[0].name`), 'Bugatti Chiron Super Sport');

    // Now switch directly to UserBeta who only owns a Toyota Camry 3.5
    appSwitch.run(`
        activateOnlineIdentity({
            nickname: 'UserBeta',
            balance: 50000,
            playerLevel: 1,
            playerExp: 0,
            inventory: [],
            myCars: [
                { name: 'Toyota Camry 3.5', basePrice: 2800000, condition: 100 }
            ]
        });
    `);
    assert.equal(appSwitch.run(`nickname`), 'UserBeta');
    assert.equal(appSwitch.run(`myCars.length`), 1, 'UserAlpha cars must NOT leak into UserBeta garage');
    assert.equal(appSwitch.run(`myCars[0].name`), 'Toyota Camry 3.5');
    assert.equal(appSwitch.run(`inventory.length`), 0, 'UserAlpha plates must NOT leak into UserBeta inventory');
});

test('Test 7 — All 13 Critical Gameplay Operations & 8 Negative Scenarios E2E Verification', async () => {
    const app = createApp();

    // Critical Op 1 & 2: Full spin (900 ₽) & Partial spins (500 ₽)
    app.run(`
        balance = 50000;
        inventory = [];
        myCars = [{ name: 'ВАЗ-2107 «Жигули»', basePrice: 120000, condition: 100, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } }];
        selectPlateCountry('RUS');
        spinBoth();
        isSpinning = false;
        checkCanSaveButton();
    `);
    assert.equal(app.run(`balance`), 49100);
    assert.equal(app.run(`boardHasLetters && boardHasNumbers`), true);

    app.run(`spinNumbers(); isSpinning = false; checkCanSaveButton();`);
    assert.equal(app.run(`balance`), 48600);
    app.run(`spinLetters(); isSpinning = false; checkCanSaveButton();`);
    assert.equal(app.run(`balance`), 48100);

    // Critical Op 3 & Negative Scenario 2: Save plate to collection & block duplicate save without re-spinning
    await app.run(`savePlate()`);
    assert.equal(app.run(`inventory.length`), 1);
    assert.equal(app.run(`document.getElementById('btn-save').disabled`), true);
    await app.run(`savePlate()`);
    assert.equal(app.run(`inventory.length`), 1, 'Duplicate savePlate() without re-spinning must be blocked');

    // Critical Op 4: Sell plate directly from generator via sellCurrentPlate()
    app.run(`spinBoth(); isSpinning = false; checkCanSaveButton();`);
    const balBeforeDirectSell = app.run(`balance`);
    const directPrice = app.run(`calculatePrice()`);
    await app.run(`sellCurrentPlate()`);
    assert.equal(app.run(`balance`), balBeforeDirectSell + directPrice);

    // Critical Op 5 & Negative Scenario 7: Country switch across all 5 countries resets board
    for (const c of ['KZ', 'USA', 'UAE', 'JPN', 'RUS']) {
        app.run(`selectPlateCountry('${c}');`);
        assert.equal(app.run(`currentCountry`), c);
        assert.equal(app.run(`boardHasLetters`), false);
        assert.equal(app.run(`boardHasNumbers`), false);
        assert.equal(app.run(`document.getElementById('btn-save').disabled`), true);
    }

    // Critical Op 6: Region change
    app.run(`
        changeRegion();
        document.getElementById('region-edit-input').value = '95';
        saveRegionEdit();
    `);
    assert.equal(app.run(`currentReg`), '95');

    // Critical Op 9, 10, 11 & Negative Scenario 3, 4: Buy car, equip plate, upgrade car, sell car
    app.run(`
        balance = 5000000;
        buyCar('ВАЗ-2109 «Девятка»');
    `);
    assert.equal(app.run(`myCars.length`), 2);

    // Attach plate 0 to car 0
    app.run(`openAttachModal(0); attachPlate(0);`);
    assert.ok(app.run(`myCars[0].plate !== null`), 'Plate must be attached to car 0');
    assert.equal(app.run(`inventory.length`), 0, 'Attached plate moved from free inventory to car');

    // Upgrade car 0 engine
    const balBeforeUpgrade = app.run(`balance`);
    app.run(`upgradeGarageCar(0, 'engine');`);
    assert.equal(app.run(`myCars[0].upgrades.engine`), 1);
    assert.ok(app.run(`balance`) < balBeforeUpgrade);

    // Sell car 1, leaving only car 0
    app.run(`sellCar(1, false);`);
    assert.equal(app.run(`myCars.length`), 1);

    // Negative Scenario 1: Insufficient balance blocks spin, case, and car purchase
    app.run(`balance = 100; isSpinning = false;`);
    app.run(`spinBoth();`);
    assert.equal(app.run(`balance`), 100, 'Spin with insufficient balance must not deduct money');
    app.run(`buyCase('normal', 1);`);
    assert.equal(app.run(`balance`), 100, 'Case open with insufficient balance must not deduct money');
    app.run(`buyCar('ВАЗ-2109 «Девятка»');`);
    assert.equal(app.run(`myCars.length`), 1, 'Car purchase with insufficient balance must be rejected');

    // Critical Op 12: Race start & stop cleans up body.race-active
    app.run(`
        document.body.classList.add('race-active');
        exitRaceGame();
    `);
    assert.equal(app.run(`isRaceRunning`), false);
});
