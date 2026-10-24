/* Four-way overlap and local phase matching keep RPM grains coherent.
 * Rendering stays on the audio thread, including throttle morph and DC guard. */
class NomeraGinProcessor extends AudioWorkletProcessor {
 constructor(){super();this.banks=null;this.hop=.03;this.windowGain=1;this.phaseAlign=true;this.voices=[];this.countdown=0;this.rpm=1000;this.load=0;this.target={rpm:1000,gas:false,gain:0,pitch:1};this.level=0;this.counter=0;this.dcX=0;this.dcY=0;this.peak=0;this.energy=0;this.length=Math.round(.12*sampleRate);this.hann=Float32Array.from({length:this.length},(_,i)=>(.5-.5*Math.cos(2*Math.PI*i/this.length))*.5);
  this.port.onmessage=({data:d})=>{if(d.banks){this.banks=d.banks;this.hop=d.banks.overlap===2?.06:.03;this.windowGain=d.banks.overlap===2?2:1;this.phaseAlign=d.banks.phaseAlign!==false;this.voices=[];this.countdown=0;}if(d.params)this.target=d.params;if(d.stop){this.target={...this.target,gain:0};this.stopping=true;}};
 }
 position(item,rpm){const g=item.gin,a=g.rpmSamplePositions,p=Math.max(0,Math.min(1,(rpm-g.rpmMin)/(g.rpmMax-g.rpmMin)))*(a.length-1),i=Math.floor(p);return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(p-i);}
 rpmAt(item,sample){const g=item.gin,a=g.rpmSamplePositions,up=a.at(-1)>=a[0];let i=0;while(i<a.length-2&&(up?sample>a[i+1]:sample<a[i+1]))i++;return g.rpmMin+(g.rpmMax-g.rpmMin)*(i+Math.max(0,Math.min(1,(sample-a[i])/(a[i+1]-a[i]||1))))/(a.length-1);}
 at(pcm,pos){const i=Math.floor(pos),f=pos-i;return i>=0&&i+1<pcm.length?pcm[i]+(pcm[i+1]-pcm[i])*f:0;}
 align(item,start,step){if(!this.phaseAlign)return start;let previous=null;for(let i=this.voices.length-1;i>=0;i--)if(this.voices[i].bank===item&&this.voices[i].age<this.length*.8){previous=this.voices[i];break;}if(!previous)return start;const ahead=this.length*.25,reference=previous.position+previous.step*ahead,center=start+step*ahead,span=Math.round(item.bufferRate*.006),stride=Math.max(4,Math.round(item.bufferRate*.00025));let best=-Infinity,offset=0;
  for(let shift=-span;shift<=span;shift+=stride){const candidate=start+shift;if(candidate<0||candidate+this.length*step>=item.pcm.length-1)continue;let cross=0,aa=0,bb=0;for(let j=0;j<32;j++){const a=this.at(item.pcm,reference+j*previous.step*3),b=this.at(item.pcm,center+shift+j*step*3);cross+=a*b;aa+=a*a;bb+=b*b;}const score=cross/Math.sqrt(aa*bb+1e-12)-Math.abs(shift)/Math.max(1,span)*.002;if(score>best){best=score;offset=shift;}}return start+offset;
 }
 spawn(item,weight){if(weight<.015)return;const duration=.12,n=this.length,rpm=this.rpm*this.target.pitch,sr=item.sampleRate,g=item.gin,initial=Math.max(g.rpmMin,Math.min(g.rpmMax,rpm)),rate=Math.max(.3,Math.min(2.5,rpm/initial)),target=this.position(item,initial)-duration*.5*rate*sr,a=g.grainSamplePositions;let lo=0,hi=a.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(a[mid]<target)lo=mid+1;else hi=mid;}
  let start=Math.max(0,a[Math.max(0,lo-1)]),ref=this.rpmAt(item,start+duration*.5*rate*sr),step=Math.max(.3,Math.min(2.5,rpm/ref))*item.bufferRate/sampleRate;start=Math.max(0,Math.min(start/sr*item.bufferRate,item.pcm.length-2-n*step));start=this.align(item,start,step);
  this.voices.push({bank:item,pcm:item.pcm,position:start,step,age:0,gain:weight*Math.max(.3,Math.min(1,.245/Math.max(.05,item.rms||.28)))});
 }
 process(inputs,outputs){const out=outputs[0][0];if(!out)return true;const smooth=1-Math.exp(-1/(sampleRate*.045)),loadSmooth=1-Math.exp(-1/(sampleRate*.09)),dc=Math.exp(-2*Math.PI*24/sampleRate);
  for(let i=0;i<out.length;i++){this.rpm+=(this.target.rpm-this.rpm)*smooth;this.level+=(this.target.gain-this.level)*smooth;this.load+=((this.target.load??Number(this.target.gas))-this.load)*loadSmooth;
   if(this.banks&&this.countdown--<=0){this.voices=this.voices.filter(v=>v.age<this.length);const idle=this.rpm<this.banks.decel.gin.rpmMin*.65,weight=idle?1:this.load;this.spawn(this.banks.accel,Math.sqrt(weight));this.spawn(this.banks.decel,Math.sqrt(1-weight));this.countdown=Math.round(this.hop*sampleRate)-1;}
   let value=0;for(const v of this.voices){if(v.age>=this.length)continue;value+=this.at(v.pcm,v.position)*v.gain*this.hann[v.age++]*this.windowGain;v.position+=v.step;}
   value*=this.level;const clean=dc*(this.dcY+value-this.dcX);this.dcX=value;this.dcY=clean;out[i]=Math.abs(clean)<=.8?clean:Math.sign(clean)*(.8+.15*Math.tanh((Math.abs(clean)-.8)/.15));this.peak=Math.max(this.peak,Math.abs(out[i]));this.energy+=out[i]*out[i];
  }
  if((this.counter+=out.length)>=sampleRate*.25){this.port.postMessage({voices:this.voices.filter(v=>v.age<this.length).length,rpm:this.rpm,load:this.load,level:this.level,peak:this.peak,rms:Math.sqrt(this.energy/this.counter)});this.counter=0;this.peak=0;this.energy=0;}
  return !(this.stopping&&this.level<1e-5);
 }
}
registerProcessor('nomera-gin',NomeraGinProcessor);
