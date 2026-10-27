const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('openTradeUpModal and closeTradeUpModal control #trade-up-modal visibility', () => {
    const app = createApp({
        saved: {
            nickname: 'TradeMaster',
            balance: 1000000
        }
    });
    app.run('loadProgress()');
    app.run('openTradeUpModal()');

    const modal = app.elements.get('trade-up-modal');
    assert.ok(modal, '#trade-up-modal must exist in DOM');
    assert.equal(modal.style.display, 'flex');
    assert.ok(modal.classList.contains('show'));

    app.run('closeTradeUpModal()');
    assert.equal(modal.style.display, 'none');
    assert.equal(modal.classList.contains('show'), false);
});

test('Trade-up slots enforce max 5 items and homogenous rarity tier', () => {
    const app = createApp({
        saved: {
            nickname: 'SlotTester',
            balance: 1000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        inventory = [
            { text: 'А 101 АА | 77 RUS', price: 1500 }, // common
            { text: 'А 102 АА | 77 RUS', price: 1600 }, // common
            { text: 'А 103 АА | 77 RUS', price: 1700 }, // common
            { text: 'А 104 АА | 77 RUS', price: 1800 }, // common
            { text: 'А 105 АА | 77 RUS', price: 1900 }, // common
            { text: 'А 106 АА | 77 RUS', price: 2000 }, // common
            { text: 'М 777 ММ | 77 RUS', price: 350000 } // epic
        ];
        openTradeUpModal();
    `);

    // Add first 5 common plates
    app.run(`
        toggleTradeUpSlot(0);
        toggleTradeUpSlot(1);
        toggleTradeUpSlot(2);
        toggleTradeUpSlot(3);
        toggleTradeUpSlot(4);
    `);

    assert.equal(app.run('tradeUpSelectedIndices.length'), 5, 'Should have exactly 5 selected slots');

    // Attempting to add 6th plate should be blocked
    app.run('toggleTradeUpSlot(5);');
    assert.equal(app.run('tradeUpSelectedIndices.length'), 5, 'Max 5 slots must not be exceeded');

    // Removing slot 2
    app.run('removeTradeUpSlot(2);');
    assert.equal(app.run('tradeUpSelectedIndices.length'), 4, 'Removing slot should decrease count to 4');

    // Attempting to add an epic plate to a common contract should be rejected
    app.run('toggleTradeUpSlot(6);');
    assert.equal(app.run('tradeUpSelectedIndices.length'), 4, 'Mismatched tier plate must be rejected');

    // Clearing all slots
    app.run('clearTradeUpSlots();');
    assert.equal(app.run('tradeUpSelectedIndices.length'), 0, 'Clear must reset selected slots');
});

test('autoFillTradeUpContract finds 5 eligible plates of the same tier and fills slots', () => {
    const app = createApp({
        saved: {
            nickname: 'AutoFillTester',
            balance: 1000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        inventory = [
            { text: 'В 001 ВВ | 77 RUS', price: 25000 }, // rare
            { text: 'В 002 ВВ | 77 RUS', price: 26000 }, // rare
            { text: 'В 003 ВВ | 77 RUS', price: 27000 }, // rare
            { text: 'В 004 ВВ | 77 RUS', price: 28000 }, // rare
            { text: 'В 005 ВВ | 77 RUS', price: 29000 }, // rare
            { text: 'В 006 ВВ | 77 RUS', price: 30000 }, // rare
            { text: 'С 100 СС | 77 RUS', price: 1500 }   // common (only 1, not enough for 5)
        ];
        openTradeUpModal();
        autoFillTradeUpContract();
    `);

    assert.equal(app.run('tradeUpSelectedIndices.length'), 5, 'Auto-fill must select 5 rare plates');
    const odds = app.run('calculateTradeUpOdds()');
    assert.equal(odds.inputTier, 'rare');
    assert.equal(odds.outputTier, 'Эпический');
    assert.equal(odds.valid, true);
});

test('Plates equipped on cars or listed on the market are ineligible for Trade-up', () => {
    const app = createApp({
        saved: {
            nickname: 'GuardTester',
            balance: 1000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        myCars = [
            { name: 'Lada 2107', plate: { text: 'А 111 АА | 77 RUS' } }
        ];
        activeMarketListings = [
            { plateText: 'В 222 ВВ | 77 RUS' }
        ];
        inventory = [
            { text: 'А 111 АА | 77 RUS', price: 5000 }, // equipped on car!
            { text: 'В 222 ВВ | 77 RUS', price: 5000 }, // listed on market!
            { text: 'С 333 СС | 77 RUS', price: 5000 }  // free
        ];
        openTradeUpModal();
    `);

    const elgEquipped = app.run('getTradeUpEligibility(inventory[0], 0)');
    assert.equal(elgEquipped.eligible, false, 'Equipped plate must not be eligible');

    const elgMarket = app.run('getTradeUpEligibility(inventory[1], 1)');
    assert.equal(elgMarket.eligible, false, 'Market-listed plate must not be eligible');

    const elgFree = app.run('getTradeUpEligibility(inventory[2], 2)');
    assert.equal(elgFree.eligible, true, 'Free plate must be eligible');
});

test('Country odds accurately inherit distribution from input plates', () => {
    const app = createApp({
        saved: {
            nickname: 'HeritageTester',
            balance: 1000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        inventory = [
            { text: 'А 101 АА | 77 RUS', price: 2000 }, // RUS
            { text: 'А 102 АА | 77 RUS', price: 2000 }, // RUS
            { text: 'А 103 АА | 77 RUS', price: 2000 }, // RUS
            { text: 'DXB 104 | DXB UAE', price: 2000 },  // UAE
            { text: 'DXB 105 | DXB UAE', price: 2000 }   // UAE
        ];
        openTradeUpModal();
        toggleTradeUpSlot(0);
        toggleTradeUpSlot(1);
        toggleTradeUpSlot(2);
        toggleTradeUpSlot(3);
        toggleTradeUpSlot(4);
    `);

    const odds = app.run('calculateTradeUpOdds()');
    assert.equal(odds.count, 5);
    assert.equal(odds.countries.RUS, 60, 'RUS should be 60% (3 of 5)');
    assert.equal(odds.countries.UAE, 40, 'UAE should be 40% (2 of 5)');
});

test('signTradeUpContract consumes 5 input plates, crafts higher-tier plate, awards XP and commits save', async () => {
    const app = createApp({
        saved: {
            nickname: 'CraftGuy',
            balance: 500000,
            playerLevel: 10,
            playerExp: 50
        }
    });
    app.run('loadProgress()');
    app.run(`
        inventory = [
            { text: 'К 001 КК | 77 RUS', price: 25000 }, // rare
            { text: 'К 002 КК | 77 RUS', price: 26000 }, // rare
            { text: 'К 003 КК | 77 RUS', price: 27000 }, // rare
            { text: 'К 004 КК | 77 RUS', price: 28000 }, // rare
            { text: 'К 005 КК | 77 RUS', price: 29000 }, // rare
            { text: 'О 999 ОО | 77 RUS', price: 500000 } // keeper epic plate
        ];
        openTradeUpModal();
        toggleTradeUpSlot(0);
        toggleTradeUpSlot(1);
        toggleTradeUpSlot(2);
        toggleTradeUpSlot(3);
        toggleTradeUpSlot(4);
    `);

    const initialInvLength = app.run('inventory.length');
    assert.equal(initialInvLength, 6);

    await app.run('signTradeUpContract()');

    const newInv = app.run('inventory');
    // 6 original - 5 consumed + 1 crafted = 2 plates remaining in inventory
    assert.equal(newInv.length, 2, 'Inventory should have 2 plates remaining (crafted plate + keeper plate)');

    const craftedPlate = newInv[0];
    assert.ok(craftedPlate, 'Crafted plate must be at the top of inventory');
    assert.ok(craftedPlate.text && craftedPlate.text.length > 0, 'Crafted plate must have text');
    assert.ok(Number(craftedPlate.price) > 30000, 'Crafted plate price must be higher than input average');
    assert.ok(craftedPlate.rarity && craftedPlate.rarity.text, 'Crafted plate must have valid rarity object');

    // Keeper plate must be intact
    assert.equal(newInv[1].text, 'О 999 ОО | 77 RUS', 'Unselected keeper plate must remain unharmed');

    // Result stage overlay must be visible
    const resStage = app.elements.get('trade-up-result-stage');
    assert.ok(resStage, '#trade-up-result-stage must exist');
    assert.equal(resStage.style.display, 'flex', 'Result overlay must be visible');

    // Claim result closes result overlay and modal
    app.run('claimTradeUpResult()');
    assert.equal(resStage.style.display, 'none');
    const modal = app.elements.get('trade-up-modal');
    assert.equal(modal.style.display, 'none');
});
