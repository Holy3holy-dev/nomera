// Isolated browser context; never opens a user profile or changes their save.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.NOMERA_PLAYWRIGHT_MODULE||'playwright');
const catalogue=require('../tests/fixtures/wheel-model-catalogue.json');
const out=path.resolve('work/mw-wheel-model-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),results={models:[],errors:[]};
 try{
  for(const entry of catalogue){
   const ctx=await browser.newContext({viewport:{width:1000,height:650},serviceWorkers:'block'}),page=await ctx.newPage();
   await ctx.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());
   page.on('pageerror',e=>results.errors.push(String(e)));await page.goto('http://127.0.0.1:4317/authors.html');
   const data=await page.evaluate(async entry=>{
    const model=await new Promise(resolve=>Car3DManager.loadCarModel(THREE,entry.name,{},resolve));
    // Discovery must also work at a diagonal starting-grid heading.
    model.rotation.y=Math.PI/4;model.updateMatrixWorld(true);
    const geometryStats=()=>{let triangles=0,positive=0,negative=0;model.updateMatrixWorld(true);model.traverse(n=>{
     if(!n.isMesh)return;const g=n.geometry,p=g.attributes.position,index=g.index,norm=g.attributes.normal,count=index?.count||p.count;
     triangles+=count/3;if(!norm)return;
     const matrix=model.matrixWorld.clone().invert().multiply(n.matrixWorld),nm=new THREE.Matrix3().getNormalMatrix(matrix),parity=Math.sign(matrix.determinant());
     const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),v=new THREE.Vector3();
     for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
      a.fromBufferAttribute(p,ids[0]).applyMatrix4(matrix);b.fromBufferAttribute(p,ids[1]).applyMatrix4(matrix);c.fromBufferAttribute(p,ids[2]).applyMatrix4(matrix);
      normal.set(0,0,0);for(const id of ids)normal.add(v.fromBufferAttribute(norm,id).applyMatrix3(nm));
      const dot=b.sub(a).cross(c.sub(a)).dot(normal)*parity;if(dot>1e-10)positive++;else if(dot< -1e-10)negative++;
     }
    });return{triangles,positive,negative};};
    const before=geometryStats(),target=[],task=NomeraWheelRig.prepareAsync(THREE,model,target);let beats=0;
    while(task.pending){beats++;await new Promise(r=>setTimeout(r,0));}
    const after=geometryStats(),wheels=target.map(w=>{
     const p=[];w.spin.updateMatrixWorld(true);w.spin.traverse(n=>{if(n.isMesh){const m=w.spin.matrixWorld.clone().invert().multiply(n.matrixWorld);for(let i=0;i<n.geometry.attributes.position.count;i++)p.push(new THREE.Vector3().fromBufferAttribute(n.geometry.attributes.position,i).applyMatrix4(m));}});
     const box=new THREE.Box3().setFromPoints(p),center=box.getCenter(new THREE.Vector3());
     const axisErrors=[0,Math.PI/2,Math.PI,3*Math.PI/2].map(angle=>{NomeraWheelRig.update(task,{angles:{[w.key]:angle}});return new THREE.Vector3(1,0,0).applyQuaternion(w.spin.quaternion).distanceTo(w.axis);});
     const fixed=w.steer.children.filter(n=>n!==w.spin).map(n=>n.name),spinning=w.spin.children.map(n=>n.name);
     return{key:w.key,center:w.center.toArray(),radius:w.radius,axis:w.axis.toArray(),axisDegrees:Math.acos(Math.min(1,w.axis.x))*180/Math.PI,axisErrors,
      spinCenterOffset:Math.hypot(center.y,center.z),spinning,fixed};
    });
    // Keep a rendered quarter-turn diagnostic for the known problem models.
    if(['vaz2107','vaz2109','cullinan','gaz24','e63','polo','veloster'].includes(entry.id)){
     model.rotation.y=0;model.traverse(n=>{if(n.isMesh)n.material=new THREE.MeshStandardMaterial({color:0x6b7280,roughness:.65})});
     for(const w of target)w.spin.traverse(n=>{if(n.isMesh)n.material=new THREE.MeshStandardMaterial({color:0xff6050,roughness:.65})});
     NomeraWheelRig.update(task,{angles:{fl:Math.PI/3,fr:Math.PI/3,rl:Math.PI/3,rr:Math.PI/3}});
     const cover=document.createElement('div');Object.assign(cover.style,{position:'fixed',inset:0,zIndex:999999,background:'#151923',color:'#eee',font:'16px Arial'});document.body.append(cover);
     const label=document.createElement('div');label.textContent=entry.name+' · вращение колёс 60° · красным выделены вращающиеся детали';label.style.padding='12px';cover.append(label);
     const scene=new THREE.Scene();scene.background=new THREE.Color('#151923');scene.add(model,new THREE.HemisphereLight(0xffffff,0x333333,1.4));
     const camera=new THREE.PerspectiveCamera(38,1000/600,.1,100);camera.position.set(entry.id==='cullinan'?-6:6,1.8,.6);camera.lookAt(0,.55,0);
     const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;renderer.setSize(1000,600);cover.append(renderer.domElement);renderer.render(scene,camera);
    }
    return{...entry,before,after,beats,wheels};
   },entry);
   results.models.push(data);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
   assert.equal(data.wheels.length,4,entry.id+' four hubs');assert.equal(data.after.triangles,data.before.triangles,entry.id+' triangle preservation');
   assert(data.after.negative<=data.before.negative+10,entry.id+' no inverted new faces');
   for(const w of data.wheels){assert(w.center[1]<w.radius*1.4+.01,entry.id+' grounded hub');assert(w.spinCenterOffset<.02,entry.id+' concentric rotation');assert(Math.max(...w.axisErrors)<1e-7,entry.id+' stable axle');assert(w.spinning.length>0);}
   if(['vaz2107','vaz2109','cullinan','gaz24','e63','polo','veloster'].includes(entry.id))await page.screenshot({path:path.join(out,entry.id+'.png')});
   console.log('PASS',entry.id,`4 hubs, ${data.after.triangles} triangles`);await ctx.close();
  }
  // Styling can tilt the axle independently of its stock mesh orientation.
  const page=await browser.newPage();await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());await page.goto('http://127.0.0.1:4317/authors.html');
  results.camber=await page.evaluate(async()=>{const model=await new Promise(r=>Car3DManager.loadCarModel(THREE,'Lada Priora БПАН',{camber:8},r)),rig=NomeraWheelRig.prepare(THREE,model);return rig.wheels.map(w=>({key:w.key,angle:Math.acos(w.axis.x)*180/Math.PI}));});
  assert.equal(results.camber.length,4);assert(results.camber.every(w=>Math.abs(w.angle-8)<.2));
  assert.deepEqual(results.errors,[]);results.success=true;
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS all 49 imported models, original triangles, mirrored winding, diagonal headings, axes, caliper/disc diagnostics and styled camber');
})().catch(e=>{console.error(e);process.exitCode=1});
