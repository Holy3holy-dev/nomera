const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../js/vendor/three.min.js'),Circuit=require('../js/nfs-circuit-race.js'),Surface=require('../js/authors-road-surface.js');
function trackScene(id,mw=true){const e=new Circuit.NomeraCircuitRaceEngine(null);e.THREE=THREE;e.scene=new THREE.Scene();e.carConfig={physicsKernel:mw?'mw':null};e.track=Circuit.buildCircuitTrack(id,100);e.roadSurface=mw?Surface.circuit(e.track):null;e._buildTrack3DMesh();e.scene.updateMatrixWorld(true);return e;}
for(const id of Object.keys(Circuit.TRACK_PRESETS))test('continuous asphalt matches contacts and stays above terrain: '+id,()=>{
 const e=trackScene(id),road=e.scene.getObjectByName('CircuitAsphalt'),curbs=e.scene.getObjectByName('CircuitCurbs'),g=road.geometry,p=g.attributes.position,normal=g.attributes.normal,ground=e.scene.children.find(n=>n.geometry?.type==='PlaneGeometry');
 assert.equal(e.authorsRoadMaterial,road.material);assert.notEqual(curbs.material,road.material);assert.equal(curbs.material.vertexColors,true);
 for(let i=0;i<p.count;i++){assert(p.getY(i)>ground.position.y+.1,'terrain must not cut banked asphalt');assert(normal.getY(i)>.95);}
 for(const[first,last]of [[0,p.count-2],[1,p.count-1]])for(let k=0;k<3;k++)assert.equal(p.array[first*3+k],p.array[last*3+k],'closed seam');
 const caster=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(let s=.5;s<e.track.totalLength;s+=13){const q=e.track.sampleTrackAtS(s);for(const lateral of[-.8,0,.8]){const x=q.x+q.nx*lateral*q.halfWidth,z=q.z+q.nz*lateral*q.halfWidth,contact=e.roadSurface.sample(x,z);caster.set(new THREE.Vector3(e.toThreeX(x),30,e.toThreeZ(z)),down);const hit=caster.intersectObject(road)[0];assert(hit,'no gap at '+s+'/'+lateral);assert(Math.abs(hit.point.y-contact.height)<5e-5,'visual height must match tire contact');}}
});
test('asphalt texture binds to the actual material in both physics modes; curb colors remain intact',()=>{
 for(const mw of[true,false]){const e=trackScene('rockport_ring',mw),curb=e.scene.getObjectByName('CircuitCurbs'),before=Array.from(curb.geometry.attributes.color.array),T={...THREE,TextureLoader:class{load(url){const texture=new THREE.Texture();texture.name=url;return texture;}}},window={NOMERA_AUTHORS_PREVIEW:true};e.THREE=T;
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/authors-scene.js'),'utf8'),{window});window.NomeraScene.prepare(e);
 const road=e.scene.getObjectByName('CircuitAsphalt');assert.equal(e.authorsRoadMaterial,road.material);assert.match(road.material.map.name,/RO_GENFILL_CRK/);assert.equal(road.material.vertexColors,false);assert.equal(curb.material.map,null);assert.equal(curb.material.normalMap,undefined);assert.deepEqual(Array.from(curb.geometry.attributes.color.array),before);assert.equal(road.geometry.attributes.uv.count,road.geometry.attributes.position.count);
 const physics={unchanged:true};e.state=physics;e.currentActiveWeather='rain';road.material.color.setHex(0x050505);window.NomeraScene.weather(e);assert.equal(road.material.color.getHex(),0xffffff);assert.equal(road.material.roughness,.42);assert.equal(e.state,physics);assert.deepEqual(physics,{unchanged:true});
 }
});
