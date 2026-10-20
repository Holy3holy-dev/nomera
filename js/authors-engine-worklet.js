/* Original NOMERA GIN player. The audio render thread keeps playing while
 * GLB parsing or mobile rendering blocks the page's JavaScript thread. */
class NomeraGinProcessor extends AudioWorkletProcessor {
 constructor(){super();this.banks=null;this.voices=[];this.countdown=0;this.rpm=1000;this.target={rpm:1000,gas:false,gain:0,pitch:1};this.level=0;this.counter=0;
  this.port.onmessage=({data:d})=>{if(d.banks){this.banks=d.banks;this.voices=[];this.countdown=0;}if(d.params)this.target=d.params;if(d.stop){this.target={...this.target,gain:0};this.stopping=true;}};
 }
 position(item,rpm){const g=item.gin,a=g.rpmSamplePositions,p=Math.max(0,Math.min(1,(rpm-g.rpmMin)/(g.rpmMax-g.rpmMin)))*(a.length-1),i=Math.floor(p);return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(p-i);}
 rpmAt(item,sample){const g=item.gin,a=g.rpmSamplePositions,up=a.at(-1)>=a[0];let i=0;while(i<a.length-2&&(up?sample>a[i+1]:sample<a[i+1]))i++;return g.rpmMin+(g.rpmMax-g.rpmMin)*(i+Math.max(0,Math.min(1,(sample-a[i])/(a[i+1]-a[i]||1))))/(a.length-1);}
 spawn(item,weight){if(weight<.002)return;const duration=.12,n=Math.round(duration*sampleRate),rpm=this.rpm*this.target.pitch,sr=item.sampleRate,g=item.gin,initial=Math.max(g.rpmMin,Math.min(g.rpmMax,rpm)),rate=Math.max(.3,Math.min(2.5,rpm/initial));
  const target=this.position(item,initial)-duration*.5*rate*sr,a=g.grainSamplePositions;let lo=0,hi=a.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(a[mid]<target)lo=mid+1;else hi=mid;}
  let start=Math.max(0,a[Math.max(0,lo-1)]),ref=this.rpmAt(item,start+duration*.5*rate*sr),step=Math.max(.3,Math.min(2.5,rpm/ref))*item.bufferRate/sampleRate;
  start=Math.max(0,Math.min(start/sr*item.bufferRate,item.pcm.length-2-n*step));
  this.voices.push({pcm:item.pcm,position:start,step,age:0,length:n,gain:weight*Math.max(.35,Math.min(1,.28/Math.max(.05,item.rms||.28)))});
 }
 process(inputs,outputs){const out=outputs[0][0];if(!out)return true;const smooth=1-Math.exp(-1/(sampleRate*.035));
  for(let i=0;i<out.length;i++){
   this.rpm+=(this.target.rpm-this.rpm)*smooth;this.level+=(this.target.gain-this.level)*smooth;
   if(this.banks&&this.countdown--<=0){const idle=this.rpm<this.banks.decel.gin.rpmMin*.65,weight=idle?1:(this.target.gas?1:0);this.spawn(this.banks.accel,weight);this.spawn(this.banks.decel,1-weight);this.countdown=Math.round(.06*sampleRate)-1;}
   let value=0;for(const v of this.voices){if(v.age>=v.length)continue;const p=Math.floor(v.position),f=v.position-p;
    const sample=p>=0&&p+1<v.pcm.length?v.pcm[p]+(v.pcm[p+1]-v.pcm[p])*f:0;
    value+=sample*v.gain*(.5-.5*Math.cos(2*Math.PI*v.age/v.length));v.age++;v.position+=v.step;
   }
   out[i]=value*this.level;
  }
  this.voices=this.voices.filter(v=>v.age<v.length);
  if((this.counter+=out.length)>=sampleRate*.25){this.port.postMessage({voices:this.voices.length,rpm:this.rpm,level:this.level});this.counter=0;}
  return !(this.stopping&&this.level<1e-5);
 }
}
registerProcessor('nomera-gin',NomeraGinProcessor);
