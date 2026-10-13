'use strict';
const crypto = require('node:crypto');
const COOKIE = 'nomera_online';
const TTL = 24 * 3600 * 1000;
const MAX_MONEY = 1000000000000;
const STARTING_BALANCE = 50000; // Server-issued once, only when the account is first created
const NAME = /^[\p{L}\p{N}_\- ]{2,40}$/u;
function keyOf(n) {
  if (typeof n !== 'string') throw Error('Неверный никнейм');
  const key = n.trim().toLowerCase().replace(/[.#$\[\]\/]/g,'_');
  if (!NAME.test(key)) throw Error('Неверный никнейм');
  return key;
}
function pinHash(pin, salt = crypto.randomBytes(24).toString('hex')) {
  if (typeof pin !== 'string' || pin.length < 6 || pin.length > 72) throw Error('Пароль должен быть от 6 до 72 символов');
  return `scrypt$${salt}$${crypto.scryptSync(pin,salt,64).toString('hex')}`;
}
// A fresh online account never accepts money or items from browser input.
function freshAccount(nickname, pin, now = Date.now()) {
  const key = keyOf(nickname);
  if (key !== nickname.trim().toLowerCase()) throw Error('Неверный никнейм');
  return {
    nickname: nickname.trim(),
    balance: STARTING_BALANCE,
    inventory: [],
    myCars: [],
    playerLevel: 1,
    playerExp: 0,
    pinHash: pinHash(pin),
    updatedAt: now
  };
}
function checkPin(pin, format) {
  const m = typeof format==='string' && /^scrypt\$([a-f0-9]{48})\$([a-f0-9]{128})$/.exec(format);
  if (!m || typeof pin!=='string'||pin.length>72) return false;
  const a=crypto.scryptSync(pin,m[1],64), b=Buffer.from(m[2],'hex');
  return crypto.timingSafeEqual(a,b);
}
function sign(secret,claims) {
  const p=Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${p}.${crypto.createHmac('sha256',secret).update(p).digest('base64url')}`;
}
function verify(secret,token,role) {
  if (typeof secret!=='string' || secret.length<32 || typeof token!=='string' || token.length>2048) return null;
  const [p,h,extra]=token.split('.');
  if (!p||!h||extra!==undefined) return null;
  const expected=crypto.createHmac('sha256',secret).update(p).digest('base64url');
  if (h.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(h),Buffer.from(expected))) return null;
  try {
    const obj=JSON.parse(Buffer.from(p,'base64url').toString());
    if (obj.role!==role || !Number.isSafeInteger(obj.exp) || obj.exp<=Date.now() || obj.exp>Date.now()+TTL+10000) return null;
    return obj;
  } catch { return null; }
}
function cookie(header,name=COOKIE){return String(header||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';}
function sessionCookie(tok,maxAge=86400){return `${COOKIE}=${tok}; HttpOnly; Secure; SameSite=Strict; Path=/.netlify/functions/online; Max-Age=${maxAge}`;}
function safePlate(raw,id){
  if (!raw || typeof raw!=='object'||Array.isArray(raw)) throw Error('Неверный номер');
  const text=String(raw.text||'');
  if (text.length>36 || !/^[АВЕКМНОРСТУХ] \d{3} [АВЕКМНОРСТУХ]{2} \| \d{2,3} RUS$/u.test(text)) throw Error('Неверный формат номера');
  const price=Number.isSafeInteger(raw.price) && raw.price>=0 && raw.price<=MAX_MONEY ? raw.price : 1000;
  return {id, text, price, rarity:{text:typeof raw.rarity?.text==='string'?raw.rarity.text.slice(0,30):'Обычный'}};
}
function money(v){if(!Number.isSafeInteger(v) ||v<0||v>MAX_MONEY) throw Error('Неверная сумма');return v;}
// The server is authoritative for generator rolls: the browser sends only a mode and region.
const LETTERS = ['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'];
const ELITES = ['ААА','АМР','ВВВ','ВОР','ТТТ','ХХХ','ККК','ЕКХ','АЕО'];
function priceOfPlate(l1,l2,l3,num,reg) {
  let price=500, letters=l1+l2+l3;
  if(ELITES.includes(letters)) {
    if(num==='011') return 10000000;
    if(num==='777') price+=4000000;
    else if(num[0]===num[1]&&num[1]===num[2]) price+=1500000;
    else if(num==='001') price+=800000;
    else price+=300000;
  }
  if(letters==='ВОР')price+=800000;
  if(letters==='ЕКХ')price+=1000000;
  if(letters==='АМР')price+=1200000;
  if(num==='011')price+=1500000;
  if(num[0]===num[1]&&num[1]===num[2])price+=(num==='777'?500000:250000);
  else if(num==='007')price+=150000;
  else if(num.startsWith('00'))price+=70000;
  else if(num.endsWith('00'))price+=50000;
  else if(num[0]===num[2])price+=25000;
  if(l1===l2&&l2===l3)price+=150000;
  if(reg==='777'||reg==='77')price+=20000;
  return price;
}
function rarityOfPrice(p){
  if(p>=10000000)return 'БЛАТНОЙ';
  if(p>=3000000)return 'Крутой';
  if(p>=1000000)return 'Легендарный';
  if(p>=300000)return 'Эпический';
  if(p>=100000)return 'Супер редкий';
  if(p>=30000)return 'Редкий';
  if(p>=5000)return 'Необычный';
  return 'Обычный';
}
function secureRoll(mode){
  if(!['both','numbers','letters'].includes(mode))throw Error('Неверный тип спина');
  const choose=arr=>arr[crypto.randomInt(arr.length)];
  return {mode,
    num:mode==='letters'?null:String(crypto.randomInt(1000)).padStart(3,'0'),
    letters:mode==='numbers'?null:[choose(LETTERS),choose(LETTERS),choose(LETTERS)]
  };
}
function draftOf(a){return a?.draft&&typeof a.draft==='object'?a.draft:{num:'---',letters:['-','-','-'],reg:'777',hasNumbers:false,hasLetters:false,changedNumbers:false,changedLetters:false};}
function sanitizedProfile(a){return {nickname:a.nickname, balance:a.balance, inventory:a.inventory||[], myCars:a.myCars||[], playerLevel:a.playerLevel||1, playerExp:a.playerExp||0, updatedAt:a.updatedAt||0, draft:a.draft||null};}
function mutate(state, action, key, data, now=Date.now()) {
  if (!state || typeof state!=='object') state={};
  const accounts={...(state.accounts||{})};
  const market={...(state.market||{})};
  const a=accounts[key];
  if (!a) throw Error('Аккаунт не найден');
  if(action==='roll') {
    const roll=data.roll;
    const cost=roll?.mode==='both'?900:500;
    if(!roll||!['both','numbers','letters'].includes(roll.mode)
      || (roll.num!==null && !/^\d{3}$/.test(roll.num))
      || (roll.letters!==null && (!Array.isArray(roll.letters)||roll.letters.length!==3||roll.letters.some(l=>!LETTERS.includes(l)))))throw Error('Неверный тип спина');
    if(!/^\d{2,3}$/.test(data.region))throw Error('Неверный регион');
    if(a.balance<cost)throw Error('Недостаточно денег на онлайн-кошельке');
    const draft={...draftOf(a),reg:data.region};
    if(roll.num!==null){draft.num=roll.num;draft.hasNumbers=true;draft.changedNumbers=true;}
    if(roll.letters!==null){draft.letters=roll.letters;draft.hasLetters=true;draft.changedLetters=true;}
    accounts[key]={...a,balance:a.balance-cost,draft,updatedAt:now};
  } else if(action==='claim') {
    const draft=draftOf(a);
    if(!draft.hasNumbers||!draft.hasLetters||!draft.changedNumbers||!draft.changedLetters)throw Error('Сначала прокрутите цифры и буквы');
    if((a.inventory||[]).length>=1000)throw Error('Инвентарь заполнен');
    if(!/^[0-9]{3}$/.test(draft.num)||!Array.isArray(draft.letters)||draft.letters.length!==3||draft.letters.some(l=>!LETTERS.includes(l)))throw Error('Неверный номер');
    const [l1,l2,l3]=draft.letters;
    const text=`${l1} ${draft.num} ${l2}${l3} | ${draft.reg} RUS`;
    const price=priceOfPlate(l1,l2,l3,draft.num,draft.reg);
    const plate=safePlate({text,price,rarity:{text:rarityOfPrice(price)}},data.plateId);
    accounts[key]={...a,inventory:[plate,...(a.inventory||[])],draft:{...draft,changedNumbers:false,changedLetters:false},updatedAt:now};
  } else if (action==='sell') {
    const price=money(data.price);
    if (price<1000) throw Error('Минимальная цена 1 000 ₽');
    if (Object.keys(market).length>=1000) throw Error('Рынок переполнен');
    if (!Array.isArray(a.inventory)) throw Error('Инвентарь недоступен');
    const pos=a.inventory.findIndex(p=>p.id===data.plateId);
    if(pos<0) throw Error('Этот номер отсутствует в серверном инвентаре');
    const plate=a.inventory[pos];
    const lotId=data.lotId;
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(lotId) || market[lotId]) throw Error('Неверный идентификатор лота');
    accounts[key]={...a,inventory:a.inventory.filter((_,i)=>i!==pos),updatedAt:now};
    market[lotId]={lotId,sellerKey:key,sellerName:a.nickname,plate,price,createdAt:now};
  } else if (action==='cancel') {
    const lot=market[data.lotId];
    if(!lot || lot.sellerKey!==key) throw Error('Лот не найден или принадлежит другому игроку');
    if((a.inventory||[]).length>=1000) throw Error('Инвентарь заполнен');
    accounts[key]={...a,inventory:[lot.plate,...(a.inventory||[])],updatedAt:now};
    delete market[data.lotId];
  } else if(action==='buy') {
    const lot=market[data.lotId];
    if(!lot) throw Error('Лот уже продан или снят');
    if(lot.sellerKey===key) throw Error('Нельзя купить собственный лот');
    const seller=accounts[lot.sellerKey];
    if(!seller) throw Error('Продавец не найден');
    if((a.inventory||[]).length>=1000) throw Error('Инвентарь заполнен');
    if(a.balance<lot.price) throw Error('Недостаточно денег на онлайн-кошельке');
    if(seller.balance+lot.price>MAX_MONEY) throw Error('Баланс продавца достиг лимита');
    accounts[key]={...a,balance:a.balance-lot.price,inventory:[lot.plate,...(a.inventory||[])],updatedAt:now};
    accounts[lot.sellerKey]={...seller,balance:seller.balance+lot.price,updatedAt:now};
    delete market[data.lotId];
  } else if(action==='chat') {
    const msg=typeof data.text==='string'?data.text.trim():'';
    if(!msg || msg.length>120) throw Error('Сообщение должно содержать 1–120 символов');
    if(a.lastChatAt && now-a.lastChatAt<3000) throw Error('Подождите 3 секунды перед следующим сообщением');
    accounts[key]={...a,lastChatAt:now};
    const chat={...(state.chat||{})};
    chat[data.messageId]={senderKey:key,senderName:a.nickname,text:msg,timestamp:now};
    const ids=Object.keys(chat);
    if(ids.length>150){ids.sort((x,y)=>(chat[x].timestamp||0)-(chat[y].timestamp||0)).slice(0,ids.length-150).forEach(id=>delete chat[id]);}
    return {...state, accounts, chat};
  } else throw Error('Неизвестная операция');
  return {...state,accounts,market};
}
// RTDB Admin SDK can call a transaction updater with null on its first invocation,
// even after a preceding .once('value') returned an existing node. The returned
// candidate is subject to RTDB's compare-and-retry protocol: if the server node
// is not actually null, Firebase will retry with the authoritative server value.
// Use the preceding read only for the *initial* null callback. Never fall back
// again on retry: a genuinely deleted tree must not be recreated from a stale copy.
function makeOnlineTransactionUpdate(loaded, action, key, data, now) {
  let first = true;
  let reason = '';
  return {
    update(old) {
      const base = first && old == null ? loaded : old;
      first = false;
      try {
        const next=mutate(base, action, key, data, now);
        reason='';
        return next;
      } catch (e) {
        reason=e.message;
        return undefined;
      }
    },
    getReason() {return reason;}
  };
}
module.exports={COOKIE,TTL,MAX_MONEY,STARTING_BALANCE,keyOf,pinHash,checkPin,sign,verify,cookie,sessionCookie,safePlate,money,sanitizedProfile,mutate,makeOnlineTransactionUpdate,freshAccount,priceOfPlate,rarityOfPrice,secureRoll,draftOf};
