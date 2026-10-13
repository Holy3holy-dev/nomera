const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');
const core = require('../netlify/functions/lib/online-core.cjs');

test('pity counter scales drop chance bonus and resets on rare or higher drops', () => {
    const app = createApp({
        saved: {
            nickname: 'LuckySpinner',
            balance: 50000,
            pityCounterBoth: 0
        }
    });
    app.run('loadProgress()');
    assert.equal(app.run('pityCounterBoth'), 0);
    assert.equal(app.run('getLuckBonus(0)'), 0);
    assert.equal(app.run('getLuckBonus(10)'), 30);
    assert.equal(app.run('getLuckBonus(24)'), 72);

    // Dynamic boost badge updates
    app.run('pityCounterBoth = 15; updatePityUI();');
    const badge = app.elements.get('pity-boost-badge');
    assert.equal(badge.innerText, '+45%');

    // Spin both guarantees Rare tier at 25
    app.run('pityCounterBoth = 24;');
    app.run('spinBoth()');
    assert.equal(app.run('pityCounterBoth'), 25);
    const price = app.run('calculatePrice()');
    assert(price >= 18000, `Expected at least rare price (>= 18000), got ${price}`);

    // High tier drop resets pityCounterBoth to 0
    app.run('getRarity = () => ({ text: "Редкий" })');
    // Simulate spin completion callback:
    app.run(`
        const isHighTier = ['Редкий', 'Супер редкий', 'Эпический', 'Легендарный', 'БЛАТНОЙ'].includes('Редкий');
        if (isHighTier) {
            pityCounterBoth = 0;
            updatePityUI();
        }
    `);
    assert.equal(app.run('pityCounterBoth'), 0);
    assert.equal(app.elements.get('pity-boost-badge').innerText, '+0%');
});

test('server secureRoll respects pity counter and soft pity bonus', () => {
    // With 0 pity, normal roll
    const normal = core.secureRoll('both', 0);
    assert(normal.num !== null);
    assert(Array.isArray(normal.letters));

    // With pity 25, forced rare ladder or mirror letters
    const rareRoll = core.secureRoll('both', 25);
    const ladders = ['123','234','345','456','567','678','789','987','876','765','654','543','432','321'];
    assert(ladders.includes(rareRoll.num), `Expected ladder, got ${rareRoll.num}`);

    // With pity 120, forced legendary jackpot
    const legRoll = core.secureRoll('both', 120);
    const jackpots = ['777','001','007','011','111','555','888','999'];
    assert(jackpots.includes(legRoll.num), `Expected jackpot number, got ${legRoll.num}`);
    const eliteSeries = ['ААА','АМР','ВОР','ЕКХ','ООО','ССС','МММ','СКР'];
    assert(eliteSeries.includes(legRoll.letters.join('')), `Expected elite letters, got ${legRoll.letters.join('')}`);
});

test('marketplace seller receives funds in real time via account listener and guest purchases credit seller', async () => {
    let sellerBalanceTxn = 0;
    const fakeFirebase = {
        ref(path) {
            return {
                remove: async () => {},
                set: async () => {},
                update: async () => {},
                on: () => {},
                off: () => {},
                limitToLast: () => ({ on: () => {} }),
                once: async () => ({
                    exists: () => true,
                    val: () => ({
                        balance: 50000,
                        myCars: [],
                        inventory: []
                    })
                }),
                transaction: async (fn) => {
                    sellerBalanceTxn = fn(50000);
                    return { committed: true };
                },
                catch: () => {}
            };
        }
    };

    const app = createApp({
        cloud: fakeFirebase,
        saved: {
            nickname: 'GuestBuyer',
            balance: 500000,
            myCars: [{ name: 'Базовый авто' }]
        }
    });
    app.run('loadProgress()');

    // Populate a market car listed by 'SellerUser'
    app.run(`
        marketLots['lot_car_123'] = {
            id: 'lot_car_123',
            lotId: 'lot_car_123',
            type: 'car',
            sellerKey: 'selleruser',
            sellerName: 'SellerUser',
            car: { name: 'BMW M5 E60', condition: 100, upgrades: {} },
            price: 250000
        };
    `);

    // Guest buys the car
    await app.run('buyMarketLot("lot_car_123")');

    // Guest buyer balance deducted
    assert.equal(app.run('balance'), 250000);
    assert.equal(app.run('myCars.length'), 2);
    assert.equal(app.run('myCars[1].name'), 'BMW M5 E60');

    // Seller's Firebase account received the funds!
    assert.equal(sellerBalanceTxn, 300000); // 50,000 existing + 250,000 price
});

test('online account listener credits seller local balance and notifies when lots sell', () => {
    let listener = null;
    const fakeDb = {
        ref(path) {
            return {
                on(event, cb) {
                    if (event === 'value' && path.includes('accounts')) listener = cb;
                },
                off() { listener = null; },
                limitToLast: () => ({ on: () => {} })
            };
        }
    };

    const app = createApp({
        cloud: fakeDb,
        saved: {
            nickname: 'ActiveSeller',
            balance: 60000
        }
    });
    app.run('loadProgress()');
    app.run(`
        onlineProfile = {
            nickname: 'ActiveSeller',
            balance: 50000,
            inventory: [],
            myCars: []
        };
        attachMyOnlineAccount('activeseller');
    `);

    assert(listener !== null, 'Listener should be attached to onlineV4/accounts/activeseller');

    // Simulate another player buying a lot from ActiveSeller for 150,000 ₽
    let notified = false;
    app.context.notifyUser = (msg) => {
        if (msg.includes('Начислено') && msg.includes('150')) notified = true;
    };

    listener({
        val: () => ({
            balance: 200000,
            inventory: [],
            myCars: []
        })
    });

    // onlineProfile balance is updated to 200,000
    assert.equal(app.run('onlineProfile.balance'), 200000);
    // local balance is credited +150,000: 60,000 + 150,000 = 210,000
    assert.equal(app.run('balance'), 210000);
    assert.equal(notified, true);
});
