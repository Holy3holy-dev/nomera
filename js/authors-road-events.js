/* One streamed incident at a time. Collision responses reuse the normal rigid-body solver. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRoadEvents=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';let enabled=true;const titles=['Ремонт полосы','Стоящий автомобиль','Груз на дороге'];
 function safeLocation(at,speed){const phase=((at%1800)+1800)%1800,exit=1240+Math.min(500,Math.max(120,speed/3.6*4+80));return phase>460&&phase<exit?at+exit-phase:at;}
 function plan(z,speed,index=0){let at=safeLocation(z+Math.max(360,Math.max(0,speed)/3.6*6+120),speed);return{z:at,x:index%2? -6.375:6.375,type:index%3,warningDistance:Math.max(400,speed/3.6*6+150)};}
 function intersects(a,b,pad=0){return Math.abs(a.x-b.x)<a.hw+b.hw+pad&&Math.abs(a.z-b.z)<a.hl+b.hl+pad;}
 function bodies(e){return e.authorsRoadEvents?.event?.objects||[];}
 function bounds(o){return{x:o.body?.state.x??o.x,z:o.body?.state.z??o.z,hw:o.half[0],hl:o.half[2]};}
 function blocked(e,x,z,hw=.95,hl=2.2){return bodies(e).some(o=>intersects(bounds(o),{x,z,hw,hl},2));}
 function gap(e,car){let best=Infinity;for(const o of bodies(e)){const b=bounds(o),u=car.userData,d=b.z-car.position.z-b.hl-(u.halfLength||2.2);if(d>=0&&Math.abs(b.x-car.position.x)<b.hw+(u.halfWidth||.95)+.5)best=Math.min(best,d);}return best;}
 function prepare(e){if(e.authorsRoadEvents||!e.roadChunks||!e.THREE)return;const T=e.THREE,s=e.authorsRoadEvents={nextAt:0,index:0,event:null,disposed:false,resources:[]};s.box=new T.BoxGeometry(1,1,1);s.cone=new T.ConeGeometry(.3,.8,8);s.orange=new T.MeshStandardMaterial({color:0xe99243,roughness:.85});s.white=new T.MeshStandardMaterial({color:0xe7e6cc,roughness:.9});s.dark=new T.MeshStandardMaterial({color:0x293f48,roughness:.7});s.resources.push(s.box,s.cone,s.orange,s.white,s.dark);}
 function retire(e){const s=e.authorsRoadEvents;if(!s?.event)return;const ev=s.event;ev.disposed=true;ev.group.parent?.remove(ev.group);for(const object of ev.objects)root.NomeraBodyDamage?.reset(object.visual);s.event=null;if(s.badge)s.badge.hidden=true;}
 function spawn(e,p){const s=e.authorsRoadEvents,T=e.THREE,R=e.mwLongitudinal?.mwKernel?.RigidBody;let at=p.z;
  for(let i=0;i<12;i++){if(e.trafficCars.every(c=>c.position.y< -500||!intersects({x:p.x,z:at,hw:1.7,hl:20},{x:c.position.x,z:c.position.z,hw:c.userData.halfWidth||1,hl:(c.userData.halfLength||2.2)+28})))break;at+=90;}
  at=safeLocation(at,e.state.speed);
  if(e.trafficCars.some(c=>c.position.y> -500&&intersects({x:p.x,z:at,hw:1.7,hl:20},{x:c.position.x,z:c.position.z,hw:c.userData.halfWidth||1,hl:30})))return false;
  const ev={...p,z:at,group:new T.Group(),objects:[],disposed:false};ev.group.name='RoadIncident';s.event=ev;e.scene.add(ev.group);
  const box=(x,y,z,w,h,d,mat)=>{const m=new T.Mesh(s.box,mat);m.position.set(x,y,z);m.scale.set(w,h,d);ev.group.add(m);return m;};
  const obstacle=(x,z,half,mass,visual)=>{const y=root.NomeraRoadSurface?.highway(x,z).height||0;const body=R?R.createBody({position:[x,y,z],half,mass}):null;if(body&&mass>5000){body.immovable=true;body.state.immovable=true;}if(body)body.collisionPreviousPose={x,y,z};ev.objects.push({x,z,y,half,body,visual});};
  if(p.type===0){for(let i=0;i<2;i++){const z=at+i*11,y=root.NomeraRoadSurface?.highway(p.x,z).height||0,m=box(p.x,y+.45,z,2.5,.9,7,s.white);obstacle(p.x,z,[1.25,.45,3.5],100000,m);}for(let i=-2;i<8;i++){const z=at+i*4,y=root.NomeraRoadSurface?.highway(p.x-1.8,z).height||0,m=new T.Mesh(s.cone,s.orange);m.position.set(p.x-1.8,y+.4,z);ev.group.add(m);}}
  else if(p.type===1){const y=root.NomeraRoadSurface?.highway(p.x,at).height||0,car=new T.Group();car.position.set(p.x,y,at);ev.group.add(car);const body=new T.Mesh(s.box,s.dark);body.scale.set(2,1,4.6);body.position.y=.7;car.add(body);const roof=new T.Mesh(s.box,s.white);roof.scale.set(1.7,.65,2.5);roof.position.y=1.35;car.add(roof);obstacle(p.x,at,[1,.85,2.3],1500,car);
   root.NomeraScene?.eventTemplate?.().then(template=>{if(!template||ev.disposed||s.disposed)return;const raw=template.clone(true);raw.updateMatrixWorld(true);const b=new T.Box3().setFromObject(raw),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3()),k=4.6/size.z;raw.scale.setScalar(k);raw.position.set(-c.x*k,-b.min.y*k,-c.z*k);car.remove(body,roof);car.add(raw);});
  }else{for(let i=0;i<3;i++){const x=p.x+(i%2)*.8-.4,z=at+i*3,y=root.NomeraRoadSurface?.highway(x,z).height||0,m=box(x,y+.55,z,1.5,1.1,1.5,s.orange);obstacle(x,z,[.75,.55,.75],180,m);}}
  if(root.document&&e.container&&!s.badge){s.badge=root.document.createElement('div');s.badge.className='ae-road-warning';s.badge.setAttribute('role','status');e.container.append(s.badge);}s.nextAt=at+650;return true;
 }
 function step(e,dt){if(!e.roadChunks)return;prepare(e);const s=e.authorsRoadEvents;if(!s)return;if(!enabled||e.mode==='drift'||e.forcedBiome==='tunnel'){retire(e);return;}
  if(!s.event&&e.state.z>=s.nextAt){if(spawn(e,plan(e.state.z,e.state.speed,s.index)))s.index++;else s.nextAt=e.state.z+100;}
  const ev=s.event;if(!ev)return;if(e.state.z>ev.z+150||ev.z-e.state.z>2200){retire(e);return;}
  const distance=ev.z-e.state.z,inside=root.NomeraEnvironment?.tunnelBlend(e)>.5;if(s.badge){s.badge.hidden=distance< -20||inside||distance>ev.warningDistance;s.badge.textContent='⚠ '+titles[ev.type]+' · '+Math.max(0,Math.round(distance))+' м · объезд '+(ev.x>0?'слева':'справа');}
  const p=e.mwLongitudinal,R=p?.mwKernel?.RigidBody;
  for(const o of ev.objects){if(R&&o.body&&!o.body.immovable){o.body.collisionPreviousPose={x:o.body.state.x,y:o.body.suspension.y,z:o.body.state.z};R.stepFree(o.body,dt,root.NomeraRoadSurface.highway);o.visual.position.set(o.body.state.x,o.body.suspension.y+ (ev.type===1?0:o.half[1]),o.body.state.z);o.visual.quaternion.fromArray(o.body.suspension.orientation);}
   const b=bounds(o);if(p&&R&&Math.abs(p.z-b.z)<30&&Math.abs(p.x-b.x)<7){const c=p.getVehicleContact(o.body);if(c){p.state.damageTaken=e.state.damageTaken||0;const hit=p._resolve3DContact(o.body,[c],{restitution:.08,friction:.4});Object.assign(e.state,{x:p.x,z:p.z,vx:p.state.vx,speed:Math.max(0,p.state.vz*3.6)});e.state.damageTaken=Math.min(100,p.state.damageTaken||0);}}
   if(!p&&intersects(b,{x:e.state.x,z:e.state.z,hw:1,hl:2.3})&&!e.state.invulnerableTimer){e.state.speed*=.65;e.state.damageTaken=Math.min(100,e.state.damageTaken+2);e.state.invulnerableTimer=.5;}
   if(R)for(const car of e.trafficCars){if(car.position.y< -500||Math.abs(car.position.z-b.z)>12||Math.abs(car.position.x-b.x)>4)continue;const owner=root.NomeraTraffic.owner(e,car),contact=R.contact(R.descriptor(owner),R.descriptor(o.body));if(contact){R.solve(R.descriptor(owner),R.descriptor(o.body),[contact],{restitution:.05,friction:.4});car.userData.contactBody=owner;}}
  }e.roadEventTelemetry={type:ev.type,distance,objects:ev.objects.length,events:s.index,pool:1};
 }
 function destroy(e){const s=e.authorsRoadEvents;if(!s)return;s.disposed=true;retire(e);s.badge?.remove();for(const r of s.resources)r.dispose();delete e.authorsRoadEvents;delete e.roadEventTelemetry;}
 function mount(){const card=root.document.createElement('label');card.className='ae-event-choice';card.innerHTML='<input id="ae-road-events" type="checkbox" checked> Дорожные события на шоссе 3D <small>Ремонт, стоящий автомобиль и груз. Раннее предупреждение и свободный объезд.</small>';root.document.getElementById('ae-race-summary')?.after(card);card.querySelector('input').onchange=e=>enabled=e.target.checked;}
 return{plan,intersects,blocked,gap,step,destroy,mount,setEnabled:v=>enabled=!!v,retire};
});
