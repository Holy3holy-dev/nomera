/* Per-model compatibility and reversible extraction of Subaru's merged factory wing. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraAeroFitment=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const ids='vaz2107 vaz2109 gaz24 priora solaris vesta polo mark2 golf_sonny subaru is300_taz m5e60 eclipse_lou silvia camry rx7 elantra_n mustang_jewels evo8_earl clk_kaze supra lc300 cayman_baron gtr e63 mustang_razor rs6 corvette_webster viper_jv m5f90 m3_g80 db9 x5m m8 gallardo_ming corvette_cross rs7 panamera maserati g63 m3gtr mclaren porsche911 audir8 huracan cullinan sf90 chiron jesko'.split(' '),profiles=Object.fromEntries(ids.map(id=>[id,{id,spoiler:'add',bodykit:true,hood:['stock','carbon','gtr_vents','blower'],roof:true}]));
 for(const id of'm3gtr corvette_cross corvette_webster mustang_razor mustang_jewels supra gtr silvia rx7 elantra_n evo8_earl cayman_baron porsche911 db9 gallardo_ming huracan chiron jesko sf90 mclaren audir8 m8 lc300 x5m panamera cullinan'.split(' '))profiles[id].spoiler='integrated';
 for(const id of'm3gtr corvette_cross corvette_webster mustang_razor mustang_jewels subaru gtr silvia elantra_n evo8_earl gallardo_ming huracan chiron jesko sf90'.split(' '))profiles[id].bodykit=false;
 for(const id of'm8 mclaren porsche911 cayman_baron audir8 gallardo_ming huracan sf90 chiron jesko'.split(' ')){profiles[id].hood=['stock','carbon'];profiles[id].roof=false;}
 profiles.subaru.spoiler='replace';profiles.subaru.hood=['stock'];
 for(const p of Object.values(profiles)){Object.freeze(p.hood);Object.freeze(p);}Object.freeze(profiles);
 const fallback=Object.freeze({spoiler:'integrated',bodykit:false,hood:['stock'],roof:false});
 function profile(id){return profiles[id]||fallback;}
 function reason(id,key,value){if(['none','stock'].includes(String(value)))return'';const p=profile(id);if(key==='spoiler'&&p.spoiler==='integrated')return'Штатное антикрыло встроено в эту модель';if(key==='bodykit'&&!p.bodykit)return'На этой модели уже установлен кузовной пакет';if(key==='hood'&&!p.hood.includes(value))return id==='subaru'?'Капот Subaru уже содержит штатный воздухозаборник':'Эта деталь не подходит к расположению двигателя';if(key==='roofScoop'&&!p.roof)return'Воздухозаборник не подходит к крыше этой модели';return'';}
 function violations(id,previous,draft){return['spoiler','bodykit','hood','roofScoop'].filter(k=>previous?.[k]!==draft?.[k]&&reason(id,k,draft?.[k])).map(k=>({key:k,reason:reason(id,k,draft[k])}));}
 const plans=new WeakMap();
 function plan(T,model){if(plans.has(model))return plans.get(model);model.updateWorldMatrix(true,true);const inv=model.matrixWorld.clone().invert(),rows=[];model.traverse(node=>{
   if(node.name!=='Object_2'||!node.isMesh)return;const g=node.geometry,p=g.attributes.position,index=g.index,m=inv.clone().multiply(node.matrixWorld),v=new T.Vector3(),verts=[],parents=Array.from({length:p.count},(_,i)=>i),positions=new Map();
   const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i]}return i;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[b]=a;};
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);verts.push(v.clone());const key=[v.x,v.y,v.z].map(x=>Math.round(x*1e5)).join('/');if(positions.has(key))join(i,positions.get(key));else positions.set(key,i);}
   const triangles=[];for(let start=0;start<(index?.count||p.count);start+=3){const ids=[0,1,2].map(k=>index?index.getX(start+k):start+k);join(ids[0],ids[1]);join(ids[0],ids[2]);triangles.push({start,ids});}
   const components=new Map();for(const t of triangles){const key=find(t.ids[0]);if(!components.has(key))components.set(key,{box:new T.Box3(),triangles:[]});const c=components.get(key);c.triangles.push(t);for(const i of t.ids)c.box.expandByPoint(verts[i]);}
   const removed=new Set();for(const c of components.values()){const b=c.box,s=b.getSize(new T.Vector3());if(c.triangles.length>=300&&c.triangles.length<=500&&b.min.z< -1.8&&b.max.z< -1.7&&b.min.y>.95&&b.max.y<1.35&&s.x>1.1&&s.x<1.5&&s.y<.35)for(const t of c.triangles)removed.add(t.start);}
   // Only a validated complete component can be removed; no broad spatial cut of the body.
   if(removed.size){const kept=[],groups=[],source=g.groups.length?g.groups:[{start:0,count:triangles.length*3,materialIndex:0}];for(const group of source){const start=kept.length;for(let i=group.start;i<group.start+group.count;i+=3)if(!removed.has(i))for(let k=0;k<3;k++)kept.push(index?index.getX(i+k):i+k);groups.push({start,count:kept.length-start,materialIndex:group.materialIndex});}rows.push({node,original:g,kept,groups,removed:removed.size});}
  });plans.set(model,rows);return rows;
 }
 function replaceWing(T,model){const restore=[],rows=plan(T,model);for(const row of rows){if(row.node.geometry!==row.original)continue;const g=new T.BufferGeometry();for(const[k,v]of Object.entries(row.original.attributes))g.setAttribute(k,v);g.setIndex(row.kept);for(const group of row.groups)g.addGroup(group.start,group.count,group.materialIndex);g.computeBoundingBox();g.computeBoundingSphere();row.node.geometry=g;restore.push({node:row.node,original:row.original,assigned:g,removed:row.removed});}return restore;}
 return{ids,profiles,profile,reason,violations,replaceWing};
});
