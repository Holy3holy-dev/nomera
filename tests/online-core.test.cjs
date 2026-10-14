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

test('server car market allows selling, atomic buying with funds transfer to seller, and cancellation', () => {
  const car1 = { name: 'ВАЗ-2107 «Жигули»', basePrice: 80000, condition: 100, upgrades: { engine: 1, handling: 0, economy: 0, nitro: 0 } };
  const car2 = { name: 'BMW M5 F90', basePrice: 6500000, condition: 95, upgrades: { engine: 3, handling: 2, economy: 1, nitro: 1 } };
  const s = {
    accounts: {
      seller: { nickname: 'Seller', balance: 10000, inventory: [], myCars: [car1, car2] },
      buyer: { nickname: 'Buyer', balance: 500000, inventory: [], myCars: [car1] }
    },
    market: {},
    chat: {}
  };

  // Cannot sell only car
  assert.throws(() => c.mutate(s, 'sell', 'buyer', { type: 'car', carIndex: 0, lotId: 'lot_car_123456789012', price: 50000 }), /единственный/);

  // Seller puts car2 on market for 200,000 ₽
  const listed = c.mutate(s, 'sell', 'seller', { type: 'car', carIndex: 1, lotId: 'lot_car_123456789012', price: 200000 });
  assert.equal(listed.accounts.seller.myCars.length, 1);
  assert.equal(listed.accounts.seller.myCars[0].name, 'ВАЗ-2107 «Жигули»');
  assert.equal(listed.market['lot_car_123456789012'].type, 'car');
  assert.equal(listed.market['lot_car_123456789012'].car.name, 'BMW M5 F90');
  assert.equal(listed.market['lot_car_123456789012'].price, 200000);

  // Cannot self-buy
  assert.throws(() => c.mutate(listed, 'buy', 'seller', { lotId: 'lot_car_123456789012' }), /собственный/);

  // Buyer purchases car2
  const bought = c.mutate(listed, 'buy', 'buyer', { lotId: 'lot_car_123456789012' });
  // Buyer debited 200,000 ₽, received car
  assert.equal(bought.accounts.buyer.balance, 300000); // 500k - 200k
  assert.equal(bought.accounts.buyer.myCars.length, 2);
  assert.equal(bought.accounts.buyer.myCars[1].name, 'BMW M5 F90');
  // Seller credited 200,000 ₽
  assert.equal(bought.accounts.seller.balance, 210000); // 10k + 200k
  // Lot removed from market
  assert.equal(Object.keys(bought.market).length, 0);

  // Cancellation returns car to seller
  const listedAgain = c.mutate(s, 'sell', 'seller', { type: 'car', carIndex: 1, lotId: 'lot_car_987654321012', price: 150000 });
  const cancelled = c.mutate(listedAgain, 'cancel', 'seller', { lotId: 'lot_car_987654321012' });
  assert.equal(cancelled.accounts.seller.myCars.length, 2);
  assert.equal(cancelled.accounts.seller.myCars[0].name, 'BMW M5 F90');
  assert.equal(Object.keys(cancelled.market).length, 0);
});

test('syncGarage validates cars and updates player garage', () => {
  const s = {
    accounts: {
      player1: { nickname: 'Player1', balance: 50000, inventory: [], myCars: [] }
    },
    market: {},
    chat: {}
  };
  const validCars = [
    {
      name: 'Lada Priora БПАН',
      basePrice: 250000,
      condition: 100,
      styling: {
        color: '#ef4444',
        neon: '#00f0ff',
        tint: 'chameleon',
        wheels: 'deepdish',
        suspension: 'bpan',
        spoiler: 'gt',
        vinyl: 'drift',
        sgu: 'installed'
      }
    }
  ];
  const synced = c.mutate(s, 'syncGarage', 'player1', { myCars: validCars });
  assert.equal(synced.accounts.player1.myCars.length, 1);
  assert.equal(synced.accounts.player1.myCars[0].name, 'Lada Priora БПАН');
  assert.equal(synced.accounts.player1.myCars[0].condition, 100);
  assert.equal(synced.accounts.player1.myCars[0].styling.neon, '#00f0ff');
  assert.equal(synced.accounts.player1.myCars[0].styling.tint, 'chameleon');
  assert.equal(synced.accounts.player1.myCars[0].styling.wheels, 'deepdish');
  assert.equal(synced.accounts.player1.myCars[0].styling.suspension, 'bpan');
  assert.equal(synced.accounts.player1.myCars[0].styling.spoiler, 'gt');
  assert.equal(synced.accounts.player1.myCars[0].styling.vinyl, 'drift');
  assert.equal(synced.accounts.player1.myCars[0].styling.sgu, 'installed');
  assert.throws(() => c.mutate(s, 'syncGarage', 'player1', { myCars: [] }), /пустым/);
});
