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
    /^[АВЕКМНОРСТУХA-Z] \d{3} [АВЕКМНОРСТУХA-Z]{2} \| [A-Z0-9]{1,3} (?:RUS|KZ|USA|UAE|JPN)$/u.test(text) ||
    /^\d{3} [A-Z]{3} \| [A-Z0-9]{1,3} KZ$/.test(text) ||
    /^[A-Z]{3}[ -]\d{3,4} \| [A-Z0-9]{1,3} (?:USA|JPN)$/.test(text) ||
    /^(?:[A-Z]{1,3}|\d{1,2}) \d{1,5} \| [A-Z0-9]{1,3} UAE$/.test(text) ||
    /^\d{2}-\d{2} [А-ЯЁA-Z]{3} \| (?:СССР|USSR|[0-9]{2,3} RUS)$/u.test(text) ||
    /^\d{3} (?:CD|D) \d{1,3} \| [0-9]{2,3} RUS$/.test(text)
  );
  if (!isValidFormat) throw Error('Неверный формат номера');
  const price=Number.isSafeInteger(raw.price) && raw.price>=0 && raw.price<=MAX_MONEY ? raw.price : 1000;
  return {id, text, price, rarity:{text:typeof raw.rarity?.text==='string'?raw.rarity.text.slice(0,30):'Обычный'}, ...(raw.favorite === true ? {favorite:true} : {})};
}
function parsePlate(text, countryOverride = null) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  const normCountry = countryOverride && COUNTRIES[String(countryOverride).toUpperCase()]
    ? String(countryOverride).toUpperCase()
    : null;

  // Authentic USSR retro format: "77-77 МОС | СССР"
  const mUssr = /^(\d{2})-(\d{2})\s+([А-ЯЁA-Z]{3})\s*\|\s*(?:СССР|USSR|(\d{2,3})\s*RUS)$/iu.exec(trimmed);
  if (mUssr) {
    const raw4 = mUssr[1] + mUssr[2];
    const digits = raw4.slice(-3).padStart(3, '0');
    const letters = mUssr[3].toUpperCase();
    const region = mUssr[4] ? mUssr[4] : '77';
    return {
      l1: letters[0], l2: letters[1], l3: letters[2],
      letters: [letters[0], letters[1], letters[2]],
      digits, num: digits, region, reg: region,
      country: normCountry || 'RUS',
      specialType: 'ussr'
    };
  }

  // Authentic Diplomatic CD format: "001 CD 1 | 77 RUS"
  const mDip = /^(\d{3})\s+(?:CD|D)\s+\d{1,3}\s*\|\s*(\d{2,3})\s+RUS$/i.exec(trimmed);
  if (mDip) {
    const digits = mDip[1];
    const region = mDip[2];
    return {
      l1: 'К', l2: 'М', l3: 'Н',
      letters: ['К', 'М', 'Н'],
      digits, num: digits, region, reg: region,
      country: normCountry || 'RUS',
      specialType: 'diplomat'
    };
  }

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

  // Authentic USA or JPN: "AAA-777 | CA USA", "AAA 777 | CA USA", "JDM 777 | TKY JPN"
  const mUsaJpn = /^([A-Z]{3})[\s-]+(\d{3,4})\s*\|\s*([A-Z0-9]{2,3})\s+(USA|JPN)$/i.exec(trimmed);
  if (mUsaJpn) {
    const letters = mUsaJpn[1].toUpperCase();
    const digits = mUsaJpn[2];
    const region = mUsaJpn[3].toUpperCase();
    const country = normCountry || mUsaJpn[4].toUpperCase();
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

  // Authentic / legacy UAE: "D 1 | DXB UAE", "AA 777 | DXB UAE", "D 77777 | DXB UAE", "DXB 001 | DXB UAE"
  const mUae = /^([A-Z0-9]{1,3})\s+(\d{1,5})\s*\|\s*([A-Z0-9]{1,3})\s+UAE$/i.exec(trimmed);
  if (mUae) {
    const code = mUae[1].toUpperCase();
    const num = mUae[2];
    const region = mUae[3].toUpperCase();
    const isNumericCat = /^\d+$/.test(code);
    const l1 = isNumericCat ? code : code[0];
    const l2 = isNumericCat ? 'X' : (code.length === 3 ? code[1] : (code.length === 2 ? code[1] : 'X'));
    const l3 = isNumericCat ? 'Z' : (code.length === 3 ? code[2] : (code.length === 2 ? code[1] : 'Z'));
    const digits = num.length >= 4 ? num : num.padStart(3, '0');
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
  const mRus = /^([A-ZА-ЯЁ])\s*(\d{3})\s*([A-ZА-ЯЁ]{2})\s*(?:\|\s*)?([A-Z0-9]{1,3})(?:\s*\|\s*|\s+)?(RUS|KZ|USA|UAE|JPN)?$/i.exec(trimmed);
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
    for (const jk of ['junkmanEngine','junkmanTurbo','junkmanTires','junkmanTransmission','junkmanSuspension','junkmanNitro','junkmanBrakes']) {
      if (typeof raw.upgrades[jk]==='boolean') upgrades[jk]=raw.upgrades[jk];
    }
    for (const pk of ['gearRatioBias','aeroDownforce','gripDriftBias']) {
      if (typeof raw.upgrades[pk]==='number' && Number.isFinite(raw.upgrades[pk])) {
        upgrades[pk]=Math.max(-5,Math.min(5,raw.upgrades[pk]));
      }
    }
  }
  const result={name,basePrice,condition,category,img,plate,upgrades};
  if (raw.saleProtected === true) result.saleProtected = true;
  if (Array.isArray(raw.ownedProParts)) {
    const validProParts=['junkmanEngine','junkmanTurbo','junkmanTires','junkmanTransmission','junkmanSuspension','junkmanNitro','junkmanBrakes'];
    const ownedProParts=[...new Set(raw.ownedProParts.filter(k=>typeof k==='string' && validProParts.includes(k)))];
    if (ownedProParts.length>0) result.ownedProParts=ownedProParts;
  }
  if (typeof raw.tuningStage==='number' && Number.isFinite(raw.tuningStage)) {
    result.tuningStage=Math.max(0,Math.min(20,Math.floor(raw.tuningStage)));
  }
  if (typeof raw.fuel==='number' && Number.isFinite(raw.fuel)) {
    result.fuel=Math.max(0,Math.min(200,raw.fuel));
  }
  if (typeof raw.totalKm==='number' && Number.isFinite(raw.totalKm)) {
    result.totalKm=Math.max(0,raw.totalKm);
  }
  if (typeof raw.spoiler==='string' && ['none','ducktail','high','gt','gtr'].includes(raw.spoiler)) {
    result.spoiler=raw.spoiler;
  }
  if (typeof raw.vinyl==='string' && ['none','stripes','drift','mw_m3gtr','mw_razor','mw_cross','mw_blacklist'].includes(raw.vinyl)) {
    result.vinyl=raw.vinyl;
  }
  if (typeof raw.wheels==='string' && ['stock','stamps','deepdish','forged','bbs','bbs_gtr','oz_racing'].includes(raw.wheels)) {
    result.wheels=raw.wheels;
  }
  if (typeof raw.bodykit==='string' && raw.bodykit.length<=30) {
    result.bodykit=raw.bodykit;
  }
  if (typeof raw.neon==='string' && (/^#[0-9a-fA-F]{6}$/.test(raw.neon) || raw.neon==='none')) {
    result.neon=raw.neon;
  }
  if (typeof raw.CustomPaintFinish==='string' && raw.CustomPaintFinish.length<=30) {
    result.CustomPaintFinish=raw.CustomPaintFinish;
  }
  if (typeof raw.customWheelColor==='string' && /^#[0-9a-fA-F]{6}$/.test(raw.customWheelColor)) {
    result.customWheelColor=raw.customWheelColor;
  }
  if (raw.proTuning && typeof raw.proTuning==='object') {
    const proTuning={};
    for (const pk of ['gearRatio','suspStiffness','tireGrip','gearRatioBias','aeroDownforce','gripDriftBias']) {
      if (typeof raw.proTuning[pk]==='number' && Number.isFinite(raw.proTuning[pk])) {
        proTuning[pk]=Math.max(-5,Math.min(5,raw.proTuning[pk]));
      }
    }
    if (Object.keys(proTuning).length>0) result.proTuning=proTuning;
  }
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
    if (typeof raw.styling.spoiler==='string' && ['none','ducktail','high','gt','gtr'].includes(raw.styling.spoiler)) {
      styling.spoiler=raw.styling.spoiler;
    }
    if (typeof raw.styling.vinyl==='string' && ['none','stripes','drift','mw_m3gtr','mw_razor','mw_cross','mw_blacklist'].includes(raw.styling.vinyl)) {
      styling.vinyl=raw.styling.vinyl;
    }
    if (typeof raw.styling.wheels==='string' && ['stock','stamps','deepdish','forged','bbs','bbs_gtr','oz_racing'].includes(raw.styling.wheels)) {
      styling.wheels=raw.styling.wheels;
    }
    if (typeof raw.styling.suspension==='string' && ['stock','lowered','bpan','lift'].includes(raw.styling.suspension)) {
      styling.suspension=raw.styling.suspension;
    }
    if (typeof raw.styling.sgu==='string' && ['none','installed'].includes(raw.styling.sgu)) {
      styling.sgu=raw.styling.sgu;
    }
    if (typeof raw.styling.plate==='string' && raw.styling.plate.length<=60) {
      styling.plate=raw.styling.plate;
    }
    if (typeof raw.styling.camber==='number' && Number.isFinite(raw.styling.camber)) {
      styling.camber=Math.max(-15,Math.min(5,raw.styling.camber));
    }
    if (typeof raw.styling.wheelOffset==='number' && Number.isFinite(raw.styling.wheelOffset)) {
      styling.wheelOffset=Math.max(-1,Math.min(1,raw.styling.wheelOffset));
    }
    if (typeof raw.styling.offset==='number' && Number.isFinite(raw.styling.offset)) {
      styling.offset=Math.max(-1,Math.min(1,raw.styling.offset));
    }
    for (const sk of ['neonMode','bodykit','roofScoop','hood','nitroColor','smokeColor','CustomPaintFinish','paintFinish']) {
      if (typeof raw.styling[sk]==='string' && raw.styling[sk].length<=30) {
        styling[sk]=raw.styling[sk];
      }
    }
    if (typeof raw.styling.customWheelColor==='string' && /^#[0-9a-fA-F]{6}$/.test(raw.styling.customWheelColor)) {
      styling.customWheelColor=raw.styling.customWheelColor;
    }
    if (typeof raw.styling.wheelColor==='string' && /^#[0-9a-fA-F]{6}$/.test(raw.styling.wheelColor)) {
      styling.wheelColor=raw.styling.wheelColor;
    }
    if (typeof raw.styling.tuningStage==='number' && Number.isFinite(raw.styling.tuningStage)) {
      styling.tuningStage=Math.max(0,Math.min(20,Math.floor(raw.styling.tuningStage)));
    }
    if (typeof raw.styling.fuel==='number' && Number.isFinite(raw.styling.fuel)) {
      styling.fuel=Math.max(0,Math.min(200,raw.styling.fuel));
    }
    if (typeof raw.styling.totalKm==='number' && Number.isFinite(raw.styling.totalKm)) {
      styling.totalKm=Math.max(0,raw.styling.totalKm);
    }
    if (typeof raw.styling.pneumo==='boolean' || (typeof raw.styling.pneumo==='string' && raw.styling.pneumo.length<=30)) {
      styling.pneumo=raw.styling.pneumo;
    }
    for (const jk of ['junkmanEngine','junkmanTurbo','junkmanTires','junkmanTransmission','junkmanSuspension','junkmanNitro','junkmanBrakes']) {
      if (typeof raw.styling[jk]==='boolean') styling[jk]=raw.styling[jk];
    }
    for (const pk of ['gearRatioBias','aeroDownforce','gripDriftBias']) {
      if (typeof raw.styling[pk]==='number' && Number.isFinite(raw.styling[pk])) {
        styling[pk]=Math.max(-5,Math.min(5,raw.styling[pk]));
      }
    }
    if (typeof raw.styling.stanceMode==='string' && ['stock','sport','bpan'].includes(raw.styling.stanceMode)) {
      styling.stanceMode=raw.styling.stanceMode;
    }
    if (typeof raw.styling.fsoStrobes==='boolean') {
      styling.fsoStrobes=raw.styling.fsoStrobes;
    }
    if (raw.styling.livery && typeof raw.styling.livery==='object' && !Array.isArray(raw.styling.livery)) {
      const liv=raw.styling.livery;
      const pattern=['none','twin','slash','belt','chevron','circuit'].includes(liv.pattern)?liv.pattern:'none';
      const color=typeof liv.color==='string' && /^#[0-9a-fA-F]{6}$/.test(liv.color)?liv.color:'#d9fb70';
      const width=typeof liv.width==='number' && Number.isFinite(liv.width)?Math.max(0.03,Math.min(0.25,liv.width)):0.1;
      const offset=typeof liv.offset==='number' && Number.isFinite(liv.offset)?Math.max(-0.25,Math.min(0.25,liv.offset)):0;
      const number=String(liv.number??'').replace(/\D/g,'').slice(0,2);
      const team=String(liv.team||'').replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,12);
      if (pattern!=='none' || number || team) {
        styling.livery={pattern,color,width,offset,number,team};
      }
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
const ULTRA_SPECIAL_RUS_SERIES = ['МОС','СВТ','КМН','СМК','УМВ','РМВ','ВМО','КМО','КРМ','РФС'];

const ULTRA_SPECIAL_META_BY_SERIES = {
  'МОС': { id: 'ussr', type: 'ussr', label: '🏛️ СССР • РЕТРО ГОСТ 1977', badge: '★ СССР', plateBg: '#0b0f17', textColor: '#f8fafc' },
  'СВТ': { id: 'ussr', type: 'ussr', label: '🏛️ СССР • СОВМИН ГОСТ', badge: '★ СССР', plateBg: '#0b0f17', textColor: '#f8fafc' },
  'КМН': { id: 'diplomat', type: 'diplomat', label: '📕 ДИПКОРПУС CD • МИД', badge: 'CD • МИД', plateBg: '#b91c1c', textColor: '#ffffff' },
  'СМК': { id: 'diplomat', type: 'diplomat', label: '📕 КОНСУЛЬСКИЙ CD • ДИПЛОМАТ', badge: 'CD • D', plateBg: '#b91c1c', textColor: '#ffffff' },
  'УМВ': { id: 'mvd', type: 'mvd', label: '🚔 СПЕЦСВЯЗЬ МВД • СИНИЙ ГОСТ', badge: 'МВД РФ', plateBg: '#1d4ed8', textColor: '#ffffff' },
  'РМВ': { id: 'mvd', type: 'mvd', label: '🚔 ГУОБДД МВД • СПЕЦБАТАЛЬОН', badge: 'ДПС МВД', plateBg: '#1d4ed8', textColor: '#ffffff' },
  'ВМО': { id: 'military', type: 'military', label: '🪖 ГЕНШТАБ МО • ВОЕННЫЙ ГОСТ', badge: '★ МО РФ', plateBg: '#090d16', textColor: '#f1f5f9' },
  'КМО': { id: 'military', type: 'military', label: '🪖 КОМЕНДАТУРА МО • ЧЁРНЫЙ ГОСТ', badge: '★ ВАИ', plateBg: '#090d16', textColor: '#f1f5f9' },
  'КРМ': { id: 'federal', type: 'federal', label: '🇷🇺 ФЕДЕРАЛЬНЫЙ СПЕЦНОМЕР • КРЕМЛЬ', badge: '🇷🇺 ФСО', plateBg: '#f8fafc', textColor: '#0f172a' },
  'РФС': { id: 'federal', type: 'federal', label: '🇷🇺 ПРОТОКОЛ ФСО • ФЛАГ РФ', badge: '🇷🇺 РФ', plateBg: '#f8fafc', textColor: '#0f172a' }
};

function getUltraSpecialPlateMeta(l1, l2, l3, num, reg, country = 'RUS') {
  if (l1 && typeof l1 === 'object' && !Array.isArray(l1)) {
    const p = l1;
    if (typeof p.text === 'string' && p.text.includes('|')) {
      const parsed = parsePlate(p.text);
      if (parsed) return getUltraSpecialPlateMeta(parsed.l1, parsed.l2, parsed.l3, parsed.digits, parsed.region, parsed.country);
    }
    const arr = Array.isArray(p.letters) ? p.letters : [p.l1, p.l2, p.l3];
    return getUltraSpecialPlateMeta(arr[0], arr[1], arr[2], p.digits ?? p.num, p.region ?? p.reg, p.country || 'RUS');
  }
  if (typeof l1 === 'string' && l2 === undefined && l1.includes('|')) {
    const parsed = parsePlate(l1);
    if (!parsed) return null;
    return getUltraSpecialPlateMeta(parsed.l1, parsed.l2, parsed.l3, parsed.digits, parsed.region, parsed.country);
  }
  const cCode = (country && COUNTRIES[String(country).toUpperCase()]) ? String(country).toUpperCase() : 'RUS';
  const letters = `${String(l1 || '').toUpperCase()}${String(l2 || '').toUpperCase()}${String(l3 || '').toUpperCase()}`;
  if (String(country || '').toUpperCase() === 'JPN' && String(num || '').length > 3) return null;
  const digits = String(num || '000').padStart(3, '0').slice(-3);
  const regUp = String(reg || '').toUpperCase();
  if (cCode === 'RUS') {
    if (ULTRA_SPECIAL_META_BY_SERIES[letters]) {
      return { ...ULTRA_SPECIAL_META_BY_SERIES[letters], series: letters };
    }
    if (regUp === 'СССР' || regUp === 'USSR') {
      return { ...ULTRA_SPECIAL_META_BY_SERIES['МОС'], series: letters };
    }
    if (regUp === 'CD' || /^CD\d*$/i.test(regUp)) {
      return { ...ULTRA_SPECIAL_META_BY_SERIES['КМН'], series: letters };
    }
  }
  if (cCode === 'JPN' && ['JDM', 'GTR'].includes(letters) && ['777', '001', '007'].includes(digits)) {
    return {
      id: 'jdm_glow',
      type: 'jdm_glow',
      label: '🇯🇵 JDM 字光式 • НЕОНОВЫЙ СПЕЦНОМЕР ТОКИО',
      badge: '字光式 JDM',
      plateBg: '#051b18',
      textColor: '#34d399',
      series: letters
    };
  }
  return null;
}

const COUNTRIES = {
  RUS: {
    code: 'RUS',
    spinCostBoth: 900,
    spinCostPart: 500,
    priceMult: 1.0,
    regRegex: /^(?:\d{2,3}|СССР|CD)$/i,
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
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    elites: ['AAA','VIP','ZZZ','QQQ','GGG','NNN','MMM','SSS','XXX','LLL','AST','ALA','HAN']
  },
  USA: {
    code: 'USA',
    spinCostBoth: 3500,
    spinCostPart: 2000,
    priceMult: 3.5,
    regRegex: /^(?:[A-Z]{2}|\d{2,3})$/i,
    defaultReg: 'CA',
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
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
  },
  JPN: {
    code: 'JPN',
    spinCostBoth: 5000,
    spinCostPart: 2800,
    priceMult: 5.0,
    regRegex: /^(?:TKY|YKH|OSK|NGY|SPR|FKO|KBE|KYO|CHB|STM|[A-Z]{2,3}|\d{2,3})$/i,
    defaultReg: 'TKY',
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    elites: ['JDM','TKY','GTR','NSM','TRD','STI','EVO','WGN','DRF','BOS','VIP','AAA','ZZZ','XXX']
  }
};

const UAE_SPECIAL_3DIGIT_NUMBERS = [
  '911','707','918','812','720','765','488','458','101','909','505','808','770','110','990','550','880'
];

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
    const rawStr = String(num).trim().replace(/[^0-9]/g, '');
    if (rawStr.length >= 4) {
      digits = rawStr.slice(0, 5).replace(/^0+/, '') || '1000';
    } else {
      const parsed = parseInt(rawStr, 10);
      digits = (Number.isFinite(parsed) && parsed > 0) ? String(parsed) : '100';
    }
  }
  return { code, digits };
}

