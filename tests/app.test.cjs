const test = require('node:test');
const assert = require('node:assert/strict');
const {createApp} = require('./helpers/create-app.cjs');
test('full app initializes with denied browser storage without losing runtime playability', () => {
    const app=createApp({denyStorage:true}); app.context.onload();
    app.run('saveProgress()');
    assert.match(app.elements.get('save-status').textContent,/Не удалось сохранить/);
    assert.equal(app.run('balance'),50000);
});
test('existing empty garage and race snapshot survive local loading', () => {
    const app=createApp({saved:{nickname:'existing',myCars:[],inventory:[],balance:123, raceRecords:{bestSpeed:220}}});
    app.run('loadProgress()');
    assert.equal(app.run('myCars.length'),0); assert.equal(app.run('balance'),123);
    assert.equal(app.run('getRaceRecords().bestSpeed'),220);
});
test('race settlement awards numerical XP, peak record and persists only once', () => {
    const app=createApp();app.run('loadProgress(); isRaceRunning=true; racePlayer.peakSpeed=250; racePlayer.speed=40; racePlayer.distanceKm=2; racePlayer.earnedCash=500; triggerRaceCrash(); triggerRaceCrash();');
    assert.equal(app.run('balance'),50500); assert.equal(app.run('playerExp'),16);
    assert.equal(app.run('getRaceRecords().bestSpeed'),250);
    assert.equal(app.run('getRaceRecords().totalEarned'),500);
    assert.equal(JSON.parse(app.data.get('nomera_player_account')).raceRecords.bestSpeed,250);
});
test('numeric and rarity XP level up consistently, invalid XP is ignored', () => {
    const app=createApp(); app.run('addExp(100); addExp("Редкий"); addExp(NaN); addExp(-200)');
    assert.equal(app.run('playerLevel'),2); assert.equal(app.run('playerExp'),7);
});
test('roulette reward can be claimed or sold exactly once', () => {
    const app=createApp();app.run('wonPlateObj={text:"test",price:100,rarity:{text:"Редкий"}};rouletteSave();rouletteSave();rouletteSell();');
    assert.equal(app.run('inventory.length'),1); assert.equal(app.run('balance'),50000);
    app.run('wonCarObj={name:"test",price:100,img:"",rarity:{text:"Редкий"}};rouletteSellCar();rouletteSellCar();rouletteSaveCar();');
    assert.equal(app.run('balance'),50090); assert.equal(app.run('myCars.length'),1);
});
test('blur and visibility changes release pedals', () => {
    const app=createApp();app.run('setRaceKey("gas",true);setRaceKey("left",true)'); app.events.get('blur')();
    assert.equal(app.run('raceKeys.gas || raceKeys.left'),false);
    app.run('setRaceKey("nitro",true)'); app.context.document.hidden=true;app.events.get('document:visibilitychange')();
    assert.equal(app.run('raceKeys.nitro'),false);
});
test('legacy client no longer reads protected accounts and local play is preserved', () => {
    let calls=0;
    const cloud={ref:()=>{calls++;throw Error('Old Firebase path must not be used');}};
    const app=createApp({cloud,saved:{nickname:'Racer_77',balance:123,myCars:[{name:'Saved vehicle'}],inventory:[{text:'А 123 АА | 77 RUS'}]}});
    app.run('loadProgress();saveProgress()');
    assert.equal(calls,0);
    assert.equal(app.run('balance'),123);
    assert.equal(app.run('myCars[0].name'),'Saved vehicle');
    assert.equal(app.run('inventory[0].text'),'А 123 АА | 77 RUS');
});
test('online profile refresh preserves not-yet-imported local numbers without duplicating server plates', () => {
    const app=createApp();
    app.run(`inventory=[{text:'А 123 АА | 77 RUS',price:1000},{text:'В 456 ВВ | 77 RUS',price:2000}];setOnlineProfile({nickname:nickname,balance:50000,inventory:[{id:'plate_abc',text:'А 123 АА | 77 RUS',price:1000}],myCars:[]},true);`);
    assert.equal(app.run('inventory.length'),2);
    assert.equal(app.run('inventory[0].id'),'plate_abc');
    assert.equal(app.run('inventory[1].text'),'В 456 ВВ | 77 RUS');
});
test('replacing an installed plate returns it and preserves new plate', () => {
    const app=createApp();app.run('myCars[0].plate={text:"old",price:10};inventory=[{text:"new",price:20}];currentCarIndexForAttach=0;attachPlate(0)');
    assert.equal(app.run('myCars[0].plate.text'),'new');assert.equal(app.run('inventory[0].text'),'old');
});
test('admin UI cannot directly alter wallet or become privileged without server verification', async () => {
    let calls=0;
    const app=createApp({cloud:{ref(){calls++;throw Error('No privileged client Firebase calls expected');}}});
    const before=app.run('balance');
    app.run('fetchAdminUsers();adminAddMyBalance(100000000);openAdminModal()');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(app.run('balance'),before);assert.equal(app.run('isAdmin'),false);assert.equal(calls,0);
});
test('unsafe nickname changes cannot overwrite a different account', () => {
    const app=createApp();const oldName=app.run('nickname');
    app.elements.get('nickname-input') || app.run('updateProfileUI()');
    app.elements.get('nickname-input').value='someone-else';
    app.run('saveAccountProfile()');assert.equal(app.run('nickname'),oldName);
});
test('rendered hostile market IDs, avatar URLs and rarity data stay escaped', () => {
    const app=createApp();
    app.run(`marketLots={"');evil();//":{sellerName:'<img onerror=evil()>',sellerAvatar:'data:image/svg+xml,<svg onload=evil()>',price:1000,plate:{text:'<script>evil()</script>',price:1000,rarity:{bg:'red;\" onload=evil()',text:'<img onerror=evil()>'}}}};renderMarketListings();`);
    const html=app.elements.get('market-listings-grid').innerHTML;
    assert(!html.includes('<script>evil()'));
    assert(!html.includes('data:image/svg+xml,<svg onload'));
    assert(!html.includes('" onload=evil()'));
    assert(html.includes('&lt;script&gt;'));
    assert(html.includes('jsArg')===false);
});
test('denied online listing never removes a plate', async()=>{
    const app=createApp();
    app.run(`setOnlineProfile({nickname:nickname,balance:50000,inventory:[{id:'plate_abc',text:'А 111 АА | 77 RUS',price:4500,rarity:{text:'Редкий'}}],myCars:[]},true)`);
    app.context.fetch=async()=>({ok:false,json:async()=>({ok:false,error:'Нет подключения'})});
    app.context.document.getElementById('sell-plate-select').value='plate_abc';
    app.context.document.getElementById('sell-plate-price').value='10000';
    await app.run('confirmSellPlate()');
    assert.equal(app.run('inventory.length'),1);
    assert.equal(app.run('onlineProfile.inventory.length'),1);
});
test('successful server-confirmed listing refreshes wallet and returns no client Firebase writes', async()=>{
    let requests=[];
    const app=createApp({cloud:{ref(){throw Error('No Firebase client writes expected')}}});
    app.run(`setOnlineProfile({nickname:nickname,balance:50000,inventory:[{id:'plate_abc',text:'А 111 АА | 77 RUS',price:4500,rarity:{text:'Редкий'}}],myCars:[]},true)`);
    app.context.fetch=async(url,opts)=>{
        requests.push({url,payload:opts?.body&&JSON.parse(opts.body)});
        if(url.includes('action=public'))return {ok:true,json:async()=>({ok:true,market:{},chat:[]})};
        return {ok:true,json:async()=>({ok:true,profile:{nickname:app.run('nickname'),balance:50000,inventory:[],myCars:[]}})};
    };
    app.context.document.getElementById('sell-plate-select').value='plate_abc';
    app.context.document.getElementById('sell-plate-price').value='10000';
    await app.run('confirmSellPlate()');
    assert.equal(app.run('onlineProfile.inventory.length'),0);
    assert.equal(app.run('inventory.length'),0);
    assert.equal(requests[0].payload.action,'sell');
    assert.equal(requests[0].payload.plateId,'plate_abc');
});
test('server chat retains text on failure and clears after confirmation',async()=>{
    let fail=true, delivered=0;
    const app=createApp();
    app.run('setOnlineProfile({nickname:nickname,balance:50000,inventory:[],myCars:[]})');
    app.context.fetch=async(url)=>{
        if(url.includes('action=public'))return {ok:true,json:async()=>({ok:true,market:{},chat:[]})};
        if(fail)return {ok:false,json:async()=>({ok:false,error:'Ошибка связи'})};
        delivered++;return {ok:true,json:async()=>({ok:true,profile:{}})};
    };
    app.context.document.getElementById('chat-input-field').value='Тест связи';
    await app.run('sendChatMessage()');
    assert.equal(app.context.document.getElementById('chat-input-field').value,'Тест связи');
    fail=false;
    await app.run('sendChatMessage()');
    assert.equal(app.context.document.getElementById('chat-input-field').value,'');
    assert.equal(delivered,1);
});

