'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const out=path.resolve('work/case-results/g63');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),result={errors:[],views:[]};try{
 const page=await browser.newPage({viewport:{width:700,height:550}});
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4317/')?r.continue():r.abort());page.on('pageerror',e=>result.errors.push(e.stack));
 await page.goto('http://127.0.0.1:4317/authors.html');
 result.model=await page.evaluate(async()=>{
  const T=THREE,m=await new Promise(r=>Car3DManager.loadCarModel(T,'Mercedes-Benz G63 AMG «Гелик»',{plate:'А 123 ВС | 777 RUS'},r));window.qaG63=m;
  const rig=NomeraWheelRig.prepare(T,m);window.qaG63Rig=rig;
  const before=rig.wheels.map(w=>w.spin.quaternion.clone());
  Car3DManager.applyStylingToGLTF(T,m,{wheels:'forged',color:'#35444f',plate:'А 123 ВС | 777 RUS'},'g63');
  NomeraWheelRig.update(rig,{dt:1/60,speedMps:25,steer:.25});
  const f=m.getObjectByName('GLB_FrontLicensePlate'),r=m.getObjectByName('GLB_RearLicensePlate');
  const poses=[f.position.toArray(),r.position.toArray()],wheelPositions=rig.wheels.map(w=>w.steer.position.toArray());
  // Geometry dents remain active and neither plates nor wheel vertices are dented.
  NomeraBodyDamage.hit(T,m,{severity:.7,point:[.95,1,1.1],normal:[-1,0,0]});for(let i=0;i<200&&m.userData.bodyDeformation?.queue.length;i++)NomeraBodyDamage.process(T,m,12000);
  const changed=m.userData.bodyDeformation?.changedVertices||0;
  const platesUnaffected=JSON.stringify(poses)===JSON.stringify([f.position.toArray(),r.position.toArray()]);
  const wheelsUnaffected=JSON.stringify(wheelPositions)===JSON.stringify(rig.wheels.map(w=>w.steer.position.toArray()));
  NomeraBodyDamage.reset(m);
  let nativeHidden=true,rotorsVisible=true;m.traverse(n=>{if(/^(G63_atelier_plate|Rear_registration_lettering)\d*$/i.test(n.name))nativeHidden&&=!n.visible;if(/Accuracy_perforated_friction_plate_(FRONT|REAR)/i.test(n.name))rotorsVisible&&=n.visible;});
  window.qaRenderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});qaRenderer.outputEncoding=T.sRGBEncoding;qaRenderer.toneMapping=T.ACESFilmicToneMapping;qaRenderer.domElement.style='position:fixed;inset:0;z-index:999999';document.body.append(qaRenderer.domElement);
  window.qaScene=new T.Scene();qaScene.background=new T.Color('#182536');qaScene.add(m,new T.HemisphereLight(0xe6f3ff,0x273340,1.6));const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,6,5);qaScene.add(light);window.qaCamera=new T.PerspectiveCamera(34,700/550,.1,50);
  return{wheels:rig.wheels.length,imported:rig.imported,animated:rig.wheels.every((w,i)=>!w.spin.quaternion.equals(before[i])),poses,changed,platesUnaffected,wheelsUnaffected,nativeHidden,rotorsVisible};
 });
 const q=result.model;assert(q.imported&&q.wheels===4&&q.animated&&q.changed>0&&q.platesUnaffected&&q.wheelsUnaffected&&q.nativeHidden&&q.rotorsVisible,JSON.stringify(q));assert(q.poses[0][2]>2.37&&q.poses[1][2]<-2.16);
 for(const [width,height]of [[390,500],[700,550]])for(const side of ['front','rear']){
  await page.setViewportSize({width,height});await page.evaluate(({width,height,side})=>{qaRenderer.setSize(width,height);qaCamera.aspect=width/height;qaCamera.updateProjectionMatrix();qaCamera.position.set(.5,1,side==='front'?7.5:-7.5);qaCamera.lookAt(0,.85,0);qaRenderer.render(qaScene,qaCamera);},{width,height,side});await page.locator('canvas').last().screenshot({path:path.join(out,side+'-'+width+'.png')});result.views.push({width,height,side});
 }
 assert.deepEqual(result.errors,[]);result.success=true;console.log('PASS G63: real GLB front/rear mounts, native text hidden, brake rotors, four spinning wheels, fitted rims and body dents');
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
