const {test}=require('node:test'),assert=require('node:assert/strict'),{describe}=require('../js/authors-plate-passport.js');
const base={country:'RUS',letters:['А','М','Р'],digits:'777',region:'777',rarity:'Легендарный',price:1700000,eliteSeries:['АМР']};
test('passport explains the actual series, country, digits and game value',()=>{
 const p=describe(base);assert.equal(p.country,'Россия');assert.match(p.region,/Москва/);assert.equal(p.features.length,4);assert.match(p.features[0].label,/АМР/);assert.match(p.features[1].body,/статусная/);assert.match(p.title,/777/);assert.match(p.valuation,/1\s700\s000/);assert.match(p.note,/игровая/);
});
test('patterns distinguish triplets, small digits, sequences and mirrors',()=>{
 for(const [digits,title]of [['111','Триплет'],['001','Первый'],['007','Агентская'],['009','Малая'],['100','сотня'],['123','Лесенка'],['987','Лесенка'],['010','Зеркало'],['707','Зеркало'],['472','Регистрационная']])assert.match(describe({...base,digits}).title,new RegExp(title),digits);
});
test('country-specific metadata and unknown region codes remain honest',()=>{
 for(const[country,region,name]of [['KZ','02','Алматы'],['USA','NY','Нью-Йорк'],['JPN','TKY','Токио']]){const p=describe({...base,country,region,letters:['V','I','P']});assert.match(p.region,new RegExp(name));assert.notEqual(p.format,describe(base).format);}
 assert.equal(describe({...base,region:'999'}).region,'Регион 999');
});
test('plain combinations have no invented rarity features or official privileges',()=>{
 const p=describe({...base,letters:['A','B','C'],digits:'472',eliteSeries:[]});assert.equal(p.features.length,2);assert.match(p.features[0].body,/нет/);assert.match(p.features[1].body,/нет/);assert.match(p.note,/не даёт официальных привилегий/);
});
test('letter symmetry, special series and partial board are handled',()=>{
 assert(describe({...base,letters:['A','A','A']}).features.some(f=>/Три одинаковые/.test(f.label)));
 assert(describe({...base,letters:['A','B','A']}).features.some(f=>/Зеркальная/.test(f.label)));
 assert(describe({...base,letters:['A','A','B']}).features.some(f=>/Парные/.test(f.label)));
 const p=describe({...base,special:{title:'Архив',desc:'Описание архива'}});assert.equal(p.title,'Архив');assert.equal(p.features[0].body,'Описание архива');
 for(const patch of [{digits:'---'},{letters:['-','A','A']},{country:'UAE'},{letters:[]}])assert.equal(describe({...base,...patch}),null);
});
