from pathlib import Path
import numpy as np
from PIL import Image
import json,hashlib
out=Path('work/mw-damage-research/assets');out.mkdir(parents=True,exist_ok=True);N=512;rng=np.random.default_rng(460530)
def periodic_noise(scale):
 a=rng.normal(size=(N,N));f=np.fft.rfft2(a);fy=np.fft.fftfreq(N)[:,None];fx=np.fft.rfftfreq(N)[None,:];w=np.exp(-2*np.pi**2*scale**2*(fx*fx+fy*fy));b=np.fft.irfft2(f*w,s=(N,N));return b/max(1e-8,b.std())
def seamless(a):
 # Literal edge equality avoids sampler discontinuities, with continuous periodic interior.
 a[-1]=a[0];a[:,-1]=a[:,0];return a
coarse=periodic_noise(17);medium=periodic_noise(3);fine=periodic_noise(.45);stone=np.maximum(fine-1.15,0);pores=np.maximum(-fine-1.55,0)
asphalt=77+coarse*1.25+medium*2.0+fine*4.2+stone*2.6-pores*2.3
ar=np.stack([asphalt*.985,asphalt,asphalt*1.025],axis=2);Image.fromarray(np.uint8(np.clip(seamless(ar),0,255))).save(out/'nomera-asphalt-albedo.png',optimize=True)
rough=220+coarse*1.5+medium*2.1+fine*1.8-stone*2;Image.fromarray(np.uint8(np.clip(seamless(rough),195,235)),'L').save(out/'nomera-asphalt-roughness.png',optimize=True)
cc=periodic_noise(34);cm=periodic_noise(7);cf=periodic_noise(.55);concrete=139+cc*3+cm*2.7+cf*2.2-np.maximum(-cf-1.8,0)*4
cr=np.stack([concrete*1.018,concrete*1.012,concrete],axis=2);Image.fromarray(np.uint8(np.clip(seamless(cr),0,255))).save(out/'nomera-tunnel-concrete.png',optimize=True)
rows=[]
for p in out.glob('nomera-*.png'):
 im=Image.open(p);a=np.array(im);rows.append(dict(file=p.name,bytes=p.stat().st_size,dimensions=list(im.size),mode=im.mode,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),oppositeEdgesEqual=bool(np.array_equal(a[0],a[-1]) and np.array_equal(a[:,0],a[:,-1]))))
(out/'authored-texture-manifest.json').write_text(json.dumps(dict(provenance='Original NOMERA procedural textures, generated locally from deterministic noise; no EA texture or image used.',seed=460530,files=rows),indent=2))
print(json.dumps(rows,indent=2))
