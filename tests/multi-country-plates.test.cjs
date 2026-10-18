'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../netlify/functions/lib/online-core.cjs');

function makeState(balance = 100000) {
  return {
    accounts: {
      racer: {
        nickname: 'Racer',
        balance,
        inventory: [],
        myCars: []
      },
      buyer: {
        nickname: 'Buyer',
        balance: 50000000,
        inventory: [],
        myCars: []
      }
    },
    market: {},
    chat: {}
  };
}

test('COUNTRIES configuration and spin costs for RUS, KZ, USA, UAE', () => {
  assert.ok(c.COUNTRIES);
  assert.equal(c.COUNTRIES.RUS.spinCostBoth, 900);
  assert.equal(c.COUNTRIES.RUS.spinCostPart, 500);
  assert.equal(c.COUNTRIES.KZ.spinCostBoth, 1800);
  assert.equal(c.COUNTRIES.KZ.spinCostPart, 1000);
  assert.equal(c.COUNTRIES.USA.spinCostBoth, 3500);
  assert.equal(c.COUNTRIES.USA.spinCostPart, 2000);
  assert.equal(c.COUNTRIES.UAE.spinCostBoth, 9000);
  assert.equal(c.COUNTRIES.UAE.spinCostPart, 5000);
});

test('safePlate accepts authentic and legacy RUS, KZ, USA, UAE plates and rejects invalid formats', () => {
  // Authentic formats
  assert.equal(c.safePlate({ text: 'А 777 АА | 777 RUS', price: 50000 }, 'p1').text, 'А 777 АА | 777 RUS');
  assert.equal(c.safePlate({ text: '777 VIP | 01 KZ', price: 150000 }, 'p2').text, '777 VIP | 01 KZ');
  assert.equal(c.safePlate({ text: 'VIP 777 | CA USA', price: 300000 }, 'p3').text, 'VIP 777 | CA USA');
  assert.equal(c.safePlate({ text: 'D 1 | DXB UAE', price: 900000 }, 'p4').text, 'D 1 | DXB UAE');
  assert.equal(c.safePlate({ text: 'AA 777 | DXB UAE', price: 900000 }, 'p4_aa').text, 'AA 777 | DXB UAE');
  assert.equal(c.safePlate({ text: 'B 77 | AUH UAE', price: 900000 }, 'p4_auh').text, 'B 77 | AUH UAE');

  // Legacy formats
  assert.equal(c.safePlate({ text: 'V 777 IP | 01 KZ', price: 150000 }, 'p2_leg').text, 'V 777 IP | 01 KZ');
  assert.equal(c.safePlate({ text: 'V 777 IP | CA USA', price: 300000 }, 'p3_leg').text, 'V 777 IP | CA USA');
  assert.equal(c.safePlate({ text: 'DXB 001 | DXB UAE', price: 900000 }, 'p4_leg3').text, 'DXB 001 | DXB UAE');
  assert.equal(c.safePlate({ text: 'D 001 XB | DXB UAE', price: 900000 }, 'p4_leg').text, 'D 001 XB | DXB UAE');

  // formatPlateText helper
  assert.equal(c.formatPlateText('А', 'А', 'А', '777', '777', 'RUS'), 'А 777 АА | 777 RUS');
  assert.equal(c.formatPlateText('V', 'I', 'P', '777', '01', 'KZ'), '777 VIP | 01 KZ');
  assert.equal(c.formatPlateText('V', 'I', 'P', '777', 'CA', 'USA'), 'VIP 777 | CA USA');
  assert.equal(c.formatPlateText('D', 'X', 'B', '001', 'DXB', 'UAE'), 'D 1 | DXB UAE');
  assert.equal(c.formatPlateText('A', 'A', 'A', '777', 'DXB', 'UAE'), 'AA 777 | DXB UAE');

  assert.throws(() => c.safePlate({ text: 'local_item', price: 1000 }, 'bad1'), /формат/);
  assert.throws(() => c.safePlate({ text: 'A 777 AA | 77 GER', price: 1000 }, 'bad2'), /формат/);
  assert.throws(() => c.safePlate({ text: 'AB 777 AA | DXB UAE', price: 1000 }, 'bad3'), /формат/);
});

test('priceOfPlate scales by country multiplier and rewards country-specific elite combinations', () => {
  const rusSimple = c.priceOfPlate('А', 'В', 'Е', '124', '77', 'RUS');
  const kzSimple = c.priceOfPlate('A', 'B', 'E', '124', '05', 'KZ');
  const usaSimple = c.priceOfPlate('A', 'B', 'E', '124', 'TX', 'USA');
  const uaeSimple = c.priceOfPlate('A', 'B', 'E', '124', 'SHJ', 'UAE');

  assert(kzSimple > rusSimple, 'KZ simple plate should cost more than RUS');
  assert(usaSimple > kzSimple, 'USA simple plate should cost more than KZ');
  assert(uaeSimple > usaSimple, 'UAE simple plate should cost more than USA');

  // Elite combinations: DXB 001 | DXB UAE, VIP 777 | CA USA, 777 VIP | 01 KZ
  const uaeElite = c.priceOfPlate('D', 'X', 'B', '001', 'DXB', 'UAE');
  const uaeNonElite = c.priceOfPlate('B', 'C', 'D', '124', 'SHJ', 'UAE');
  assert(uaeElite > 50000000, `Expected UAE DXB 001 | DXB to be ultra-valuable, got ${uaeElite}`);
  assert(uaeElite > uaeNonElite * 10);

  const usaElite = c.priceOfPlate('V', 'I', 'P', '777', 'CA', 'USA');
  const usaNonElite = c.priceOfPlate('B', 'C', 'D', '124', 'OH', 'USA');
  assert(usaElite > 20000000, `Expected USA VIP 777 | CA to be ultra-valuable, got ${usaElite}`);
  assert(usaElite > usaNonElite * 10);

  const kzElite = c.priceOfPlate('V', 'I', 'P', '777', '01', 'KZ');
  const kzNonElite = c.priceOfPlate('B', 'C', 'D', '124', '09', 'KZ');
  assert(kzElite > 10000000, `Expected KZ 777 VIP | 01 to be ultra-valuable, got ${kzElite}`);
  assert(kzElite > kzNonElite * 10);
});

test('mutate roll, setRegion, claim, and sell work end-to-end with authentic plate formats for KZ, USA, and UAE', () => {
  // 1. KZ flow
  let s = makeState(100000);
  const kzRoll = c.secureRoll('both', 0, 'KZ');
  assert.equal(kzRoll.country, 'KZ');
  assert.equal(kzRoll.letters.length, 3);
  assert(kzRoll.letters.every(l => c.COUNTRIES.KZ.letters.includes(l)));

  s = c.mutate(s, 'roll', 'racer', { roll: kzRoll, region: '01', country: 'KZ' }, 1000);
  assert.equal(s.accounts.racer.balance, 100000 - 1800);
  assert.equal(s.accounts.racer.draft.country, 'KZ');
  assert.equal(s.accounts.racer.draft.reg, '01');

  s = c.mutate(s, 'setRegion', 'racer', { region: '02', country: 'KZ' }, 1100);
  assert.equal(s.accounts.racer.draft.reg, '02');

  s = c.mutate(s, 'claim', 'racer', { plateId: 'plate_kz_1' }, 1200);
  assert.equal(s.accounts.racer.inventory.length, 1);
  assert.match(s.accounts.racer.inventory[0].text, /^\d{3} [A-Z]{3} \| 02 KZ$/);

  // 2. USA flow (partial spins + setRegion + claim + sell)
  const usaNumRoll = c.secureRoll('numbers', 0, 'USA');
  s = c.mutate(s, 'roll', 'racer', { roll: usaNumRoll, region: 'CA', country: 'USA' }, 2000);
  assert.equal(s.accounts.racer.balance, 100000 - 1800 - 2000);
  assert.equal(s.accounts.racer.draft.country, 'USA');

  const usaLetRoll = c.secureRoll('letters', 0, 'USA');
  s = c.mutate(s, 'roll', 'racer', { roll: usaLetRoll, region: 'CA', country: 'USA' }, 2100);
  assert.equal(s.accounts.racer.balance, 100000 - 1800 - 4000);

  s = c.mutate(s, 'setRegion', 'racer', { region: 'NY', country: 'USA' }, 2200);
  assert.equal(s.accounts.racer.draft.reg, 'NY');

  s = c.mutate(s, 'claim', 'racer', { plateId: 'plate_usa_1' }, 2300);
  assert.equal(s.accounts.racer.inventory.length, 2);
  assert.match(s.accounts.racer.inventory[0].text, /^[A-Z]{3} \d{3} \| NY USA$/);

  // 3. UAE flow (full spin + setRegion + claim + sell + buy)
  const uaeRoll = { mode: 'both', country: 'UAE', num: '001', letters: ['D', 'X', 'B'] };
  s = c.mutate(s, 'roll', 'racer', { roll: uaeRoll, region: 'AUH', country: 'UAE' }, 3000);
  assert.equal(s.accounts.racer.balance, 100000 - 1800 - 4000 - 9000);
  assert.equal(s.accounts.racer.draft.country, 'UAE');
  assert.equal(s.accounts.racer.draft.reg, 'AUH');

  s = c.mutate(s, 'setRegion', 'racer', { region: 'DXB', country: 'UAE' }, 3100);
  assert.equal(s.accounts.racer.draft.reg, 'DXB');

  s = c.mutate(s, 'claim', 'racer', { plateId: 'plate_uae_1' }, 3200);
  assert.equal(s.accounts.racer.inventory[0].text, 'D 1 | DXB UAE');
  assert.equal(s.accounts.racer.inventory[0].price, c.priceOfPlate('D', 'X', 'B', '001', 'DXB', 'UAE'));

  // Sell UAE plate on market and buy it with buyer account
  s = c.mutate(s, 'sell', 'racer', { plateId: 'plate_uae_1', lotId: 'lot_uae_1234567890', price: 25000000 }, 3300);
  assert.equal(s.market.lot_uae_1234567890.plate.text, 'D 1 | DXB UAE');

  s = c.mutate(s, 'buy', 'buyer', { lotId: 'lot_uae_1234567890' }, 3400);
  assert.equal(s.accounts.buyer.inventory[0].text, 'D 1 | DXB UAE');
});

