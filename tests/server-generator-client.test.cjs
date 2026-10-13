'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('./helpers/create-app.cjs');
const serverPlate={id:'plate_server_abc',text:'А 777 АА | 77 RUS',price:770500,rarity:{text:'Эпический'}};
test('logged in full spin charges on server and updates wallet, not local cash',async()=>{
 const app=createApp();
 app.run("setOnlineProfile({nickname:nickname,balance:50000,inventory:[],myCars:[]})");
 let sent=[];
 app.context.fetch=async (url,options)=>{
   const input=JSON.parse(options.body);sent.push(input);
   assert.equal(input.action,'roll');
   return {ok:true,json:async()=>({ok:true,profile:{nickname:app.run('nickname'),balance:49100,inventory:[]},draft:{letters:['А','А','А'],num:'777',reg:'77',hasNumbers:true,hasLetters:true,changedNumbers:true,changedLetters:true}})};
 };
 const oldBalance=app.run('balance');
 await app.run('spinBoth()');
 assert.equal(sent[0].mode,'both');
 assert.equal(sent[0].region,'777');
 assert.equal(app.run('onlineProfile.balance'),49100);
 assert.equal(app.run('balance'),oldBalance);
 assert.equal(app.run('currentNum'),'777');
 assert.equal(app.run('currentReg'),'77');
 assert.equal(app.run('hasSpunNumSinceSave'),true);
 assert.match(app.elements.get('generator-online-wallet').textContent,/49\s?100/);
});
test('save server number must wait for server; no local mint on failed claim',async()=>{
 const app=createApp();
 app.run(`setOnlineProfile({nickname:nickname,balance:49100,inventory:[]});boardHasLetters=true;boardHasNumbers=true;isSpinning=false`);
 app.context.fetch=async()=>({ok:false,status:409,json:async()=>({ok:false,error:'Не найден серверный спин'})});
 await app.run('savePlate()');
 assert.equal(app.run('inventory.length'),0);
 assert.equal(app.run('onlineProfile.inventory.length'),0);
});
 test('server claim updates inventory and can be sold directly',async()=>{
  const app=createApp();
  app.run(`setOnlineProfile({nickname:nickname,balance:49100,inventory:[]});boardHasLetters=true;boardHasNumbers=true;isSpinning=false`);
  app.context.fetch=async()=>({ok:true,json:async()=>({ok:true,profile:{nickname:app.run('nickname'),balance:49100,inventory:[serverPlate]},plate:serverPlate})});
  await app.run('savePlate()');
  assert.equal(app.run('onlineProfile.inventory.length'),1);
  assert.equal(app.run('inventory[0].id'),serverPlate.id);
  const before=app.run('balance');
  app.run('sellPlate(0)');
  assert.equal(app.run('balance'),before + serverPlate.price);
  assert.equal(app.run('inventory.length'),0);
 });

test('guest mode partial spin of numbers preserves letters and vice versa', () => {
  const app = createApp();
  app.run(`currentL1='А'; currentL2='В'; currentL3='Е'; boardHasLetters=true;`);
  app.run(`setCellChar('cell-l1', 'А'); setCellChar('cell-l2', 'В'); setCellChar('cell-l3', 'Е');`);

  // Spin numbers
  app.run('spinNumbers()');
  assert.match(app.run('currentNum'), /^\d{3}$/);
  assert.equal(app.run('currentL1'), 'А');
  assert.equal(app.run('currentL2'), 'В');
  assert.equal(app.run('currentL3'), 'Е');
  assert.equal(app.elements.get('cell-l1').querySelector('.char-span').innerText, 'А');
  assert.equal(app.elements.get('cell-l2').querySelector('.char-span').innerText, 'В');
  assert.equal(app.elements.get('cell-l3').querySelector('.char-span').innerText, 'Е');

  app.run('isSpinning = false;');
  const oldNum = app.run('currentNum');
  app.run(`setCellChar('cell-n1', '${oldNum[0]}'); setCellChar('cell-n2', '${oldNum[1]}'); setCellChar('cell-n3', '${oldNum[2]}');`);
  // Spin letters
  app.run('spinLetters()');
  assert.equal(app.run('currentNum'), oldNum);
  assert.equal(app.elements.get('cell-n1').querySelector('.char-span').innerText, oldNum[0]);
  assert.equal(app.elements.get('cell-n2').querySelector('.char-span').innerText, oldNum[1]);
  assert.equal(app.elements.get('cell-n3').querySelector('.char-span').innerText, oldNum[2]);
});

