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

test('safePlate accepts RUS, KZ, USA, UAE plates and rejects invalid formats', () => {
  assert.equal(c.safePlate({ text: 'А 777 АА | 777 RUS', price: 50000 }, 'p1').text, 'А 777 АА | 777 RUS');
  assert.equal(c.safePlate({ text: 'V 777 IP | 01 KZ', price: 150000 }, 'p2').text, 'V 777 IP | 01 KZ');
  assert.equal(c.safePlate({ text: 'V 777 IP | CA USA', price: 300000 }, 'p3').text, 'V 777 IP | CA USA');
  assert.equal(c.safePlate({ text: 'D 001 XB | DXB UAE', price: 900000 }, 'p4').text, 'D 001 XB | DXB UAE');

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

  // Elite combinations: D 001 XB | DXB UAE, V 777 IP | CA USA, V 777 IP | 01 KZ
  const uaeElite = c.priceOfPlate('D', 'X', 'B', '001', 'DXB', 'UAE');
  const uaeNonElite = c.priceOfPlate('B', 'C', 'D', '124', 'SHJ', 'UAE');
  assert(uaeElite > 50000000, `Expected UAE D 001 XB | DXB to be ultra-valuable, got ${uaeElite}`);
  assert(uaeElite > uaeNonElite * 10);

  const usaElite = c.priceOfPlate('V', 'I', 'P', '777', 'CA', 'USA');
  const usaNonElite = c.priceOfPlate('B', 'C', 'D', '124', 'OH', 'USA');
  assert(usaElite > 20000000, `Expected USA V 777 IP | CA to be ultra-valuable, got ${usaElite}`);
  assert(usaElite > usaNonElite * 10);

  const kzElite = c.priceOfPlate('V', 'I', 'P', '777', '01', 'KZ');
  const kzNonElite = c.priceOfPlate('B', 'C', 'D', '124', '09', 'KZ');
  assert(kzElite > 10000000, `Expected KZ V 777 IP | 01 to be ultra-valuable, got ${kzElite}`);
  assert(kzElite > kzNonElite * 10);
});

test('mutate roll, setRegion, claim, and sell work end-to-end for KZ, USA, and UAE plates', () => {
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
  assert.match(s.accounts.racer.inventory[0].text, /^[A-Z] \d{3} [A-Z]{2} \| 02 KZ$/);

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
  assert.match(s.accounts.racer.inventory[0].text, /^[A-Z] \d{3} [A-Z]{2} \| NY USA$/);

  // 3. UAE flow (full spin + setRegion + claim + sell + buy)
  const uaeRoll = { mode: 'both', country: 'UAE', num: '001', letters: ['D', 'X', 'B'] };
  s = c.mutate(s, 'roll', 'racer', { roll: uaeRoll, region: 'AUH', country: 'UAE' }, 3000);
  assert.equal(s.accounts.racer.balance, 100000 - 1800 - 4000 - 9000);
  assert.equal(s.accounts.racer.draft.country, 'UAE');
  assert.equal(s.accounts.racer.draft.reg, 'AUH');

  s = c.mutate(s, 'setRegion', 'racer', { region: 'DXB', country: 'UAE' }, 3100);
  assert.equal(s.accounts.racer.draft.reg, 'DXB');

  s = c.mutate(s, 'claim', 'racer', { plateId: 'plate_uae_1' }, 3200);
  assert.equal(s.accounts.racer.inventory[0].text, 'D 001 XB | DXB UAE');
  assert.equal(s.accounts.racer.inventory[0].price, c.priceOfPlate('D', 'X', 'B', '001', 'DXB', 'UAE'));

  // Sell UAE plate on market and buy it with buyer account
  s = c.mutate(s, 'sell', 'racer', { plateId: 'plate_uae_1', lotId: 'lot_uae_1234567890', price: 25000000 }, 3300);
  assert.equal(s.market.lot_uae_1234567890.plate.text, 'D 001 XB | DXB UAE');

  s = c.mutate(s, 'buy', 'buyer', { lotId: 'lot_uae_1234567890' }, 3400);
  assert.equal(s.accounts.buyer.inventory[0].text, 'D 001 XB | DXB UAE');
});

test('Frontend selectPlateCountry switches country, spin costs, regions, and plate formatting across RUS, KZ, USA, UAE', () => {
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
});