test('single signup creates server identity and unlocks game, chat and market', async () => {
    const app=createApp({saved:{nickname:'OldPlayer',balance:100000000,myCars:[{name:'Old car'}],inventory:[{text:'А 123 АА | 77 RUS'}],playerPin:'do-not-leak'}});
    app.run('loadProgress()');
    let payload, requests=[];
    app.context.fetch=async(url,options)=>{
        requests.push(url);
        if(url.includes('action=public')) return {ok:true,json:async()=>({ok:true,market:{},chat:[]})};
        payload=JSON.parse(options.body);
        return {ok:true,json:async()=>({ok:true,profile:{nickname:'NewRacer_01',balance:50000,inventory:[],myCars:[],playerLevel:1,playerExp:0}})};
    };
    app.context.document.getElementById('reg-nickname-input').value='NewRacer_01';
    app.context.document.getElementById('reg-pin-input').value='correct-horse-staple';
    await app.run('handleRegisterAction()');
    assert.deepEqual(Object.keys(payload).sort(),['action','nickname','pin']);
    assert.equal(payload.action,'register');
    assert.equal(payload.nickname,'NewRacer_01');
    assert.equal(app.run('nickname'),'NewRacer_01');
    assert.equal(app.run('onlineProfile.balance'),50000);
    assert.equal(app.run('ensureOnlineAccess()'),true);
    assert.equal(app.run('balance'),50000);
    assert.equal(app.run('inventory.length'),0);
    assert.equal(app.run('myCars.length'),1);
    assert.equal(app.context.document.getElementById('reg-pin-input').value,'');
    const saved=app.data.get('nomera_player_account');
    assert(!saved.includes('correct-horse-staple'));
    assert(!saved.includes('do-not-leak'));
    assert(!app.data.get('nomera_user_session').includes('pin'));
});