test('online mode partial spin of numbers preserves letters and vice versa', async () => {
  const app = createApp();
  app.run("setOnlineProfile({nickname:nickname,balance:50000,inventory:[],myCars:[],draft:{letters:['О','О','О'],num:'555',hasLetters:true,hasNumbers:true,changedLetters:true,changedNumbers:true}})");
  app.run("currentL1='О'; currentL2='О'; currentL3='О'; currentNum='555'; boardHasLetters=true; boardHasNumbers=true;");
  app.run("setCellChar('cell-l1', 'О'); setCellChar('cell-l2', 'О'); setCellChar('cell-l3', 'О'); setCellChar('cell-n1', '5'); setCellChar('cell-n2', '5'); setCellChar('cell-n3', '5');");

  let sent = [];
  app.context.fetch = async (url, options) => {
    const input = JSON.parse(options.body);
    sent.push(input);
    if (input.mode === 'numbers') {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          profile: { nickname: app.run('nickname'), balance: 49500, inventory: [] },
          draft: { letters: ['-','-','-'], num: '777', reg: '77', hasNumbers: true, hasLetters: false, changedNumbers: true, changedLetters: false }
        })
      };
    }
    if (input.mode === 'letters') {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          profile: { nickname: app.run('nickname'), balance: 49000, inventory: [] },
          draft: { letters: ['Е','К','Х'], num: '---', reg: '77', hasNumbers: false, hasLetters: true, changedNumbers: false, changedLetters: true }
        })
      };
    }
  };

  // Spin numbers
  await app.run('spinNumbers()');
  assert.equal(sent[0].mode, 'numbers');
  assert.equal(app.run('currentNum'), '777');
  // Letters MUST NOT be overwritten by draft.letters ['-','-','-']!
  assert.equal(app.run('currentL1'), 'О');
  assert.equal(app.run('currentL2'), 'О');
  assert.equal(app.run('currentL3'), 'О');
  assert.equal(app.elements.get('cell-l1').querySelector('.char-span').innerText, 'О');
  assert.equal(app.elements.get('cell-l2').querySelector('.char-span').innerText, 'О');
  assert.equal(app.elements.get('cell-l3').querySelector('.char-span').innerText, 'О');

  app.run('isSpinning = false; serverSpinBusy = false;');
  app.run("setCellChar('cell-n1', '7'); setCellChar('cell-n2', '7'); setCellChar('cell-n3', '7');");

  // Spin letters
  await app.run('spinLetters()');
  assert.equal(sent[1].mode, 'letters');
  assert.equal(app.run('currentL1'), 'Е');
  assert.equal(app.run('currentL2'), 'К');
  assert.equal(app.run('currentL3'), 'Х');
  // Numbers MUST NOT be overwritten by draft.num '---'!
  assert.equal(app.run('currentNum'), '777');
  assert.equal(app.elements.get('cell-n1').querySelector('.char-span').innerText, '7');
  assert.equal(app.elements.get('cell-n2').querySelector('.char-span').innerText, '7');
  assert.equal(app.elements.get('cell-n3').querySelector('.char-span').innerText, '7');
});

test('onlineFirebaseFallback partial rolls do not cross-mutate unspun plate portion', async () => {
  const dbData = new Map();
  const mockRef = (path) => ({
    update: async (val) => { dbData.set(path, { ...(dbData.get(path) || {}), ...val }); },
    set: async (val) => { dbData.set(path, val); },
    once: async () => ({ exists: () => dbData.has(path), val: () => dbData.get(path) })
  });
  const app = createApp({ cloud: { ref: mockRef } });
  app.run("useFirebaseFallback = true;");
  app.run("setOnlineProfile({nickname:nickname,balance:50000,inventory:[],myCars:[]})");
  app.run("currentL1='М'; currentL2='М'; currentL3='М'; currentNum='100'; boardHasLetters=true; boardHasNumbers=true;");

  // Call fallback roll for numbers
  const resNum = await app.run("onlineFirebaseFallback('roll', { mode: 'numbers', region: '77' })");
  assert.equal(resNum.ok, true);
  assert.match(resNum.draft.num, /^\d{3}$/);
  assert.equal(JSON.stringify(resNum.draft.letters), JSON.stringify(['М', 'М', 'М']));
  assert.equal(resNum.draft.hasNumbers, true);
  assert.equal(resNum.draft.changedNumbers, true);

  // Call fallback roll for letters
  const resLet = await app.run("onlineFirebaseFallback('roll', { mode: 'letters', region: '77' })");
  assert.equal(resLet.ok, true);
  assert.equal(resLet.draft.num, resNum.draft.num);
  assert(resLet.draft.letters.every(l => 'АВЕКМНОРСТУХ'.includes(l)));
  assert.equal(resLet.draft.hasLetters, true);
  assert.equal(resLet.draft.changedLetters, true);
});

