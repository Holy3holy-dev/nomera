/* NOMERA terrain bridge. Shared triangle surfaces drive road rendering and
 * MW contacts; these road shapes are authored here, not original MW assets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRoadSurface=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hump=(s,center,width,height)=>Math.abs(s-center)<width?height*.5*(1+Math.cos(Math.PI*(s-center)/width)):0;
 const normal=(dx,dz)=>{const length=Math.hypot(dx,1,dz);return[-dx/length,1/length,-dz/length];};
 function highwayHeight(x,z){
  const s=((z%1400)+1400)%1400;
  const h=hump(s,320,32,1.5)+hump(s,760,130,3)+hump(s,1120,14,.12);
  const bank=.018*Math.sin(s*.015)*clamp((s-220)/50,0,1)*clamp((1350-s)/50,0,1);
  const shoulder=clamp((40-Math.abs(x))/(40-8.75),0,1);
  return(h+bank*x)*shoulder;
 }
 // 2m grid, exactly matching the subdivided highway planes' triangle diagonal.
 function highway(x,z){
  const stepX=2.5,stepZ=2,x0=Math.floor((x+8.75)/stepX)*stepX-8.75,z0=Math.floor(z/stepZ)*stepZ;
  const u=(x-x0)/stepX,v=(z-z0)/stepZ,a=highwayHeight(x0,z0),b=highwayHeight(x0+stepX,z0),c=highwayHeight(x0,z0+stepZ),d=highwayHeight(x0+stepX,z0+stepZ);
  let height,dx,dz;
  if(u+v<=1){height=a+(b-a)*u+(c-a)*v;dx=(b-a)/stepX;dz=(c-a)/stepZ;}
  else{height=d+(c-d)*(1-u)+(b-d)*(1-v);dx=(d-c)/stepX;dz=(d-b)/stepZ;}
  return{height,normal:normal(dx,dz),valid:true,surface:Math.abs(x)<8.75?'asphalt':'grass'};
 }
 function circuitHeight(s,lateral,total,id){
  if(id==='proving_ground')return 0;
  const t=((s%total)+total)%total;
  const scale=id==='canyon_pass'?1.35:id==='bayview_sprint'?.8:1;
  const rise=hump(t,115,30,1.35*scale)+hump(t,total*.52,100,2.5*scale)+hump(t,total*.79,16,.10);
  const bank=.025*Math.sin(t/total*Math.PI*4)*Math.min(clamp((t-55)/40,0,1),clamp((total-t)/40,0,1));
  return rise+lateral*bank;
 }
 class TriangleSurface{
  constructor(cell=24){this.cell=cell;this.grid=new Map();this.triangles=[];this.queries=0;this.tests=0;}
  add(a,b,c,surface='asphalt'){
   const x1=b[0]-a[0],z1=b[2]-a[2],x2=c[0]-a[0],z2=c[2]-a[2],det=x1*z2-x2*z1;if(Math.abs(det)<1e-10)return;
   const dx=((b[1]-a[1])*z2-(c[1]-a[1])*z1)/det,dz=(x1*(c[1]-a[1])-x2*(b[1]-a[1]))/det;
   const triangle={a,x1,z1,x2,z2,det,dx,dz,normal:normal(dx,dz),surface};this.triangles.push(triangle);
   const minX=Math.floor(Math.min(a[0],b[0],c[0])/this.cell),maxX=Math.floor(Math.max(a[0],b[0],c[0])/this.cell),minZ=Math.floor(Math.min(a[2],b[2],c[2])/this.cell),maxZ=Math.floor(Math.max(a[2],b[2],c[2])/this.cell);
   for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=x+','+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(triangle);}
  }
  quad(a,b,c,d,surface){this.add(a,b,c,surface);this.add(b,d,c,surface);}
  sample(x,z){
   this.queries++;let best=null;
   for(const t of this.grid.get(Math.floor(x/this.cell)+','+Math.floor(z/this.cell))||[]){
    this.tests++;const px=x-t.a[0],pz=z-t.a[2],u=(px*t.z2-t.x2*pz)/t.det,v=(t.x1*pz-px*t.z1)/t.det;
    if(u< -1e-7||v< -1e-7||u+v>1+1e-7)continue;
    const height=t.a[1]+t.dx*px+t.dz*pz;if(!best||height>best.height)best={height,normal:t.normal,valid:true,surface:t.surface};
   }
   return best||{height:-.05,normal:[0,1,0],valid:true,surface:'grass'};
  }
 }
 function circuit(track){
  const mesh=new TriangleSurface(),segs=track.segments,height=(s,l)=>circuitHeight(s,l,track.totalLength,track.id);
  const point=(seg,l,extra=0)=>[seg.x+seg.nx*l,height(seg.s,l)+extra,seg.z+seg.nz*l];
  for(let i=0;i<segs.length;i++){
   const a=segs[i],b=segs[(i+1)%segs.length],w=a.halfWidth;
   mesh.quad(point(a,-w),point(a,w),point(b,-w),point(b,w),'asphalt');
   for(const side of [-1,1]){
    mesh.quad(point(a,side*(w-1.15),.05),point(a,side*w,.06),point(b,side*(w-1.15),.05),point(b,side*w,.06),'curb');
    // Shoulder skirts meet the existing flat terrain rather than floating.
    const outer=seg=>[seg.x+seg.nx*side*(w+18),-.05,seg.z+seg.nz*side*(w+18)];
    mesh.quad(point(a,side*w),outer(a),point(b,side*w),outer(b),'grass');
   }
  }
  mesh.heightAt=height;mesh.point=point;return mesh;
 }
 return{highway,highwayHeight,circuitHeight,TriangleSurface,circuit};
});
