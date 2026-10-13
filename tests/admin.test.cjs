const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('../netlify/functions/lib/admin-core.cjs');
const admin = import('../netlify/functions/admin.mjs');
test('admin password hashing verifies only exact password and does not store plaintext',()=>{
  const h=c.hashPassword('demo-Password_42');
  assert(!h.includes('demo-Password_42'));
  assert(c.verifyPassword('demo-Password_42',h));
  assert(!c.verifyPassword('demo-PASSWORD_42',h));
  assert(!c.verifyPassword('wrong',h));
  assert(!c.verifyPassword('anything','badvalue'));
});
test('server session rejects forgery, expiry and role tampering',()=>{
  const secret='a'.repeat(45);
  const now=Date.now();
  const cookie=c.token(secret,now+10000);
  assert(c.verifyToken(cookie,secret,now));
  assert(!c.verifyToken(cookie,'b'.repeat(45),now));
  assert(!c.verifyToken(cookie+'x',secret,now));
  assert(!c.verifyToken(c.token(secret,now-1000),secret,now));
  assert(!c.verifyToken(c.token(secret,now+5*60*60*1000),secret,now));
  assert(c.sessionCookie(cookie).includes('HttpOnly; Secure; SameSite=Strict'));
});
test('admin input validates database path and integer amount',()=>{
  assert.equal(c.keyFromPlayer('  Test_Nick '),'test_nick');
  assert.throws(()=>c.keyFromPlayer('../users'),/ключ/);
  assert.throws(()=>c.keyFromPlayer('bad#key'),/ключ/);
  assert.throws(()=>c.keyFromPlayer('  '),/ключ/);
  assert.equal(c.validMoney(100),100);
  assert.throws(()=>c.validMoney(1.5),/сумма/);
  assert.throws(()=>c.validMoney(-1),/сумма/);
});
test('unauthenticated requests never load Firebase and reject cross-site POST',async()=>{
  const hash=c.hashPassword('demo-Password_42');
  const old={hash:process.env.NOMERA_ADMIN_PASSWORD_HASH,secret:process.env.NOMERA_ADMIN_SESSION_SECRET};
  process.env.NOMERA_ADMIN_PASSWORD_HASH=hash; process.env.NOMERA_ADMIN_SESSION_SECRET='j'.repeat(48);
  try {
    const base={httpMethod:'POST',headers:{'content-type':'application/json',host:'nomera1.netlify.app',origin:'https://nomera1.netlify.app'},body:JSON.stringify({action:'addBalance',key:'h3h',amount:100000000})};
    const { default: handler } = await admin;
    const makeRequest = x => new Request('https://nomera1.netlify.app/.netlify/functions/admin?action=addBalance',{method:x.httpMethod,headers:x.headers,body:x.body});
    const res=await handler(makeRequest(base));assert.equal(res.status,401);
    const cross=await handler(makeRequest({...base,headers:{...base.headers,origin:'https://evil.example'}}));assert.equal(cross.status,403);
    const req=await handler(new Request('https://nomera1.netlify.app/.netlify/functions/admin?action=session'));
    assert.equal(req.status,401);
  } finally {if(old.hash===undefined)delete process.env.NOMERA_ADMIN_PASSWORD_HASH;else process.env.NOMERA_ADMIN_PASSWORD_HASH=old.hash;
    if(old.secret===undefined)delete process.env.NOMERA_ADMIN_SESSION_SECRET;else process.env.NOMERA_ADMIN_SESSION_SECRET=old.secret;}
});
