/* Local sector timing and route guidance. No force, input or wallet writes. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRaceExperience=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const runs=new WeakMap(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function startStage(state,sawCountdown){
  if(state.racePhase==='countdown')return state.countdownTimer>1.6?1:state.countdownTimer>.8?2:3;
  return sawCountdown&&state.racePhase==='racing'&&(state.raceTimeSec||0)<1.2?4:0;
 }
 function updateStart(e,r,st){
  if(!r.signal)return;if(st.racePhase==='countdown')r.sawCountdown=true;const stage=startStage(st,r.sawCountdown);if(stage===r.signalStage)return;r.signalStage=stage;
  r.signal.hidden=!stage;r.signal.dataset.stage=stage;r.signal.querySelector('b').textContent=stage===4?'СТАРТ':stage?'ГОТОВЬСЯ К СТАРТУ':'';
  r.signal.setAttribute('aria-label',stage===4?'Старт':stage?'До старта: '+(4-stage):'');
 }
 function corner(track,s,speed=0){
  if(!track?.sampleTrackAtS)return null;
  const horizon=clamp(speed/3.6*2.8,65,180);let best=null;
  for(let d=10;d<=horizon;d+=10){const q=track.sampleTrackAtS(s+d),k=Math.abs(q.curvature);if(k<.004){if(best)break;continue;}
   const candidate={distance:d,direction:q.curvature>0?'right':'left',severity:k>.014?'Крутой поворот':'Поворот',hint:Math.round(q.speedHintKmh/10)*10,score:k/(1+d/80)};
   if(best&&candidate.direction!==best.direction)break;
   if(!best)best=candidate;else if(candidate.score>best.score)best={...candidate,distance:best.distance};
  }return best;
 }
 function normalizeBook(value){
  if(!Array.isArray(value))return[];
  return value.filter(r=>r&&typeof r.key==='string'&&r.key.length<3000&&Array.isArray(r.times)).slice(-48).map(r=>({key:r.key,times:r.times.slice(0,32).map(t=>Number.isFinite(t)&&t>.2&&t<7200?t:null)}));
 }
 function recordKey(config,weather){
  const pick=(object,keys)=>Object.entries(object||{}).filter(([k,v])=>keys.includes(k)&&['number','string','boolean'].includes(typeof v)).sort(([a],[b])=>a.localeCompare(b));
  const upgrades=pick(config.upgrades,['engine','handling','economy','nitro','junkmanEngine','junkmanTurbo','junkmanTires','junkmanNitro','gearRatioBias','aeroDownforce','gripDriftBias']);
  const performance=pick(config.performance,['speed','accel','handling','consumption','nitroDrain','nitroRecharge','nitroSpeedBonus']);
  return JSON.stringify([config.trackId,config.carName,weather,config.physicsKernel?'mw':'base',config.transmissionMode||'auto',config.difficulty,config.weather,upgrades,performance]);
 }
 function createTiming(previous=[]){return{times:[],best:previous.slice(),lastTime:0,lastCount:0,lastDamage:0,lastContacts:0,clean:0,last:null};}
 function split(timing,{count,time,damage=0,contacts=0}){
  if(!Number.isFinite(time)||count!==timing.lastCount+1||time<=timing.lastTime+.2)return null;
  const seconds=time-timing.lastTime,index=timing.times.length,old=timing.best[index];
  const row={index,seconds,delta:Number.isFinite(old)?seconds-old:null,clean:damage<=timing.lastDamage+.05&&contacts<=timing.lastContacts};
  timing.times.push(seconds);timing.lastCount=count;timing.lastTime=time;timing.lastDamage=damage;timing.lastContacts=contacts;if(row.clean)timing.clean++;
  timing.best[index]=Number.isFinite(old)?Math.min(old,seconds):seconds;timing.last=row;return row;
 }
 function begin(e,config={},owner=''){
  if(!root.NOMERA_AUTHORS_PREVIEW||!e)return;
  destroy(e);const storageKey=(root.NOMERA_STORAGE_PREFIX||'nomera_authors_v1:')+'sector_records:'+encodeURIComponent(String(owner).toLowerCase()),key=recordKey(config,e.currentActiveWeather||config.weather);
  let book=[];try{book=normalizeBook(JSON.parse(root.localStorage.getItem(storageKey)));}catch(_){}
  const run={key,storageKey,book,weather:e.currentActiveWeather,weatherChanged:false,timing:createTiming(book.find(r=>r.key===key)?.times),lastUI:-1,damage:0,config};runs.set(e,run);e.authorsRun=run;
  if(e.container&&root.document){const hud=root.document.createElement('div');hud.className='ae-route-coach';hud.hidden=true;hud.setAttribute('aria-label','Навигация по трассе');hud.innerHTML='<span class="ae-route-arrow"></span><div><small></small><b></b><span class="ae-sector-live"></span></div>';e.container.append(hud);run.hud=hud;
   if(e.track){const signal=root.document.createElement('div');signal.className='ae-start-signal';signal.hidden=true;signal.setAttribute('role','status');signal.setAttribute('aria-live','polite');signal.innerHTML='<span class="ae-start-lights" aria-hidden="true"><i></i><i></i><i></i></span><b></b>';e.container.append(signal);run.signal=signal;updateStart(e,run,e.state||{});}
  }
 }
 function checkpoint(e,progress){
  const r=runs.get(e);if(!r||!progress.isPlayer)return;
  checkWeather(e,r);
  const row=split(r.timing,{count:progress.checkpointsPassed,time:e.state.raceTimeSec,damage:e.state.damageTaken,contacts:e.damageEnabled===false?(e.playerPhysics?.state.impactSequence||0):0});
  if(row){r.highlightUntil=e.state.raceTimeSec+4;r.lastUI=-1;}
 }
 const seconds=t=>t.toFixed(2)+' с',delta=t=>(t>0?'+':'−')+Math.abs(t).toFixed(2)+' с';
 function checkWeather(e,r){if(e.currentActiveWeather!==r.weather&&!r.weatherChanged){r.weatherChanged=true;r.timing.best=[];if(r.timing.last)r.timing.last.delta=null;}}
 function update(e){
  const r=runs.get(e);if(!r)return;const st=e.state||{},time=st.raceTimeSec||0;
  checkWeather(e,r);
  // Countdown uses its own clock; raceTimeSec does not advance on the grid.
  updateStart(e,r,st);
  // Four UI refreshes per second; the driving simulation remains independent.
  if(time>=r.lastUI&&time-r.lastUI<.25&&r.lastUI>=0)return;r.lastUI=time;
  if(!r.hud)return;
  r.hud.hidden=!!(st.racePhase&&st.racePhase!=='racing')||(!e.track&&!st.wantedStars&&e.mode!=='drift');if(r.hud.hidden)return;
  let label=e.mode==='drift'?'ДРИФТ / СВОБОДНЫЙ ЗАЕЗД':'ШОССЕ / СВОБОДНЫЙ ЗАЕЗД',title=e.mode==='drift'?'Удерживай скольжение':'',arrow='↑',detail=e.mode==='drift'?'Угол · скорость · серия':'Обгоны · дистанция · дрифт',tone='straight';
  if(e.track&&e.playerProgress){const p=e.playerProgress,q=corner(e.track,p.lastS,st.speed),recent=r.timing.last&&time<r.highlightUntil;label='СЕКТОР '+(p.nextCheckpoint||e.track.checkpoints.length);
   r.hud.hidden=!q&&!recent;
   if(q){arrow=q.direction==='right'?'↱':'↰';title=q.severity+' · '+q.distance+' м';detail='Ориентир: '+q.hint+' км/ч';tone=q.hint<st.speed-15?'brake':'turn';}
   else if(recent){arrow='✓';title=r.timing.last.clean?'Чистый сектор':'Сектор пройден';}
   if(r.timing.last&&time<r.highlightUntil){const s=r.timing.last;detail='S'+(s.index+1)+' · '+seconds(s.seconds)+(s.delta===null?' · первый результат':' · '+delta(s.delta));tone=s.delta!==null&&s.delta<=0?'best':tone;}
  }else if(st.wantedStars>0){label='ПРЕСЛЕДОВАНИЕ';title='Оторвись от патруля';detail='Розыск '+st.wantedStars+' / 5';tone='brake';}
  r.hud.dataset.tone=tone;r.hud.querySelector('.ae-route-arrow').textContent=arrow;r.hud.querySelector('small').textContent=label;r.hud.querySelector('b').textContent=title;r.hud.querySelector('.ae-sector-live').textContent=detail;
  e.raceExperienceTelemetry={sectors:r.timing.times.length,clean:r.timing.clean,corner:e.track?corner(e.track,e.playerProgress.lastS,st.speed):null,physicsChanged:false};
 }
 function finish(e,receipt){
  const r=runs.get(e);if(!r)return;
  root.NomeraRaceHud?.destroy(e);
  root.NomeraScreenControls?.destroy(e);
  checkWeather(e,r);
  r.hud?.remove();r.hud=null;r.signal?.remove();r.signal=null;
  if(r.timing.times.length&&!r.weatherChanged){const book=r.book.filter(x=>x.key!==r.key);book.push({key:r.key,times:r.timing.best});try{root.localStorage.setItem(r.storageKey,JSON.stringify(book.slice(-48)));}catch(_){} }
  const host=root.document?.querySelector('#race-gameover-modal .gameover-stats-card');if(!host)return;
  root.document.getElementById('ae-run-analysis')?.remove();const panel=root.document.createElement('section');panel.id='ae-run-analysis';panel.className='ae-run-analysis';
  const heading=root.document.createElement('h3');heading.textContent='Как прошёл заезд';panel.append(heading);
  const rows=[['За езду и финиш',Math.round(receipt.driving).toLocaleString('ru-RU')+' ₽'],['Бонус дрифта',Math.round(receipt.drift).toLocaleString('ru-RU')+' ₽']];
  for(const[label,value]of rows){const row=root.document.createElement('p'),name=root.document.createElement('span'),amount=root.document.createElement('b');name.textContent=label;amount.textContent=value;row.append(name,amount);panel.append(row);}
  if(r.timing.times.length){const note=root.document.createElement('small');note.textContent=r.timing.clean+' из '+r.timing.times.length+(e.damageEnabled===false?' секторов без ударов.':' секторов без новых повреждений.')+' Сравнение — с этой машиной и настройками в ту же погоду. Чистота — показатель езды, без дополнительной выплаты.';if(r.weatherChanged)note.textContent='Погода изменилась во время заезда: времена показаны без записи личного рекорда. Чистота секторов не даёт дополнительной выплаты.';panel.append(note);
   const list=root.document.createElement('ol');for(const [i,t]of r.timing.times.entries()){const item=root.document.createElement('li'),old=r.weatherChanged?null:r.book.find(x=>x.key===r.key)?.times[i];item.textContent='S'+(i+1)+' · '+seconds(t)+(Number.isFinite(old)?' / '+delta(t-old):' / первый результат');list.append(item);}panel.append(list);
  }else{const note=root.document.createElement('small');note.textContent='Топливо, состояние и фактическое зачисление — ниже. Дрифт уже включён в доход до расходов.';panel.append(note);}
  host.before(panel);
 }
 function destroy(e){const r=runs.get(e);r?.hud?.remove();r?.signal?.remove();runs.delete(e);delete e.authorsRun;delete e.raceExperienceTelemetry;}
 return{begin,checkpoint,update,finish,destroy,corner,split,createTiming,normalizeBook,recordKey,startStage};
});
