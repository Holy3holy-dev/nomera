'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../netlify/functions/lib/online-core.cjs');
const { createApp } = require('./helpers/create-app.cjs');

function setupThree() {
    global.window = global;
    global.self = global;
    global.document = {
        createElement: () => ({
            getContext: () => ({
                fillRect: () => {},
                clearRect: () => {},
                fillText: () => {},
                drawImage: () => {},
                measureText: () => ({ width: 100 }),
                createRadialGradient: () => ({ addColorStop: () => {} })
            }),
            width: 512,
            height: 512,
            style: {}
        }),
        createElementNS: () => ({ style: {} }),
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    try {
        Object.defineProperty(global, 'navigator', { value: { userAgent: 'NodeTest' }, configurable: true, writable: true });
    } catch (_) {}
    const THREE = require('../js/vendor/three.min.js');
    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');
    return { THREE, Car3DManager };
}

test('plate valuation: 011 is 12M ONLY with ЕКХ; generic 011 or other elites are not inflated', () => {
    const app = createApp();

    // 1. Only ЕКХ 011 777 is the 12,000,000 ₽ jackpot
    const jackpotLocal = app.run('getCalculatedPrice("Е", "К", "Х", "011", "777")');
    const jackpotServer = core.priceOfPlate('Е', 'К', 'Х', '011', '777');
    assert.equal(jackpotLocal, 12000000);
    assert.equal(jackpotServer, 12000000);

    // 2. с011сс 12 (as seen in player complaint screenshot) is NOT 12M
    const c011ccLocal = app.run('getCalculatedPrice("С", "С", "С", "011", "12")');
    const c011ccServer = core.priceOfPlate('С', 'С', 'С', '011', '12');
    assert.notEqual(c011ccLocal, 12000000);
    assert.notEqual(c011ccServer, 12000000);
    assert.equal(c011ccLocal, c011ccServer);
    assert(c011ccLocal < 2000000, 'c011cc should not exceed normal elite pricing');

    // 3. к011кк 12 is NOT 12M
    const k011kkLocal = app.run('getCalculatedPrice("К", "К", "К", "011", "12")');
    const k011kkServer = core.priceOfPlate('К', 'К', 'К', '011', '12');
    assert.notEqual(k011kkLocal, 12000000);
    assert.notEqual(k011kkServer, 12000000);

    // 4. Ordinary letters with 011 (e.g. А 011 ТО 77) must NOT get an automatic 1.5M addition
    const plain011Local = app.run('getCalculatedPrice("А", "Т", "О", "011", "77")');
    const plain011Server = core.priceOfPlate('А', 'Т', 'О', '011', '77');
    assert.equal(plain011Local, 700);
    assert.equal(plain011Server, 700);
});

test('auth persistence: new session login hydrates server balance and cars without wiping to starter Zhiguli', () => {
    // Sanya has 62,000,000 ₽ and a tuned BMW on the server
    const app = createApp(); // clean device with no prior local account
    const sanyaProfile = {
        nickname: 'Sanya_62M',
        balance: 62000000,
        playerLevel: 15,
        playerExp: 240,
        inventory: [{ text: 'А 777 АА | 77 RUS', price: 5000000 }],
        myCars: [{
            name: 'BMW M5 F90',
            basePrice: 5000000,
            condition: 100,
            plate: { text: 'А 777 АА | 77 RUS', price: 5000000 },
            upgrades: { engine: 5, handling: 5, economy: 3, nitro: 4 }
        }]
    };

    app.context.fetch = async (url) => {
        if (url.includes('action=public')) return { ok: true, json: async () => ({ ok: true, chat: [], market: {} }) };
        return { ok: true, json: async () => ({ ok: true, profile: sanyaProfile }) };
    };

    app.run(`activateOnlineIdentity(${JSON.stringify(sanyaProfile)}, false);`);

    // Sanya's balance is 62,000,000 ₽, NOT reset to 50,000!
    assert.equal(app.run('balance'), 62000000);
    assert.equal(app.run('onlineProfile.balance'), 62000000);
    assert.equal(app.run('playerLevel'), 15);
    assert.equal(app.run('myCars[0].name'), 'BMW M5 F90');
    assert.equal(app.run('myCars[0].upgrades.engine'), 5);
});

test('deductPlayerBalance decrements onlineProfile.balance without clobbering with low local cash', () => {
    const app = createApp({
        saved: { nickname: 'RichPlayer', balance: 50000 }
    });
    app.run('loadProgress();');
    app.run('setOnlineProfile({ nickname: "RichPlayer", balance: 62000000, inventory: [], myCars: [] }, false);');

    // Deduct 3000 for tuning / repair
    const success = app.run('deductPlayerBalance(3000, "Minor tune");');
    assert.equal(success, true);
    assert.equal(app.run('balance'), 47000);
    // Crucial fix: onlineProfile was decremented from 62M by 3k, NOT overwritten with 47k!
    assert.equal(app.run('onlineProfile.balance'), 61997000);
});

test('plate transfer unbinds plate from prior vehicle and syncs cloud garage', () => {
    const app = createApp({
        saved: {
            nickname: 'PlateSwapper',
            balance: 500000,
            myCars: [
                { name: 'ВАЗ-2107 «Жигули»', condition: 100, plate: { id: 'p1', text: 'А 111 АА | 77 RUS', price: 50000 } },
                { name: 'BMW M5 F90', condition: 100, plate: null }
            ],
            inventory: [{ id: 'p2', text: 'В 222 ВВ | 77 RUS', price: 60000 }]
        }
    });
    app.run('loadProgress();');

    let syncCalled = false;
    app.context.syncCloudGarage = () => { syncCalled = true; };

    // Select BMW (index 1) and attach plate p2
    app.run('currentCarIndexForAttach = 1; attachPlate(0);');

    assert.equal(app.run('myCars[1].plate.text'), 'В 222 ВВ | 77 RUS');
    assert.equal(app.run('inventory.length'), 0);

    // Now attach p1 to BMW (moving it from Zhiguli)
    app.run('inventory = [{ id: "p1", text: "А 111 АА | 77 RUS", price: 50000 }]; currentCarIndexForAttach = 1; attachPlate(0);');
    assert.equal(app.run('myCars[1].plate.text'), 'А 111 АА | 77 RUS');
    // Zhiguli must be unbound
    assert.equal(app.run('myCars[0].plate'), null);
});

test('3D procedural VAZ-2109 wheelTrack clears body width', () => {
    const { THREE, Car3DManager } = setupThree();
    const car = Car3DManager.buildDetailedCarModel(THREE, 'ВАЗ-2109 «Девятка»', {});
    assert(car, 'Car model must be created');

    const spec = car.userData?.spec || {};
    // Width is 1.65, wheelTrack must be >= 0.85 (0.52 * W = 0.858)
    assert(spec.wheelTrack >= 0.85, `Wheel track ${spec.wheelTrack} should clear body width`);
});

test('secureRoll base rates: forced combinations are rare under 0 pity', () => {
    let ladders = 0;
    let triples = 0;
    const TOTAL = 500;
    for (let i = 0; i < TOTAL; i++) {
        const roll = core.secureRoll('both', 0);
        if (['123','234','345','456','567','678','789','987','876','765','654','543','432','321'].includes(roll.num)) {
            ladders++;
        }
        if (roll.letters[0] === roll.letters[1] && roll.letters[1] === roll.letters[2]) {
            triples++;
        }
    }
    // Previously ladder cutoff was 26% alone! With new balanced cutoffs, ladders should be ~7% or less
    const ladderRate = ladders / TOTAL;
    const tripleRate = triples / TOTAL;
    assert(ladderRate < 0.15, `Ladder rate ${ladderRate} should be under 15%`);
    assert(tripleRate < 0.12, `Triple rate ${tripleRate} should be under 12%`);
});

test('garage car persistence: salon purchase is preserved and not wiped by server profile sync', () => {
    const app = createApp({
        saved: {
            nickname: 'CarCollector',
            balance: 10000000,
            myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100, plate: null, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } }]
        }
    });
    app.run('loadProgress();');
    app.run('setOnlineProfile({ nickname: "CarCollector", balance: 10000000, inventory: [], myCars: [{ name: "ВАЗ-2107 «Жигули»", condition: 100, plate: null }] }, false);');

    let syncCalled = false;
    app.context.syncCloudGarage = () => { syncCalled = true; return Promise.resolve(); };

    // Buy a BMW in the salon
    app.run('buyCar("BMW M5 E60 V10");');

    assert.equal(app.run('myCars.length'), 2);
    assert.equal(app.run('myCars[0].name'), 'BMW M5 E60 V10');
    assert.equal(app.run('myCars[0].condition'), 100);
    assert.equal(app.run('myCars[0].upgrades.engine'), 0);
    assert.equal(app.run('myCars[0].upgrades.nitro'), 0);
    assert.equal(app.run('onlineProfile.myCars.length'), 2);
    assert.equal(syncCalled, true);

    // Simulate server returning stale snapshot that doesn't have the newly bought car yet
    const staleServerProfile = {
        nickname: 'CarCollector',
        balance: 5000000,
        inventory: [],
        myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100, plate: null }]
    };
    app.run(`setOnlineProfile(${JSON.stringify(staleServerProfile)}, true);`);

    // The BMW M5 E60 V10 MUST NOT BE WIPED!
    assert.equal(app.run('myCars.length'), 2);
    const carNames = app.run('myCars.map(c => c.name)');
    assert(carNames.includes('BMW M5 E60 V10'), 'Purchased BMW must be retained in garage');
    assert(carNames.includes('ВАЗ-2107 «Жигули»'), 'Starter Zhiguli must be retained in garage');

    // Local storage must also reflect both cars
    const saved = JSON.parse(app.data.get('nomera_player_account'));
    assert.equal(saved.myCars.length, 2);
    assert.equal(saved.myCars.some(c => c.name === 'BMW M5 E60 V10'), true);
});

