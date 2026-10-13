"use strict";
const TARGET = 'h3h-nomera-server';
const CONFIG_KEYS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
function normalizeDatabase(url) {
  if (typeof url !== 'string') throw Error('databaseURL missing');
  let parsed;
  try { parsed = new URL(url); } catch (_) { throw Error('Invalid databaseURL'); }
  const host = parsed.hostname.toLowerCase();
  const permitted = /^h3h-nomera-server-default-rtdb(?:\.[a-z0-9-]+)?\.firebasedatabase\.app$/.test(host)
      || host === 'h3h-nomera-server-default-rtdb.firebaseio.com';
  if (parsed.protocol !== 'https:' || !permitted || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw Error('Expected Realtime Database URL for h3h-nomera-server');
  }
  return parsed.origin;
}
function readPublicConfig(env) {
  if (!env.NOMERA_FIREBASE_WEB_CONFIG) throw Error('NOMERA_FIREBASE_WEB_CONFIG not configured');
  let obj;
  try { obj = JSON.parse(env.NOMERA_FIREBASE_WEB_CONFIG); } catch (_) { throw Error('NOMERA_FIREBASE_WEB_CONFIG is not valid JSON'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw Error('Firebase web config must be object');
  if (obj.projectId !== TARGET) throw Error('Wrong Firebase projectId, expected h3h-nomera-server');
  for (const key of ['apiKey','appId']) if (typeof obj[key] !== 'string' || obj[key].length < 10 || obj[key].length > 300) throw Error('Missing Firebase web ' + key);
  if (obj.authDomain !== TARGET + '.firebaseapp.com') throw Error('Wrong Firebase authDomain');
  const db = normalizeDatabase(obj.databaseURL || env.FIREBASE_DATABASE_URL);
  if (env.FIREBASE_DATABASE_URL && normalizeDatabase(env.FIREBASE_DATABASE_URL) !== db) throw Error('Client Firebase URL does not match server Firebase URL');
  const config = {};
  for (const key of CONFIG_KEYS) if (typeof obj[key] === 'string') config[key] = obj[key];
  config.databaseURL = db;
  if (Object.keys(obj).some(k=> /private_key|service.?account|client_email/i.test(k))) throw Error('Do not use a service-account key as web config');
  return config;
}
// Escaping prevents interpretation of values as JS syntax or script markup.
const safeLiteral = obj => JSON.stringify(obj).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
module.exports = { TARGET, readPublicConfig, normalizeDatabase, safeLiteral };
