'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');

test('HTML structure: Sell button is located next to To Collection button in generator', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.match(html, /<div class="generator-action-row">\s*<button[^>]+id="btn-save"[^>]*>[\s\S]*?<\/button>\s*<button[^>]+id="btn-sell-direct"[^>]*>[\s\S]*?<\/button>\s*<\/div>/);
    assert.match(html, /onclick="sellCurrentPlate\(\)"/);
});

test('Generator Sell Direct button: starts disabled and enables after roll with evaluated price', () => {
    const app = createApp();
    const btnSave = app.context.document.getElementById('btn-save');
    const btnSell = app.context.document.getElementById('btn-sell-direct');

    assert.ok(btnSave, 'btn-save must exist');
    assert.ok(btnSell, 'btn-sell-direct must exist');

    // Initially both buttons are disabled
    app.run('checkCanSaveButton()');
    assert.equal(btnSave.disabled, true);
    assert.equal(btnSell.disabled, true);

    // Provide spun numbers and letters
    app.run(`
        currentL1 = 'О'; currentNum = '777'; currentL2 = 'О'; currentL3 = 'О'; currentReg = '77';
        boardHasLetters = true; boardHasNumbers = true;
        hasSpunLetSinceSave = true; hasSpunNumSinceSave = true;
        checkCanSaveButton();
    `);

    assert.equal(btnSave.disabled, false);
    assert.equal(btnSell.disabled, false);
    assert.match(btnSell.innerHTML, /💰 Продать/);
    assert.match(btnSell.innerHTML, /\+\d+/);
});

test('Generator Sell Direct in guest mode: credits balance directly and disables action buttons', async () => {
    const app = createApp();
    const btnSave = app.context.document.getElementById('btn-save');
    const btnSell = app.context.document.getElementById('btn-sell-direct');

    app.run(`
        balance = 50000;
        currentL1 = 'А'; currentNum = '777'; currentL2 = 'А'; currentL3 = 'А'; currentReg = '777';
        boardHasLetters = true; boardHasNumbers = true;
        hasSpunLetSinceSave = true; hasSpunNumSinceSave = true;
        mustSpinBothForNextSave = true;
        checkCanSaveButton();
    `);

    const initialBalance = app.run('balance');
    const calculatedPrice = app.run('calculatePrice()');
    assert.ok(calculatedPrice > 0, 'Plate must have positive value');

    await app.run('sellCurrentPlate()');

    assert.equal(app.run('balance'), initialBalance + calculatedPrice, 'Balance should increase by calculated price');
    assert.equal(app.run('inventory.length'), 0, 'Plate was sold directly, not kept in inventory');
    assert.equal(btnSave.disabled, true, 'Save button must be disabled after sale');
    assert.equal(btnSell.disabled, true, 'Sell button must be disabled after sale');

    // Attempting to sell or save again should be blocked (no double claim)
    await app.run('sellCurrentPlate()');
    assert.equal(app.run('balance'), initialBalance + calculatedPrice, 'Balance should not change on second call');
    await app.run('savePlate()');
    assert.equal(app.run('inventory.length'), 0, 'Cannot save after already selling');
});

test('Generator Sell Direct in online mode: claims server draft and sells directly', async () => {
    const app = createApp();
    const serverPlate = { id: 'plate_srv_999', text: 'У 777 УУ | 77 RUS', price: 650000, rarity: { text: 'Легендарный' } };

    app.run(`
        setOnlineProfile({ nickname: nickname, balance: 49100, inventory: [] });
        boardHasLetters = true; boardHasNumbers = true; isSpinning = false;
        hasSpunLetSinceSave = true; hasSpunNumSinceSave = true;
        mustSpinBothForNextSave = true;
        checkCanSaveButton();
    `);

    app.context.fetch = async () => ({
        ok: true,
        json: async () => ({
            ok: true,
            profile: { nickname: app.run('nickname'), balance: 49100, inventory: [serverPlate] },
            plate: serverPlate
        })
    });

    const beforeBalance = app.run('balance');
    await app.run('sellCurrentPlate()');

    assert.equal(app.run('balance'), beforeBalance + serverPlate.price);
    assert.equal(app.run('onlineProfile.inventory.length'), 0, 'Plate should be claimed and then sold from inventory');
    assert.equal(app.context.document.getElementById('btn-save').disabled, true);
    assert.equal(app.context.document.getElementById('btn-sell-direct').disabled, true);
});
