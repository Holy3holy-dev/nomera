/* Suspend the existing race while its car viewer owns the foreground. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraPreviewPause=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 function create(hooks){let owner=null;
  function valid(t){return t&&hooks.engine()===t.engine&&hooks.session()===t.session&&hooks.running()&&!t.engine._destroyed&&hooks.visible();}
  function pause(){if(valid(owner))return;owner=null;const engine=hooks.engine();if(!hooks.running()||!engine?.isRunning)return;owner={engine,session:hooks.session()};hooks.reset();engine.resetKeys?.();engine.stop();hooks.quiet();}
  function resume(){const t=owner;if(!t||hooks.modal())return;if(!valid(t)){owner=null;return;}if(hooks.hidden())return;owner=null;if(t.engine.isRunning)return;hooks.reset();t.engine.resetKeys?.();t.engine.isRunning=true;const now=hooks.now();if(typeof t.engine._scheduleNextFrame==='function'){t.engine.lastTimestamp=now;t.engine._scheduleNextFrame();}else{t.engine.lastTime=now;t.engine.animFrameId=hooks.raf(t.engine._loopBound);}t.engine.notifyHUD?.();hooks.audio();}
  function allowsViewer(){return !!(valid(owner)&&hooks.modal()&&!owner.engine.isRunning);}
  return{pause,resume,allowsViewer,cancel(){owner=null;}};
 }
 return{create};
});
