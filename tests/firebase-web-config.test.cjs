"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const { readPublicConfig, safeLiteral } = require('../netlify/functions/lib/firebase-web-config.cjs');
const configModule = import('../netlify/functions/firebase-web-config.mjs');
const base={
  apiKey:'AIza-user-facing-key',authDomain:'h3h-nomera-server.firebaseapp.com',
  databaseURL:'https://h3h-nomera-server-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:'h3h-nomera-server', appId:'1:123456789:web:aabbcc',messagingSenderId:'123456789'
};
const env={NOMERA_FIREBASE_WEB_CONFIG:JSON.stringify(base),FIREBASE_DATABASE_URL:base.databaseURL};
test('public Firebase config accepts only matching new target',()=>{
  const x=readPublicConfig(env); assert.equal(x.projectId,'h3h-nomera-server');
  assert.equal(x.databaseURL,base.databaseURL);
  assert.throws(()=>readPublicConfig({...env,NOMERA_FIREBASE_WEB_CONFIG:JSON.stringify({...base,projectId:'bazanomerann'})}),/Wrong Firebase/);
  assert.throws(()=>readPublicConfig({...env,FIREBASE_DATABASE_URL:'https://bazanomerann-default-rtdb.europe-west1.firebasedatabase.app'}),/expected|Expected/i);
});
test('misconfigured server does not fall back to old Firebase', async()=>{
  const old=process.env.NOMERA_FIREBASE_WEB_CONFIG;
  delete process.env.NOMERA_FIREBASE_WEB_CONFIG;
  try {const {default: handler}=await configModule; const res=await handler(new Request('https://nomera1.netlify.app/.netlify/functions/firebase-web-config'));assert.equal(res.status,200);const body=await res.text(); assert.match(body,/CONFIG_ERROR/);assert.doesNotMatch(body,/bazanomerann/);}
  finally {if(old===undefined)delete process.env.NOMERA_FIREBASE_WEB_CONFIG;else process.env.NOMERA_FIREBASE_WEB_CONFIG=old;}
});
test('public script contains no secret and escapes injection',()=>{
  assert.throws(()=>readPublicConfig({...env,NOMERA_FIREBASE_WEB_CONFIG:JSON.stringify({...base,private_key:'secret'})}),/service-account/);
  assert.equal(safeLiteral({x:'</script><script>alert(1)</script>'}).includes('<'),false);
});
