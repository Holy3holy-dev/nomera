'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');
const core = require('../netlify/functions/lib/online-core.cjs');

test('guest mode allows changing region via input or custom value and recalculates plate', () => {
    const app = createApp();
    assert.equal(app.run('currentReg'), '777');

    // Open region editor and change to 77 via input
    app.run('changeRegion()');
    app.run("document.getElementById('region-edit-input').value = '77'");
    app.run('saveRegionEdit()');
    assert.equal(app.run('currentReg'), '77');
    assert.equal(app.run("document.getElementById('region').innerText"), '77');

    // Change to 95 via chip argument
    app.run("saveRegionEdit('95')");
    assert.equal(app.run('currentReg'), '95');
    assert.equal(app.run("document.getElementById('region').innerText"), '95');

    // Invalid region is rejected
    app.run("document.getElementById('region-edit-input').value = '9'");
    app.run('saveRegionEdit()');
    assert.equal(app.run('currentReg'), '95'); // not changed

    app.run("document.getElementById('region-edit-input').value = 'abcd'");
    app.run('saveRegionEdit()');
    assert.equal(app.run('currentReg'), '95'); // not changed
});

test('online mode allows changing region without blocking and syncs with server draft', async () => {
    const app = createApp();
    app.run(`
        setOnlineProfile({ nickname: nickname, balance: 50000, inventory: [], myCars: [], draft: { letters: ['А','В','Е'], num: '777', reg: '777', hasNumbers: true, hasLetters: true, changedNumbers: true, changedLetters: true } });
        boardHasLetters = true;
        boardHasNumbers = true;
    `);

    let setRegionCalled = false;
    let claimedRegion = null;
    app.context.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        if (body.action === 'setRegion') {
            setRegionCalled = true;
            assert.equal(body.region, '78');
            return {
                ok: true,
                json: async () => ({
                    ok: true,
                    profile: app.run('onlineProfile'),
                    draft: { ...app.run('onlineProfile.draft'), reg: '78' }
                })
            };
        }
        if (body.action === 'claim') {
            const reg = app.run('onlineProfile.draft.reg');
            const p = { id: 'plate_test_78', text: `А 777 ВЕ | ${reg} RUS`, price: 50000, rarity: { text: 'Редкий' } };
            return {
                ok: true,
                json: async () => ({
                    ok: true,
                    profile: { ...app.run('onlineProfile'), inventory: [p] },
                    plate: p
                })
            };
        }
        return { ok: true, json: async () => ({ ok: true }) };
    };

    // Change region when board already has letters and numbers
    app.run("saveRegionEdit('78')");
    assert.equal(setRegionCalled, true);
    assert.equal(app.run('currentReg'), '78');
    assert.equal(app.run('onlineProfile.draft.reg'), '78');

    // Claim plate
    await app.run('savePlate()');
    assert.equal(app.run('onlineProfile.inventory.length'), 1);
    assert.match(app.run('onlineProfile.inventory[0].text'), /78 RUS/);
});

test('server core mutation supports setRegion and claim with region', () => {
    const state = {
        accounts: {
            user1: {
                nickname: 'User 1',
                balance: 10000,
                inventory: [],
                draft: {
                    letters: ['А','А','А'],
                    num: '777',
                    reg: '777',
                    hasNumbers: true,
                    hasLetters: true,
                    changedNumbers: true,
                    changedLetters: true
                }
            }
        },
        market: {}
    };

    // Test setRegion mutation
    const state2 = core.mutate(state, 'setRegion', 'user1', { region: '16' });
    assert.equal(state2.accounts.user1.draft.reg, '16');

    // Test setRegion rejects invalid region
    assert.throws(() => core.mutate(state2, 'setRegion', 'user1', { region: '1' }), /регион/i);
    assert.throws(() => core.mutate(state2, 'setRegion', 'user1', { region: '9999' }), /регион/i);

    // Test claim with explicit region
    const state3 = core.mutate(state2, 'claim', 'user1', { plateId: 'plate_custom_95', region: '95' });
    assert.equal(state3.accounts.user1.inventory.length, 1);
    assert.match(state3.accounts.user1.inventory[0].text, /95 RUS/);
    assert.equal(state3.accounts.user1.draft.reg, '95');
});
