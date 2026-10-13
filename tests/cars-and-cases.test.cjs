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

