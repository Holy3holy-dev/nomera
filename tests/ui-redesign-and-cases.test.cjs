'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');

test('HTML & CSS contain Premium Collector + Garage Luxury design system and 6 primary navigation sections', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

  // Primary navigation tabs
  assert.ok(html.includes('id="nav-tab-generator"'));
  assert.ok(html.includes('id="nav-tab-inventory"'));
  assert.ok(html.includes('id="nav-tab-garage"'));
  assert.ok(html.includes('id="nav-tab-market"'));
  assert.ok(html.includes('id="nav-tab-racegame"'));
  assert.ok(html.includes('id="nav-tab-cases"'));
  assert.ok(html.includes('id="nav-more-dropdown"'));
  assert.ok(html.includes('id="nav-more-menu"'));

  // Generator 3-column luxury layout & recent rare drops
  assert.ok(html.includes('gen-luxury-grid'));
  assert.ok(html.includes('id="generator-recent-drops"'));

  // Collection filters & plate detail modal
  assert.ok(html.includes('id="inv-search-input"'));
  assert.ok(html.includes('id="inv-filter-country"'));
  assert.ok(html.includes('id="inv-filter-rarity"'));
  assert.ok(html.includes('id="inv-sort-select"'));
  assert.ok(html.includes('id="plate-detail-modal"'));

  // Garage 3-column layout
  assert.ok(html.includes('id="garage-car-sidebar-list"'));
  assert.ok(html.includes('id="garage-active-inspector"'));

  // Case x1 / x5 / x10 buttons & batch result grid
  assert.ok(html.includes('id="roulette-batch-result"'));
  assert.ok(html.includes('id="roulette-batch-grid"'));
  assert.ok(html.includes('openCaseAgain(1)'));
  assert.ok(html.includes('openCaseAgain(5)'));
  assert.ok(html.includes('openCaseAgain(10)'));

  // Luxury color palette tokens in CSS
  assert.ok(css.includes('#090D13'));
  assert.ok(css.includes('#121821'));
  assert.ok(css.includes('#1B222D'));
  assert.ok(css.includes('#E7243E'));
});

test('Case System: single (x1) and bulk (x5, x10) opening auto-saves rewards atomically without duplication and supports openCaseAgain', () => {
  const app = createApp();

  app.run(`
    balance = 5000000;
    inventory = [];
    myCars = [];
    currentCaseCountry = 'RUS';
  `);

  // 1. Single case open (x1): reward is immediately persisted to inventory even before modal is closed
  app.run(`buyCase('normal', 1);`);
  assert.equal(app.run(`inventory.length`), 1, 'x1 case open must auto-save reward immediately into inventory');

  // Calling rouletteSave() afterwards must be idempotent (must NOT duplicate the item)
  app.run(`rouletteSave();`);
  assert.equal(app.run(`inventory.length`), 1, 'rouletteSave() must not duplicate an already auto-saved plate');

  // 2. Single case open (x1) followed by rouletteSell() removes the auto-saved item and credits its price
  app.run(`isSpinning = false;`);
  const balBeforeSellTest = app.run(`balance`);
  app.run(`buyCase('normal', 1);`);
  assert.equal(app.run(`inventory.length`), 2);
  const wonPrice = app.run(`wonPlateObj.price`);
  app.run(`rouletteSell();`);
  assert.equal(app.run(`inventory.length`), 1, 'rouletteSell() must remove the auto-saved plate from inventory');
  assert.equal(app.run(`balance`), balBeforeSellTest - 5000 + wonPrice);

  // 3. Bulk case open (x5) rolls 5 items, auto-saves all 5, and populates #roulette-batch-grid
  app.run(`isSpinning = false;`);
  const balBeforeX5 = app.run(`balance`);
  app.run(`buyCase('normal', 5);`);
  assert.equal(app.run(`balance`), balBeforeX5 - 25000, 'x5 normal case costs 5 * 5000 = 25000');
  assert.equal(app.run(`batchCaseResults.length`), 5, 'batchCaseResults must hold 5 items');
  assert.equal(app.run(`inventory.length`), 6, 'All 5 batch items must be auto-saved to inventory');
  assert.ok(app.run(`document.getElementById('roulette-batch-grid').innerHTML`).includes('batch-drop-card'));

  // Selling a single item from the batch result removes it from inventory and credits balance
  const item0Price = app.run(`batchCaseResults[0].price`);
  const balBeforeBatchItemSell = app.run(`balance`);
  app.run(`sellSingleBatchDrop(0);`);
  assert.equal(app.run(`inventory.length`), 5);
  assert.equal(app.run(`balance`), balBeforeBatchItemSell + item0Price);

  // Selling remaining batch items via sellBatchCaseResults(false)
  app.run(`sellBatchCaseResults(false);`);
  assert.equal(app.run(`inventory.length`), 1, 'Remaining 4 items from x5 batch sold');

  // 4. openCaseAgain(10) re-opens the last case type 10 times
  app.run(`openCaseAgain(10);`);
  assert.equal(app.run(`batchCaseResults.length`), 10);
  assert.equal(app.run(`inventory.length`), 11);
});

test('Collection filters (search, country, rarity, favorites, duplicates) and Recent Rare Drops work accurately', () => {
  const app = createApp();

  app.run(`
    inventory = [
      { text: 'А 777 АА | 77 RUS', price: 950000, rarity: { text: 'Легендарный', bg: '#f59e0b', color: '#000' }, country: 'RUS', favorite: true, createdAt: 100 },
      { text: 'D 5 | DXB UAE', price: 15000000, rarity: { text: 'БЛАТНОЙ', bg: '#ef4444', color: '#fff' }, country: 'UAE', favorite: false, createdAt: 300 },
      { text: 'В 124 СМ | 77 RUS', price: 1200, rarity: { text: 'Обычный', bg: 'transparent', color: '#fff' }, country: 'RUS', favorite: false, createdAt: 200 },
      { text: 'В 124 СМ | 77 RUS', price: 1200, rarity: { text: 'Обычный', bg: 'transparent', color: '#fff' }, country: 'RUS', favorite: false, createdAt: 250 }
    ];
    renderInventory();
  `);

  assert.equal(app.run(`document.getElementById('col-count-all').textContent`), '4');
  assert.equal(app.run(`document.getElementById('col-count-legendary').textContent`), '2');
  assert.equal(app.run(`document.getElementById('col-count-common').textContent`), '2');
  assert.equal(app.run(`document.getElementById('col-count-fav').textContent`), '1');
  assert.equal(app.run(`document.getElementById('col-count-duplicates').textContent`), '2');

  // Filter by country UAE
  app.run(`setCollectionFilterState({ country: 'UAE' });`);
  assert.ok(app.run(`document.getElementById('inventory-list').innerHTML`).includes('DXB UAE'));
  assert.ok(!app.run(`document.getElementById('inventory-list').innerHTML`).includes('777'));

  // Reset country, filter by favorites
  app.run(`setCollectionFilterState({ country: 'all' }); setCollectionQuickCategory('fav');`);
  assert.ok(app.run(`document.getElementById('inventory-list').innerHTML`).includes('777'));
  assert.ok(!app.run(`document.getElementById('inventory-list').innerHTML`).includes('124'));

  // Recent rare drops feed in Generator
  app.run(`
    recordRecentRareDrop({ text: 'А 777 МР | 97 RUS', price: 2500000, rarity: { text: 'БЛАТНОЙ', bg: '#ef4444', color: '#fff' } });
  `);
  assert.ok(app.run(`document.getElementById('generator-recent-drops').innerHTML`).includes('777'));
});