test('garage car persistence: roulette won car is preserved across server syncs', () => {
    const app = createApp({
        saved: {
            nickname: 'LuckySpinner',
            balance: 500000,
            myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100, plate: null }]
        }
    });
    app.run('loadProgress();');
    app.run('setOnlineProfile({ nickname: "LuckySpinner", balance: 500000, inventory: [], myCars: [{ name: "ВАЗ-2107 «Жигули»", condition: 100, plate: null }] }, false);');

    let syncCalled = false;
    app.context.syncCloudGarage = () => { syncCalled = true; return Promise.resolve(); };

    // Simulate winning a Porsche in roulette
    app.run('wonCarObj = { name: "Porsche 911 GT3 RS", price: 15000000, category: "Спорткар", img: "", rarity: { text: "Легендарный" } };');
    app.run('rouletteSaveCar();');

    assert.equal(app.run('myCars.length'), 2);
    assert.equal(app.run('myCars[0].name'), 'Porsche 911 GT3 RS');
    assert.equal(app.run('myCars[0].condition'), 100);
    assert.equal(app.run('myCars[0].upgrades.engine'), 0);
    assert.equal(app.run('myCars[0].upgrades.nitro'), 0);
    assert.equal(app.run('onlineProfile.myCars.length'), 2);
    assert.equal(syncCalled, true);

    // Stale server sync must not wipe the won Porsche
    app.run('setOnlineProfile({ nickname: "LuckySpinner", balance: 500000, inventory: [], myCars: [{ name: "ВАЗ-2107 «Жигули»", condition: 100, plate: null }] }, true);');
    assert.equal(app.run('myCars.length'), 2);
    const carNames = app.run('myCars.map(c => c.name)');
    assert(carNames.includes('Porsche 911 GT3 RS'), 'Won Porsche must be retained in garage');
});

