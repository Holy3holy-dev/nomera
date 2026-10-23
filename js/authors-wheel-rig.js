/* Animated imported wheels. Geometry stays in model coordinates; the original
 * tire/rim triangles and materials are moved to four hub pivots, never replaced. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraWheelRig=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const rigs=new WeakMap(),pending=new WeakMap(),jobs=new Set();
 // The narrowest principal axis of a tire is its axle. Imported cars can
 // contain authored camber/toe, including wheels tilted inside merged meshes.
 function* axle(T,anchor){
  const mean=[0,0,0],a=Array.from({length:3},()=>[0,0,0]),v=[[1,0,0],[0,1,0],[0,0,1]],edge=new T.Vector3(),other=new T.Vector3();
  let n=0,totalArea=0;
  // Integrate triangle surface moments, rather than counting vertices. Uneven
  // tread tessellation must not tilt the axle (notably on the RS7 model).
  for(const tri of anchor.triangles){
   if((n++&2047)===0)yield;
   const p=tri.ids.map(i=>anchor.vertices[i]),area=edge.copy(p[1]).sub(p[0]).cross(other.copy(p[2]).sub(p[0])).length()*.5;
   if(area<1e-15)continue;
   const d=p.map(p=>[p.x-anchor.center.x,p.y-anchor.center.y,p.z-anchor.center.z]),sum=[0,1,2].map(k=>d[0][k]+d[1][k]+d[2][k]);
   totalArea+=area;
   for(let r=0;r<3;r++){
    mean[r]+=area*sum[r]/3;
    for(let s=0;s<3;s++)a[r][s]+=area*(sum[r]*sum[s]+d[0][r]*d[0][s]+d[1][r]*d[1][s]+d[2][r]*d[2][s])/12;
   }
  }
  if(totalArea<1e-15)return new T.Vector3(1,0,0);
  for(let k=0;k<3;k++)mean[k]/=totalArea;
  for(let r=0;r<3;r++)for(let s=0;s<3;s++)a[r][s]=a[r][s]/totalArea-mean[r]*mean[s];
  for(let iteration=0;iteration<24;iteration++){
   let p=0,q=1;for(let r=0;r<3;r++)for(let s=r+1;s<3;s++)if(Math.abs(a[r][s])>Math.abs(a[p][q])){p=r;q=s;}
   if(Math.abs(a[p][q])<1e-13)break;
   const angle=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),co=Math.cos(angle),si=Math.sin(angle);
   for(let r=0;r<3;r++){const x=a[r][p],y=a[r][q];a[r][p]=co*x-si*y;a[r][q]=si*x+co*y;}
   for(let r=0;r<3;r++){const x=a[p][r],y=a[q][r];a[p][r]=co*x-si*y;a[q][r]=si*x+co*y;}
   for(let r=0;r<3;r++){const x=v[r][p],y=v[r][q];v[r][p]=co*x-si*y;v[r][q]=si*x+co*y;}
  }
  let k=0;for(let i=1;i<3;i++)if(a[i][i]<a[k][k])k=i;
  const axis=new T.Vector3(v[0][k],v[1][k],v[2][k]).normalize();if(axis.x<0)axis.negate();return axis;
 }
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
  result.setIndex(newIndices);if(triangles.some((t,i)=>t.start!==i*3)||geometry.userData.nomeraSourceTriangleStarts){const previous=geometry.userData.nomeraSourceTriangleStarts;result.userData.nomeraSourceTriangleStarts=new Uint32Array(triangles.map(t=>previous?.[t.start/3]??t.start));}result.computeBoundingBox();result.computeBoundingSphere();return result;
 }
 function* build(T,model){
  if(rigs.has(model))return rigs.get(model);
  model.updateMatrixWorld(true);
  const existing=[];model.traverse(node=>{if(node.userData?.isWheelSpinner)existing.push(node)});
  if(existing.length){
   const inverse=model.matrixWorld.clone().invert(),radius=model.userData.spec?.wheelR||.33;
   const wheels=existing.map(spin=>{const steer=spin.parent,center=steer.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);return{spin,steer,center,key:(center.z>0?'f':'r')+(center.x>0?'l':'r'),radius,baseY:steer.position.y,angle:spin.rotation.x,procedural:true,side:steer.userData.side||1};});
   const rig={wheels,imported:false};rigs.set(model,rig);return rig;
  }
  const inverse=model.matrixWorld.clone().invert(),bounds=new T.Box3();
  const candidates=[],anchors={};
  const point=new T.Vector3();
  const meshList=[];model.traverseVisible(node=>{
   if(!node.isMesh||!node.geometry?.attributes.position||node.isSkinnedMesh)return;
   // Generated plate/lighting/interactive helpers do not define the car's
   // ground or wheelbase, and must never become spinning geometry.
   for(let p=node;p&&p!==model;p=p.parent){
    if(p.userData?.authorsAccessory||p.userData?.isInteractiveRigNode||p.userData?.isLicensePlate||/^(?:GLB_InteractiveRig|Door_FL_Pivot|Door_FR_Pivot|Door_CavityGroup|Hood_Pivot|EngineBayGroup|Trunk_Pivot|SubwooferGroup|GLB_SpoilerGroup|GLB_Spoiler|SpoilerGroup|GLB_BodykitGroup|GLB_RoofScoopGroup|GLB_HoodGroup|SGUGroup|GLB_NeonTubes|NeonGroup|LicensePlatesGroup|GLB_FrontLicensePlate|GLB_RearLicensePlate|FrontLicensePlate|RearLicensePlate|ChassisUndertray|GLB_Undertray|ShowroomHeadlightCones|ShowroomHeadlightFlares|ShowroomTaillightFlares|HeadlightsGroup)$/i.test(p.name))return;
   }
   meshList.push({node,matrix:inverse.clone().multiply(node.matrixWorld)});
  });
  // Accumulate actual model-local vertices. Transforming expanded mesh/world
  // AABBs can inflate rotated geometry enough to hide otherwise valid tires.
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
   // Some indexed GLBs share an oversized position accessor containing unused
   // vertices. Only rendered components define the car's ground and dimensions.
   for(const component of components.values())bounds.union(component.box);
   candidates.push({node,geometry,matrix,triangles,vertices,components});
  }
  const size=bounds.getSize(new T.Vector3());
  for(const{vertices,components}of candidates)for(const component of components.values()){
    const span=component.box.getSize(new T.Vector3()),center=component.box.getCenter(new T.Vector3()),radius=(span.y+span.z)*.25;
    if(span.x<.62&&span.y>.32&&span.y<1.1&&span.z/span.y>.82&&span.z/span.y<1.18&&center.y>.08&&center.y-bounds.min.y<radius*1.4&&center.y<size.y*.49&&Math.abs(center.x)>Math.max(.4,size.x*.19)&&Math.abs(center.z)>size.z*.15){
     const key=(center.z>0?'f':'r')+(center.x>0?'l':'r');
     if(!anchors[key]||radius>anchors[key].radius)anchors[key]={center,radius,ids:component.ids,triangles:component.triangles,vertices};
    }
  }
  // A validated tire at each hub prevents guessing from body/chrome meshes.
  if(Object.keys(anchors).length!==4){const rig={wheels:[],imported:true,reason:'missing circular wheel geometry'};rigs.set(model,rig);return rig;}
  const wheels=[];
  for(const [key,anchor]of Object.entries(anchors)){
   const hub=anchor.center,steer=new T.Group(),spin=new T.Group();
   const rollAxis=new T.Vector3(1,0,0),axis=yield* axle(T,anchor),bindQuaternion=new T.Quaternion().setFromUnitVectors(rollAxis,axis);
   let captureRadius=0;const offset=new T.Vector3();
   for(const i of anchor.ids){offset.copy(anchor.vertices[i]).sub(hub);const along=offset.dot(axis);captureRadius=Math.max(captureRadius,Math.sqrt(Math.max(0,offset.lengthSq()-along*along)));}
   spin.quaternion.copy(bindQuaternion);
   steer.name='MW_Hub_'+key;spin.name='MW_Spin_'+key;steer.position.copy(hub);steer.add(spin);model.add(steer);
   wheels.push({key,steer,spin,center:hub,radius:anchor.radius,captureRadius,baseY:hub.y,angle:0,axis,bindQuaternion,rollAxis,rollQuaternion:new T.Quaternion()});
  }
  const byKey=Object.fromEntries(wheels.map(w=>[w.key,w]));
  for(const {node,geometry,matrix,triangles,vertices,components}of candidates){
   yield;
   const caliperMaterials=new Set();
   const fixedPart=(material,component,wheel)=>{
    const mats=Array.isArray(node.material)?node.material:[node.material];
    const label=node.name+' '+(node.userData._origMatNames?.[material]||'')+' '+(mats[material]?.name||'');
    if(/suspension|wishbone|control.?arm|strut|shock.?absorber|brake.?shoe/i.test(label))return true;
    if(!component.axleBox){
     component.axleBox=new T.Box3();const inverseBind=wheel.bindQuaternion.clone().invert(),v=new T.Vector3();
     for(const i of component.ids)component.axleBox.expandByPoint(v.copy(vertices[i]).sub(wheel.center).applyQuaternion(inverseBind));
    }
    const axleSpan=component.axleBox.getSize(new T.Vector3()),axleCenter=component.axleBox.getCenter(new T.Vector3());
    const radialLimit=Math.hypot(Math.max(Math.abs(component.axleBox.min.y),Math.abs(component.axleBox.max.y)),Math.max(Math.abs(component.axleBox.min.z),Math.abs(component.axleBox.max.z)));
    // A narrow offset arc inside the rim is a caliper even in files naming it
    // body_red/wheel_red. Keep named spokes/rims and full concentric discs.
    if(!/rim|spoke|tire|tyre/i.test(label)&&Math.hypot(axleCenter.y,axleCenter.z)>wheel.radius*.25&&radialLimit<wheel.radius*.86&&
       Math.max(axleSpan.y,axleSpan.z)>wheel.radius*.3&&Math.max(axleSpan.y,axleSpan.z)>Math.min(axleSpan.y,axleSpan.z)*1.8){caliperMaterials.add(material);return true;}
    // Some GLBs label both round discs and offset calipers "Calipers".
    // Recognize a complete concentric disc before applying material labels.
    const span=component.box.getSize(new T.Vector3()),center=component.box.getCenter(new T.Vector3());
    if(/cal+iper|etrier|суппорт/i.test(label)||node.userData._stylingRoles?.[material]==='brake'){
     const centered=Math.hypot(center.y-wheel.center.y,center.z-wheel.center.z)<Math.max(.01,wheel.radius*.03);
     if(centered&&span.y>wheel.radius*.4&&span.y<wheel.radius*1.6&&span.z/span.y>.97&&span.z/span.y<1.03)return false;
    }
    // Caliper wins over a mixed authored name such as Disc_Scale_Calipers.
    if(/cal+iper|etrier|суппорт/i.test(label))return true;
    if(node.userData.isBrakeRotor||/rotor|brake.?dis[ck]|bremsscheibe/i.test(label))return false;
    return node.userData._stylingRoles?.[material]==='brake';
   };
   for(const component of components.values())for(const wheel of wheels){
    const hub=wheel.center,radius=wheel.captureRadius*1.045,offset=new T.Vector3();
    if([...component.ids].every(i=>{offset.copy(vertices[i]).sub(hub);const along=offset.dot(wheel.axis);return Math.abs(along)<.34&&offset.lengthSq()-along*along<=radius*radius;})){
     const fixedMaterials=new Map();
     for(const tri of component.triangles){
      if(!fixedMaterials.has(tri.material)){
       const fixed=fixedPart(tri.material,component,wheel),center=component.axleBox?.getCenter(new T.Vector3());
       // Painted arch fragments can fit inside a wheel's volume. Keep these
       // on the body; concentric geometry and identified calipers are eligible.
       const bodyFragment=!fixed&&node.userData._stylingRoles?.[tri.material]==='body'&&center&&Math.hypot(center.y,center.z)>wheel.radius*.1;
       fixedMaterials.set(tri.material,{fixed,bodyFragment});
      }
      const part=fixedMaterials.get(tri.material);tri.key=part.bodyFragment?null:wheel.key;tri.spin=!part.fixed;
     }break;
    }
   }
   // Detached lettering/bolts can share an unnamed caliper material. Follow
   // the identified arc, but leave concentric discs using that material free.
   if(caliperMaterials.size)for(const component of components.values()){
    if(!component.axleBox)continue;
    const center=component.axleBox.getCenter(new T.Vector3()),key=component.triangles[0]?.key;
    if(key&&Math.hypot(center.y,center.z)>byKey[key].radius*.12)for(const tri of component.triangles)if(caliperMaterials.has(tri.material))tri.spin=false;
   }
   if(!triangles.some(tri=>tri.key))continue;
   const buckets=new Map();for(const tri of triangles){const key=tri.key?tri.key+(tri.spin?':spin':':fixed'):'body';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(tri);}
   if(buckets.has('body'))node.geometry=compact(T,geometry,buckets.get('body'));else node.parent.remove(node);
   for(const [bucket,tris]of buckets){if(bucket==='body')continue;const [key,part]=bucket.split(':'),wheel=byKey[key];
    const sliced=compact(T,geometry,tris);sliced.applyMatrix4(matrix);sliced.translate(-wheel.center.x,-wheel.center.y,-wheel.center.z);
    if(matrix.determinant()<0){const index=sliced.index;for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}index.needsUpdate=true;}
    if(part==='spin')sliced.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(wheel.bindQuaternion.clone().invert()));
    const mesh=new T.Mesh(sliced,node.material);mesh.name=node.name+'_'+bucket;if(Array.isArray(node.userData._stylingRoles))mesh.userData._stylingRoles=node.userData._stylingRoles.slice();if(Array.isArray(node.userData._origMatNames))mesh.userData._origMatNames=node.userData._origMatNames.slice();mesh.castShadow=node.castShadow;mesh.receiveShadow=node.receiveShadow;
    (part==='spin'?wheel.spin:wheel.steer).add(mesh);
   }
  }
  const rig={wheels,imported:true};rigs.set(model,rig);return rig;
 }
 function prepare(T,model){const iterator=build(T,model);let result;do{result=iterator.next();}while(!result.done);globalThis.NomeraVehicleLOD?.afterWheels(T,model);globalThis.NomeraVehicleFinish?.wheels(T,model,result.value);return result.value;}
 function prepareAsync(T,model,target=[]){
  if(pending.has(model))return pending.get(model);
  target.splice(0,target.length);
  const task={wheels:target,pending:true,imported:true,cancelled:false,timer:null},iterator=build(T,model);
  const pump=()=>{
   const start=performance.now();let result;
   do{if(task.cancelled)return;result=iterator.next();}while(!result.done&&performance.now()-start<5);
   if(result.done){target.splice(0,target.length,...result.value.wheels);task.imported=result.value.imported;task.reason=result.value.reason;task.pending=false;jobs.delete(task);pending.delete(model);globalThis.NomeraVehicleLOD?.afterWheels(T,model);globalThis.NomeraVehicleFinish?.wheels(T,model,result.value);}
   else task.timer=setTimeout(pump,0);
  };
  task.cancel=()=>{task.cancelled=true;clearTimeout(task.timer);iterator.return();jobs.delete(task);pending.delete(model);};
  pending.set(model,task);jobs.add(task);pump();return task;
 }
 function cancelAll(){for(const job of [...jobs])job.cancel();}
 function update(rig,{dt=0,speedMps=0,steer=0,steerAngles=null,angles=null,compression=null,handbrake=false,swapSides=false}={}){
  if(!rig)return;
  for(const wheel of rig.wheels){
   const front=wheel.key[0]==='f',locked=handbrake&&!front,key=swapSides?wheel.key[0]+(wheel.key[1]==='l'?'r':'l'):wheel.key;
   if(angles&&Number.isFinite(angles[key]))wheel.angle=angles[key];else if(!locked)wheel.angle=(wheel.angle+speedMps/Math.max(.1,wheel.radius)*dt)%(Math.PI*2);
   if(wheel.bindQuaternion)wheel.spin.quaternion.copy(wheel.bindQuaternion).multiply(wheel.rollQuaternion.setFromAxisAngle(wheel.rollAxis,wheel.angle));
   else wheel.spin.rotation.x=wheel.angle*(wheel.procedural?wheel.side:1);
   if(front)wheel.steer.rotation.y=(wheel.procedural?(wheel.steer.userData.baseRotY||0):0)+(Number.isFinite(steerAngles?.[key])?steerAngles[key]:steer);
   if(compression)wheel.steer.position.y=wheel.baseY+(compression[key]||0);
  }
 }
 return{prepare,prepareAsync,cancelAll,cancel:model=>pending.get(model)?.cancel(),update,isPending:model=>pending.has(model)};
});
