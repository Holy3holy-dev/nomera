const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/authors-collection.js'),server=require('../netlify/functions/lib/online-core.cjs');
const plate=(text='А 123 АА | 77 RUS',price=1000,more={})=>({text,price,...more});
const car=(name='Toyota Camry 3.5',more={})=>({name,basePrice:120001,condition:100,...more});
test('duplicate plate sale retains the protected copy and one of every remaining series',()=>{
 const a=plate(),b=plate(),c=plate(undefined,1000,{favorite:true}),d=plate('А 123 АА | 78 RUS'),e=plate('ABC-123 | CA USA'),f=plate('ABC-123 | NY USA');
 const p=C.plan('plates',[a,b,c,d,e,f],{mode:'duplicates'});
 assert.deepEqual(p.items,[a,b]);assert.equal(p.total,2000);assert.equal(C.plan('plates',[c,d,e,f],{mode:'duplicates'}).items.length,0);
});
test('equipped plates count as retained copies; their owned instance and market listings stay protected',()=>{
 const equipped=plate(),spare=plate(),listed=plate('В 001 ОР | 77 RUS',9000,{id:'market-id'});
 assert.deepEqual(C.plan('plates',[spare],{mode:'duplicates',cars:[{plate:equipped}]}).items,[spare]);
 assert.equal(C.plan('plates',[equipped,listed],{mode:'all',cars:[{plate:equipped}],listings:[{plateId:'market-id'}]}).items.length,0);
});
test('automatic garage sales preserve tuned, plated, active, race and protected cars',()=>{
 const a=car(),b=car(),c=car('G63',{upgrades:{engine:2}}),d=car('G63'),e=car('G63',{plate:plate()}),f=car('G63',{saleProtected:true}),g=car('Active'),h=car('Active'),i=car('Racer'),j=car('Racer');
 const p=C.plan('cars',[a,b,c,d,e,f,g,h,i,j],{mode:'duplicates',activeCar:g,raceCar:i});
 assert.deepEqual(p.items,[b,d,h,j]);assert.equal(p.total,432000);
});
test('selected sale follows object identity, retains the last car and never includes unselected items',()=>{
 const a=car(),b=car(),c=car('G63');
 assert.deepEqual(C.plan('cars',[c,a,b],{mode:'selected',selected:[b]}).items,[b]);
 assert.equal(C.plan('cars',[b],{mode:'selected',selected:[b]}).items.length,0);
 assert.equal(C.plan('cars',[a,b],{mode:'selected'}).items.length,0);
 assert.equal(C.plan('cars',[a,b],{mode:'all',running:true}).items.length,0);
});
test('sale proceeds preserve template fallback and existing car commission',()=>{
 assert.equal(C.proceeds('cars',{name:'Legacy'},[{name:'Legacy',price:50000}]),45000);
 assert.equal(C.proceeds('cars',car()),108000);
 assert.equal(C.proceeds('plates',plate()),1000);
 assert.equal(C.plan('plates',[plate('A',NaN)],{mode:'all'}).items.length,0);
});
test('legacy exterior parts and signed performance tuning are retained by automatic duplicate sale',()=>{
 const list=[car(),car(undefined,{spoiler:'gtr'}),car(undefined,{proTuning:{gripDriftBias:-2}}),car(undefined,{upgrades:{gearRatioBias:-1}}),car(undefined,{tuningStage:2})];
 assert.equal(C.plan('cars',list,{mode:'duplicates'}).items.length,1);
 assert.equal(C.plan('cars',list,{mode:'duplicates'}).items[0],list[0]);
});
test('server round trips preserve strict protection flags and reject protected listings',()=>{
 assert.equal(server.safePlate(plate(undefined,1000,{favorite:true}),'p').favorite,true);
 assert.equal(server.safePlate(plate(undefined,1000,{favorite:'true'}),'p').favorite,undefined);
 const p=server.safePlate(plate(undefined,1000,{favorite:true}),'plate-id');
 const a=server.safeCar(car(undefined,{saleProtected:true,plate:p}));
 assert.equal(a.saleProtected,true);assert.equal(a.plate.favorite,true);
 let state={accounts:{test:{nickname:'Test',balance:10000,inventory:[p],myCars:[a,car('Reserve')]}},market:{},chat:{}};
 assert.throws(()=>server.mutate(state,'sell','test',{plateId:p.id,price:1000,lotId:'lot_protected_1234'}),/защит/);
 assert.throws(()=>server.mutate(state,'sell','test',{type:'car',carIndex:0,price:10000,lotId:'lot_protected_1234'}),/защит/);
 state=server.mutate(state,'syncGarage','test',{myCars:state.accounts.test.myCars});
 assert.equal(state.accounts.test.myCars[0].saleProtected,true);assert.equal(state.accounts.test.myCars[0].plate.favorite,true);
});
test('duplicate planning handles a large inventory without merging countries or mutating it',()=>{
 const list=Array.from({length:1200},(_,i)=>plate(`А ${String(i%120).padStart(3,'0')} АА | 77 RUS`,100));
 const p=C.plan('plates',list,{mode:'duplicates'});assert.equal(p.items.length,1080);assert.equal(list.length,1200);assert.equal(p.total,108000);
});
