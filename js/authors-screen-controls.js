(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraScreenControls=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';const states=new WeakMap();
 const side=(x,width)=>x<width*.44?'left':x>width*.56?'right':null;
 function readPreference(){try{return JSON.parse(root.localStorage.getItem('nomera_authors_screen_controls'))||{};}catch(_){return{};}}
 function save(s){try{root.localStorage.setItem('nomera_authors_screen_controls',JSON.stringify({screen:s.screen,auto:s.auto}));}catch(_){}}
 function key(s,k,value){if(s.e.keys[k]!==value)root.setRaceKey?.(k,value);}
 function release(s){s.pointers.clear();s.engaged=false;key(s,'left',false);key(s,'right',false);if(s.gasOwned)key(s,'gas',false);s.gasOwned=false;s.zone.dataset.side='';}
 function paint(s){s.controls.dataset.screen=String(s.screen);s.controls.dataset.autogas=String(s.auto);s.wrapper.dataset.screen=String(s.screen);s.mode.textContent=s.screen?'Касания экрана':'Кнопки руля';s.mode.setAttribute('aria-pressed',String(s.screen));s.autoButton.textContent='Автогаз: '+(s.auto?'вкл':'выкл');s.autoButton.setAttribute('aria-pressed',String(s.auto));s.autoButton.hidden=!s.screen;s.zone.hidden=!s.screen;const title=root.document.getElementById('btn-toggle-touch-text');if(title)title.textContent=s.screen?'Касания':'Кнопки';s.e.onResize?.();}
 function mount(e){if(states.has(e)||!e.container||!root.document)return states.get(e);const wrapper=e.container.closest('#race-3d-viewport-wrapper'),controls=root.document.getElementById('race-3d-touch-controls');if(!wrapper||!controls)return;
  const pref=readPreference(),s={e,wrapper,controls,pointers:new Map(),screen:pref.screen??!!root.matchMedia?.('(pointer:coarse)').matches,auto:pref.auto??true,engaged:false,gasOwned:false,bindings:[]};states.set(e,s);
  const bar=root.document.createElement('div');bar.className='ae-drive-options';s.mode=root.document.createElement('button');s.mode.type='button';s.mode.title='Переключить управление касаниями или кнопками';s.autoButton=root.document.createElement('button');s.autoButton.type='button';bar.append(s.mode,s.autoButton);controls.prepend(bar);s.bar=bar;
  const zone=root.document.createElement('div');zone.className='ae-screen-steering';zone.setAttribute('aria-hidden','true');zone.innerHTML='<span>‹<small>КАСАНИЕ СЛЕВА</small></span><span>›<small>КАСАНИЕ СПРАВА</small></span>';wrapper.append(zone);s.zone=zone;
  const bind=(node,name,handler,options)=>{node.addEventListener(name,handler,options);s.bindings.push(()=>node.removeEventListener(name,handler,options));};
  const apply=()=>{const last=[...s.pointers.values()].at(-1)||null;key(s,'left',last==='left');key(s,'right',last==='right');zone.dataset.side=last||'';};
  const down=event=>{if(!s.screen||e.state.crashed||event.pointerType==='mouse'&&!root.matchMedia?.('(pointer:coarse)').matches||event.target.closest('button,a,input,select,[role=button]'))return;
   const b=wrapper.getBoundingClientRect();s.pointers.set(event.pointerId,side(event.clientX-b.left,b.width));s.engaged=true;zone.dataset.used='true';try{wrapper.setPointerCapture(event.pointerId);}catch(_){}apply();event.preventDefault();event.stopImmediatePropagation();update(e);};
  const move=event=>{if(!s.pointers.has(event.pointerId))return;const b=wrapper.getBoundingClientRect();s.pointers.set(event.pointerId,side(event.clientX-b.left,b.width));apply();event.preventDefault();event.stopImmediatePropagation();};
  const up=event=>{if(!s.pointers.has(event.pointerId))return;if(event.type==='pointercancel'||event.type==='lostpointercapture')release(s);else{s.pointers.delete(event.pointerId);apply();}try{wrapper.releasePointerCapture(event.pointerId);}catch(_){}event.stopImmediatePropagation();};
  for(const[name,fn]of[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])bind(wrapper,name,fn,true);
  bind(s.mode,'click',()=>toggle(e));bind(s.autoButton,'click',()=>{s.auto=!s.auto;save(s);paint(s);update(e);});bind(root,'blur',()=>release(s));bind(root.document,'visibilitychange',()=>{if(root.document.hidden)release(s);});
  controls.classList.add('touch-enabled');paint(s);return s;
 }
 function update(e){if(!root.NOMERA_AUTHORS_PREVIEW)return;const s=states.get(e)||mount(e);if(!s)return;const want=!!(s.screen&&s.auto&&s.engaged&&!e.keys.brake&&!e.state.crashed&&(!e.state.racePhase||['racing','countdown'].includes(e.state.racePhase)));if(want||s.gasOwned)key(s,'gas',want);s.gasOwned=want;}
 function toggle(e){const s=states.get(e);if(!s)return false;release(s);s.screen=!s.screen;save(s);paint(s);return true;}
 function destroy(e){const s=states.get(e);if(!s)return;release(s);for(const off of s.bindings)off();s.bar.remove();s.zone.remove();delete s.controls.dataset.screen;delete s.controls.dataset.autogas;delete s.wrapper.dataset.screen;states.delete(e);}
 return{update,destroy,toggle,side,activeFor:wrapper=>wrapper?.dataset.screen==='true'};
});
