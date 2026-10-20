// The source front-left wheel was mirrored across X without transforming its
// winding or normal X component. Correct that mirror on the six wheel primitives
// so the showroom and races use the same intact wheel, without extra draw calls.
'use strict';
const fs=require('node:fs'),path=require('node:path');
function repair(file=path.resolve(__dirname,'../assets/models/vaz2109.glb')){
 const data=fs.readFileSync(file);let gltf,binary;
 for(let at=12;at<data.length;){const length=data.readUInt32LE(at),type=data.readUInt32LE(at+4);if(type===0x4e4f534a)gltf=JSON.parse(data.subarray(at+8,at+8+length));if(type===0x004e4942)binary=data.subarray(at+8,at+8+length);at+=length+8;}
 const bytes={5126:4,5125:4,5123:2,5121:1},dimensions={SCALAR:1,VEC3:3};
 const accessor=id=>{const a=gltf.accessors[id],view=gltf.bufferViews[a.bufferView],size=bytes[a.componentType],stride=view.byteStride||size*dimensions[a.type],start=(view.byteOffset||0)+(a.byteOffset||0),read=a.componentType===5126?'readFloatLE':a.componentType===5125?'readUInt32LE':a.componentType===5123?'readUInt16LE':'readUInt8',write=a.componentType===5126?'writeFloatLE':a.componentType===5125?'writeUInt32LE':a.componentType===5123?'writeUInt16LE':'writeUInt8';return{count:a.count,get:(i,k=0)=>binary[read](start+i*stride+k*size),set:(i,v,k=0)=>binary[write](v,start+i*stride+k*size)};};
 let corrected=0;const components={};
 for(const mesh of gltf.meshes){if(!/Standardmater(?:46|47|48|49|50|52)_0$/.test(mesh.name))continue;
  let count=0;for(const p of mesh.primitives){const positions=accessor(p.attributes.POSITION),normals=accessor(p.attributes.NORMAL),index=accessor(p.indices),triangles=[],vertices=new Set();let needsRepair=false;
   for(let at=0;at<index.count;at+=3){const ids=[0,1,2].map(k=>index.get(at+k)),v=ids.map(i=>[0,1,2].map(k=>positions.get(i,k))),n=[0,1,2].map(k=>ids.reduce((sum,i)=>sum+normals.get(i,k),0));
    // The other three wheels already have consistent winding.
    if(v.some(p=>p[0]>=0||p[2]>=0))continue;
    const ab=v[1].map((x,k)=>x-v[0][k]),ac=v[2].map((x,k)=>x-v[0][k]),face=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(face.reduce((sum,x,k)=>sum+x*n[k],0)<-1e-5)needsRepair=true;
    triangles.push({at,ids});ids.forEach(i=>vertices.add(i));
   }
   if(needsRepair){for(const{at,ids}of triangles){index.set(at+1,ids[2]);index.set(at+2,ids[1]);count++;}for(const i of vertices)normals.set(i,-normals.get(i));}
  }components[mesh.name]=count;corrected+=count;
 }
 if(corrected)fs.writeFileSync(file,data);return{corrected,components};
}
if(require.main===module)console.log(JSON.stringify(repair(),null,2));
module.exports={repair};
