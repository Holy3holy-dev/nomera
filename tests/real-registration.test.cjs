const test=require('node:test'),assert=require('node:assert/strict'),core=require('../netlify/functions/lib/online-core.cjs'),{createApp}=require('./helpers/create-app.cjs'),Registration=require('../js/authors-registration'),Prestige=require('../js/authors-prestige');
test('Japan preserves the whole four-digit serial through online draft, claim, market and purchase',()=>{
 let s={accounts:{racer:{nickname:'Racer',balance:100000,inventory:[]},buyer:{nickname:'Buyer',balance:100000,inventory:[]}},market:{}};
 for(const num of ['1234','7777','1001']){
  s=core.mutate(s,'roll','racer',{roll:{mode:'both',country:'JPN',num,letters:['A','B','C']},country:'JPN',region:'TKY'});
  assert.equal(s.accounts.racer.draft.num,num);
  s=core.mutate(s,'claim','racer',{plateId:'plate_jpn_'+num});const plate=s.accounts.racer.inventory[0];assert.equal(plate.text,'ABC '+num+' | TKY JPN');assert.equal(core.parsePlate(plate.text).digits,num);assert.equal(plate.price,core.priceOfPlate(plate.text));
  s=core.mutate(s,'sell','racer',{plateId:plate.id,lotId:'lot_japan_'+num,price:1000});s=core.mutate(s,'buy','buyer',{lotId:'lot_japan_'+num});assert.equal(s.accounts.buyer.inventory[0].text,plate.text);
 }
});
test('Whole-series valuation and special detection agree between client and server, without suffix exploits',()=>{
 const app=createApp();for(const letters of ['ABC','JDM','GTR','AAA'])for(const num of ['001','007','777','1234','1112','7771','1777','7777','1000','1001','1212','0007']){
 const local=app.run(`getCalculatedPrice('${letters[0]}','${letters[1]}','${letters[2]}','${num}','TKY','JPN')`);if(num.length===4&&!num.startsWith('0'))assert.equal(local,core.priceOfPlate(...letters,num,'TKY','JPN'),letters+' '+num);
 if(num.length===4)assert.equal(core.getUltraSpecialPlateMeta(...letters,num,'TKY','JPN'),null);
 }
 assert.equal(core.priceOfPlate('ABC 1112 | TKY JPN'),core.priceOfPlate('ABC 4629 | TKY JPN'));assert(core.priceOfPlate('ABC 7777 | TKY JPN')>core.priceOfPlate('ABC 1777 | TKY JPN'));
 assert.notEqual(core.priceOfPlate('JDM 1777 | TKY JPN'),core.priceOfPlate('JDM 777 | TKY JPN'));
 assert.equal(core.parsePlate('ABC 1234 | NY USA').digits,'1234');
});
test('Japan ordinary generation and partial spins retain all digits on both paths; legacy short numbers remain valid',()=>{
 const app=createApp();let client=0,server=0;for(let i=0;i<100;i++){const a=app.run("generateLuckyNumberLocal(null,0,'JPN')"),b=core.secureRoll('numbers',0,'JPN').num;assert(/^\d{3,4}$/.test(a)&&/^\d{3,4}$/.test(b));client+=a.length===4;server+=b.length===4;}assert(client>60&&server>60);
 for(const num of ['007','077','777','1234']){const result=app.run(`(()=>{selectPlateCountry('JPN');currentNum='${num}';boardHasNumbers=true;executeCellSpin(['cell-n1','cell-n2','cell-n3'],{'cell-n1':'${num[0]}','cell-n2':'${num[1]}','cell-n3':'${num[2]}'});return {n4:document.getElementById('cell-n4').classList.contains('spinning'),hidden:document.getElementById('cell-n4').classList.contains('uae-cell-hidden'),display:getJpnPlateDisplayParts('A','B','C',currentNum,'TKY').formattedDigits};})()`);assert.equal(result.n4,num.length===4);assert.equal(result.hidden,num.length!==4);assert.equal(result.display.replaceAll(' ',''),Registration.japanDigits(num));}
});
test('Distinct prestige motifs are bounded and reduced motion removes animation without losing identity',()=>{const names=['Обычный','Необычный','Редкий','Супер редкий','Эпический','Легендарный','БЛАТНОЙ'],plans=names.map(n=>Prestige.presentation(n,1000000));assert.equal(new Set(plans.map(p=>p.motif)).size,7);assert(plans.every(p=>p.facets<=8&&p.particles<=12));for(const n of names){assert.equal(Prestige.presentation(n,1,true).duration,0);assert.equal(Prestige.presentation(n,1,true).particles,0);}});
