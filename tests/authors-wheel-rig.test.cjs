const test=require('node:test'),assert=require('node:assert/strict');
const THREE=require('../js/vendor/three.min.js'),rigApi=require('../js/authors-wheel-rig.js');
test('Imported wheel rig preserves real triangles/materials and excludes same-material body parts',()=>{
 const root=new THREE.Group(),tire=new THREE.MeshBasicMaterial({color:0x111111});
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,4),tire);body.position.y=.9;root.add(body);
 const grille=new THREE.Mesh(new THREE.BoxGeometry(1.3,.1,.1),tire);grille.position.set(0,.5,1.95);root.add(grille);
 for(const x of [-.82,.82])for(const z of [-1.25,1.25]){
  const geometry=new THREE.CylinderGeometry(.33,.33,.22,24);geometry.rotateZ(Math.PI/2);
  const mesh=new THREE.Mesh(geometry,tire);mesh.position.set(x,.33,z);root.add(mesh);
 }
 const count=()=>{let n=0;root.traverse(m=>{if(m.isMesh)n+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3});return n};
 const before=count(),rig=rigApi.prepare(THREE,root);
 assert.equal(rig.wheels.length,4);assert.equal(count(),before);assert.equal(grille.parent,root);assert.equal(body.parent,root);
 assert(rig.wheels.every(w=>Math.abs(w.radius-.33)<.001&&w.spin.children.length>0));
 rigApi.update(rig,{dt:.1,speedMps:15,steer:.2});assert(rig.wheels.every(w=>Math.abs(w.spin.rotation.x)>0));
 assert(rig.wheels.filter(w=>w.key[0]==='f').every(w=>Math.abs(w.steer.rotation.y-.2)<.0001));
 const rear=rig.wheels.find(w=>w.key[0]==='r'),angle=rear.angle;rigApi.update(rig,{dt:.1,speedMps:15,handbrake:true});assert.equal(rear.angle,angle);
 assert.equal(rigApi.prepare(THREE,root),rig);
});
test('Chunked wheel preparation survives a moving parent and cancels safely',async()=>{
 const root=new THREE.Group(),material=new THREE.MeshBasicMaterial();
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,4),material);body.position.y=.9;root.add(body);
 for(const x of [-.82,.82])for(const z of [-1.25,1.25]){const g=new THREE.CylinderGeometry(.33,.33,.22,128,12);g.rotateZ(Math.PI/2);const mesh=new THREE.Mesh(g,material);mesh.position.set(x,.33,z);root.add(mesh);}
 const rig=rigApi.prepareAsync(THREE,root);let beats=0;const heartbeat=setInterval(()=>{beats++;root.position.x+=1;root.rotation.y+=.1;root.updateMatrixWorld(true)},0);
 try{while(rig.pending)await new Promise(resolve=>setTimeout(resolve,5));}finally{clearInterval(heartbeat)}
 assert(beats>0);assert.equal(rig.wheels.length,4);assert(rig.wheels.every(w=>Math.abs(Math.abs(w.center.x)-.82)<.001));
 const second=root.clone();const cancelled=rigApi.prepareAsync(THREE,second);rigApi.cancelAll();assert(cancelled.cancelled||!cancelled.pending);
});
