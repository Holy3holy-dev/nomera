/* Cosmetic NOMERA deformation. No original MW dent mesh/solver is available.
 * Collision shape, steering, tires and drivetrain are deliberately independent. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraBodyDamage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function dent(point,original,hit){const dx=point[0]-hit.point[0],dy=point[1]-hit.point[1],dz=point[2]-hit.point[2],r=hit.radius||.65,d2=dx*dx+dy*dy+dz*dz;if(d2>=r*r)return point.slice();
  const w=(1-d2/(r*r))**2,next=point.map((v,i)=>v+hit.normal[i]*hit.depth*w),distance=Math.hypot(...next.map((v,i)=>v-original[i]));return distance>.24?original.map((v,i)=>v+(next[i]-v)*.24/distance):next;
 }
 function record(state,point,normal,result){if(result.closingSpeedMps<2.5||result.normalImpulse<300)return;const seq=(state.impactSequence||0)+1;state.impactSequence=seq;const list=state.impactEvents||(state.impactEvents=[]);list.push({seq,point:point.slice(),normal:normal.slice(),severity:clamp((result.closingSpeedMps-2)/28,.04,1)});if(list.length>8)list.shift();}
 function excluded(node,root){for(let n=node;n&&n!==root;n=n.parent)if(n.userData?.isWheelSpinner||/MW_(Hub|Spin)|Wheel|wheel|[Tt]ire|[Rr]im|[Cc]aliper|[Bb]rake|DriverWheel|FittedDriver|Steering|[Ll]icense|[Gg]lass|[Ww]indow|[Ll]ight|[Mm]irror|[Ss]eat/.test(n.name))return true;return false;}
 function hit(T,root,event){if(!root||event.severity<.04)return;globalThis.NomeraVehicleLOD?.beforeDamage(root);root.updateMatrixWorld(true);let d=root.userData.bodyDeformation;if(!d)d=root.userData.bodyDeformation={queue:[],seen:0,changedVertices:0,impacts:0,owned:[]};
  if(d.queue.length>3)return;const inverse=root.matrixWorld.clone().invert(),p=new T.Vector3().fromArray(event.point).applyMatrix4(inverse),normal=new T.Vector3().fromArray(event.normal).transformDirection(inverse),radius=.48+event.severity*.38,depth=.025+event.severity*.15,meshes=[];
  root.traverse(mesh=>{if(!mesh.isMesh||mesh.isSkinnedMesh||excluded(mesh,root)||!mesh.geometry?.attributes.position)return;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(mats.every(m=>m?.transparent&&m.opacity<.7))return;
   if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const matrix=inverse.clone().multiply(mesh.matrixWorld),box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);if(box.distanceToPoint(p)>radius)return;meshes.push({mesh,matrix,back:matrix.clone().invert(),index:0});
  });d.queue.push({meshes,point:p.toArray(),normal:normal.toArray(),radius,depth});d.impacts++;d.lastImpact={point:p.toArray(),normal:normal.toArray(),radius,depth};
 }
 function process(T,root,budget=12000){const d=root?.userData.bodyDeformation;if(!d?.queue.length)return 0;let count=0;const v=new T.Vector3(),o=new T.Vector3(),back=new T.Vector3();
  while(d.queue.length&&count<budget){const task=d.queue[0],job=task.meshes[0];if(!job){d.queue.shift();continue;}const mesh=job.mesh;
   if(!mesh.userData.dentGeometry){const geometry=mesh.geometry.clone(),position=geometry.attributes.position,original=new Float32Array(position.array);mesh.geometry=geometry;mesh.userData.dentGeometry={geometry,original};d.owned.push(geometry);}
   const {geometry,original}=mesh.userData.dentGeometry,pos=geometry.attributes.position;let changed=false;
   while(job.index<pos.count&&count<budget){const i=job.index++;count++;v.fromBufferAttribute(pos,i).applyMatrix4(job.matrix);o.fromArray(original,i*3).applyMatrix4(job.matrix);const next=dent(v.toArray(),o.toArray(),task);if(next[0]!==v.x||next[1]!==v.y||next[2]!==v.z){back.fromArray(next).applyMatrix4(job.back);pos.setXYZ(i,back.x,back.y,back.z);d.changedVertices++;changed=true;}}
   if(changed)pos.needsUpdate=true;if(job.index===pos.count){geometry.computeBoundingBox();geometry.computeBoundingSphere();if(pos.count<12000)geometry.computeVertexNormals();task.meshes.shift();}
  }return count;
 }
 function consume(T,model,state){if(!model||!state)return;const d=model.userData.bodyDeformation,seen=d?.seen||0;for(const event of state.impactEvents||[])if(event.seq>seen)hit(T,model,event);if(model.userData.bodyDeformation)model.userData.bodyDeformation.seen=state.impactSequence||0;}
 function update(e){const T=e.THREE;if(!T)return;const p=e.playerPhysics||e.mwLongitudinal,model=e.playerCarBodyGroup?.children[0]||e.playerCar;if(p){const state=p.state,mirror=!!e.playerPhysics;const events=mirror?{impactSequence:state.impactSequence,impactEvents:state.impactEvents?.map(ev=>({...ev,point:[-ev.point[0],ev.point[1],ev.point[2]],normal:[-ev.normal[0],ev.normal[1],ev.normal[2]]}))}:state;consume(T,model,events);}
  let budget=12000;budget-=process(T,model,budget);for(const car of e.trafficCars||[]){consume(T,car,car.userData.contactBody?.state||car.userData.damageState);if(budget>0)budget-=process(T,car,budget);}for(const rival of e.rivals||[]){const s=rival.physics.state;consume(T,rival.bodyGroup?.children[0]||rival.mesh,{impactSequence:s.impactSequence,impactEvents:s.impactEvents?.map(ev=>({...ev,point:[-ev.point[0],ev.point[1],ev.point[2]],normal:[-ev.normal[0],ev.normal[1],ev.normal[2]]}))});if(budget>0)budget-=process(T,rival.bodyGroup?.children[0]||rival.mesh,budget);}
  e.bodyDamageTelemetry={impacts:model?.userData.bodyDeformation?.impacts||0,vertices:model?.userData.bodyDeformation?.changedVertices||0,queued:model?.userData.bodyDeformation?.queue.length||0,processedVertices:12000-budget};
 }
 function reset(root){globalThis.NomeraVehicleLOD?.beforeDamage(root);root?.traverse(n=>{const d=n.userData.dentGeometry;if(d){d.geometry.attributes.position.array.set(d.original);d.geometry.attributes.position.needsUpdate=true;d.geometry.computeBoundingBox();d.geometry.computeBoundingSphere();d.geometry.computeVertexNormals();}});const d=root?.userData.bodyDeformation;if(d){d.queue=[];d.seen=0;d.changedVertices=0;d.impacts=0;d.lastImpact=null;}}
 return{dent,record,hit,process,consume,update,reset};
});
