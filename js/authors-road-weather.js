/* One asphalt shader, no reflection pass, lights, textures or physics writes. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRoadWeather=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const clamp=n=>Math.max(0,Math.min(1,n));
 function advance(wet,rain,dt){const t=Math.min(.1,Math.max(0,dt||0));return clamp(wet+(clamp(rain)-wet)*(1-Math.exp(-t/(rain>wet?3.5:24))));}
 function shelter(z,forced){if(forced)return forced==='tunnel'?1:0;const p=((z%1800)+1800)%1800;return clamp(Math.min((p-570)/25,(1170-p)/25));}
 function shader(s,u,prior){prior?.(s);Object.assign(s.uniforms,u);s.vertexShader='varying vec3 aeRoadWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\naeRoadWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader='varying vec3 aeRoadWorld; uniform float aeWet; uniform float aeHighway; uniform float aeRoof; uniform vec3 aeSky;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
float aeZ=mod(mod(aeRoadWorld.z,1800.)+1800.,1800.);
float aeCovered=aeRoof<0.?clamp(min((aeZ-570.)/25.,(1170.-aeZ)/25.),0.,1.)*aeHighway:aeRoof;
float aePatch=smoothstep(-.3,.65,sin(aeRoadWorld.x*.57+sin(aeRoadWorld.z*.09))*sin(aeRoadWorld.z*.17+aeRoadWorld.x*.23));
float aeWater=aeWet*(1.-aeCovered*.88);
roughnessFactor=mix(.91,mix(.59,.40,aePatch),aeWater);
diffuseColor.rgb*=1.-aeWater*(.16+.10*aePatch);`);
  s.fragmentShader=s.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',`float aeFresnel=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
outgoingLight+=aeSky*aeWater*aeFresnel*(.09+.22*aePatch);
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`);
 }
 function bind(e){const m=e.authorsRoadMaterial;if(!m?.isMeshStandardMaterial||e.authorsRoadWeather?.material===m)return;destroy(e);const u={aeWet:{value:e.currentActiveWeather==='rain'?.65:0},aeHighway:{value:e.roadChunks?1:0},aeRoof:{value:-1},aeSky:{value:new e.THREE.Color(0x9db9c9)}};const s=e.authorsRoadWeather={material:m,previous:m.onBeforeCompile,key:m.customProgramCacheKey,uniforms:u,wet:u.aeWet.value};m.onBeforeCompile=code=>shader(code,u,s.previous);m.customProgramCacheKey=()=>s.key.call(m)+'|nomera-wet-road-v1';m.needsUpdate=true;}
 function precipitation(e,s,weight,dt){if(!e.track||!e.scene||!e.camera)return;const T=e.THREE;if(!s.rain&&weight>.01){const points=new Float32Array(196*6);for(let i=0;i<196;i++){const k=i*6;points[k]=(i*7.31%48)-24;points[k+1]=(i*3.71%26)-8;points[k+2]=(i*5.17%48)-24;points[k+3]=points[k]-.05;points[k+4]=points[k+1]+.65;points[k+5]=points[k+2];}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(points,3).setUsage(T.DynamicDrawUsage));const material=new T.LineBasicMaterial({color:0xc2d7e0,transparent:true,opacity:0,depthWrite:false});s.rain=new T.LineSegments(geometry,material);s.rain.name='CircuitRainStreaks';s.rain.frustumCulled=false;e.scene.add(s.rain);}if(!s.rain)return;s.rain.visible=weight>.004;s.rain.material.opacity=weight*.26;if(!s.rain.visible)return;s.rain.position.copy(e.camera.position);const p=s.rain.geometry.attributes.position,a=p.array,t=Math.min(.1,Math.max(0,dt));for(let k=0;k<a.length;k+=6){a[k+1]-=t*24;if(a[k+1]<-10)a[k+1]+=26;a[k+4]=a[k+1]+.65;}p.needsUpdate=true;}
 function update(e,dt=1/60){bind(e);const s=e.authorsRoadWeather;if(!s)return;const weights=e.authorsEnvironment?.weatherWeights,rain=weights?.rain??Number(e.currentActiveWeather==='rain');s.wet=advance(s.wet,rain,dt);s.uniforms.aeWet.value=s.wet;s.uniforms.aeRoof.value=e.roadChunks?(e.forcedBiome?Number(e.forcedBiome==='tunnel'):-1):0;const p=e.authorsEnvironment?.blendedPalette;s.uniforms.aeSky.value.setHex(p?.horizon||0x9db9c9).convertSRGBToLinear().multiplyScalar(.65-.43*(e.authorsEnvironment?.weatherWeights?.night||0));s.material.color.setHex(0xffffff);s.material.metalness=.01;s.material.roughness=.91;precipitation(e,s,rain,dt);e.authorsRoadWetness=s.wet;e.roadWeatherTelemetry={wetness:s.wet,rainWeight:rain,shelter:e.roadChunks?shelter(e.state.z,e.forcedBiome):0,rainStreaks:s.rain?.visible?196:0,extraPasses:0,extraTextures:0,physicsChanged:false};}
 function destroy(e){const s=e.authorsRoadWeather;if(!s)return;if(s.rain){s.rain.parent?.remove(s.rain);s.rain.geometry.dispose();s.rain.material.dispose();}s.material.onBeforeCompile=s.previous;s.material.customProgramCacheKey=s.key;s.material.needsUpdate=true;delete e.authorsRoadWeather;delete e.roadWeatherTelemetry;}
 return{update,destroy,advance,shelter,shader};
});
