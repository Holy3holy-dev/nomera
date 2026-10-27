'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('Bug 1 & 3: openPlateDetailModal, attachPlateFromDetailModal, and listPlateFromDetailModal work with real car index and plate.id', () => {
    const app = createApp();
    const { context } = app;
    const document = context.document;

    app.run(`
        myCars = [
            { name: 'ВАЗ-2107 «Жигули»', basePrice: 120000, condition: 100, plate: null, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } },
            { name: 'BMW M5 F90 Competition', basePrice: 11500000, condition: 100, plate: null, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } }
        ];
        activeGarageCarIndex = 1;
        inventory = [
            { id: 'plate_test_777', text: 'А 777 АА | 77 RUS', price: 500000, rarity: { text: 'Легендарный', bg: '#f59e0b', color: '#000' }, country: 'RUS' },
            { id: 'plate_test_001', text: 'О 001 ОО | 77 RUS', price: 950000, rarity: { text: 'Легендарный', bg: '#f59e0b', color: '#000' }, country: 'RUS' }
        ];
    `);

    // 1. openPlateDetailModal should offer attaching to myCars[activeGarageCarIndex] (index 1, BMW M5 F90 Competition)
    context.window.openPlateDetailModal(0);
    const detailBody = document.getElementById('plate-detail-body');
    assert.ok(detailBody.innerHTML.includes('BMW M5 F90 Competition'), 'Plate detail modal should reference activeGarageCarIndex car');

    // 2. listPlateFromDetailModal(1) should set #sell-plate-select to plate.id ('plate_test_001'), not array index '1'
    context.window.listPlateFromDetailModal(1);
    const sellSelect = document.getElementById('sell-plate-select');
    assert.equal(sellSelect.value, 'plate_test_001', 'listPlateFromDetailModal must select plate.id in #sell-plate-select');

    // 3. attachPlateFromDetailModal(0, 1) must actually equip inventory[0] onto myCars[1] and remove it from inventory
    context.window.attachPlateFromDetailModal(0, 1);
    const equippedText = app.run('myCars[1].plate && myCars[1].plate.text');
    const remainingCount = app.run('inventory.length');
    assert.equal(equippedText, 'А 777 АА | 77 RUS', 'Plate must be attached to myCars[1]');
    assert.equal(remainingCount, 1, 'Attached plate must be removed from inventory');
});

test('Bug 2 & 4: Trade-Up Contracts protect favorite plates and VIP Order delivery syncs onlineProfile.inventory', () => {
    const app = createApp();
    const { context } = app;

    app.run(`
        inventory = [
            { id: 'fav_1', text: 'А 111 АА | 77 RUS', price: 2000, favorite: true, rarity: { text: 'Обычный', bg: 'transparent', color: '#fff' } },
            { id: 'fav_2', text: 'В 222 ВВ | 77 RUS', price: 2000, favorite: true, rarity: { text: 'Обычный', bg: 'transparent', color: '#fff' } },
            { id: 'free_1', text: 'С 123 СС | 77 RUS', price: 1500, favorite: false, rarity: { text: 'Обычный', bg: 'transparent', color: '#fff' } }
        ];
    `);

    const favElig = app.run('getTradeUpEligibility(inventory[0], 0)');
    assert.equal(favElig.eligible, false, 'Favorite plates must NOT be eligible for Trade-Up contracts');

    const freeElig = app.run('getTradeUpEligibility(inventory[2], 2)');
    assert.equal(freeElig.eligible, true, 'Non-favorite inventory plate must be eligible');

    // Verify VIP Order delivery updates onlineProfile.inventory so delivered plate cannot resurrect
    app.run(`
        onlineProfile = { nickname: 'Tester', balance: 50000, inventory: [...inventory], myCars: [...myCars] };
        vipActiveOrders = [{
            id: 'ord_test_1',
            slotId: 'ord_test_1',
            templateId: 'order_mirror',
            client: 'Тестовый Клиент',
            title: 'Любой номер',
            desc: 'Тест',
            multiplier: 1.5,
            bonusCash: 10000,
            xpReward: 50
        }];
    `);
    // Deliver free_1 or matching plate
    app.run(`
        inventory = [{ id: 'mirror_1', text: 'А 121 АА | 77 RUS', price: 15000, rarity: { text: 'Редкий', bg: '#3b82f6', color: '#fff' } }];
        onlineProfile.inventory = [...inventory];
    `);
    context.window.deliverVipOrder('ord_test_1');
    assert.equal(app.run('inventory.length'), 0, 'Local inventory emptied after VIP order delivery');
    assert.equal(app.run('onlineProfile.inventory.length'), 0, 'onlineProfile.inventory must also be synced after VIP order delivery');
});