test('Backend blocks country-switch price arbitrage exploit via setRegion or claim', () => {
  // Exploit vector 1: Roll in RUS for 900 ₽, then call setRegion to switch to UAE, then claim
  let s = makeState(100000);
  const rusRoll = { mode: 'both', country: 'RUS', num: '777', letters: ['А', 'А', 'А'] };
  s = c.mutate(s, 'roll', 'racer', { roll: rusRoll, region: '777', country: 'RUS' }, 1000);
  assert.equal(s.accounts.racer.balance, 100000 - 900);
  assert.equal(s.accounts.racer.draft.hasNumbers, true);
  assert.equal(s.accounts.racer.draft.hasLetters, true);

  s = c.mutate(s, 'setRegion', 'racer', { region: 'DXB', country: 'UAE' }, 1100);
  assert.equal(s.accounts.racer.draft.country, 'UAE');
  assert.equal(s.accounts.racer.draft.reg, 'DXB');
  assert.equal(s.accounts.racer.draft.hasNumbers, false);
  assert.equal(s.accounts.racer.draft.hasLetters, false);
  assert.equal(s.accounts.racer.draft.changedNumbers, false);
  assert.equal(s.accounts.racer.draft.changedLetters, false);
  assert.equal(s.accounts.racer.draft.num, '---');
  assert.deepEqual(s.accounts.racer.draft.letters, ['-', '-', '-']);

  assert.throws(
    () => c.mutate(s, 'claim', 'racer', { plateId: 'exploit_1' }, 1200),
    /Сначала прокрутите/
  );

  // Exploit vector 2: Roll in RUS for 900 ₽, then directly call claim with country='UAE'
  let s2 = makeState(100000);
  s2 = c.mutate(s2, 'roll', 'racer', { roll: rusRoll, region: '777', country: 'RUS' }, 2000);
  assert.throws(
    () => c.mutate(s2, 'claim', 'racer', { plateId: 'exploit_2', country: 'UAE', region: 'DXB' }, 2100),
    /Сначала прокрутите/
  );
});

test('Frontend selectPlateCountry switches country, spin costs, regions, and blocks country-switch price arbitrage', () => {
  const { createApp } = require('./helpers/create-app.cjs');
  const app = createApp();

  // Default is RUS
  assert.equal(app.run('currentCountry'), 'RUS');
  assert.equal(app.run('currentReg'), '777');

  // Switch to USA
  app.run("selectPlateCountry('USA')");
  assert.equal(app.run('currentCountry'), 'USA');
  assert.equal(app.run('currentReg'), 'CA');
  assert.match(app.run("document.getElementById('spin-cost-both').innerText"), /3\s*500\s*₽/);
  assert.match(app.run("document.getElementById('spin-cost-num').innerText"), /2\s*000\s*₽/);

  // Switch region to NY in USA mode
  app.run("saveRegionEdit('ny')");
  assert.equal(app.run('currentReg'), 'NY');

  // Switch to UAE (Dubai)
  app.run("selectPlateCountry('UAE')");
  assert.equal(app.run('currentCountry'), 'UAE');
  assert.equal(app.run('currentReg'), 'DXB');
  assert.match(app.run("document.getElementById('spin-cost-both').innerText"), /9\s*000\s*₽/);

  // Compare prices for identical combinations across countries
  const rusPrice = app.run("getCalculatedPrice('А', 'А', 'А', '777', '777', 'RUS')");
  const kzPrice = app.run("getCalculatedPrice('A', 'A', 'A', '777', '01', 'KZ')");
  const usaPrice = app.run("getCalculatedPrice('A', 'A', 'A', '777', 'CA', 'USA')");
  const uaePrice = app.run("getCalculatedPrice('A', 'A', 'A', '777', 'DXB', 'UAE')");

  assert.ok(kzPrice > rusPrice, `KZ price (${kzPrice}) should exceed RUS price (${rusPrice})`);
  assert.ok(usaPrice > kzPrice, `USA price (${usaPrice}) should exceed KZ price (${kzPrice})`);
  assert.ok(uaePrice > usaPrice, `UAE price (${uaePrice}) should exceed USA price (${uaePrice})`);

  // Anti-arbitrage test on frontend: spin in RUS, then switch to UAE -> spin state resets and save/sell are disabled
  app.run("selectPlateCountry('RUS')");
  app.run(`
    currentL1 = 'А'; currentL2 = 'А'; currentL3 = 'А'; currentNum = '777';
    boardHasLetters = true; boardHasNumbers = true;
    hasSpunLetSinceSave = true; hasSpunNumSinceSave = true;
    checkCanSaveButton();
  `);
  assert.equal(app.run("document.getElementById('btn-save').disabled"), false);
  assert.equal(app.run("document.getElementById('btn-sell-direct').disabled"), false);

  const balanceBefore = app.run('balance');
  const invLenBefore = app.run('inventory.length');

  // Attempt to switch country to UAE after rolling in RUS
  app.run("selectPlateCountry('UAE')");
  assert.equal(app.run('boardHasLetters'), false);
  assert.equal(app.run('boardHasNumbers'), false);
  assert.equal(app.run('hasSpunLetSinceSave'), false);
  assert.equal(app.run('hasSpunNumSinceSave'), false);
  assert.equal(app.run('currentNum'), '---');
  assert.equal(app.run('currentL1'), '-');
  assert.equal(app.run("document.getElementById('btn-save').disabled"), true);
  assert.equal(app.run("document.getElementById('btn-sell-direct').disabled"), true);

  // Attempt to call sellCurrentPlate() and savePlate() after switching country
  app.run('sellCurrentPlate()');
  app.run('savePlate()');
  assert.equal(app.run('balance'), balanceBefore);
  assert.equal(app.run('inventory.length'), invLenBefore);
});

test('Frontend cases adapt prices and plate pools by country and support dedicated international boxes', () => {
  const { createApp } = require('./helpers/create-app.cjs');
  const app = createApp();

  // Base RUS prices
  assert.equal(app.run("getCaseEffectivePrice('normal', 'RUS')"), 5000);
  assert.equal(app.run("getCaseEffectivePrice('super', 'RUS')"), 50000);
  assert.equal(app.run("getCaseEffectivePrice('mega', 'RUS')"), 200000);

  // KZ (x1.8) prices
  assert.equal(app.run("getCaseEffectivePrice('normal', 'KZ')"), 9000);
  assert.equal(app.run("getCaseEffectivePrice('super', 'KZ')"), 90000);
  assert.equal(app.run("getCaseEffectivePrice('mega', 'KZ')"), 360000);

  // USA (x3.5) prices
  assert.equal(app.run("getCaseEffectivePrice('normal', 'USA')"), 17500);
  assert.equal(app.run("getCaseEffectivePrice('super', 'USA')"), 175000);
  assert.equal(app.run("getCaseEffectivePrice('mega', 'USA')"), 700000);

  // UAE (x8.0) prices
  assert.equal(app.run("getCaseEffectivePrice('normal', 'UAE')"), 40000);
  assert.equal(app.run("getCaseEffectivePrice('super', 'UAE')"), 400000);
  assert.equal(app.run("getCaseEffectivePrice('mega', 'UAE')"), 1600000);

  // Dedicated international VIP boxes have fixed prices and fixed countries
  assert.equal(app.run("getCaseEffectivePrice('kz_box', 'RUS')"), 45000);
  assert.equal(app.run("getCaseEffectivePrice('usa_box', 'RUS')"), 110000);
  assert.equal(app.run("getCaseEffectivePrice('uae_box', 'RUS')"), 320000);

  // Switching case country updates DOM price labels and generates country-specific plates
  app.run("selectCaseCountry('UAE')");
  assert.equal(app.run('currentCaseCountry'), 'UAE');
  assert.match(app.run("document.getElementById('case-price-normal').innerText"), /40\s*000\s*₽/);
  assert.match(app.run("document.getElementById('case-price-super').innerText"), /400\s*000\s*₽/);
  assert.match(app.run("document.getElementById('case-price-mega').innerText"), /1\s*600\s*000\s*₽/);

  const uaePlate = app.run("forcePlate('Легендарный', 'UAE')");
  assert.equal(uaePlate.country, 'UAE');
  assert.match(uaePlate.text, /^[A-Z]{1,2} \d{1,5} \| [A-Z0-9]{1,3} UAE$/);
  assert.ok(uaePlate.price > 500000);

  const kzPlate = app.run("forcePlate('Эпический', 'KZ')");
  assert.equal(kzPlate.country, 'KZ');
  assert.match(kzPlate.text, /^\d{3} [A-Z]{3} \| \d{2} KZ$/);

  const usaPlate = app.run("forcePlate('Мифический', 'USA')");
  assert.equal(usaPlate.country, 'USA');
  assert.match(usaPlate.text, /^[A-Z]{3} \d{3} \| [A-Z]{2} USA$/);

  // Authentic mini-plate rendering for RUS, KZ, USA, and UAE
  const rusMiniHtml = app.run("renderMiniPlateInnerHtml('А 777 АА | 777 RUS')");
  assert.match(rusMiniHtml, /777/);
  assert.match(rusMiniHtml, /RUS/);

  const kzMiniHtml = app.run("renderMiniPlateInnerHtml('777 VIP | 01 KZ')");
  assert.match(kzMiniHtml, /777/);
  assert.match(kzMiniHtml, /VIP/);
  assert.match(kzMiniHtml, /KZ/);
  assert.match(kzMiniHtml, /01/);

  const usaMiniHtml = app.run("renderMiniPlateInnerHtml('VIP 777 | CA USA')");
  assert.match(usaMiniHtml, /VIP/);
  assert.match(usaMiniHtml, /777/);
  assert.match(usaMiniHtml, /CA|CALIFORNIA/i);

  const uaeMiniHtml = app.run("renderMiniPlateInnerHtml('D 1 | DXB UAE')");
  assert.match(uaeMiniHtml, /DUBAI|DXB/i);
  assert.match(uaeMiniHtml, />D</);
  assert.match(uaeMiniHtml, />1</);
});

test('parsePlate and priceOfPlate support authentic formatted KZ, USA, and UAE strings', () => {
  const kzParsed = c.parsePlate('777 AAA | 01 KZ');
  assert.ok(kzParsed);
  assert.equal(kzParsed.country, 'KZ');
  assert.equal(kzParsed.l1, 'A');
  assert.equal(kzParsed.l2, 'A');
  assert.equal(kzParsed.l3, 'A');
  assert.equal(kzParsed.digits, '777');
  assert.equal(kzParsed.region, '01');
  assert.equal(c.priceOfPlate(kzParsed), c.priceOfPlate('A', 'A', 'A', '777', '01', 'KZ'));
  assert.ok(c.priceOfPlate(kzParsed) > 10000000);

  const usaParsed = c.parsePlate('VIP-777 | CA USA');
  assert.ok(usaParsed);
  assert.equal(usaParsed.country, 'USA');
  assert.equal(usaParsed.l1, 'V');
  assert.equal(usaParsed.l2, 'I');
  assert.equal(usaParsed.l3, 'P');
  assert.equal(usaParsed.digits, '777');
  assert.equal(usaParsed.region, 'CA');
  assert.equal(c.priceOfPlate(usaParsed), c.priceOfPlate('V', 'I', 'P', '777', 'CA', 'USA'));
  assert.ok(c.priceOfPlate(usaParsed) > 20000000);

  const uaeD1 = c.parsePlate('D 1 | DXB UAE');
  assert.ok(uaeD1);
  assert.equal(uaeD1.country, 'UAE');
  assert.equal(uaeD1.l1, 'D');
  assert.equal(uaeD1.l2, 'X');
  assert.equal(uaeD1.l3, 'Z');
  assert.equal(uaeD1.digits, '001');
  assert.equal(uaeD1.region, 'DXB');
  assert.ok(c.priceOfPlate(uaeD1) > 5000000, `Expected D 1 | DXB UAE > 5,000,000, got ${c.priceOfPlate(uaeD1)}`);

  const uaeD7 = c.parsePlate('D 7 | DXB UAE');
  assert.ok(uaeD7);
  assert.equal(uaeD7.digits, '007');
  assert.ok(c.priceOfPlate(uaeD7) > 10000000);
  assert.ok(c.priceOfPlate(uaeD1) > c.priceOfPlate(uaeD7));

  const uaeD77 = c.parsePlate('D 77 | DXB UAE');
  assert.ok(uaeD77);
  assert.equal(uaeD77.digits, '077');
  assert.ok(c.priceOfPlate(uaeD77) > 3000000);
  assert.ok(c.priceOfPlate(uaeD7) > c.priceOfPlate(uaeD77));

  const uaeAA777 = c.parsePlate('AA 777 | DXB UAE');
  assert.ok(uaeAA777);
  assert.equal(uaeAA777.l1, 'A');
  assert.equal(uaeAA777.l2, 'A');
  assert.equal(uaeAA777.l3, 'A');
  assert.equal(uaeAA777.digits, '777');
  assert.equal(uaeAA777.region, 'DXB');
  assert.equal(c.priceOfPlate(uaeAA777), c.priceOfPlate('A', 'A', 'A', '777', 'DXB', 'UAE'));
  assert.ok(c.priceOfPlate(uaeAA777) > 10000000);
});

