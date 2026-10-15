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

test('sellCar handles cars with missing basePrice and never yields NaN', () => {
    const app = createApp({
        saved: {
            nickname: 'GarageTester',
            balance: 50000,
            myCars: [
                { name: 'ВАЗ-2107 «Жигули»' } // Notice missing basePrice!
            ]
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('myCars.length'), 1);
    assert.equal(app.run('myCars[0].basePrice'), 120000); // Normalized from carsData

    // Delete basePrice explicitly to simulate legacy or corrupted data
    app.run('delete myCars[0].basePrice');
    assert.equal(app.run('myCars[0].basePrice'), undefined);

    // Selling car must calculate profit via template fallback and must NOT yield NaN
    app.run('sellCar(0, false)');
    assert.equal(app.run('myCars.length'), 0);
    const bal = app.run('balance');
    assert.ok(Number.isFinite(bal), 'Balance must be finite');
    assert.ok(bal > 50000, 'Balance must have received sale profit');
    assert.notEqual(app.elements.get('balance').innerText, 'не число');
});

test('sellCar without plate preserves the plate in inventory', () => {
    const app = createApp({
        saved: {
            nickname: 'PlateKeeper',
            balance: 50000,
            inventory: [],
            myCars: [
                {
                    name: 'ВАЗ-2107 «Жигули»',
                    basePrice: 120000,
                    plate: { text: 'А 777 АА | 77 RUS', price: 770500, rarity: { text: 'Эпический' } }
                }
            ]
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('inventory.length'), 0);
    assert.equal(app.run('myCars.length'), 1);

    // Sell only car (hasPlate = false)
    app.run('sellCar(0, false)');
    assert.equal(app.run('myCars.length'), 0);
    // The plate must be returned to inventory!
    assert.equal(app.run('inventory.length'), 1);
    assert.equal(app.run('inventory[0].text'), 'А 777 АА | 77 RUS');
});

test('sellCar with plate sells both car and plate', () => {
    const app = createApp({
        saved: {
            nickname: 'BundleSeller',
            balance: 50000,
            inventory: [],
            myCars: [
                {
                    name: 'ВАЗ-2107 «Жигули»',
                    basePrice: 120000,
                    plate: { text: 'В 001 ОР | 77 RUS', price: 100000, rarity: { text: 'Супер редкий' } }
                }
            ]
        }
    });
    app.run('loadProgress()');
    // Expected profit: Math.floor(120000 * 0.9 + 100000 * 0.95) = 108000 + 95000 = 203000
    app.run('sellCar(0, true)');
    assert.equal(app.run('myCars.length'), 0);
    assert.equal(app.run('inventory.length'), 0);
    assert.equal(app.run('balance'), 50000 + 203000);
});

test('leaderboard renders visible player avatars and safeImageUrl accepts SVG data URIs', () => {
    const app = createApp({
        saved: {
            nickname: 'AvatarTester',
            balance: 100000
        }
    });
    app.run('loadProgress()');
    app.run(`
        cloudLeaderboardList = [
            { nickname: 'PlayerA', balance: 500000, playerLevel: 10 },
            { nickname: 'PlayerB', balance: 300000, playerLevel: 5, avatarData: AVATAR_PRESETS[2] },
            { nickname: 'PlayerC', balance: 100000, playerLevel: 2 }
        ];
        renderLeaderboard();
    `);

    // Verify getPlayerAvatar returns valid avatar strings
    const a1 = app.run('getPlayerAvatar(cloudLeaderboardList[0])');
    const a2 = app.run('getPlayerAvatar(cloudLeaderboardList[1])');
    const a3 = app.run('getPlayerAvatar(cloudLeaderboardList[2])');
    assert.ok(typeof a1 === 'string' && a1.startsWith('data:image/svg+xml'));
    assert.ok(typeof a2 === 'string' && a2.startsWith('data:image/svg+xml'));
    assert.ok(typeof a3 === 'string' && a3.startsWith('data:image/svg+xml'));

    // Check leaderboard list HTML contains no 1x1 transparent png
    const html = app.elements.get('leaderboard-list').innerHTML;
    assert.ok(!html.includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), 'Leaderboard must not contain 1x1 transparent fallback');
});

test('safeImageUrl and getPlayerAvatar support custom uploaded jpeg, jpg, png photos and relative paths', () => {
    const sec = require('../js/security.js');
    const customJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const customJpg = 'data:image/jpg;base64,/9j/4AAQSkZJRg==';
    const newlinePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk\r\nYAAAAAYAAjCB0C8AAAAASUVORK5CYII=\n';
    const relativeIcon = './icons/car-placeholder.svg';

    assert.equal(sec.safeImageUrl(customJpeg, 'err'), customJpeg);
    assert.equal(sec.safeImageUrl(customJpg, 'err'), customJpg);
    assert.equal(sec.safeImageUrl(newlinePng, 'err'), newlinePng.replace(/\s+/g, ''));
    assert.equal(sec.safeImageUrl(relativeIcon, 'err'), relativeIcon);
    assert.equal(sec.safeImageUrl('javascript:alert(1)', 'err'), 'err');

    const app = createApp({
        saved: {
            nickname: 'PhotoUser',
            balance: 50000000,
            avatarData: customJpeg
        }
    });
    app.run('loadProgress()');
    app.run(`
        cloudLeaderboardList = [
            { nickname: 'PlayerCustom', balance: 70000000, playerLevel: 15, avatarData: ${JSON.stringify(customJpeg)} },
            { nickname: 'PlayerPresets', balance: 30000000, playerLevel: 8 },
            { nickname: 'PhotoUser', balance: 50000000, playerLevel: 10, avatarData: ${JSON.stringify(customJpeg)} }
        ];
        renderLeaderboard();
    `);

    // Verify custom avatar is returned for PlayerCustom and PhotoUser
    const avatarCustom = app.run('getPlayerAvatar(cloudLeaderboardList[0])');
    assert.equal(avatarCustom, customJpeg, 'getPlayerAvatar must return the uploaded custom image, not a preset');

    // Verify custom avatar is rendered into leaderboard HTML
    const listHtml = app.elements.get('leaderboard-list').innerHTML;
    assert.ok(listHtml.includes(customJpeg), 'Leaderboard list must render the custom uploaded avatar');

    const podiumHtml = app.elements.get('podium-stage').innerHTML;
    assert.ok(podiumHtml.includes(customJpeg), 'Leaderboard podium must render the custom uploaded avatar');
    assert.ok(podiumHtml.includes('handleAvatarError'), 'Podium must use handleAvatarError for safe fallback');
});

test('creditPlayerBalance synchronizes local balance and onlineProfile.balance and propagates to db', async () => {
    const dbWrites = [];
    const app = createApp({
        cloud: {
            ref: (path) => ({
                update: async (val) => { dbWrites.push({ path, val }); },
                set: async (val) => { dbWrites.push({ path, val }); },
                once: async () => ({ exists: () => true, val: () => ({}) })
            })
        },
        saved: {
            nickname: 'SyncedPlayer',
            balance: 50000
        }
    });
    app.run('loadProgress()');
    app.run('setOnlineProfile({ nickname: "SyncedPlayer", balance: 50000, inventory: [], myCars: [] })');
    assert.equal(app.run('balance'), 50000);
    assert.equal(app.run('onlineProfile.balance'), 50000);

    // Credit funds
    app.run('creditPlayerBalance(150000, "Тестовая награда")');
    assert.equal(app.run('balance'), 200000);
    assert.equal(app.run('onlineProfile.balance'), 200000);

    // Verify updates to Firebase
    const accWrite = dbWrites.find(w => w.path === 'onlineV4/accounts/syncedplayer');
    assert.ok(accWrite, 'Must update onlineV4 accounts in database');
    assert.equal(accWrite.val.balance, 200000);

    // Verify UI reflects sanitized balance (no NaN)
    const balEl = app.elements.get('balance');
    assert.ok(balEl.innerText.includes('200\u00A0000') || balEl.innerText.includes('200 000'));
});

test('my-rank-banner displays player avatar and different nicknames hash to distinct preset avatars', () => {
    const app = createApp({
        saved: {
            nickname: 'RacerAlex',
            balance: 100000,
            avatarData: '' // No custom avatar set
        }
    });
    app.run('loadProgress()');
    app.run('renderLeaderboard()');

    // Rank banner avatar must be populated
    const rankAvatar = app.elements.get('my-rank-avatar');
    assert.ok(rankAvatar, '#my-rank-avatar must exist in DOM');
    assert.ok(rankAvatar.src && rankAvatar.src.startsWith('data:image/svg+xml'), 'Rank avatar must have valid SVG preset');

    // Deterministic hashing gives different presets to different nicknames
    const a1 = app.run('getPlayerAvatar({ nickname: "SpeedKing" })');
    const a2 = app.run('getPlayerAvatar({ nickname: "DriftQueen" })');
    const a3 = app.run('getPlayerAvatar({ nickname: "TurboSam" })');
    const set = new Set([a1, a2, a3]);
    assert.ok(set.size > 1, 'Distinct nicknames must not all be forced to the same preset');
});

test('detachPlate sanitizes cost and never produces NaN balance or negative funds', () => {
    const app = createApp({
        saved: {
            nickname: 'PlateTuner',
            balance: 50000,
            myCars: [
                {
                    name: 'ВАЗ-2107 «Жигули»',
                    basePrice: 80000,
                    plate: { text: 'А 777 АА | 77 RUS', price: 100000 }
                }
            ]
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('myCars[0].plate.text'), 'А 777 АА | 77 RUS');

    // Detach plate (costs 10,000 ₽)
    app.run('detachPlate(0)');
    assert.equal(app.run('balance'), 40000);
    assert.equal(app.run('myCars[0].plate'), null);
    assert.equal(app.run('inventory.length'), 1);
    assert.equal(app.run('inventory[0].text'), 'А 777 АА | 77 RUS');
    assert.equal(Number.isFinite(app.run('balance')), true, 'Balance must stay a finite number');
});

test('openPlayerViewModal populates player profile, sets safe avatar and attaches onerror handler', () => {
    const app = createApp({
        saved: {
            nickname: 'ModalViewer',
            balance: 150000
        }
    });
    app.run('loadProgress()');
    app.run(`
        cloudLeaderboardList = [
            { nickname: 'RivalOne', balance: 5000000, playerLevel: 42, bestPlate: 'М 777 ММ | 77 RUS', carsCount: 3, bestSpeed: 280, updatedAt: Date.now() - 60000 }
        ];
        renderLeaderboard();
        openPlayerViewModal('rivalone');
    `);

    const pvAvatar = app.elements.get('pv-avatar');
    const pvName = app.elements.get('pv-name');
    const pvLevel = app.elements.get('pv-level');
    const pvBalance = app.elements.get('pv-balance');
    const pvCars = app.elements.get('pv-cars');
    const pvBestPlate = app.elements.get('pv-best-plate');

    assert.ok(pvAvatar, '#pv-avatar must exist');
    assert.ok(pvAvatar.src && pvAvatar.src.startsWith('data:image/svg+xml'), 'Avatar src must be a valid SVG URI');
    assert.ok(!pvAvatar.src.includes('<svg'), 'Avatar src must not contain unencoded XML tags');
    assert.equal(pvName.innerText, 'RivalOne');
    assert.ok(pvLevel.innerText.includes('42'));
    assert.ok(pvBalance.innerText.includes('5\u00A0000\u00A0000') || pvBalance.innerText.includes('5 000 000'));
    assert.equal(pvCars.innerText, 3);
    assert.equal(pvBestPlate.innerText, 'М 777 ММ | 77 RUS');

    // Test handleAvatarError recovery
    const mockImg = { src: 'broken.png', onerror: () => {} };
    app.context.handleAvatarError(mockImg, 0);
    assert.equal(mockImg.onerror, null);
    assert.ok(mockImg.src.startsWith('data:image/svg+xml;base64,'));
});

test('syncMyLeaderboardEntry synchronizes player stats, level and avatarData to Firebase leaderboard', () => {
    const dbWrites = [];
    const app = createApp({
        cloud: {
            ref: (path) => ({
                update: async (val) => { dbWrites.push({ path, val }); },
                set: async (val) => { dbWrites.push({ path, val }); },
                once: async () => ({ exists: () => true, val: () => ({}) })
            })
        },
        saved: {
            nickname: 'SyncTester',
            balance: 80000
        }
    });
    app.run('loadProgress()');
    app.run('selectPresetAvatar(AVATAR_PRESETS[3])');

    // Verify sync written to leaderboard
    const lbWrite = dbWrites.find(w => w.path === 'leaderboard/synctester');
    assert.ok(lbWrite, 'Must write entry to leaderboard/synctester');
    assert.equal(lbWrite.val.nickname, 'SyncTester');
    assert.ok(lbWrite.val.avatarData.startsWith('data:image/svg+xml;base64,'));
    assert.equal(app.run('avatarData'), app.run('AVATAR_PRESETS[3]'));
});
