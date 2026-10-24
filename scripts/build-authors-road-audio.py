"""Original deterministic rain/road textures; no third-party recordings.
Requires numpy and ffmpeg. Runtime MP3 assets are committed, regeneration optional.
"""
from pathlib import Path
import hashlib,json,shutil,subprocess,wave
import numpy as np
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/authors-audio/road';WORK=ROOT/'work/road-sound/textures'
OUT.mkdir(parents=True,exist_ok=True);WORK.mkdir(parents=True,exist_ok=True)
SR=32000;meta=[]
for name,duration,channels,seed in [('rain-surface',8,2,99173),('wet-tyres',5,1,81531),('loose-surface',5,1,73117),('distant-thunder',3,1,11173)]:
    rng=np.random.default_rng(seed);n=int(SR*duration);t=np.arange(n)/SR
    mix=np.zeros((n,channels),np.float32)
    for channel in range(channels):
        white=rng.normal(0,1,n);freq=np.fft.rfftfreq(n,1/SR)
        if name=='distant-thunder':response=(1-np.exp(-freq/25))*np.exp(-(freq/420)**2)
        elif name=='loose-surface':response=(1-np.exp(-freq/90))*np.exp(-(freq/3400)**2)
        elif name=='wet-tyres':response=(1-np.exp(-freq/240))*np.exp(-(freq/6500)**2)
        else:response=(1-np.exp(-freq/180))*np.exp(-(freq/7000)**2)
        colored=np.fft.irfft(np.fft.rfft(white)*response,n=n)
        colored/=max(.001,np.std(colored))
        if name=='rain-surface':
            layer=colored*.12*(1+.055*np.sin(t*2*np.pi*.37+channel))
            # Dense small droplets, a few duller surface taps; no timer per drop at runtime.
            for _ in range(650):
                length=int(SR*rng.uniform(.009,.045));at=int(rng.uniform(0,n-length));u=np.arange(length)/SR;f=rng.uniform(550,3100)
                droplet=(np.sin(2*np.pi*f*u)+.22*np.sin(2*np.pi*f*1.51*u))*np.exp(-u*rng.uniform(110,260))*np.minimum(1,u/.0015)*rng.uniform(.012,.085)
                layer[at:at+length]+=droplet
        elif name=='wet-tyres':
            layer=colored*.14*(1+.12*np.sin(2*np.pi*1.71*t)+.04*np.sin(2*np.pi*4.37*t))
        elif name=='loose-surface':
            layer=colored*.10*(.75+.25*np.sin(2*np.pi*7.3*t)**2)
            for _ in range(120):
                length=int(SR*.018);at=int(rng.uniform(0,n-length));u=np.arange(length)/SR
                layer[at:at+length]+=rng.uniform(.025,.10)*np.sin(2*np.pi*rng.uniform(330,2100)*u)*np.exp(-u*210)*np.minimum(1,u/.001)
        else:layer=colored*.16*np.minimum(1,t/.25)*np.exp(-t*1.25)*(1+.25*np.sin(2*np.pi*1.3*t))
        layer-=np.mean(layer);mix[:,channel]=layer
    # Match loop edges without a hard splice; runtime adds its own short crossfade.
    fade=int(SR*.035);mix[:fade]*=np.linspace(0,1,fade)[:,None];mix[-fade:]*=np.linspace(1,0,fade)[:,None]
    mix*=min(1,.88/max(.001,float(np.max(np.abs(mix)))))
    wav=WORK/(name+'.wav')
    with wave.open(str(wav),'wb') as f:f.setnchannels(channels);f.setsampwidth(2);f.setframerate(SR);f.writeframes((mix*32767).astype('<i2').tobytes())
    output=OUT/(name+'.mp3')
    subprocess.run([shutil.which('ffmpeg'),'-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libmp3lame','-b:a','96k' if channels==2 else '64k','-metadata','artist=NOMERA original road acoustics',str(output)],check=True)
    meta.append({'id':name,'seconds':duration,'sampleRate':SR,'channels':channels,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()});print(name,output.stat().st_size)
(OUT/'provenance.json').write_text(json.dumps({'source':'Original deterministic DSP textures from scripts/build-authors-road-audio.py; no external recordings.','tracks':meta},indent=2),encoding='utf-8')