test('confirmSellCar syncs cloud garage before sending sell request to prevent index mismatch', async () => {
    const app = createApp({
        saved: {
            nickname: 'CarTrader',
            balance: 5000000,
            myCars: [
                { name: 'ВАЗ-2107 «Жигули»', condition: 100, plate: null },
                { name: 'BMW M5 F90', condition: 100, plate: null }
            ]
        }
    });
    app.run('loadProgress();');
    app.run('setOnlineProfile({ nickname: "CarTrader", balance: 5000000, inventory: [], myCars: [{ name: "ВАЗ-2107 «Жигули»" }, { name: "BMW M5 F90" }] }, false);');

    const callOrder = [];
    app.context.onlineRequest = async (action, params) => {
        callOrder.push(action);
        if (action === 'syncGarage') return { ok: true };
        if (action === 'sell') return { ok: true, profile: { nickname: 'CarTrader', balance: 5000000, inventory: [], myCars: [{ name: 'ВАЗ-2107 «Жигули»' }] } };
        return { ok: true };
    };

    app.context.document.getElementById('sell-car-select').value = '1';
    app.context.document.getElementById('sell-car-price').value = '2000000';

    await app.run('confirmSellCar();');

    assert.equal(callOrder[0], 'syncGarage', 'syncGarage must be awaited BEFORE sell action');
    assert.equal(callOrder[1], 'sell');
});
