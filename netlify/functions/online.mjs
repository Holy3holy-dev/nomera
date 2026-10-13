// H3H Nomera V4.4.2 online release. All online balance/inventory mutations happen server-side.
import crypto from 'node:crypto';
import core from './lib/online-core.cjs';
const {keyOf,checkPin,sign,verify,cookie,sessionCookie,sanitizedProfile,freshAccount}=core;
let cachedDb;
async function getDb(){
  if(cachedDb) return cachedDb;
  const mod=await import('firebase-admin');
  const fb=mod.default||mod;
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const url=process.env.FIREBASE_DATABASE_URL;
  if(!raw || !url || !/^https:\/\/h3h-nomera-server-default-rtdb(?:\.[a-z0-9-]+)?\.(?:firebasedatabase\.app|firebaseio\.com)\/?$/i.test(url)) throw Error('Firebase service environment is not configured');
  const creds=JSON.parse(raw);
  if(creds.project_id!=='h3h-nomera-server') throw Error('Unexpected Firebase project');
  if(!fb.apps.length) fb.initializeApp({credential:fb.credential.cert(creds), databaseURL:url});
  cachedDb=fb.database();return cachedDb;
}
function output(status,body,setCookie=''){
  return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(setCookie?{'Set-Cookie':setCookie}:{})}});
}
function uniqueId(){return crypto.randomBytes(15).toString('base64url');}
function remoteIp(request,context){return context.ip||'unknown';}
function errorMessage(e){
  const safe=/^(Неверн|Аккаунт|Пароль|Нельзя|Рынок|Этот номер|Лот|Продавец|Инвентарь|Недостаточно|Баланс|Минимальная|Сообщение|Подождите|Уже активирован|Требуется|Доступ|Сессия)/u;
  return safe.test(e.message)?e.message:'Сервер не смог обработать запрос';
}
function authValue(request,secret){return verify(secret,cookie(request.headers.get('cookie')),'player');}
function profileOf(a){return sanitizedProfile(a);}
async function handle(request,context={}){
  if(!['GET','POST'].includes(request.method)) return output(405,{ok:false,error:'Метод не поддерживается'});
  const host=new URL(request.url).host;
  if(request.method==='POST'){
    const origin=request.headers.get('origin');
    if(origin){let good=false;try{const u=new URL(origin);good=u.host===host&&(u.protocol==='https:'||(u.hostname==='localhost'&&u.protocol==='http:'));}catch{}if(!good)return output(403,{ok:false,error:'Недопустимый источник запроса'});}
    if(request.headers.get('sec-fetch-site')==='cross-site')return output(403,{ok:false,error:'Недопустимый источник запроса'});
    if(!(request.headers.get('content-type')||'').startsWith('application/json'))return output(415,{ok:false,error:'Требуется JSON'});
  }
  if(!process.env.NOMERA_ADMIN_SESSION_SECRET||process.env.NOMERA_ADMIN_SESSION_SECRET.length<32) return output(503,{ok:false,error:'Серверные секреты не настроены'});
  const secret=process.env.NOMERA_ADMIN_SESSION_SECRET;
  let data={};
  if(request.method==='POST'){
    const raw=await request.text();
    if(Buffer.byteLength(raw)>250000) return output(413,{ok:false,error:'Слишком большой запрос'});
    try{data=JSON.parse(raw);}catch{return output(400,{ok:false,error:'Неверный JSON'});}
  }
  const action=request.method==='GET'?new URL(request.url).searchParams.get('action'):data.action;
  try{
    const db=await getDb();
    if(action==='public'&&request.method==='GET'){
      const [marketSnap,chatSnap]=await Promise.all([db.ref('onlineV4/market').orderByChild('createdAt').limitToLast(100).once('value'),db.ref('onlineV4/chat').limitToLast(40).once('value')]);
      return output(200,{ok:true,market:marketSnap.val()||{},chat:Object.values(chatSnap.val()||{}).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0))});
    }
    if(action==='register'&&request.method==='POST'){
      const key=keyOf(data.nickname);
      if(key==='h3h')return output(400,{ok:false,error:'Аккаунт h3h зарезервирован для администратора'});
      const profile=freshAccount(data.nickname,data.pin);
      // Rate limit anonymous account creation. One 50,000 ₽ grant is minted inside the create-only transaction.
      const source=crypto.createHmac('sha256',secret)
        .update('register:'+remoteIp(request,context)).digest('hex').slice(0,48);
      const gateRef=db.ref('onlineSecurity/registerAttempts/'+source);
      const now=Date.now();
      const gate=await gateRef.transaction(v=>{
        const previous=v && v.since>now-86400000 && v.since<=now ? Number(v.count)||0 : 0;
        if(previous>=4)return;
        return {count:previous+1,since:previous?v.since:now};
      },undefined,false);
      if(!gate.committed)return output(429,{ok:false,error:'Лимит регистраций. Попробуйте завтра'});
      const tx=await db.ref('onlineV4/accounts/'+key).transaction(
        old=>old?undefined:profile,undefined,false);
      if(!tx.committed)return output(409,{ok:false,error:'Такой никнейм уже занят. Используйте вход'});
      return output(201,{ok:true,profile:profileOf(profile)},
        sessionCookie(sign(secret,{role:'player',key,exp:Date.now()+core.TTL})));
    }
    if(action==='login'&&request.method==='POST'){
      const key=keyOf(data.nickname);
      const ipHash=crypto.createHmac('sha256',secret).update(remoteIp(request,context)+':'+key).digest('hex').slice(0,48);
      const gateRef=db.ref('onlineSecurity/loginAttempts/'+ipHash);
      const now=Date.now();
      const gate=await gateRef.transaction(v=>{let count=v&&v.since>now-900000&&v.since<now?Number(v.count)||0:0;if(count>=5)return;return {count:count+1,since:count?v.since:now};},undefined,false);
      if(!gate.committed)return output(429,{ok:false,error:'Слишком много попыток. Попробуйте позже'});
      const a=(await db.ref('onlineV4/accounts/'+key).once('value')).val();
      if(!a||!checkPin(data.pin,a.pinHash))return output(401,{ok:false,error:'Неверный никнейм или PIN'});
      await gateRef.remove();
      return output(200,{ok:true,profile:profileOf(a)},sessionCookie(sign(secret,{role:'player',key,exp:Date.now()+core.TTL})));
    }
    if(action==='logout'&&request.method==='POST')return output(200,{ok:true},sessionCookie('',0));
    const session=authValue(request,secret);
    if(!session)return output(401,{ok:false,error:'Требуется вход в онлайн-профиль'});
    const key=keyOf(session.key);
    if(action==='me' && request.method==='GET'){
      const a=(await db.ref('onlineV4/accounts/'+key).once('value')).val();
      if(!a)return output(401,{ok:false,error:'Сессия устарела или аккаунт удалён. Войдите заново'},sessionCookie('',0));
      return output(200,{ok:true,profile:profileOf(a),key});
    }
    if(request.method!=='POST'||!['sell','buy','cancel','chat','roll','claim'].includes(action))return output(400,{ok:false,error:'Неизвестное действие'});
    const txnInput={...data,lotId:action==='sell'?'lot_'+uniqueId():data.lotId,
      plateId:action==='claim'?'plate_'+uniqueId():data.plateId,
      roll:action==='roll'?core.secureRoll(data.mode):undefined,
      messageId:'msg_'+String(Date.now()).padStart(13,'0')+'_'+uniqueId()};
    // A fresh Admin SDK instance may invoke a parent transaction with a locally cached null.
    // Load the authoritative parent first, and distinguish an expired/deleted account
    // from that initial empty cache. Otherwise chat/sales can fail with 'Account not found'.
    const stateRef=db.ref('onlineV4');
    const current=(await stateRef.once('value')).val();
    if(!current?.accounts?.[key])return output(401,{ok:false,error:'Сессия устарела или аккаунт удалён. Войдите заново'},sessionCookie('',0));
    const update=core.makeOnlineTransactionUpdate(current,action,key,txnInput,Date.now());
    const tx=await stateRef.transaction(update.update,undefined,false);
    if(!tx.committed)return output(409,{ok:false,error:update.getReason()||'Операция не выполнена, повторите попытку'});
    const state=tx.snapshot.val(), a=state.accounts[key];
    return output(200,{ok:true,profile:profileOf(a),market:state.market||{},draft:action==='roll'?core.draftOf(a):undefined,plate:action==='claim'?(a.inventory||[])[0]:undefined});
  }catch(e){console.error('online V4.4',action,e.message);return output(400,{ok:false,error:errorMessage(e)});}
}
export default async function online(request,context={}){
  try{return await handle(request,context)}catch(e){console.error('online failure',e.message);return output(500,{ok:false,error:'Внутренняя ошибка сервера'});}
}
