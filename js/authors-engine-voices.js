/* NOMERA mapping of catalogue engines to recovered MW recordings. Modern
 * cars use a related engine type; these are not recordings of those cars. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraEngineVoices=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const TYPES={
  i4:['standard','I4',1,5600],i4turbo:['gti','I4 turbo',1,6200],boxer4:['sport','boxer 4 turbo',1,6000],
  i6:['inline6','I6',1,6500],i6turbo:['inline6','I6 turbo',1.04,6700],v6:['inline6','V6',.92,5100],v6turbo:['inline6','V6 turbo',.96,5900],
  flat6:['flat6','flat 6',1,6800],flat6turbo:['flat6','flat 6 turbo',.97,6400],rotary:['rotary','rotary',1,7200],
  v8:['v8','V8',1,5500],v8turbo:['corvette','V8 turbo',1.04,6500],v8race:['corvette','V8 race',1,7100],slr:['slr','V8 supercharged',1,6800],clk:['clk','V8',1,5700],
  m3gtr:['whine','M3 GTR V8 race',1,8000],v10:['supercar','V10',1,7500],m5:['m5','V10',1,7400],viper:['viper','V10',1,5800],
  v12:['db9','V12',1,7000],v12turbo:['db9','V12 turbo',.9,5500],w16:['db9','W16 turbo',.83,5300],truck:['truck','diesel truck',1,3500]
 };
 const MODELS={vaz2107:'i4',vaz2109:'i4',gaz24:'i4',priora:'i4',solaris:'i4',vesta:'i4',polo:'i4turbo',mark2:'i6turbo',wrx:'boxer4',m5e60:'m5',s15:'i4turbo',camry:'v6',lc300:'v6turbo',gtr:'v6turbo',e63:'v8turbo',rs6:'v8turbo',m5f90:'v8turbo',m8:'v8turbo',g63:'v8turbo',porsche911:'flat6turbo',huracan:'v10',cullinan:'v12turbo',sf90:'v8turbo',chiron:'w16',jesko:'v8turbo',m3gtr:'m3gtr',corvette_cross:'v8race',mustang_razor:'v8',mclaren:'slr',db9:'v12',viper_jv:'viper',corvette_webster:'v8race',gallardo_ming:'v10',clk_kaze:'clk',mustang_jewels:'v8',evo8_earl:'i4turbo',cayman_baron:'flat6',eclipse_lou:'v6',rx7:'rotary',supra:'i6turbo',is300_taz:'i6',golf_sonny:'i4turbo',audir8:'v10',elantra_n:'i4turbo',m3g80:'i6turbo',x5m:'v8turbo',rs7:'v8turbo',panamera:'v8turbo',granturismo:'v8'};
 function profile(carClass='standard',name='',resolvedId=''){
  let id=resolvedId,type=MODELS[id],n=String(name).toLowerCase(),c=String(carClass).toLowerCase();
  if(!type&&n){
   const match=[[/m3.*gtr|m3 e46/,'m3gtr'],[/m5 e60/,'m5'],[/m3.*g80/,'i6turbo'],[/slr/,'slr'],[/clk/,'clk'],[/viper/,'viper'],[/rx.?[78]/,'rotary'],[/911|cayman/,'flat6turbo'],[/gallardo|huracan|le mans|r8/,'v10'],[/db9|aston/,'v12'],[/cullinan/,'v12turbo'],[/chiron|bugatti/,'w16'],[/land cruiser/,'v6turbo'],[/camry|eclipse/,'v6'],[/supra|mark ii/,'i6turbo'],[/is300/,'i6'],[/impreza|wrx/,'boxer4'],[/gt.r|skyline/,'v6turbo'],[/amg|m5|m8|x5|rs6|rs7|sf90|jesko|panamera/,'v8turbo'],[/corvette/,'v8race'],[/mustang|maserati/,'v8'],[/golf|elantra|silvia|evo|polo/,'i4turbo'],[/камаз|truck/,'truck']].find(([r])=>r.test(n));type=match?.[1];
  }
  // Stable legacy six-family API for callers without a named catalogue car.
  if(!type){const key=/kamaz|truck|diesel/.test(c)?'truck':/m3gtr|nfs_gtr|whine/.test(c)?'whine':/v8|muscle|luxury|supercharger/.test(c)?'v8':/hyper|supercar/.test(c)?'supercar':/sport|turbo/.test(c)?'sport':'standard';return{id:id||name||c,key,type:c,pitch:1,cutoff:7000,turbo:/turbo|sport/.test(c),gain:1};}
  const[key,label,pitch,cutoff]=TYPES[type];return{id:id||name||type,key,type:label,pitch,cutoff,turbo:/turbo/.test(type),gain:1};
 }
 return{profile,models:MODELS,types:TYPES};
});
