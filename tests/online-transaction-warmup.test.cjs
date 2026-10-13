const {test}=require('node:test');
const assert=require('node:assert/strict');
const c=require('../netlify/functions/lib/online-core.cjs');
function state(){return {accounts:{racer:{nickname:'Racer',balance:50000,inventory:[]}},market:{},chat:{}};}
const data={roll:{mode:'both',num:'123',letters:['А','В','Е']},region:'77'};
test('online first null transaction callback uses preloaded account without false account not found',()=>{
  const loaded=state();
  const u=c.makeOnlineTransactionUpdate(loaded,'roll','racer',data,1000);
  const proposed=u.update(null);
  assert.equal(proposed.accounts.racer.balance,49100);
  assert.equal(u.getReason(),'');
  assert.equal(loaded.accounts.racer.balance,50000);
});
test('Firebase retry applies exactly one spin to authoritative state, never to initial proposal',()=>{
  const u=c.makeOnlineTransactionUpdate(state(),'roll','racer',data,1000);
  u.update(null); // SDK first uses its empty local cache; server rejects hash and retries.
  const remote=state();remote.accounts.racer.balance=45000;
  const retried=u.update(remote);
  assert.equal(retried.accounts.racer.balance,44100);
  assert.equal(remote.accounts.racer.balance,45000);
  assert.equal(u.getReason(),'');
});
test('subsequent null callback after retry does not recreate deleted accounts',()=>{
  const u=c.makeOnlineTransactionUpdate(state(),'roll','racer',data,1000);
  u.update(null);
  assert.equal(u.update(null),undefined);
  assert.match(u.getReason(),/Аккаунт не найден/);
});
test('insufficient funds never changes remote wallet or creates a number',()=>{
  const current=state();current.accounts.racer.balance=100;
  const u=c.makeOnlineTransactionUpdate(current,'roll','racer',data,1000);
  assert.equal(u.update(null),undefined);
  assert.equal(current.accounts.racer.balance,100);
  assert.match(u.getReason(),/Недостаточно/);
});

test('chat transaction also succeeds on initial null without account-not-found',()=>{
  const u=c.makeOnlineTransactionUpdate(state(),'chat','racer',{text:'Привет',messageId:'msg_123'},10000);
  const written=u.update(null);
  assert.equal(written.chat.msg_123.text,'Привет');
  assert.equal(written.chat.msg_123.senderName,'Racer');
  assert.equal(u.getReason(),'');
});
