/* Collection planning is pure; app.js remains the owner of persistence and money. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraCollection=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const normalize=s=>String(s||'').replace(/\s+/g,'').toLocaleUpperCase('ru');
 const key=(kind,item)=>normalize(kind==='cars'?item?.name:item?.text);
 const protectedItem=(kind,item)=>Boolean(item&&(kind==='plates'?item.favorite:item.saleProtected));
 const attached=car=>car?.plate||car?.attachedPlate;
 const same=(a,b)=>a===b||Boolean(a&&b&&['_openingId','id'].some(k=>a[k]&&b[k]&&a[k]===b[k]));
 const stockValue=v=>[null,undefined,false,0,'','none','stock','classic','static','solid'].includes(v);
 const customized=car=>Number(car?.tuningStage)>0||Object.values(car?.upgrades||{}).some(v=>Number(v)!==0&&Number.isFinite(Number(v)))||Object.values(car?.styling||{}).some(v=>!stockValue(v))||['spoiler','vinyl','wheels','bodykit','neon','CustomPaintFinish','customWheelColor'].some(k=>!stockValue(car?.[k]))||Object.values(car?.proTuning||{}).some(v=>Number(v)!==0&&Number.isFinite(Number(v)));
 const carValue=(car,templates=[])=>{let n=Number(car?.basePrice);if(!Number.isFinite(n)||n<=0)n=Number(templates.find(t=>t.name===car?.name)?.price);return Math.max(10000,Math.floor(Number.isFinite(n)&&n>0?n:80000));};
 const proceeds=(kind,item,templates)=>kind==='cars'?Math.floor(carValue(item,templates)*.9):Math.max(0,Math.floor(Number(item?.price)||0));
 function reserved(kind,item,options={}){
  if(protectedItem(kind,item))return true;
  if(kind==='cars')return Boolean(options.running)||item===options.activeCar||item===options.raceCar;
  return (options.cars||[]).some(c=>same(attached(c),item))||(options.listings||[]).some(l=>same(l.plate||l,item)||(!l.plate?.id&&!l.plateId&&normalize(l.plateText)===key(kind,item))||l.plateId&&l.plateId===item.id);
 }
 function groups(kind,items,options={}){
  const result=new Map();items.forEach((item,index)=>{const k=key(kind,item);if(!item||!k)return;if(!result.has(k))result.set(k,[]);result.get(k).push({item,index});});return result;
 }
 function duplicateExtras(kind,items,options={}){
  const result=new Set();
  for(const [k,rows]of groups(kind,items,options)){
   const external=kind==='plates'&&(options.cars||[]).some(c=>key('plates',attached(c))===k&&!rows.some(r=>same(r.item,attached(c))));
   const priority=item=>Number(reserved(kind,item,options))*1000000+Number(kind==='cars'&&Boolean(attached(item)))*100000+Number(kind==='cars'&&customized(item))*10000+(kind==='cars'?Number(item.condition??100):proceeds(kind,item)/1e9);
   const ranked=rows.slice().sort((a,b)=>priority(b.item)-priority(a.item)||a.index-b.index);
   for(const {item}of ranked.slice(external?0:1))if(!reserved(kind,item,options)&&!(kind==='cars'&&(attached(item)||customized(item))))result.add(item);
  }
  return result;
 }
 function plan(kind,items,options={}){
  const mode=options.mode||'selected',selection=options.selected?new Set(options.selected):null;
  if(mode==='selected'&&!selection)return {items:[],total:0};
  const extras=mode==='duplicates'?duplicateExtras(kind,items,options):null;
  const sold=[];let total=0;
  for(const item of items){
   if(!item||reserved(kind,item,options)||selection&&!selection.has(item)||extras&&!extras.has(item))continue;
   if(kind==='plates'&&(!Number.isFinite(Number(item.price))||Number(item.price)<0))continue;
   if(kind==='cars'&&sold.length>=items.length-1)continue;
   sold.push(item);total+=proceeds(kind,item,options.templates);
  }
  return {items:sold,total};
 }
 const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>Number(n||0).toLocaleString('ru-RU')+' ₽';
 const selection={plates:new Set(),cars:new Set()},state={cars:{query:'',filter:'all',sort:'original'}},contexts={};
 const snapshot=kind=>root.NomeraCollectionBridge?.snapshot(kind);
 function controls(kind,host,before){
  if(!host||root.document.getElementById('ae-library-'+kind))return;
  const panel=root.document.createElement('section');panel.id='ae-library-'+kind;panel.className='ae-library-controls';
  panel.innerHTML=`${kind==='cars'?'<label class="ae-library-search"><span>Найти автомобиль или номер</span><input type="search" aria-label="Поиск в гараже" placeholder="Марка, модель, номер"></label>':''}<div class="ae-library-filters" role="group" aria-label="Фильтры ${kind==='cars'?'гаража':'номеров'}">${(kind==='cars'?[['all','Все'],['protected','Защищено'],['duplicates','Повторы'],['tuned','Тюнинг'],['plated','С номером']]:[['all','Все'],['fav','Защищено'],['duplicates','Повторы'],['equipped','На авто'],['market','На рынке']]).map(([v,t])=>`<button type="button" class="ae-library-filter" data-vault-filter="${v}" aria-pressed="${v==='all'}">${t}</button>`).join('')}</div>${kind==='cars'?'<select class="ae-library-sort" aria-label="Сортировка гаража"><option value="original">Порядок в гараже</option><option value="price">Сначала дорогие</option><option value="condition">Лучшее состояние</option><option value="name">По названию</option></select>':''}<div class="ae-library-selection"><span class="ae-library-count" role="status"></span><div><button type="button" data-vault-select-dups>Выделить повторы</button><button type="button" data-vault-clear>Снять выбор</button></div><button type="button" class="ae-library-sell" data-vault-sell-selected disabled>Продать выбранные</button><button type="button" class="ae-library-sell-dups" data-vault-sell-dups>Продать дубликаты</button></div><p class="ae-library-hint">${kind==='cars'?'Автопродажа сохраняет одну машину каждой модели, тюнинг, установленные номера и выбранное авто.':'Защита хранится в избранном. Автопродажа сохраняет один экземпляр каждого номера.'}</p>`;
  if(before)host.insertBefore(panel,before);else host.prepend(panel);
  panel.addEventListener('click',event=>{
   const b=event.target.closest('button');if(!b)return;
   if(b.dataset.vaultFilter){if(kind==='plates')root.setCollectionQuickCategory(b.dataset.vaultFilter);else{state.cars.filter=b.dataset.vaultFilter;drawCars();}}
   if(b.hasAttribute('data-vault-select-dups')){const s=snapshot(kind);if(s)for(const item of plan(kind,s.items,{...s,mode:'duplicates'}).items)selection[kind].add(item);refresh(kind);}
   if(b.hasAttribute('data-vault-clear')){selection[kind].clear();refresh(kind);}
   if(b.hasAttribute('data-vault-sell-selected'))root.sellCollectionItems(kind,'selected',[...selection[kind]]);
   if(b.hasAttribute('data-vault-sell-dups'))root.sellCollectionItems(kind,'duplicates');
  });
  if(kind==='cars'){
   const manage=root.document.createElement('details');manage.className='ae-library-manage';manage.open=Boolean(root.matchMedia?.('(min-width: 701px)').matches);
   manage.innerHTML='<summary>Продажа и сортировка</summary>';panel.append(manage);
   for(const node of [panel.querySelector('select'),panel.querySelector('.ae-library-selection'),panel.querySelector('.ae-library-hint')])manage.append(node);
   panel.querySelector('input').addEventListener('input',e=>{state.cars.query=e.target.value;drawCars();});
   panel.querySelector('select').addEventListener('change',e=>{state.cars.sort=e.target.value;drawCars();});
  }
 }
 function refresh(kind){if(kind==='cars')drawCars();else root.renderInventory?.();}
 function status(kind,shown){
  const panel=root.document.getElementById('ae-library-'+kind),s=snapshot(kind);if(!panel||!s)return;
  for(const item of selection[kind])if(!s.items.includes(item)||reserved(kind,item,s))selection[kind].delete(item);
  const picked=plan(kind,s.items,{...s,mode:'selected',selected:[...selection[kind]]}),dups=plan(kind,s.items,{...s,mode:'duplicates'});
  panel.querySelector('.ae-library-count').textContent=`Показано ${shown} из ${s.items.length} · защищено ${s.items.filter(i=>protectedItem(kind,i)).length}`;
  const sell=panel.querySelector('[data-vault-sell-selected]');sell.disabled=!picked.items.length||Boolean(s.busy);sell.hidden=!picked.items.length;sell.textContent=`Продать выбранные (${picked.items.length}) · +${money(picked.total)}`;
  const dup=panel.querySelector('[data-vault-sell-dups]');dup.disabled=!dups.items.length||Boolean(s.busy);dup.textContent=dups.items.length?`Продать повторы (${dups.items.length}) · +${money(dups.total)}`:'Нет повторов для продажи';
  panel.querySelector('[data-vault-select-dups]').disabled=!dups.items.length||Boolean(s.busy);
  const manage=panel.querySelector('.ae-library-manage>summary');if(manage)manage.textContent=picked.items.length?`Выбрано ${picked.items.length} · действия`:'Продажа и сортировка';
  panel.querySelectorAll('[data-vault-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vaultFilter===(kind==='cars'?state.cars.filter:contexts.plates?.state?.category||'all'))));
 }
 function plateControls(data){
  contexts.plates=data;const doc=root.document,bar=doc?.getElementById('col-actions-bar');if(!bar)return;
  controls('plates',bar.parentElement,bar.nextSibling);
  const panel=doc.getElementById('ae-library-plates');
  if(!doc.getElementById('ae-library-extra-plates')){
   const details=doc.createElement('details');details.id='ae-library-extra-plates';details.className='ae-library-extra';details.innerHTML='<summary>Страна, редкость и другие действия</summary>';
   const filters=bar.querySelector('.col-filters-group');if(filters)details.append(filters);
   const old=doc.querySelector('.col-sidebar-actions');if(old)details.append(old);
   panel.after(details);
   doc.getElementById('inv-search-input').setAttribute('aria-label','Поиск по номеру или региону');
  }
  status('plates',data.entries?.length||0);
 }
 function addChoice(kind,card,item,index){
  const s=snapshot(kind),wrap=root.document.createElement('div');wrap.className='ae-library-card-tools';
  const disabled=reserved(kind,item,s||{}),locked=protectedItem(kind,item);
  wrap.innerHTML=`<label><input type="checkbox" ${selection[kind].has(item)?'checked':''} ${disabled?'disabled':''} aria-label="Выбрать ${escape(item.name||item.text)}"><span>${locked?'Защищено':disabled?'Используется':'Выбрать'}</span></label><button type="button" aria-label="${locked?'Снять защиту':'Защитить'} ${escape(item.name||item.text)}" aria-pressed="${locked}">${locked?'◆ Защищено':'◇ Защитить'}</button>`;
  wrap.addEventListener('click',e=>e.stopPropagation());
  wrap.querySelector('input').addEventListener('change',e=>{if(e.target.checked)selection[kind].add(item);else selection[kind].delete(item);status(kind,kind==='cars'?card.parentElement.children.length:contexts.plates.entries.length);});
  wrap.querySelector('button').addEventListener('click',()=>{root.toggleCollectionProtection(kind,index);root.document.querySelector(kind==='cars'?`[data-vault-car="${index}"] .ae-library-card-tools button`:`[data-vault-index="${index}"] .ae-library-card-tools button`)?.focus({preventScroll:true});});card.prepend(wrap);
 }
 function platesRendered(data){
  plateControls(data);const cards=root.document.getElementById('inventory-list')?.querySelectorAll('[data-vault-index]')||[];
  for(const card of cards){const index=Number(card.dataset.vaultIndex),item=data.items[index];if(item)addChoice('plates',card,item,index);}
 }
 function carsRendered(data){contexts.cars=data;const doc=root.document,host=doc?.getElementById('garage-left-sidebar'),list=doc?.getElementById('garage-car-sidebar-list');if(!host||!list)return;controls('cars',host,list);drawCars();}
 function drawCars(){
  const data=contexts.cars,s=snapshot('cars'),list=root.document?.getElementById('garage-car-sidebar-list');if(!data||!s||!list)return;
  const q=normalize(state.cars.query),f=state.cars.filter,dups=new Set();for(const rows of groups('cars',s.items).values())if(rows.length>1)rows.forEach(r=>dups.add(r.item));
  const rows=s.items.map((item,index)=>({item,index})).filter(({item})=>(!q||normalize(item.name+' '+(attached(item)?.text||'')).includes(q))&&(f==='all'||f==='protected'&&protectedItem('cars',item)||f==='duplicates'&&dups.has(item)||f==='tuned'&&customized(item)||f==='plated'&&attached(item)));
  if(state.cars.sort==='price')rows.sort((a,b)=>proceeds('cars',b.item,s.templates)-proceeds('cars',a.item,s.templates)||a.index-b.index);
  if(state.cars.sort==='condition')rows.sort((a,b)=>Number(b.item.condition??100)-Number(a.item.condition??100)||a.index-b.index);
  if(state.cars.sort==='name')rows.sort((a,b)=>String(a.item.name).localeCompare(String(b.item.name),'ru')||a.index-b.index);
  list.innerHTML=rows.map(({item,index})=>`<article class="ae-library-car ${item===s.activeCar?'active':''}" data-vault-car="${index}"><button type="button" class="garage-side-car-item ${item===s.activeCar?'active':''}" data-vault-open="${index}"><img src="${data.sprite(item.name)}" class="garage-side-car-thumb" alt="" width="110" height="48" loading="lazy"><span class="garage-side-car-meta"><strong class="garage-side-car-name">${escape(item.name)}</strong><span class="garage-side-car-sub">${item===s.activeCar?'На подиуме · ':''}${Math.round(Number(item.condition??100))}% · ${money(proceeds('cars',item,s.templates))}</span><span class="garage-side-car-sub">${escape(attached(item)?.text||item.category||'Без номера')}${customized(item)?' · Тюнинг':''}${dups.has(item)?' · Повтор':''}</span></span></button></article>`).join('')||'<p class="ae-library-empty">Машин по выбранным фильтрам нет.</p>';
  for(const row of rows){const card=list.querySelector(`[data-vault-car="${row.index}"]`);addChoice('cars',card,row.item,row.index);card.querySelector('[data-vault-open]').addEventListener('click',()=>root.selectGarageCarForPodium(row.index));}
  status('cars',rows.length);
 }
 function busy(){for(const kind of ['plates','cars'])status(kind,kind==='plates'?contexts.plates?.entries?.length||0:root.document?.querySelectorAll('[data-vault-car]').length||0);}
 return {key,protectedItem,customized,carValue,proceeds,reserved,duplicateExtras,plan,plateControls,platesRendered,carsRendered,busy};
});
