'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('Secret Cases (federal_box, sheikh_royal_box, ussr_gost_box) & 3D Loot Reveal Showcase', () => {
    const app = createApp();
    const { context } = app;
    const document = context.document;

    // 1. Verify caseConfigs has all 3 secret cases
    const configs = context.window.caseConfigs;
    assert.ok(configs.federal_box, 'federal_box must exist in caseConfigs');
    assert.equal(configs.federal_box.price, 450000);
    assert.equal(configs.federal_box.fixedCountry, 'RUS');
    assert.equal(configs.federal_box.specialCaseMode, 'federal');

    assert.ok(configs.sheikh_royal_box, 'sheikh_royal_box must exist in caseConfigs');
    assert.equal(configs.sheikh_royal_box.price, 850000);
    assert.equal(configs.sheikh_royal_box.fixedCountry, 'UAE');
    assert.equal(configs.sheikh_royal_box.specialCaseMode, 'sheikh_royal');

    assert.ok(configs.ussr_gost_box, 'ussr_gost_box must exist in caseConfigs');
    assert.equal(configs.ussr_gost_box.price, 380000);
    assert.equal(configs.ussr_gost_box.fixedCountry, 'RUS');
    assert.equal(configs.ussr_gost_box.specialCaseMode, 'ussr_gost');

    // 2. Verify rollSpecialCasePlate produces authentic plates per case & tier
    const fedUltra = context.window.rollSpecialCasePlate('federal_box', 'Ультра-спец', 0);
    assert.equal(fedUltra.country, 'RUS');
    assert.ok(fedUltra.price >= 10000000, `Expected federal ultra-special price >= 10M, got ${fedUltra.price}`);
    assert.match(fedUltra.text, /RUS$/);

    const sheikhMythic = context.window.rollSpecialCasePlate('sheikh_royal_box', 'Мифический', 0);
    assert.equal(sheikhMythic.country, 'UAE');
    assert.equal(sheikhMythic.text, 'P 7 | DXB UAE');
    assert.ok(sheikhMythic.price >= 15000000, `Expected Sheikh 1-digit price >= 15M, got ${sheikhMythic.price}`);

    const sheikhLegend = context.window.rollSpecialCasePlate('sheikh_royal_box', 'Легендарный', 0);
    assert.equal(sheikhLegend.country, 'UAE');
    assert.equal(sheikhLegend.text, 'AA 11 | DXB UAE');
    assert.ok(sheikhLegend.price >= 9500000, `Expected Sheikh Twin 2-digit price >= 9.5M, got ${sheikhLegend.price}`);

    const ussrUltra = context.window.rollSpecialCasePlate('ussr_gost_box', 'Ультра-спец', 0);
    assert.equal(ussrUltra.country, 'RUS');
    assert.equal(ussrUltra.text, 'М 001 ОС | 77 RUS');
    assert.ok(ussrUltra.price >= 10000000);

    // 3. Verify openCasePreview and instant buyCase work for all 3 secret cases and trigger 3D loot showcase
    context.window.setCaseAnimMode('instant');
    app.run('balance = 10000000; if (onlineProfile) onlineProfile.balance = 10000000;');

    for (const caseKey of ['federal_box', 'sheikh_royal_box', 'ussr_gost_box']) {
        context.window.openCasePreview(caseKey);
        const previewList = document.getElementById('case-preview-list');
        assert.ok(previewList.innerHTML.length > 50, `Preview list for ${caseKey} should be populated`);

        const invBefore = app.run('inventory.length');
        context.window.quickOpenCase(caseKey, 1);
        const invAfter = app.run('inventory.length');
        assert.equal(invAfter, invBefore + 1, `Opening ${caseKey} must add 1 plate to inventory`);
    }

    // 4. Verify triggerLoot3DShowcase updates DOM FX elements
    context.window.triggerLoot3DShowcase(sheikhMythic);
    const fxEl = document.getElementById('roulette-3d-loot-fx');
    const sparksEl = document.getElementById('roulette-3d-sparks');
    const bannerEl = document.getElementById('roulette-3d-tier-banner');
    const tiltStage = document.getElementById('roulette-3d-tilt-stage');

    assert.equal(fxEl.dataset.lootTier, 'mythic');
    assert.ok(fxEl.classList.contains('loot-fx-active'));
    assert.ok(sparksEl.innerHTML.includes('loot-3d-spark'), 'Sparks container must contain 3D spark elements');
    assert.ok(!bannerEl.classList.contains('hidden'), 'Mythic drop must show tier banner');
    assert.ok(tiltStage.classList.contains('loot-3d-pop-active'), 'Tilt stage must have 3D pop-in class');
});
