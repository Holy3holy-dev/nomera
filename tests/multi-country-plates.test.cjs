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
