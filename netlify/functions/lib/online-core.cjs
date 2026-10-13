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
const ELITES = ['ААА','АМР','ВВВ','ВОР','ТТТ','ХХХ','ККК','ЕКХ','АЕО','ООО','ССС','МММ','СКР','УУУ'];

function priceOfPlate(l1,l2,l3,num,reg) {
  let price = 1200; // Базовая честная стоимость любого номера
  const letters = l1 + l2 + l3;
  const isTripleLetters = (l1 === l2 && l2 === l3);
  const isMirrorLetters = (l1 === l3 && l1 !== l2);
  const isPairLetters = (l1 === l2 || l2 === l3) && !isTripleLetters;

  // 1. Престижные серии
  if (ELITES.includes(letters)) {
    if (num === '011') return 12000000;
    if (num === '777') price += 5000000;
    else if (num[0] === num[1] && num[1] === num[2]) price += 2000000;
    else if (num === '001') price += 1200000;
    else price += 450000;
  }
  if (letters === 'ЕКХ') price += 1500000;
  if (letters === 'АМР') price += 1500000;
  if (letters === 'ВОР') price += 1000000;
  if (letters === 'ООО') price += 850000;
  if (letters === 'ААА') price += 1200000;
  if (letters === 'МММ') price += 750000;
  if (letters === 'ССС') price += 650000;
  if (letters === 'СКР') price += 700000;

  // 2. Структура букв
  if (isTripleLetters) price += 350000;
  else if (isMirrorLetters) price += 25000;
  else if (isPairLetters) price += 15000;

  // 3. Комбинации цифр
  if (num === '011') price += 1500000;
  if (num[0] === num[1] && num[1] === num[2]) {
    price += (num === '777' ? 800000 : 350000);
  } else if (num === '001') {
    price += 400000;
  } else if (num === '007') {
    price += 250000;
  } else if (num.startsWith('00')) {
    price += 110000;
  } else if (num.endsWith('00')) {
    price += 80000;
  } else if (['123','234','345','456','567','678','789','987','876','543','321'].includes(num)) {
    price += 65000;
  } else if (num[0] === num[2]) {
    price += 35000;
  } else if (['010','020','030','040','050','060','070','080','090'].includes(num)) {
    price += 45000;
  }

  // 4. Престижные регионы
  if (['777','77','99','799','797'].includes(reg)) price += 35000;
  else if (['78','98','178','198'].includes(reg)) price += 25000;
  else if (reg === '95') price += 30000;
  else if (reg === '16' || reg === '116' || reg === '716') price += 15000;

  return price;
}

function rarityOfPrice(p){
  if(p>=10000000)return 'БЛАТНОЙ';
  if(p>=3000000)return 'Крутой';
  if(p>=1000000)return 'Легендарный';
  if(p>=300000)return 'Эпический';
  if(p>=100000)return 'Супер редкий';
  if(p>=35000)return 'Редкий';
  if(p>=6000)return 'Необычный';
  return 'Обычный';
}

function secureRoll(mode){
  if(!['both','numbers','letters'].includes(mode))throw Error('Неверный тип спина');
  const choose=arr=>arr[crypto.randomInt(arr.length)];

  function generateLuckyNumber() {
    const roll = crypto.randomInt(1000);
    // ~2.5% джекпот-цифры (777, 001, 007, 011, 111, 555, 888, 999)
    if (roll < 25) {
      return choose(['777','777','001','007','011','111','555','888','999']);
    }
    // ~7.5% три одинаковые, круглые сотни и первые десятки
    if (roll < 100) {
      const epicPool = [
        '111','222','333','444','555','666','777','888','999',
        '100','200','300','400','500','600','700','800','900',
        '002','003','004','005','006','007','008','009'
      ];
      return choose(epicPool);
    }
    // ~18% зеркалки, лесенки и круглые десятки
    if (roll < 280) {
      const d1 = crypto.randomInt(10);
      const d2 = crypto.randomInt(10);
      const k = crypto.randomInt(4);
      if (k === 0) return `${d1}${d2}${d1}`;
      if (k === 1) return choose(['123','234','345','456','567','678','789','987','654','321']);
      if (k === 2) return `0${d1}0`;
      return `${d1}${d2}0`;
    }
    // Стандартные случайные цифры 000-999
    return String(crypto.randomInt(1000)).padStart(3, '0');
  }

  function generateLuckyLetters() {
    const roll = crypto.randomInt(1000);
    // ~3% спецсерия
    if (roll < 30) {
      const elite = choose(ELITES);
      return [elite[0], elite[1], elite[2]];
    }
    // ~8% три одинаковые буквы
    if (roll < 110) {
      const l = choose(LETTERS);
      return [l, l, l];
    }
    // ~16% зеркальные или парные буквы
    if (roll < 270) {
      const l1 = choose(LETTERS);
      const l2 = choose(LETTERS);
      if (crypto.randomInt(2) === 0) {
        return [l1, l2, l1];
      }
      return crypto.randomInt(2) === 0 ? [l1, l1, l2] : [l2, l1, l1];
    }
    return [choose(LETTERS), choose(LETTERS), choose(LETTERS)];
  }

  return {
    mode,
    num: mode === 'letters' ? null : generateLuckyNumber(),
    letters: mode === 'numbers' ? null : generateLuckyLetters()
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
