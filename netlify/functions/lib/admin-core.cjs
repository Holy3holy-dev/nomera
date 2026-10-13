'use strict';
const crypto = require('node:crypto');
const COOKIE = 'nomera_admin';
const SESSION_TTL = 2 * 60 * 60 * 1000;
function hashPassword(password, salt = crypto.randomBytes(24).toString('hex')) {
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, formatted) {
  if (typeof password !== 'string' || password.length > 256 || typeof formatted !== 'string') return false;
  const m = /^scrypt\$([0-9a-f]{48})\$([0-9a-f]{128})$/.exec(formatted);
  if (!m) return false;
  const expected = Buffer.from(m[2], 'hex');
  const actual = crypto.scryptSync(password, m[1], expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
function token(secret, expiry = Date.now()+SESSION_TTL) {
  const payload = Buffer.from(JSON.stringify({role:'admin',exp:expiry})).toString('base64url');
  const mac = crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  return payload+'.'+mac;
}
function verifyToken(value, secret, now=Date.now()) {
  if (!secret || typeof value!=='string' || value.length>2048) return false;
  const [payload,mac,extra] = value.split('.');
  if (!payload||!mac||extra!==undefined) return false;
  const correct=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  if (Buffer.byteLength(mac)!==Buffer.byteLength(correct) || !crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(correct))) return false;
  try { const p=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')); return p.role==='admin' && Number.isSafeInteger(p.exp) && p.exp>now && p.exp<=now+SESSION_TTL; }
  catch (_) { return false; }
}
function getCookie(event) {
  const raw=event.headers?.cookie || event.headers?.Cookie || '';
  return raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || '';
}
function sessionCookie(value, maxAge=7200) {
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/.netlify/functions/admin; Max-Age=${maxAge}`;
}
function keyFromPlayer(value) {
  const safe = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[\p{L}\p{N}_\- ]{2,40}$/u.test(safe)) throw new Error('Некорректный ключ игрока');
  return safe;
}
function validMoney(amount, canNegative=false) {
  if (!Number.isSafeInteger(amount) || amount > 1000000000000 || amount < (canNegative ? -1000000000000 : 0)) throw Error('Некорректная сумма');
  return amount;
}
function json(status, body, cookies=null) {
  return {statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookies?{'Set-Cookie':cookies}:{})},body:JSON.stringify(body)};
}
module.exports={hashPassword,verifyPassword,token,verifyToken,getCookie,sessionCookie,keyFromPlayer,validMoney,json,COOKIE,SESSION_TTL};
