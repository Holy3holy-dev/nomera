const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', '..');
function createApp({saved = null, denyStorage = false, cloud = null} = {}) {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
    const elements = new Map();
    const ctx = new Proxy({}, {get: (_,key) => key === 'measureText' ? () => ({width:20}) : () => {}});
    function element(id) {
        if (!ids.has(id)) return null;
        if (!elements.has(id)) {
            const span = { innerText:'', textContent:'' };
            const classes = new Set();
            elements.set(id, {
                id, style:{}, value:'', innerHTML:'', innerText:'', textContent:'', width:400,height:620,
                classList:{
                    add(...c){ c.forEach(x => classes.add(x)); },
                    remove(...c){ c.forEach(x => classes.delete(x)); },
                    toggle(c, force){
                        const next = force === undefined ? !classes.has(c) : Boolean(force);
                        if (next) classes.add(c); else classes.delete(c);
                        return next;
                    },
                    contains(c){ return classes.has(c); }
                },
                setAttribute(){}, dataset:{},
                getContext:()=>ctx, addEventListener(){}, setPointerCapture(){},
                appendChild(){}, querySelectorAll:()=>[], querySelector:(s)=>s==='.char-span'?span:null,
                getBoundingClientRect:()=>({width:400,height:620})
            });
        }
        return elements.get(id);
    }
    const data = new Map(saved ? [['nomera_player_account',JSON.stringify(saved)]] : []);
    const storage = {
        getItem(k){if(denyStorage)throw Error();return data.get(k)??null;},
        setItem(k,v){if(denyStorage)throw Error();data.set(k,v);},
        removeItem(k){if(denyStorage)throw Error();data.delete(k);}
    };
    const events = new Map();
    const context = {
        console, URL, Math, Date, JSON, Number, String, Object, Array, Promise,
        document:{getElementById:element, querySelector:()=>({offsetWidth:400,offsetHeight:200}), querySelectorAll:()=>[], addEventListener:(name,fn)=>events.set('document:'+name,fn),
            createElement:(tag)=>({ getContext:()=>ctx, style:{}, classList:{add(){},remove(){},toggle(){}}, setAttribute(){}, appendChild(){}, width:44, height:68 }),body:{classList:{add(){},remove(){}}},hidden:false},
        localStorage:storage, sessionStorage:storage, innerWidth:390,innerHeight:844,
        addEventListener:(name,fn)=>events.set(name,fn),
        performance:{now:()=>1000},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
        setTimeout(){},clearTimeout(){},setInterval:()=>1,clearInterval(){},
        alert(){},confirm:()=>true,location:{reload(){}},navigator:{},
        AudioContext:class {createOscillator(){return {type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}};} createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}}
    };
    context.window=context;context.globalThis=context;
    if (cloud) {
        context.NOMERA_FIREBASE_WEB_CONFIG = {projectId:'h3h-nomera-server',apiKey:'test-public-api-key',appId:'test-public-firebase-app',databaseURL:'https://h3h-nomera-server-default-rtdb.europe-west1.firebasedatabase.app'};
        const database = () => cloud; database.ServerValue = {TIMESTAMP:{'.sv':'timestamp'}};
        context.firebase={initializeApp(){},database};
    }
    vm.createContext(context);
    for (const file of ['security.js','storage.js','race-records.js','race-economy.js','audio.js','app.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),context,{filename:file});
    return {context, elements, data, events, run:code=>vm.runInContext(code,context)};
}

module.exports = {createApp};
