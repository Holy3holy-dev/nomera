'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { hashPassword } = require('../netlify/functions/lib/admin-core.cjs');
const adminImport=import('../netlify/functions/admin.mjs');
const configImport=import('../netlify/functions/firebase-web-config.mjs');
const host='https://nomera1.netlify.app';

test('modern Netlify runtime uses default Request-to-Response functions',async()=>{
  const [{default:admin},{default:config}]=await Promise.all([adminImport,configImport]);
  const reject=await config(new Request(host+'/.netlify/functions/firebase-web-config',{method:'POST'}));
  assert.equal(reject.status,405);
  const oldHash=process.env.NOMERA_ADMIN_PASSWORD_HASH;
  const oldSecret=process.env.NOMERA_ADMIN_SESSION_SECRET;
  try {
    process.env.NOMERA_ADMIN_PASSWORD_HASH=hashPassword('test-unique-password-2026');
    process.env.NOMERA_ADMIN_SESSION_SECRET='session-secret'.repeat(5);
    const response=await admin(new Request(host+'/.netlify/functions/admin?action=session'));
    assert(response instanceof Response);
    assert.equal(response.status,401);
    assert.equal(response.headers.get('cache-control'),'no-store');
    const denied=await admin(new Request(host+'/.netlify/functions/admin',{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:JSON.stringify({action:'logout'})}));
    assert.equal(denied.status,403);
  } finally {
    if(oldHash===undefined)delete process.env.NOMERA_ADMIN_PASSWORD_HASH;else process.env.NOMERA_ADMIN_PASSWORD_HASH=oldHash;
    if(oldSecret===undefined)delete process.env.NOMERA_ADMIN_SESSION_SECRET;else process.env.NOMERA_ADMIN_SESSION_SECRET=oldSecret;
  }
});

test('modern firebase web config serves public data but never leaks other env secrets',async()=>{
  const {default:config}=await configImport;
  const fields=['NOMERA_FIREBASE_WEB_CONFIG','FIREBASE_DATABASE_URL','FIREBASE_SERVICE_ACCOUNT_JSON'];
  const prev=Object.fromEntries(fields.map(f=>[f,process.env[f]]));
  const web={apiKey:'AIza-public-key',authDomain:'h3h-nomera-server.firebaseapp.com',databaseURL:'https://h3h-nomera-server-default-rtdb.europe-west1.firebasedatabase.app',projectId:'h3h-nomera-server',appId:'1:123456789:web:12345',messagingSenderId:'123456789'};
  try {
    process.env.NOMERA_FIREBASE_WEB_CONFIG=JSON.stringify(web);
    process.env.FIREBASE_DATABASE_URL=web.databaseURL;
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON='SECRET-DO-NOT-SHOW';
    const response=await config(new Request(host+'/.netlify/functions/firebase-web-config'));
    assert.equal(response.status,200);
    const body=await response.text();
    assert.match(body,/NOMERA_FIREBASE_WEB_CONFIG/);
    assert.match(body,/h3h-nomera-server/);
    assert.doesNotMatch(body,/SECRET-DO-NOT-SHOW/);
  } finally {
    for(const key of fields)if(prev[key]===undefined)delete process.env[key];else process.env[key]=prev[key];
  }
});

test('online registration requires an authenticated backend and rejects cross-origin writes',async()=>{
  const {default:online}=await import('../netlify/functions/online.mjs');
  const res=await online(new Request(host+'/.netlify/functions/online',{
    method:'POST',headers:{'content-type':'application/json','origin':'https://evil.example'},
    body:JSON.stringify({action:'register',nickname:'Alice',pin:'strong-123',balance:999999999})
  }));
  assert.equal(res.status,403);
});
