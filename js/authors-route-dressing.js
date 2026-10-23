/* Reusable signs and district landmarks. Decoration stays outside road contact. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRouteDressing=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 function cornerPlan(track){const out=[];for(let s=30;s<track.totalLength-60;s+=30){const q=track.sampleTrackAtS(s);if(Math.abs(q.curvature)<.006||out.length&&s-out.at(-1).s<100)continue;const side=-Math.sign(q.curvature),offset=q.halfWidth+3,x=q.x+q.nx*side*offset,z=q.z+q.nz*side*offset,p=track.projectPointToTrack(x,z);if(Math.abs(p.lateralOffset)<p.halfWidth+1.5)continue;out.push({s,x,z,heading:q.heading,direction:q.curvature>0?'right':'left'});}return out.slice(0,28);}
 function own(s,r){s.resources.push(r);return r;}
 // Only the approach to a distinct bend gets distance boards. Check the whole
 // board footprint against the nearest road, including neighbouring hairpins.
 function brakingPlan(track){
  if(!track?.sampleTrackAtS||!track.projectPointToTrack||!(track.totalLength>300))return[];
  const L=track.totalLength,turns=[];let wasBend=Math.abs(track.sampleTrackAtS(L-10).curvature)>=.01;
  for(let s=0;s<L;s+=10){const q=track.sampleTrackAtS(s),bend=Math.abs(q.curvature)>=.01;
   if(bend&&!wasBend&&(!turns.length||s-turns.at(-1).s>=170))turns.push({s,side:-Math.sign(q.curvature)});wasBend=bend;}
  if(turns.length>1&&L-turns.at(-1).s+turns[0].s<170)turns.pop();
  const out=[];for(const turn of turns.slice(0,8))for(const distance of[150,100,50]){const s=(turn.s-distance+L)%L,q=track.sampleTrackAtS(s),offset=q.halfWidth+4,x=q.x+q.nx*turn.side*offset,z=q.z+q.nz*turn.side*offset;
   const clear=[-1.1,0,1.1].every(a=>{const p=track.projectPointToTrack(x+q.nx*a,z+q.nz*a);return Math.abs(p.lateralOffset)>=p.halfWidth+1.8;});
   if(clear)out.push({s,x,z,heading:q.heading,distance,turnS:turn.s});
  }return out;
 }
 function prepare(e){if(e.authorsRoute||!e.THREE||!root.document)return;const T=e.THREE,s=e.authorsRoute={resources:[],groups:[],chunks:new Map(),circuit:false,signs:0};
  const canvas=root.document.createElement('canvas');canvas.width=512;const atlasRows=e.track?4:2;canvas.height=128*atlasRows;const c=canvas.getContext('2d');
  for(let i=0;i<atlasRows*2;i++){const x=i%2*256,y=Math.floor(i/2)*128;c.fillStyle=i<2?'#d6d977':i<4?'#243d3b':i<7?'#eceddf':'#13262d';c.fillRect(x,y,256,128);c.strokeStyle=i<2?'#242a28':i<4?'#b9cba5':i<7?'#27312d':'#d7f39d';c.lineWidth=4;c.strokeRect(x+5,y+5,246,118);c.fillStyle=i<2?'#202a25':i<4?'#ecedcc':i<7?'#17242b':'#e0f7a8';c.textAlign='center';
   if(i<2){c.font='900 108px Arial';c.fillText(i?'››':'‹‹',x+128,y+98);}else if(i<4){c.font='700 19px Arial';c.fillText('ROCKPORT',x+128,y+37);c.font='700 23px Arial';c.fillText(i===2?'IRONWORKS':'NORTH HEIGHTS',x+128,y+71);c.font='15px Arial';c.fillText(i===2?'INDUSTRIAL DISTRICT':'RIVERSIDE ROUTE',x+128,y+99);}else if(i<7){c.font='900 76px Arial';c.fillText([150,100,50][i-4],x+128,y+85);c.font='700 15px Arial';c.fillText('METERS',x+128,y+109);}else{c.font='700 17px Arial';c.fillText('NOMERA / CIRCUIT',x+128,y+37);c.font='900 29px Arial';c.fillText('START / FINISH',x+128,y+79);for(let a=0;a<16;a++){c.fillStyle=a%2?'#17252c':'#e6eddf';c.fillRect(x+a*16,y+103,16,16);}}}
  s.atlas=own(s,new T.CanvasTexture(canvas));s.atlas.encoding=T.sRGBEncoding;s.atlas.anisotropy=2;
  s.face=own(s,new T.MeshBasicMaterial({map:s.atlas,side:T.DoubleSide,toneMapped:false}));s.steel=own(s,new T.MeshStandardMaterial({color:0x434c45,roughness:.85,metalness:.3}));s.tank=own(s,new T.MeshStandardMaterial({color:0x8d9b8d,roughness:.82}));s.box=own(s,new T.BoxGeometry(1,1,1));s.cylinder=own(s,new T.CylinderGeometry(3.5,3.5,5,12));s.cap=own(s,new T.ConeGeometry(3.7,1.4,12));s.planes=Array.from({length:atlasRows*2},(_,i)=>{const g=own(s,new T.PlaneGeometry(1,1)),uv=g.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,(uv.getX(j)+i%2)/2,(uv.getY(j)+atlasRows-1-Math.floor(i/2))/atlasRows);return g;});
 }
 function circuitMarkers(e,parent){
  const T=e.THREE,s=e.authorsRoute,plan=brakingPlan(e.track),dummy=new T.Object3D();s.brakingBoards=plan.length;
  // Three batches of faces and one batch of poles, regardless of board count.
  const poles=plan.length?new T.InstancedMesh(s.box,s.steel,plan.length):null;let pole=0;
  for(const distance of[150,100,50]){const rows=plan.filter(p=>p.distance===distance);if(!rows.length)continue;const faces=new T.InstancedMesh(s.planes[4+[150,100,50].indexOf(distance)],s.face,rows.length);faces.name='CircuitBrakeBoards'+distance;
   rows.forEach((p,i)=>{const y=e.roadSurface?.sample(p.x,p.z)?.height||0;dummy.position.set(e.toThreeX(p.x),y+2.1,e.toThreeZ(p.z));dummy.rotation.set(0,Math.PI-p.heading,0);dummy.scale.set(2.2,1.1,1);dummy.updateMatrix();faces.setMatrixAt(i,dummy.matrix);dummy.position.y=y+1;dummy.scale.set(.14,2,.14);dummy.updateMatrix();poles.setMatrixAt(pole++,dummy.matrix);});parent.add(faces);
  }if(poles){poles.name='CircuitBrakeBoardPoles';parent.add(poles);}
  const cp=e.track.checkpoints[0];if(!cp)return;
  const gate=e.scene.children.find(g=>g.userData.authorsStartFinish);if(gate){const banner=new T.Mesh(s.planes[7],s.face);banner.name='CircuitFinishBanner';banner.position.set(0,6.2,-.72);banner.rotation.y=Math.PI;banner.scale.set(6,2.1,1);gate.add(banner);s.groups.push(banner);}
  // Paint follows the contact mesh; it never replaces road triangles/colliders.
  const vertices=[],colors=[],indices=[],paintHalfWidth=cp.halfWidth-1.3,columns=Math.max(2,Math.round(paintHalfWidth*2/1.15));
  for(let row=0;row<2;row++)for(let col=0;col<columns;col++){const start=vertices.length/3,shade=(row+col)%2?.08:.83;
   for(const [a,b]of[[0,0],[1,0],[0,1],[1,1]]){const lateral=-paintHalfWidth+(col+a)*paintHalfWidth*2/columns,q=e.track.sampleTrackAtS(cp.s+(row+b-1)*.9),x=q.x+q.nx*lateral,z=q.z+q.nz*lateral,y=(e.roadSurface?.sample(x,z)?.height||0)+.025;vertices.push(e.toThreeX(x),y,e.toThreeZ(z));colors.push(shade,shade,shade*.97);}
   indices.push(start,start+2,start+1,start+1,start+2,start+3);
  }
  const geo=own(s,new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const mat=own(s,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})),line=new T.Mesh(geo,mat);line.name='CircuitFinishPaint';parent.add(line);s.finishPaintTriangles=indices.length/3;
 }
 function sign(e,parent,{x,y=0,z,heading=0,tile=2,width=5,height=2.5}){const T=e.THREE,s=e.authorsRoute;if(e.track){const p=e.track.projectPointToTrack(e.toThreeX(x),e.toThreeZ(z));if(Math.abs(p.lateralOffset)<p.halfWidth+1.5)return null;}const g=new T.Group();g.name='RockportRouteSign';g.position.set(x,y,z);g.rotation.y=Math.PI-heading;
  const face=new T.Mesh(s.planes[tile],s.face);face.position.y=3.8;face.scale.set(width,height,1);g.add(face);for(const side of[-1,1]){const pole=new T.Mesh(s.box,s.steel);pole.position.set(side*width*.35,2,0);pole.scale.set(.12,4,.12);g.add(pole);}parent.add(g);s.signs++;return g;}
 function tower(e,parent,x,y,z){const T=e.THREE,s=e.authorsRoute,g=new T.Group();g.name='RockportWaterTower';g.position.set(x,y,z);for(const side of[-1,1])for(const end of[-1,1]){const pole=new T.Mesh(s.box,s.steel);pole.position.set(side*2.3,5,end*2.3);pole.scale.set(.28,10,.28);g.add(pole);}const tank=new T.Mesh(s.cylinder,s.tank),cap=new T.Mesh(s.cap,s.steel);tank.position.y=12;cap.position.y=15.2;g.add(tank,cap);parent.add(g);}
 function circuit(e){const s=e.authorsRoute,g=new e.THREE.Group();g.name='RockportWayfinding';for(const p of cornerPlan(e.track)){const q=e.track.sampleTrackAtS(p.s),y=e.roadSurface?.heightAt(p.s,0)||0;sign(e,g,{x:e.toThreeX(p.x),z:e.toThreeZ(p.z),y,heading:p.heading,tile:p.direction==='right'?1:0,width:3.4,height:1.65});}
  for(let i=0;i<3;i++){const q=e.track.sampleTrackAtS((i+.25)*e.track.totalLength/3),offset=q.halfWidth+24,x=q.x+q.nx*offset,z=q.z+q.nz*offset,p=e.track.projectPointToTrack(x,z);if(Math.abs(p.lateralOffset)<p.halfWidth+8)continue;const y=e.scene.getObjectByName('CircuitTerrain')?.position.y||0;tower(e,g,e.toThreeX(x),y,e.toThreeZ(z));sign(e,g,{x:e.toThreeX(q.x-q.nx*(q.halfWidth+5)),y:0,z:e.toThreeZ(q.z-q.nz*(q.halfWidth+5)),heading:q.heading,tile:2+i%2});}
  circuitMarkers(e,g);e.scene.add(g);s.groups.push(g);s.circuit=true;
 }
 function update(e){prepare(e);const s=e.authorsRoute;if(!s)return;if(e.track&&!s.circuit)circuit(e);
  if(e.roadChunks&&e.authorsWorld?.ready){let budget=1;for(const[chunk,world]of e.authorsWorld.chunks){let row=s.chunks.get(chunk);if(!row&&budget-- >0){const g=new e.THREE.Group();g.name='RockportHighwayWayfinding';const board=sign(e,g,{x:13,z:0,tile:2,heading:0});tower(e,g,-52,0,8);world.scenery.add(g);row={group:g,board,z:null};s.chunks.set(chunk,row);s.groups.push(g);}
   if(row&&row.z!==chunk.position.z){const block=Math.round(chunk.position.z/(e.chunkLength||60));row.group.visible=((block%5)+5)%5===0;row.board.children[0].geometry=s.planes[2+Math.abs(Math.floor(block/5))%2];row.group.position.y=e.mwLongitudinal?(root.NomeraRoadSurface?.highway(13,chunk.position.z)?.height||0):0;row.z=chunk.position.z;}}
  }e.routeDressingTelemetry={signs:s.signs,brakingBoards:s.brakingBoards||0,finishPaintTriangles:s.finishPaintTriangles||0,atlasBytes:s.atlas.image.width*s.atlas.image.height*4,pool:s.chunks.size,physicsChanged:false};
 }
 function destroy(e){const s=e.authorsRoute;if(!s)return;for(const g of s.groups){g.traverse(n=>{if(n.isInstancedMesh)n.dispose?.();});g.parent?.remove(g);}for(const r of s.resources)r.dispose();s.chunks.clear();delete e.authorsRoute;delete e.routeDressingTelemetry;}
 return{cornerPlan,brakingPlan,update,destroy};
});