function evaluateUaePlateDetails(l1, l2, l3, num, reg = 'DXB') {
  const rawC1 = String(l1 || 'A').trim().toUpperCase();
  const rawC2 = String(l2 || 'X').trim().toUpperCase();
  const rawC3 = String(l3 || 'Z').trim().toUpperCase();
  const isNumericCat = /^\d+$/.test(rawC1);
  const c1 = isNumericCat ? rawC1 : (rawC1[0] || 'A');
  const c2 = isNumericCat ? 'X' : (rawC2[0] || 'X');
  const c3 = isNumericCat ? 'Z' : (rawC3[0] || 'Z');
  const isDoubleCode = (!isNumericCat && c1 !== '-' && c1 === c2 && c2 === c3);
  const code = isDoubleCode ? (c1 + c2) : c1;

  const uaeParts = getUaePlateDisplayParts(c1, c2, c3, num);
  const cleanDigits = uaeParts.digits === '---' ? '124' : uaeParts.digits;
  const digitCount = cleanDigits.length;
  const regUp = String(reg || 'DXB').trim().toUpperCase() || 'DXB';

  // 1. Иерархия кода серии RTA / Эмирата
  let codeTier = 'B_SINGLE';
  let codeMult = 1.0;
  let codeFlatBonus = 400;
  let codePrestige = `Стандартная серия RTA (${code})`;

  if (isDoubleCode) {
    if (['AA', 'BB', 'CC', 'DD', 'OO', 'II', 'PP', 'XX', 'ZZ'].includes(code)) {
      codeTier = 'RTA_DOUBLE_PRIME';
      codeMult = 1.45;
      codeFlatBonus = 3200000;
      codePrestige = `Флагманская закрытая аукционная серия RTA (${code})`;
    } else {
      codeTier = 'RTA_DOUBLE';
      codeMult = 1.30;
      codeFlatBonus = 2200000;
      codePrestige = `Эксклюзивная двухбуквенная серия RTA (${code})`;
    }
  } else if (isNumericCat) {
    if (['1', '2', '50', '01', '02'].includes(code)) {
      codeTier = 'AD_PRIME_CAT';
      codeMult = 1.38;
      codeFlatBonus = 2000;
      codePrestige = code === '50'
        ? 'Юбилейная категория 50 — Golden Jubilee ОАЭ'
        : `Высшая правительственная категория Абу-Даби (Код ${parseInt(code, 10)})`;
    } else {
      codeTier = 'AD_CAT';
      codeMult = 1.12;
      codeFlatBonus = 1000;
      codePrestige = `Категория эмирата (Код ${parseInt(code, 10) || code})`;
    }
  } else if (c1 === 'D') {
    codeTier = 'S_SINGLE';
    codeMult = 1.28;
    codeFlatBonus = 2200;
    codePrestige = 'Код D — заглавная буква DUBAI (высший престиж эмирата)';
  } else if (c1 === 'A') {
    codeTier = 'S_SINGLE';
    codeMult = 1.24;
    codeFlatBonus = 1800;
    codePrestige = 'Код A — самая первая историческая серия Дубая (Old Money)';
  } else if (c1 === 'P') {
    codeTier = 'S_SINGLE';
    codeMult = 1.24;
    codeFlatBonus = 1800;
    codePrestige = 'Код P — серия абсолютного мирового рекорда P 7 ($15M)';
  } else if (c1 === 'O') {
    codeTier = 'S_SINGLE';
    codeMult = 1.22;
    codeFlatBonus = 1800;
    codePrestige = 'Код O — визуальная оптическая иллюзия нуля «0»';
  } else if (c1 === 'I') {
    codeTier = 'S_SINGLE';
    codeMult = 1.20;
    codeFlatBonus = 1800;
    codePrestige = 'Код I — вертикальная оптическая иллюзия единицы «1»';
  } else if (['X', 'V', 'Z', 'S', 'M', 'R', 'W', 'G', 'B', 'F', 'C'].includes(c1)) {
    codeTier = 'A_SINGLE';
    codeMult = 1.12;
    codeFlatBonus = 1200;
    const brandHint = {
      G: 'Mercedes-AMG G63 / Brabus',
      F: 'Ferrari Supercar Series',
      S: 'Maybach / S-Class Series',
      M: 'BMW M Motorsport Series',
      R: 'Rolls-Royce / Range Rover Series',
      W: 'Rolls-Royce Wraith / VIP Series',
      B: 'Bugatti / Brabus / Bentley Series',
      V: 'VIP / V12 Symmetry Series',
      X: 'Geometric X Symmetry Series',
      Z: 'Final Alphabet Z Series',
      C: 'Classic Prestige Series'
    }[c1];
    codePrestige = `Престижная серия RTA ${c1} (${brandHint})`;
  }

  // 2. Иерархия Эмирата (DXB / AUH / SHJ / Northern Emirates)
  let emirateMult = 0.94;
  let emirateFlatBonus = 900;
  let emirateName = `Эмират ${regUp}`;
  if (regUp === 'DXB') {
    emirateMult = 1.15;
    emirateFlatBonus = 2400;
    emirateName = 'Дубай (RTA Dubai)';
  } else if (['AUH', 'AD', '1', '2', '50', '01', '05'].includes(regUp)) {
    emirateMult = 1.12;
    emirateFlatBonus = 2200;
    emirateName = 'Абу-Даби (Abu Dhabi)';
  } else if (regUp === 'SHJ') {
    emirateMult = 1.00;
    emirateFlatBonus = 1200;
    emirateName = 'Шарджа (Sharjah)';
  } else if (regUp === 'AJM') {
    emirateName = 'Аджман (Ajman)';
  } else if (regUp === 'RAK') {
    emirateName = 'Рас-эль-Хайма (R.A.K.)';
  } else if (regUp === 'FUJ') {
    emirateName = 'Фуджейра (Fujairah)';
  } else if (regUp === 'UAQ') {
    emirateName = 'Умм-эль-Кувейн (U.A.Q.)';
  }

  // 3. Золотое правило ОАЭ: Разрядность (1..5 цифр) и паттерны RTA
  let isPrestigePattern = false;
  let tierId = 'vip_3digit';
  let tierBadge = '🇦🇪 DUBAI 3-DIGIT';
  let tierTitle = 'Трёхзначный номер RTA';
  let digitBase = 8200;
  let synergyBonus = 0;
  let realWorldNote = 'В ОАЭ ценность номера определяется прежде всего малым числом цифр (от 1 до 5 разрядов).';

  const SINGLE_DIGIT_BASE = {
    '1': 58000000,
    '7': 48000000,
    '5': 42000000,
    '9': 36000000,
    '2': 32000000,
    '8': 30000000,
    '3': 26000000,
    '6': 24000000,
    '4': 21000000
  };

  const TWIN_2DIGIT_BASE = {
    '11': 9500000,
    '77': 8500000,
    '99': 7800000,
    '55': 7200000,
    '88': 6800000,
    '22': 6200000,
    '33': 5800000,
    '66': 5400000,
    '44': 5000000
  };

  const ROUND_2DIGIT_BASE = {
    '10': 3400000,
    '50': 3100000,
    '70': 2800000,
    '20': 2600000,
    '90': 2500000,
    '80': 2400000,
    '30': 2200000,
    '60': 2050000,
    '40': 1950000
  };

  const TRIPLE_3DIGIT_BASE = {
    '777': 5200000,
    '111': 4400000,
    '999': 4100000,
    '555': 3700000,
    '888': 3500000,
    '222': 3100000,
    '333': 2900000,
    '666': 2700000,
    '444': 2500000
  };

  const ROUND_3DIGIT_BASE = {
    '100': 68000,
    '700': 58000,
    '500': 54000,
    '900': 50000,
    '800': 48000,
    '600': 45000,
    '300': 42000,
    '200': 40000,
    '400': 38000
  };

  if (digitCount === 1) {
    isPrestigePattern = true;
    tierId = 'royal_1digit';
    tierBadge = '👑 ROYAL 1-DIGIT';
    tierTitle = 'Королевский 1-значный номер шейха (Most Noble Numbers)';
    digitBase = SINGLE_DIGIT_BASE[cleanDigits] || 25000000;

    if (cleanDigits === '1') {
      realWorldNote = 'Цифра 1 — символ первого лица государства (Абу-Даби №1 продан за 52,2 млн AED / $14,2 млн).';
    } else if (cleanDigits === '7') {
      realWorldNote = 'Цифра 7 символизирует 7 Эмиратов ОАЭ — самая почитаемая цифра страны после единицы.';
    } else if (cleanDigits === '5') {
      realWorldNote = 'Цифра 5 входит в топ-3 королевских номеров Дубая и Абу-Даби.';
    } else if (cleanDigits === '2') {
      realWorldNote = 'Цифра 2 символизирует 2 декабря — День объединения ОАЭ (Абу-Даби №2 продан за 23,3 млн AED).';
    } else {
      realWorldNote = 'Однозначные номера в ОАЭ никогда не поступают в свободную продажу и разыгрываются только на флагманских аукционах RTA.';
    }

    if (code === 'P' && cleanDigits === '7') {
      synergyBonus += 35000000;
      realWorldNote = 'Абсолютный мировой рекорд Гиннесса: номер P 7 продан в Дубае за 55 000 000 AED ($15 млн)!';
    } else if (code === 'D' && cleanDigits === '5') {
      synergyBonus += 5000000;
      realWorldNote = 'Легендарный лот RTA Open Auction: номер D 5 куплен в Дубае за 33 000 000 AED ($9 млн, D[4]+5=9)!';
    } else if (code === 'AA' && (cleanDigits === '9' || cleanDigits === '8')) {
      synergyBonus += 18000000;
      realWorldNote = `Рекорд благотворительного аукциона Most Noble Numbers: AA ${cleanDigits} продан за ${cleanDigits === '9' ? '38' : '35'} 000 000 AED!`;
    } else if (code === 'DD' && (cleanDigits === '5' || cleanDigits === '6')) {
      synergyBonus += 16000000;
      realWorldNote = `Флагманский рекорд Most Noble Numbers: DD ${cleanDigits} продан в Дубае за ${cleanDigits === '6' ? '37' : '35'} 000 000 AED!`;
    } else if (code === 'O' && cleanDigits === '9') {
      synergyBonus += 12000000;
      realWorldNote = 'Знаменитый лот RTA O 9 (25 000 000 AED) с оптической иллюзией нуля!';
    } else if (code === 'I' && cleanDigits === '1') {
      synergyBonus += 12000000;
      realWorldNote = 'Оптическая иллюзия двух вертикальных единиц (I 1) — закрытый трофей Дубая!';
    }
  } else if (digitCount === 2) {
    isPrestigePattern = true;
    if (cleanDigits[0] === cleanDigits[1]) {
      tierId = 'uhnw_2digit_twin';
      tierBadge = '💎 VVIP 2-DIGIT TWIN';
      tierTitle = `Двузначный парный дубль RTA (${cleanDigits})`;
      digitBase = TWIN_2DIGIT_BASE[cleanDigits] || 5500000;
      realWorldNote = 'По правилам рынка ОАЭ двузначный дубль (11..99) всегда ценится выше любого трёхзначного номера (включая 777).';

      if (code === 'O') {
        synergyBonus += 3500000;
        realWorldNote = `Оптическая иллюзия круга O ${cleanDigits} (читается как 0 ${cleanDigits}) — мультимиллионный лот RTA!`;
      } else if (code === 'I' && cleanDigits === '11') {
        synergyBonus += 4000000;
        realWorldNote = 'Визуальный триплет вертикальных единиц (I 11) — ультра-редкий трофей Дубая!';
      } else if (code === 'BB' && cleanDigits === '88') {
        synergyBonus += 4500000;
        realWorldNote = 'Аукционный рекорд Дубая: номер BB 88 продан за 14 000 000 AED ($3,8 млн)!';
      } else if (code === 'CC' && cleanDigits === '22') {
        synergyBonus += 3000000;
        realWorldNote = 'Аукционный рекорд RTA: номер CC 22 продан за 8 350 000 AED ($2,27 млн)!';
      }
    } else if (cleanDigits[1] === '0') {
      tierId = 'uhnw_2digit_round';
      tierBadge = '🏛️ VIP 2-DIGIT ROUND';
      tierTitle = `Двузначный круглый десяток RTA (${cleanDigits})`;
      digitBase = ROUND_2DIGIT_BASE[cleanDigits] || 2100000;
      realWorldNote = cleanDigits === '50'
        ? 'Номер 50 символизирует Golden Jubilee (50-летие основания ОАЭ) и особо ценится коллекционерами.'
        : 'Круглые двузначные десятки (10..90) торгуются на аукционах RTA за 3,5–15 млн дирхамов.';
      if (code === 'O' && cleanDigits === '10') {
        synergyBonus += 2200000;
        realWorldNote = 'Бинарная оптическая иллюзия O 10 (0 10) — элитный лот Дубая!';
      }
    } else if (['71', '63'].includes(cleanDigits)) {
      tierId = 'uhnw_2digit_iconic';
      tierBadge = '🔥 CULT 2-DIGIT';
      if (cleanDigits === '71') {
        digitBase = 1450000;
        tierTitle = 'Патриотический двузначный номер 71 (1971 — Год основания ОАЭ)';
        realWorldNote = 'Число 71 — главный национальный символ объединения Эмиратов в 1971 году.';
      } else {
        digitBase = 1350000;
        tierTitle = 'Культовый дубайский индекс 63 (Mercedes-AMG G63 Brabus)';
        realWorldNote = 'Двузначный номер 63 — главный статусный аксессуар для G63 AMG и Brabus в Дубае.';
        if (code === 'G' || code === 'GG') {
          synergyBonus += 1500000;
          realWorldNote = `Идеальное комбо ${code} 63 для дубайского Mercedes-AMG G63 Brabus!`;
        }
      }
    } else {
      const is2Ladder = ['12','21','23','34','45','56','67','78','89','98','87','76','65','54','43','32'].includes(cleanDigits);
      tierId = 'uhnw_2digit';
      tierBadge = '🌟 2-DIGIT VIP';
      tierTitle = `Двузначный привилегированный номер RTA (${cleanDigits})`;
      digitBase = is2Ladder ? 165000 : 135000;
      realWorldNote = 'Любой двузначный номер в Дубае — элитный актив стоимостью от 1,4 млн AED на вторичном рынке.';
    }
  } else if (digitCount === 3) {
    if (cleanDigits[0] === cleanDigits[1] && cleanDigits[1] === cleanDigits[2]) {
      isPrestigePattern = true;
      tierId = 'vip_3digit_triple';
      tierBadge = '🏆 RTA TRIPLE 3-DIGIT';
      tierTitle = `Трёхзначный аукционный триплет RTA (${cleanDigits})`;
      digitBase = TRIPLE_3DIGIT_BASE[cleanDigits] || 2800000;
      realWorldNote = 'Трёхзначные триплеты (777, 111, 999) — визитная карточка суперкаров в Downtown Dubai и Dubai Marina.';
      if (code === 'BB' && cleanDigits === '777') {
        synergyBonus += 2200000;
        realWorldNote = 'Рекорд аукциона Дубая: номер BB 777 продан за 6 000 000 AED ($1,63 млн)!';
      } else if (code === 'I' && cleanDigits === '111') {
        synergyBonus += 2500000;
        realWorldNote = 'Четыре вертикальные единицы подряд (I 111) — оптический шедевр RTA!';
      }
    } else if (cleanDigits.endsWith('00')) {
      isPrestigePattern = true;
      tierId = 'vip_3digit_round';
      tierBadge = '✨ ROUND HUNDRED';
      tierTitle = `Трёхзначная круглая сотня RTA (${cleanDigits})`;
      digitBase = ROUND_3DIGIT_BASE[cleanDigits] || 42000;
      realWorldNote = 'Круглые сотни (100..900) визуально воспринимаются как однозначные номера с двумя нулями.';
      if (code === 'O' && cleanDigits === '100') {
        synergyBonus += 280000;
      } else if ((code === 'S' || code === 'G') && (cleanDigits === '500' || cleanDigits === '600')) {
        synergyBonus += 140000;
      } else if (code === 'B' && (cleanDigits === '800' || cleanDigits === '900')) {
        synergyBonus += 140000;
      }
    } else if (UAE_SPECIAL_3DIGIT_NUMBERS.includes(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'vip_3digit_supercar';
      tierBadge = '🏎️ SUPERCAR / RADAR';
      tierTitle = `Индекс суперкара / радар-комбинация RTA (${cleanDigits})`;
      digitBase = ['911', '707', '101', '909'].includes(cleanDigits) ? 52000 : 38000;
      realWorldNote = 'В Дубае особым спросом пользуются номера под модель суперкара (911, 812, 720, 488, 707) и нулевые радары (101, 707, 909).';
      if ((code === 'P' || code === 'PP') && (cleanDigits === '911' || cleanDigits === '918')) {
        synergyBonus += 850000;
        realWorldNote = `Культовое комбо ${code} ${cleanDigits} для владельцев Porsche ${cleanDigits} в Дубае!`;
      } else if ((code === 'F' || code === 'FF') && ['812', '488', '458'].includes(cleanDigits)) {
        synergyBonus += 680000;
        realWorldNote = `Фирменный номер ${code} ${cleanDigits} для суперкаров Ferrari в Дубае!`;
      } else if ((code === 'M' || code === 'MM') && ['720', '765'].includes(cleanDigits)) {
        synergyBonus += 620000;
        realWorldNote = `Идеальный индекс ${code} ${cleanDigits} для McLaren ${cleanDigits}S/LT!`;
      } else if (code === 'AA' && cleanDigits === '707') {
        synergyBonus += 1500000;
        realWorldNote = 'Реальный лот аукциона Дубая AA 707 продан за 3 300 000 AED ($900 тыс.)!';
      } else if ((code === 'O' && cleanDigits === '909') || (code === 'I' && cleanDigits === '101')) {
        synergyBonus += 420000;
      }
    } else if (LADDER_NUMBERS.includes(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'vip_3digit_pattern';
      tierBadge = '🎯 RTA LADDER';
      tierTitle = `Трёхзначная лесенка RTA (${cleanDigits})`;
      digitBase = ['123', '789', '321', '987'].includes(cleanDigits) ? 44000 : 34000;
      realWorldNote = 'Последовательные трёхзначные номера (123, 789) продаются на онлайн-аукционах RTA за 350k–1.2M AED.';
    } else if (cleanDigits[0] === cleanDigits[2]) {
      isPrestigePattern = false;
      tierId = 'vip_3digit_mirror';
      tierBadge = '🇦🇪 MIRROR 3-DIGIT';
      tierTitle = `Зеркальный 3-значный номер ОАЭ (${cleanDigits})`;
      digitBase = 11200;
      realWorldNote = 'Симметричный трёхзначный номер (палиндром ABA).';
    } else {
      isPrestigePattern = false;
      tierId = 'vip_3digit';
      tierBadge = '🇦🇪 DUBAI 3-DIGIT';
      tierTitle = 'Трёхзначный номер Дубая / ОАЭ';
      digitBase = 8200;
    }
  } else if (digitCount === 4) {
    if (/^([1-9])\1{3}$/.test(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'collector_4digit_quad';
      tierBadge = '💎 RTA QUAD 4-DIGIT';
      tierTitle = `Четырёхзначный покер одинаковых цифр RTA (${cleanDigits})`;
      digitBase = (cleanDigits === '7777' || cleanDigits === '1111')
        ? 3800000
        : (['9999', '5555', '8888'].includes(cleanDigits) ? 3100000 : 2200000);
      realWorldNote = 'Четыре одинаковые цифры подряд (7777, 1111, 9999) на аукционах RTA ценятся наравне с двузначными номерами.';
    } else if (/^[1-9]000$/.test(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'collector_4digit_round';
      tierBadge = '🏛️ ROUND THOUSAND';
      tierTitle = `Круглая тысяча RTA (${cleanDigits})`;
      digitBase = (cleanDigits === '1000' || cleanDigits === '7000')
        ? 1250000
        : (['5000', '9000', '8000'].includes(cleanDigits) ? 920000 : 680000);
      realWorldNote = 'Круглые тысячи (1000..9000) с тремя нулями — элитная серия RTA.';
    } else if (['1971', '2020', '2071'].includes(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'collector_4digit_heritage';
      tierBadge = '🕌 UAE HERITAGE';
      if (cleanDigits === '1971') {
        digitBase = 950000;
        tierTitle = '1971 — Год основания ОАЭ (Spirit of the Union)';
        realWorldNote = 'Номер 1971 — предмет национальной гордости в ОАЭ в честь года образования Федерации.';
      } else if (cleanDigits === '2020') {
        digitBase = 520000;
        tierTitle = '2020 — Всемирная выставка EXPO 2020 Dubai + пара 20-20';
        realWorldNote = 'Знаковый памятный номер EXPO 2020 Dubai с двойным повтором 20-20.';
      } else {
        digitBase = 450000;
        tierTitle = '2071 — Столетие ОАЭ (UAE Centennial 2071)';
        realWorldNote = 'Государственная программа столетия ОАЭ — UAE Centennial 2071.';
      }
    } else if (/^([1-9])00\1$/.test(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'collector_4digit_radar';
      tierBadge = '🎯 ZERO BOOKEND';
      tierTitle = `Четырёхзначный нулевой радар RTA (${cleanDigits})`;
      digitBase = (cleanDigits === '7007' || cleanDigits === '1001') ? 580000 : 380000;
      realWorldNote = 'Зеркальные рамки с двумя нулями в центре (1001, 7007, 9009) — классика аукционов Дубая.';
    } else if (/^([1-9])\1\1\d$/.test(cleanDigits) || /^\d([1-9])\1\1$/.test(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'collector_4digit_triple';
      tierBadge = '✨ TRIPLE-IN-4';
      tierTitle = `Триплет внутри 4-значного номера RTA (${cleanDigits})`;
      digitBase = cleanDigits.endsWith('0') ? 320000 : 220000;
    } else if (
      /^(\d)\1(\d)\2$/.test(cleanDigits) ||
      /^(\d\d)\1$/.test(cleanDigits) ||
      /^(\d)(\d)\2\1$/.test(cleanDigits) ||
      ['1234','2345','3456','4567','5678','6789','9876','8765','7654','6543','5432','4321'].includes(cleanDigits)
    ) {
      isPrestigePattern = true;
      tierId = 'collector_4digit_pattern';
      tierBadge = '🎯 4-DIGIT PATTERN';
      tierTitle = `Симметричная 4-значная комбинация RTA (${cleanDigits})`;
      digitBase = cleanDigits.endsWith('00') ? 195000 : 125000;
    } else {
      isPrestigePattern = false;
      tierId = 'distinguished_4digit';
      tierBadge = '🇦🇪 4-DIGIT RTA';
      tierTitle = 'Четырёхзначный номер RTA (Distinguished 4-Digit)';
      digitBase = 11000;
    }
  } else {
    // 5-Digit Plates (10000..99999)
    if (/^([1-9])\1{4}$/.test(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'collector_5digit_quint';
      tierBadge = '👑 RTA QUINT 5-DIGIT';
      tierTitle = `Пятизначный королевский квинт RTA (${cleanDigits})`;
      digitBase = (cleanDigits === '77777' || cleanDigits === '11111')
        ? 2900000
        : (['99999', '55555', '88888'].includes(cleanDigits) ? 2300000 : 1650000);
      realWorldNote = 'Пять одинаковых цифр подряд (77777, 11111, 99999) продаются на аукционах Дубая за 800 тыс. – 1,8 млн AED!';
    } else if (/^[1-9]0000$/.test(cleanDigits)) {
      isPrestigePattern = true;
      tierId = 'collector_5digit_round';
      tierBadge = '🏛️ ROUND 10,000';
      tierTitle = `Круглый десятитысячный номер RTA (${cleanDigits})`;
      digitBase = (cleanDigits === '10000' || cleanDigits === '70000') ? 850000 : 520000;
      realWorldNote = 'Четыре нуля подряд (10000..90000) создают эффект однозначного номера на табличке.';
    } else if (
      /^([1-9])000\1$/.test(cleanDigits) ||
      /^([1-9])\1{3}\d$/.test(cleanDigits) ||
      /^\d([1-9])\1{3}$/.test(cleanDigits)
    ) {
      isPrestigePattern = true;
      tierId = 'collector_5digit_radar';
      tierBadge = '🎯 5-DIGIT RADAR / QUAD';
      tierTitle = `Редкий 5-значный радар / квад RTA (${cleanDigits})`;
      digitBase = 280000;
    } else if (
      /^(\d)\10\1\1$/.test(cleanDigits) ||
      /^(\d)(\d)\d\2\1$/.test(cleanDigits) ||
      ['12345','23456','34567','45678','56789','98765','87654','76543','65432','54321'].includes(cleanDigits)
    ) {
      isPrestigePattern = true;
      tierId = 'collector_5digit_sequence';
      tierBadge = '✨ 5-DIGIT PATTERN';
      tierTitle = `Коллекционная 5-значная комбинация RTA (${cleanDigits})`;
      digitBase = 140000;
    } else if (
      /^(\d)(\d)\1\2\1$/.test(cleanDigits) ||
      /^[1-9]{2}000$/.test(cleanDigits) ||
      /^(\d)\1\1(\d)\2$/.test(cleanDigits) ||
      /^(\d)\1(\d)\2\2$/.test(cleanDigits)
    ) {
      isPrestigePattern = true;
      tierId = 'collector_5digit_semi';
      tierBadge = '🇦🇪 5-DIGIT SEMI-VIP';
      tierTitle = `Красивый 5-значный номер RTA (${cleanDigits})`;
      digitBase = 48000;
    } else {
      isPrestigePattern = false;
      tierId = 'standard_5digit';
      tierBadge = '🇦🇪 STANDARD 5-DIGIT';
      tierTitle = 'Стандартный 5-значный регистрационный номер RTA';
      digitBase = 5500;
    }
  }

  let price;
  if (isPrestigePattern) {
    const doubleBonus = isDoubleCode
      ? (digitBase >= 500000 ? codeFlatBonus : (codeTier === 'RTA_DOUBLE_PRIME' ? 45000 : 28000))
      : 0;
    const rawPrice = (digitBase + doubleBonus) * codeMult * emirateMult + synergyBonus;
    price = Math.round(rawPrice / 100) * 100;
  } else {
    const plainCodeBonus = isDoubleCode
      ? (codeTier === 'RTA_DOUBLE_PRIME' ? 4200 : 2800)
      : codeFlatBonus;
    price = digitBase + plainCodeBonus + emirateFlatBonus;
  }

  const estimatedAed = Math.max(400, Math.round((price / 2.1) / 50) * 50);
  const estimatedUsd = Math.max(110, Math.round(estimatedAed / 3.6725 / 10) * 10);

  return {
    code,
    isDoubleCode,
    cleanDigits,
    digitCount,
    region: regUp,
    emirateName,
    codeTier,
    codePrestige,
    tierId,
    tierBadge,
    tierTitle,
    realWorldNote,
    price,
    estimatedAed,
    estimatedUsd
  };
}

function inspectUaePlate(arg0, l2, l3, num, reg) {
  if (typeof arg0 === 'string' && (l2 === undefined || arg0.includes('|'))) {
    const parsed = parsePlate(arg0.includes('|') ? arg0 : `${arg0} | DXB UAE`, 'UAE');
    if (parsed) {
      return evaluateUaePlateDetails(parsed.l1, parsed.l2, parsed.l3, parsed.digits, parsed.region);
    }
  }
  if (arg0 && typeof arg0 === 'object' && !Array.isArray(arg0)) {
    const arr = Array.isArray(arg0.letters) ? arg0.letters : [arg0.l1, arg0.l2, arg0.l3];
    return evaluateUaePlateDetails(arr[0], arr[1], arr[2], arg0.digits ?? arg0.num, arg0.region ?? arg0.reg);
  }
  return evaluateUaePlateDetails(arg0, l2, l3, num, reg);
}

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
  if (cCode === 'JPN' && /^\d{4}$/.test(String(num))) {
    if (String(num).startsWith('0')) return priceOfPlate(l1,l2,l3,String(num).slice(-3),reg,cCode);
    const n = String(num), mult = 1.85;
    const premium = new Set(n).size === 1 ? (n === '7777' ? 1500000 : 700000)
    : n.endsWith('000') ? 80000
    : '123456789'.includes(n) || '987654321'.includes(n) ? 35000
    : n === [...n].reverse().join('') ? 15000
    : n.slice(0,2) === n.slice(2) ? 12000 : 0;
    const series = String(l1||'')+String(l2||'')+String(l3||'');
    let base = 2200;
    if (COUNTRIES.JPN.elites.includes(series)) base += Math.round(400000*mult) + Math.round((['VIP','ZZZ','AAA','JDM','GTR','TKY'].includes(series)?1300000:750000)*mult);
    const triple = l1===l2 && l2===l3;
    base += Math.round((triple?350000:l1===l3?1800:l1===l2||l2===l3?1200:0)*mult);
    if (['TKY','YKH','OSK','NGY','SPR'].includes(String(reg||'').toUpperCase())) base += Math.round(500*mult) + (triple?Math.round(60000*mult):0);
    return base + Math.round(premium * mult);
  }
  if (cCode === 'UAE') {
    return evaluateUaePlateDetails(l1, l2, l3, num, reg).price;
  }

  const cfg = COUNTRIES[cCode];
  const cElites = cfg.elites;
  let price = 450; // Базовая стоимость простого номера
  const digits = String(num || '000').padStart(3, '0').slice(-3);
  const c1 = String(l1 || '').toUpperCase();
  const c2 = String(l2 || '').toUpperCase();
  const c3 = String(l3 || '').toUpperCase();
  const letters = c1 + c2 + c3;
  const isTripleLetters = (c1 !== '' && c1 === c2 && c2 === c3);
  const isMirrorLetters = (c1 !== '' && c1 === c3 && c1 !== c2);
  const isPairLetters = (c1 !== '' && (c1 === c2 || c2 === c3) && !isTripleLetters);
  const ultraMeta = getUltraSpecialPlateMeta(c1, c2, c3, digits, reg, cCode);

  if (cCode === 'RUS') {
    // 0. Ультра-редкие спецномера (СССР ГОСТ, Дипломатический CD, МВД Синий, Военный МО, Федеральный ФСО)
    if (ultraMeta) {
      price += 18000000;
      if (digits === '001' || digits === '777') price += 15000000;
      else if (digits === '007' || (digits[0] === digits[1] && digits[1] === digits[2])) price += 9000000;
      else if (digits.endsWith('00')) price += 4500000;
    }
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
    } else if (cCode === 'JPN') {
      if (['JDM','GTR','TKY','VIP'].includes(letters)) price += 1800000;
      else if (['NSM','TRD','STI','EVO','DRF','BOS'].includes(letters)) price += 1200000;
      else if (cElites.includes(letters)) price += 800000;
      if (ultraMeta && ultraMeta.id === 'jdm_glow') {
        price += 2200000;
      }
    }
  }

  // 2. Структура букв
  if (isTripleLetters) price += 350000;
  else if (isMirrorLetters) price += (cCode === 'RUS' ? 1800 : 1200);
  else if (isPairLetters) price += (cCode === 'RUS' ? 1200 : 800);

  // 3. Комбинации цифр
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
    price += (cCode === 'RUS' ? 1600 : 1000);
  }

  // 4. Регионы (символическая надбавка за столичные регионы + синергия с элитой)
  if (cCode === 'RUS') {
    if (['777','77','99','799','797','СССР','CD'].includes(String(reg || '').toUpperCase())) {
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
      price += 600;
      if (digits === '777' || digits === '001' || digits === '007') price += 550000;
      if (isTripleLetters || cElites.includes(letters)) price += 80000;
    } else {
      price += 300;
    }
  } else if (cCode === 'JPN') {
    if (['TKY','YKH','OSK','NGY','SPR'].includes(regUp)) {
      price += 700;
      if (digits === '777' || digits === '001' || digits === '007' || digits === '888') price += 600000;
      if (isTripleLetters || cElites.includes(letters)) price += 95000;
    } else {
      price += 350;
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

const LADDER_NUMBERS = ['123','234','345','456','567','678','789','987','876','765','654','543','432','321'];

function secureRoll(mode, pity = 0, country = 'RUS'){
  if(!['both','numbers','letters'].includes(mode))throw Error('Неверный тип спина');
  const cCode = (country && COUNTRIES[String(country).toUpperCase()]) ? String(country).toUpperCase() : 'RUS';
  const cfg = COUNTRIES[cCode];
  const letterPool = cfg.letters;
  const elitePool = cfg.elites;
  const choose=arr=>arr[crypto.randomInt(arr.length)];
  const pityNum = Math.min(120, Math.max(0, Math.floor(Number(pity) || 0)));
  const luckBonus = Math.min(200, Math.floor(pityNum * 3));
  const isIntl = (cCode === 'USA' || cCode === 'UAE' || cCode === 'JPN');

  let forceTier = null;
  if (mode === 'both') {
    if (pityNum >= 120) forceTier = 'legendary';
    else if (pityNum >= 65) forceTier = 'epic';
    else if (pityNum >= 25) forceTier = 'rare';
    else if ((cCode === 'RUS' || cCode === 'JPN') && crypto.randomInt(1000) < 2) {
      // 0.2% шанс на ультра-редкий спецномер (СССР ГОСТ, Дипломатический CD, МВД, МО, ФСО или JDM 字光式)
      forceTier = 'ultra_special';
    }
  }

  function pickOrdinary3DigitNumber() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const n = String(101 + crypto.randomInt(898));
      if (n[0] === n[1] && n[1] === n[2]) continue;
      if (n.endsWith('00')) continue;
      if (LADDER_NUMBERS.includes(n)) continue;
      if (cCode === 'UAE' && UAE_SPECIAL_3DIGIT_NUMBERS.includes(n)) continue;
      return n;
    }
    return '142';
  }

  function pickOrdinaryUaeNumber() {
    const lenRoll = crypto.randomInt(100);
    if (lenRoll < 50) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const n = String(10000 + crypto.randomInt(90000));
        if (n.endsWith('00')) continue;
        const info = evaluateUaePlateDetails('A', 'A', 'A', n, 'DXB');
        if (info && info.price < 18000) return n;
      }
      return '48291';
    }
    if (lenRoll < 85) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const n = String(1000 + crypto.randomInt(9000));
        if (n.endsWith('00')) continue;
        const info = evaluateUaePlateDetails('A', 'A', 'A', n, 'DXB');
        if (info && info.price < 18000) return n;
      }
      return '4829';
    }
    return pickOrdinary3DigitNumber();
  }

  function generateLuckyNumber() {
    if (forceTier === 'ultra_special') {
      return choose(cCode === 'JPN' ? ['777','001','007'] : ['001','007','777','888','999','100']);
    }
    if (forceTier === 'legendary') {
      return choose(cCode === 'UAE'
        ? ['1','7','5','9','2','8','11','77','88','99','777','7777','77777']
        : ['777','001','007','011','111','555','888','999']);
    }
    if (forceTier === 'epic') {
      return choose(cCode === 'UAE'
        ? [
            '11','22','55','77','88','99','10','20','50','70','71','63',
            '111','222','333','444','555','666','777','888','999',
            '1971','2020','7007','1000','7000','7777','10000','77777',
            '2','3','5','7','8','9'
          ]
        : [
            '111','222','333','444','555','666','888','999',
            '100','200','300','400','500','600','700','800','900',
            '002','003','004','005','006','007','008','009'
          ]);
    }
    if (forceTier === 'rare') {
      return choose(cCode === 'UAE'
        ? [
            ...LADDER_NUMBERS,
            '100','200','300','500','700','900','911','707','812','720','101','909',
            '12','23','45','67','89',
            '1212','7070','1122','7788','1234',
            '12345','77000','70707'
          ]
        : LADDER_NUMBERS);
    }

    const roll = crypto.randomInt(1000);
    const jackpotCutoff = Math.min(15, (isIntl ? 1 : 3) + Math.floor(luckBonus * 0.05));
    if (roll < jackpotCutoff) {
      return choose(cCode === 'UAE' ? ['1','7','5','9','2','8','77','777'] : ['777','001','007']);
    }
    const epicCutoff = Math.min(35, (isIntl ? 5 : 12) + Math.floor(luckBonus * 0.15));
    if (roll < epicCutoff) {
      const epicPool = cCode === 'UAE'
        ? [
            '111','222','333','444','555','666','777','888','999',
            '11','22','55','77','88','99','10','20','50','70','71','63',
            '1971','2020','7007','1000','7000','7777','10000','77777',
            '2','3','5','7','8','9'
          ]
        : [
            '111','222','333','444','555','666','888','999',
            '100','200','300','400','500','600','700','800','900',
            '002','003','004','005','006','007','008','009'
          ];
      return choose(epicPool);
    }
    const ladderCutoff = Math.min(70, (isIntl ? 16 : 30) + Math.floor(luckBonus * 0.3));
    if (roll < ladderCutoff) {
      const rarePool = cCode === 'UAE'
        ? [
            ...LADDER_NUMBERS,
            '100','200','300','500','700','900','911','707','812','720','101','909',
            '12','23','45','67','89',
            '1212','7070','1122','7788','1234',
            '12345','77000','70707'
          ]
        : LADDER_NUMBERS;
      return choose(rarePool);
    }
    return cCode === 'UAE' ? pickOrdinaryUaeNumber() : cCode === 'JPN' ? String(1000 + crypto.randomInt(9000)) : pickOrdinary3DigitNumber();
  }

  function generateLuckyLetters() {
    const uaeDoubleElites = ['AAA','DDD','BBB','CCC','OOO','III','PPP','XXX','ZZZ'];
    if (forceTier === 'ultra_special') {
      const specialPool = cCode === 'JPN' ? ['JDM','GTR'] : ULTRA_SPECIAL_RUS_SERIES;
      const s = choose(specialPool);
      return [s[0], s[1], s[2]];
    }
    if (forceTier === 'legendary') {
      const topElites = cCode === 'RUS'
        ? ['ААА','АМР','ВОР','ЕКХ','ООО','ССС','МММ','СКР']
        : (cCode === 'UAE' ? uaeDoubleElites : elitePool.slice(0, 8));
      const elite = choose(topElites);
      return [elite[0], elite[1], elite[2]];
    }
    if (forceTier === 'epic') {
      if (crypto.randomInt(100) < 60) {
        const elite = choose(cCode === 'UAE' ? uaeDoubleElites : elitePool);
        return [elite[0], elite[1], elite[2]];
      }
      const l = choose(letterPool);
      return [l, l, l];
    }
    if (forceTier === 'rare') {
      const l1 = choose(letterPool);
      let l2 = choose(letterPool);
      if (l2 === l1) l2 = letterPool[(letterPool.indexOf(l1) + 1) % letterPool.length];
      return [l1, l2, l1];
    }

    const roll = crypto.randomInt(1000);
    const eliteCutoff = Math.min(15, (isIntl ? 2 : 4) + Math.floor(luckBonus * 0.05));
    if (roll < eliteCutoff) {
      const elite = choose(cCode === 'UAE' ? uaeDoubleElites : elitePool);
      return [elite[0], elite[1], elite[2]];
    }
    const tripleCutoff = Math.min(35, (isIntl ? 6 : 12) + Math.floor(luckBonus * 0.15));
    if (roll < tripleCutoff) {
      const l = choose(letterPool);
      return [l, l, l];
    }
    const mirrorCutoff = Math.min(70, (isIntl ? 20 : 30) + Math.floor(luckBonus * 0.3));
    if (roll < mirrorCutoff) {
      const l1 = choose(letterPool);
      let l2 = choose(letterPool);
      if (l2 === l1) l2 = letterPool[(letterPool.indexOf(l1) + 1) % letterPool.length];
      return [l1, l2, l1];
    }
    for (let attempt = 0; attempt < 30; attempt++) {
      const a = choose(letterPool), b = choose(letterPool), d = choose(letterPool);
      if (a === b && b === d) continue;
      if (elitePool.includes(a + b + d)) continue;
      if (cCode === 'RUS' && ULTRA_SPECIAL_RUS_SERIES.includes(a + b + d)) continue;
      return [a, b, d];
    }
    return [letterPool[0], letterPool[1], letterPool[2]];
  }

  return {
    mode,
    country: cfg.code,
    num: mode === 'letters' ? null : generateLuckyNumber(),
    letters: mode === 'numbers' ? null : generateLuckyLetters()
  };
}
function draftOf(a){return a?.draft&&typeof a.draft==='object'?a.draft:{num:'---',letters:['-','-','-'],reg:'777',country:'RUS',hasNumbers:false,hasLetters:false,changedNumbers:false,changedLetters:false,pityCounter:0};}
function formatPlateText(l1, l2, l3, num, reg, country = 'RUS') {
  const cCode = (country && COUNTRIES[String(country).toUpperCase()]) ? String(country).toUpperCase() : 'RUS';
  const r = String(reg || COUNTRIES[cCode].defaultReg).toUpperCase();
  const letters = `${l1 || '-'}${l2 || '-'}${l3 || '-'}`;
  const digits = num || '---';
  if (cCode === 'KZ') return `${digits} ${letters} | ${r} KZ`;
  if (cCode === 'USA') return `${letters} ${digits} | ${r} USA`;
  if (cCode === 'JPN') return `${letters} ${digits} | ${r} JPN`;
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
function sanitizedProfile(a){return {nickname:a.nickname, balance:a.balance, inventory:a.inventory||[], myCars:a.myCars||[], playerLevel:a.playerLevel||1, playerExp:a.playerExp||0, ...(typeof a.playerTitle==='string'&&a.playerTitle?{playerTitle:a.playerTitle.slice(0,30)}:{}), ...(Number.isSafeInteger(a.levelRewardsThrough)&&a.levelRewardsThrough>=1&&a.levelRewardsThrough<=777?{levelRewardsThrough:a.levelRewardsThrough}:{}), ...(a.activityRewards&&typeof a.activityRewards==='object'?{activityRewards:{repairs:Math.max(0,Math.min(9999,Math.floor(Number(a.activityRewards.repairs)||0))),extraAchievements:Array.isArray(a.activityRewards.extraAchievements)?a.activityRewards.extraAchievements.filter(x=>typeof x==='string'&&x.length<=40).slice(0,100):[]}}:{}), updatedAt:a.updatedAt||0, draft:a.draft||null, avatarData:typeof a.avatarData==='string'?a.avatarData:''};}
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
    const numRegex = country === 'UAE' ? /^\d{1,5}$/ : country === 'JPN' ? /^\d{3,4}$/ : /^\d{3}$/;
    if(!roll||!['both','numbers','letters'].includes(roll.mode)
      || (roll.num!==null && !numRegex.test(roll.num))
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
    const claimNumRegex = country === 'UAE' ? /^[0-9]{1,5}$/ : country === 'JPN' ? /^[0-9]{3,4}$/ : /^[0-9]{3}$/;
    if(!claimNumRegex.test(draft.num)||!Array.isArray(draft.letters)||draft.letters.length!==3||draft.letters.some(l=>!cfg.letters.includes(l)))throw Error('Неверный номер');
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
      if (car.saleProtected || car.plate?.favorite) throw Error('Сначала снимите защиту с автомобиля и его номера');
      accounts[key] = {...a, myCars: cars.filter((_, i) => i !== pos), updatedAt: now};
      market[lotId] = {lotId, type: 'car', sellerKey: key, sellerName: a.nickname, car, price, createdAt: now};
    } else {
      if (!Array.isArray(a.inventory)) throw Error('Инвентарь недоступен');
      const pos=a.inventory.findIndex(p=>p.id===data.plateId);
      if(pos<0) throw Error('Этот номер отсутствует в серверном инвентаре');
      const lotId=data.lotId;
      if (!/^[a-zA-Z0-9_-]{12,80}$/.test(lotId) || market[lotId]) throw Error('Неверный идентификатор лота');
      const plate=a.inventory[pos];
      if (plate.favorite) throw Error('Сначала снимите защиту с номера');
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
module.exports={COOKIE,TTL,MAX_MONEY,STARTING_BALANCE,COUNTRIES,ULTRA_SPECIAL_RUS_SERIES,getUltraSpecialPlateMeta,keyOf,pinHash,checkPin,migrateLegacyPin,sign,verify,cookie,sessionCookie,safePlate,parsePlate,safeCar,safeCars,money,sanitizedProfile,mutate,makeOnlineTransactionUpdate,freshAccount,priceOfPlate,rarityOfPrice,secureRoll,draftOf,getUaePlateDisplayParts,evaluateUaePlateDetails,inspectUaePlate,formatPlateText};
