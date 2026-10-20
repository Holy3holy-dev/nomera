/* Per-model driver view. Existing interiors/exterior stay visible. Missing
 * interiors receive only a fitted dash/wheel, not a duplicate generic car. */
(()=>{'use strict';if(!window.NOMERA_AUTHORS_PREVIEW)return;
 const profile=e=>window.NomeraCameraProfiles[Car3DManager.identifyCarModel(e.carName||e.carConfig?.carName||'')];
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
 function prepare(e,model){if(!model)return null;if(e.authorsCabin?.model===model)return e.authorsCabin;const T=e.THREE||THREE,raw=profile(e);if(!raw)return null;const p={...raw,eye:raw.eye.slice(),look:raw.look.slice()};if(p.steering){p.eye[2]=p.steering.center[2]-.56;p.look[2]=p.eye[2]+32;}
  const cabin={model,p,windows:openWindscreen(T,model,p),inside:false,fallback:null,wheel:null};
  let nativeHits=0;if(p.fallback){const start=new T.Vector3().fromArray(p.eye).applyMatrix4(model.matrixWorld),target=new T.Vector3(),local=new T.Vector3(),ray=new T.Raycaster();for(const x of [-.10,0,.10])for(const y of [-.04,0,.04]){target.set(p.eye[0]+x,p.eye[1]-.24+y,p.eye[2]+.43).applyMatrix4(model.matrixWorld);ray.set(start,target.clone().sub(start).normalize());ray.far=.85;const hit=ray.intersectObjects(model.children,true).find(h=>h.object.visible&&(!h.object.material?.transparent||h.object.material.opacity>.8));if(hit){local.copy(hit.point).applyMatrix4(model.matrixWorld.clone().invert());if(local.z>p.eye[2]+.1&&local.z<p.eye[2]+.8&&local.y<p.eye[1]-.1)nativeHits++;}}}
  cabin.nativeHits=nativeHits;
  if(p.fallback&&(p.forceFallback||nativeHits<3)){const group=new T.Group();group.name='FittedDriverDash';group.visible=false;const material=new T.MeshStandardMaterial({color:0x10151b,roughness:.82,emissive:0x030509,emissiveIntensity:.1}),dash=new T.Mesh(new T.BoxGeometry(p.size[0]*.7,p.forceFallback?.35:.13,.22),material);dash.position.set(0,p.eye[1]-.32,p.eye[2]+.69);group.add(dash);
   const wheel=new T.Group();wheel.name='FittedDriverWheel';wheel.position.set(p.eye[0],p.eye[1]-.25,p.eye[2]+.56);const rim=new T.Mesh(new T.TorusGeometry(.145,.018,8,24),material);wheel.add(rim);wheel.add(new T.Mesh(new T.BoxGeometry(.24,.022,.025),material));group.add(wheel);model.add(group);cabin.fallback=group;cabin.wheel=wheel;
  }else if(p.steering){const parts=[];model.traverse(n=>{if(p.steering.names.includes(n.name))parts.push(n)});if(parts.length){const pivot=new T.Group();pivot.name='DriverWheelPivot';pivot.position.fromArray(p.steering.center);model.add(pivot);model.updateMatrixWorld(true);for(const mesh of parts)pivot.attach(mesh);cabin.wheel=pivot;}}
  const physics=e.playerPhysics||e.mwLongitudinal;if(physics)physics.collisionShape=shape(p);
  e.authorsCabin=cabin;model.userData.driverCamera={eye:p.eye.slice(),type:cabin.fallback?'fitted fallback':'imported model interior',id:Car3DManager.identifyCarModel(e.carName||e.carConfig?.carName)};return cabin;
 }
 function sync(e,inside){const model=e.playerCarBodyGroup?.children[0]||e.playerCar,c=prepare(e,model);if(!c)return;if(c.inside!==inside){for(const w of c.windows)w.mesh.geometry=inside?w.geometry:w.original;c.inside=inside;}
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
  const state=e.playerPhysics?.state||e.mwLongitudinal?.state||e.state;if(c.wheel)c.wheel.rotation.z=-(state.steerAngleRad??state.steerAngle??0)*7;
  e.driverCameraTelemetry={id:model.userData.driverCamera.id,mode:inside?'cockpit':'hood',eye:position.toArray(),look:look.toArray(),near:cam.near,fallback:!!c.fallback,windshieldTriangles:c.windows.reduce((s,w)=>s+w.removed,0)};return true;
 }
 function recoveryUI(e,p){if(!p?.state||typeof document==='undefined')return;let button=e.authorsRecoverButton;if(!button){const host=e.container?.parentElement;if(!host)return;button=document.createElement('button');button.id='btn-3d-recover';button.textContent='↻ На колёса';button.type='button';Object.assign(button.style,{display:'none',position:'absolute',left:'50%',top:'43%',transform:'translateX(-50%)',minHeight:'48px',minWidth:'170px',padding:'10px 18px',zIndex:'45',border:'1px solid #d9fb6a',borderRadius:'9px',background:'#12202e',color:'#d9fb6a',font:'700 15px system-ui',touchAction:'manipulation'});button.addEventListener('click',event=>{event.stopPropagation();if(p.recoverRollover()){e.resetKeys?.();if(e.mwLongitudinal){e.state.x=p.x;e.state.z=p.z;e.state.vx=0;e.state.speed=0;e.state.yawAngle=p.heading;}e._sync3DMeshes?.(true);e.updateChaseCamera?.(1);}});host.append(button);e.authorsRecoverButton=button;}
  button.style.display=p.state.rollover?.recoverable?'block':'none';
 }
 function shape(p){return{half:[p.size[0]*.47,(p.roof-.12)/2,p.size[2]*.48],center:[0,(p.roof+.12)/2,0]};}
 window.NomeraDriverCamera={shape,prepare,sync,update,recoveryUI,profile};
})();