test('failed server registration does not create fake local account or starter money',async()=>{
    const app=createApp({saved:{nickname:'Existing',balance:1234,myCars:[],inventory:[]}});
    app.run('loadProgress()');
    app.context.document.getElementById('reg-nickname-input').value='RejectedAccount';
    app.context.document.getElementById('reg-pin-input').value='safe-password-123';
    app.context.fetch=async()=>({ok:false,json:async()=>({ok:false,error:'Такой никнейм уже занят'})});
    await app.run('handleRegisterAction()');
    assert.equal(app.run('nickname'),'Existing');
    assert.equal(app.run('balance'),1234);
    assert.equal(app.run('onlineProfile'),null);
});

test('single login restores previously created server account without re-registration',async()=>{
    const app=createApp({saved:{nickname:'PlayerOne',balance:750,myCars:[{name:'Kept car'}],inventory:[]}});
    app.run('loadProgress()');
    const actions=[];
    app.context.fetch=async(url,opts)=>{
       if(url.includes('action=public'))return {ok:true,json:async()=>({ok:true,chat:[],market:{}})};
       actions.push(JSON.parse(opts.body).action);
       return {ok:true,json:async()=>({ok:true,profile:{nickname:'PlayerOne',balance:32100,inventory:[],myCars:[]}})};
    };
    app.context.document.getElementById('login-nickname-input').value='PlayerOne';
    app.context.document.getElementById('login-pin-input').value='another-long-password';
    await app.run('handleLoginAction()');
    assert.deepEqual(actions,['login']);
    assert.equal(app.run('ensureOnlineAccess()'),true);
    assert.equal(app.run('onlineProfile.balance'),32100);
    assert.equal(app.run('balance'),750);
    assert.equal(app.run('myCars[0].name'),'Kept car');
    assert.equal(app.context.document.getElementById('login-pin-input').value,'');
    assert(!app.data.get('nomera_player_account').includes('another-long-password'));
});

test('returning browser restores a server session even without any local profile',async()=>{
    const app=createApp();
    app.context.fetch=async()=>({ok:true,json:async()=>({ok:true,profile:{nickname:'ServerPlayer',balance:50000,inventory:[],myCars:[]}})});
    assert.equal(await app.run('restoreOnlineSession()'),true);
    assert.equal(app.run('nickname'),'ServerPlayer');
    assert.equal(app.run('ensureOnlineAccess()'),true);
    assert.equal(app.run('balance'),50000);
    assert.equal(JSON.parse(app.data.get('nomera_player_account')).nickname,'ServerPlayer');
});

test('online button opens the same login modal, no second online registration',()=>{
    const app=createApp();
    app.run('openOnlineAccess()');
    assert.equal(app.run('ensureOnlineAccess()'),false);
    const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
    assert(!html.includes('id="online-access-modal"'));
});
