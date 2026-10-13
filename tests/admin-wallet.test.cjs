'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('./helpers/create-app.cjs');

test('admin wallet reward targets currently displayed player and updates locally only after confirmed server balance', async()=>{
  const app=createApp({saved:{nickname:'Racer_77',balance:67444,myCars:[{name:'Saved vehicle'}],inventory:[{text:'А 123 АА | 77 RUS'}]}});
  app.run('loadProgress();isAdmin=true');
  let requestKey;
  app.context.fetch=async (_url,options)=>{
    if(options.method==='GET') return {ok:true,json:async()=>({ok:true,users:[]})};
    const payload=JSON.parse(options.body);
    requestKey=payload.key;
    return {ok:true,json:async()=>({ok:true,balance:100067444})};
  };
  await app.run('adminAddMyBalance(100000000)');
  assert.equal(requestKey,'racer_77');
  assert.equal(app.run('balance'),100067444);
  const saved=JSON.parse(app.data.get('nomera_player_account'));
  assert.equal(saved.balance,100067444);
  assert.equal(saved.myCars[0].name,'Saved vehicle');
  assert.equal(saved.inventory[0].text,'А 123 АА | 77 RUS');
});

test('server denial of admin credit never modifies player wallet',async()=>{
  const app=createApp({saved:{nickname:'Racer_77',balance:67444}});
  app.run('loadProgress();isAdmin=true');
  app.context.fetch=async()=>({ok:false,json:async()=>({ok:false,error:'Доступ запрещён'})});
  await app.run('adminAddMyBalance(100000000)');
  assert.equal(app.run('balance'),67444);
  assert.equal(JSON.parse(app.data.get('nomera_player_account')).balance,67444);
});

test('old local garage persists while server online wallet becomes authoritative for trades',()=>{
  const app=createApp({saved:{nickname:'Racer_77',balance:67444,myCars:[{name:'Saved vehicle'}],inventory:[{text:'А 123 АА | 77 RUS'}]}});
  app.run('loadProgress()');
  app.run(`setOnlineProfile({nickname:'Racer_77',balance:100067444,inventory:[],myCars:[]},false)`);
  assert.equal(app.run('onlineProfile.balance'),100067444);
  assert.equal(app.run('balance'),67444); // gameplay wallet intentionally remains local
  assert.equal(app.run('myCars[0].name'),'Saved vehicle');
  assert.equal(app.run('inventory[0].text'),'А 123 АА | 77 RUS');
});

test('admin balance response provides authoritative amount, without exposing unrelated profile data',()=>{
  const fs=require('node:fs');const path=require('node:path');
  const code=fs.readFileSync(path.resolve(__dirname,'../netlify/functions/admin.mjs'),'utf8');
  assert.match(code,/confirmedBalance=balance/);
  assert.doesNotMatch(code,/nickname:key,playerLevel:1,inventory:\[\],myCars:\[\]/);
  assert.match(code,/\{balance:confirmedBalance\}/);
});
