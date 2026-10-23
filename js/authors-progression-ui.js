/* Profile and atelier views over the shared account progression. */
(()=>{
 'use strict';
 if(!window.NOMERA_AUTHORS_PREVIEW)return;
 const P=window.NomeraProgression,B=window.NomeraProgressionBridge,$=s=>document.querySelector(s),money=n=>n.toLocaleString('ru-RU')+' ₽';
 const profile=$('#auth-panel-profile'),edit=$('.ae-profile-edit');
 const section=document.createElement('section');section.className='ae-progression';
 section.innerHTML=`<div class="ae-eyebrow">NOMERA / ПУТЬ ИГРОКА</div><h3>Каждый уровень — твой.</h3>
 <p class="ae-progression-copy">Играй, собирай опыт и открывай свою серию. Ливреи и титулы этапов доступны сразу при достижении уровня.</p>
 <div class="ae-reward-wallet"><small id="ae-reward-range"></small><strong id="ae-reward-cash"></strong><button type="button" id="ae-reward-claim">Забрать награды</button><span id="ae-reward-status" role="status" aria-live="polite"></span></div>
 <div class="ae-reward-next"><span class="ae-eyebrow">СЛЕДУЮЩАЯ НАГРАДА</span><strong id="ae-reward-next-cash"></strong><small id="ae-reward-next-xp"></small><div class="ae-next-stage"><span id="ae-reward-next-level"></span><div><b id="ae-reward-next-title"></b><small id="ae-reward-next-livery"></small></div></div><p id="ae-reward-stage-distance"></p></div>
 <details class="ae-reward-collection" open><summary>Ливреи и титулы <span id="ae-reward-unlocked-count"></span></summary><p>Титул виден в чате. Ливрею можно бесплатно установить в ателье на любую свою машину.</p><div class="ae-reward-cards"></div></details>
 <button type="button" class="ae-reward-garage">Открыть гараж и ателье ↗</button>`;
 profile.insertBefore(section,edit);profile.classList.add('ae-profile-with-rewards');
 const selected=document.createElement('span');selected.className='ae-profile-title';$('.ae-profile-passport>.ae-eyebrow').after(selected);
 const cards=new Map();
 for(const stage of P.stages){
  const card=document.createElement('article');card.className='ae-reward-card';card.style.setProperty('--reward-color',stage.color);card.dataset.reward=stage.id;
  card.innerHTML=`<div class="ae-livery-swatch ${stage.livery.pattern}" aria-hidden="true"><i></i><b>${stage.livery.number}</b><small>${stage.livery.team}</small></div><div class="ae-reward-card-head"><span>Ур. ${stage.level}</span><small class="ae-stage-state"></small></div><h4>${stage.name}</h4><p>Титул «${stage.title}»</p><small class="ae-stage-bonus">Бонус этапа +${money(stage.bonus)}</small><button type="button" data-title="${stage.id}">Выбрать титул</button>`;
  card.querySelector('button').onclick=()=>B.title(stage.id);$('.ae-reward-cards').append(card);cards.set(stage.id,card);
 }
 const select=$('#player-title-select');
 for(const s of P.stages){const o=document.createElement('option');o.value=s.id;o.textContent=s.title+' · ур. '+s.level;select.append(o);}
 $('#ae-reward-claim').onclick=()=>{const ok=B.claim();$('#ae-reward-status').textContent=ok?'Награды зачислены и сохранены.':'Награда не выдана. Проверь сохранение профиля.';};
 $('.ae-reward-garage').onclick=()=>{closeProfileModal();switchTab('garage');};
 const editor=$('.ae-livery-editor'),presets=document.createElement('label');presets.className='ae-level-livery-picker';
 presets.innerHTML='<span>Ливреи за уровни</span><select id="ae-level-livery-select"><option value="">Выбрать наградную ливрею…</option></select><small>Предпросмотр бесплатный. Для установки нажми кнопку сохранения в ателье.</small>';
 editor.querySelector('p').after(presets);
 for(const s of P.stages){const o=document.createElement('option');o.value=s.id;o.textContent=s.name+' · ур. '+s.level;$('#ae-level-livery-select').append(o);}
 for(const[pattern,label]of[['chevron','Шеврон · этап 5'],['circuit','Контур · этап 10']]){const o=document.createElement('option');o.value=pattern;o.textContent=label;$('#ae-livery-pattern').append(o);}
 $('#ae-level-livery-select').onchange=e=>{const stage=P.stages.find(s=>s.id===e.target.value);if(stage&&P.canUse(stage.id,B.read().level)){window.NomeraLiveryEditor.choose(stage.livery);$('#ae-livery-message').textContent=stage.name+' · наградная ливрея. Сохрани изменения в ателье.';}};
 let stamp='';
 function refresh(){
  const state=B.read(),nextStamp=JSON.stringify(state);if(stamp===nextStamp)return;stamp=nextStamp;
  const snap=P.snapshot(state.level,state.xp,state.through),pending=snap.pending,need=100+(snap.level-1)*10;
  selected.textContent=(P.titles[state.title]||TITLES_CATALOG[state.title])?.label||'Без титула';
  $('#ae-reward-range').textContent=pending.count?`Награды за уровни ${pending.from}–${pending.to}`:'Все доступные награды получены';
  $('#ae-reward-cash').textContent=pending.count?'+'+money(pending.cash):'Коллекция растёт вместе с тобой';
  const claim=$('#ae-reward-claim');claim.disabled=!pending.count||state.online;claim.textContent=pending.count?'Забрать '+money(pending.cash):'Награды получены';
  $('#ae-reward-status').textContent=state.online?'Денежные награды доступны в локальной игре.':pending.count?'Один раз за каждый уровень, включая уже пройденные.':'';
  $('#ae-reward-next-cash').textContent=snap.level<P.MAX?`Уровень ${snap.level+1} · +${money(snap.nextCash)}`:'Максимальный уровень · 777';
  $('#ae-reward-next-xp').textContent=snap.level<P.MAX?`${Math.max(0,need-Math.floor(state.xp)).toLocaleString('ru-RU')} XP до следующего уровня`:'Все этапы открыты. Ливреи остаются в ателье.';
  $('#ae-reward-next-level').textContent=snap.next?snap.next.level:'777';
  $('#ae-reward-next-title').textContent=snap.next?snap.next.title:'Легенда NOMERA';
  $('#ae-reward-next-livery').textContent=snap.next?`Ливрея ${snap.next.name} + ${money(snap.next.bonus)} бонусом`:'Signature 777 · финальная серия';
  $('#ae-reward-stage-distance').textContent=snap.next?`${snap.xpToStage.toLocaleString('ru-RU')} XP до этапа · опыт дают номера, кейсы, гонки и задания.`:'Путь пройден. Продолжай собирать номера и ставить рекорды.';
  $('#ae-reward-unlocked-count').textContent=`${snap.unlocked.length} / ${P.stages.length} открыто`;
  for(const s of P.stages){const unlocked=P.canUse(s.id,state.level),equipped=state.title===s.id,card=cards.get(s.id),button=card.querySelector('button');card.dataset.locked=String(!unlocked);card.querySelector('.ae-stage-state').textContent=unlocked?'Открыто':'Впереди';button.disabled=!unlocked||equipped;button.textContent=equipped?'Титул выбран':unlocked?'Выбрать титул':'Откроется на ур. '+s.level;button.setAttribute('aria-pressed',String(equipped));for(const sel of [select,$('#ae-level-livery-select')])sel.querySelector(`[value="${s.id}"]`).disabled=!unlocked;}
  select.value=state.title;
  $('#ae-livery-pattern [value="chevron"]').disabled=snap.level<5;$('#ae-livery-pattern [value="circuit"]').disabled=snap.level<10;
  $('#ae-level-livery-select').value='';
  const levelButton=$('#player-level');levelButton.dataset.rewards=String(!!pending.count);levelButton.title=pending.count?'В профиле есть награды за уровни':'Уровень игрока';
 }
 window.NomeraProgressionUI={refresh};refresh();
})();
