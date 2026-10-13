const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const security = require('../js/security.js');
const {createStorage, createSaveQueue} = require('../js/storage.js');
const race = require('../js/race-records.js');
const backing = () => {
    const data = new Map();
    return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
};
test('HTML escaping and JS arguments preserve hostile strings as one literal', () => {
    const hostile = "');globalThis.hacked=true;//\"<img onerror=evil()>\\\n";
    const encoded = security.jsArg(hostile);
    const decoded = encoded.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    const context = {receive: v => v};
    assert.equal(vm.runInNewContext('receive(' + decoded + ')', context), hostile);
    assert.equal(context.hacked, undefined);
    assert(!security.escapeHtml(hostile).includes('<img'));
});
test('image URLs reject attribute injection, script schemes and untrusted SVG', () => {
    for (const value of ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=evil()>', 'https://ok.test/" onerror="evil()']) {
        const rendered = security.escapeHtml(security.safeImageUrl(value, 'fallback'));
        assert(!rendered.includes('" onerror="'));
    }
    assert.equal(security.safeImageUrl('javascript:evil()', 'fallback'), 'fallback');
    assert.equal(security.safeImageUrl('data:image/svg+xml,<svg/>', 'fallback'), 'fallback');
    assert.equal(security.safeImageUrl('https://ok.test/a.png', 'fallback'), 'https://ok.test/a.png');
    assert.equal(security.safeImageUrl('trusted-svg', 'fallback', ['trusted-svg']), 'trusted-svg');
});
test('denied storage keeps session in memory, reports failure and tolerates bad JSON', () => {
    let failures = 0;
    const store = createStorage({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}}, () => failures++);
    assert.equal(store.set('k', 'saved'), false);
    assert.equal(store.get('k'), 'saved');
    store.remove('k'); assert.equal(store.get('k'), null);
    store.set('bad', '{'); assert.equal(store.json('bad', 'default'), 'default');
    assert(failures >= 3);
});
test('race records migrate once, preserve v1 and isolate accounts', () => {
    const store = createStorage(backing());
    store.set('race_records_v1', JSON.stringify({bestDistance: 12, bestSpeed: 210, totalEarned: 800}));
    const records = race.createRecords(store);
    records.bind('Alice', {legacy:true}); assert.equal(records.get().bestSpeed, 210);
    records.bind('Bob', {legacy:true}); assert.equal(records.get().bestSpeed, 0);
    records.bind('Alice'); assert.equal(records.get().bestDistance, 12);
    assert(store.get('race_records_v1'));
});
test('snapshots merge monotonically and malformed record fields do not break rendering', () => {
    assert.deepEqual(race.merge({bestSpeed: 300}, {bestSpeed: 200, bestDistance: 8}), {bestDistance:8,bestSpeed:300,totalEarned:0});
    assert.deepEqual(race.normalize({bestDistance: 'bad', bestSpeed:Infinity,totalEarned:-1}), {bestDistance:0,bestSpeed:0,totalEarned:0});
    assert.equal(race.finishRecords({}, {distanceKm:5,peakSpeed:280,speed:30}, 50).bestSpeed,280);
});
test('cloud saves serialize snapshots and recover after a rejected write', async () => {
    const calls = []; let release;
    const queue = createSaveQueue(async data => {
        calls.push(data);
        if (data.balance === 1) await new Promise(resolve => release=resolve);
        if (data.balance === 2) throw Error('synthetic failure');
    });
    const input = {balance:1}; const a = queue(input); input.balance = 999;
    const b = queue({balance:2}); const bResult = b.catch(e => e);
    const c = queue({balance:3});
    await Promise.resolve(); assert.equal(calls.length,1);
    release(); await a; assert((await bResult) instanceof Error); await c;
    assert.deepEqual(calls.map(v=>v.balance), [1,2,3]);
});
