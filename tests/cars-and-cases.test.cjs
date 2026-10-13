const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('all 25 cars are defined in carsData and carRaceStats with valid attributes', () => {
    const app = createApp();
    const cars = app.run('carsData');
    const stats = app.run('carRaceStats');

    assert.equal(cars.length, 25, 'carsData must have exactly 25 cars');

    const names = new Set();
    for (const car of cars) {
        assert.ok(car.name, 'Car must have a name');
        assert.ok(typeof car.price === 'number' && car.price > 0, `Car ${car.name} must have positive price`);
        assert.ok(!names.has(car.name), `Duplicate car name found: ${car.name}`);
        names.add(car.name);

        const carStat = stats[car.name];
        assert.ok(carStat, `carRaceStats missing entry for ${car.name}`);
        assert.ok(carStat.speed > 0, `Speed must be > 0 for ${car.name}`);
        assert.ok(carStat.accel > 0, `Accel must be > 0 for ${car.name}`);
        assert.ok(carStat.handling > 0, `Handling must be > 0 for ${car.name}`);
        assert.ok(carStat.boost > 0, `Boost must be > 0 for ${car.name}`);
        assert.ok(carStat.rewardMult >= 1.0, `Reward multiplier must be >= 1.0 for ${car.name}`);
        assert.ok(carStat.driftFactor >= 0.5, `driftFactor must be >= 0.5 for ${car.name}`);
    }
});

test('pixel art car sprite generator creates valid data URLs for all 25 cars', () => {
    const app = createApp();
    const cars = app.run('carsData.map(c => c.name)');

    for (const carName of cars) {
        const url = app.run(`getCarSpriteDataUrl(${JSON.stringify(carName)}, { color: "#38bdf8", tint: 60, neon: "#ef4444" })`);
        assert.ok(typeof url === 'string' && url.length > 20, `Non-empty sprite URL expected for ${carName}`);
        assert.ok(url.startsWith('data:image') || url.endsWith('.svg'), `Valid data URL expected for ${carName}`);
    }
});

test('car loot box economy prevents infinite resale exploits across all tiers', () => {
    const app = createApp();
    const configs = app.run('caseConfigs');
    const carPrices = Object.fromEntries(app.run('carsData.map(c => [c.name, c.price])'));

    const carBoxKeys = ['car_standard', 'car_luxury', 'car_hyper'];
    for (const key of carBoxKeys) {
        const box = configs[key];
        assert.ok(box, `Case ${key} must exist`);
        assert.ok(box.isCar, `Case ${key} must have isCar = true`);
        assert.ok(box.price > 0, `Case ${key} must have positive price`);

        let totalWeight = 0;
        let expectedValue = 0;
        for (const item of box.cars) {
            assert.ok(carPrices[item.name] !== undefined, `Car ${item.name} in ${key} must exist in carsData`);
            totalWeight += item.weight;
            expectedValue += (item.weight) * carPrices[item.name];
        }
        expectedValue /= totalWeight;

        // Resale in Nomera sells at 90% car value, so EV must be less than case cost
        // to prevent infinite money duplication loops.
        assert.ok(
            expectedValue < box.price,
            `Case ${key} exploit detected: EV (${expectedValue.toLocaleString()}) >= price (${box.price.toLocaleString()})`
        );

        // Sanity check: EV should be in a healthy game balance range (25% - 75% of case price)
        const returnRatio = expectedValue / box.price;
        assert.ok(returnRatio >= 0.25 && returnRatio <= 0.75, `Case ${key} return ratio ${returnRatio.toFixed(2)} out of expected 0.25-0.75 range`);
    }
});

test('opening a car loot box deducts balance and adds car to player garage', () => {
    const app = createApp({
        saved: {
            nickname: 'BoxOpener',
            balance: 50000000,
            achievements: { first_million: true },
            myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100 }]
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('myCars.length'), 1);

    // Open hypercar box
    app.run('openCasePreview("car_hyper")');
    assert.equal(app.run('activeCaseType'), 'car_hyper');

    app.run('buyCase()');
    // Balance immediately deducted
    assert.equal(app.run('balance'), 50000000 - 45000000);
    assert.ok(app.run('wonCarObj !== null'), 'wonCarObj must be set after buyCase');

    // Claim won car into garage
    app.run('rouletteSaveCar()');

    assert.equal(app.run('myCars.length'), 2);
    const newCar = app.run('myCars[0]');
    assert.ok(newCar.name, 'Awarded car must have a name');
    assert.equal(typeof newCar.basePrice, 'number');
});

test('dealership category filters correctly isolate price tiers', () => {
    const app = createApp();
    app.run('renderCars()');

    // Default 'all': 25 cars rendered
    const listAll = app.run('document.getElementById("garage-list").innerHTML');
    assert.equal((listAll.match(/class="car-shop-card"/g) || []).length, 25);

    // 'hyper': 5 cars (Huracan, Cullinan, SF90, Chiron, Jesko)
    app.run('filterShopCars("hyper")');
    assert.equal(app.run('currentShopFilter'), 'hyper');
    const listHyper = app.run('document.getElementById("garage-list").innerHTML');
    assert.equal((listHyper.match(/class="car-shop-card"/g) || []).length, 5);
    assert.ok(listHyper.includes('Koenigsegg Jesko Attack'));
    assert.ok(!listHyper.includes('ВАЗ-2107'));

    // 'budget': 7 cars (< 1.3M)
    app.run('filterShopCars("budget")');
    const listBudget = app.run('document.getElementById("garage-list").innerHTML');
    assert.ok((listBudget.match(/class="car-shop-card"/g) || []).length >= 6);
    assert.ok(listBudget.includes('ВАЗ-2107'));
    assert.ok(!listBudget.includes('Koenigsegg Jesko Attack'));
});

