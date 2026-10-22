/* Midnight game sections: preserve original nodes, IDs, callbacks and game state. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const make=(tag,cls,html='')=>{const el=document.createElement(tag);el.className=cls;el.innerHTML=html;return el;};
 const intro=(n,tag,title,desc)=>make('div','ae-intro',`<div><div class="ae-eyebrow">H3H / ${tag}</div><h1>${title}<span class="ae-title-dot">.</span></h1><p>${desc}</p></div><span class="ae-section-number">${n}</span>`);
 const money=n=>(Number(n)||0).toLocaleString('ru-RU')+' ₽';
 const garage=$('#garage'),cases=$('#cases'),market=$('#multiplayer'),race=$('#racegame');
 const boxCases=$('#cases>.section-box'),boxMarket=$('#multiplayer>.section-box'),boxRace=$('#racegame>.section-box');
 cases.prepend(intro('05','РЕДКИЕ НАХОДКИ','Кейсы','Открой свою следующую легенду. Каждый предмет сохраняется сразу.'));
 market.prepend(intro('04','БИРЖА КОЛЛЕКЦИОНЕРОВ','Рынок','Номера с историей. Автомобили с характером.'));
 race.prepend(intro('06','ПОРА НА ТРАССУ','Гонки','Выбери режим, подготовь автомобиль и выйди на старт.'));
 $('#cases .section-title').hidden=true;
 const marketHeader=$('#multiplayer .section-header');
 marketHeader.classList.add('ae-market-server-bar');
 marketHeader.firstElementChild.hidden=true;
 marketHeader.insertAdjacentHTML('afterbegin','<div class="ae-market-local-note"><i></i><span>Учебный рынок · локальные лоты и операции</span></div>');
 $('#multi-firebase-status').hidden=true;
 $('#multi-online-count').hidden=true;
 $('.h3h-firebase-diagnose').hidden=true;
 $('#multiplayer .online-v44-bar').hidden=true;
 const marketFilters=make('details','ae-market-filters','<summary>Фильтры и сортировка <span>＋</span></summary>');
 marketFilters.append($('#market-filter-toolbar .col-filters-group'));
 $('#market-filter-toolbar').append(marketFilters);
 $('#btn-mobile-mkt-filters').hidden=true;
 $('#market-filter-toolbar').classList.remove('mobile-collapsed');
 $('#mkt-search-input').placeholder='Номер, модель или продавец…';
 $('#mkt-search-input').setAttribute('aria-label','Поиск по рынку');
 $('#market-dealership-promo .btn').setAttribute('onclick',"switchTab('garage');switchGarageSubView('shop')");
 const dealerTools=make('div','ae-dealer-tools','<div><span class="ae-eyebrow">H3H / ОФИЦИАЛЬНЫЙ КАТАЛОГ</span><h2>Автосалон<span class="ae-title-dot">.</span></h2><p id="ae-dealer-count">Модели игрового каталога</p></div><div class="ae-dealer-search"><input id="ae-dealer-query" aria-label="Поиск автомобиля" placeholder="Найти автомобиль…"><select id="ae-dealer-sort" aria-label="Сортировка автомобилей"><option value="default">По каталогу</option><option value="price-up">Сначала дешевле</option><option value="price-down">Сначала дороже</option><option value="name">По названию</option></select></div>');
 $('#garage-shop-section').replaceChildren(dealerTools);
 $('#ae-dealer-query').addEventListener('input',filterDealer);
 $('#ae-dealer-sort').addEventListener('change',filterDealer);
 function filterDealer(){
  const query=$('#ae-dealer-query').value.trim().toLocaleLowerCase('ru');
  const list=$('#garage-list'), cards=[...list.querySelectorAll(':scope>.car-shop-card')];let count=0;
  for(const card of cards){const car=carsData.find(c=>c.name===card.querySelector('img')?.alt);if(!car)continue;card.hidden=!car.name.toLocaleLowerCase('ru').includes(query);if(!card.hidden)count++;}
  const mode=$('#ae-dealer-sort').value;
  cards.sort((a,b)=>{const ca=carsData.find(c=>c.name===a.querySelector('img')?.alt),cb=carsData.find(c=>c.name===b.querySelector('img')?.alt);return mode==='default'?carsData.indexOf(ca)-carsData.indexOf(cb):mode==='name'?ca.name.localeCompare(cb.name,'ru'):mode==='price-up'?ca.price-cb.price:cb.price-ca.price;});
  for(const card of cards)list.append(card);
  const unit=count%10===1&&count%100!==11?'автомобиль':count%10>=2&&count%10<=4&&(count%100<12||count%100>14)?'автомобиля':'автомобилей';
  const text=`${count} ${unit} · цены и характеристики игры`;
  if($('#ae-dealer-count').textContent!==text)$('#ae-dealer-count').textContent=text;
  let empty=list.querySelector('.ae-dealer-empty');
  if(!empty){empty=make('div','ae-dealer-empty','Ничего не найдено. Измените поиск или категорию.');list.append(empty);}
  empty.hidden=count>0;
 }
 // A proper game container is already in the source as bespoke SVG artwork.
 const caseTypes=make('div','ae-case-types','<button class="active" type="button" data-case-kind="all">Все кейсы</button><button type="button" data-case-kind="plates">Номера</button><button type="button" data-case-kind="cars">Автомобили</button><button type="button" data-case-kind="special">Спецсерии</button>');
 $('.cases-grid').before(caseTypes);
 for(const card of $$('.case-card')){
  const type=card.getAttribute('onclick').match(/openCasePreview\('([^']+)'\)/)?.[1];
  card.dataset.caseType=type;
  card.dataset.caseKind=type?.startsWith('car_')?'cars':type==='special_box'?'special':'plates';
  card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',card.querySelector('.case-card-title').textContent.trim());
  card.addEventListener('keydown',event=>{if(event.target===card&&['Enter',' '].includes(event.key)){event.preventDefault();openCasePreview(type);}});
  const info=card.querySelector('.case-info-btn');info.textContent='Награды';info.setAttribute('aria-label','Посмотреть награды и вероятности');
 }
 caseTypes.addEventListener('click',event=>{const btn=event.target.closest('[data-case-kind]');if(!btn)return;$$('.ae-case-types button').forEach(b=>b.classList.toggle('active',b===btn));$$('.case-card').forEach(card=>card.hidden=btn.dataset.caseKind!=='all'&&card.dataset.caseKind!==btn.dataset.caseKind);});
 for(const btn of $$('.case-country-btn')){
  const flag=$(`#btn-country-${btn.dataset.country} .country-btn-flag svg`);
  if(flag){const host=btn.querySelector('.country-flag-badge');host.replaceChildren(flag.cloneNode(true));}
 }
 const animation=make('details','ae-case-animation','<summary>Анимация открытия <span>＋</span></summary>');
 animation.append($('#case-anim-mode-bar'));$('.case-header-controls').append(animation);
 const history=make('section','ae-case-history','<div class="ae-subheading"><div><span class="ae-eyebrow">ВСЕ НАХОДКИ ОСТАЮТСЯ У ТЕБЯ</span><h2>Последние открытия</h2></div><button type="button" onclick="switchTab(\'inventory\')">В коллекцию ↗</button></div><div id="ae-case-history-list"></div>');
 boxCases.append(history);
 const historyKey='authors_case_history_v1';
 let drops=localStore.json(historyKey,[])||[];
 function historyMarkup(){
  const list=[...inventory,...myCars].filter(item=>item?._openingId);
  let dirty=false;
  for(const item of list){if(!drops.some(old=>old.id===item._openingId)){drops.unshift({id:item._openingId,title:item.text||item.name,price:item.price||item.basePrice||0,isCar:!item.text});dirty=true;}}
  if(dirty){drops=drops.slice(0,30);localStore.set(historyKey,JSON.stringify(drops));}
  const stamp=drops.slice(0,8).map(d=>d.id).join('|');
  const host=$('#ae-case-history-list');if(host.dataset.stamp===stamp)return;host.dataset.stamp=stamp;
  host.innerHTML=drops.length?drops.slice(0,8).map(drop=>`<div class="ae-drop"><span>${escapeHtml(drop.title)}</span><strong>${money(drop.price)}</strong><small>Сохранено · ${drop.isCar?'гараж':'коллекция'}</small></div>`).join(''):'<p class="ae-no-drops">Здесь появятся твои находки. После повторного открытия предыдущие предметы сохраняются.</p>';
 }
 // Original race handlers are preserved; only preparation is divided into steps.
 const modeNav=boxRace.querySelector(':scope>.market-type-nav');
 const menu=$('#race-menu-container'), drag=$('#drag-menu-container');
 const modePane=make('section','ae-race-pane ae-race-modes','<div class="ae-race-pane-heading"><span>01 / РЕЖИМ</span><h2>Как поедем?</h2></div>');
 modePane.append(modeNav);boxRace.prepend(modePane);
 const modeCopy={circuit:['01','Шоссе 2D','Плотный поток, обгоны и рекорды.'],drag:['02','Дрэг 402 м','Реакция, передачи и дуэли с боссами.'],'3d':['03','Шоссе 3D','Заезд от третьего лица. Свободный выбор шоссе или дрифта.'],nfs:['04','Кольцевая 3D','Три трассы, соперники и борьба за позицию.']};
 for(const [id,[num,title,desc]] of Object.entries(modeCopy)){
  const btn=$('#btn-race-mode-'+id);btn.innerHTML=`<span class="ae-mode-number">${num}</span><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-race"/></svg><strong>${title}</strong><small>${desc}</small><span class="ae-mode-select">Выбрать ↗</span>`;
  btn.addEventListener('click',()=>goStep(1));
 }
 const stepper=make('nav','ae-race-steps','<button type="button" data-race-step="0"><b>01</b> Режим</button><button type="button" data-race-step="1"><b>02</b> Трасса</button><button type="button" data-race-step="2"><b>03</b> Автомобиль</button><button type="button" data-race-step="3"><b>04</b> Подготовка</button>');
 modePane.before(stepper);
 const trackPane=make('section','ae-race-pane','<div class="ae-race-pane-heading"><span>02 / ТРАССА</span><h2>Условия заезда</h2></div>');
 const carPane=make('section','ae-race-pane','<div class="ae-race-pane-heading"><span>03 / АВТОМОБИЛЬ</span><h2>Выбери машину</h2><label class="ae-show-locked"><input type="checkbox" id="ae-show-locked-cars"> Показать автомобили из автосалона</label></div>');
 carPane.classList.add('ae-owned-only');
 const prepPane=make('section','ae-race-pane','<div class="ae-race-pane-heading"><span>04 / ПОДГОТОВКА</span><h2>Всё готово к старту</h2></div><div class="ae-race-summary" id="ae-race-summary"></div>');
 const physicsChoice=make('div','ae-physics-choice','<label for="ae-physics-model">Управление в 3D</label><select id="ae-physics-model"><option value="mw">Most Wanted · пробная версия</option><option value="classic">Прежнее управление</option></select><p>Тяга, переключения и сцепление шин по восстановленным расчётам MW. Характеристики и улучшения — от твоего автомобиля.</p>');
 prepPane.append(physicsChoice);
 physicsChoice.querySelector('select').value=window.NomeraMW?.selected()?'mw':'classic';
 physicsChoice.querySelector('select').addEventListener('change',event=>{localStorage.setItem('authors_mw_physics_v1',event.target.value);});
 const oldHeader=menu.querySelector(':scope>.section-header');if(oldHeader)oldHeader.hidden=true;
 const quick=make('details','ae-race-advanced','<summary>Быстрые старты и тест-драйв <span>＋</span></summary>');quick.append($('#nfs-quickstart-hero'));prepPane.append(quick);
 for(const card of [...menu.querySelectorAll(':scope>.race-weather-card')])trackPane.append(card);
 carPane.append($('.race-car-showcase'));
 const picker=$('#race-car-picker-list');carPane.append(picker.parentElement);
 const carHero=make('img','ae-race-car-image');carHero.alt='Выбранный автомобиль';carPane.querySelector('.race-pixel-view-box').append(carHero);
 for(const selector of ['.race-records-bar','.race-tariff-note','#btn-start-race','#btn-shop-race-car','.race-controls-hint']){const node=menu.querySelector(selector);if(node)prepPane.append(node);}
 menu.append(trackPane,carPane,prepPane);
 const fixedDrag=make('section','ae-race-pane ae-drag-track','<div class="ae-race-pane-heading"><span>02 / ТРАССА</span><h2>Прямая. 402 метра.</h2></div><div class="ae-drag-road" aria-hidden="true"><i></i><b>402 м</b></div><p>Классическая четверть мили. На следующем шаге выбери автомобиль, затем подготовь ставку или вызови босса. Старт и переключение передач работают по правилам игры.</p>');
 const dragCar=make('section','ae-race-pane','<div class="ae-race-pane-heading"><span>03 / АВТОМОБИЛЬ</span><h2>Твоя машина на старте</h2></div>');dragCar.append($('#drag-car-summary-bar'));drag.before(fixedDrag,dragCar);
 const bosses=make('details','ae-drag-bosses','<summary>Дуэли с боссами <span>＋</span></summary>');$('#drag-boss-section').before(bosses);bosses.append($('#drag-boss-section'));
 const footer=make('div','ae-race-flow-actions','<button id="ae-race-back" type="button">← Назад</button><span id="ae-race-step-label"></span><button class="ae-primary" id="ae-race-next" type="button">Далее →</button>');boxRace.append(footer);
 let step=0;
 function goStep(next){
  step=Math.max(0,Math.min(3,next));const isDrag=activeRaceMode==='drag';
  modePane.hidden=step!==0;trackPane.hidden=step!==1;carPane.hidden=step!==2;prepPane.hidden=step!==3;
  physicsChoice.hidden=!['3d','nfs'].includes(activeRaceMode);
  fixedDrag.hidden=!isDrag||step!==1;dragCar.hidden=!isDrag||step!==2;
  if(!isRaceRunning){menu.classList.toggle('hidden',isDrag||step===0);drag.classList.toggle('hidden',!isDrag||step!==3);}
  stepper.querySelectorAll('button').forEach((btn,index)=>{btn.classList.toggle('active',index===step);btn.classList.toggle('complete',index<step);btn.setAttribute('aria-current',index===step?'step':'false');});
  $('#ae-race-back').disabled=step===0;$('#ae-race-next').hidden=step===3;$('#ae-race-step-label').textContent=`Шаг ${step+1} из 4`;
  $('#ae-race-summary').replaceChildren();
  for(const [label,value] of [['Режим',window.NomeraPlayground?.isSelected()?'Полигон':modeCopy[activeRaceMode]?.[1]||'Шоссе'],['Автомобиль',selectedRaceCarName],['Трасса',window.NomeraPlayground?.isSelected()?'Закрытая испытательная площадка':activeRaceMode==='nfs'?$('#nfs-track-label').textContent:$('#race-mode-label').textContent],['Погода',$('#race-weather-label').textContent]]){const item=make('div','','<span></span><strong></strong>');item.querySelector('span').textContent=label;item.querySelector('strong').textContent=value;$('#ae-race-summary').append(item);}
 }
 $('#ae-race-next').addEventListener('click',()=>goStep(step+1));$('#ae-race-back').addEventListener('click',()=>goStep(step-1));
 stepper.addEventListener('click',event=>{const btn=event.target.closest('[data-race-step]');if(btn)goStep(Number(btn.dataset.raceStep));});
 $('#ae-show-locked-cars').addEventListener('change',event=>carPane.classList.toggle('ae-owned-only',!event.target.checked));
 // Drag race telemetry remains an in-game screen, separate from preparation.
 function dragRunning(){race.classList.toggle('ae-drag-running',Boolean(isDragRaceRunning||['finished','falsestart'].includes(dragRaceState.phase)));}
 const dragTimer=setInterval(()=>{if(!race.classList.contains('hidden'))dragRunning();},300);
 window.addEventListener('pagehide',()=>clearInterval(dragTimer),{once:true});
 // Only react when the engine mounts its overlay, never to per-frame HUD text.
 const liveMount=$('#race-3d-viewport-wrapper');
 const liveObserver=new MutationObserver(()=>{const map=liveMount.querySelector('.nfs-minimap-canvas');if(map)for(const property of ['width','height','top','right'])map.style.setProperty(property,map.style.getPropertyValue(property));});
 liveObserver.observe(liveMount,{childList:true});
 // Observe rendered sections, not the physics or WebGL frame loop.
 const roots=[garage,cases,market,menu,dragCar,$('#drag-boss-section'),$('#case-preview-modal'),$('#roulette-modal'),$('#race-gameover-modal')].filter(Boolean);
 const emoji=/[\p{Extended_Pictographic}\uFE0F\u200D]/gu;
 function decorate(){
  for(const root of roots){
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
   for(const node of nodes){if(node.parentElement?.closest('.mini-plate,.plate-container,.inv-fav-btn,.ae-case-history,script,style'))continue;const next=node.nodeValue.replace(emoji,'');if(next!==node.nodeValue)node.nodeValue=next;}
  }
  let dealerChanged=false;
  for(const card of $$('#garage-list>.car-shop-card')){
   if(card.dataset.authorsDecorated)continue;card.dataset.authorsDecorated='true';dealerChanged=true;
   const name=card.querySelector('img')?.alt;const stats=carRaceStats[name];
   if(stats){const spec=make('div','ae-car-specs','<span></span><span></span>');spec.children[0].textContent=`${stats.speed} км/ч`;spec.children[1].textContent=`Управление ${stats.handling}/10`;card.querySelector('.car-info-body').insertBefore(spec,card.querySelector('.car-info-body').lastElementChild);}
  }
  if(dealerChanged)filterDealer();
  for(const card of $$('#market-listings-grid>.market-card')){card.classList.toggle('ae-market-car',Boolean(card.querySelector('img.car-img')));}
  for(const card of $$('#race-car-picker-list>.race-picker-card')){
   if(card.querySelector('.ae-race-picker-img'))continue;
   const title=card.children[1]?.innerText;if(!title)continue;
   const img=make('img','ae-race-picker-img');img.src=getCarSpriteDataUrl(title);img.alt=title;card.prepend(img);
  }
  const name=selectedRaceCarName;const image=$('.ae-race-car-image');if(image.dataset.name!==name){image.dataset.name=name;image.src=getCarSpriteDataUrl(name);image.alt=name;}
  historyMarkup();
 }
 let pending=false;
 const observer=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{observer.disconnect();decorate();watch();pending=false;});});
 function watch(){for(const root of roots)observer.observe(root,{childList:true,subtree:true,characterData:true});}
 $('#garage-list').addEventListener('click',()=>requestAnimationFrame(()=>{if(activeGarageSubView==='shop')filterDealer();}));
 document.addEventListener('click',event=>{if(event.target.closest('.dealership-filter-btn'))requestAnimationFrame(filterDealer);});
 window.NomeraAuthorsExpansion={goStep,filterDealer,decorate};
 window.addEventListener('load',()=>{goStep(0);decorate();watch();});
})();
