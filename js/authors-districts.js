/* District scenery is a pooled visual layer. Road contacts and inputs stay owned
 * by the existing engines; no solid bodies or per-frame geometry are created. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraDistricts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const profiles=[
  {id:'city',name:'ЦЕНТР',subtitle:'ДЕЛОВОЙ КВАРТАЛ',tunnel:'ГОРОДСКОЙ ТУННЕЛЬ',accent:0x59b5c6,portal:0xaebfc5},
  {id:'industrial',name:'ПРОМЗОНА',subtitle:'ПОРТ / ТЕРМИНАЛЫ',tunnel:'ПОРТОВЫЙ ТУННЕЛЬ',accent:0xd79b4e,portal:0x8c979d},
  {id:'rural',name:'ЗАГОРОДНОЕ ШОССЕ',subtitle:'СЕВЕРНЫЕ ХОЛМЫ',tunnel:'ГОРНЫЙ ТУННЕЛЬ',accent:0x8db779,portal:0xc2bea9}
 ];
 const span=1800,period=span*profiles.length,transitionLength=360,mod=(v,n)=>(v%n+n)%n;
 const coordinate=z=>Number.isFinite(Number(z))?Number(z):0;
 function districtAt(z){return profiles[Math.floor(mod(coordinate(z),period)/span)];}
 function transitionAt(z){const at=mod(coordinate(z),period),index=Math.floor(at/span),local=at-index*span,to=profiles[index];
  if(local>=transitionLength)return{from:to,to,weight:1,mixed:false};
  const t=local/transitionLength;return{from:profiles[mod(index-1,profiles.length)],to,weight:t*t*(3-2*t),mixed:true};
 }
 function circuitDistrict(track,s){return districtAt(mod(s,track.totalLength)/track.totalLength*period);}
 function blockPlan(profile,seed=0,length=60,options={}){
  const id=typeof profile==='string'?profile:profile.id,index=profiles.findIndex(p=>p.id===id),p=profiles[Math.max(0,index)],n=mod(seed,13);
  const rows={buildings:[],boxes:[],cylinders:[],crowns:[],hills:[],roofs:[],signs:[]};
  const add=(bucket,x,y,z,w,h,d,color=0xffffff)=>{const item={x,y,z,w,h,d,color,profile:p.id};rows[bucket].push(item);return item;};
  const tree=(x,z,h=6)=>{h*=options.treeScale||1;add('cylinders',x,h*.25,z,.3,h*.5,.3,0x746550);add('crowns',x,h*.78,z,3.3,h*.67,3.2,0x507c49);add('crowns',x+.7,h*.99,z+.5,2.2,h*.42,2.4,0x6d9454);};
  for(const side of[-1,1]){
   if(id==='city'){
    // Offices and low street fronts leave a generous clear strip by the road.
    for(const [i,z]of [-16,15].entries()){
     const h=(16+(n+i*7+Number(side>0)*3)%5*4)*(options.cityScale||1),x=side*(31+(i%2)*4),w=14+(i%2)*3,d=19;
     add('buildings',x,h/2,z,w,h,d,i?0xf2eee5:0xdce9ed);
     add('boxes',x,h+.6,z,w+1,1.2,d+1,0xc5d3d8);
     add('boxes',x+side*2,h+1.8,z+2,4,1.8,3,0x657e8d);
     add('boxes',x-side*(w/2+.5),3.1,z,1.5,.25,12,side<0?0x438a91:0xa76a4f);
     add('boxes',x-side*(w/2+.22),1.5,z,.16,2.5,11,0x29485e);
     for(const dz of [-4,0,4])add('boxes',x-side*(w/2+.34),1.5,z+dz,.12,2.5,.12,0xb6c8c9);
    }
    for(let z=-length/2+6;z<length/2;z+=12)add('boxes',side*16,.12,z,7,.24,11.8,0xb9c5c3).role='paving';
    tree(side*20,-6,5.2);tree(side*22,24,6.3);
    // A compact bus shelter: opaque glazing avoids transparent fill cost.
    add('boxes',side*16.5,2.7,11,3.5,.18,5.4,0x3b6375);
    add('boxes',side*18,1.45,11,.15,2.6,5,0x83a9b9);
    for(const z of [8.7,13.3])add('boxes',side*15.3,1.4,z,.12,2.6,.12,0x456375);
    add('boxes',side*16,.65,11,1.5,.14,3.5,0x6d797b);
    add('boxes',side*16.7,1.02,11,.16,.65,3.5,0x697f82);
    for(const z of [9.6,12.4])add('boxes',side*16,.32,z,.75,.6,.14,0x3c555c);
    add('cylinders',side*15.9,.55,18,.65,1.1,.65,0x3f787c);
    add('cylinders',side*15.9,1.08,18,.72,.12,.72,0x789894);
    for(const z of [-6,24]){const x=side*(z===24?22:20);add('boxes',x,.32,z,3,.64,3,0x9caeab);add('boxes',x,.66,z,2.7,.04,2.7,0x454e3d);}
    for(let z=-length/2+4;z<length/2;z+=15){add('cylinders',side*12.8,.4,z,.18,.8,.18,0x526a73);add('boxes',side*12.8,.64,z,.21,.09,.21,0xc3d4c9);}
   }else if(id==='industrial'){
    const h=8+(n%3),x=side*38;
    add('buildings',x,h/2,-7,30,h,31,0xd5d1c2);
    add('boxes',x,h+.6,-7,31,1.2,32,0x677d85);
    for(const z of [-16,-3,10]){
     add('boxes',x-side*15.1,2.6,z,.25,5,7,0x385361);
     add('boxes',side*20,1.35,z,5,2.7,8,z===-3?0x9b6351:0x527e80);
     for(const dz of [-2.7,-.9,.9,2.7])add('boxes',side*17.46,1.35,z+dz,.1,2.4,.13,z===-3?0xb68069:0x759d9d);
     for(const dx of [-1.2,1.2])add('boxes',side*20+dx,1.35,z+4.03,.12,2.4,.1,0xb3bbb2);
    }
    add('cylinders',side*57,12,8,1.8,24,1.8,0x9b9c97);
    add('cylinders',side*57,22.5,8,1.88,.8,1.88,0xad6657);
    add('cylinders',side*27,3.2,22,5.6,6.4,5.6,0xc2c8be);
    add('cylinders',side*34,3.2,24,5.6,6.4,5.6,0x9eafb0);
    add('boxes',side*29.5,6.5,23,14,.5,.5,0x627e82);
    for(const xOffset of [-4,4])add('boxes',side*44+xOffset,8.5,22,.5,17,.5,0xb98c53);
    add('boxes',side*44,16.8,22,18,.65,1.2,0xc49b59);
    add('boxes',side*17,.1,0,8,.2,length,0x999f98).role='paving';
    for(const z of [15,18]){add('cylinders',side*25,.6,z,.82,1.2,.82,z===15?0x738580:0xa47c58);for(const y of [.24,.94])add('cylinders',side*25,y,z,.87,.09,.87,0xb9bdab);}
    add('boxes',side*25,.15,-24,3,.3,3,0x998464);add('boxes',side*25,1,-24,2.6,1.4,2.6,0xb29a73);
    for(const z of [-22,-10,2,22]){add('boxes',side*13.2,.48,z,.28,.96,.28,0xd0ad52);add('boxes',side*13.2,.7,z,.3,.15,.3,0x3f494b);}
   }else{
    if(n%3!==0){const x=side*(39+n%3*7),h=5.4;add('buildings',x,h/2,8,12,h,10,side<0?0xefe1c7:0xd6e2d8);add('roofs',x,h,8,13,3.4,11,side<0?0x8e6253:0x4b6c6b);}
    for(const [i,z]of [-22,-3,21].entries())tree(side*(21+i*8+(n%3)),z,6.5+(i+n)%3);
    for(let z=-length/2+5;z<length/2;z+=10){add('boxes',side*16,1,z,.16,2,.16,0x9b977d);add('boxes',side*16,.95,z+4.9,.12,.16,9.9,0xb4b498);}
    add('hills',side*(100+n%3*13),4,-4,50,12+n%4*3,57,side<0?0x628557:0x779264);
    add('hills',side*138,7,24,62,20,56,0x6b835d);
    for(const z of [-15,12]){add('crowns',side*19,.55,z,2.8,1.2,2.4,0x6b8952);add('crowns',side*20.2,.45,z+1.2,2.1,1,2.2,0x8b9e62);}
    for(let z=-length/2+3;z<length/2;z+=12){add('boxes',side*12.7,.46,z,.2,.92,.24,0xd5d9c8);add('boxes',side*12.7,.7,z,.22,.18,.27,0x45555b);}
    add('boxes',side*60,.015,-8,19,.03,34,0x7f8c53);
    for(let i=0;i<6;i++)add('boxes',side*(52.5+i*2.8),.05,-8,1.45,.07,32,i%2?0x728b4b:0x9b9c65);
    add('boxes',side*28,.92,18,2.8,.14,1.2,0x927c58);
    for(const z of [17.1,18.9])add('boxes',side*28,.48,z,2.9,.14,.32,0xaaa077);
    for(const dx of [-.9,.9])add('boxes',side*28+dx,.45,18,.2,.9,1,0x6e7159);
   }
  }
  // Same district identity is used by the roadside sign and tunnel portal.
  if(mod(seed,4)===0){add('signs',17.5,4,-12,6,2.8,1,p.accent);add('boxes',17.5,2,-12,.18,4,.18,0x64777d).role='districtPost';}
  return rows;
 }
 function mixColor(a,b,t){const channel=shift=>Math.round((a>>shift&255)*(1-t)+(b>>shift&255)*t);return channel(16)<<16|channel(8)<<8|channel(0);}
 function planAt(z,length=60,seedOverride){
  const transition=transitionAt(z),seed=Number.isFinite(seedOverride)?seedOverride:Math.round(coordinate(z)/length),{from,to,weight:t}=transition;
  if(!transition.mixed)return blockPlan(to,seed,length);
  const options=profile=>({cityScale:profile.id==='city'?(from.id==='city'?1-.4*t:.6+.4*t):1,treeScale:profile.id==='rural'?1-.18*(from.id==='rural'?t:1-t):1});
  const a=blockPlan(from,seed,length,options(from)),b=blockPlan(to,seed,length,options(to)),combined=Object.fromEntries(Object.keys(a).map(k=>[k,[]]));
  // Parcels change identity at staggered points along the route. They are fixed
  // in world space, never blended or moved as the player's camera approaches.
  for(const side of [-1,1]){const jitter=mod(seed*17+(side<0?31:67),11)/10*.08,threshold=(side<0?.28:.64)+jitter,source=t>=threshold?b:a;
   for(const [bucket,rows]of Object.entries(source)){
    if(bucket==='signs'||bucket==='hills')continue;
    for(const item of rows){if(Math.sign(item.x)!==side||item.role==='districtPost')continue;let row=item;
     if(item.role==='paving'){
      const city=from.id==='city'?1-t:to.id==='city'?t:0,industry=from.id==='industrial'?1-t:to.id==='industrial'?t:0,rural=1-city-industry;
      row={...item,x:side*(16*city+17*industry+17.5*rural),w:7*city+8*industry+4*rural,h:.24*city+.2*industry+.07*rural,y:(.24*city+.2*industry+.07*rural)/2,color:mixColor(mixColor(0xb9c5c3,0x999f98,industry/(city+industry||1)),0x80975e,rural)};
     }combined[bucket].push(row);
    }
   }
  }
  // Low hills appear/disappear across several parcels, rather than ending at
  // a hard district line. The road and its contact grid remain untouched.
  const hills=from.id==='rural'?a.hills:to.id==='rural'?b.hills:[],hillWeight=from.id==='rural'?1-t:t;
  if(hillWeight>.06)combined.hills=hills.map(p=>({...p,h:p.h*hillWeight,y:p.y*hillWeight}));
  const label=to===from?a:b;combined.signs=label.signs;combined.boxes.push(...label.boxes.filter(p=>p.role==='districtPost'));
  return combined;
 }
 function clearFootprint(track,x,z,w,d,margin=2.1){const p=track.projectPointToTrack(x,z);return Math.abs(p.lateralOffset)>p.halfWidth+Math.hypot(w,d)*.5+margin;}
 function circuitPlan(track,step=90){
  const combined={buildings:[],boxes:[],cylinders:[],crowns:[],hills:[],roofs:[],signs:[]};
  for(let s=step/2,seed=0;s<track.totalLength;s+=step,seed++){
   const q=track.sampleTrackAtS(s),plan=planAt(mod(s,track.totalLength)/track.totalLength*period,60,seed),tx=Math.sin(q.heading),tz=Math.cos(q.heading);
   for(const [bucket,rows]of Object.entries(plan))for(const item of rows){
    const lateral=item.x+(item.x<0?-1:1)*Math.max(0,q.halfWidth-10),x=q.x+q.nx*lateral+tx*item.z,z=q.z+q.nz*lateral+tz*item.z;
    if(clearFootprint(track,x,z,item.w,item.d))combined[bucket].push({...item,x,z,heading:q.heading,s});
   }
  }
  return combined;
 }
 function own(s,r){s.resources.push(r);return r;}
 function makeAtlas(T,s){
  const canvas=root.document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');
  for(let tile=0;tile<8;tile++){
   const x=tile%4*256,y=Math.floor(tile/4)*256;
   c.fillStyle=['#cbdadf','#a6aaa4','#dddac6','#647883','#183d50','#35464a','#294b3e','#384e59'][tile];c.fillRect(x,y,256,256);
   if(tile===0){for(let row=0;row<8;row++)for(let col=0;col<5;col++){c.fillStyle=(row+col)%5?'#416c85':'#6c94a5';c.fillRect(x+col*51+6,y+row*32+4,39,24);c.fillStyle='#aac9d4';c.fillRect(x+col*51+7,y+row*32+5,3,22);}}
   if(tile===1){c.fillStyle='#9a7768';for(let row=0;row<24;row++)for(let col=0;col<6;col++)c.fillRect(x+col*46+(row%2?23:0),y+row*11,43,2);for(let col=0;col<4;col++){c.fillStyle='#355966';c.fillRect(x+col*64+7,y+30,50,34);c.fillStyle='#c5c8ba';c.fillRect(x+col*64+7,y+46,50,3);}c.fillStyle='#616e73';c.fillRect(x+4,y+112,248,139);c.strokeStyle='#8a9698';for(let j=124;j<249;j+=12){c.beginPath();c.moveTo(x+5,y+j);c.lineTo(x+251,y+j);c.stroke();}}
   if(tile===2){for(let row=0;row<12;row++){c.fillStyle=row%2?'#d3d0bb':'#e2dfcb';c.fillRect(x,y+row*22,256,2);}for(const col of [19,105,191]){c.fillStyle='#f4edda';c.fillRect(x+col,y+53,44,85);c.fillStyle='#365d70';c.fillRect(x+col+5,y+59,34,73);c.fillStyle='#bdcacc';c.fillRect(x+col+20,y+59,3,73);}c.fillStyle='#776551';c.fillRect(x+112,y+156,38,96);}
   if(tile===3){c.strokeStyle='#839397';for(let j=0;j<256;j+=18){c.beginPath();c.moveTo(x,y+j);c.lineTo(x+256,y+j);c.stroke();}}
   if(tile>=4&&tile<=6){const profile=profiles[tile-4];c.strokeStyle='#d9e4da';c.lineWidth=3;c.strokeRect(x+7,y+24,242,208);c.fillStyle='#d7e5d8';c.textAlign='center';c.font='700 17px Arial';c.fillText('NOMERA / ROUTE',x+128,y+61);c.font=tile===6?'900 19px Arial':'900 30px Arial';c.fillText(profile.name,x+128,y+112);c.font='700 17px Arial';c.fillText(profile.subtitle,x+128,y+153);c.font='700 14px Arial';c.fillText(profile.tunnel,x+128,y+189);c.fillStyle='#d5f080';c.fillRect(x+24,y+207,208,5);}
  }
  const texture=own(s,new T.CanvasTexture(canvas));texture.encoding=T.sRGBEncoding;texture.anisotropy=2;s.atlas=texture;return texture;
 }
 function tileGeometry(T,s,tile,plane=false){
  const g=own(s,plane?new T.PlaneGeometry(1,1):new T.BoxGeometry(1,1,1)),uv=g.attributes.uv,n=g.attributes.normal;
  for(let i=0;i<uv.count;i++){const t=!plane&&Math.abs(n.getY(i))>.5?3:tile,u=uv.getX(i),v=uv.getY(i);uv.setXY(i,(t%4+.01+u*.98)/4,(1-Math.floor(t/4)+.01+v*.98)/2);}return g;
 }
 function roofGeometry(T,s){const a=[[-.5,0,-.5],[.5,0,-.5],[0,1,-.5],[-.5,0,.5],[.5,0,.5],[0,1,.5]],p=[];for(const tri of [[0,2,1],[3,4,5],[0,3,5],[0,5,2],[1,2,5],[1,5,4],[0,1,4],[0,4,3]])for(const i of tri)p.push(...a[i]);const g=own(s,new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;}
 function prepare(e){
  if(e.authorsDistricts||!e.authorsLife||!e.authorsDetail||!root.document||!e.THREE)return;
  const T=e.THREE,s=e.authorsDistricts={resources:[],groups:[],chunks:new Map(),hidden:new Map(),materials:new Map(),geometries:new Map(),routed:new WeakSet(),circuit:false,builds:0,recycles:0};
  const map=makeAtlas(T,s);s.facade=own(s,new T.MeshStandardMaterial({map,color:0xffffff,roughness:.88,metalness:.02}));s.color=own(s,new T.MeshLambertMaterial({color:0xffffff}));s.sign=own(s,new T.MeshBasicMaterial({map,side:T.DoubleSide,toneMapped:false,color:0xffffff}));
  // Portal boards are ordinary meshes: keep their shader cache independent
  // from instanced roadside signs in the bundled renderer.
  s.portalSign=own(s,s.sign.clone());
  s.buildings=profiles.map((p,i)=>tileGeometry(T,s,i));s.signs=profiles.map((p,i)=>tileGeometry(T,s,i+4,true));s.box=own(s,new T.BoxGeometry(1,1,1));s.cylinder=own(s,new T.CylinderGeometry(.5,.5,1,10));s.crown=own(s,new T.IcosahedronGeometry(.5,1));s.hill=own(s,new T.IcosahedronGeometry(.5,1));s.roof=roofGeometry(T,s);s.dummy=new T.Object3D();s.colorValue=new T.Color();
  s.portalSigns=s.signs.map(g=>own(s,g.clone().scale(6,1.5,1)));
  s.portalMaterials=profiles.map(p=>{const m=own(s,e.authorsDetail.concrete.clone());m.color.setHex(p.portal);return m;});
  if(e.track){const rail=e.scene.getObjectByName('CircuitGuardrail');if(rail){s.materials.set(rail,rail.material);rail.material=own(s,new T.MeshStandardMaterial({color:0xa5b5b5,roughness:.72,metalness:.25,side:T.DoubleSide}));}}
  root.NomeraScenePerf?.destroy(e);
 }
 function hide(s,node){if(node&&!s.hidden.has(node))s.hidden.set(node,node.visible);if(node)node.visible=false;}
 function mesh(e,group,s,name,geometry,material,capacity){const m=new e.THREE.InstancedMesh(geometry,material,Math.max(1,capacity));
  // Allocate colors before the first render, including initially empty profiles.
  // The bundled Three renderer caches one instancing-color shader per material.
  m.instanceColor=new e.THREE.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)*3).fill(1),3);
  m.name='District'+name;m.frustumCulled=false;m.userData.authorsDistrictDecoration=true;group.add(m);return m;}
 function batches(e,group,capacities){const s=e.authorsDistricts,r={};
  r.buildings=profiles.map((p,i)=>mesh(e,group,s,'Buildings_'+p.id,s.buildings[i],s.facade,capacities.buildings));
  for(const [bucket,geo]of [['boxes',s.box],['cylinders',s.cylinder],['crowns',s.crown],['hills',s.hill],['roofs',s.roof]])r[bucket]=mesh(e,group,s,bucket,geo,s.color,capacities[bucket]);
  r.signs=profiles.map((p,i)=>mesh(e,group,s,'Signs_'+p.id,s.signs[i],s.sign,capacities.signs));return r;
 }
 function fill(e,m,rows,circuit=false,chunkZ=0){
  const s=e.authorsDistricts,d=s.dummy;m.count=Math.min(rows.length,m.instanceMatrix.count);m.visible=m.count>0;
  for(let i=0;i<m.count;i++){const p=rows[i],ground=circuit?(e.roadSurface?.sample(p.x,p.z)?.height||0):(e.mwLongitudinal?root.NomeraRoadSurface?.highway(p.x,chunkZ+p.z)?.height||0:0);
   d.position.set(circuit?e.toThreeX(p.x):p.x,ground+p.y,circuit?e.toThreeZ(p.z):p.z);d.rotation.set(0,(circuit?-(p.heading||0):0)+(m.name.includes('Signs_')?Math.PI:0),0);d.scale.set(p.w,p.h,p.d);d.updateMatrix();m.setMatrixAt(i,d.matrix);
   // Sign pixels carry their own district colors; other batches use opaque tint.
   m.setColorAt(i,s.colorValue.setHex(m.name.includes('Signs_')?0xffffff:p.color).convertSRGBToLinear());
  }m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;
 }
 function paint(e,batch,plan,circuit=false,z=0){for(const [bucket,rows]of Object.entries(plan)){if(bucket==='buildings'||bucket==='signs')batch[bucket].forEach((m,i)=>fill(e,m,rows.filter(p=>p.profile===profiles[i].id),circuit,z));else fill(e,batch[bucket],rows,circuit,z);}}
 function hideOldHighway(e,chunk){const s=e.authorsDistricts,env=e.authorsEnvironment?.chunks.get(chunk),summer=e.authorsLife?.chunks.get(chunk),route=e.authorsRoute?.chunks.get(chunk);
  if(env)for(const node of env.group.children)if(node.userData.authorsBuilding)hide(s,node);
  if(summer)hide(s,summer);if(route)route.group.traverse(n=>hide(s,n));
 }
 function stylePortal(e,chunk,profile){const s=e.authorsDistricts,row=e.authorsDetail?.chunks.get(chunk),i=profiles.indexOf(profile);if(!row)return false;
  for(const entry of row.portals){const board=entry.board;if(!s.materials.has(board))s.materials.set(board,board.material);if(!s.geometries.has(board))s.geometries.set(board,board.geometry);board.material=s.portalSign;board.geometry=s.portalSigns[i];
   // Keep the original portal's position, dimensions and boundary visibility.
   const concrete=entry.group.getObjectByName('PortalConcreteFrame');if(concrete){if(!s.materials.has(concrete))s.materials.set(concrete,concrete.material);concrete.material=s.portalMaterials[i];}}
  return true;
 }
 function circuit(e){
  const T=e.THREE,s=e.authorsDistricts,plan=circuitPlan(e.track),group=new T.Group();group.name='NomeraCircuitDistricts';const caps=Object.fromEntries(Object.entries(plan).map(([k,v])=>[k,v.length]));const batch=batches(e,group,caps);paint(e,batch,plan,true);e.scene.add(group);s.groups.push(group);s.circuit=true;s.circuitPlan=plan;s.builds++;
 }
 function circuitWayfinding(e){const s=e.authorsDistricts;
  for(const group of e.authorsRoute?.groups||[]){if(s.routed.has(group))continue;s.routed.add(group);group.traverse(n=>{
   if(n.name==='RockportWaterTower')n.traverse(child=>hide(s,child));
   if(n.name!=='RockportRouteSign')return;const face=n.children[0],route=e.authorsRoute;if(!face||![route.planes[2],route.planes[3]].includes(face.geometry))return;
   const point=n.getWorldPosition(new e.THREE.Vector3()),at=e.track.projectPointToTrack(e.toThreeX(point.x),e.toThreeZ(point.z)),profile=circuitDistrict(e.track,at.s),i=profiles.indexOf(profile);
   s.materials.set(face,face.material);s.geometries.set(face,face.geometry);face.material=s.portalSign;face.geometry=s.signs[i];
  });}
 }
 function update(e){
  if(root.NomeraPlayground?.isPractice(e))return;
  prepare(e);const s=e.authorsDistricts;if(!s)return;
  if(e.track){if(!s.circuit)circuit(e);for(const group of e.authorsEnvironment?.groups||[])if(group.name==='RockportCircuitDistrict')hide(s,group);for(const group of e.authorsLife?.groups||[])if(group.name==='SummerCircuit')hide(s,group);
   circuitWayfinding(e);
  }
  if(e.roadChunks&&e.authorsWorld?.ready){let budget=1;
   for(const [chunk,world]of e.authorsWorld.chunks){let row=s.chunks.get(chunk);
    if(!row&&budget-- >0){const group=new e.THREE.Group();group.name='NomeraHighwayDistrict';world.scenery.add(group);row={group,batch:batches(e,group,{buildings:8,boxes:112,cylinders:24,crowns:24,hills:8,roofs:8,signs:4}),z:null,profile:null};s.chunks.set(chunk,row);s.groups.push(group);s.builds++;}
    if(!row)continue;hideOldHighway(e,chunk);
    if(row.z!==chunk.position.z){const profile=districtAt(chunk.position.z),plan=planAt(chunk.position.z,e.chunkLength||60);paint(e,row.batch,plan,false,chunk.position.z);if(row.z!==null)s.recycles++;row.z=chunk.position.z;row.profile=profile;row.portalZ=null;}
    if(row.portalZ!==chunk.position.z&&stylePortal(e,chunk,row.profile))row.portalZ=chunk.position.z;
    const distance=chunk.position.z-(e.state?.z||0);row.group.visible=distance> -100&&distance<Math.min(340,e.camera?.far||340);
   }
  }
  const position=e.track?mod(e.playerProgress?.lastS||0,e.track.totalLength)/e.track.totalLength*period:e.state?.z||0,district=districtAt(position),transition=transitionAt(position);
  e.districtTelemetry={district:district.id,name:district.name,transition:{from:transition.from.id,to:transition.to.id,weight:transition.weight,mixed:transition.mixed},pool:s.chunks.size,circuit:s.circuit,builds:s.builds,recycles:s.recycles,atlasBytes:1024*512*4,resources:s.resources.length,additionalLights:0,physicsChanged:false};
 }
 function destroy(e){const s=e.authorsDistricts;if(!s)return;for(const [node,visible]of s.hidden)node.visible=visible;for(const [node,material]of s.materials)node.material=material;for(const [node,geometry]of s.geometries)node.geometry=geometry;
  for(const group of s.groups){group.traverse(n=>{if(n.isInstancedMesh)n.dispose?.();});group.parent?.remove(group);}for(const resource of s.resources)resource.dispose();s.chunks.clear();delete e.authorsDistricts;delete e.districtTelemetry;
 }
 return{profiles,span,period,transitionLength,districtAt,transitionAt,circuitDistrict,blockPlan,planAt,clearFootprint,circuitPlan,prepare,update,destroy};
});
