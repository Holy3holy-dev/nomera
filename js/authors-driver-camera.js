/* Per-model driver view. Existing interiors/exterior stay visible. Missing
 * interiors receive only a fitted dash/wheel, not a duplicate generic car. */
(()=>{'use strict';if(!window.NOMERA_AUTHORS_PREVIEW)return;
 const profile=e=>window.NomeraCameraProfiles[Car3DManager.identifyCarModel(e.carName||e.carConfig?.carName||'')];
 function seatClearance(T,model,p){model.updateMatrixWorld(true);const ray=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3(),windows=new Set(p.windowNames),worldQ=model.getWorldQuaternion(new T.Quaternion());
  const check=offset=>{let clear=0,nearest=Infinity;origin.fromArray(p.eye);origin.z+=offset;origin.applyMatrix4(model.matrixWorld);for(const x of [-.12,0,.12]){direction.set(x,-.001,1).normalize().applyQuaternion(worldQ);ray.set(origin,direction);ray.far=1.6;const hit=ray.intersectObject(model,true).find(h=>{let n=h.object;while(n){if(!n.visible)return false;n=n.parent;}return h.distance>.025&&!windows.has(h.object.name)&&!h.object.name.includes('DriverSteering')&&(!h.object.material?.transparent||h.object.material.opacity>.8);});if(!hit)clear++;else nearest=Math.min(nearest,hit.distance);}return{clear,nearest};};
  const original=check(0);if(original.clear===3||original.nearest>.25)return 0;let best=original,offset=0;for(const z of [.08,.16,.24]){const candidate=check(z);if(candidate.clear>best.clear){best=candidate;offset=z;}if(best.clear===3)break;}if(offset){p.eye[2]+=offset;p.look[2]+=offset;}return offset;
 }
 function openWindscreen(T,model,p){const altered=[];model.updateMatrixWorld(true);const inverse=model.matrixWorld.clone().invert(),names=new Set(p.windowNames),v=new T.Vector3();
  model.traverse(mesh=>{if(!mesh.isMesh||!names.has(mesh.name)||!mesh.geometry?.attributes.position)return;
   const original=mesh.geometry,pos=original.attributes.position,index=original.index,total=index?.count||pos.count,matrix=inverse.clone().multiply(mesh.matrixWorld),kept=[],groups=[],sourceGroups=original.groups.length?original.groups:[{start:0,count:total,materialIndex:0}];let removed=0;
   for(const group of sourceGroups){const start=kept.length;for(let i=group.start;i<Math.min(total,group.start+group.count);i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),c=new T.Vector3();for(const id of ids)c.add(v.fromBufferAttribute(pos,id).applyMatrix4(matrix));c.multiplyScalar(1/3);
     const glass=c.y>p.eye[1]-.13&&c.y<p.roof+.015&&c.z>p.eye[2]+.18&&c.z<Math.max(p.eye[2]+1.35,p.hood[2]-.2)&&Math.abs(c.x)<p.size[0]*.41;
     if(glass)removed++;else kept.push(...ids);
    }if(kept.length>start)groups.push({start,count:kept.length-start,materialIndex:group.materialIndex});}
   if(removed){const geometry=new T.BufferGeometry();for(const[name,a]of Object.entries(original.attributes))geometry.setAttribute(name,a);geometry.setIndex(kept);for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);geometry.boundingBox=original.boundingBox;geometry.boundingSphere=original.boundingSphere;altered.push({mesh,original,geometry,removed});}
  });return altered;
 }
 function prepare(e,model){if(!model)return null;if(e.authorsCabin?.model===model)return e.authorsCabin;if(window.NomeraWheelRig?.isPending(model)){e.authorsCabin=null;return null;}const T=e.THREE||THREE,raw=profile(e);if(!raw)return null;const id=Car3DManager.identifyCarModel(e.carName||e.carConfig?.carName||''),recipe=window.NomeraSteeringProfiles?.[id],p={...raw,eye:raw.eye.slice(),look:raw.look.slice()};
  window.NomeraVehicleLOD?.restoreFull(model);const rig=window.NomeraSteeringRig?.build(T,model,recipe);if(rig){p.eye[0]=recipe.center[0];p.eye[1]=Math.min(p.roof-.1,Math.max(recipe.center[1]+.23,Math.min(p.eye[1],recipe.center[1]+.42)));p.eye[2]=recipe.center[2]-.56;p.look=[p.eye[0],p.eye[1]-.035,p.eye[2]+32];}
  const seatOffset=seatClearance(T,model,p),cabin={model,p,seatOffset,windows:openWindscreen(T,model,p),inside:false,fallback:null,wheel:rig?.pivot||null,wheelAxis:rig?.axis||new T.Vector3(0,.3,Math.sqrt(.91)),steeringSource:rig?'native triangles':'fitted wheel'};
  let nativeHits=0;if(!rig&&p.fallback){const start=new T.Vector3().fromArray(p.eye).applyMatrix4(model.matrixWorld),target=new T.Vector3(),local=new T.Vector3(),ray=new T.Raycaster();for(const x of [-.10,0,.10])for(const y of [-.04,0,.04]){target.set(p.eye[0]+x,p.eye[1]-.24+y,p.eye[2]+.43).applyMatrix4(model.matrixWorld);ray.set(start,target.clone().sub(start).normalize());ray.far=.85;const hit=ray.intersectObjects(model.children,true).find(h=>h.object.visible&&(!h.object.material?.transparent||h.object.material.opacity>.8));if(hit){local.copy(hit.point).applyMatrix4(model.matrixWorld.clone().invert());if(local.z>p.eye[2]+.1&&local.z<p.eye[2]+.8&&local.y<p.eye[1]-.1)nativeHits++;}}}
  cabin.nativeHits=nativeHits;
  if(!rig){const group=new T.Group();group.name='FittedDriverDash';group.visible=false;const material=new T.MeshStandardMaterial({color:0x05070a,roughness:.85,emissive:0x010204,emissiveIntensity:.1}),radius=Math.max(.145,Math.min(.18,p.size[0]*.082));
   if(p.fallback&&(p.forceFallback||nativeHits<3)){const dash=new T.Mesh(new T.BoxGeometry(p.size[0]*.7,p.forceFallback?.27:.11,.22),material);dash.position.set(0,p.eye[1]-.34,p.eye[2]+.72);group.add(dash);}
   const wheel=new T.Group();wheel.name='FittedDriverWheel';wheel.position.set(p.eye[0],p.eye[1]-.29,p.eye[2]+.56);const face=new T.Group();face.rotation.x=-.3;face.add(new T.Mesh(new T.TorusGeometry(radius,.016,8,32),material));const hub=new T.Mesh(new T.CylinderGeometry(.049,.049,.035,16),material);hub.rotation.x=Math.PI/2;face.add(hub);for(const angle of [Math.PI/2,-Math.PI/2,Math.PI]){const spoke=new T.Mesh(new T.BoxGeometry(.022,radius*.65,.025),material);spoke.position.set(Math.sin(angle)*radius*.42,Math.cos(angle)*radius*.42,0);spoke.rotation.z=-angle;face.add(spoke);}wheel.add(face);group.add(wheel);model.add(group);cabin.fallback=group;cabin.wheel=wheel;
  }
  const physics=e.playerPhysics||e.mwLongitudinal;if(physics)physics.collisionShape=shape(p);
  e.authorsCabin=cabin;model.userData.driverCamera={eye:p.eye.slice(),type:cabin.fallback?'individual fitted wheel':'imported model interior',id};return cabin;
 }
 function sync(e,inside){const model=e.playerCarBodyGroup?.children[0]||e.playerCar,c=prepare(e,model);if(!c)return;if(c.inside!==inside){window.NomeraVehicleLOD?.restoreFull(model);for(const w of c.windows)w.mesh.geometry=inside?w.geometry:w.original;c.inside=inside;}
  if(c.fallback)c.fallback.visible=inside;
  // Any old generic rig is hidden; real mesh visibility is never replaced.
  if(e.cockpitGroup)e.cockpitGroup.visible=false;
 }
 function update(e,mode,dt){const inside=mode==='cockpit'||mode===4,hood=mode==='hood'||mode===2,model=e.playerCarBodyGroup?.children[0]||e.playerCar;sync(e,inside);const c=e.authorsCabin;if(!c||!e.camera)return false;
  const T=e.THREE||THREE,cam=e.camera,targetNear=inside?.025:.2;if(cam.near!==targetNear){cam.near=targetNear;cam.updateProjectionMatrix();}
  if(!inside&&!hood){cam.up.set(0,1,0);e.driverCameraTelemetry=null;return false;}
  model.updateMatrixWorld(true);const position=new T.Vector3().fromArray(inside?c.p.eye:c.p.hood),look=new T.Vector3().fromArray(inside?c.p.look:[c.p.hood[0],c.p.hood[1],c.p.hood[2]+35]);position.applyMatrix4(model.matrixWorld);look.applyMatrix4(model.matrixWorld);
  cam.position.copy(position);if(e.camPos)e.camPos.copy(position);if(e.camLook)e.camLook.copy(look);if(e._camPos)Object.assign(e._camPos,{x:position.x,y:position.y,z:position.z});if(e._camLook)Object.assign(e._camLook,{x:look.x,y:look.y,z:look.z});const q=model.getWorldQuaternion(new T.Quaternion());cam.up.set(0,1,0).applyQuaternion(q);cam.lookAt(look);
  const target=(inside?cam.aspect<1?78:67:cam.aspect<1?76:65);cam.fov+=(target-cam.fov)*(1-Math.exp(-10*Math.max(0,dt)));cam.updateProjectionMatrix();
  const state=e.playerPhysics?.state||e.mwLongitudinal?.state||e.state;if(c.wheel){const roadAngle=state.steerAngleRad??state.steerAngle??(Number.isFinite(e.mwRoadSteering?.angle)?e.mwRoadSteering.angle*Math.PI/180:(e.authorsSteerInput||0)*.32),angle=window.NomeraSteeringRig.angle(roadAngle,!!e.playerPhysics);c.wheel.quaternion.setFromAxisAngle(c.wheelAxis,angle);c.steeringAngle=angle;}
  e.driverCameraTelemetry={id:model.userData.driverCamera.id,mode:inside?'cockpit':'hood',eye:position.toArray(),look:look.toArray(),near:cam.near,fallback:!!c.fallback,animatedWheel:!!c.wheel,steeringSource:c.steeringSource,steeringAngle:c.steeringAngle,seatOffset:c.seatOffset,steeringAxis:c.wheelAxis.toArray(),windshieldTriangles:c.windows.reduce((s,w)=>s+w.removed,0)};return true;
 }
 function recoveryUI(e,p){if(!p?.state||typeof document==='undefined')return;let button=e.authorsRecoverButton;if(!button){const host=e.container?.parentElement;if(!host)return;button=document.createElement('button');button.id='btn-3d-recover';button.textContent='↻ На колёса';button.type='button';Object.assign(button.style,{display:'none',position:'absolute',left:'50%',top:'43%',transform:'translateX(-50%)',minHeight:'48px',minWidth:'170px',padding:'10px 18px',zIndex:'45',border:'1px solid #d9fb6a',borderRadius:'9px',background:'#12202e',color:'#d9fb6a',font:'700 15px system-ui',touchAction:'manipulation'});button.addEventListener('click',event=>{event.stopPropagation();if(p.recoverRollover()){e.resetKeys?.();if(e.mwLongitudinal){e.state.x=p.x;e.state.z=p.z;e.state.vx=0;e.state.speed=0;e.state.yawAngle=p.heading;}e._sync3DMeshes?.(true);e.updateChaseCamera?.(1);}});host.append(button);e.authorsRecoverButton=button;}
  button.style.display=p.state.rollover?.recoverable?'block':'none';
 }
 function shape(p){return{half:[p.size[0]*.47,(p.roof-.12)/2,p.size[2]*.48],center:[0,(p.roof+.12)/2,0]};}
 window.NomeraDriverCamera={shape,prepare,sync,update,recoveryUI,profile};
})();
