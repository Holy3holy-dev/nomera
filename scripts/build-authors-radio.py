"""Original NOMERA instrumental loops, deterministic numpy DSP, no source recordings.
Requires numpy and ffmpeg on PATH. Generated MP3s are the shipped runtime assets.
"""
from pathlib import Path
import hashlib, json, shutil, subprocess, wave
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/authors-audio/radio'
WORK=ROOT/'work/sound-experience/music'
SR=32000
OUT.mkdir(parents=True,exist_ok=True)
WORK.mkdir(parents=True,exist_ok=True)
meta=[]

def hz(note):return 440*2**((note-69)/12)
def envelope(n,attack=.008,release=.04):
    t=np.arange(n)/SR
    return np.minimum(1,t/attack)*np.minimum(1,(n/SR-t)/release)

for identity,title,bpm,roots,seed in [
    ('asphalt-pulse','Asphalt Pulse',136,[38,41,36,43],8011),
    ('neon-district','Neon District',112,[45,41,48,43],9323),
    ('pursuit-line','Pursuit Line',124,[40,43,38,45],1201),
]:
    rng=np.random.default_rng(seed);beat=60/bpm;length=32*4*beat
    mix=np.zeros((int(length*SR),2),np.float32)
    def put(voice,start,level=.2,pan=0):
        at=int(start*SR);end=min(len(mix),at+len(voice))
        if end<=at:return
        mono=np.asarray(voice[:end-at],dtype=np.float32)*level
        mix[at:end,0]+=mono*np.sqrt((1-pan)/2)
        mix[at:end,1]+=mono*np.sqrt((1+pan)/2)
    def tone(note,duration,style='bass'):
        n=int(duration*SR);t=np.arange(n)/SR;f=hz(note)
        if style=='pad':
            v=sum(np.sin(2*np.pi*f*k*t)*np.exp(-k*.65)/k for k in range(1,6))
            return v*envelope(n,.25,.4)
        if style=='bell':
            v=np.sin(2*np.pi*f*t+.6*np.sin(2*np.pi*f*1.49*t)*np.exp(-t*9))
            return v*np.exp(-t*6)*envelope(n)
        v=np.sin(2*np.pi*f*t)+.27*np.sin(2*np.pi*f*2*t)+.1*np.sin(2*np.pi*f*3*t)
        return np.tanh(v*1.1)*envelope(n,.006,.075)*np.exp(-t*.9)
    def drum(kind):
        duration={'kick':.32,'snare':.22,'hat':.075,'open':.22}[kind]
        n=int(duration*SR);t=np.arange(n)/SR;noise=rng.normal(0,.3,n)
        if kind=='kick':v=np.sin(2*np.pi*(47*t+8*(1-np.exp(-t*65))))*np.exp(-t*15)+noise*np.exp(-t*180)*.2
        elif kind=='snare':
            smooth=np.convolve(noise,np.ones(9)/9,mode='same')
            v=(noise-smooth)*np.exp(-t*22)+.3*np.sin(2*np.pi*178*t)*np.exp(-t*32)
        else:
            v=np.diff(noise,prepend=0)*np.exp(-t*(55 if kind=='hat' else 16))*.5
        return v*envelope(n,.001,.012)
    drums={k:drum(k) for k in ['kick','snare','hat','open']}
    for bar in range(32):
        start=bar*4*beat;root=roots[(bar//2)%4];intensity=.55 if bar<4 or bar>=30 else .8 if 16<=bar<20 else 1
        for beat_id in range(4):
            if not(16<=bar<18) and (identity!='pursuit-line' or beat_id in [0,2,3]):put(drums['kick'],start+beat_id*beat,.62*intensity)
            if beat_id in [1,3] and bar>=2:put(drums['snare'],start+beat_id*beat,.42*intensity)
            if bar>=2:
                for sub in [0,.5]:put(drums['hat'],start+(beat_id+sub)*beat,.2*intensity,(-1 if sub==0 else 1)*.25)
            if beat_id==3 and bar%4==3:put(drums['open'],start+3.5*beat,.19,.35)
        # Rounded bass and stereo chord bed. New voicings every two bars.
        for pos in ([0,1.5,2,3.25] if identity=='asphalt-pulse' else [0,.75,1.5,2.5,3.25]):
            put(tone(root,.7*beat),start+pos*beat,.3*intensity)
        for interval in [12,15 if roots.index(root)!=1 else 16,19,22]:
            for detune,pan in [(-.06,-.65),(.06,.65)]:put(tone(root+interval+detune,4.2*beat,'pad'),start,.07*intensity,pan)
        if 4<=bar<30 and not 16<=bar<18:
            motif=[0,7,3,10,7,12,3,5]
            for j in range(8):
                if (j+bar)%3==0:continue
                note=root+24+motif[(j+bar//4)%len(motif)]
                if identity=='asphalt-pulse' and j%2:continue
                gain=.09 if identity=='asphalt-pulse' else .06
                voice=tone(note,.6*beat,'bell');pos=start+j*.5*beat
                put(voice,pos,gain,(-.3 if j%2 else .3));put(voice,pos+.375*beat,gain*.25,.5 if j%2 else -.5)
    # Short stereo echo, slow coloration and soft saturation, rendered once.
    delay=int(beat*.75*SR)
    mix[delay:]+=mix[:-delay,::-1]*.12
    mix=np.tanh(mix*.85)
    mix-=mix.mean(axis=0)
    mix*=min(1,.88/max(.001,float(np.max(np.abs(mix)))))
    edge=int(.012*SR);mix[:edge]*=np.linspace(0,1,edge)[:,None];mix[-edge:]*=np.linspace(1,0,edge)[:,None]
    wav=WORK/(identity+'.wav')
    with wave.open(str(wav),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((mix*32767).astype('<i2').tobytes())
    output=OUT/(identity+'.mp3')
    subprocess.run([shutil.which('ffmpeg'),'-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-18:TP=-1.5:LRA=7','-ar','44100','-c:a','libmp3lame','-b:a','160k','-metadata','title='+title,'-metadata','artist=NOMERA original DSP',str(output)],check=True)
    meta.append({'id':identity,'title':title,'bpm':bpm,'seconds':length,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()})
    print(identity,output.stat().st_size)
(OUT/'provenance.json').write_text(json.dumps({'source':'Original deterministic instrumental compositions created for NOMERA with scripts/build-authors-radio.py. No external recordings or game soundtrack samples.','license':'Project-authored assets; no third-party recording license required.','tracks':meta},indent=2),encoding='utf-8')
