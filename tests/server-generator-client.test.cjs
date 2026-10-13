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
test('server claim updates inventory and is not sold for local wallet cash',async()=>{
 const app=createApp();
 app.run(`setOnlineProfile({nickname:nickname,balance:49100,inventory:[]});boardHasLetters=true;boardHasNumbers=true;isSpinning=false`);
 app.context.fetch=async()=>({ok:true,json:async()=>({ok:true,profile:{nickname:app.run('nickname'),balance:49100,inventory:[serverPlate]},plate:serverPlate})});
 await app.run('savePlate()');
 assert.equal(app.run('onlineProfile.inventory.length'),1);
 assert.equal(app.run('inventory[0].id'),serverPlate.id);
 const before=app.run('balance');
 app.run('sellPlate(0)');
 assert.equal(app.run('balance'),before);
 assert.equal(app.run('inventory.length'),1);
});
