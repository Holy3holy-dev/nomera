const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function worker() {
    const events = {};const deleted=[];const shell=new Response('offline release');
    let assets;
    const context={URL,Set,Response,
        self:{registration:{scope:'https://example.test/nomera/'},clients:{claim:()=>Promise.resolve()},addEventListener:(name,fn)=>events[name]=fn},
        caches:{keys:async()=>['unrelated-app','nomera-cache-old'],delete:async key=>deleted.push(key),
            open:async()=>({addAll:async list=>assets=list,match:async()=>shell})},
        fetch:async()=>{throw Error('offline');}
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),context);
    return {events,deleted,shell,context,getAssets:()=>assets};
}
test('worker caches complete local release and deletes only its own old caches', async()=>{
    const w=worker();let promise;
    w.events.install({waitUntil:p=>promise=p});await promise;
    for(const asset of w.getAssets()) {
        const filename=asset.split('?')[0];assert(fs.existsSync(path.join(__dirname,'..',filename)));
    }
    w.events.activate({waitUntil:p=>promise=p});await promise;
    assert.deepEqual(w.deleted,['nomera-cache-old']);
});
test('worker ignores Firebase, other apps and write requests',()=>{
    const w=worker();let intercepted=false;
    for(const request of [{method:'POST',url:'https://example.test/nomera/index.html'},
        {method:'GET',url:'https://example.test/other/index.html'},
        {method:'GET',url:'https://remote.firebasedatabase.app/users.json'}]) {
        w.events.fetch({request,respondWith:()=>intercepted=true});
    }
    assert.equal(intercepted,false);
});
test('offline and HTTP error navigation return cached release',async()=>{
    const w=worker();let response;
    const event={request:{method:'GET',url:'https://example.test/nomera/index.html',mode:'navigate'},respondWith:p=>response=p};
    w.events.fetch(event);assert.equal(await response,w.shell);
    w.context.fetch=async()=>new Response('error',{status:503});w.events.fetch(event);assert.equal(await response,w.shell);
});
test('old asset URLs cannot intercept a newer version',()=>{
    const w=worker();let intercepted=false;
    w.events.fetch({request:{method:'GET',url:'https://example.test/nomera/js/app.js?v=newer'},respondWith:()=>intercepted=true});
    assert.equal(intercepted,false);
});
