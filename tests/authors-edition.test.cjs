const test = require('node:test');
const assert = require('node:assert/strict');
const {createApp} = require('./helpers/create-app.cjs');

test('Author preview isolates game writes and denies server operations', async()=>{
 const app=createApp({saved:{nickname:'Real player',balance:987654,inventory:[],myCars:[]}});
 const original=app.run("localStorage.getItem('nomera_player_account')");
 app.run("window.NOMERA_AUTHORS_PREVIEW=true;window.NOMERA_STORAGE_PREFIX='preview-test:';nickname='Demo';balance=100;saveProgress(false);");
 assert.equal(app.run("localStorage.getItem('nomera_player_account')"),original);
 assert.equal(JSON.parse(app.run("localStorage.getItem('preview-test:nomera_player_account')")).nickname,'Demo');
 await assert.rejects(app.run("onlineRequest('buy',{id:'test'})"),/предпросмотр/);
 await assert.rejects(app.run("adminRequest('session')"),/предпросмотр/);
});

test('Collection valuation includes favorites but bulk sale still excludes them',()=>{
 const app=createApp();
 app.run("inventory=[{text:'А777АА 777',price:1000,favorite:true},{text:'М555ММ 77',price:200}];updateBulkSellButtons();");
 assert.match(app.run("document.getElementById('col-plates-summary').textContent").replace(/[\s\u00a0\u202f]/g,''),/1200₽/);
 assert.match(app.run("document.getElementById('btn-sell-all-plates').textContent").replace(/[\s\u00a0\u202f]/g,''),/1шт.*200₽/);
});

test('Case rewards award item and XP once for the same opening',()=>{
 const app=createApp();
 app.run("inventory=[];myCars=[];playerExp=0;playerLevel=1;persistAutoSavedCaseReward({_openingId:'plate-1',text:'А123АА 77',price:1000,rarity:{text:'Обычный'}});");
 const plateState=app.run('JSON.stringify({count:inventory.length,exp:playerExp,level:playerLevel})');
 app.run("persistAutoSavedCaseReward({_openingId:'plate-1',text:'А123АА 77',price:1000,rarity:{text:'Обычный'}})");
 assert.equal(app.run('JSON.stringify({count:inventory.length,exp:playerExp,level:playerLevel})'),plateState);
 app.run("persistAutoSavedCaseReward({_openingId:'car-1',isCar:true,name:'ВАЗ-2107 «Жигули»',price:120000,rarity:{text:'Супер редкий'}})");
 const carState=app.run('JSON.stringify({count:myCars.length,exp:playerExp,level:playerLevel})');
 app.run("persistAutoSavedCaseReward({_openingId:'car-1',isCar:true,name:'ВАЗ-2107 «Жигули»',price:120000,rarity:{text:'Супер редкий'}})");
 assert.equal(app.run('JSON.stringify({count:myCars.length,exp:playerExp,level:playerLevel})'),carState);
});

test('Case animation preference uses the preview storage namespace',()=>{
 const app=createApp();
 app.run("localStorage.setItem('nomera_case_anim_mode','standard');window.NOMERA_STORAGE_PREFIX='preview-test:';setCaseAnimMode('instant')");
 assert.equal(app.run("localStorage.getItem('nomera_case_anim_mode')"),'standard');
 assert.equal(app.run("localStorage.getItem('preview-test:nomera_case_anim_mode')"),'instant');
});
