(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraScreenControls=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';const states=new WeakMap(),DEFAULT_AUTO_GAS=false,PREF_KEY='nomera_authors_screen_controls_v2';
 const side=(x,width)=>x<width*.44?'left':x>width*.56?'right':null;
 function computeSlideSteer(clientX,rect){
  if(!rect||!(rect.width>0)||!Number.isFinite(clientX))return{steer:0,left:false,right:false};
  const rel=(clientX-rect.left)/rect.width,offset=(rel-.5)*2,deadzone=.12,fullLock=.78;
  if(Math.abs(offset)<=deadzone)return{steer:0,left:false,right:false};
  const sign=offset<0?-1:1,mag=Math.min(1,(Math.abs(offset)-deadzone)/(fullLock-deadzone)),steer=Number((sign*mag).toFixed(4));
  return{steer,left:steer<0,right:steer>0};
 }
 function tiltSteerFromOrientation(event,orientationAngle=0){
  const gamma=Number(event?.gamma)||0,beta=Number(event?.beta)||0;
  const angle=(((Number(orientationAngle)||0)%360)+360)%360;
  const deg=angle===90?beta:angle===270?-beta:angle===180?-gamma:gamma;
  const deadDeg=2.5,maxDeg=26;
  if(Math.abs(deg)<=deadDeg)return 0;
  const sign=deg<0?-1:1,mag=Math.min(1,(Math.abs(deg)-deadDeg)/(maxDeg-deadDeg));
  return Number((sign*mag).toFixed(4));
 }
 function shouldApplyAutoGas(s,e){
  if(!s||!s.auto||!e||!e.keys)return false;
  const st=e.state||{};
  if(st.crashed||e.keys.brake||e.keys.drift)return false;
  if(st.racePhase&&!['racing','countdown'].includes(st.racePhase))return false;
  return true;
 }
 function readPreference(){try{return JSON.parse(root.localStorage.getItem(PREF_KEY))||{};}catch(_){return{};}}
 function save(s){try{root.localStorage.setItem(PREF_KEY,JSON.stringify({screen:s.screen,auto:s.auto,tilt:s.tilt}));}catch(_){}}
 function key(s,k,value){if(s.e.keys[k]!==value)root.setRaceKey?.(k,value);}
 function steer(s,val){if(typeof root.setRaceAnalogSteer==='function')root.setRaceAnalogSteer(val);else{key(s,'left',val<-.12);key(s,'right',val>.12);s.e.setAnalogSteer?.(val);}}
 function release(s){s.pointers.clear();s.engaged=false;if(s.steerOwned){steer(s,0);s.steerOwned=false;}if(s.gasOwned)key(s,'gas',false);s.gasOwned=false;if(s.zone)s.zone.dataset.side='';}
 function paint(s){
  s.controls.dataset.screen=String(s.screen);s.controls.dataset.autogas=String(s.auto);s.controls.dataset.tilt=String(!!s.tilt);s.wrapper.dataset.screen=String(s.screen);
  s.mode.textContent=s.screen?'Режим: Касания':'Режим: Геймпад';s.mode.setAttribute('aria-pressed',String(s.screen));
  s.autoButton.textContent='Автогаз: '+(s.auto?'вкл':'выкл');s.autoButton.setAttribute('aria-pressed',String(s.auto));s.autoButton.hidden=false;
  if(s.tiltButton){s.tiltButton.textContent='Наклон: '+(s.tilt?'вкл':'выкл');s.tiltButton.setAttribute('aria-pressed',String(!!s.tilt));}
  if(s.quickAuto){s.quickAuto.textContent='⚡ Автогаз: '+(s.auto?'ВКЛ':'ВЫКЛ');s.quickAuto.setAttribute('aria-pressed',String(s.auto));}
  s.zone.hidden=!s.screen;
  const title=root.document.getElementById('btn-toggle-touch-text');if(title)title.textContent=s.screen?'Касания':'Геймпад';
  s.e.onResize?.();
 }
 function mount(e){
  if(states.has(e)||!e.container||!root.document)return states.get(e);
  const wrapper=e.container.closest('#race-3d-viewport-wrapper'),controls=root.document.getElementById('race-3d-touch-controls');if(!wrapper||!controls)return;
  const pref=readPreference(),s={e,wrapper,controls,pointers:new Map(),screen:pref.screen??false,auto:pref.auto??DEFAULT_AUTO_GAS,tilt:pref.tilt??false,engaged:false,gasOwned:false,steerOwned:false,bindings:[]};states.set(e,s);
  const bar=root.document.createElement('div');bar.className='ae-drive-options';
  s.mode=root.document.createElement('button');s.mode.type='button';s.mode.title='Переключить компактный режим касаний или полный геймпад';
  s.autoButton=root.document.createElement('button');s.autoButton.type='button';
  s.tiltButton=root.document.createElement('button');s.tiltButton.type='button';s.tiltButton.title='Руление наклоном телефона (гироскоп)';
  bar.append(s.mode,s.autoButton,s.tiltButton);controls.prepend(bar);s.bar=bar;
  const headerActions=root.document.getElementById('race-3d-header-actions');
  if(headerActions){
   const qa=root.document.createElement('button');qa.type='button';qa.className='btn race-hud-action-btn ae-quick-autogas-btn';qa.id='btn-3d-quick-autogas';qa.title='Переключить автогаз';
   headerActions.prepend(qa);s.quickAuto=qa;
  }
  const zone=root.document.createElement('div');zone.className='ae-screen-steering';zone.setAttribute('aria-hidden','true');zone.innerHTML='<span>‹<small>КАСАНИЕ СЛЕВА</small></span><span>›<small>КАСАНИЕ СПРАВА</small></span>';wrapper.append(zone);s.zone=zone;
  const bind=(node,name,handler,options)=>{node.addEventListener(name,handler,options);s.bindings.push(()=>node.removeEventListener(name,handler,options));};
  const blockMenu=ev=>{if(ev.cancelable)ev.preventDefault();};
  const blockTouch=ev=>{if(ev.target?.closest?.('.ae-drive-options,.ae-drive-menu'))return;if(ev.cancelable)ev.preventDefault();};
  bind(wrapper,'contextmenu',blockMenu);bind(controls,'contextmenu',blockMenu);bind(wrapper,'selectstart',blockMenu);bind(controls,'selectstart',blockMenu);
  bind(controls,'touchstart',blockTouch,{passive:false});bind(controls,'touchmove',blockTouch,{passive:false});
  bind(wrapper,'touchstart',ev=>{if(!s.screen||ev.target?.closest?.('button,a,input,select,[role=button],.ae-drive-options,.ae-drive-menu'))return;if(ev.cancelable)ev.preventDefault();},{passive:false});
  bind(wrapper,'touchmove',ev=>{if(!s.screen||ev.target?.closest?.('button,a,input,select,[role=button],.ae-drive-options,.ae-drive-menu'))return;if(ev.cancelable)ev.preventDefault();},{passive:false});
  const apply=()=>{
   const last=[...s.pointers.values()].at(-1)||null;
   if(!last){if(s.steerOwned){steer(s,0);s.steerOwned=false;}zone.dataset.side='';return;}
   s.steerOwned=true;steer(s,last.steer);zone.dataset.side=last.side||'';
  };
  const sample=(event)=>{
   const b=wrapper.getBoundingClientRect(),sl=computeSlideSteer(event.clientX,b);
   return{steer:sl.steer,side:sl.left?'left':sl.right?'right':null};
  };
  const down=event=>{
   if(!s.screen||e.state.crashed||event.pointerType==='mouse'&&!root.matchMedia?.('(pointer:coarse)').matches||event.target.closest('button,a,input,select,[role=button],.touch-cluster,.touch-actions-bar,.ae-drive-menu'))return;
   s.pointers.set(event.pointerId,sample(event));s.engaged=true;zone.dataset.used='true';try{wrapper.setPointerCapture(event.pointerId);}catch(_){}apply();event.preventDefault();event.stopImmediatePropagation();update(e);
  };
  const move=event=>{if(!s.pointers.has(event.pointerId))return;s.pointers.set(event.pointerId,sample(event));apply();event.preventDefault();event.stopImmediatePropagation();};
  const up=event=>{if(!s.pointers.has(event.pointerId))return;if(event.type==='pointercancel'||event.type==='lostpointercapture')release(s);else{s.pointers.delete(event.pointerId);apply();}try{wrapper.releasePointerCapture(event.pointerId);}catch(_){}event.stopImmediatePropagation();};
  for(const[name,fn]of[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])bind(wrapper,name,fn,true);
  const gasBtn=root.document.getElementById('btn-3d-touch-gas');
  if(gasBtn){
   bind(gasBtn,'pointerup',()=>{if(s.auto){s.auto=false;s.gasOwned=false;save(s);paint(s);}key(s,'gas',false);});
  }
  const toggleAuto=()=>{s.auto=!s.auto;if(!s.auto&&s.gasOwned){key(s,'gas',false);s.gasOwned=false;}save(s);paint(s);update(e);};
  bind(s.mode,'click',()=>toggle(e));
  bind(s.autoButton,'click',toggleAuto);
  if(s.quickAuto)bind(s.quickAuto,'click',toggleAuto);
  bind(s.tiltButton,'click',async()=>{
   if(!s.tilt&&typeof root.DeviceOrientationEvent?.requestPermission==='function'){
    try{const perm=await root.DeviceOrientationEvent.requestPermission();if(perm!=='granted')return;}catch(_){}
   }
   s.tilt=!s.tilt;if(!s.tilt&&s.steerOwned){steer(s,0);s.steerOwned=false;}save(s);paint(s);
  });
  bind(root,'deviceorientation',ev=>{
   if(!s.tilt||s.pointers.size>0||e.state?.crashed)return;
   const angle=root.screen?.orientation?.angle??root.orientation??0;
   s.steerOwned=true;steer(s,tiltSteerFromOrientation(ev,angle));
  });
  bind(root,'blur',()=>release(s));bind(root.document,'visibilitychange',()=>{if(root.document.hidden)release(s);});
  controls.classList.add('touch-enabled');paint(s);return s;
 }
 function update(e){
  if(!root.NOMERA_AUTHORS_PREVIEW)return;
  const s=states.get(e)||mount(e);if(!s)return;
  const want=shouldApplyAutoGas(s,e);
  if(want||s.gasOwned)key(s,'gas',want);
  s.gasOwned=want;
 }
 function toggle(e){const s=states.get(e);if(!s)return false;release(s);s.screen=!s.screen;save(s);paint(s);return true;}
 function destroy(e){
  const s=states.get(e);if(!s)return;release(s);
  for(const off of s.bindings)off();
  s.bar.remove();s.zone.remove();s.quickAuto?.remove();
  delete s.controls.dataset.screen;delete s.controls.dataset.autogas;delete s.controls.dataset.tilt;delete s.wrapper.dataset.screen;
  states.delete(e);
 }
 return{update,destroy,toggle,side,computeSlideSteer,tiltSteerFromOrientation,shouldApplyAutoGas,DEFAULT_AUTO_GAS,activeFor:wrapper=>wrapper?.dataset.screen==='true'};
});
