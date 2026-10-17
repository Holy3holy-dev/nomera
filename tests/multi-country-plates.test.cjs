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
  assert.equal(c.safePlate({ text: 'DXB 001 | DXB UAE', price: 900000 }, 'p4').text, 'DXB 001 | DXB UAE');

  // Legacy formats
  assert.equal(c.safePlate({ text: 'V 777 IP | 01 KZ', price: 150000 }, 'p2_leg').text, 'V 777 IP | 01 KZ');
  assert.equal(c.safePlate({ text: 'V 777 IP | CA USA', price: 300000 }, 'p3_leg').text, 'V 777 IP | CA USA');
  assert.equal(c.safePlate({ text: 'D 001 XB | DXB UAE', price: 900000 }, 'p4_leg').text, 'D 001 XB | DXB UAE');

  // formatPlateText helper
  assert.equal(c.formatPlateText('А', 'А', 'А', '777', '777', 'RUS'), 'А 777 АА | 777 RUS');
  assert.equal(c.formatPlateText('V', 'I', 'P', '777', '01', 'KZ'), '777 VIP | 01 KZ');
  assert.equal(c.formatPlateText('V', 'I', 'P', '777', 'CA', 'USA'), 'VIP 777 | CA USA');
  assert.equal(c.formatPlateText('D', 'X', 'B', '001', 'DXB', 'UAE'), 'DXB 001 | DXB UAE');

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
  assert.equal(s.accounts.racer.inventory[0].text, 'DXB 001 | DXB UAE');
  assert.equal(s.accounts.racer.inventory[0].price, c.priceOfPlate('D', 'X', 'B', '001', 'DXB', 'UAE'));

  // Sell UAE plate on market and buy it with buyer account
  s = c.mutate(s, 'sell', 'racer', { plateId: 'plate_uae_1', lotId: 'lot_uae_1234567890', price: 25000000 }, 3300);
  assert.equal(s.market.lot_uae_1234567890.plate.text, 'DXB 001 | DXB UAE');

  s = c.mutate(s, 'buy', 'buyer', { lotId: 'lot_uae_1234567890' }, 3400);
  assert.equal(s.accounts.buyer.inventory[0].text, 'DXB 001 | DXB UAE');
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