test('UAE 1-digit and 2-digit plates receive Dubai auction pricing and rarity, and ignore hidden l2/l3 mirror/pair letters', () => {
  // 1-digit ('005' -> '5') and 2-digit ('077' -> '77') UAE plates get high-value pricing & rarity
  assert.equal(c.formatPlateText('D', 'X', 'Z', '005', 'DXB', 'UAE'), 'D 5 | DXB UAE');
  assert.equal(c.formatPlateText('D', 'X', 'Z', '077', 'DXB', 'UAE'), 'D 77 | DXB UAE');

  const uae1Digit = c.priceOfPlate('D', 'X', 'Z', '005', 'DXB', 'UAE');
  const uae2DigitTwin = c.priceOfPlate('D', 'X', 'Z', '077', 'DXB', 'UAE');
  const uae2DigitRound = c.priceOfPlate('D', 'X', 'Z', '020', 'DXB', 'UAE');
  const uae2DigitOther = c.priceOfPlate('D', 'X', 'Z', '023', 'DXB', 'UAE');
  const uae3DigitPlain = c.priceOfPlate('D', 'X', 'Z', '124', 'DXB', 'UAE');

  assert.ok(uae1Digit > 10000000, `Expected 1-digit UAE plate ('005') > 10M, got ${uae1Digit}`);
  assert.equal(c.rarityOfPrice(uae1Digit), 'БЛАТНОЙ');

  assert.ok(uae2DigitTwin > 3000000, `Expected 2-digit twin UAE plate ('077') > 3M, got ${uae2DigitTwin}`);
  assert.ok(['Крутой', 'БЛАТНОЙ'].includes(c.rarityOfPrice(uae2DigitTwin)));

  assert.ok(uae1Digit > uae2DigitTwin);
  assert.ok(uae2DigitTwin > uae2DigitRound);
  assert.ok(uae2DigitRound > uae2DigitOther);
  assert.ok(uae2DigitOther > uae3DigitPlain);

  // Two UAE plates with the same visible 1-letter code (['D','A','D'] vs ['D','X','Z']) produce the exact same price
  assert.equal(
    c.formatPlateText('D', 'A', 'D', '005', 'DXB', 'UAE'),
    c.formatPlateText('D', 'X', 'Z', '005', 'DXB', 'UAE')
  );
  assert.equal(
    c.priceOfPlate('D', 'A', 'D', '005', 'DXB', 'UAE'),
    c.priceOfPlate('D', 'X', 'Z', '005', 'DXB', 'UAE')
  );
  assert.equal(
    c.priceOfPlate(['D', 'A', 'D'], '077', 'DXB', 'UAE'),
    c.priceOfPlate(['D', 'X', 'Z'], '077', 'DXB', 'UAE')
  );
  assert.equal(
    c.priceOfPlate('D', 'A', 'D', '124', 'SHJ', 'UAE'),
    c.priceOfPlate('D', 'X', 'Z', '124', 'SHJ', 'UAE')
  );
});

const { describe } = test;

function setup3DPlateTestEnv() {
  const drawnTexts = [];

  function makeMockCanvas() {
    const ctxTarget = {
      fillStyle: '#ffffff',
      strokeStyle: '#000000',
      font: '16px sans-serif',
      lineWidth: 1,
      textAlign: 'center',
      textBaseline: 'middle'
    };
    const ctx = new Proxy(ctxTarget, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop === 'fillText' || prop === 'strokeText') {
          return (str, x, y) => {
            drawnTexts.push({ text: String(str), x, y });
          };
        }
        if (prop === 'measureText') {
          return (str) => ({ width: String(str || '').length * 14 });
        }
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop() {} });
        }
        return () => {};
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });

    return {
      width: 512,
      height: 128,
      style: {},
      classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
      getContext: () => ctx,
      addEventListener() {},
      removeEventListener() {},
      appendChild() {},
      removeChild() {},
      innerHTML: ''
    };
  }

  const domElementMock = makeMockCanvas();
  global.window = global;
  global.self = global;
  global.addEventListener = () => {};
  global.removeEventListener = () => {};
  global.document = {
    createElement: () => makeMockCanvas(),
    createElementNS: () => makeMockCanvas(),
    getElementById: () => domElementMock,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    head: { appendChild: () => {} }
  };
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'NodeTest' },
    writable: true,
    configurable: true
  });
  global.requestAnimationFrame = (cb) => {
    const t = setTimeout(() => cb(Date.now()), 16);
    if (t && t.unref) t.unref();
    return t;
  };
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  const THREE = require('../js/vendor/three.min.js');
  THREE.WebGLRenderer = class MockRenderer {
    constructor() {
      this.domElement = makeMockCanvas();
      this.shadowMap = { enabled: false };
      this.debug = { checkShaderErrors: false };
    }
    setPixelRatio() {}
    setSize() {}
    render() {}
    compile() {}
    getRenderTarget() { return null; }
    setRenderTarget() {}
    getClearColor() { return new THREE.Color(0x000000); }
    dispose() {}
    forceContextLoss() {}
  };
  global.THREE = THREE;

  delete require.cache[require.resolve('../js/car-3d.js')];
  const Car3DManager = require('../js/car-3d.js');

  return { THREE, Car3DManager, drawnTexts };
}

