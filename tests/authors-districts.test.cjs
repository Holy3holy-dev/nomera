const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),T=require('../js/vendor/three.min.js');
const D=require('../js/authors-districts.js'),Circuit=require('../js/nfs-circuit-race.js');
test('districts are deterministic, periodic and stable for negative highway coordinates',()=>{
 assert.equal(D.districtAt(0).id,'city');assert.equal(D.districtAt(1800).id,'industrial');assert.equal(D.districtAt(3600).id,'rural');assert.equal(D.districtAt(5400).id,'city');assert.equal(D.districtAt(-1).id,'rural');
 for(let z=-6000;z<10000;z+=71)assert.equal(D.districtAt(z).id,D.districtAt(z+D.period).id);
});
test('district plans have recognizably different architecture and bounded recyclable capacities',()=>{
 const capacities={buildings:8,boxes:64,cylinders:24,crowns:24,hills:8,roofs:8,signs:4};
 for(const profile of D.profiles)for(let seed=-30;seed<40;seed++){
  const plan=D.blockPlan(profile,seed);assert.deepEqual(plan,D.blockPlan(profile,seed));
  for(const [bucket,rows]of Object.entries(plan)){assert(rows.length<=capacities[bucket],profile.id+' '+bucket);for(const p of rows){assert(Object.values(p).every(v=>typeof v!=='number'||Number.isFinite(v)));assert(Math.abs(p.x)-p.w/2>11.4,`${profile.id}/${bucket} intrudes into carriageway`);}}
 }
 const city=D.blockPlan('city'),industry=D.blockPlan('industrial'),rural=D.blockPlan('rural');
 assert(city.buildings.every(p=>p.h>=16));assert(industry.buildings.every(p=>p.h<=10));assert(industry.cylinders.some(p=>p.h>=24));assert(rural.roofs.length>0||D.blockPlan('rural',1).roofs.length>0);assert(rural.hills.length>0&&rural.crowns.length>city.crowns.length);
});
test('all circuit decoration footprints stay away from the nearest road, including hairpins',()=>{
 for(const name of ['rockport_ring','canyon_pass','bayview_sprint']){
  const track=Circuit.buildCircuitTrack(name,100),plan=D.circuitPlan(track);
  assert(Object.values(plan).some(v=>v.length));
  for(const rows of Object.values(plan))for(const p of rows)assert(D.clearFootprint(track,p.x,p.z,p.w,p.d));
  for(const f of [.05,.4,.8])assert.equal(D.circuitDistrict(track,track.totalLength*f).id,D.profiles[Math.floor(f*3)].id);
 }
});
function setup(){
 const context={fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
 const doc={createElement:()=>({width:0,height:0,getContext:()=>context})},sandbox={document:doc,module:{exports:{}}};vm.runInNewContext(fs.readFileSync(require.resolve('../js/authors-districts.js'),'utf8'),sandbox);
 const source=new T.Group(),generic=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());generic.userData.authorsBuilding=true;source.add(generic);
 const chunk=new T.Group();chunk.position.z=240;const scenery=new T.Group();chunk.add(scenery);scenery.add(source);
 const board=new T.Mesh(new T.PlaneGeometry(6,1.5),new T.MeshBasicMaterial()),portal=new T.Group(),frame=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());frame.name='PortalConcreteFrame';portal.add(frame,board);
 const e={THREE:T,scene:new T.Scene(),roadChunks:[chunk],chunkLength:60,state:{z:240,damageTaken:3},keys:{left:true},camera:{far:320},authorsLife:{chunks:new Map(),groups:[]},authorsDetail:{concrete:new T.MeshLambertMaterial(),chunks:new Map([[chunk,{portals:[{group:portal,board}]}]])},authorsEnvironment:{chunks:new Map([[chunk,{group:source}]])},authorsWorld:{ready:true,chunks:new Map([[chunk,{scenery}]])}};
 e.scene.add(chunk,portal);return {api:sandbox.module.exports,e,chunk,board,frame,generic};
}
test('recycling reuses GPU resources, leaves contacts and input untouched and restores borrowed portal assets',()=>{
 const {api,e,chunk,board,frame,generic}=setup(),original={geometry:board.geometry,material:board.material,frame:frame.material},before=JSON.stringify({state:e.state,keys:e.keys});
 api.update(e);const s=e.authorsDistricts,resources=s.resources.slice(),pool=s.chunks.size,buffers=[...s.chunks.get(chunk).group.children].map(m=>m.instanceMatrix.array);
 assert.notEqual(board.material,s.sign);assert([...s.chunks.get(chunk).group.children].every(m=>m.instanceColor));
 for(let i=0;i<120;i++){chunk.position.z=240+i*60;e.state.z=chunk.position.z;api.update(e);}
 assert.equal(s.chunks.size,pool);assert.equal(s.resources.length,resources.length);assert.equal(s.builds,1);assert.equal(s.recycles,119);assert(!generic.visible);
 [...s.chunks.get(chunk).group.children].forEach((m,i)=>assert.equal(m.instanceMatrix.array,buffers[i]));
 assert.equal(e.keys.left,true);assert.equal(e.state.damageTaken,3);assert.equal(JSON.parse(before).state.damageTaken,e.state.damageTaken);assert.equal(e.districtTelemetry.additionalLights,0);
 let disposed=0;resources.forEach(r=>r.addEventListener('dispose',()=>disposed++));api.destroy(e);assert.equal(disposed,resources.length);assert.equal(board.geometry,original.geometry);assert.equal(board.material,original.material);assert.equal(frame.material,original.frame);assert(generic.visible);assert.equal(e.authorsDistricts,undefined);assert.equal(e.districtTelemetry,undefined);
});
test('circuit wayfinding follows the new district while asphalt, corner signs and rail geometry stay intact',()=>{
 const {api,e}=setup(),track=Circuit.buildCircuitTrack('rockport_ring',100);e.track=track;e.toThreeX=x=>-x;e.toThreeZ=z=>z;e.roadSurface={sample:()=>({height:0})};
 e.roadChunks=null;e.authorsWorld.chunks.clear();
 const rail=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial()),originalRail=rail.material,railGeometry=rail.geometry;rail.name='CircuitGuardrail';e.scene.add(rail);
 const planes=Array.from({length:4},()=>new T.PlaneGeometry(1,1)),group=new T.Group(),sample=track.sampleTrackAtS(track.totalLength*.45),board=new T.Group(),face=new T.Mesh(planes[2],new T.MeshBasicMaterial()),originalMaterial=face.material;
 board.name='RockportRouteSign';board.position.set(-sample.x,0,sample.z);board.add(face);group.add(board);
 const corner=new T.Group(),arrow=new T.Mesh(planes[0],originalMaterial);corner.name='RockportRouteSign';corner.add(arrow);group.add(corner);e.scene.add(group);e.authorsRoute={groups:[group],planes};
 const before=JSON.stringify({state:e.state,keys:e.keys});api.update(e);
 assert.equal(face.geometry,e.authorsDistricts.signs[1]);assert.equal(face.material,e.authorsDistricts.portalSign);assert.equal(arrow.geometry,planes[0]);assert.equal(rail.geometry,railGeometry);assert.notEqual(rail.material,originalRail);assert.equal(JSON.stringify({state:e.state,keys:e.keys}),before);
 api.destroy(e);assert.equal(face.geometry,planes[2]);assert.equal(face.material,originalMaterial);assert.equal(rail.material,originalRail);assert.equal(rail.geometry,railGeometry);
});
