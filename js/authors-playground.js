/* Practice measurements read the normal simulation. Only an explicit retry resets pose. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraPlayground=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';let selected=false,kind='accel';const runs=new WeakMap(),names={accel:'Разгон 0–100',brake:'Торможение 100–0',slalom:'Слалом · 6 ворот'};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function create(kind='accel'){return{kind,phase:'ready',clock:0,previous:null,start:null,startDistance:0,distance:0,gate:0,result:null,reason:''};}
 function measure(m,dt,s){
  if(!(dt>0&&dt<=.3)||!Number.isFinite(s.speed)||!Number.isFinite(s.s))return m;
  const p=m.previous||{...s,speed:0},before=m.clock;m.clock+=dt;m.distance+=Math.hypot((s.x||0)-(p.x||0),(s.z||0)-(p.z||0));
  const crossing=(v,a,b)=>before+dt*clamp((v-a)/Math.max(.0001,b-a),0,1),done=value=>{m.phase='done';m.result=value;};
  if(m.phase==='done'||m.phase==='invalid'){m.previous={...s};return m;}
  if(s.damage>.1||Math.abs(s.lateral)>7||s.airborne){m.phase='invalid';m.reason='Замер прерван: вернись на площадку и повтори.';m.previous={...s};return m;}
  if(m.kind==='accel'){
   if(m.phase==='ready'&&s.gas&&s.speed>.5){m.start=before-dt*clamp(p.speed/Math.max(.01,s.speed-p.speed),0,12);m.phase='running';}
   if(m.phase==='running'&&p.speed<100&&s.speed>=100)done({seconds:crossing(100,p.speed,s.speed)-m.start});
  }else if(m.kind==='brake'){
   if(s.speed>=100)m.phase=m.phase==='running'?'running':'armed';
   if(m.phase==='armed'&&s.brake&&p.speed>=100&&s.speed<=100){const f=clamp((p.speed-100)/Math.max(.01,p.speed-s.speed),0,1);m.start=before+dt*f;m.startDistance=m.distance-Math.hypot(s.x-p.x,s.z-p.z)*(1-f);m.phase='running';}
   if(m.phase==='running'&&!s.brake){m.phase='invalid';m.reason='Держи тормоз до полной остановки.';}
   else if(m.phase==='running'&&s.speed<=.5){const f=clamp((p.speed-.5)/Math.max(.01,p.speed-s.speed),0,1);done({seconds:before+dt*f-m.start,meters:m.distance-Math.hypot(s.x-p.x,s.z-p.z)*(1-f)-m.startDistance});}
  }else{
   const gate=80+m.gate*32;
   if(p.s<gate&&s.s>=gate){const f=clamp((gate-p.s)/Math.max(.01,s.s-p.s),0,1),lateral=p.lateral+(s.lateral-p.lateral)*f,target=m.gate%2?-2.8:2.8;
    if(Math.abs(lateral-target)>2.4-(s.halfWidth||1)){m.phase='invalid';m.reason='Ворота пропущены. Повтори слалом.';}
    else{if(m.gate===0){m.start=before+dt*f;m.phase='running';}m.gate++;if(m.gate===6)done({seconds:before+dt*f-m.start,gates:6});}
   }
  }m.previous={...s};return m;
 }
 function isPractice(e){return !!e?.carConfig?.authorsPractice;}
 function recordKey(e){return JSON.stringify([kind,root.NomeraRaceExperience?.recordKey(e.carConfig,e.currentActiveWeather)||[e.carConfig.carName,e.currentActiveWeather,e.playerPhysics.profile.topSpeedKmh]]);}
 function loadBest(r){try{const rows=JSON.parse(root.localStorage.getItem((root.NOMERA_STORAGE_PREFIX||'nomera_authors_v1:')+'practice:'+encodeURIComponent(r.owner))||'[]');const row=Array.isArray(rows)?rows.find(x=>x.key===r.key):null;return row?.result&&Number.isFinite(row.result.seconds)&&row.result.seconds>0?row.result:null;}catch(_){return null;}}
 function begin(e,owner=''){
  if(!isPractice(e))return;root.document?.body.classList.add('ae-practice-active');const T=e.THREE,r={meter:create(kind),baseS:30,owner,key:recordKey(e),saved:false,resources:[],group:null,hud:null};runs.set(e,r);e.authorsPractice=r;r.best=loadBest(r);root.NomeraRaceExperience?.destroy(e);
  if(root.document&&e.container){const hud=root.document.createElement('div');hud.className='ae-practice-hud';hud.innerHTML='<div><small>ПОЛИГОН / БЕЗ РАСХОДВ И НАГРАД</small><b></b><span></span></div><button type="button">Повторить</button>';hud.querySelector('small').textContent='ПОЛИГОН / БЕЗ РАСХОДОВ И НАГРАД';hud.querySelector('button').onclick=()=>retry(e);e.container.append(hud);r.hud=hud;e.circuitTelemetryEl&&(e.circuitTelemetryEl.hidden=true);}
  if(T&&e.scene){const group=new T.Group();group.name='PracticeGates';r.group=group;e.scene.add(group);const geo=new T.ConeGeometry(.3,.8,8),mat=new T.MeshStandardMaterial({color:0xe9ed87,roughness:.8});r.resources.push(geo,mat);if(kind==='slalom'){for(let i=0;i<6;i++){const q=e.track.sampleTrackAtS(r.baseS+80+i*32),target=i%2?-2.8:2.8;for(const side of[-1,1]){const c=new T.Mesh(geo,mat);c.position.set(e.toThreeX(q.x+q.nx*(target+side*2.4)),.4,e.toThreeZ(q.z+q.nz*(target+side*2.4)));group.add(c);}}}
  if(root.document){const canvas=root.document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#17302d';c.fillRect(0,0,256,128);c.strokeStyle='#d9fb70';c.lineWidth=6;c.strokeRect(4,4,248,120);c.textAlign='center';c.fillStyle='#d9fb70';c.font='700 20px Arial';c.fillText('NOMERA / TEST',128,35);c.fillStyle='#eef4e5';c.font='900 42px Arial';c.fillText('ПОЛИГОН',128,88);const texture=new T.CanvasTexture(canvas),board=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}),plane=new T.PlaneGeometry(4,2),lineGeo=new T.BoxGeometry(14,.025,.3),lineMat=new T.MeshBasicMaterial({color:0xd9e5b2});r.resources.push(texture,board,plane,lineGeo,lineMat);for(const d of[0,100,200,400]){const q=e.track.sampleTrackAtS(r.baseS+d),line=new T.Mesh(lineGeo,lineMat);line.position.set(e.toThreeX(q.x),.02,e.toThreeZ(q.z));line.rotation.y=-q.heading;group.add(line);const sign=new T.Mesh(plane,board);sign.position.set(e.toThreeX(q.x+q.nx*8),2.3,e.toThreeZ(q.z+q.nz*8));sign.rotation.y=Math.PI-q.heading;group.add(sign);}}
  }
  retry(e);
 }
 function retry(e){const r=runs.get(e);if(!r)return;const q=e.track.sampleTrackAtS(r.baseS);e.resetKeys();e.playerPhysics.reset({...q,speedKmh:0});root.NomeraBodyDamage?.reset(e.playerCarBodyGroup?.children[0]||e.playerCar);Object.assign(e.state,{x:q.x,z:q.z,speed:0,peakSpeed:0,earnedCash:0,damageTaken:0,distanceKm:0,fuelLiters:0,fuelCurrent:e.state.fuelCapacity||45,raceTimeSec:0,racePhase:'racing',driftScore:0,nitroLevel:100});r.meter=create(kind);r.weather=e.currentActiveWeather;r.key=recordKey(e);r.best=loadBest(r);r.lastUI=undefined;r.saved=false;e._sync3DMeshes(true);paint(e);}
 function step(e,dt){const r=runs.get(e);if(!r)return;const p=e.playerPhysics.state,q=e.track.projectPointToTrack(p.x,p.z),s=(q.s-r.baseS+e.track.totalLength)%e.track.totalLength;
  if(r.meter.phase!=='done'&&r.weather!==e.currentActiveWeather){r.meter.phase='invalid';r.meter.reason='Погода изменилась. Повтори замер.';}
  measure(r.meter,dt,{speed:Math.abs(p.speedKmh),s,x:p.x,z:p.z,lateral:q.lateralOffset,damage:e.state.damageTaken,airborne:e.playerPhysics.suspension?.grounded===0,gas:e.keys.gas,brake:e.keys.brake,halfWidth:(e.playerPhysics.profile.trackWidth||1.6)*.6});e.state.earnedCash=0;
  if(r.meter.result&&!r.saved){r.saved=true;if(!r.best||(r.meter.result.meters??r.meter.result.seconds)<(r.best.meters??r.best.seconds))r.best={...r.meter.result};const key=(root.NOMERA_STORAGE_PREFIX||'nomera_authors_v1:')+'practice:'+encodeURIComponent(r.owner);try{let book=JSON.parse(root.localStorage.getItem(key)||'[]');if(!Array.isArray(book))book=[];const old=book.find(x=>x.key===r.key),value=r.meter.result.meters??r.meter.result.seconds;if(!old||value<(old.result.meters??old.result.seconds))book=book.filter(x=>x.key!==r.key).concat({key:r.key,result:r.meter.result});root.localStorage.setItem(key,JSON.stringify(book.slice(-32)));}catch(_){} }
  paint(e);
 }
 function resultText(m){return m.result?(m.result.meters!==undefined?m.result.meters.toFixed(1)+' м · ':'')+m.result.seconds.toFixed(2)+' с':'';}
 function paint(e){const r=runs.get(e);if(!r?.hud)return;const m=r.meter;if(r.lastUI!==undefined&&m.clock-r.lastUI<.1&&r.lastPhase===m.phase)return;r.lastUI=m.clock;r.lastPhase=m.phase;r.hud.querySelector('b').textContent=names[m.kind]+(m.result?' · '+resultText(m):m.phase==='running'?' · '+(m.clock-m.start).toFixed(1)+' с':'');r.hud.querySelector('span').textContent=m.phase==='invalid'?m.reason:m.result?'Замер готов. Личный результат: '+resultText({result:r.best||m.result}):m.kind==='accel'?'Нажми газ. Нитро выключено.'+(r.best?' Личный: '+resultText({result:r.best}):''):m.kind==='brake'?(m.phase==='armed'?'Тормози и держи до остановки.':m.phase==='running'?'Торможение…':'Разгонись выше 100 км/ч, затем тормози.'):'Пройди ворота по порядку · '+m.gate+'/6';}
 function finish(e){root.document?.body.classList.remove('ae-practice-active');const r=runs.get(e);if(!r)return;r.hud?.remove();r.hud=null;const note=root.document?.getElementById('ae-practice-summary');if(note)note.textContent=r.meter.result?names[kind]+': '+resultText(r.meter):'Тренировка завершена. Расходов и наград нет.';root.NomeraAuthorsExpansion?.goStep(3);}
 function destroy(e){if(isPractice(e))root.document?.body.classList.remove('ae-practice-active');const r=runs.get(e);if(!r)return;r.hud?.remove();r.group?.parent?.remove(r.group);for(const x of r.resources)x.dispose();runs.delete(e);delete e.authorsPractice;}
 function select(value){selected=!!value;root.document?.body.classList.toggle('ae-practice-selected',selected);const button=root.document?.getElementById('btn-race-mode-proving');button?.setAttribute('aria-pressed',String(selected));if(selected)root.document?.getElementById('btn-race-mode-nfs')?.classList.remove('active');const start=root.document?.getElementById('btn-start-race');if(start){if(!start.dataset.practiceOriginal)start.dataset.practiceOriginal=start.textContent;start.textContent=selected?'На полигон':start.dataset.practiceOriginal;}}
 function mount(){const nav=root.document.querySelector('.ae-race-modes .market-type-nav');if(!nav)return;const button=root.document.createElement('button');button.type='button';button.id='btn-race-mode-proving';button.className='race-mode-btn';button.innerHTML='<span class="ae-mode-number">05</span><strong>Полигон</strong><small>0–100, торможение и слалом. Без расходов и наград.</small>';nav.append(button);for(const b of nav.querySelectorAll('button'))b.addEventListener('click',()=>{select(b===button);if(b===button){root.switchRaceMode('nfs');select(true);root.NomeraAuthorsExpansion.goStep(2);}});
  const card=root.document.createElement('section');card.className='ae-practice-choice';card.innerHTML='<label for="ae-practice-kind">Упражнение полигона</label><select id="ae-practice-kind"><option value="accel">Разгон 0–100 км/ч</option><option value="brake">Торможение 100–0 км/ч</option><option value="slalom">Слалом · 6 ворот</option></select><p>Закрытая ровная площадка, без трафика и полиции. Обычные газ, тормоз и руль. Нитро отключено.</p><p id="ae-practice-summary" aria-live="polite"></p>';root.document.getElementById('ae-race-summary').after(card);card.querySelector('select').onchange=e=>kind=e.target.value;
 }
 return{create,measure,begin,step,retry,finish,destroy,mount,isPractice,isSelected:()=>selected,select,names};
});
