/* Prestige is presentation only. Outcomes, costs and saving remain in app.js. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraPrestige=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const finishes=[['Эмаль','#bfced3'],['Сатин','#99c6ff'],['Платина','#8bedd2'],['Рубин','#ff9c9b'],['Опал','#d4b3ff'],['Золото','#f4d48e'],['Аурум','#ffdb9e']];
 let live=null,serial=0,mounted=false;
 function presentation(text='',price=0,reduced=false){const rank=/БЛАТНОЙ|Крутой|Мифич|Ультра/i.test(text)?6:/Легендар/i.test(text)?5:/Эпич/i.test(text)?4:/Супер редк/i.test(text)?3:/^Редк/i.test(text)?2:/Необыч/i.test(text)?1:0;const value=Number(price);return{rank,finish:finishes[rank][0],accent:finishes[rank][1],price:Number.isFinite(value)?Math.max(0,Math.round(value)):0,duration:reduced?0:[0,850,1600,1850,2100,2400,2700][rank],particles:reduced||rank<2?0:rank>=5?12:8};}
 const stage=()=>root.document?.getElementById('gen-plate-stage');
 function summary(){return stage()?.querySelector('.ae-reveal-panel');}
 function focusBack(){const b=stage()?.querySelector('.ae-reveal-skip');if(b&&root.document.activeElement===b)root.document.getElementById('btn-spin-both')?.focus({preventScroll:true});}
 function stop(){if(!live)return;const run=live;live=null;run.timers.forEach(root.clearTimeout);run.animations.forEach(a=>a.cancel());run.node?.remove();}
 function cancel(){focusBack();stop();const s=stage();if(!s)return;delete s.dataset.revealPhase;s.querySelector('.ae-reveal-skip')?.setAttribute('hidden','');idle(s.dataset.rarityTier||'none');}
 function idle(tier){const s=stage(),p=summary();if(!s||!p)return;const f=finishes[{none:0,uncommon:1,rare:2,super:3,epic:4,legendary:5,blatnoy:6}[tier]||0];p.querySelector('small').textContent=f[0].toUpperCase()+' / КОЛЛЕКЦИОННЫЙ ВЫПУСК';p.querySelector('b').textContent='Характер — в деталях';p.querySelector('span').textContent='Тиснение символов · отражающая эмаль · металлическая грань';p.removeAttribute('aria-live');}
 function update(tier){if(live&&tier==='none')cancel();if(!live)idle(tier);}
 function description(v){const info=root.NomeraPlatePassport?.describe({country:v.country,letters:v.letters,digits:v.digits,region:String(v.region||''),rarity:v.rarity,price:v.price});if(info)return info.title+' · '+info.region;if(v.country==='UAE')return (String(v.digits||'').length<=2?'Короткая цифровая комбинация':'Коллекционная комбинация')+' · '+String(v.region||'ОАЭ');return v.combination||'Номер готов к твоей коллекции';}
 function reveal(value={}){
  const s=stage();if(!s)return;cancel();const reduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches,plan=presentation(value.rarity,value.price,reduced),p=summary();if(!p)return;
  const run={id:++serial,animations:[],timers:[],node:null,rank:plan.rank,country:String(value.country||'RUS'),region:String(value.region||'')};live=run;s.style.setProperty('--ae-drop-accent',plan.accent);s.dataset.revealPhase='light';
  p.setAttribute('aria-live','polite');p.querySelector('small').textContent=(plan.rank>=2?'НОВАЯ НАХОДКА / ':'КОЛЛЕКЦИЯ / ')+String(value.rarity||'Обычный').toUpperCase();p.querySelector('b').textContent=plan.price.toLocaleString('ru-RU')+' ₽';p.querySelector('span').textContent=description(value);
  const skip=s.querySelector('.ae-reveal-skip');if(skip)skip.hidden=!plan.duration||plan.rank<2;
  function phase(name){if(live!==run)return;s.dataset.revealPhase=name;}
  run.finish=()=>{if(live!==run)return;focusBack();stop();s.dataset.revealPhase='settled';if(skip)skip.hidden=true;};
  if(!plan.duration||!s.animate||!root.document.getElementById('plate-box')?.animate){run.finish();return;}
  const node=root.document.createElement('div');node.className='ae-drop-scene';node.setAttribute('aria-hidden','true');node.innerHTML='<i class="ae-drop-ring"></i><i class="ae-drop-rail ae-drop-rail-left"></i><i class="ae-drop-rail ae-drop-rail-right"></i>'+Array.from({length:plan.particles},(_,i)=>'<i class="ae-drop-spark" style="--spark-x:'+(8+(i*37)%84)+'%;--spark-y:'+(18+(i*29)%64)+'%"></i>').join('');s.append(node);run.node=node;
  const animate=(el,frames,options)=>{if(!el?.animate)return;const a=el.animate(frames,{fill:'none',easing:'cubic-bezier(.16,.7,.2,1)',...options});run.animations.push(a);};
  animate(node.querySelector('.ae-drop-ring'),[{opacity:0,transform:'scale(.6,.7)'},{opacity:plan.rank>=5?.8:.45,transform:'scale(1,1)',offset:.28},{opacity:0,transform:'scale(1.4,1.15)'}],{duration:plan.duration});
  for(const el of node.querySelectorAll('.ae-drop-rail'))animate(el,[{opacity:0,transform:'scaleX(.1)'},{opacity:.85,transform:'scaleX(1)',offset:.3},{opacity:0,transform:'scaleX(.8)'}],{duration:Math.min(1400,plan.duration)});
  for(const[i,el]of [...node.querySelectorAll('.ae-drop-spark')].entries())animate(el,[{opacity:0,transform:'translateY(8px) scale(.2)'},{opacity:.85,transform:'translateY(0) scale(1)',offset:.35},{opacity:0,transform:'translateY(-24px) scale(.3)'}],{delay:120+i%4*60,duration:plan.duration-360});
  animate(root.document.querySelector('#plate-box .ae-rim-sweep'),[{opacity:0,transform:'translateX(-75%)'},{opacity:.9,transform:'translateX(0)',offset:.4},{opacity:0,transform:'translateX(75%)'}],{duration:Math.min(1350,plan.duration)});
  run.timers.push(root.setTimeout(()=>phase('value'),Math.min(280,plan.duration*.2)),root.setTimeout(()=>phase('detail'),Math.min(720,plan.duration*.5)),root.setTimeout(run.finish,plan.duration));
 }
 function mount(){if(mounted||!root.NOMERA_AUTHORS_PREVIEW)return;const s=stage(),plate=root.document.getElementById('plate-box');if(!s||!plate)return;mounted=true;
  const mark=root.document.querySelector('.brand-mark'),word=root.document.querySelector('.brand-word'),link=root.document.querySelector('.brand-lockup');if(mark)mark.innerHTML='<img src="./assets/authors-brand/nomera-symbol.svg" width="48" height="33" alt="">';if(word)word.innerHTML='<img src="./assets/authors-brand/nomera-wordmark.svg" width="134" height="18" alt="NOMERA">';link?.setAttribute('aria-label','NOMERA — генератор, коллекция и гонки');const edition=root.document.querySelector('.ae-brand-edition');if(edition)edition.textContent='H3H / COLLECT · DRIVE · TRADE';
  const stock=root.document.createElement('span');stock.className='ae-plate-stock';stock.setAttribute('aria-hidden','true');plate.prepend(stock);const rim=root.document.createElement('span');rim.className='ae-rim-sweep';rim.setAttribute('aria-hidden','true');plate.append(rim);
  const panel=root.document.createElement('div');panel.className='ae-reveal-panel';panel.innerHTML='<div><small></small><b></b><span></span></div><button type="button" class="ae-reveal-skip" hidden aria-label="Завершить анимацию выпадения">Пропустить</button>';s.append(panel);panel.querySelector('button').onclick=()=>live?.finish();idle(s.dataset.rarityTier||'none');
  new MutationObserver(()=>{if(live&&(plate.dataset.country!==live.country||String(plate.dataset.reg)!==live.region))cancel();}).observe(plate,{attributes:true,attributeFilter:['data-country','data-reg']});
  root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden)cancel();});root.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',event=>{if(event.matches)live?.finish();});
 }
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount);else mount();}
 return{presentation,reveal,cancel,update,mount,skip:()=>live?.finish(),stats:()=>({active:!!live,animations:live?.animations.length||0,timers:live?.timers.length||0,serial})};
});