test('Bug 5, 7, 8, 9: rouletteSellCar last-car guard, confirmApplyStyling stanceMode preservation, openCollectorBookFromNav, inspectExternalCar3D synergy title, and market dealership promo', () => {
    const app = createApp();
    const { context } = app;
    const document = context.document;

    // 1. rouletteSellCar must not allow selling the last car in myCars
    app.run(`
        myCars = [{ _openingId: 'only_car', name: 'ВАЗ-2107 «Жигули»', basePrice: 120000, condition: 100, plate: null, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } }];
        wonCarObj = { _openingId: 'only_car', isCar: true, name: 'ВАЗ-2107 «Жигули»', price: 120000, _sold: false };
        rouletteSellCar();
    `);
    assert.equal(app.run('myCars.length'), 1, 'rouletteSellCar must block selling the last remaining car');

    // 2. openCollectorBookFromNav must exist on window and open #col-subtab-album
    assert.equal(typeof context.window.openCollectorBookFromNav, 'function', 'openCollectorBookFromNav must be defined on window');
    context.window.openCollectorBookFromNav();
    assert.ok(!document.getElementById('col-subtab-album').classList.contains('hidden'), 'openCollectorBookFromNav must unhide col-subtab-album');

    // 3. switchMarketMainSection('cars') must unhide #market-dealership-promo
    context.window.switchMarketMainSection('cars');
    const promo = document.getElementById('market-dealership-promo');
    assert.ok(promo && !promo.classList.contains('hidden'), '#market-dealership-promo must be visible on cars market section');

    // 4. inspectExternalCar3D must render syn.title (not empty «»)
    context.window.inspectExternalCar3D({
        name: 'BMW M5 F90 Competition',
        basePrice: 11500000,
        condition: 100,
        plate: { text: 'М 005 ММ | 77 RUS', price: 500000 },
        styling: {}
    });
    const plateBoxHtml = document.getElementById('market-3d-plate-box').innerHTML;
    assert.ok(!plateBoxHtml.includes('«»'), `Expected non-empty synergy title in #market-3d-plate-box, got: ${plateBoxHtml}`);

    // 5. confirmApplyStyling must preserve car.styling.stanceMode
    app.run(`
        balance = 5000000;
        if (onlineProfile) onlineProfile.balance = 5000000;
        myCars[0].styling = { color: '#ef4444', stanceMode: 'airride', suspension: 'airride' };
        openStylingModal(0);
        confirmApplyStyling();
    `);
    assert.equal(app.run('myCars[0].styling.stanceMode'), 'airride', 'confirmApplyStyling must preserve car.styling.stanceMode');
});

test('3D Bug Fixes: RaceEffectsManager pitch-compensated headlight ground patches & Car3DShowroom single-applied stance offset', () => {
    const domMock = {
        getContext: () => ({
            fillRect() {}, clearRect() {}, fillText() {}, drawImage() {},
            measureText: () => ({ width: 80 }),
            beginPath() {}, ellipse() {}, fill() {},
            createRadialGradient: () => ({ addColorStop() {} }),
            createLinearGradient: () => ({ addColorStop() {} })
        }),
        width: 512, height: 512, clientWidth: 640, clientHeight: 400,
        style: {},
        classList: { add() {}, remove() {}, contains: () => false },
        addEventListener() {}, removeEventListener() {},
        appendChild() {}, removeChild() {}, closest: () => null, innerHTML: ''
    };
    domMock.parentNode = domMock;
    global.window = global;
    global.self = global;
    global.addEventListener = () => {};
    global.removeEventListener = () => {};
    global.document = {
        createElement: () => domMock,
        createElementNS: () => ({ style: {} }),
        getElementById: () => domMock,
        querySelectorAll: () => [],
        addEventListener() {}, removeEventListener() {}
    };
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class {
        constructor() { this.domElement = domMock; this.shadowMap = { enabled: false }; }
        setPixelRatio() {} setSize() {} render() {} compile() {}
        getRenderTarget() { return null; } setRenderTarget() {}
        getClearColor() { return new THREE.Color(0); } dispose() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/race-effects.js')];
    delete require.cache[require.resolve('../js/car-3d.js')];
    const RaceEffectsManager = require('../js/race-effects.js');
    const Car3DManager = require('../js/car-3d.js');

    // 1. Verify RaceEffectsManager pitch compensation keeps headlight ground patches near y_world = 0.012
    const playerCar = new THREE.Group();
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
    patch.position.set(0, 0.012, 15.0);
    playerCar.add(patch);

    const mockEngine = {
        THREE,
        playerCar,
        state: { pitchSquat: 0.06, bodyRoll: 0 },
        headlightFlares: [],
        headlightGroundPatches: [patch],
        taillightFlares: []
    };
    const fx = new RaceEffectsManager(mockEngine);
    fx.headlightGroundPatches = [patch];
    playerCar.position.set(0, 0, 0);
    playerCar.rotation.set(0.06, 0, 0);
    fx.updateLightsVFX(0.016, false);
    playerCar.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    patch.getWorldPosition(worldPos);
    assert.ok(Math.abs(worldPos.y - 0.012) < 0.05, `Headlight ground patch world Y should stay near 0.012 under pitch, got ${worldPos.y}`);

    // 2. Verify Car3DShowroom does not double-drop ride height when styling.suspension === 'airride' and setPneumoStance('airride') is active
    const showroom = Car3DManager.createShowroom(domMock, { width: 400, height: 240, showPodium: true });
    showroom.setCar('BMW M5 F90 Competition', { suspension: 'airride', stanceMode: 'airride' });
    const y1 = showroom.carGroup.position.y;
    showroom.setPneumoStance('airride', false);
    const y2 = showroom.carGroup.position.y;
    assert.ok(Math.abs(y1 - y2) < 0.001, `Showroom car Y should be idempotent for airride stance (${y1} vs ${y2})`);
});
