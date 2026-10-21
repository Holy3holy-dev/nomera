/* Optional mobile delivery: same geometry/rigs, smaller texture payloads. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraMobileTextures=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';let enabled=null;
 function mobile(){return enabled===null?!!(root.matchMedia?.('(pointer: coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(root.navigator?.userAgent||'')):enabled;}
 function url(source,meta){const file=source.split('/').pop(),variant=root.NomeraMobileTextureAssets?.[file];return mobile()&&variant&&meta?.version===variant.sourceVersion?variant.url+'?v='+variant.version:meta?source+'?v='+meta.version:source;}
 function bytes(url){const file=new URL(url,root.location?.href||'http://localhost/').pathname.split('/').pop();return /\/models-mobile\//.test(url)?root.NomeraMobileTextureAssets?.[file]?.bytes:root.NomeraModelAssets?.[file]?.bytes;}
 return{mobile,url,bytes,setEnabled:value=>{enabled=value===null?null:!!value;}};
});
