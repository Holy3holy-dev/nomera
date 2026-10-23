const test=require('node:test'),assert=require('node:assert/strict'),T=require('../js/vendor/three.min.js'),W=require('../js/authors-road-weather.js');
const fs=require('node:fs'),vm=require('node:vm'),window={NOMERA_AUTHORS_PREVIEW:true};vm.runInNewContext(fs.readFileSync(require.resolve('../js/authors-driver-camera.js'),'utf8'),{window,THREE:T});const C=window.NomeraDriverCamera;
function engine(){return{THREE:T,authorsRoadMaterial:new T.MeshStandardMaterial(),state:{x:0,z:300,speed:300,damageTaken:19},keys:{left:true},scene:new T.Scene(),camera:new T.PerspectiveCamera(76,390/844,.025,500),roadChunks:[],currentActiveWeather:'rain',playerCar:new T.Group()};}
test('Rain remains in view at speed, after teleports, and in every camera orientation',()=>{
 for(const speed of[0,130,400])for(const mode of['chase','cockpit','top']){
  const e=engine();e.state.speed=speed;if(mode==='top')e.camera.rotation.x=-1.2;if(mode==='cockpit')e.camera.rotation.y=Math.PI;
  const before=JSON.stringify({state:e.state,keys:e.keys});let least=196;
  for(let frame=0;frame<240;frame++){if(frame===120)e.camera.position.set(500,20,5000);W.update(e,1/60);const a=e.authorsRoadWeather.rain.geometry.attributes.position;let seen=0;for(let i=0;i<a.count;i+=2){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(e.camera.projectionMatrix);if(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1)seen++;}least=Math.min(least,seen);}
  assert(least>120,`${speed} ${mode}: only ${least} drops in view`);assert.equal(e.scene.children.length,1);assert.equal(JSON.stringify({state:e.state,keys:e.keys}),before);W.destroy(e);
 }
});
test('The tunnel blocks rain while the damp asphalt remains; exit restores precipitation',()=>{
 const e=engine();W.update(e);const rain=e.authorsRoadWeather.rain;assert(rain.visible);e.state.z=850;W.update(e);assert(!rain.visible);assert(e.authorsRoadWetness>.6);e.state.z=1185;W.update(e);assert(rain.visible);e.forcedBiome='tunnel';W.update(e);assert(!rain.visible);e.forcedBiome='city';W.update(e);assert(rain.visible);W.destroy(e);
});
test('Rain respects transition weights and camera projection without adding a texture sampler',()=>{
 const e=engine();e.authorsEnvironment={weatherWeights:{rain:.5}};W.update(e);const r=e.authorsRoadWeather.rain;assert.equal(r.material.opacity,.31);assert(!r.material.depthWrite&&!r.material.fog&&!r.material.toneMapped);const s={vertexShader:T.ShaderLib.basic.vertexShader};W.rainShader(s);assert(s.vertexShader.includes('gl_Position=projectionMatrix*mvPosition;'));assert(!s.vertexShader.includes('#include <project_vertex>'));e.authorsEnvironment.weatherWeights.rain=0;W.update(e);assert(!r.visible);W.destroy(e);
});
test('Bumper clears fitted bodywork and hood stays above its surface even in rotated models',()=>{
 const model=new T.Group(),body=new T.Mesh(new T.BoxGeometry(2,1.5,5));body.position.y=.75;model.add(body);const splitter=new T.Mesh(new T.BoxGeometry(2.2,.1,.6));splitter.position.set(0,.3,2.6);model.add(splitter);model.rotation.y=1.3;model.position.set(4,1,100);model.updateMatrixWorld(true);const p={size:[2,1.5,5],hood:[0,.9,1.8],eye:[.35,1.25,-.1]},a=C.anchors(T,model,p);assert(Math.abs(a.front-2.9)<1e-6);assert(a.bumper[2]>=3.13);assert(a.hood[1]>=1.06);assert(a.bumper[1]>.4);
});
test('Roof limits use visible geometry and anticipate tunnel entrances without hiding the roof',()=>{
 const chunk=new T.Group(),tunnel=new T.Group(),roof=new T.Mesh(new T.BoxGeometry(24,.85,60));roof.name='TunnelVaultRoof';roof.position.set(0,8.6,600);chunk.add(tunnel);tunnel.add(roof);chunk.updateMatrixWorld(true);const e={THREE:T,roadChunks:[chunk]},position=new T.Vector3(0,22,590),focus=new T.Vector3(0,1,605),inside=C.roofLimit(e,position,focus);assert(inside.hits>0&&inside.height<5.1);assert(roof.visible);const early=C.roofLimit(e,new T.Vector3(0,22,520),new T.Vector3(0,1,540)),late=C.roofLimit(e,new T.Vector3(0,22,540),new T.Vector3(0,1,560));assert(early.height>late.height&&late.height>inside.height);tunnel.visible=false;assert.equal(C.roofLimit(e,position,focus).height,Infinity);
});