describe('3D Vehicle Bumper License Plates (RUS / KZ / USA / UAE)', () => {
  test('createLicensePlate builds authentic 3D plate groups with country dimensions, z-separation, and emissiveMap', () => {
    const { THREE, Car3DManager, drawnTexts } = setup3DPlateTestEnv();

    const getPlateFaceAndBack = (plateGroup) => {
      const meshes = plateGroup.children.filter(c => c && c.isMesh);
      const plateMesh = meshes.find(m => m.material && m.material.map) || meshes[0] || null;
      const backMesh = meshes.length > 1 ? meshes[meshes.length - 1] : null;
      return { plateMesh, backMesh };
    };

    const getMeshDims = (mesh) => {
      const params = (mesh && mesh.geometry && mesh.geometry.parameters) || {};
      if (params.width && params.height) {
        return { w: params.width, h: params.height };
      }
      const b = new THREE.Box3().setFromObject(mesh);
      const s = b.getSize(new THREE.Vector3());
      return { w: s.x, h: s.y };
    };

    // 1. Russian GOST plate ('А 777 АА | 77') -> standard Euro dimensions
    const rusPlate = Car3DManager.createLicensePlate('А 777 АА | 77', true, 'gold', 'classic');
    assert.ok(rusPlate && rusPlate.isGroup, 'RUS plate must be a THREE.Group');
    assert.equal(rusPlate.userData.isLicensePlate, true);
    assert.equal(rusPlate.userData.plateText, 'А 777 АА | 77');
    assert.equal(rusPlate.userData.frameStyle, 'gold');
    assert.equal(rusPlate.userData.plateStyle, 'classic');

    const { plateMesh: rusFace } = getPlateFaceAndBack(rusPlate);
    const rusDims = getMeshDims(rusFace);
    assert.ok(rusDims.w >= 0.47 && rusDims.w <= 0.53, `Expected Euro width ~0.48-0.52m, got ${rusDims.w}`);
    assert.ok(rusDims.h >= 0.105 && rusDims.h <= 0.12, `Expected Euro height ~0.11-0.115m, got ${rusDims.h}`);

    // 2. Kazakhstan plate ('777 AAA | 02 KZ') -> standard Euro dimensions
    const kzPlate = Car3DManager.createLicensePlate('777 AAA | 02 KZ', false, 'carbon', 'classic');
    assert.ok(kzPlate && kzPlate.isGroup, 'KZ plate must be a THREE.Group');
    assert.equal(kzPlate.userData.isLicensePlate, true);
    assert.equal(kzPlate.userData.plateText, '777 AAA | 02 KZ');
    assert.equal(kzPlate.userData.frameStyle, 'carbon');
    assert.equal(kzPlate.userData.plateStyle, 'classic');
    const { plateMesh: kzFace } = getPlateFaceAndBack(kzPlate);
    const kzDims = getMeshDims(kzFace);
    assert.ok(kzDims.w >= 0.47 && kzDims.w <= 0.53, `Expected KZ Euro width ~0.48-0.52m, got ${kzDims.w}`);
    assert.ok(kzDims.h >= 0.105 && kzDims.h <= 0.12, `Expected KZ Euro height ~0.11-0.115m, got ${kzDims.h}`);

    // 3. USA plate ('SPD 777 | CA USA') -> 2:1 North American dimensions (0.36 x 0.18)
    const usaPlate = Car3DManager.createLicensePlate('SPD 777 | CA USA', true, 'chrome', 'classic');
    assert.ok(usaPlate && usaPlate.isGroup, 'USA plate must be a THREE.Group');
    assert.equal(usaPlate.userData.isLicensePlate, true);
    assert.equal(usaPlate.userData.plateText, 'SPD 777 | CA USA');
    assert.equal(usaPlate.userData.frameStyle, 'chrome');
    assert.equal(usaPlate.userData.plateStyle, 'classic');
    const { plateMesh: usaFace } = getPlateFaceAndBack(usaPlate);
    const usaDims = getMeshDims(usaFace);
    assert.ok(Math.abs(usaDims.w - 0.36) < 0.01, `Expected USA width 0.36m, got ${usaDims.w}`);
    assert.ok(Math.abs(usaDims.h - 0.18) < 0.01, `Expected USA height 0.18m, got ${usaDims.h}`);

    // 4. UAE plates ('DXB A 7', 'AUH 01 88 | UAE', 'FUJ M 555 | UAE', 'UAQ B 123 | UAE')
    const uaeCases = [
      { text: 'DXB A 7', expectedHeader: /DUBAI|دبي/i },
      { text: 'AUH 01 88 | UAE', expectedHeader: /A\.D|ABU DHABI|أبوظبي/i },
      { text: 'FUJ M 555 | UAE', expectedHeader: /FUJAIRAH|الفجيرة/i },
      { text: 'UAQ B 123 | UAE', expectedHeader: /U\.A\.Q|أم القيوين/i }
    ];
    for (const { text: uaeText, expectedHeader } of uaeCases) {
      drawnTexts.length = 0;
      const uaePlate = Car3DManager.createLicensePlate(uaeText, true, 'neon', 'classic');
      assert.ok(uaePlate && uaePlate.isGroup, `UAE plate (${uaeText}) must be a THREE.Group`);
      assert.equal(uaePlate.userData.isLicensePlate, true);
      assert.equal(uaePlate.userData.plateText, uaeText);
      assert.equal(uaePlate.userData.frameStyle, 'neon');
      assert.equal(uaePlate.userData.plateStyle, 'classic');
      assert.ok(
        drawnTexts.some(d => expectedHeader.test(d.text)),
        `UAE plate (${uaeText}) must render emirate header matching ${expectedHeader}, got: ${drawnTexts.map(d => d.text).join(', ')}`
      );

      const { plateMesh, backMesh } = getPlateFaceAndBack(uaePlate);
      assert.ok(plateMesh && backMesh, `UAE plate (${uaeText}) must have face mesh and backing mesh`);
      const zSep = Math.abs(plateMesh.position.z - backMesh.position.z);
      assert.ok(
        zSep >= 0.01,
        `Expected non-zero z-separation >= 0.01m between plateMesh (${plateMesh.position.z}) and backing (${backMesh.position.z}) to prevent z-fighting, got ${zSep}`
      );
      assert.ok(
        plateMesh.material && plateMesh.material.emissiveMap,
        `UAE plate (${uaeText}) material must include emissiveMap for night-race visibility`
      );
    }
  });

  test('applyLicensePlateToModel mounts front and rear plates outside bumpers even with Trunk_Pivot rig and wide front bumper triangles', () => {
    const { THREE, Car3DManager } = setup3DPlateTestEnv();

    const findFrontPlate = (carGroup) => (
      carGroup.getObjectByName('LicensePlate_Front') ||
      carGroup.getObjectByName('GLB_FrontLicensePlate') ||
      carGroup.getObjectByName('FrontLicensePlate')
    );

    const findRearPlate = (carGroup) => (
      carGroup.getObjectByName('LicensePlate_Rear') ||
      carGroup.getObjectByName('GLB_RearLicensePlate') ||
      carGroup.getObjectByName('RearLicensePlate')
    );

    // Construct a 3D car model with:
    // - Wide front bumper triangles across x = ±0.55 at z = 2.10 (no vertices inside |x| < 0.35)
    // - A recessed inner radiator grille at z = 1.50 (with vertices at |x| = 0.20)
    // - Rear trunk/bumper mesh inside GLB_InteractiveRig -> Trunk_Pivot extending to z = -2.10
    const carGroup = new THREE.Group();
    carGroup.userData.carId = 'm5f90';

    // Wide front outer bumper at z = 2.00..2.10 with vertices only at x = ±0.55
    const frontOuterBumper = new THREE.Mesh(
      new THREE.BoxGeometry(1.10, 0.70, 0.10),
      new THREE.MeshStandardMaterial({ name: 'body' })
    );
    frontOuterBumper.name = 'FrontOuterBumper';
    frontOuterBumper.position.set(0, 0.45, 2.05); // max.z = 2.10
    carGroup.add(frontOuterBumper);

    // Recessed inner grille at z = 1.45..1.55 with vertices at x = ±0.20, y = 0.45 ± 0.08
    const recessedGrille = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.16, 0.10),
      new THREE.MeshStandardMaterial({ name: 'grille' })
    );
    recessedGrille.name = 'RecessedInnerGrille';
    recessedGrille.position.set(0, 0.45, 1.50); // max.z = 1.55
    carGroup.add(recessedGrille);

    // Mid cabin body from z = -1.20 to z = 1.50
    const cabinBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.80, 1.35, 2.70),
      new THREE.MeshStandardMaterial({ name: 'body' })
    );
    cabinBody.name = 'MainCabinBody';
    cabinBody.position.set(0, 0.70, 0.15);
    carGroup.add(cabinBody);

    // Rear bumper & trunk inside GLB_InteractiveRig -> Trunk_Pivot extending to z = -2.10
    const interactiveRig = new THREE.Group();
    interactiveRig.name = 'GLB_InteractiveRig';
    interactiveRig.userData.isInteractiveRigNode = true;

    const trunkPivot = new THREE.Group();
    trunkPivot.name = 'Trunk_Pivot';
    trunkPivot.userData.isInteractiveRigNode = true;

    const rearBumperMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.10, 0.75, 0.60),
      new THREE.MeshStandardMaterial({ name: 'body' })
    );
    rearBumperMesh.name = 'RearTrunkBumper_trunk';
    rearBumperMesh.position.set(0, 0.55, -1.80); // min.z = -2.10
    trunkPivot.add(rearBumperMesh);
    interactiveRig.add(trunkPivot);
    carGroup.add(interactiveRig);

    carGroup.updateMatrixWorld(true);

    // 1. Mount UAE plate
    Car3DManager.applyLicensePlateToModel(carGroup, 'D 1 | DXB UAE', 'gold', 'classic');

    const frontPlate = findFrontPlate(carGroup);
    const rearPlate = findRearPlate(carGroup);

    assert.ok(frontPlate, 'Front license plate must be mounted on carGroup');
    assert.ok(rearPlate, 'Rear license plate must be mounted on carGroup');
    assert.equal(frontPlate.visible, true);
    assert.equal(rearPlate.visible, true);

    assert.ok(
      frontPlate.position.z > 2.05,
      `Front plate must sit OUTSIDE the outer front bumper (expected z > 2.05, got ${frontPlate.position.z.toFixed(3)}, never buried in recessed grille at z = 1.5)`
    );
    assert.ok(
      rearPlate.position.z < -2.05,
      `Rear plate must sit OUTSIDE the rear bumper inside Trunk_Pivot (expected z < -2.05, got ${rearPlate.position.z.toFixed(3)})`
    );

    // 2. Calling applyLicensePlateToModel(carGroup, '') hides both plates
    Car3DManager.applyLicensePlateToModel(carGroup, '');
    assert.equal(frontPlate.visible, false, 'Front plate must be hidden when plateText is empty');
    assert.equal(rearPlate.visible, false, 'Rear plate must be hidden when plateText is empty');

    // 3. Calling again with a new country plate replaces them cleanly without duplicate plate nodes
    Car3DManager.applyLicensePlateToModel(carGroup, 'SPD 777 | CA USA', 'chrome', 'classic');
    const frontPlateAfter = findFrontPlate(carGroup);
    const rearPlateAfter = findRearPlate(carGroup);

    assert.ok(frontPlateAfter && frontPlateAfter.visible, 'Front plate must be visible again after mounting USA plate');
    assert.ok(rearPlateAfter && rearPlateAfter.visible, 'Rear plate must be visible again after mounting USA plate');
    assert.equal(frontPlateAfter.userData.plateText, 'SPD 777 | CA USA');
    assert.equal(rearPlateAfter.userData.plateText, 'SPD 777 | CA USA');
    assert.equal(frontPlateAfter.userData.frameStyle, 'chrome');
    assert.equal(rearPlateAfter.userData.frameStyle, 'chrome');

    let plateGroupCount = 0;
    carGroup.traverse((node) => {
      if (node !== carGroup && node.isGroup && node.userData && node.userData.isLicensePlate) {
        plateGroupCount++;
      }
    });
    assert.equal(plateGroupCount, 2, `Expected exactly 2 license plate groups (front & rear) without duplicates, got ${plateGroupCount}`);
  });
});

