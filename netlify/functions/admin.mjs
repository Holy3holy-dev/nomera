// All privileged Firebase actions live on the server. Never ship service account data to users.
import crypto from 'node:crypto';
import core from './lib/admin-core.cjs';
import onlineCore from './lib/online-core.cjs';
import cars from '../../data/cars.json' with { type: 'json' };
const {verifyPassword,token,verifyToken,getCookie,sessionCookie,keyFromPlayer,validMoney,json} = core;
let firebaseDb;
async function getDb() {
  if (firebaseDb) return firebaseDb;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw Error('Сервис Firebase не настроен');
  const firebaseModule = await import('firebase-admin');
  const firebase = firebaseModule.default || firebaseModule;
  const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (account.project_id !== 'h3h-nomera-server') throw Error('Service account must belong to h3h-nomera-server');
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL || !/^https:\/\/h3h-nomera-server-default-rtdb(?:\.[a-z0-9-]+)?\.(?:firebasedatabase\.app|firebaseio\.com)\/?$/i.test(databaseURL)) {
    throw Error('Invalid FIREBASE_DATABASE_URL for h3h-nomera-server');
  }
  if (!firebase.apps.length) firebase.initializeApp({credential:firebase.credential.cert(account),databaseURL});
  firebaseDb = firebase.database();
  return firebaseDb;
}
function sameOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (!origin) return true; // Browser sends Origin for POST; non-browser clients still need HMAC session.
  try {
    const o = new URL(origin);
    const host = event.headers?.host || event.headers?.Host;
    return (o.protocol==='https:' || (o.protocol==='http:' && o.hostname==='localhost')) && o.host===host;
  } catch (_) { return false; }
}
function clientId(event, secret) {
  const ip=(event.headers?.['x-nf-client-connection-ip'] || event.headers?.['client-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown');
  return crypto.createHmac('sha256',secret).update(String(ip)).digest('hex').slice(0,40);
}
async function gateLogin(db, id, didSucceed) {
  const ref=db.ref('adminSecurity/loginAttempts/'+id);
  const now=Date.now(), WINDOW=15*60*1000;
  let previousCount=0;
  const result=await ref.transaction(old=>{
    const count=old && old.since>now-WINDOW && old.since<=now ? Number(old.count)||0 : 0;
    previousCount=count;
    if (didSucceed && count < 5) return null;
    return {since:count ? old.since : now, count: count>=5 ? count : count+1};
  },undefined,false);
  return previousCount < 5 && result.committed;
}
async function audit(db, action, data) {
  await db.ref('adminAudit').push({action, ...data, time:Date.now()});
}
function userShape(key,u) {
  return {key,nickname:String(u.nickname||key).slice(0,50),balance:Number(u.balance)||0,playerLevel:Number(u.playerLevel)||1,carsCount:Array.isArray(u.myCars)?u.myCars.length:Object.keys(u.myCars||{}).length,platesCount:Array.isArray(u.inventory)?u.inventory.length:Object.keys(u.inventory||{}).length};
}
async function adjustBalance(db,key,value,isDelta) {
  const onlineSnap=await db.ref('onlineV4/accounts/'+key).once('value');
  if(onlineSnap.exists()) {
    const loaded=onlineSnap.val();
    let first=true;
    const ref=db.ref('onlineV4/accounts/'+key);
    const tx=await ref.transaction(a=>{
      const base=(first&&a==null)?loaded:a;
      first=false;
      if(!base) return;
      const current=Number.isSafeInteger(base.balance)?base.balance:0;
      const next=isDelta?current+value:value;
      if(!Number.isSafeInteger(next)||next<0||next>1000000000000) return;
      return {...base,balance:next,updatedAt:Date.now()};
    },undefined,false);
    if(!tx.committed)throw Error('Баланс выходит за допустимые пределы');
    const confirmed=tx.snapshot.val().balance;
    // Legacy mirror is non-authoritative after online migration.
    await db.ref('users/'+key+'/balance').set(confirmed);
    return confirmed;
  }
  const ref=db.ref('users/'+key);
  const legSnap=await ref.once('value');
  const loadedLeg=legSnap.val();
  let firstLeg=true;
  const result=await ref.transaction(old=>{
    const base=(firstLeg&&old==null)?loadedLeg:old;
    firstLeg=false;
    const profile=base && typeof base==='object' ? base : {nickname:key,playerLevel:1}; // Never invent empty garage on a wallet-only grant
    const current=Number.isSafeInteger(profile.balance) ? profile.balance : 0;
    const next=isDelta ? current+value : value;
    if (!Number.isSafeInteger(next) || next<0 || next>1000000000000) return; // abort
    return {...profile,balance:next,updatedAt:Date.now()};
  }, undefined, false);
  if (!result.committed) throw Error('Баланс выходит за допустимые пределы');
  const profile=result.snapshot.val();
  await db.ref('leaderboard/'+key).update({nickname:profile.nickname,balance:profile.balance,playerLevel:profile.playerLevel||1,updatedAt:Date.now()});
  return profile.balance;
}
async function addCars(db,key,names) {
  const templates=names.map(name=>cars.find(c=>c.name===name));
  if(templates.some(c=>!c)) throw Error('Автомобиль отсутствует в каталоге');
  let finalCars = [];
  const add=profile=>{
    const existing=Array.isArray(profile.myCars)?profile.myCars:Object.values(profile.myCars||{});
    const fresh=templates.filter(c=>!existing.some(item=>item.name===c.name)).map(c=>({name:c.name,basePrice:c.price,category:c.category,img:c.img,plate:null,condition:100,upgrades:{engine:0,handling:0,economy:0,nitro:0}}));
    finalCars = [...existing,...fresh].slice(0,200);
    return {...profile,myCars:finalCars,updatedAt:Date.now()};
  };
  const onlineRef=db.ref('onlineV4/accounts/'+key);
  const onlineSnap=await onlineRef.once('value');
  if(onlineSnap.exists()) {
    const loaded=onlineSnap.val();
    let first=true;
    const done=await onlineRef.transaction(v=>{
      const base=(first&&v==null)?loaded:v;
      first=false;
      return base?add(base):undefined;
    },undefined,false);
    if(!done.committed)throw Error('Не удалось обновить онлайн-гараж');
  }
  const ref=db.ref('users/'+key);
  const legSnap=await ref.once('value');
  const loadedLeg=legSnap.val();
  let firstLeg=true;
  const result=await ref.transaction(old=>{
    const base=(firstLeg&&old==null)?loadedLeg:old;
    firstLeg=false;
    return add(base && typeof base==='object'?base:{nickname:key,balance:50000,playerLevel:1});
  },undefined,false);
  if (!result.committed) throw Error('Не удалось обновить гараж');
  await db.ref('leaderboard/'+key).update({carsCount:Array.isArray(finalCars)?finalCars.length:Object.keys(finalCars||{}).length});
  return finalCars;
}
async function givePlate(db,key,plateText) {
  if(typeof plateText!=='string'||plateText.length>36||!/^([АВЕКМНОРСТУХ] [0-9]{3} [АВЕКМНОРСТУХ]{2} \| [0-9]{2,3} RUS)$/u.test(plateText)) throw Error('Неверный формат номера');
  const plate={text:plateText,price:1000,rarity:{text:'Обычный'}};
  const onlineRef=db.ref('onlineV4/accounts/'+key);
  const onlineSnap=await onlineRef.once('value');
  if(onlineSnap.exists()) {
    const loaded=onlineSnap.val();
    let first=true;
    const confirmed=await onlineRef.transaction(v=>{
      const base=(first&&v==null)?loaded:v;
      first=false;
      if(!base)return;
      const inv=Array.isArray(base.inventory)?base.inventory:Object.values(base.inventory||{});
      if(inv.length>=1000)return;
      return {...base,inventory:[{...plate,id:'plate_'+crypto.randomBytes(15).toString('base64url')},...inv],updatedAt:Date.now()};
    },undefined,false);
    if(!confirmed.committed)throw Error('Онлайн-инвентарь заполнен');
  }
  const ref=db.ref('users/'+key);
  const legSnap=await ref.once('value');
  const loadedLeg=legSnap.val();
  let firstLeg=true;
  const result=await ref.transaction(old=>{
    const base=(firstLeg&&old==null)?loadedLeg:old;
    firstLeg=false;
    const profile=base && typeof base==='object' ? base : {nickname:key,balance:50000,playerLevel:1};
    const inv=Array.isArray(profile.inventory)?profile.inventory:Object.values(profile.inventory||{});
    return {...profile,inventory:[plate,...inv].slice(0,1000),updatedAt:Date.now()};
  },undefined,false);
  if (!result.committed) throw Error('Не удалось добавить номер');
}
async function handle(event) {
  const method=(event.httpMethod||'').toUpperCase();
  if (method!=='GET' && method!=='POST') return json(405,{ok:false,error:'Метод не поддерживается'});
  if (!sameOrigin(event)) return json(403,{ok:false,error:'Недопустимый источник запроса'});
  const secret=process.env.NOMERA_ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret)<32 || !process.env.NOMERA_ADMIN_PASSWORD_HASH) return json(503,{ok:false,error:'Админ-панель не настроена. Добавьте секреты в Netlify Environment Variables.'});
  let input={};
  if(method==='POST') {
    if(!(event.headers?.['content-type']||event.headers?.['Content-Type']||'').startsWith('application/json')) return json(415,{ok:false,error:'Требуется JSON'});
    if((event.body||'').length>8192) return json(413,{ok:false,error:'Слишком большой запрос'});
    try { input=JSON.parse(event.body||'{}'); } catch (_) { return json(400,{ok:false,error:'Неверный JSON'}); }
  }
  const action=method==='GET'?new URLSearchParams(event.queryStringParameters||{}).get('action'):input.action;
  if (action==='login' && method==='POST') {
    if (input.login!=='h3h'||typeof input.password!=='string'||input.password.length>128) return json(401,{ok:false,error:'Неверные данные для входа'});
    try {
      const db=await getDb();
      const id=clientId(event,secret);
      // A transaction serializes attempts by IP; locked clients never get a new session.
      const permitted=await gateLogin(db,id,false);
      if (!permitted) return json(429,{ok:false,error:'Слишком много попыток. Попробуйте через 15 минут.'});
      const correct=verifyPassword(input.password,process.env.NOMERA_ADMIN_PASSWORD_HASH);
      if (!correct) return json(401,{ok:false,error:'Неверные данные для входа'});
      await db.ref('adminSecurity/loginAttempts/'+id).remove();
      await audit(db,'adminLogin',{client:id});
      return json(200,{ok:true,role:'admin'},sessionCookie(token(secret)));
    } catch (e) { console.error('Admin login storage unavailable',e.message); return json(503,{ok:false,error:'База данных администратора недоступна'}); }
  }
  const authorized=verifyToken(getCookie(event),secret);
  if(action==='session' && method==='GET') return authorized?json(200,{ok:true,role:'admin'}):json(401,{ok:false,error:'Сессия не найдена'});
  if(action==='logout' && method==='POST') return json(200,{ok:true},sessionCookie('',0));
  if(!authorized) return json(401,{ok:false,error:'Требуется вход администратора'});
  try {
    const db=await getDb();
    if(action==='users' && method==='GET') {
      // Both legacy and newly registered online-only players belong in the admin roster.
      const [legacySnap,onlineSnap]=await Promise.all([
        db.ref('users').orderByKey().limitToFirst(200).once('value'),
        db.ref('onlineV4/accounts').orderByKey().limitToFirst(200).once('value')
      ]);
      const rows={...(legacySnap.val()||{}),...(onlineSnap.val()||{})};
      const users=Object.entries(rows)
        .filter(([,v])=>v&&typeof v==='object')
        .sort(([a],[b])=>a.localeCompare(b))
        .slice(0,200)
        .map(([key,u])=>userShape(key,u));
      return json(200,{ok:true,users,limitedTo:200});
    }
    if(action==='activity' && method==='GET') {
      const snap=await db.ref('activity').limitToLast(150).once('value');
      const events=Object.values(snap.val()||{}).reverse().filter(v=>v&&typeof v==='object').map(x=>({nickname:String(x.nickname||'Игрок').slice(0,64),action:String(x.action||'').slice(0,80),details:String(x.details||'').slice(0,500),timestamp:Number(x.timestamp)||0}));
      return json(200,{ok:true,activity:events});
    }
    if(action==='online' && method==='GET') {
      const snap=await db.ref('presence').once('value');
      const map=snap.val()||{};
      const now=Date.now();
      const list=Object.entries(map).map(([k,v])=>({
        key: k,
        nickname: String(v.nickname||k).slice(0,50),
        avatarData: v.avatarData||'',
        loginTime: Number(v.loginTime)||Number(v.timestamp)||now,
        lastActive: Number(v.lastActive)||Number(v.timestamp)||now,
        action: String(v.action||'В игре').slice(0,60),
        details: String(v.details||'').slice(0,120),
        balance: Number(v.balance)||0,
        playerLevel: Number(v.playerLevel)||1,
        currentCar: String(v.currentCar||'').slice(0,60),
        carsCount: Number(v.carsCount)||1,
        platesCount: Number(v.platesCount)||0,
        online: true
      })).sort((a,b)=>(b.lastActive||0)-(a.lastActive||0));
      return json(200,{ok:true,online:list});
    }
    if(method!=='POST') return json(405,{ok:false,error:'Для изменения данных нужен POST'});
    const key=['setBalance','addBalance','giveCar','giveAllCars','givePlate','deleteUser','renameUser'].includes(action)?keyFromPlayer(input.key):null;
    let auditData={key};
    let confirmedBalance;
    switch(action) {
      case 'setBalance': case 'addBalance': {
        const amount=validMoney(input.amount);
        const balance=await adjustBalance(db,key,amount,action==='addBalance');
        confirmedBalance=balance;
        auditData={key,amount, balance}; break;
      }
      case 'giveCar': case 'giveAllCars': {
        const names=action==='giveAllCars'?cars.map(c=>c.name):[input.carName];
        const updatedCars=await addCars(db,key,names);
        auditData={key,names};
        await audit(db,action,auditData);
        return json(200,{ok:true,cars:updatedCars});
      }
      case 'givePlate': {
        await givePlate(db,key,input.plateText);auditData={key,plateText:input.plateText};break;
      }
      case 'renameUser': {
        const newNick=String(input.newNickname||'').trim();
        if(!newNick||newNick.length<2||newNick.length>40) throw Error('Никнейм от 2 до 40 символов');
        const newKey=keyFromPlayer(newNick);
        const userSnap=await db.ref('users/'+key).once('value');
        if(userSnap.exists()){
          const val=userSnap.val();
          val.nickname=newNick; val.updatedAt=Date.now();
          if(key!==newKey){ await db.ref('users/'+newKey).set(val); await db.ref('users/'+key).remove(); }
          else { await db.ref('users/'+key).update({nickname:newNick,updatedAt:Date.now()}); }
        }
        const onlSnap=await db.ref('onlineV4/accounts/'+key).once('value');
        if(onlSnap.exists()){
          const val=onlSnap.val();
          val.nickname=newNick; val.updatedAt=Date.now();
          if(key!==newKey){ await db.ref('onlineV4/accounts/'+newKey).set(val); await db.ref('onlineV4/accounts/'+key).remove(); }
          else { await db.ref('onlineV4/accounts/'+key).update({nickname:newNick,updatedAt:Date.now()}); }
        }
        const lbSnap=await db.ref('leaderboard/'+key).once('value');
        if(lbSnap.exists()){
          const val=lbSnap.val();
          val.nickname=newNick; val.updatedAt=Date.now();
          if(key!==newKey){ await db.ref('leaderboard/'+newKey).set(val); await db.ref('leaderboard/'+key).remove(); }
          else { await db.ref('leaderboard/'+key).update({nickname:newNick,updatedAt:Date.now()}); }
        }
        auditData={key,newNickname:newNick,newKey}; break;
      }
      case 'deleteUser': {
        if(key==='h3h') throw Error('Главный профиль нельзя удалить');
        const marketSnap = await db.ref('onlineV4/market').once('value').catch(() => null);
        if (marketSnap && marketSnap.exists()) {
          const market = marketSnap.val() || {};
          const toRemove = Object.keys(market).filter(id => market[id]?.sellerKey === key);
          await Promise.all(toRemove.map(id => db.ref('onlineV4/market/' + id).remove().catch(() => {})));
        }
        await db.ref('onlineV4/accounts/'+key).remove();
        await db.ref('users/'+key).remove();
        await db.ref('leaderboard/'+key).remove();
        await db.ref('online/'+key).remove();
        auditData={key,deleted:true}; break;
      }
      case 'broadcast': {
        if(typeof input.text!=='string'||!input.text.trim()||input.text.length>120) throw Error('Сообщение до 120 символов');
        await db.ref('chat').push({isSystem:true,text:'👑 АДМИНИСТРАЦИЯ: '+input.text.trim(),timestamp:Date.now()});
        auditData={messageLength:input.text.length};break;
      }
      case 'clearActivity': { await db.ref('activity').remove();auditData={cleared:true};break; }
      default: return json(400,{ok:false,error:'Неизвестное действие'});
    }
    await audit(db,action,auditData);
    return json(200,{ok:true, ...(confirmedBalance === undefined ? {} : {balance:confirmedBalance})});
  } catch (e) {
    console.error('Admin action failed:',action,e.message);
    return json(400,{ok:false,error: /ключ игрока|сумма|формат номера|баланс|каталоге|нельзя удалить|до 120/.test(e.message)?e.message:'Не удалось выполнить действие. Проверьте доступ к базе.'});
  }
}
// Modern Netlify Functions entrypoint. This removes legacy Lambda's 4 KB env cap.
export default async function admin(request, context = {}) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  headers.host ||= url.host;
  // Netlify provides the client IP as trusted context (do not rely on user-supplied IP headers).
  if (context.ip) headers['x-nf-client-connection-ip'] = context.ip;
  const event = {
    httpMethod: request.method,
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: request.method === 'POST' ? await request.text() : '',
  };
  let legacy;
  try {
    legacy = await handle(event);
  } catch (e) {
    console.error('Admin server failed', e.message);
    legacy = json(500, {ok:false, error:'Внутренняя ошибка сервера'});
  }
  return new Response(legacy.body, { status: legacy.statusCode, headers: legacy.headers });
}

