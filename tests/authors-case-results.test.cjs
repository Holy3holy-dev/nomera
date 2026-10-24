const test = require('node:test');
const assert = require('node:assert/strict');
const ui = require('../js/authors-case-results.js');
const items = [
    {_openingId:'a',text:'А 100 АА',price:100,rarity:{text:'Обычный'}},
    {_openingId:'b',isCar:true,name:'G63',price:1001,_isDuplicate:true,rarity:{text:'Легендарный'}},
    {_openingId:'c',text:'品川 330',price:900,_sold:true,_isDuplicate:true,rarity:{text:'Редкий'}},
    {_openingId:'d',text:'B 777',price:700,rarity:{text:'Эпический'}}
];
test('case results retain original indices through search, filters and sorting', () => {
    assert.deepEqual(ui.visibleItems(items,{filter:'duplicates'}).map(r=>r.index),[1]);
    assert.deepEqual(ui.visibleItems(items,{filter:'sold'}).map(r=>r.index),[2]);
    assert.deepEqual(ui.visibleItems(items,{filter:'new',sort:'rarity'}).map(r=>r.index),[3,0]);
    assert.deepEqual(ui.visibleItems(items,{sort:'price',query:'g63'}).map(r=>r.index),[1]);
    assert.deepEqual(ui.visibleItems(items,{filter:'kept',kept:new Set(['d'])}).map(r=>r.index),[3]);
});
test('case sale proceeds keep plate value and floor car commission', () => {
    assert.equal(ui.proceeds(items[0]),100);
    assert.equal(ui.proceeds(items[1]),900);
    assert.equal(ui.canSell(items[2]),false);
});
