const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('car styling properly updates car styling attributes and charges balance', () => {
    const app = createApp({
        saved: {
            nickname: 'Tuner_1',
            balance: 200000,
            myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } }],
            achievements: { styling_master: true }
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('balance'), 200000);
    assert.equal(app.run('myCars[0].styling'), undefined);

    // Open styling modal and set attributes
    app.run('stylingActiveCarIndex = 0; stylingTempColor = "#ef4444"; stylingTempTint = 50; stylingTempNeon = "#00f0ff";');
    app.run('confirmApplyStyling()');

    assert.equal(app.run('myCars[0].styling.color'), '#ef4444');
    assert.equal(app.run('myCars[0].styling.tint'), 50);
    assert.equal(app.run('myCars[0].styling.neon'), '#00f0ff');
    // Cost: 15k (paint) + 10k (50% tint) + 35k (neon) = 60 000 ₽
    assert.equal(app.run('balance'), 140000);
});

test('daily reward grants money and increments streak once per day', () => {
    const app = createApp({
        saved: {
            nickname: 'DailyPlayer',
            balance: 50000,
            dailyBonus: { lastClaimDate: null, streak: 0 }
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('dailyBonus.streak'), 0);

    // Claim Day 1 reward (15 000 ₽)
    app.run('claimDailyReward()');
    assert.equal(app.run('dailyBonus.streak'), 1);
    assert.equal(app.run('balance'), 65000);

    // Trying to claim again on the same day should be ignored
    app.run('claimDailyReward()');
    assert.equal(app.run('dailyBonus.streak'), 1);
    assert.equal(app.run('balance'), 65000);
});

test('daily quests progress increments and allows reward collection', () => {
    const app = createApp({
        saved: {
            nickname: 'QuestPlayer',
            balance: 10000,
            playerExp: 0,
            dailyQuests: { date: null, progress: { spins: 0, distance: 0, tune: 0 }, claimed: {} }
        }
    });
    app.run('loadProgress()');
    app.run('recordQuestProgress("spins", 10)');
    assert.equal(app.run('dailyQuests.progress.spins'), 10);

    // Claim spins quest (+30 000 ₽, +50 XP)
    app.run('claimQuestReward("spins")');
    assert.equal(app.run('balance'), 40000);
    assert.equal(app.run('dailyQuests.claimed.spins'), true);

    // Cannot claim twice
    app.run('claimQuestReward("spins")');
    assert.equal(app.run('balance'), 40000);
});

test('achievements unlock when conditions are met and award prizes', () => {
    const app = createApp({
        saved: {
            nickname: 'Millionaire',
            balance: 1000000,
            achievements: {}
        }
    });
    app.run('loadProgress()');
    app.run('checkAchievements()');

    // First million achievement awards 100 000 ₽
    assert.ok(app.run('achievements.first_million'));
    assert.equal(app.run('balance'), 1100000);
});

test('chat title selection updates player title and renders correct badge', () => {
    const app = createApp({
        saved: {
            nickname: 'RacerPro',
            playerTitle: 'novice'
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('playerTitle'), 'novice');

    app.run('changePlayerTitle("racer")');
    assert.equal(app.run('playerTitle'), 'racer');

    const badgeHtml = app.run('getPlayerBadgeHtml("racer", false)');
    assert.match(badgeHtml, /Стритрейсер/);

    const adminBadgeHtml = app.run('getPlayerBadgeHtml("none", true)');
    assert.match(adminBadgeHtml, /Администратор/);
});

test('car market listing removes car from garage and buying restores car to buyer', async () => {
    const app = createApp({
        saved: {
            nickname: 'Seller',
            balance: 500000,
            myCars: [
                { name: 'ВАЗ-2107 «Жигули»', condition: 100 },
                { name: 'Lada Priora БПАН', condition: 90, styling: { color: '#ef4444', neon: '#00f0ff' } }
            ]
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('myCars.length'), 2);

    // Select car 1 and confirm sell
    app.run('document.getElementById("sell-car-select").value = "1"');
    app.run('document.getElementById("sell-car-price").value = "250000"');
    await app.run('confirmSellCar()');

    assert.equal(app.run('myCars.length'), 1);
    assert.equal(app.run('myCars[0].name'), 'ВАЗ-2107 «Жигули»');

    // Check lot in marketLots
    const lotKeys = app.run('Object.keys(marketLots)');
    assert.equal(lotKeys.length, 1);
    const lot = app.run(`marketLots["${lotKeys[0]}"]`);
    assert.equal(lot.type, 'car');
    assert.equal(lot.price, 250000);
    assert.equal(lot.car.name, 'Lada Priora БПАН');
    assert.equal(lot.car.styling.neon, '#00f0ff');

    // Buying the car lot
    await app.run(`buyMarketLot("${lotKeys[0]}")`);
    assert.equal(app.run('myCars.length'), 2);
    assert.equal(app.run('myCars[1].name'), 'Lada Priora БПАН');
    assert.equal(app.run('balance'), 250000); // 500 000 - 250 000
});

test('car sprite generation and drawPixelCar support styling color, tint and neon for all car models', () => {
    const app = createApp({
        saved: {
            nickname: 'SpriteTester',
            balance: 500000,
            myCars: [
                { name: 'ВАЗ-2107 «Жигули»', condition: 100, styling: { color: '#ef4444', tint: 75, neon: '#00f0ff' } },
                { name: 'BMW M5 F90', condition: 95, styling: { color: '#3b82f6', tint: 50, neon: '#a855f7' } }
            ]
        }
    });
    app.run('loadProgress()');

    // Test that getCarSpriteDataUrl runs safely for any car and returns string
    const cars = app.run('carsData.map(c => c.name)');
    assert.ok(cars.length >= 14);
    for (const carName of cars) {
        const url = app.run(`getCarSpriteDataUrl(${JSON.stringify(carName)}, { color: "#10b981", tint: 30, neon: "#22c55e" })`);
        assert.equal(typeof url, 'string');
    }

    // Test that garage card rendering contains car-sprite-img
    app.run('renderCars()');
    const garageHtml = app.run('document.getElementById("my-cars").innerHTML');
    assert.match(garageHtml, /car-sprite-img/);

    // Test that shop rendering contains car-sprite-img
    const shopHtml = app.run('document.getElementById("garage-list").innerHTML');
    assert.match(shopHtml, /car-sprite-img/);
});

test('race weather atmosphere selector and visual effects work properly', () => {
    const app = createApp({
        saved: {
            nickname: 'WeatherRacer',
            balance: 500000,
            myCars: [{ name: 'ВАЗ-2107 «Жигули»', condition: 100 }]
        }
    });
    app.run('loadProgress()');

    // Default weather is auto
    assert.equal(app.run('raceSelectedWeather'), 'auto');
    const autoBiome0 = app.run('getTrackBiome(1.0)');
    assert.equal(autoBiome0.id, 'mow');
    assert.equal(autoBiome0.isRain, false);
    assert.equal(autoBiome0.isNight, true);

    const autoBiomeRain = app.run('getTrackBiome(3.5)');
    assert.equal(autoBiomeRain.id, 'forest');
    assert.equal(autoBiomeRain.isRain, true);

    // Switch to day mode
    app.run('setRaceWeather("day")');
    assert.equal(app.run('raceSelectedWeather'), 'day');
    const dayBiome = app.run('getTrackBiome(1.0)');
    assert.equal(dayBiome.id, 'day');
    assert.equal(dayBiome.isRain, false);
    assert.equal(dayBiome.isNight, false);

    // Switch to sunset mode
    app.run('setRaceWeather("sunset")');
    assert.equal(app.run('raceSelectedWeather'), 'sunset');
    const sunsetBiome = app.run('getTrackBiome(1.0)');
    assert.equal(sunsetBiome.id, 'sunset');
    assert.equal(sunsetBiome.isSunset, true);

    // Switch to night mode
    app.run('setRaceWeather("night")');
    assert.equal(app.run('raceSelectedWeather'), 'night');
    const nightBiome = app.run('getTrackBiome(1.0)');
    assert.equal(nightBiome.id, 'mow');
    assert.equal(nightBiome.isNight, true);

    // Switch to rain mode
    app.run('setRaceWeather("rain")');
    assert.equal(app.run('raceSelectedWeather'), 'rain');
    const rainBiome = app.run('getTrackBiome(1.0)');
    assert.equal(rainBiome.id, 'forest');
    assert.equal(rainBiome.isRain, true);
});

test('economy and plate price calculation parity with special series, ladders and round hundreds', () => {
    const c = require('../netlify/functions/lib/online-core.cjs');
    const app = createApp();

    // 1. Base plate price
    const baseLocal = app.run('getCalculatedPrice("А", "В", "К", "492", "50")');
    const baseServer = c.priceOfPlate('А', 'В', 'К', '492', '50');
    assert.equal(baseLocal, 450);
    assert.equal(baseServer, 450);
    assert.equal(c.rarityOfPrice(baseServer), 'Обычный');

    // 2. Ladder bonus (123)
    const ladderLocal = app.run('getCalculatedPrice("А", "В", "К", "123", "50")');
    const ladderServer = c.priceOfPlate('А', 'В', 'К', '123', '50');
    assert.equal(ladderLocal, 20450);
    assert.equal(ladderServer, 20450);
    assert.equal(c.rarityOfPrice(ladderServer), 'Редкий');

    // 3. Round hundreds bonus (500)
    const hundredLocal = app.run('getCalculatedPrice("А", "В", "К", "500", "50")');
    const hundredServer = c.priceOfPlate('А', 'В', 'К', '500', '50');
    assert.equal(hundredLocal, 25450);
    assert.equal(hundredServer, 25450);
    assert.equal(c.rarityOfPrice(hundredServer), 'Редкий');

    // 4. Elite series ООО
    const oooLocal = app.run('getCalculatedPrice("О", "О", "О", "492", "50")');
    const oooServer = c.priceOfPlate('О', 'О', 'О', '492', '50');
    assert.equal(oooLocal, 1600450);
    assert.equal(oooServer, 1600450);
    assert.equal(c.rarityOfPrice(oooServer), 'Легендарный');

    // 5. Blatnoy jackpot: 011 with ЕКХ
    const jackpotLocal = app.run('getCalculatedPrice("Е", "К", "Х", "011", "777")');
    const jackpotServer = c.priceOfPlate('Е', 'К', 'Х', '011', '777');
    assert.equal(jackpotLocal, 12000000);
    assert.equal(jackpotServer, 12000000);
    assert.equal(c.rarityOfPrice(jackpotServer), 'БЛАТНОЙ');
});

test('pity system increments on spins and triggers guarantees', () => {
    const app = createApp({
        saved: {
            nickname: 'PityTester',
            balance: 50000,
            pityCounterBoth: 24
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('pityCounterBoth'), 24);

    // Spin both should increment pityCounterBoth to 25 (Rare guarantee tier)
    app.run('spinBoth()');
    assert.equal(app.run('pityCounterBoth'), 25);
    const priceAfter25 = app.run('calculatePrice()');
    assert(priceAfter25 >= 18000, `Expected at least rare, got ${priceAfter25}`);

    // Set pity counter to 119 and spin -> hits 120, forcing legendary/blatnoy
    app.run('isSpinning = false; pityCounterBoth = 119; spinBoth();');
    assert.equal(app.run('pityCounterBoth'), 120);
    const luckyNum = app.run('currentNum');
    assert(['777','001','007','011','111','555','888','999'].includes(luckyNum));
});




