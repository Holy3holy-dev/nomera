const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('../netlify/functions/lib/online-core.cjs');
const secret='S'.repeat(48);
const plate={id:'plate_1',text:'А 123 АА | 77 RUS',price:7000,rarity:{text:'Редкий'}};
function make(){return {accounts:{player1:{nickname:'Player1',balance:20000,inventory:[plate]},player2:{nickname:'Player2',balance:50000,inventory:[]}},market:{},chat:{}};}
test('PIN uses salted scrypt, sessions cannot be forged and expire',()=>{
  const a=c.pinHash('differentPassword#1'),b=c.pinHash('differentPassword#1');
  assert.notEqual(a,b);assert(c.checkPin('differentPassword#1',a));assert(!c.checkPin('badpassword',a));
  const t=c.sign(secret,{role:'player',key:'player1',exp:Date.now()+120000});
  assert.equal(c.verify(secret,t,'player').key,'player1');
  assert.equal(c.verify(secret,t+'x','player'),null);
  assert.equal(c.verify(secret,t,'activate'),null);
  const expired=c.sign(secret,{role:'player',key:'player1',exp:Date.now()-1});
  assert.equal(c.verify(secret,expired,'player'),null);
});
test('plate validation rejects markup, invalid format, embedded values',()=>{
  assert.equal(c.safePlate(plate,'server_abc').id,'server_abc');
  assert.throws(()=>c.safePlate({text:'<svg onload=alert(1)>',price:10},'evil'),/формат/);
  assert.throws(()=>c.money(-1));
  assert.throws(()=>c.money(3.2));
});
test('sale removes an owned plate exactly once and cannot sell another account item',()=>{
  const s=make();const data={plateId:'plate_1',lotId:'lot_123456789012',price:9000};
  const next=c.mutate(s,'sell','player1',data);
  assert.equal(s.accounts.player1.inventory.length,1);
  assert.equal(next.accounts.player1.inventory.length,0);
  assert.equal(next.market[data.lotId].price,9000);
  assert.throws(()=>c.mutate(next,'sell','player1',data),/отсутствует/);
  assert.throws(()=>c.mutate(s,'sell','player2',data),/отсутствует/);
});
test('atomic buy moves plate and money once; empty lot and self-purchase rejected',()=>{
  const s=c.mutate(make(),'sell','player1',{plateId:'plate_1',lotId:'lot_123456789012',price:9000});
  assert.throws(()=>c.mutate(s,'buy','player1',{lotId:'lot_123456789012'}),/собственный/);
  const final=c.mutate(s,'buy','player2',{lotId:'lot_123456789012'});
  assert.equal(final.accounts.player1.balance,29000);
  assert.equal(final.accounts.player2.balance,41000);
  assert.equal(final.accounts.player2.inventory.length,1);
  assert.equal(Object.keys(final.market).length,0);
  assert.throws(()=>c.mutate(final,'buy','player2',{lotId:'lot_123456789012'}),/Лот/);
});
test('denied purchase and cancelled listing do not lose assets or mint currency',()=>{
  let s=c.mutate(make(),'sell','player1',{plateId:'plate_1',lotId:'lot_123456789012',price:100000});
  assert.throws(()=>c.mutate(s,'buy','player2',{lotId:'lot_123456789012'}),/Недостаточно/);
  assert.equal(s.accounts.player2.balance,50000);
  assert.throws(()=>c.mutate(s,'cancel','player2',{lotId:'lot_123456789012'}),/другому/);
  s=c.mutate(s,'cancel','player1',{lotId:'lot_123456789012'});
  assert.equal(s.accounts.player1.inventory.length,1);
  assert.equal(s.accounts.player1.balance,20000);
  assert.equal(Object.keys(s.market).length,0);
});
test('chat sender comes from session, is rate-limited and rejects empty messages',()=>{
  let s=make();
  s=c.mutate(s,'chat','player1',{messageId:'msg1',text:'  hello  '},10000);
  assert.equal(s.chat.msg1.text,'hello');
  assert.equal(s.chat.msg1.senderName,'Player1');
  assert.throws(()=>c.mutate(s,'chat','player1',{messageId:'msg2',text:'spam'},11000),/Подождите/);
  assert.throws(()=>c.mutate(s,'chat','player2',{messageId:'msg3',text:' '.repeat(4)},20000),/Сообщение/);
});

test('fresh online registration gets 50,000 server rubles once, with no imported items',()=>{
  const start=c.freshAccount('  NewPlayer  ','my-secret-123',12345);
  assert.equal(start.nickname,'NewPlayer');
  assert.equal(start.balance,50000);
  assert.equal(c.STARTING_BALANCE,50000);
  assert.deepEqual(start.inventory,[]);
  assert.deepEqual(start.myCars,[]);
  assert.equal(start.playerLevel,1);
  assert.equal(start.playerExp,0);
  assert.equal(start.updatedAt,12345);
  assert(c.checkPin('my-secret-123',start.pinHash));
  assert.throws(()=>c.freshAccount('bad/username','my-secret-123'),/Неверный никнейм/);
  assert.throws(()=>c.freshAccount('ValidName','123'),/Пароль/);
});
