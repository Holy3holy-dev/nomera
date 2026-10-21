/* Mobile player batches retain full vertex data. LOD changes index buffers only;
 * hidden source meshes remain authoritative for rigs, cabin cuts and dents. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraPlayerRender=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 let enabled=null,nextIndex=0;
 const states=new Map(),smallModels=new WeakSet(),indexIds=new WeakMap();
 const mobile=()=>enabled===null?!!(root.matchMedia?.('(pointer: coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(root.navigator?.userAgent||'')):enabled;
 const fullGeometry=n=>root.NomeraVehicleLOD?.fullGeometry(n)||n.geometry;
 const layout=g=>Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([k,a])=>k+':'+a.itemSize).join('|');
 function eligible(n,windows){
  const g=n.geometry,m=n.material;
  return n.isMesh&&!n.children.length&&!n.isSkinnedMesh&&!n.isInstancedMesh&&!n.userData.playerRenderProxy&&n.visible&&!windows.has(n)&&!Array.isArray(m)&&m&&!m.transparent&&m.opacity===1&&!m.wireframe&&!Object.values(g.morphAttributes||{}).some(a=>a.length)&&g.attributes.position&&Object.values(g.attributes).every(a=>!a.isInterleavedBufferAttribute&&a.array instanceof Float32Array&&!a.normalized)&&n.scale.x*n.scale.y*n.scale.z>0;
 }
 function transformKey(n){return [n.position.x,n.position.y,n.position.z,n.quaternion.x,n.quaternion.y,n.quaternion.z,n.quaternion.w,n.scale.x,n.scale.y,n.scale.z];}
 function transformChanged(n,a){return n.position.x!==a[0]||n.position.y!==a[1]||n.position.z!==a[2]||n.quaternion.x!==a[3]||n.quaternion.y!==a[4]||n.quaternion.z!==a[5]||n.quaternion.w!==a[6]||n.scale.x!==a[7]||n.scale.y!==a[8]||n.scale.z!==a[9];}
 function copyRow(T,b,r){
  const mesh=r.mesh,source=fullGeometry(mesh);mesh.updateMatrix();const g=source.clone();g.applyMatrix4(mesh.matrix);
  for(const [name,a]of Object.entries(g.attributes))b.geometry.attributes[name].array.set(a.array,r.offset*a.itemSize);
  r.attributes=Object.entries(source.attributes).map(([k,a])=>({name:k,attribute:a,version:a.version}));r.transform=transformKey(mesh);g.dispose();
 }
 function range(g){const total=g.index?.count||g.attributes.position.count,start=Math.max(0,g.drawRange.start);return{start,count:Math.max(0,Math.min(total,start+g.drawRange.count)-start)};}
 function writeIndices(target,at,index,start,count,offset){for(let i=0;i<count;i++)target[at+i]=offset+(index?index.array[start+i]:start+i);}
 function plan(T,parent,list){
  const first=list[0],geometry=new T.BufferGeometry(),vertices=list.reduce((n,m)=>n+fullGeometry(m).attributes.position.count,0),rows=[];
  for(const [name,a]of Object.entries(fullGeometry(first).attributes))geometry.setAttribute(name,new T.BufferAttribute(new Float32Array(vertices*a.itemSize),a.itemSize));
  let offset=0,indexOffset=0;
  const totalIndices=list.reduce((n,m)=>n+range(fullGeometry(m)).count,0),indices=new (vertices>65535?Uint32Array:Uint16Array)(totalIndices);
  for(const mesh of list){const g=fullGeometry(mesh),slice=range(g);writeIndices(indices,indexOffset,g.index,slice.start,slice.count,offset);indexOffset+=slice.count;rows.push({mesh,offset,count:g.attributes.position.count,start:slice.start,indexCount:slice.count,visible:mesh.visible});offset+=g.attributes.position.count;}
  geometry.setIndex(new T.BufferAttribute(indices,1));geometry.userData.playerRenderProxy=true;
  const proxy=new T.Mesh(geometry,first.material);proxy.name='MobilePlayerBatch';proxy.userData.playerRenderProxy=true;proxy.renderOrder=first.renderOrder;proxy.layers.mask=first.layers.mask;proxy.castShadow=first.castShadow;proxy.receiveShadow=first.receiveShadow;
  return{parent,geometry,proxy,rows,cache:new Map(),choices:[],requestKey:null,job:null,failed:new Set()};
 }
 function disposeIndexGeometry(g){for(const name of Object.keys(g.attributes))g.deleteAttribute(name);g.dispose();}
 function cancelJob(b){if(b.job){b.job.cancelled=true;clearTimeout(b.job.timer);b.job=null;}}
 function selectIndices(s,b){
  const choices=b.rows.map(r=>r.mesh.geometry===fullGeometry(r.mesh)?null:r.mesh.geometry.index);
  if(choices.length===b.choices.length&&choices.every((v,i)=>v===b.choices[i]))return;
  b.choices=choices;cancelJob(b);
  if(choices.every(v=>v===null)){b.requestKey='full';b.proxy.geometry=b.geometry;return;}
  const key=choices.map(v=>{if(!v)return 0;if(!indexIds.has(v))indexIds.set(v,++nextIndex);return indexIds.get(v);}).join(',');b.requestKey=key;
  const cached=b.cache.get(key);
  if(cached){b.cache.delete(key);b.cache.set(key,cached);b.proxy.geometry=cached;return;}
  // Never wait at a coarse level when the camera moves closer.
  const count=choices.reduce((n,index,i)=>n+(index?index.count:b.rows[i].indexCount),0);
  if(count>b.proxy.geometry.index.count)b.proxy.geometry=b.geometry;
  if(b.failed.has(key))return;
  const indices=new b.geometry.index.array.constructor(count),job={cancelled:false,row:0,offset:0};b.job=job;
  function pump(){
   if(job.cancelled||s.cancelled)return;
   const start=performance.now();
   try{
    do{const r=b.rows[job.row],index=choices[job.row],source=index||fullGeometry(r.mesh).index,length=index?index.count:r.indexCount;writeIndices(indices,job.offset,source,index?0:r.start,length,r.offset);job.offset+=length;job.row++;}while(job.row<b.rows.length&&performance.now()-start<4);
    s.maxLodSliceMs=Math.max(s.maxLodSliceMs||0,performance.now()-start);
    if(job.row<b.rows.length){job.timer=setTimeout(pump,0);return;}
    const g=new s.T.BufferGeometry();g.attributes={...b.geometry.attributes};g.setIndex(new s.T.BufferAttribute(indices,1));g.boundingBox=b.geometry.boundingBox;g.boundingSphere=b.geometry.boundingSphere;g.userData.playerRenderProxy=true;b.cache.set(key,g);b.job=null;
    if(b.requestKey===key)b.proxy.geometry=g;
    while(b.cache.size>3){const oldest=[...b.cache].find(([,v])=>v!==b.proxy.geometry);if(!oldest)break;b.cache.delete(oldest[0]);disposeIndexGeometry(oldest[1]);}
   }catch(error){b.failed.add(key);b.job=null;b.proxy.geometry=b.geometry;s.lodError=String(error);}
  }
  job.timer=setTimeout(pump,0);
 }
 function prepare(T,model,windows=new Set(),force=false){
  const meta=root.NomeraVehicleLodAssets?.[model?.userData.vehicleLodFile];
  if(!model||states.has(model)||(!force&&smallModels.has(model))||!mobile()||root.NomeraWheelRig?.isPending(model)||(meta&&!meta.batchCompatible))return states.get(model);
  const groups=new Map();model.traverse(n=>{if(!eligible(n,windows))return;const key=[n.parent.uuid,n.material.uuid,layout(fullGeometry(n)),n.renderOrder,n.layers.mask,n.castShadow,n.receiveShadow].join(';');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);});
  const lists=[...groups.values()].filter(a=>a.length>1);if(!force&&lists.reduce((n,a)=>n+a.length,0)<180){smallModels.add(model);return;}
  const s={T,model,batches:[],pending:true,cancelled:false,sourceMeshes:0,bytes:0,maxBuildSliceMs:0,buildStart:performance.now()};states.set(model,s);let listIndex=0,rowIndex=0,batch=null;
  function pump(){
   if(s.cancelled)return;const start=performance.now();
   try{do{if(!batch){if(listIndex===lists.length){s.pending=false;s.buildMs=performance.now()-s.buildStart;s.maxBuildSliceMs=Math.max(s.maxBuildSliceMs,performance.now()-start);return;}batch=plan(T,lists[listIndex][0].parent,lists[listIndex++]);s.batches.push(batch);s.sourceMeshes+=batch.rows.length;s.bytes+=Object.values(batch.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+batch.geometry.index.array.byteLength;rowIndex=0;}copyRow(T,batch,batch.rows[rowIndex++]);if(rowIndex===batch.rows.length){batch.geometry.computeBoundingSphere();batch=null;}}while(performance.now()-start<4);s.maxBuildSliceMs=Math.max(s.maxBuildSliceMs,performance.now()-start);s.timer=setTimeout(pump,0);}catch(error){release(model);smallModels.add(model);model.userData.playerRenderError=String(error);}
  }
  s.timer=setTimeout(pump,0);return s;
 }
 function update(model){
  const s=states.get(model);if(!s||s.pending)return s;
  if(!s.active){for(const b of s.batches){b.parent.add(b.proxy);for(const r of b.rows)r.mesh.visible=false;}s.active=true;const retired=new Set(s.batches.flatMap(b=>b.rows.map(r=>fullGeometry(r.mesh))));for(const geometry of retired)geometry.dispose();}
  for(const b of s.batches){
   let changed=false;
   for(const r of b.rows){const g=fullGeometry(r.mesh);if(g.attributes.position.count!==r.count){release(model);return;}if(transformChanged(r.mesh,r.transform)||r.attributes.some(a=>g.attributes[a.name]!==a.attribute||a.attribute.version!==a.version)){copyRow(s.T,b,r);changed=true;}}
   if(changed){for(const a of Object.values(b.geometry.attributes))a.needsUpdate=true;b.geometry.computeBoundingSphere();}
   selectIndices(s,b);
  }
  return s;
 }
 function release(node){
  if(!node)return;
  for(const [model,s]of states){let belongs=false;for(let n=model;n;n=n.parent)if(n===node){belongs=true;break;}if(!belongs)continue;s.cancelled=true;clearTimeout(s.timer);for(const b of s.batches){cancelJob(b);for(const r of b.rows)if(s.active)r.mesh.visible=r.visible;b.proxy.parent?.remove(b.proxy);for(const g of b.cache.values())disposeIndexGeometry(g);b.geometry.dispose();}states.delete(model);}
 }
 function render(e){
  const model=e.playerCarBodyGroup?.children[0]||e.playerCar;
  if(!mobile()){release(model);delete e.playerRenderTelemetry;return;}
  if(!model||!e.authorsCabin||e.authorsCabin.model!==model)return;
  if(root.NomeraVehicleLodAssets?.[model.userData.vehicleLodFile]?.batchCompatible)root.NomeraVehicleLOD?.prepare(e.THREE||root.THREE,model);
  prepare(e.THREE||root.THREE,model,new Set(e.authorsCabin.windows.map(w=>w.mesh)));const s=update(model);
  e.playerRenderTelemetry=s?{pending:s.pending,active:!!s.active,sourceMeshes:s.sourceMeshes,batches:s.batches.length,extraCpuBytes:s.bytes,buildMs:s.buildMs,maxBuildSliceMs:s.maxBuildSliceMs,maxLodSliceMs:s.maxLodSliceMs||0,lodPending:s.batches.filter(b=>b.job).length,lodIndexBytes:s.batches.reduce((n,b)=>n+[...b.cache.values()].reduce((n,g)=>n+g.index.array.byteLength,0),0),fullTriangles:s.batches.reduce((n,b)=>n+b.geometry.index.count/3,0),renderedTriangles:s.batches.reduce((n,b)=>n+b.proxy.geometry.index.count/3,0)}:null;
 }
 return{prepare,update,render,release,mobile,setEnabled(v){enabled=v===null?null:!!v;if(enabled===false)for(const m of [...states.keys()])release(m);},stats:()=>({models:states.size})};
});