test('Bugatti Chiron Super Sport is in luxury box at small percentage and cases have rewarding EV', () => {
    const app = createApp();
    const configs = app.run('caseConfigs');
    const lux = configs.car_luxury;
    assert.ok(lux, 'car_luxury case must exist');
    const bugatti = lux.cars.find(c => c.name === 'Bugatti Chiron Super Sport');
    assert.ok(bugatti, 'Bugatti Chiron Super Sport must be present in car_luxury');
    assert.equal(bugatti.weight, 0.1, 'Bugatti Chiron Super Sport must have small weight 0.1% in car_luxury');

    const carPrices = Object.fromEntries(app.run('carsData.map(c => [c.name, c.price])'));
    for (const key of ['car_standard', 'car_luxury', 'car_hyper']) {
        const box = configs[key];
        const totalWeight = box.cars.reduce((s, c) => s + c.weight, 0);
        const ev = box.cars.reduce((s, c) => s + c.weight * carPrices[c.name], 0) / totalWeight;
        const ratio = ev / box.price;
        // Check EV is rewarding (>= 50% and <= 75%)
        assert.ok(ratio >= 0.50 && ratio <= 0.75, `Expected ${key} return ratio >= 0.50 and <= 0.75, got ${ratio.toFixed(3)}`);
        // Resale (at 90%) must be strictly less than case cost to prevent money duplication
        assert.ok(ev * 0.9 < box.price, `Resale exploit in ${key}`);
    }
});

test('spinning numbers deducts spin cost and NEVER credits balance automatically', () => {
    const app = createApp({
        saved: {
            nickname: 'PlateTester',
            balance: 50000,
            pityCounterBoth: 120
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('balance'), 50000);

    // Guest spin numbers
    app.run('spinNumbers()');
    assert.equal(app.run('balance'), 49500, 'spinNumbers must deduct 500 ₽, never credit money');

    // Reset spinning flag after animation finishes
    app.run('isSpinning = false;');

    // Guest full spin
    app.run('spinBoth()');
    assert.equal(app.run('balance'), 48600, 'spinBoth must deduct 900 ₽ (49500 - 900 = 48600)');

    // Even if elite numbers roll, balance must remain untouched
    const price = app.run('calculatePrice()');
    assert.ok(typeof price === 'number' && price > 0);
    assert.equal(app.run('balance'), 48600, 'Plate valuation must never be credited to balance');
});

test('spending money deducts both local and online balance, subsequent spins never refund spent money', async () => {
    const app = createApp({
        saved: {
            nickname: 'HighRoller',
            balance: 30000000,
            achievements: { first_million: true },
            myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } }]
        }
    });
    app.run('loadProgress()');
    app.run('setOnlineProfile({ nickname: "HighRoller", balance: 30000000, inventory: [], myCars: [] })');
    assert.equal(app.run('balance'), 30000000);
    assert.equal(app.run('onlineProfile.balance'), 30000000);

    const luxPrice = app.run('caseConfigs.car_luxury.price');
    // Buy luxury box (spending funds)
    app.run('openCasePreview("car_luxury")');
    app.run('buyCase()');
    assert.equal(app.run('balance'), 30000000 - luxPrice);
    assert.equal(app.run('onlineProfile.balance'), 30000000 - luxPrice);

    // Tune the car (spending funds)
    app.run('isRaceRunning = false;');
    app.run('upgradeGarageCar(0, "engine")');
    const balAfterTune = app.run('balance');
    assert.ok(balAfterTune < 30000000 - luxPrice);
    assert.equal(app.run('onlineProfile.balance'), balAfterTune);

    // Mock roll response
    app.context.fetch = async (url, options) => {
        const input = JSON.parse(options.body);
        assert.equal(input.action, 'roll');
        return {
            ok: true,
            json: async () => ({
                ok: true,
                profile: { nickname: 'HighRoller', balance: balAfterTune - 500, inventory: [] },
                draft: { letters: ['В', 'О', 'Р'], num: '777', reg: '77', hasNumbers: true, hasLetters: true, changedNumbers: true, changedLetters: true }
            })
        };
    };

    // Spin numbers
    app.run('isSpinning = false; serverSpinBusy = false;');
    await app.run('spinNumbers()');

    // Balance must NOT jump back to 30000000!
    assert.ok(app.run('balance') <= balAfterTune, 'Balance must never jump back to 30,000,000 after spin');
    assert.notEqual(app.run('balance'), 30000000, 'Spent money must never be restored');
});

test('onlineFirebaseFallback roll never overwrites spent local balance with old server balance', async () => {
    const dbData = new Map();
    const app = createApp({
        cloud: {
            ref: (path) => ({
                update: async (val) => { dbData.set(path, { ...(dbData.get(path) || {}), ...val }); },
                set: async (val) => { dbData.set(path, val); },
                once: async () => ({ exists: () => dbData.has(path), val: () => dbData.get(path) })
            })
        },
        saved: {
            nickname: 'FirebasePlayer',
            balance: 50000,
            myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } }]
        }
    });
    app.run('loadProgress()');
    // Simulate onlineProfile with 120,000,000
    app.run('onlineProfile = { nickname: "FirebasePlayer", balance: 120000000, inventory: [], myCars: [] }');
    app.run('balance = 50000');

    // Execute onlineFirebaseFallback roll directly
    const res = await app.run('onlineFirebaseFallback("roll", { mode: "numbers", region: "77" })');
    assert.equal(res.ok, true);

    // Local balance must NEVER be 120,000,000!
    assert.notEqual(app.run('balance'), 120000000, 'Roll must not restore 120,000,000 balance');
    assert.equal(app.run('balance'), 50000, 'Local cash must be preserved, not overwritten with 120M');
});


