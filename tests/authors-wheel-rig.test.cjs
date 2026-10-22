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

function synthetic({yaw=0,toe=0,camber=0,mirror=false}={}){
 const root=new THREE.Group(),parent=new THREE.Group(),tire=new THREE.MeshBasicMaterial({name:'Tire'});parent.rotation.y=yaw;parent.add(root);
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,4),tire);body.position.y=.9;root.add(body);
 for(const x of [-.82,.82])for(const z of [-1.25,1.25]){
  const g=new THREE.CylinderGeometry(.33,.33,.22,48);g.rotateZ(Math.PI/2);g.rotateY(toe);g.rotateZ(camber);
  const mesh=new THREE.Mesh(g,tire);mesh.position.set(x,.33,z);if(mirror&&x<0)mesh.scale.x=-1;root.add(mesh);
 }
 parent.updateMatrixWorld(true);return root;
}
test('Round atelier parts stay attached to the body and never change wheel discovery',()=>{
 const root=synthetic(),kit=new THREE.Group();kit.userData.authorsAccessory=true;root.add(kit);
 const material=new THREE.MeshBasicMaterial(),geometry=new THREE.CylinderGeometry(.49,.49,.2,24);geometry.rotateZ(Math.PI/2);
 const meshes=[];for(const x of[-.96,.96])for(const z of[-1.25,1.25]){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,.49,z);kit.add(mesh);meshes.push(mesh);}
 const rig=rigApi.prepare(THREE,root);assert.equal(rig.wheels.length,4);assert(rig.wheels.every(w=>Math.abs(w.radius-.33)<1e-6));
 rigApi.update(rig,{dt:.2,speedMps:25,steer:.3});for(const mesh of meshes){assert.equal(mesh.parent,kit);assert.equal(mesh.geometry,geometry);assert.equal(mesh.rotation.x,0);}
});
test('Wheel discovery is independent of diagonal world heading',()=>{
 for(const yaw of [Math.PI/8,Math.PI/4,-Math.PI/4]){
  const rig=rigApi.prepare(THREE,synthetic({yaw}));assert.equal(rig.wheels.length,4);
  for(const w of rig.wheels){assert(Math.abs(w.radius-.33)<.001);assert(Math.abs(w.center.y-.33)<.001);}
 }
});
test('Tilted tires preserve their original geometry and axle through a complete revolution',()=>{
 for(const options of [{toe:Math.PI/6},{camber:8*Math.PI/180},{toe:.2,camber:-.12}]){
  const root=synthetic(options),original=[];root.updateMatrixWorld(true);
  root.traverse(n=>{if(n.isMesh&&n.material.name==='Tire')for(let i=0;i<n.geometry.attributes.position.count;i++)original.push(new THREE.Vector3().fromBufferAttribute(n.geometry.attributes.position,i).applyMatrix4(n.matrixWorld))});
  const rig=rigApi.prepare(THREE,root);assert.equal(rig.wheels.length,4);root.updateMatrixWorld(true);
  const actual=[];root.traverse(n=>{if(n.isMesh&&n.material.name==='Tire')for(let i=0;i<n.geometry.attributes.position.count;i++)actual.push(new THREE.Vector3().fromBufferAttribute(n.geometry.attributes.position,i).applyMatrix4(n.matrixWorld))});
  // compact() deduplicates seam indices; float32 transforms can cross rounding
  // boundaries, so compare positions with a geometric tolerance.
  for(const p of original)assert(actual.some(q=>p.distanceTo(q)<1e-6),'original vertex preserved');
  for(const p of actual)assert(original.some(q=>p.distanceTo(q)<1e-6),'no vertex displaced');
  for(const angle of [0,.5*Math.PI,Math.PI,1.5*Math.PI,2*Math.PI]){
   rigApi.update(rig,{angles:{fl:angle,fr:angle,rl:angle,rr:angle}});
   for(const w of rig.wheels){
    const current=new THREE.Vector3(1,0,0).applyQuaternion(w.spin.quaternion);assert(current.distanceTo(w.axis)<1e-7,'axle must not precess');
    assert(w.axis.x<.999);assert(w.spin.position.length()===0);
   }
  }
 }
});
test('Mirrored imported triangles retain outward winding after geometry baking',()=>{
 const rig=rigApi.prepare(THREE,synthetic({mirror:true}));assert.equal(rig.wheels.length,4);
 for(const w of rig.wheels)for(const mesh of w.spin.children){
  const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<g.index.count;i+=3){
   const ids=[0,1,2].map(j=>g.index.getX(i+j)),a=new THREE.Vector3().fromBufferAttribute(p,ids[0]),b=new THREE.Vector3().fromBufferAttribute(p,ids[1]),c=new THREE.Vector3().fromBufferAttribute(p,ids[2]);
   const normal=new THREE.Vector3().fromBufferAttribute(n,ids[0]).add(new THREE.Vector3().fromBufferAttribute(n,ids[1])).add(new THREE.Vector3().fromBufferAttribute(n,ids[2]));
   assert(b.sub(a).cross(c.sub(a)).dot(normal)>=-1e-9);
  }
 }
});
test('Body components above the tire cannot replace the hub; calipers stay fixed while discs spin',()=>{
 const root=synthetic(),brake=new THREE.MeshBasicMaterial({name:'Callipers'});
 for(const x of [-.82,.82])for(const z of [-1.25,1.25]){
  const fake=new THREE.Mesh(new THREE.BoxGeometry(.1,.75,.75),new THREE.MeshBasicMaterial());fake.position.set(x,.72,z);root.add(fake);
  const caliper=new THREE.Mesh(new THREE.BoxGeometry(.07,.09,.18),brake);caliper.position.set(x,.46,z);root.add(caliper);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.04,32).rotateZ(Math.PI/2),brake);disc.position.set(x,.33,z);root.add(disc);
 }
 const rig=rigApi.prepare(THREE,root);assert.equal(rig.wheels.length,4);
 for(const w of rig.wheels){assert(Math.abs(w.center.y-.33)<.001);assert(w.steer.children.some(n=>n.isMesh&&n.material===brake));assert(w.spin.children.some(n=>n.material===brake));}
});
test('Per-wheel physics angles, Ackermann and travel map consistently to both coordinate systems',()=>{
 const rig=rigApi.prepare(THREE,synthetic());
 const angles={fl:1,fr:2,rl:3,rr:4},steerAngles={fl:.2,fr:.3},compression={fl:.01,fr:.02,rl:.03,rr:.04};
 for(const swapSides of [false,true]){
  rigApi.update(rig,{angles,steerAngles,compression,swapSides});
  for(const w of rig.wheels){const key=swapSides?w.key[0]+(w.key[1]==='l'?'r':'l'):w.key;assert.equal(w.angle,angles[key]);assert.equal(w.steer.position.y,w.baseY+compression[key]);if(key[0]==='f')assert.equal(w.steer.rotation.y,steerAngles[key]);}
 }
});
test('Generated accessories and hidden helper meshes cannot move the ground used for hub detection',()=>{
 const root=synthetic(),plate=new THREE.Group();plate.name='GLB_FrontLicensePlate';root.add(plate);
 const panel=new THREE.Mesh(new THREE.BoxGeometry(.52,.11,.02),new THREE.MeshBasicMaterial());panel.position.set(0,-1,2);plate.add(panel);
 const hidden=new THREE.Group();hidden.visible=false;root.add(hidden);const helper=panel.clone();helper.position.set(0,-3,0);hidden.add(helper);
 const rig=rigApi.prepare(THREE,root);assert.equal(rig.wheels.length,4);assert.equal(panel.parent,plate);assert.equal(helper.parent,hidden);
});
test('Unused vertices in a shared indexed accessor do not change wheel discovery',()=>{
 const root=synthetic(),body=root.children[0],position=body.geometry.attributes.position;
 const data=new Float32Array(position.array.length+3);data.set(position.array);data.set([0,-10,0],position.array.length);body.geometry.setAttribute('position',new THREE.BufferAttribute(data,3));
 assert.equal(rigApi.prepare(THREE,root).wheels.length,4);
});
test('Uneven tire tessellation cannot tilt the axle',()=>{
 const root=synthetic({toe:.23,camber:.12});
 for(const mesh of root.children.slice(1)){
  const flat=mesh.geometry.toNonIndexed(),p=flat.attributes.position,points=[];
  const a=new THREE.Vector3().fromBufferAttribute(p,0),b=new THREE.Vector3().fromBufferAttribute(p,1),c=new THREE.Vector3().fromBufferAttribute(p,2),n=32;
  const point=(i,j)=>a.clone().addScaledVector(b.clone().sub(a),i/n).addScaledVector(c.clone().sub(a),j/n);
  const triangle=(a,b,c)=>points.push(...a.toArray(),...b.toArray(),...c.toArray());
  for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){triangle(point(i,j),point(i+1,j),point(i,j+1));if(i+j<n-1)triangle(point(i+1,j),point(i+1,j+1),point(i,j+1));}
  for(let i=3;i<p.count;i++)points.push(p.getX(i),p.getY(i),p.getZ(i));
  mesh.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3));mesh.geometry.computeVertexNormals();
 }
 const expected=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),.23).applyAxisAngle(new THREE.Vector3(0,0,1),.12);
 const rig=rigApi.prepare(THREE,root);assert.equal(rig.wheels.length,4);for(const w of rig.wheels)assert(w.axis.distanceTo(expected)<1e-5);
});
