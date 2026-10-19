/* Animated imported wheels. Geometry stays in model coordinates; the original
 * tire/rim triangles and materials are moved to four hub pivots, never replaced. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraWheelRig=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const rigs=new WeakMap(),pending=new WeakMap(),jobs=new Set();
 function compact(T,geometry,triangles){
  const result=new T.BufferGeometry(),sourceIndex=geometry.index,oldToNew=new Map(),oldIndices=[],newIndices=[];
  let lastMaterial=-1,groupStart=0;
  for(const tri of triangles){
   if(tri.material!==lastMaterial){if(lastMaterial>=0)result.addGroup(groupStart,newIndices.length-groupStart,lastMaterial);lastMaterial=tri.material;groupStart=newIndices.length;}
   for(let j=0;j<3;j++){
    const old=sourceIndex?sourceIndex.getX(tri.start+j):tri.start+j;
    if(!oldToNew.has(old)){oldToNew.set(old,oldIndices.length);oldIndices.push(old);}
    newIndices.push(oldToNew.get(old));
   }
  }
  if(lastMaterial>=0)result.addGroup(groupStart,newIndices.length-groupStart,lastMaterial);
  for(const [name,attribute]of Object.entries(geometry.attributes)){
   const sourceArray=attribute.array||attribute.data.array;
   const data=new sourceArray.constructor(oldIndices.length*attribute.itemSize);
   for(let i=0;i<oldIndices.length;i++)for(let j=0;j<attribute.itemSize;j++){
    const old=oldIndices[i];
    data[i*attribute.itemSize+j]=attribute.isInterleavedBufferAttribute?attribute.data.array[old*attribute.data.stride+attribute.offset+j]:attribute.array[old*attribute.itemSize+j];
   }
   result.setAttribute(name,new T.BufferAttribute(data,attribute.itemSize,attribute.normalized));
  }
  result.setIndex(newIndices);result.computeBoundingBox();result.computeBoundingSphere();return result;
 }
 function* build(T,model){
  if(rigs.has(model))return rigs.get(model);
  model.updateMatrixWorld(true);
  const existing=[];model.traverse(node=>{if(node.userData?.isWheelSpinner)existing.push(node)});
  if(existing.length){
   const wheels=existing.map(spin=>{const steer=spin.parent;return{spin,steer,key:(steer.position.z>0?'f':'r')+(steer.position.x>0?'l':'r'),radius:.33,baseY:steer.position.y,angle:spin.rotation.x,procedural:true,side:steer.userData.side||1};});
   const rig={wheels,imported:false};rigs.set(model,rig);return rig;
  }
  const inverse=model.matrixWorld.clone().invert(),bounds=new T.Box3().setFromObject(model).applyMatrix4(inverse),size=bounds.getSize(new T.Vector3());
  const candidates=[],anchors={};
  const point=new T.Vector3();
  const meshList=[];model.traverse(node=>{if(node.isMesh&&node.visible&&node.geometry?.attributes.position&&!node.isSkinnedMesh)meshList.push({node,matrix:inverse.clone().multiply(node.matrixWorld)});});
  for(const {node,matrix}of meshList){
   const geometry=node.geometry,position=geometry.attributes.position,index=geometry.index;
   // Imported files frequently merge four wheels into one mesh, or reuse a
   // tire material on grilles/wipers. Find connected geometry, not names/colors.
   const vertices=[],parents=Array.from({length:position.count},(_,i)=>i),samePosition=new Map();
   const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
   const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[b]=a;};
   for(let i=0;i<position.count;i++){
    if((i&4095)===0)yield;
    point.fromBufferAttribute(position,i).applyMatrix4(matrix);vertices.push(point.clone());
    const key=[point.x,point.y,point.z].map(v=>Math.round(v*100000)).join(',');
    if(samePosition.has(key))join(i,samePosition.get(key));else samePosition.set(key,i);
   }
   const count=index?index.count:position.count,groups=geometry.groups.length?geometry.groups:[{start:0,count,materialIndex:0}],triangles=[];
   for(const group of groups)for(let start=group.start;start<Math.min(count,group.start+group.count);start+=3){
    if(start%12288===0)yield;
    const ids=[0,1,2].map(k=>index?index.getX(start+k):start+k);join(ids[0],ids[1]);join(ids[0],ids[2]);
    triangles.push({start,material:group.materialIndex,ids,key:null,spin:true});
   }
   const components=new Map();
   let processed=0;
   for(const tri of triangles){if((processed++&4095)===0)yield;const id=find(tri.ids[0]);if(!components.has(id))components.set(id,{triangles:[],box:new T.Box3(),ids:new Set()});const c=components.get(id);c.triangles.push(tri);for(const i of tri.ids){c.box.expandByPoint(vertices[i]);c.ids.add(i);}}
   for(const component of components.values()){
    const span=component.box.getSize(new T.Vector3()),center=component.box.getCenter(new T.Vector3()),radius=(span.y+span.z)*.25;
    if(span.x<.62&&span.y>.32&&span.y<1.1&&span.z/span.y>.82&&span.z/span.y<1.18&&center.y>.08&&center.y<size.y*.49&&Math.abs(center.x)>Math.max(.4,size.x*.19)&&Math.abs(center.z)>size.z*.15){
     const key=(center.z>0?'f':'r')+(center.x>0?'l':'r');
     if(!anchors[key]||radius>anchors[key].radius)anchors[key]={center,radius};
    }
   }
   candidates.push({node,geometry,matrix,triangles,vertices,components});
  }
  // A validated tire at each hub prevents guessing from body/chrome meshes.
  if(Object.keys(anchors).length!==4){const rig={wheels:[],imported:true,reason:'missing circular wheel geometry'};rigs.set(model,rig);return rig;}
  const wheels=Object.entries(anchors).map(([key,anchor])=>{
   const hub=anchor.center,steer=new T.Group(),spin=new T.Group();
   steer.name='MW_Hub_'+key;spin.name='MW_Spin_'+key;steer.position.copy(hub);steer.add(spin);model.add(steer);
   return{key,steer,spin,center:hub,radius:anchor.radius,baseY:hub.y,angle:0};
  });
  const byKey=Object.fromEntries(wheels.map(w=>[w.key,w]));
  for(const {node,geometry,matrix,triangles,vertices,components}of candidates){
   yield;
   const caliper=/caliper|etrier|суппорт/i.test(node.name+' '+(node.userData._origMatNames||[]).join(' '));
   for(const component of components.values())for(const wheel of wheels){
    const hub=wheel.center,radius=wheel.radius*1.045;
    if([...component.ids].every(i=>Math.abs(vertices[i].x-hub.x)<.34&&Math.hypot(vertices[i].y-hub.y,vertices[i].z-hub.z)<=radius)){
     for(const tri of component.triangles){tri.key=wheel.key;tri.spin=!caliper&&!(node.userData._stylingRoles?.[tri.material]==='brake'&&!node.userData.isBrakeRotor);}break;
    }
   }
   if(!triangles.some(tri=>tri.key))continue;
   const buckets=new Map();for(const tri of triangles){const key=tri.key?tri.key+(tri.spin?':spin':':fixed'):'body';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(tri);}
   if(buckets.has('body'))node.geometry=compact(T,geometry,buckets.get('body'));else node.parent.remove(node);
   for(const [bucket,tris]of buckets){if(bucket==='body')continue;const [key,part]=bucket.split(':'),wheel=byKey[key];
    const sliced=compact(T,geometry,tris);sliced.applyMatrix4(matrix);sliced.translate(-wheel.center.x,-wheel.center.y,-wheel.center.z);
    const mesh=new T.Mesh(sliced,node.material);mesh.name=node.name+'_'+bucket;mesh.castShadow=node.castShadow;mesh.receiveShadow=node.receiveShadow;
    (part==='spin'?wheel.spin:wheel.steer).add(mesh);
   }
  }
  const rig={wheels,imported:true};rigs.set(model,rig);return rig;
 }
 function prepare(T,model){const iterator=build(T,model);let result;do{result=iterator.next();}while(!result.done);return result.value;}
 function prepareAsync(T,model,target=[]){
  if(pending.has(model))return pending.get(model);
  target.splice(0,target.length);
  const task={wheels:target,pending:true,imported:true,cancelled:false,timer:null},iterator=build(T,model);
  const pump=()=>{
   const start=performance.now();let result;
   do{if(task.cancelled)return;result=iterator.next();}while(!result.done&&performance.now()-start<5);
   if(result.done){target.splice(0,target.length,...result.value.wheels);task.imported=result.value.imported;task.reason=result.value.reason;task.pending=false;jobs.delete(task);pending.delete(model);}
   else task.timer=setTimeout(pump,0);
  };
  task.cancel=()=>{task.cancelled=true;clearTimeout(task.timer);iterator.return();jobs.delete(task);pending.delete(model);};
  pending.set(model,task);jobs.add(task);pump();return task;
 }
 function cancelAll(){for(const job of [...jobs])job.cancel();}
 function update(rig,{dt=0,speedMps=0,steer=0,angles=null,compression=null,handbrake=false}={}){
  if(!rig)return;
  for(const wheel of rig.wheels){
   const front=wheel.key[0]==='f',locked=handbrake&&!front;
   if(angles&&Number.isFinite(angles[wheel.key]))wheel.angle=angles[wheel.key];else if(!locked)wheel.angle=(wheel.angle+speedMps/Math.max(.1,wheel.radius)*dt)%(Math.PI*2);
   wheel.spin.rotation.x=wheel.angle*(wheel.procedural?wheel.side:1);
   if(front)wheel.steer.rotation.y=(wheel.procedural?(wheel.steer.userData.baseRotY||0):0)+steer;
   if(compression)wheel.steer.position.y=wheel.baseY+(compression[wheel.key]||0);
  }
 }
 return{prepare,prepareAsync,cancelAll,update};
});
