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
  const isValidFormat = text.length<=36 && (
    /^[АВЕКМНОРСТУХA-Z] \d{3} [АВЕКМНОРСТУХA-Z]{2} \| [A-Z0-9]{1,3} (?:RUS|KZ|USA|UAE)$/u.test(text) ||
    /^\d{3} [A-Z]{3} \| [A-Z0-9]{1,3} KZ$/.test(text) ||
    /^[A-Z]{3}[ -]\d{3,4} \| [A-Z0-9]{1,3} USA$/.test(text) ||
    /^[A-Z]{1,3} \d{1,5} \| [A-Z0-9]{1,3} UAE$/.test(text)
  );
  if (!isValidFormat) throw Error('Неверный формат номера');
  const price=Number.isSafeInteger(raw.price) && raw.price>=0 && raw.price<=MAX_MONEY ? raw.price : 1000;
  return {id, text, price, rarity:{text:typeof raw.rarity?.text==='string'?raw.rarity.text.slice(0,30):'Обычный'}};
}
function parsePlate(text, countryOverride = null) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  const normCountry = countryOverride && COUNTRIES[String(countryOverride).toUpperCase()]
    ? String(countryOverride).toUpperCase()
    : null;

  // Authentic KZ: "777 AAA | 01 KZ"
  const mKz = /^(\d{3})\s+([A-Z]{3})\s*\|\s*([A-Z0-9]{2,3})\s+KZ$/i.exec(trimmed);
  if (mKz) {
    const digits = mKz[1];
    const letters = mKz[2].toUpperCase();
    const region = mKz[3].toUpperCase();
    const country = normCountry || 'KZ';
    return {
      l1: letters[0],
      l2: letters[1],
      l3: letters[2],
      letters: [letters[0], letters[1], letters[2]],
      digits,
      num: digits,
      region,
      reg: region,
      country
    };
  }

  // Authentic USA: "AAA-777 | CA USA" or "AAA 777 | CA USA"
  const mUsa = /^([A-Z]{3})[\s-]+(\d{3,4})\s*\|\s*([A-Z0-9]{2,3})\s+USA$/i.exec(trimmed);
  if (mUsa) {
    const letters = mUsa[1].toUpperCase();
    const digits = mUsa[2].slice(-3).padStart(3, '0');
    const region = mUsa[3].toUpperCase();
    const country = normCountry || 'USA';
    return {
      l1: letters[0],
      l2: letters[1],
      l3: letters[2],
      letters: [letters[0], letters[1], letters[2]],
      digits,
      num: digits,
      region,
      reg: region,
      country
    };
  }

  // Authentic / legacy UAE: "D 1 | DXB UAE", "AA 777 | DXB UAE", "DXB 001 | DXB UAE"
  const mUae = /^([A-Z]{1,3})\s+(\d{1,5})\s*\|\s*([A-Z0-9]{1,3})\s+UAE$/i.exec(trimmed);
  if (mUae) {
    const code = mUae[1].toUpperCase();
    const num = mUae[2];
    const region = mUae[3].toUpperCase();
    const l1 = code[0];
    const l2 = code.length === 3 ? code[1] : (code.length === 2 ? code[1] : 'X');
    const l3 = code.length === 3 ? code[2] : (code.length === 2 ? code[1] : 'Z');
    const digits = num.slice(-3).padStart(3, '0');
    const country = normCountry || 'UAE';
    return {
      l1,
      l2,
      l3,
      letters: [l1, l2, l3],
      digits,
      num: digits,
      region,
      reg: region,
      country
    };
  }

  // Standard RUS & legacy format: "А 777 АА | 777 RUS", "A777AA77", "V 777 IP | 01 KZ"
  const mRus = /^([A-ZА-ЯЁ])\s*(\d{3})\s*([A-ZА-ЯЁ]{2})\s*(?:\|\s*)?([A-Z0-9]{1,3})(?:\s*\|\s*|\s+)?(RUS|KZ|USA|UAE)?$/i.exec(trimmed);
  if (mRus) {
    const l1 = mRus[1].toUpperCase();
    const digits = mRus[2];
    const l2 = mRus[3][0].toUpperCase();
    const l3 = mRus[3][1].toUpperCase();
    const region = mRus[4].toUpperCase();
    const country = normCountry || (mRus[5] ? mRus[5].toUpperCase() : 'RUS');
    return {
      l1,
      l2,
      l3,
      letters: [l1, l2, l3],
      digits,
      num: digits,
      region,
      reg: region,
      country
    };
  }

  return null;
}
function safeCar(raw){
  if (!raw || typeof raw!=='object'||Array.isArray(raw)) throw Error('Неверный автомобиль');
  const name=String(raw.name||'').trim();
  if (!name || name.length>60) throw Error('Неверное название автомобиля');
  const basePrice=Number.isSafeInteger(raw.basePrice) && raw.basePrice>=10000 && raw.basePrice<=MAX_MONEY ? raw.basePrice : 80000;
  const condition=typeof raw.condition==='number' && Number.isFinite(raw.condition) ? Math.max(0,Math.min(100,Math.round(raw.condition))) : 100;
  const category=typeof raw.category==='string' ? raw.category.trim().slice(0,30) : 'Авто';
  const img=typeof raw.img==='string' && raw.img.length<500 ? raw.img : '';
  let plate=null;
  if (raw.plate && typeof raw.plate==='object') {
    try {
      plate=safePlate(raw.plate, String(raw.plate.id || ('plate_' + Date.now())).slice(0,80));
    } catch { plate=null; }
  }
  const upgrades={engine:0,handling:0,economy:0,nitro:0};
  if (raw.upgrades && typeof raw.upgrades==='object') {
    for (const k of ['engine','handling','economy','nitro']) {
      const v=Number(raw.upgrades[k]);
      if (Number.isSafeInteger(v) && v>=0 && v<=5) upgrades[k]=v;
    }
  }
  const result={name,basePrice,condition,category,img,plate,upgrades};
  if (raw.styling && typeof raw.styling==='object') {
    const styling={};
    if (typeof raw.styling.color==='string' && /^#[0-9a-fA-F]{6}$/.test(raw.styling.color)) styling.color=raw.styling.color;
    if (typeof raw.styling.neon==='string' && (/^#[0-9a-fA-F]{6}$/.test(raw.styling.neon) || raw.styling.neon==='none')) styling.neon=raw.styling.neon;
    if (raw.styling.tint==='chameleon' || raw.styling.tint==='dubai') {
      styling.tint=raw.styling.tint;
    } else {
      const tint=Number(raw.styling.tint);
      if (Number.isSafeInteger(tint) && tint>=0 && tint<=100) styling.tint=tint;
    }
    if (typeof raw.styling.spoiler==='string' && ['none','ducktail','gt'].includes(raw.styling.spoiler)) {
      styling.spoiler=raw.styling.spoiler;
    }
    if (typeof raw.styling.vinyl==='string' && ['none','stripes','drift'].includes(raw.styling.vinyl)) {
      styling.vinyl=raw.styling.vinyl;
    }
    if (typeof raw.styling.wheels==='string' && ['stock','stamps','deepdish','forged'].includes(raw.styling.wheels)) {
      styling.wheels=raw.styling.wheels;
    }
    if (typeof raw.styling.suspension==='string' && ['stock','lowered','bpan','lift'].includes(raw.styling.suspension)) {
      styling.suspension=raw.styling.suspension;
    }
    if (typeof raw.styling.sgu==='string' && ['none','installed'].includes(raw.styling.sgu)) {
      styling.sgu=raw.styling.sgu;
    }
    if (Object.keys(styling).length>0) result.styling=styling;
  }
  return result;
}
function safeCars(list){
  if (!Array.isArray(list)) return [];
  return list.slice(0,50).map(c=>{
    try { return safeCar(c); } catch { return null; }
  }).filter(Boolean);
}
function money(v){if(!Number.isSafeInteger(v) ||v<0||v>MAX_MONEY) throw Error('Неверная сумма');return v;}
// The server is authoritative for generator rolls: the browser sends only a mode and region.
const LETTERS = ['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'];
const ELITES = ['ААА','АМР','ВВВ','ВОР','ТТТ','ХХХ','ККК','ЕКХ','АЕО','ООО','ССС','МММ','СКР','УУУ'];

const COUNTRIES = {
  RUS: {
    code: 'RUS',
    spinCostBoth: 900,
    spinCostPart: 500,
    priceMult: 1.0,
    regRegex: /^\d{2,3}$/,
    defaultReg: '777',
    letters: LETTERS,
    elites: ELITES
  },
  KZ: {
    code: 'KZ',
    spinCostBoth: 1800,
    spinCostPart: 1000,
    priceMult: 1.8,
    regRegex: /^(?:0[1-9]|1[0-9]|20|\d{2})$/,
    defaultReg: '01',
    letters: 'ABCDEFGHKLMNOPQRSTUVWXYZ'.split(''),
    elites: ['AAA','VIP','ZZZ','QQQ','GGG','NNN','MMM','SSS','XXX','LLL','AST','ALA','HAN']
  },
  USA: {
    code: 'USA',
    spinCostBoth: 3500,
    spinCostPart: 2000,
    priceMult: 3.5,
    regRegex: /^(?:[A-Z]{2}|\d{2,3})$/i,
    defaultReg: 'CA',
    letters: 'ABCDEFGHJKLMNPRSTUVWXYZ'.split(''),
    elites: ['USA','VIP','NYC','LAX','MIA','GTA','FBI','CIA','CEO','GOD','WIN','XXX','AAA']
  },
  UAE: {
    code: 'UAE',
    spinCostBoth: 9000,
    spinCostPart: 5000,
    priceMult: 8.0,
    regRegex: /^(?:DXB|AUH|SHJ|AJM|RAK|FUJ|UAQ|[A-Z]{1,3}|\d{1,3})$/i,
    defaultReg: 'DXB',
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    elites: ['DXB','UAE','SHK','VIP','AAA','ZZZ','FFF','GGG','RRR','SSS','XXX','CEO','OIL','GLD','AUH']
  }
};

function priceOfPlate(l1,l2,l3,num,reg,country='RUS') {
  if (l1 && typeof l1 === 'object' && !Array.isArray(l1)) {
    const p = l1;
    const overrideCountry = typeof l2 === 'string' ? l2 : undefined;
    const arr = Array.isArray(p.letters) ? p.letters : [p.l1, p.l2, p.l3];
    return priceOfPlate(
      p.l1 ?? arr[0],
      p.l2 ?? arr[1],
      p.l3 ?? arr[2],
      p.digits ?? p.num,
      p.region ?? p.reg,
      overrideCountry || p.country || 'RUS'
    );
  }
  if (Array.isArray(l1)) {
    return priceOfPlate(l1[0], l1[1], l1[2], l2, l3, num || 'RUS');
  }
  if (typeof l1 === 'string' && (l2 === undefined || (l3 === undefined && l1.includes('|')))) {
    const parsed = parsePlate(l1, typeof l2 === 'string' ? l2 : null);
    if (!parsed) return 0;
    return priceOfPlate(parsed.l1, parsed.l2, parsed.l3, parsed.digits, parsed.region, parsed.country);
  }

  const cCode = (country && COUNTRIES[String(country).toUpperCase()]) ? String(country).toUpperCase() : 'RUS';
  const cfg = COUNTRIES[cCode];
  const cElites = cfg.elites;
  let price = 450; // Базовая стоимость простого номера
  const digits = String(num || '000').padStart(3, '0').slice(-3);
  const c1 = String(l1 || '').toUpperCase();
  const c2 = String(l2 || '').toUpperCase();
  const c3 = String(l3 || '').toUpperCase();
  const letters = c1 + c2 + c3;
  const isTripleLetters = (c1 !== '' && c1 === c2 && c2 === c3);
  const isSameLetters = isTripleLetters;
  const isMirrorLetters = (c1 !== '' && c1 === c3 && c1 !== c2);
  const isPairLetters = (c1 !== '' && (c1 === c2 || c2 === c3) && !isTripleLetters);

  if (cCode === 'RUS') {
    // 1. Престижные буквенные серии
    if (ELITES.includes(letters)) {
      if (letters === 'ЕКХ' && digits === '011') return 12000000;
      if (digits === '777') price += 5000000;
      else if (digits[0] === digits[1] && digits[1] === digits[2]) price += 2000000;
      else if (digits === '001') price += 1200000;
      else price += 400000;
    }
    if (letters === 'ЕКХ') price += 1500000;
    if (letters === 'АМР') price += 1500000;
    if (letters === 'ВОР') price += 1000000;
    if (letters === 'ООО') price += 850000;
    if (letters === 'ААА') price += 1200000;
    if (letters === 'МММ') price += 750000;
    if (letters === 'ССС') price += 650000;
    if (letters === 'СКР') price += 700000;
    if (letters === 'УУУ') price += 600000;
  } else {
    if (cElites.includes(letters)) {
      if (digits === '777') price += 5000000;
      else if (digits[0] === digits[1] && digits[1] === digits[2]) price += 2000000;
      else if (digits === '001') price += 1500000;
      else price += 450000;
    }
    if (cCode === 'KZ') {
      if (letters === 'VIP' || letters === 'AAA') price += 1500000;
      else if (['ZZZ','QQQ','AST','ALA','HAN'].includes(letters)) price += 950000;
      else if (cElites.includes(letters)) price += 650000;
    } else if (cCode === 'USA') {
      if (['USA','VIP','FBI','CIA'].includes(letters)) price += 1600000;
      else if (['NYC','LAX','MIA','GTA','CEO','GOD','WIN'].includes(letters)) price += 1100000;
      else if (cElites.includes(letters)) price += 750000;
    } else if (cCode === 'UAE') {
      if (['DXB','UAE','SHK','VIP','AUH'].includes(letters)) price += 2000000;
      else if (['AAA','CEO','OIL','GLD'].includes(letters)) price += 1400000;
      else if (cElites.includes(letters)) price += 850000;
    }
  }

  // 2. Структура букв
  if (cCode === 'UAE') {
    if (cElites.includes(letters)) {
      price += 500000;
      if (isSameLetters && digits === '001') price += 3500000;
    } else if (isSameLetters) {
      price += 280000;
    } else if (['A', 'D', 'S', 'V', 'X', 'Z', 'M', 'K'].includes(c1)) {
      price += 120000;
    }
  } else {
    if (isTripleLetters) price += 350000;
    else if (isMirrorLetters) price += 1800;
    else if (isPairLetters) price += 1200;
  }

  // 3. Комбинации цифр
  if (cCode === 'UAE') {
    if (digits === '001') {
      price += 2500000;
    } else if (/^00[2-9]$/.test(digits)) {
      price += (digits === '007' ? 1500000 : 1200000);
    } else if (/^0([1-9])\1$/.test(digits)) {
      price += (digits === '077' ? 650000 : 450000);
    } else if (/^0[1-9]0$/.test(digits)) {
      price += 180000;
    } else if (/^0[1-9][1-9]$/.test(digits)) {
      price += 50000;
    } else if (digits[0] === digits[1] && digits[1] === digits[2]) {
      price += (digits === '777' ? 750000 : 320000);
    } else if (digits.endsWith('00')) {
      price += 25000;
    } else if (['123','234','345','456','567','678','789','987','876','765','654','543','432','321'].includes(digits)) {
      price += 20000;
    } else if (digits[0] === digits[2]) {
      price += 1600;
    }
  } else {
    if (digits[0] === digits[1] && digits[1] === digits[2]) {
      price += (digits === '777' ? 750000 : 320000);
    } else if (digits === '001') {
      price += 350000;
    } else if (digits === '007') {
      price += 120000;
    } else if (digits.startsWith('00')) {
      price += 35000;
    } else if (digits.endsWith('00')) {
      price += 25000;
    } else if (['123','234','345','456','567','678','789','987','876','765','654','543','432','321'].includes(digits)) {
      price += 20000;
    } else if (['010','020','030','040','050','060','070','080','090'].includes(digits)) {
      price += 2000;
    } else if (digits[0] === digits[2]) {
      price += 1600;
    }
  }

  // 4. Регионы (символическая надбавка за столичные регионы + синергия с элитой)
  if (cCode === 'RUS') {
    if (['777','77','99','799','797'].includes(reg)) {
      price += 250;
      if (digits === '777') price += 500000;
      if (isTripleLetters) price += 50000;
    } else if (['78','98','178','198'].includes(reg)) {
      price += 200;
    } else if (reg === '95') {
      price += 200;
    } else if (reg === '16' || reg === '116' || reg === '716') {
      price += 150;
    }
    return price;
  }

  const regUp = String(reg || '').toUpperCase();
  if (cCode === 'KZ') {
    if (['01','02','17'].includes(regUp)) {
      price += 500;
      if (digits === '777' || digits === '001' || digits === '010' || digits === '020') price += 500000;
      if (isTripleLetters || cElites.includes(letters)) price += 60000;
    } else {
      price += 200;
    }
  } else if (cCode === 'USA') {
    if (['CA','NY','FL','TX','NV'].includes(regUp)) {
      price += 800;
      if (digits === '777' || digits === '001' || digits === '007') price += 550000;
      if (isTripleLetters || cElites.includes(letters)) price += 80000;
    } else {
      price += 300;
    }
  } else if (cCode === 'UAE') {
    if (['DXB','AUH','1','2'].includes(regUp)) {
      price += 1500;
      if (/^00[1-9]$/.test(digits) || digits === '777') price += 750000;
      if (isTripleLetters || cElites.includes(letters)) price += 150000;
    } else {
      price += 500;
    }
  }

  return Math.round(price * cfg.priceMult);
}

function rarityOfPrice(p){
  if(p>=10000000)return 'БЛАТНОЙ';
  if(p>=3000000)return 'Крутой';
  if(p>=1000000)return 'Легендарный';
  if(p>=300000)return 'Эпический';
  if(p>=80000)return 'Супер редкий';
  if(p>=18000)return 'Редкий';
  if(p>=2000)return 'Необычный';
  return 'Обычный';
}

function secureRoll(mode, pity = 0, country = 'RUS'){
  if(!['both','numbers','letters'].includes(mode))throw Error('Неверный тип спина');
  const cCode = (country && COUNTRIES[String(country).toUpperCase()]) ? String(country).toUpperCase() : 'RUS';
  const cfg = COUNTRIES[cCode];
  const letterPool = cfg.letters;
  const elitePool = cfg.elites;
  const choose=arr=>arr[crypto.randomInt(arr.length)];
  const pityNum = Math.min(120, Math.max(0, Math.floor(Number(pity) || 0)));
  const luckBonus = Math.min(200, Math.floor(pityNum * 3));

  let forceTier = null;
  if (mode === 'both') {
    if (pityNum >= 120) forceTier = 'legendary';
    else if (pityNum >= 65) forceTier = 'epic';
    else if (pityNum >= 25) forceTier = 'rare';
  }

  function generateLuckyNumber() {
    if (forceTier === 'legendary') {
      return choose(['777','001','007','011','111','555','888','999']);
    }
    if (forceTier === 'epic') {
      return choose([
        '111','222','333','444','555','666','888','999',
        '100','200','300','400','500','600','700','800','900',
        '002','003','004','005','006','007','008','009'
      ]);
    }
    if (forceTier === 'rare') {
      return choose(['123','234','345','456','567','678','789','987','876','765','654','543','432','321']);
    }

    const roll = crypto.randomInt(1000);
    const jackpotCutoff = Math.min(15, 3 + Math.floor(luckBonus * 0.05));
    if (roll < jackpotCutoff) {
      return choose(['777','001','007']);
    }
    const epicCutoff = Math.min(35, 12 + Math.floor(luckBonus * 0.15));
    if (roll < epicCutoff) {
      const epicPool = [
        '111','222','333','444','555','666','888','999',
        '100','200','300','400','500','600','700','800','900',
        '002','003','004','005','006','007','008','009'
      ];
      return choose(epicPool);
    }
    const ladderCutoff = Math.min(70, 30 + Math.floor(luckBonus * 0.3));
    if (roll < ladderCutoff) {
      return choose(['123','234','345','456','567','678','789','987','876','765','654','543','432','321']);
    }
    return String(crypto.randomInt(1000)).padStart(3, '0');
  }

  function generateLuckyLetters() {
    if (forceTier === 'legendary') {
      const topElites = cCode === 'RUS'
        ? ['ААА','АМР','ВОР','ЕКХ','ООО','ССС','МММ','СКР']
        : elitePool.slice(0, 8);
      const elite = choose(topElites);
      return [elite[0], elite[1], elite[2]];
    }
    if (forceTier === 'epic') {
      if (crypto.randomInt(100) < 60) {
        const elite = choose(elitePool);
        return [elite[0], elite[1], elite[2]];
      }
      const l = choose(letterPool);
      return [l, l, l];
    }
    if (forceTier === 'rare') {
      const l1 = choose(letterPool);
      const l2 = choose(letterPool);
      return [l1, l2, l1];
    }

    const roll = crypto.randomInt(1000);
    const eliteCutoff = Math.min(15, 4 + Math.floor(luckBonus * 0.05));
    if (roll < eliteCutoff) {
      const elite = choose(elitePool);
      return [elite[0], elite[1], elite[2]];
    }
    const tripleCutoff = Math.min(35, 12 + Math.floor(luckBonus * 0.15));
    if (roll < tripleCutoff) {
      const l = choose(letterPool);
      return [l, l, l];
    }
    const mirrorCutoff = Math.min(70, 30 + Math.floor(luckBonus * 0.3));
    if (roll < mirrorCutoff) {
      const l1 = choose(letterPool);
      const l2 = choose(letterPool);
      return [l1, l2, l1];
    }
    return [choose(letterPool), choose(letterPool), choose(letterPool)];
  }

  return {
    mode,
    country: cfg.code,
    num: mode === 'letters' ? null : generateLuckyNumber(),
    letters: mode === 'numbers' ? null : generateLuckyLetters()
  };
}
function draftOf(a){return a?.draft&&typeof a.draft==='object'?a.draft:{num:'---',letters:['-','-','-'],reg:'777',country:'RUS',hasNumbers:false,hasLetters:false,changedNumbers:false,changedLetters:false,pityCounter:0};}
function getUaePlateDisplayParts(l1, l2, l3, num) {
  const c1 = String(l1 || '-').toUpperCase();
  const c2 = String(l2 || '-').toUpperCase();
  const c3 = String(l3 || '-').toUpperCase();
  let code = '-';
  if (c1 !== '-') {
    code = (c1 === c2 && c2 === c3) ? (c1 + c2) : c1;
  }
  let digits = '---';
  if (num && !String(num).includes('-')) {
    const parsed = parseInt(String(num), 10);
    digits = (Number.isFinite(parsed) && parsed > 0) ? String(parsed) : '100';
  }
  return { code, digits };
}
function formatPlateText(l1, l2, l3, num, reg, country = 'RUS') {
  const cCode = (country && COUNTRIES[String(country).toUpperCase()]) ? String(country).toUpperCase() : 'RUS';
  const r = String(reg || COUNTRIES[cCode].defaultReg).toUpperCase();
  const letters = `${l1 || '-'}${l2 || '-'}${l3 || '-'}`;
  const digits = num || '---';
  if (cCode === 'KZ') return `${digits} ${letters} | ${r} KZ`;
  if (cCode === 'USA') return `${letters} ${digits} | ${r} USA`;
  if (cCode === 'UAE') {
    const uae = getUaePlateDisplayParts(l1, l2, l3, num);
    return `${uae.code} ${uae.digits} | ${r} UAE`;
  }
  return `${l1 || '-'} ${digits} ${l2 || '-'}${l3 || '-'} | ${r} RUS`;
}
function migrateLegacyPin(account, pin) {
  if (!account || typeof account !== 'object') return null;
  const hashed = pinHash(pin);
  account.pinHash = hashed;
  delete account.pin;
  delete account.password;
  return { pinHash: hashed, pin: null, password: null };
}
function sanitizedProfile(a){return {nickname:a.nickname, balance:a.balance, inventory:a.inventory||[], myCars:a.myCars||[], playerLevel:a.playerLevel||1, playerExp:a.playerExp||0, updatedAt:a.updatedAt||0, draft:a.draft||null, avatarData:typeof a.avatarData==='string'?a.avatarData:''};}
function mutate(state, action, key, data, now=Date.now()) {
  if (!state || typeof state!=='object') state={};
  const accounts={...(state.accounts||{})};
  const market={...(state.market||{})};
  const a=accounts[key];
  if (!a) throw Error('Аккаунт не найден');
  if(action==='roll') {
    const roll=data.roll;
    const country = (data?.country && COUNTRIES[String(data.country).toUpperCase()])
      ? String(data.country).toUpperCase()
      : (data?.roll?.country && COUNTRIES[data.roll.country] ? data.roll.country : 'RUS');
    const cfg = COUNTRIES[country];
    const cost = roll?.mode === 'both' ? cfg.spinCostBoth : cfg.spinCostPart;
    if(!roll||!['both','numbers','letters'].includes(roll.mode)
      || (roll.num!==null && !/^\d{3}$/.test(roll.num))
      || (roll.letters!==null && (!Array.isArray(roll.letters)||roll.letters.length!==3||roll.letters.some(l=>!cfg.letters.includes(l)))))throw Error('Неверный тип спина');
    if(typeof data.region !== 'string' || !cfg.regRegex.test(data.region))throw Error('Неверный регион');
    if(a.balance<cost)throw Error('Недостаточно денег на онлайн-кошельке');
    const reg = data.region.toUpperCase();
    const prevDraft = draftOf(a);
    const countryChanged = (prevDraft.country || 'RUS') !== country;
    const draft={...prevDraft, reg, country};
    if (countryChanged) {
      draft.num = '---';
      draft.letters = ['-','-','-'];
      draft.hasNumbers = false;
      draft.hasLetters = false;
      draft.changedNumbers = false;
      draft.changedLetters = false;
    }
    if(roll.num!==null){draft.num=roll.num;draft.hasNumbers=true;draft.changedNumbers=true;}
    if(roll.letters!==null){draft.letters=roll.letters;draft.hasLetters=true;draft.changedLetters=true;}
    const basePity = (a.draft && typeof a.draft.pityCounter === 'number' && a.draft.pityCounter > 0)
      ? Math.min(120, Math.max(0, Math.floor(a.draft.pityCounter)))
      : Math.min(120, Math.max(0, Math.floor(Number(data?.pity) || (draft.pityCounter || 0))));
    let nextPity = basePity + (roll.mode === 'both' ? 1 : 0);
    if (draft.hasNumbers && draft.hasLetters && draft.num !== '---' && Array.isArray(draft.letters)) {
      const p = priceOfPlate(draft.letters[0], draft.letters[1], draft.letters[2], draft.num, reg, country);
      const r = rarityOfPrice(p);
      if (['Редкий', 'Супер редкий', 'Эпический', 'Легендарный', 'Крутой', 'БЛАТНОЙ'].includes(r)) {
        nextPity = 0;
      }
    }
    draft.pityCounter = nextPity;
    accounts[key]={...a,balance:a.balance-cost,draft,pityCounter:nextPity,updatedAt:now};
  } else if(action==='spend') {
    const amount = Math.floor(Number(data.amount) || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw Error('Некорректная сумма');
    if (a.balance < amount) throw Error('Недостаточно денег на онлайн-кошельке');
    accounts[key] = { ...a, balance: a.balance - amount, updatedAt: now };
  } else if(action==='setRegion') {
    const prevDraft = draftOf(a);
    const prevCountry = (prevDraft.country && COUNTRIES[prevDraft.country]) ? prevDraft.country : 'RUS';
    const country = (data?.country && COUNTRIES[String(data.country).toUpperCase()])
      ? String(data.country).toUpperCase()
      : prevCountry;
    const cfg = COUNTRIES[country];
    if(!data?.region || typeof data.region !== 'string' || !cfg.regRegex.test(data.region)) throw Error('Неверный регион');
    const draft={...prevDraft, reg:data.region.toUpperCase(), country};
    if (country !== prevCountry) {
      draft.num = '---';
      draft.letters = ['-', '-', '-'];
      draft.hasNumbers = false;
      draft.hasLetters = false;
      draft.changedNumbers = false;
      draft.changedLetters = false;
    }
    accounts[key]={...a, draft, updatedAt:now};
  } else if(action==='claim') {
    const draft=draftOf(a);
    const draftCountry = (draft.country && COUNTRIES[draft.country]) ? draft.country : 'RUS';
    if (data?.country && String(data.country).toUpperCase() !== draftCountry) {
      throw Error('Сначала прокрутите цифры и буквы в выбранной стране');
    }
    const country = draftCountry;
    const cfg = COUNTRIES[country];
    if(!draft.hasNumbers||!draft.hasLetters||!draft.changedNumbers||!draft.changedLetters)throw Error('Сначала прокрутите цифры и буквы');
    if((a.inventory||[]).length>=1000)throw Error('Инвентарь заполнен');
    if(!/^[0-9]{3}$/.test(draft.num)||!Array.isArray(draft.letters)||draft.letters.length!==3||draft.letters.some(l=>!cfg.letters.includes(l)))throw Error('Неверный номер');
    const [l1,l2,l3]=draft.letters;
    const reg=(typeof data?.region==='string'&&cfg.regRegex.test(data.region))?data.region.toUpperCase():(draft.reg&&cfg.regRegex.test(draft.reg)?String(draft.reg).toUpperCase():cfg.defaultReg);
    const text=formatPlateText(l1,l2,l3,draft.num,reg,country);
    const price=priceOfPlate(l1,l2,l3,draft.num,reg,country);
    const plate=safePlate({text,price,rarity:{text:rarityOfPrice(price)}},data.plateId);
    accounts[key]={...a,inventory:[plate,...(a.inventory||[])],draft:{...draft,reg,country,changedNumbers:false,changedLetters:false},updatedAt:now};
  } else if (action==='sell') {
    const price=money(data.price);
    if (price<1000) throw Error('Минимальная цена 1 000 ₽');
    if (Object.keys(market).length>=1000) throw Error('Рынок переполнен');
    if (data.type === 'car') {
      const cars = Array.isArray(a.myCars) ? a.myCars : [];
      if (cars.length <= 1) throw Error('Нельзя продать единственный автомобиль');
      let pos = -1;
      if (Number.isSafeInteger(data.carIndex) && data.carIndex >= 0 && data.carIndex < cars.length) {
        pos = data.carIndex;
      } else if (data.car && data.car.name) {
        pos = cars.findIndex(c => c && c.name === data.car.name);
      }
      if (pos < 0) throw Error('Этот автомобиль отсутствует в серверном гараже');
      const lotId = data.lotId;
      if (!/^[a-zA-Z0-9_-]{12,80}$/.test(lotId) || market[lotId]) throw Error('Неверный идентификатор лота');
      const car = safeCar(cars[pos]);
      accounts[key] = {...a, myCars: cars.filter((_, i) => i !== pos), updatedAt: now};
      market[lotId] = {lotId, type: 'car', sellerKey: key, sellerName: a.nickname, car, price, createdAt: now};
    } else {
      if (!Array.isArray(a.inventory)) throw Error('Инвентарь недоступен');
      const pos=a.inventory.findIndex(p=>p.id===data.plateId);
      if(pos<0) throw Error('Этот номер отсутствует в серверном инвентаре');
      const lotId=data.lotId;
      if (!/^[a-zA-Z0-9_-]{12,80}$/.test(lotId) || market[lotId]) throw Error('Неверный идентификатор лота');
      const plate=a.inventory[pos];
      accounts[key]={...a,inventory:a.inventory.filter((_,i)=>i!==pos),updatedAt:now};
      market[lotId]={lotId,sellerKey:key,sellerName:a.nickname,plate,price,createdAt:now};
    }
  } else if (action==='cancel') {
    const lot=market[data.lotId];
    if(!lot || lot.sellerKey!==key) throw Error('Лот не найден или принадлежит другому игроку');
    if (lot.type === 'car') {
      if ((a.myCars || []).length >= 50) throw Error('Гараж заполнен');
      accounts[key] = {...a, myCars: [safeCar(lot.car), ...(a.myCars || [])], updatedAt: now};
    } else {
      if((a.inventory||[]).length>=1000) throw Error('Инвентарь заполнен');
      accounts[key]={...a,inventory:[lot.plate,...(a.inventory||[])],updatedAt:now};
    }
    delete market[data.lotId];
  } else if(action==='buy') {
    const lot=market[data.lotId];
    if(!lot) throw Error('Лот уже продан или снят');
    if(lot.sellerKey===key) throw Error('Нельзя купить собственный лот');
    const seller=accounts[lot.sellerKey];
    if(!seller) throw Error('Продавец не найден');
    if(a.balance<lot.price) throw Error('Недостаточно денег на онлайн-кошельке');
    if(seller.balance+lot.price>MAX_MONEY) throw Error('Баланс продавца достиг лимита');
    if (lot.type === 'car') {
      if ((a.myCars || []).length >= 50) throw Error('Гараж заполнен');
      const car = safeCar(lot.car);
      accounts[key] = {...a, balance: a.balance - lot.price, myCars: [...(a.myCars || []), car], updatedAt: now};
      accounts[lot.sellerKey] = {...seller, balance: seller.balance + lot.price, updatedAt: now};
    } else {
      if((a.inventory||[]).length>=1000) throw Error('Инвентарь заполнен');
      accounts[key]={...a,balance:a.balance-lot.price,inventory:[lot.plate,...(a.inventory||[])],updatedAt:now};
      accounts[lot.sellerKey]={...seller,balance:seller.balance+lot.price,updatedAt:now};
    }
    delete market[data.lotId];
  } else if (action === 'syncGarage') {
    if (!Array.isArray(data.myCars)) throw Error('Неверные данные гаража');
    const cleanCars = safeCars(data.myCars);
    if (cleanCars.length === 0) throw Error('Гараж не может быть пустым');
    accounts[key] = {...a, myCars: cleanCars, updatedAt: now};
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
module.exports={COOKIE,TTL,MAX_MONEY,STARTING_BALANCE,COUNTRIES,keyOf,pinHash,checkPin,migrateLegacyPin,sign,verify,cookie,sessionCookie,safePlate,parsePlate,safeCar,safeCars,money,sanitizedProfile,mutate,makeOnlineTransactionUpdate,freshAccount,priceOfPlate,rarityOfPrice,secureRoll,draftOf,getUaePlateDisplayParts,formatPlateText};
