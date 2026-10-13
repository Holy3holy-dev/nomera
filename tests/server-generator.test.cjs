'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const c=require('../netlify/functions/lib/online-core.cjs');
const fs=require('node:fs');const path=require('node:path');
const a={nickname:'Racer',balance:50000,inventory:[],myCars:[]};
function state(){return {accounts:{racer:structuredClone(a)},chat:{},market:{}};}
function spin(state,mode,opts={}){
  const roll=c.secureRoll(mode);
  return c.mutate(state,'roll','racer',{roll,region:opts.region||'77'},100);
}
test('server RNG issues valid combinations from cryptographic randomness',()=>{
  for(const mode of ['numbers','letters','both']){
    const roll=c.secureRoll(mode);
    assert.equal(roll.mode,mode);
    if(mode!=='letters')assert.match(roll.num,/^\d{3}$/);
    else assert.equal(roll.num,null);
    if(mode!=='numbers')assert(roll.letters.every(l=>'АВЕКМНОРСТУХ'.includes(l)));
    else assert.equal(roll.letters,null);
  }
  assert.throws(()=>c.secureRoll('admin'),/тип спина/);
});
test('server full spin charges exactly 900 and creates a claimable draft; claim mints only once',()=>{
  let s=spin(state(),'both');
  assert.equal(s.accounts.racer.balance,49100);
  assert.equal(s.accounts.racer.inventory.length,0);
  assert.equal(s.accounts.racer.draft.changedLetters,true);
  assert.equal(s.accounts.racer.draft.changedNumbers,true);
  s=c.mutate(s,'claim','racer',{plateId:'plate_secure_123'});
  assert.equal(s.accounts.racer.inventory.length,1);
  assert.match(s.accounts.racer.inventory[0].text,/^[АВЕКМНОРСТУХ] \d{3} [АВЕКМНОРСТУХ]{2} \| 77 RUS$/u);
  assert(c.priceOfPlate(...s.accounts.racer.draft.letters,s.accounts.racer.draft.num,'77')===s.accounts.racer.inventory[0].price);
  assert.equal(s.accounts.racer.balance,49100);
  assert.throws(()=>c.mutate(s,'claim','racer',{plateId:'plate_secure_321'}),/Сначала прокрутите/);
});
test('partial spins charge 500 each, require both halves, and cannot duplicate a prize',()=>{
  let s=spin(state(),'numbers');
  assert.equal(s.accounts.racer.balance,49500);
  assert.throws(()=>c.mutate(s,'claim','racer',{plateId:'plate_secure_123'}),/Сначала прокрутите/);
  s=spin(s,'letters');
  assert.equal(s.accounts.racer.balance,49000);
  s=c.mutate(s,'claim','racer',{plateId:'plate_secure_123'});
  assert.equal(s.accounts.racer.inventory.length,1);
  assert.throws(()=>c.mutate(s,'claim','racer',{plateId:'plate_secure_123'}),/Сначала прокрутите/);
});
test('roll denies overdraft and rejects regions not matching game rules',()=>{
  const s=state();s.accounts.racer.balance=499;
  assert.throws(()=>spin(s,'numbers'),/Недостаточно/);
  assert.equal(s.accounts.racer.balance,499);
  assert.throws(()=>c.mutate(state(),'roll','racer',{roll:c.secureRoll('both'),region:'7777'}),/регион/);
  assert.throws(()=>c.mutate(state(),'roll','racer',{roll:{mode:'both',num:'777',letters:['A','A','A']},region:'77'}),/спина/);
});
test('server-approved plate can be put on the marketplace; invalid local client item cannot',()=>{
  const s=c.mutate(spin(state(),'both'),'claim','racer',{plateId:'plate_from_server'});
  const posted=c.mutate(s,'sell','racer',{plateId:'plate_from_server',price:10000,lotId:'lot_123456789098'});
  assert.equal(posted.accounts.racer.inventory.length,0);
  assert.equal(posted.market.lot_123456789098.plate.id,'plate_from_server');
  assert.throws(()=>c.mutate(state(),'sell','racer',{plateId:'local_item',price:10000,lotId:'lot_123456789097'}),/отсутствует/);
});
test('front end supports selling plates directly and server claims',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  assert.match(app,/function sellPlate\(index\)/);
  assert.match(app,/if\(onlineProfile\)return serverSpin\('both'\)/);
  assert.match(app,/const data=await onlineRequest\('claim'\)/);
});
