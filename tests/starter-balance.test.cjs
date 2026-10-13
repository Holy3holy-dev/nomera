'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../netlify/functions/lib/online-core.cjs');

test('one-time 50,000 ₽ starter wallet is constructed exclusively on the server',()=>{
  const fresh=core.freshAccount('NewPlayer','a-safe-password',12345);
  assert.equal(fresh.balance,50000);
  assert.equal(fresh.updatedAt,12345);
  assert.deepEqual(fresh.inventory,[]);
  assert.deepEqual(fresh.myCars,[]);
  assert.notEqual(fresh.pinHash,'a-safe-password');
  assert.equal(core.STARTING_BALANCE,50000);
});
test('a login and online actions do not repeat the initial grant',()=>{
  const fresh=core.freshAccount('NewPlayer','a-safe-password',12345);
  const account={...fresh,inventory:[{id:'plate_100',text:'А 111 АА | 77 RUS',price:1000,rarity:{text:'Обычный'}}]};
  const state={accounts:{newplayer:account},market:{},chat:{}};
  const after=core.mutate(state,'sell','newplayer',{plateId:'plate_100',lotId:'lot_123456789000',price:6000},20000);
  assert.equal(after.accounts.newplayer.balance,50000);
  const cancelled=core.mutate(after,'cancel','newplayer',{lotId:'lot_123456789000'},22000);
  assert.equal(cancelled.accounts.newplayer.balance,50000);
  assert.equal(state.accounts.newplayer.balance,50000);
});
test('register builds profile without trusting client-supplied money or inventory',()=>{
  const f=fs.readFileSync(path.join(__dirname,'../netlify/functions/online.mjs'),'utf8');
  assert.match(f,/const profile=freshAccount\(data\.nickname,data\.pin\)/);
  assert.match(f,/old=>old\?undefined:profile/);
  assert.doesNotMatch(f,/freshAccount\(data\.nickname,data\.pin,data\.balance/);
});

test('server signup reserves the admin identity regardless of client behavior',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../netlify/functions/online.mjs'),'utf8');
  assert.match(src,/if\(key==='h3h'\)return output\(400/);
});