describe('Collector Book & Car-Plate Synergy (RUS / KZ / USA / UAE)', () => {
  test('NomeraRaceEconomy.getCarPlateSynergy & performance() calculate all 6 country/style synergies and boost race rewards', () => {
    delete require.cache[require.resolve('../js/race-economy.js')];
    const NomeraRaceEconomy = require('../js/race-economy.js');

    assert.equal(typeof NomeraRaceEconomy.getCarPlateSynergy, 'function');

    // 1. Mercedes-Benz G63 AMG «Гелик» + 'D 1 | DXB UAE' -> uae_royal (bonusPct: 35, mult: 0.35)
    const uaeRoyal = NomeraRaceEconomy.getCarPlateSynergy(
      { name: 'Mercedes-Benz G63 AMG «Гелик»', plate: { text: 'D 1 | DXB UAE' } }
    );
    assert.ok(uaeRoyal, 'Expected uae_royal synergy for Gelik + D 1 | DXB UAE');
    assert.equal(uaeRoyal.id, 'uae_royal');
    assert.equal(uaeRoyal.bonusPct, 35);
    assert.equal(uaeRoyal.mult, 0.35);

    // Compare performance() with a non-synergy car carrying the exact same plate & rarity
    const baseStats = { speed: 260, accel: 4.5, handling: 7.5, rewardMult: 10 };
    const plateObj = { text: 'D 1 | DXB UAE', rarity: { text: 'БЛАТНОЙ' } };
    const gelikPerf = NomeraRaceEconomy.performance(baseStats, {
      name: 'Mercedes-Benz G63 AMG «Гелик»',
      condition: 100,
      upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 },
      plate: plateObj
    });
    const nonSynergyPerf = NomeraRaceEconomy.performance(baseStats, {
      name: 'Hyundai Solaris',
      condition: 100,
      upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 },
      plate: plateObj
    });
    assert.ok(
      gelikPerf.rewardMult > nonSynergyPerf.rewardMult,
      `Expected synergy car rewardMult (${gelikPerf.rewardMult}) > non-synergy car rewardMult (${nonSynergyPerf.rewardMult})`
    );
    assert.equal(
      gelikPerf.plateBonus,
      nonSynergyPerf.plateBonus + 35,
      `Expected plateBonus to increase by +35 (got ${gelikPerf.plateBonus} vs ${nonSynergyPerf.plateBonus})`
    );

    // 2. Toyota Camry 3.5 + '777 VIP | 01 KZ' -> kz_vip (bonusPct: 25)
    const kzVip = NomeraRaceEconomy.getCarPlateSynergy('Toyota Camry 3.5', '777 VIP | 01 KZ');
    assert.ok(kzVip, 'Expected kz_vip synergy for Toyota Camry 3.5 + 777 VIP | 01 KZ');
    assert.equal(kzVip.id, 'kz_vip');
    assert.equal(kzVip.bonusPct, 25);
    assert.equal(kzVip.mult, 0.25);

    // 3. BMW M5 F90 Competition + 'А 777 МР | 77 RUS' -> rus_kortezh (bonusPct: 25)
    const rusKortezh = NomeraRaceEconomy.getCarPlateSynergy('BMW M5 F90 Competition', 'А 777 МР | 77 RUS');
    assert.ok(rusKortezh, 'Expected rus_kortezh synergy for BMW M5 F90 Competition + А 777 МР | 77 RUS');
    assert.equal(rusKortezh.id, 'rus_kortezh');
    assert.equal(rusKortezh.bonusPct, 25);
    assert.equal(rusKortezh.mult, 0.25);

    // 4. Porsche 911 Turbo S + 'VIP 777 | CA USA' -> usa_highway (bonusPct: 22)
    const usaHighway = NomeraRaceEconomy.getCarPlateSynergy('Porsche 911 Turbo S', 'VIP 777 | CA USA');
    assert.ok(usaHighway, 'Expected usa_highway synergy for Porsche 911 Turbo S + VIP 777 | CA USA');
    assert.equal(usaHighway.id, 'usa_highway');
    assert.equal(usaHighway.bonusPct, 22);
    assert.equal(usaHighway.mult, 0.22);

    // 5. Toyota Mark II Tourer V + 'А 777 АА | 77 RUS' -> jdm_legend (bonusPct: 20)
    const jdmLegend = NomeraRaceEconomy.getCarPlateSynergy('Toyota Mark II Tourer V', 'А 777 АА | 77 RUS');
    assert.ok(jdmLegend, 'Expected jdm_legend synergy for Toyota Mark II Tourer V + А 777 АА | 77 RUS');
    assert.equal(jdmLegend.id, 'jdm_legend');
    assert.equal(jdmLegend.bonusPct, 20);
    assert.equal(jdmLegend.mult, 0.20);

    // 6. Lada Priora БПАН + 'А 001 АА | 05 RUS' -> oper_bpan (bonusPct: 18)
    const operBpan = NomeraRaceEconomy.getCarPlateSynergy('Lada Priora БПАН', 'А 001 АА | 05 RUS');
    assert.ok(operBpan, 'Expected oper_bpan synergy for Lada Priora БПАН + А 001 АА | 05 RUS');
    assert.equal(operBpan.id, 'oper_bpan');
    assert.equal(operBpan.bonusPct, 18);
    assert.equal(operBpan.mult, 0.18);

    // Non-matching combination returns null
    assert.equal(NomeraRaceEconomy.getCarPlateSynergy('Hyundai Solaris', 'В 124 ЕК | 77 RUS'), null);
    assert.equal(NomeraRaceEconomy.getCarPlateSynergy('BMW M5 F90 Competition', ''), null);
  });

  test('COLLECTOR_SETS & claimCollectorSet complete world_passport, uae_sheikh_set, and synergy_master and prevent double-claim', () => {
    const { createApp } = require('./helpers/create-app.cjs');
    const app = createApp();

    const evalCollectorSet = (setId) => app.run(`(() => {
      const sets = typeof COLLECTOR_SETS !== 'undefined' ? COLLECTOR_SETS : (window.COLLECTOR_SETS || []);
      const s = sets.find(x => x.id === ${JSON.stringify(setId)});
      if (!s) return null;
      if (typeof evaluateCollectorSet === 'function') return evaluateCollectorSet(s);
      if (typeof getCollectorSetStatus === 'function') return getCollectorSetStatus(s);
      if (typeof s.evaluate === 'function') return s.evaluate();
      if (typeof s.check === 'function') {
        const res = s.check();
        return typeof res === 'object' && res !== null ? res : { completed: Boolean(res) };
      }
      return null;
    })()`);

    assert.ok(app.run('Array.isArray(COLLECTOR_SETS) && COLLECTOR_SETS.length >= 8'), 'COLLECTOR_SETS must be defined with at least 8 sets');
    assert.equal(typeof app.run('claimCollectorSet'), 'function');

    // 1. world_passport: incomplete with only RUS plate -> cannot claim
    app.run(`
      balance = 100000;
      inventory = [{ id: 'p_rus', text: 'А 123 ВС | 77 RUS', price: 5000, country: 'RUS' }];
    `);
    assert.equal(evalCollectorSet('world_passport').completed, false);
    app.run("claimCollectorSet('world_passport')");
    assert.equal(app.run('balance'), 100000, 'Incomplete world_passport set must not credit reward');

    // Populate inventory with 4 plates across RUS, KZ, USA, UAE -> completes world_passport (+250,000 ₽ once)
    app.run(`
      inventory = [
        { id: 'p_rus', text: 'А 123 ВС | 77 RUS', price: 5000, country: 'RUS' },
        { id: 'p_kz', text: '123 ABC | 01 KZ', price: 9000, country: 'KZ' },
        { id: 'p_usa', text: 'ABC 123 | CA USA', price: 18000, country: 'USA' },
        { id: 'p_uae', text: 'B 123 | DXB UAE', price: 40000, country: 'UAE' }
      ];
    `);
    const wpStatus = evalCollectorSet('world_passport');
    assert.ok(wpStatus && wpStatus.completed, 'world_passport set must be completed with RUS, KZ, USA, UAE plates');

    app.run("claimCollectorSet('world_passport')");
    assert.equal(app.run('balance'), 100000 + 250000, 'claimCollectorSet(world_passport) must credit +250,000 ₽');

    // Second call must be blocked (no double-claim)
    app.run("claimCollectorSet('world_passport')");
    assert.equal(app.run('balance'), 100000 + 250000, 'Second claimCollectorSet(world_passport) must not double-credit');

    // 2. uae_sheikh_set: 1-digit UAE plate ('D 7 | DXB UAE') completes set and claims +1,200,000 ₽
    assert.equal(evalCollectorSet('uae_sheikh_set').completed, false, 'Plain 3-digit UAE plate B 123 must not complete uae_sheikh_set');
    app.run(`
      inventory.push({ id: 'p_uae_sheikh', text: 'D 7 | DXB UAE', price: 15000000, country: 'UAE' });
    `);
    const sheikhStatus = evalCollectorSet('uae_sheikh_set');
    assert.ok(sheikhStatus && sheikhStatus.completed, 'D 7 | DXB UAE must complete uae_sheikh_set');

    const balBeforeSheikh = app.run('balance');
    app.run("claimCollectorSet('uae_sheikh_set')");
    assert.equal(app.run('balance'), balBeforeSheikh + 1200000, 'claimCollectorSet(uae_sheikh_set) must credit +1,200,000 ₽');
    app.run("claimCollectorSet('uae_sheikh_set')");
    assert.equal(app.run('balance'), balBeforeSheikh + 1200000, 'Second claimCollectorSet(uae_sheikh_set) must not double-credit');

    // 3. synergy_master: having 2 synergy-matched cars in myCars completes synergy_master
    app.run(`
      myCars = [
        { name: 'Mercedes-Benz G63 AMG «Гелик»', basePrice: 18000000, plate: { text: 'D 1 | DXB UAE', price: 25000000 } }
      ];
    `);
    assert.equal(evalCollectorSet('synergy_master').completed, false, '1 synergy car is not enough for synergy_master');

    app.run(`
      myCars.push({ name: 'Toyota Camry 3.5', basePrice: 2800000, plate: { text: '777 VIP | 01 KZ', price: 12000000 } });
    `);
    const synMasterStatus = evalCollectorSet('synergy_master');
    assert.ok(synMasterStatus && synMasterStatus.completed, '2 synergy-matched cars in myCars must complete synergy_master');

    const balBeforeSyn = app.run('balance');
    app.run("claimCollectorSet('synergy_master')");
    assert.equal(app.run('balance'), balBeforeSyn + 850000, 'claimCollectorSet(synergy_master) must credit +850,000 ₽');
  });

  test('3D Showroom FSO Strobes, Pneumo Stance, Weather Environment, and Photo Poster work end-to-end', () => {
    const { Car3DManager } = setup3DPlateTestEnv();

    const container = {
      clientWidth: 400,
      clientHeight: 260,
      style: {},
      innerHTML: '',
      appendChild() {},
      getBoundingClientRect: () => ({ width: 400, height: 260 })
    };
    const showroom = Car3DManager.createShowroom(container, { showPodium: true });
    showroom.setCar('Mercedes-Benz G63 AMG «Гелик»', { plate: 'А777МР | 77 RUS' });

    // 1. FSO Strobes & Roof Beacon
    assert.equal(showroom.fsoActive, false, 'FSO strobes start disabled');
    const fsoOn = showroom.toggleFsoStrobes();
    assert.equal(fsoOn, true, 'toggleFsoStrobes enables FSO strobes');
    assert.ok(showroom.fsoGroup && showroom.fsoGroup.visible, 'ShowroomFsoGroup must be created and visible');
    showroom.updateFsoRig(10); // phase 0 -> Left strobe ON
    assert.ok(showroom.fsoPointL.intensity > 0, 'Left FSO point light flashes on phase 0');
    showroom.updateFsoRig(230); // phase 4 -> Right strobe ON
    assert.ok(showroom.fsoPointR.intensity > 0, 'Right FSO point light flashes on phase 4');
    const fsoOff = showroom.toggleFsoStrobes(false);
    assert.equal(fsoOff, false, 'toggleFsoStrobes(false) disables FSO strobes');

    // 2. Pneumatic Suspension (Stock -> Sport -> BPAN -> Stock)
    const sportStance = showroom.cyclePneumoStance();
    assert.equal(sportStance.mode, 'sport', 'First cyclePneumoStance switches to sport');
    assert.ok(sportStance.offsetY < -0.03, 'Sport stance lowers body Y');

    const bpanStance = showroom.cyclePneumoStance();
    assert.equal(bpanStance.mode, 'bpan', 'Second cyclePneumoStance switches to bpan');
    assert.ok(bpanStance.offsetY < sportStance.offsetY, 'BPAN stance lowers body Y further than sport');
    assert.ok(bpanStance.camberDeg < -4, 'BPAN stance applies negative wheel camber');

    const stockStance = showroom.cyclePneumoStance();
    assert.equal(stockStance.mode, 'stock', 'Third cyclePneumoStance returns to stock');
    assert.equal(stockStance.offsetY, 0, 'Stock stance restores 0 offset');

    // 3. Showroom Weather / Environment Themes (studio -> night -> sunset -> rain -> studio)
    assert.equal(showroom.cycleEnvironmentTheme(), 'night');
    assert.equal(showroom.headlightsOn, true, 'Night theme automatically turns on headlights');
    assert.equal(showroom.cycleEnvironmentTheme(), 'sunset');
    assert.equal(showroom.cycleEnvironmentTheme(), 'rain');
    assert.ok(showroom.rainGroup && showroom.rainGroup.visible, 'Rain theme enables 3D falling rain particles');
    showroom.updateRainRig();
    assert.equal(showroom.cycleEnvironmentTheme(), 'studio');

    // 4. 3D Photo Studio Poster Capture
    const poster = showroom.capturePhotoPoster({
      carName: 'Mercedes-Benz G63 AMG «Гелик»',
      plateText: 'А777МР | 77 RUS',
      synergyTitle: 'Спецсвязь / Кортеж РФ (+25% ₽)',
      priceText: '20 500 000 ₽'
    });
    assert.equal(poster.width, 1280);
    assert.equal(poster.height, 720);
    assert.equal(poster.carName, 'Mercedes-Benz G63 AMG «Гелик»');
    assert.equal(poster.plateText, 'А777МР | 77 RUS');
    assert.ok(String(poster.dataUrl).startsWith('data:image/png'), 'Poster must produce PNG dataUrl');
    showroom.destroy();
  });

  test('1-on-1 Drag Boss Duels & VIP Fleet Passive Business award exclusive Boss plates and fleet cash', () => {
    const { createApp } = require('./helpers/create-app.cjs');
    const app = createApp();
    app.run('playAsGuest()');

    // 1. VIP Fleet Passive Business calculation & collection
    app.run(`
      balance = 500000;
      myCars = [
        { name: 'Mercedes-Benz G63 AMG «Гелик»', basePrice: 18000000, plate: { text: 'D 1 | DXB UAE', price: 25000000 } },
        { name: 'Toyota Camry 3.5', basePrice: 2800000, plate: { text: '777 VIP | 01 KZ', price: 12000000 } }
      ];
      achievements.fleetVault = 0;
    `);
    const statsCortezh = app.run("calculateFleetStats()");
    assert.equal(statsCortezh.activeCarsCount, 2);
    assert.equal(statsCortezh.synergyCarsCount, 2);
    assert.ok(statsCortezh.totalPerMin > 3000 && statsCortezh.totalPerMin <= 75000, 'Balanced synergy fleet must generate realistic passive income per min without hyper-inflation');

    app.run("setFleetOperationMode('dubai_vip')");
    const statsDubai = app.run("calculateFleetStats()");
    assert.ok(statsDubai.totalPerMin > statsCortezh.totalPerMin, 'dubai_vip mode boosts UAE/KZ luxury fleet income');

    const accrued = app.run('tickFleetIncome(60)');
    assert.equal(accrued, statsDubai.totalPerMin, '60 seconds of tickFleetIncome accrues 1 minute of fleet income');

    const balBeforeFleet = app.run('balance');
    const claimed = app.run('claimFleetIncome()');
    assert.equal(claimed, accrued, 'claimFleetIncome returns accrued vault cash');
    assert.equal(app.run('balance'), balBeforeFleet + accrued, 'claimFleetIncome credits player balance');
    assert.equal(app.run('achievements.fleetVault'), 0, 'claimFleetIncome resets fleetVault to 0');

    // 2. Drag Tachometer Gear Shifting & 1-on-1 Boss Duels
    const shiftRes = app.run('shiftDragGear(6800)');
    assert.equal(shiftRes.isPerfect, true, '6800 RPM is inside the 6200-7400 green zone');
    assert.ok(shiftRes.shiftBonusScore >= 28, 'Perfect shift awards +28 bonus score');

    const invBeforeBoss = app.run('inventory.length');
    const duelRes = app.run("resolveDragBossDuel('boss_sheikh', { forceWin: true })");
    assert.equal(duelRes.won, true, 'Boss duel against Sheikh must succeed');
    assert.equal(duelRes.plateAwarded, 'D 1 | DXB UAE', 'First victory against Sheikh awards exclusive D 1 | DXB UAE plate');
    assert.equal(app.run('inventory.length'), invBeforeBoss + 1, 'Exclusive Boss plate is added to player inventory');

    // Rematch awards cash but does not duplicate the exclusive boss plate
    const duelRematch = app.run("resolveDragBossDuel('boss_sheikh', { forceWin: true })");
    assert.equal(duelRematch.won, true);
    assert.equal(duelRematch.plateAwarded, null, 'Rematch must not duplicate unique boss plate');
  });

  test('syncServerDraft syncs country selector buttons, spin costs, and plate-box class, and Drag Racing rework calculates real car performance and valid Boss plate rarity', () => {
    const { createApp } = require('./helpers/create-app.cjs');
    const app = createApp();
    app.run('playAsGuest()');

    // 1. Verify syncServerDraft fixes country button / plate-box / spin cost desync when restoring a USA ('CA') draft while in RUS mode
    app.run("selectPlateCountry('RUS')");
    assert.equal(app.run('currentCountry'), 'RUS');

    app.run(`syncServerDraft({
      country: 'USA',
      l1: 'V', l2: 'I', l3: 'P',
      n1: '7', n2: '7', n3: '7',
      reg: 'CA',
      price: 450000
    })`);

    assert.equal(app.run('currentCountry'), 'USA', 'syncServerDraft must update currentCountry to USA');
    assert.equal(app.run("document.getElementById('btn-country-USA').classList.contains('active')"), true, 'US button must have .active class');
    assert.equal(app.run("document.getElementById('btn-country-RUS').classList.contains('active')"), false, 'RU button must not remain .active');
    assert.equal(app.run("document.getElementById('plate-box').classList.contains('country-usa')"), true, '#plate-box must have country-usa class');
    assert.match(app.run("document.getElementById('spin-cost-both').innerText"), /3\s*500\s*₽/, 'USA spin-cost-both must update to 3 500 ₽');
    assert.match(app.run("document.getElementById('spin-cost-num').innerText"), /2\s*000\s*₽/, 'USA spin-cost-num must update to 2 000 ₽');

    // Also verify inferCountryFromRegion fallback when draft.country is omitted
    app.run("selectPlateCountry('RUS')");
    app.run(`syncServerDraft({
      l1: 'D', l2: 'D', l3: 'D',
      n1: '0', n2: '0', n3: '1',
      reg: 'DXB',
      price: 25000000
    })`);
    assert.equal(app.run('currentCountry'), 'UAE', 'syncServerDraft must infer UAE from DXB region');
    assert.equal(app.run("document.getElementById('btn-country-UAE').classList.contains('active')"), true, 'UAE button must have .active class');

    // 2. Verify getDragCarPerformance uses real carRaceStats[car.name] and perf.speed/accel/rewardMult
    const zhiguliPerf = app.run(`getDragCarPerformance({
      name: 'ВАЗ-2107 «Жигули»',
      condition: 100,
      upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
    })`);
    const bugattiPerf = app.run(`getDragCarPerformance({
      name: 'Bugatti Chiron Super Sport',
      condition: 100,
      upgrades: { engine: 5, handling: 5, economy: 5, nitro: 5 },
      plate: { text: 'D 1 | DXB UAE', price: 25000000, rarity: getRarity(25000000) }
    })`);

    assert.ok(Number.isFinite(zhiguliPerf.dragScore) && zhiguliPerf.dragScore >= 90, `Zhiguli dragScore must be a finite number >= 90 (got ${zhiguliPerf.dragScore})`);
    assert.ok(bugattiPerf.dragScore > zhiguliPerf.dragScore * 2.2, `Bugatti dragScore (${bugattiPerf.dragScore}) must be > 2.2x Zhiguli (${zhiguliPerf.dragScore})`);
    assert.ok(bugattiPerf.estimatedET < zhiguliPerf.estimatedET - 3.0, `Bugatti 1/4 mile ET (${bugattiPerf.estimatedET}s) must be >3s faster than Zhiguli (${zhiguliPerf.estimatedET}s)`);

    // 3. Verify Boss plate awarded by resolveDragBossDuel has a full rarity object { text, bg, color }, id, and country
    app.run(`
      balance = 500000;
      myCars = [
        { name: 'ВАЗ-2107 «Жигули»', basePrice: 120000, condition: 100, upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 } },
        { name: 'Mercedes-Benz G63 AMG «Гелик»', basePrice: 18000000, condition: 100, upgrades: { engine: 5, handling: 5, economy: 5, nitro: 5 } }
      ];
      selectDragCarFromDropdown(1);
    `);
    assert.equal(app.run('selectedRaceCarName'), 'Mercedes-Benz G63 AMG «Гелик»', 'selectDragCarFromDropdown(1) must switch active race car');

    const bossRes = app.run("resolveDragBossDuel('boss_gelik', { forceWin: true })");
    assert.equal(bossRes.won, true);
    assert.equal(bossRes.plateAwarded, 'А 777 МР | 77 RUS');

    const wonPlateObj = app.run("inventory.find(p => p.text === 'А 777 МР | 77 RUS')");
    assert.ok(wonPlateObj, 'Won Boss plate must exist in inventory');
    assert.ok(wonPlateObj.id, 'Won Boss plate must have a unique id');
    assert.equal(wonPlateObj.country, 'RUS', 'Won Boss plate must have country set');
    assert.equal(typeof wonPlateObj.rarity, 'object', 'Won Boss plate rarity must be a { text, bg, color } object, not a string');
    assert.ok(typeof wonPlateObj.rarity.text === 'string' && wonPlateObj.rarity.text.length > 0, 'Won Boss plate rarity.text must be populated');

    // Equip the won Boss plate on the Gelik and verify it grants a real plateBonus in getDragCarPerformance
    const gelikWithBossPlatePerf = app.run(`(() => {
      myCars[1].plate = inventory.find(p => p.text === 'А 777 МР | 77 RUS');
      return getDragCarPerformance(myCars[1]);
    })()`);
    assert.ok(gelikWithBossPlatePerf.plateBonus > 0, `Equipped Boss plate must grant >0% plateBonus (got ${gelikWithBossPlatePerf.plateBonus}%)`);
  });

  test('USA and UAE random spins and international boxes have balanced rarity distributions and do not inflate ordinary 3-digit plates to Rare+', () => {
    const { createApp } = require('./helpers/create-app.cjs');
    const app = createApp();

    // 1. Ordinary 3-digit UAE plates starting with A/D/S/V/X/Z/M/K must NOT be Rare or Super Rare
    for (const ch of ['A', 'D', 'S', 'V', 'X', 'Z', 'M', 'K']) {
      const serverPrice = c.priceOfPlate(ch, 'B', 'E', '124', 'DXB', 'UAE');
      const clientPrice = app.run(`getCalculatedPrice('${ch}', 'B', 'E', '124', 'DXB', 'UAE')`);
      assert.ok(serverPrice < 18000, `Expected UAE ordinary plate ${ch} 124 | DXB UAE server price < 18000, got ${serverPrice}`);
      assert.ok(clientPrice < 18000, `Expected UAE ordinary plate ${ch} 124 | DXB UAE client price < 18000, got ${clientPrice}`);
      assert.ok(['Обычный', 'Необычный'].includes(c.rarityOfPrice(serverPrice)), `Expected Обычный/Необычный on server, got ${c.rarityOfPrice(serverPrice)}`);
      const clientRarity = app.run(`getRarity(${clientPrice}).text`);
      assert.ok(['Обычный', 'Необычный'].includes(clientRarity), `Expected Обычный/Необычный on client, got ${clientRarity}`);
    }

    // Ordinary 3-digit USA plate must also be < 18000 (Обычный / Необычный)
    const usaOrdServer = c.priceOfPlate('A', 'B', 'C', '124', 'CA', 'USA');
    const usaOrdClient = app.run("getCalculatedPrice('A', 'B', 'C', '124', 'CA', 'USA')");
    assert.ok(usaOrdServer < 18000);
    assert.ok(usaOrdClient < 18000);
    assert.ok(['Обычный', 'Необычный'].includes(c.rarityOfPrice(usaOrdServer)));

    // 2. Sampling 400 0-pity spins in USA and UAE (both server secureRoll and client generateLucky*Local)
    // must yield < 10% Rare+ (cannot easily farm Rare+ plates on every other roll)
    const highRarities = new Set(['Редкий', 'Супер редкий', 'Эпический', 'Легендарный', 'Крутой', 'БЛАТНОЙ', 'Мифический', 'МИФИЧЕСКИЙ']);
    for (const country of ['USA', 'UAE']) {
      const reg = country === 'UAE' ? 'DXB' : 'CA';
      let serverRarePlus = 0;
      for (let i = 0; i < 400; i++) {
        const roll = c.secureRoll('both', 0, country);
        const p = c.priceOfPlate(roll.letters[0], roll.letters[1], roll.letters[2], roll.num, reg, country);
        if (highRarities.has(c.rarityOfPrice(p))) serverRarePlus++;
      }
      assert.ok(
        serverRarePlus <= 40,
        `Expected <= 10% Rare+ on 400 0-pity server spins in ${country}, got ${serverRarePlus}/400`
      );

      const clientRarePlus = app.run(`(() => {
        let count = 0;
        const hi = new Set(['Редкий', 'Супер редкий', 'Эпический', 'Легендарный', 'Крутой', 'БЛАТНОЙ', 'Мифический', 'МИФИЧЕСКИЙ']);
        for (let i = 0; i < 400; i++) {
          const num = generateLuckyNumberLocal(null, 0, '${country}');
          const [l1, l2, l3] = generateLuckyLettersLocal(null, 0, '${country}');
          const p = getCalculatedPrice(l1, l2, l3, num, '${reg}', '${country}');
          if (hi.has(getRarity(p).text)) count++;
        }
        return count;
      })()`);
      assert.ok(
        clientRarePlus <= 40,
        `Expected <= 10% Rare+ on 400 0-pity client spins in ${country}, got ${clientRarePlus}/400`
      );
    }

    // 3. Verify rebalanced kz_box, usa_box, and uae_box drop tables in caseConfigs
    const kzBox = app.run("caseConfigs.kz_box");
    const usaBox = app.run("caseConfigs.usa_box");
    const uaeBox = app.run("caseConfigs.uae_box");

    const toProbMap = (box) => Object.fromEntries(box.probs.map(x => [x.r, x.p]));
    assert.deepEqual(toProbMap(kzBox), {
      'Обычный': 0.40,
      'Необычный': 0.32,
      'Редкий': 0.18,
      'Супер редкий': 0.07,
      'Эпический': 0.022,
      'Легендарный': 0.006,
      'Мифический': 0.002
    });
    assert.deepEqual(toProbMap(usaBox), {
      'Обычный': 0.35,
      'Необычный': 0.35,
      'Редкий': 0.18,
      'Супер редкий': 0.08,
      'Эпический': 0.028,
      'Легендарный': 0.009,
      'Мифический': 0.003
    });
    assert.deepEqual(toProbMap(uaeBox), {
      'Необычный': 0.42,
      'Редкий': 0.34,
      'Супер редкий': 0.15,
      'Эпический': 0.06,
      'Легендарный': 0.022,
      'Мифический': 0.008
    });

    // And forcePlate('Необычный', 'UAE') must produce an Uncommon-priced plate (< 18,000 ₽), not a 2-digit round 400k plate
    const uaeUncommon = app.run("forcePlate('Необычный', 'UAE')");
    assert.equal(uaeUncommon.rarity.text, 'Необычный');
    assert.ok(uaeUncommon.price < 18000, `Expected UAE Необычный forced plate < 18000 ₽, got ${uaeUncommon.price}`);
  });

  test('Japan (JPN) plates and Ultra-Rare Special plates (USSR, Diplomatic CD, MVD, Military, Federal, JDM Glow) work across server, 2D UI, and 3D bumpers with ultra-low drop chance', async () => {
    const { Car3DManager, drawnTexts } = setup3DPlateTestEnv();
    const { createApp } = require('./helpers/create-app.cjs');
    const app = createApp();
    app.run('playAsGuest()');

    // 1. Server & Client Japan (JPN) config, formatting, parsing, and pricing
    assert.ok(c.COUNTRIES.JPN, 'Server COUNTRIES.JPN must exist');
    assert.equal(c.COUNTRIES.JPN.spinCostBoth, 5000);
    assert.equal(c.COUNTRIES.JPN.spinCostPart, 2800);
    assert.equal(c.COUNTRIES.JPN.defaultReg, 'TKY');

    assert.equal(c.formatPlateText('J', 'D', 'M', '777', 'TKY', 'JPN'), 'JDM 777 | TKY JPN');
    assert.equal(c.safePlate({ text: 'JDM 777 | TKY JPN', price: 25000000 }, 'jpn_1').text, 'JDM 777 | TKY JPN');

    const jpnParsed = c.parsePlate('JDM 777 | TKY JPN');
    assert.ok(jpnParsed);
    assert.equal(jpnParsed.country, 'JPN');
    assert.equal(jpnParsed.l1, 'J');
    assert.equal(jpnParsed.l2, 'D');
    assert.equal(jpnParsed.l3, 'M');
    assert.equal(jpnParsed.digits, '777');
    assert.equal(jpnParsed.region, 'TKY');

    const jpnEliteServer = c.priceOfPlate(jpnParsed);
    const jpnEliteClient = app.run("getCalculatedPrice('J', 'D', 'M', '777', 'TKY', 'JPN')");
    assert.ok(jpnEliteServer > 20000000, `Expected JDM 777 | TKY JPN server price > 20M, got ${jpnEliteServer}`);
    assert.ok(jpnEliteClient > 20000000, `Expected JDM 777 | TKY JPN client price > 20M, got ${jpnEliteClient}`);

    const jpnOrdServer = c.priceOfPlate('A', 'B', 'C', '124', 'NGY', 'JPN');
    const jpnOrdClient = app.run("getCalculatedPrice('A', 'B', 'C', '124', 'NGY', 'JPN')");
    assert.ok(jpnOrdServer < 18000, `Expected JPN ordinary plate < 18000 on server, got ${jpnOrdServer}`);
    assert.ok(jpnOrdClient < 18000, `Expected JPN ordinary plate < 18000 on client, got ${jpnOrdClient}`);

    // 2. Client selectPlateCountry('JPN') & jpn_box case
    app.run("selectPlateCountry('JPN')");
    assert.equal(app.run('currentCountry'), 'JPN');
    assert.equal(app.run('currentReg'), 'TKY');
    assert.match(app.run("document.getElementById('spin-cost-both').innerText"), /5\s*000\s*₽/);
    assert.match(app.run("document.getElementById('spin-cost-num').innerText"), /2\s*800\s*₽/);
    assert.equal(app.run("document.getElementById('plate-box').classList.contains('country-jpn')"), true);
    assert.equal(app.run("getCaseEffectivePrice('jpn_box', 'RUS')"), 160000);

    const jpnMiniHtml = app.run("renderMiniPlateInnerHtml('JDM 777 | TKY JPN')");
    assert.match(jpnMiniHtml, /品川 330/);
    assert.match(jpnMiniHtml, /東/);
    assert.match(jpnMiniHtml, /・7-77/);
    assert.match(jpnMiniHtml, /JDM/);

    const jpnMini1Digit = app.run("renderMiniPlateInnerHtml('GTR 001 | YKH JPN')");
    assert.match(jpnMini1Digit, /横浜 300/);
    assert.match(jpnMini1Digit, /神/);
    assert.match(jpnMini1Digit, /・・ ・1/);

    const jpnMini2Digit = app.run("renderMiniPlateInnerHtml('TKY 077 | OSK JPN')");
    assert.match(jpnMini2Digit, /なにわ 330/);
    assert.match(jpnMini2Digit, /大/);
    assert.match(jpnMini2Digit, /・・ 77/);

    // 3. Ultra-Rare Special RUS plates: USSR (МОС/СВТ), Diplomatic Red (КМН/СМК), MVD Blue (УМВ/РМВ), Military Black (ВМО/КМО), Federal Tricolor (КРМ/РФС)
    const specialCases = [
      { l1: 'М', l2: 'О', l3: 'С', num: '001', reg: '77', country: 'RUS', type: 'ussr', css: 'special-ussr' },
      { l1: 'К', l2: 'М', l3: 'Н', num: '001', reg: '77', country: 'RUS', type: 'diplomat', css: 'special-diplomat' },
      { l1: 'У', l2: 'М', l3: 'В', num: '001', reg: '77', country: 'RUS', type: 'mvd', css: 'special-mvd' },
      { l1: 'В', l2: 'М', l3: 'О', num: '001', reg: '77', country: 'RUS', type: 'military', css: 'special-military' },
      { l1: 'К', l2: 'Р', l3: 'М', num: '001', reg: '77', country: 'RUS', type: 'federal', css: 'special-federal' }
    ];

    for (const sp of specialCases) {
      const metaServer = c.getUltraSpecialPlateMeta(sp.l1, sp.l2, sp.l3, sp.num, sp.reg, sp.country);
      assert.ok(metaServer, `Expected server getUltraSpecialPlateMeta for ${sp.l1}${sp.l2}${sp.l3}`);
      assert.equal(metaServer.type, sp.type);

      const srvPrice = c.priceOfPlate(sp.l1, sp.l2, sp.l3, sp.num, sp.reg, sp.country);
      const cliPrice = app.run(`getCalculatedPrice('${sp.l1}', '${sp.l2}', '${sp.l3}', '${sp.num}', '${sp.reg}', '${sp.country}')`);
      assert.ok(srvPrice >= 18000000, `Expected ultra-special ${sp.type} server price >= 18M, got ${srvPrice}`);
      assert.ok(cliPrice >= 18000000, `Expected ultra-special ${sp.type} client price >= 18M, got ${cliPrice}`);
      assert.equal(c.rarityOfPrice(srvPrice), 'БЛАТНОЙ');

      const plateText = c.formatPlateText(sp.l1, sp.l2, sp.l3, sp.num, sp.reg, sp.country);
      const miniClasses = app.run(`getMiniPlateCountryClass('${plateText}')`);
      assert.ok(miniClasses.includes('special-plate') && miniClasses.includes(sp.css), `Expected mini-plate classes for ${plateText} to include ${sp.css}, got ${miniClasses}`);
    }

    // 4. 3D License Plate rendering for JPN and Ultra-Rare Special plates (USSR, Diplomat, MVD, Military)
    drawnTexts.length = 0;
    const jpn3D = Car3DManager.createLicensePlate('JDM 777 | TKY JPN');
    assert.ok(jpn3D && jpn3D.isGroup);
    assert.ok(drawnTexts.some(d => d.text.includes('品川 330')), '3D JPN plate must draw Tokyo Shinagawa kanji header');
    assert.ok(drawnTexts.some(d => d.text.includes('東')), '3D JPN plate must draw Tokyo Fūin seal kanji 東');
    assert.ok(drawnTexts.some(d => d.text.includes('・7-77')), '3D JPN plate must draw authentic 4-position MLIT digits ・7-77');

    drawnTexts.length = 0;
    Car3DManager.createLicensePlate('GTR 001 | YKH JPN');
    assert.ok(drawnTexts.some(d => d.text.includes('横浜 300')), '3D YKH JPN plate must draw Yokohama 300 header');
    assert.ok(drawnTexts.some(d => d.text.includes('・・ ・1')), '3D 1-digit JPN plate must draw 3 middle dots without hyphen (・・ ・1)');

    drawnTexts.length = 0;
    Car3DManager.createLicensePlate('М 001 ОС | 77 RUS');
    assert.ok(drawnTexts.some(d => d.text.includes('СССР')), '3D USSR special plate must draw ★ СССР badge');

    drawnTexts.length = 0;
    Car3DManager.createLicensePlate('К 001 МН | 77 RUS');
    assert.ok(drawnTexts.some(d => d.text.includes('CD')), '3D Diplomatic red plate must draw CD • МИД badge');

    // 5. Ordinary fallback never leaks ULTRA_SPECIAL_RUS_SERIES on normal spins
    let specialCountIn500 = 0;
    for (let i = 0; i < 500; i++) {
      const r = c.secureRoll('both', 0, 'RUS');
      const series = r.letters.join('');
      if (c.ULTRA_SPECIAL_RUS_SERIES.includes(series)) specialCountIn500++;
    }
    assert.ok(specialCountIn500 <= 5, `Ultra-special series must have a super low drop rate (~0.2%), got ${specialCountIn500}/500`);

    // 6. Bulk Sell All Plates ('Продать все номера') requires confirmation and updates live button counters
    app.run(`
      balance = 10000;
      inventory = [
        { text: 'А 124 ВС | 77 RUS', price: 1500, rarity: { text: 'Обычный' }, country: 'RUS' },
        { text: 'А 777 МР | 77 RUS', price: 5000000, rarity: { text: 'БЛАТНОЙ' }, country: 'RUS' }
      ];
      renderInventory();
    `);
    assert.match(app.run("document.getElementById('btn-sell-all-plates').textContent"), /2 шт\./);
    assert.match(app.run("document.getElementById('btn-sell-all-common').textContent"), /1 шт\./);

    // Cancel confirmation -> nothing sold
    app.run("window._testConfirmResult = false; confirmAction = (msg) => { window._lastConfirmMsg = msg; return Promise.resolve(window._testConfirmResult); };");
    const cancelledRes = await app.run("sellAllPlates('all')");
    assert.equal(cancelledRes, false);
    assert.equal(app.run("inventory.length"), 2);
    assert.equal(app.run("balance"), 10000);
    assert.match(app.run("window._lastConfirmMsg"), /ВСЕ номера из коллекции \(2 шт\.\)/);

    // Confirm sellAllPlates('common') -> only common plate sold
    app.run("window._testConfirmResult = true;");
    const commonSoldRes = await app.run("sellAllPlates('common')");
    assert.equal(commonSoldRes, true);
    assert.equal(app.run("inventory.length"), 1);
    assert.equal(app.run("balance"), 11500);

    // Confirm sellAllPlates('all') -> remaining rare plate sold
    const allSoldRes = await app.run("sellAllPlates('all')");
    assert.equal(allSoldRes, true);
    assert.equal(app.run("inventory.length"), 0);
    assert.equal(app.run("balance"), 5011500);
    assert.equal(app.run("document.getElementById('btn-sell-all-plates').disabled"), true);
  });

  test('Dubai RTA & UAE 1-to-5 digit hierarchy, real-world auction records (P 7, D 5, AA 9, G 63, P 911, 1971, 77777), and inspectUaePlate cultural passport', () => {
    const { createApp } = require('./helpers/create-app.cjs');
    const app = createApp();
    const { Car3DManager, drawnTexts } = setup3DPlateTestEnv();

    // 1. Golden Rule of UAE Plates: 1-digit > 2-digit twin > 3-digit triple > 3-digit plain
    const p1 = c.inspectUaePlate('D 1 | DXB UAE');
    const p7 = c.inspectUaePlate('P 7 | DXB UAE');
    const d5 = c.inspectUaePlate('D 5 | DXB UAE');
    const aa9 = c.inspectUaePlate('AA 9 | DXB UAE');
    const d77 = c.inspectUaePlate('D 77 | DXB UAE');
    const d777 = c.inspectUaePlate('D 777 | DXB UAE');
    const g63 = c.inspectUaePlate('G 63 | DXB UAE');
    const p911 = c.inspectUaePlate('P 911 | DXB UAE');
    const d1971 = c.inspectUaePlate('D 1971 | DXB UAE');
    const d7777 = c.inspectUaePlate('D 7777 | DXB UAE');
    const d77777 = c.inspectUaePlate('D 77777 | DXB UAE');
    const ad50 = c.inspectUaePlate('50 1 | AUH UAE');

    // Guinness World Record P 7 ($15M / 55M AED) is the #1 plate in Dubai
    assert.ok(p7.price > p1.price, `Expected Guinness record P 7 (${p7.price}) > D 1 (${p1.price})`);
    assert.match(p7.realWorldNote, /55 000 000 AED/);
    assert.match(d5.realWorldNote, /33 000 000 AED/);
    assert.match(aa9.realWorldNote, /38 000 000 AED/);
    assert.equal(aa9.isDoubleCode, true);

    // 2-digit twin (D 77) is strictly more valuable than 3-digit triple (D 777) in real UAE market
    assert.ok(d77.price > d777.price, `Expected 2-digit twin D 77 (${d77.price}) > 3-digit triple D 777 (${d777.price})`);

    // Iconic model/heritage combinations (G 63, P 911, D 1971, D 7777, D 77777, Abu Dhabi Golden Jubilee 50)
    assert.ok(g63.price > 3000000, `Expected G 63 Brabus combo > 3M, got ${g63.price}`);
    assert.ok(p911.price > 850000, `Expected P 911 Porsche combo > 850k, got ${p911.price}`);
    assert.ok(d1971.price > 1000000 && d1971.digitCount === 4, `Expected 4-digit UAE founding year D 1971 > 1M, got ${d1971.price}`);
    assert.ok(d7777.price > 4000000 && d7777.digitCount === 4, `Expected 4-digit quad D 7777 > 4M, got ${d7777.price}`);
    assert.ok(d77777.price > 3000000 && d77777.digitCount === 5, `Expected 5-digit quint D 77777 > 3M, got ${d77777.price}`);
    assert.ok(ad50.price > 50000000 && ad50.code === '50', `Expected Abu Dhabi Golden Jubilee 50 1 > 50M, got ${ad50.price}`);

    // Client and server parity for all 1..5 digit UAE plates
    for (const plateStr of ['P 7 | DXB UAE', 'AA 9 | DXB UAE', 'D 77 | DXB UAE', 'G 63 | DXB UAE', 'P 911 | DXB UAE', 'D 1971 | DXB UAE', 'D 77777 | DXB UAE']) {
      const srv = c.inspectUaePlate(plateStr);
      const cli = app.run(`inspectUaePlate('${plateStr}')`);
      assert.equal(cli.price, srv.price, `Client and server price must match for ${plateStr}`);
      assert.equal(cli.estimatedAed, srv.estimatedAed, `Client and server AED estimate must match for ${plateStr}`);
    }

    // 2D UI cultural passport & 3D bumper plate rendering for 4-digit and 5-digit UAE plates
    app.run(`
      selectPlateCountry('UAE');
      currentL1 = 'P'; currentL2 = 'X'; currentL3 = 'Z'; currentNum = '007'; currentReg = 'DXB';
      boardHasLetters = true; boardHasNumbers = true;
      checkCanSaveButton();
    `);
    assert.match(app.run("document.getElementById('current-price-display').innerHTML"), /AED/);
    assert.match(app.run("document.getElementById('gen-rarity').innerText"), /ROYAL 1-DIGIT/);

    drawnTexts.length = 0;
    Car3DManager.createLicensePlate('D 77777 | DXB UAE');
    assert.ok(drawnTexts.some(d => d.text === '77777'), '3D UAE plate must render 5-digit quint 77777');

    // Ordinary 3-digit plate with 2-letter code (SS 730 | DXB UAE) must be Uncommon (< 18,000 ₽), not multi-million
    const ss730 = c.inspectUaePlate('SS 730 | DXB UAE');
    assert.ok(ss730.price < 18000, `Expected SS 730 | DXB UAE < 18,000 ₽, got ${ss730.price}`);
    assert.equal(c.rarityOfPrice(ss730.price), 'Необычный');

    // Dubai spin generator rolls 3, 4, and 5 digit plates on ordinary spins, and 1-2 digits on legendary/epic
    const serverLengths = new Set();
    const clientLengths = new Set();
    for (let i = 0; i < 120; i++) {
      serverLengths.add(c.secureRoll('both', 0, 'UAE').num.length);
      clientLengths.add(app.run("generateLuckyNumberLocal(null, 0, 'UAE')").length);
    }
    assert.ok(serverLengths.has(3) && serverLengths.has(4) && serverLengths.has(5), `Server UAE rolls must include 3, 4, and 5 digit numbers, got lengths: ${[...serverLengths]}`);
    assert.ok(clientLengths.has(3) && clientLengths.has(4) && clientLengths.has(5), `Client UAE rolls must include 3, 4, and 5 digit numbers, got lengths: ${[...clientLengths]}`);

    // Dynamic 1..5 cell visibility on #plate-box during and after Dubai spins
    for (const sampleNum of ['7', '77', '730', '1971', '48291']) {
      const expectedLen = sampleNum.length;
      const cellState = app.run(`(() => {
        selectPlateCountry('UAE');
        currentL1 = 'D'; currentL2 = 'X'; currentL3 = 'Z';
        currentNum = '${sampleNum}';
        boardHasLetters = true;
        boardHasNumbers = true;
        executeCellSpin(['cell-l1', 'cell-n1', 'cell-n2', 'cell-n3', 'cell-l2', 'cell-l3'], {
          'cell-l1': 'D', 'cell-l2': 'X', 'cell-l3': 'Z',
          'cell-n1': '${sampleNum[0]}', 'cell-n2': '${sampleNum[1] || '-'}', 'cell-n3': '${sampleNum[2] || '-'}'
        });
        const visibleWhileSpinning = ['cell-n1', 'cell-n2', 'cell-n3', 'cell-n4', 'cell-n5'].filter(
          id => !document.getElementById(id).classList.contains('uae-cell-hidden')
        );
        const spinningCells = ['cell-n1', 'cell-n2', 'cell-n3', 'cell-n4', 'cell-n5'].filter(
          id => document.getElementById(id).classList.contains('spinning')
        );
        isSpinning = false;
        syncPlateBoxCellsLayout();
        const charsAfter = visibleWhileSpinning.map(id => document.getElementById(id).querySelector('.char-span').textContent).join('');
        return {
          hasDigitsClass: document.getElementById('plate-box').classList.contains('uae-digits-' + ${expectedLen}),
          visibleCount: visibleWhileSpinning.length,
          spinningCount: spinningCells.length,
          charsAfter
        };
      })()`);
      assert.equal(cellState.hasDigitsClass, true, `Expected uae-digits-${expectedLen} class on #plate-box for ${sampleNum}`);
      assert.equal(cellState.visibleCount, expectedLen, `Expected ${expectedLen} visible number cells for ${sampleNum}`);
      assert.equal(cellState.spinningCount, expectedLen, `Expected ${expectedLen} spinning number cells for ${sampleNum}`);
      assert.equal(cellState.charsAfter, sampleNum, `Expected displayed cell characters to match ${sampleNum}`);
    }
  });
});


