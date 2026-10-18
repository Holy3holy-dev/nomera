const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('Item 4: Built-in Car Radio cycles stations (off -> phonk -> synthwave -> dps -> off), synthesizes WebAudio notes, and stops on race exit', () => {
    const app = createApp();
    app.run(`
        window._oscCount = 0;
        window.AudioContext = function MockAudioContext() {
            this.state = 'running';
            this.currentTime = 0;
            this.destination = {};
            this.resume = () => Promise.resolve();
            this.createOscillator = () => {
                window._oscCount++;
                return {
                    type: 'sine',
                    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                    connect() {},
                    start() {},
                    stop() {}
                };
            };
            this.createBiquadFilter = () => ({
                type: 'lowpass',
                frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                Q: { setValueAtTime() {} },
                connect() {}
            });
            this.createGain = () => ({
                gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                connect() {}
            });
        };
        myCars = [{ name: 'Toyota Camry 3.5', condition: 100 }];
        selectedRaceCarName = 'Toyota Camry 3.5';
        selectedRaceCarIndex = 0;
        startRaceGame();
    `);

    assert.equal(app.run('raceRadioStation'), 'off');

    const st1 = app.run('cycleRaceRadio()');
    assert.equal(st1, 'phonk');
    assert.ok(app.run('Boolean(raceRadioTimerId)'), 'Radio scheduler should run while in phonk station during active race');
    assert.ok(app.run('window._oscCount > 0'), 'Switching to Phonk FM must immediately synthesize WebAudio oscillators');
    assert.match(app.elements.get('hud-2d-radio-text').textContent, /Phonk FM/i);

    const oscBeforeSynth = app.run('window._oscCount');
    const st2 = app.run('cycleRaceRadio()');
    assert.equal(st2, 'synthwave');
    assert.ok(app.run('window._oscCount > ' + oscBeforeSynth), 'Switching to Synthwave FM must synthesize WebAudio oscillators');
    assert.match(app.elements.get('hud-2d-radio-text').textContent, /Synthwave/i);

    const oscBeforeDps = app.run('window._oscCount');
    const st3 = app.run('cycleRaceRadio()');
    assert.equal(st3, 'dps');
    assert.ok(app.run('window._oscCount > ' + oscBeforeDps), 'Switching to DPS radio wave must synthesize WebAudio oscillators');
    assert.match(app.elements.get('hud-2d-radio-text').textContent, /Волна ДПС/i);

    // Exiting the race must stop the radio audio loop so music never leaks into menus
    app.run('exitRaceGame()');
    assert.equal(app.run('raceRadioTimerId'), null, 'Radio timer must stop when exiting race');

    const st4 = app.run('cycleRaceRadio()');
    assert.equal(st4, 'off');
});

test('Item 5: VIP Special Orders match plates from inventory, pay x2.6-x3.5 multiplier, and rotate completed contracts', () => {
    const app = createApp();
    const ordersCount = app.run(`
        balance = 100000;
        inventory = [
            { text: 'А 707 ВС | 77', price: 25000, rarity: { text: 'Редкий', bg: '#3b82f6', color: '#fff' } },
            { text: 'В 500 ВВ | 78', price: 80000, rarity: { text: 'Супер редкий', bg: '#a855f7', color: '#fff' } },
            { text: 'D 88 | DXB UAE', price: 450000, rarity: { text: 'Легендарный', bg: '#f59e0b', color: '#000' } }
        ];
        initVipOrders(true).length;
    `);
    assert.equal(ordersCount, 4, 'Should initialize 4 active VIP orders');

    // Force slot 0 to be the mirror plate order ('order_mirror') so we can test deterministic delivery
    const deliveryResult = app.run(`
        achievements.blatnoy_plate = 1;
        const mirrorTpl = VIP_ORDER_TEMPLATES.find(t => t.id === 'order_mirror');
        vipActiveOrders[0] = {
            slotId: 'test_slot_mirror',
            templateId: mirrorTpl.id,
            client: mirrorTpl.client,
            role: mirrorTpl.role,
            avatar: mirrorTpl.avatar,
            title: mirrorTpl.title,
            desc: mirrorTpl.desc,
            badge: mirrorTpl.badge,
            multiplier: mirrorTpl.multiplier,
            minPayout: mirrorTpl.minPayout,
            xpReward: mirrorTpl.xpReward
        };
        const matches = getMatchingInventoryForVipOrder(vipActiveOrders[0]);
        const balanceBefore = balance;
        const res = deliverVipOrder('test_slot_mirror', matches[0].index);
        ({
            res,
            balanceDelta: balance - balanceBefore,
            invLenAfter: inventory.length,
            completedAfter: achievements.vipOrdersCompleted,
            newSlotId: vipActiveOrders[0].slotId
        });
    `);

    const expectedPayout = Math.max(48000, Math.round(25000 * 3.4)); // 85,000 ₽
    assert.equal(deliveryResult.res.payout, expectedPayout, 'VIP order should pay 3.4x of the mirror plate value');
    assert.equal(deliveryResult.balanceDelta, expectedPayout, 'Player balance should be credited with VIP payout');
    assert.equal(deliveryResult.invLenAfter, 2, 'Delivered plate should be removed from inventory');
    assert.equal(deliveryResult.completedAfter, 1, 'achievements.vipOrdersCompleted should increment');
    assert.notEqual(deliveryResult.newSlotId, 'test_slot_mirror', 'Completed order slot should rotate to a fresh contract');
});

test('Item 6: Live VIP Plate Auction allows bidding against AI tycoons, winning lots below market value, and instant buyout', () => {
    const app = createApp();
    const initialLot = app.run(`
        balance = 5000000;
        inventory = [];
        startVipAuctionLot(0); // 'А 007 МР | 97' (marketValue: 850000)
    `);

    assert.equal(initialLot.plateText, 'А 007 МР | 97');
    assert.equal(initialLot.marketValue, 850000);
    assert.ok(initialLot.currentBid < initialLot.marketValue * 0.5, 'Starting bid should be ~35% of market value');
    assert.equal(initialLot.rivals.length, 3, 'Should have 3 AI tycoon rivals at the table');

    // Outbid all rivals by raising bid above their maxBudget caps and resolve the auction
    const winRes = app.run(`
        vipAuctionState.rivals.forEach(r => { r.maxBudget = 350000; });
        placeVipAuctionBid(2, { instantRivalResponse: true });
        resolveVipAuction();
    `);

    assert.equal(winRes.won, true, 'Player should win the auction once rivals pass');
    assert.ok(winRes.paid < 850000, 'Winning bid should be well below market value');
    assert.equal(app.run('inventory.length'), 1, 'Won auction plate should be added to inventory');
    assert.equal(app.run('inventory[0].text'), 'А 007 МР | 97');
    assert.equal(app.run('achievements.vipAuctionsWon'), 1);

    // Test instant buyout on lot 4 ('D 88 | DXB UAE')
    const buyoutRes = app.run(`
        startVipAuctionLot(4);
        buyoutVipAuctionLot();
    `);
    assert.equal(buyoutRes.won, true, 'Instant buyout should immediately win the lot');
    assert.equal(app.run('inventory[0].text'), 'D 88 | DXB UAE');
    assert.equal(app.run('achievements.vipAuctionsWon'), 2);
});
