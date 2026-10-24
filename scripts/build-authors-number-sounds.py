"""Selected event banks: cases=mechanical, generator=premium. Kenney CC0 + original synthesis.
Requires numpy, ffmpeg. Inputs: extracted Casino Audio / Interface Sounds packs.
Regenerates two compressed banks and their versioned metadata; never edits saves.
"""
from pathlib import Path
import numpy as np
import subprocess,json,wave,hashlib,urllib.request,zipfile
SR=32000
ROOT=Path(__file__).resolve().parents[1]/'work/number-sound-sources'
OUT=Path(__file__).resolve().parents[1]/'assets/authors-audio/numbers'
OUT.mkdir(parents=True,exist_ok=True)
for label,url,digest in [
 ('casino','https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip','f36250766ac5bc378c13708ddf12a23a8e54a3251f8d482c7536e51b5dbafa18'),
 ('interface','https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip','f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232')]:
    if not (ROOT/label/'License.txt').exists():
        ROOT.mkdir(parents=True,exist_ok=True);archive=ROOT/(label+'.zip')
        if not archive.exists():urllib.request.urlretrieve(url,archive)
        assert hashlib.sha256(archive.read_bytes()).hexdigest()==digest
        with zipfile.ZipFile(archive) as z:
            for f in z.namelist():
                if f.endswith('.ogg') or f=='License.txt':
                    target=ROOT/label/Path(f).name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(f))
cache={};rng=np.random.default_rng(90317)
used=set()
def source(pack,name,rate=1,limit=None):
    key=(pack,name)
    if key not in cache:
        p=next((ROOT/pack).rglob(name+'.ogg'));used.add(str(p.relative_to(ROOT)))
        a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-']),dtype='<f4').copy()
        ix=np.flatnonzero(np.abs(a)>max(.0002,np.max(np.abs(a))*.018))
        if len(ix):a=a[max(0,ix[0]-40):min(len(a),ix[-1]+100)]
        a-=np.mean(a);a*=min(.14/max(.00001,np.sqrt(np.mean(a*a))),.7/max(.001,np.max(np.abs(a))))
        cache[key]=a
    a=cache[key]
    if rate!=1:a=np.interp(np.arange(0,len(a)-1,rate),np.arange(len(a)),a)
    if limit:a=a[:int(limit*SR)]
    a=a.copy();n=min(len(a)//2,int(.003*SR));a[:n]*=np.linspace(0,1,n);a[-n:]*=np.linspace(1,0,n)
    return a
def band(a,lo=80,hi=9000):
    n=1<<(len(a)-1).bit_length();f=np.fft.rfftfreq(n,1/SR)
    return np.fft.irfft(np.fft.rfft(a,n)*((f/(f+lo+1e-5))**2)/(1+(f/max(1,hi))**6),n)[:len(a)]
def bell(f,d=.9,soft=False):
    t=np.arange(int(d*SR))/SR;a=np.zeros(len(t))
    for mul,amp,decay in [(1,1,4.4),(2.72,.23,9.5),(5.1,.065,17)]:
        a+=np.sin(2*np.pi*f*mul*t+np.sin(2*np.pi*5*t)*.002)*amp*np.exp(-t*decay)
    a*=1-np.exp(-t*(350 if not soft else 160));a*=np.minimum(1,(d-t)/.04)
    return band(a*.12,80,4300 if soft else 8500)
def warm(f,d=1.3):
    t=np.arange(int(d*SR))/SR
    a=sum(np.sin(2*np.pi*f*k*t)*amp for k,amp in [(1,1),(2,.22),(3,.08)])
    return a*.09*(1-np.exp(-t*65))*np.exp(-t*3.4)*np.minimum(1,(d-t)/.05)
def empty(d):return np.zeros((int(d*SR),2),np.float64)
def put(dst,a,t,g=1,pan=0):
    n=min(len(a),len(dst)-int(t*SR));i=int(t*SR)
    if n<=0:return
    dst[i:i+n,0]+=a[:n]*g*np.sqrt((1-pan)/2)
    dst[i:i+n,1]+=a[:n]*g*np.sqrt((1+pan)/2)
def room(a,amount):
    b=a.copy()
    for delay,g in [(.037,.4),(.081,.28),(.129,.19),(.203,.12),(.287,.07)]:
        n=int(delay*SR);b[n:]+=a[:-n,::-1]*(g*amount)
    return b
TICKS=[];t=.28
while t<2.48:
    TICKS.append(t);t+=.044+.14*(t/2.55)**3.8
LOCKS=[2.50,2.63,2.78,2.94,3.11,3.30]
def spin(style):
    a=empty(3.58)
    if style=='mechanical':
        put(a,band(source('interface','open_002',.85,.18),90,3000),.05,.65)
        for i,t in enumerate(TICKS):put(a,band(source('casino','chip-lay-'+str(i%3+1),1.6+i%3*.07,.085),180,4500),t,.72,(-1 if i%2 else 1)*.22)
        for i,t in enumerate(LOCKS):put(a,band(source('interface','switch_006',.82+i*.045,.14),80,5200),t,1.0,-.32+i*.128)
    elif style=='modern':
        put(a,band(source('interface','open_004',1.05,.22),100,6000),.05,.55)
        for i,t in enumerate(TICKS):
            put(a,source('interface','tick_002',1.08+i%4*.035,.048),t,.42,(-1 if i%2 else 1)*.28)
            if i%6==0:put(a,bell(523*2**((i%12)/12),.16,True),t,.1)
        for i,t in enumerate(LOCKS):put(a,source('interface','select_005',.85+i*.06,.14),t,.65,-.4+i*.16)
    elif style=='premium':
        put(a,band(source('casino','card-slide-4',.8,.28),100,2500),.05,.55)
        for i,t in enumerate(TICKS):put(a,band(source('interface','click_003',.72+i%3*.025,.05),110,2400),t,.58,(-1 if i%2 else 1)*.16)
        for i,t in enumerate(LOCKS):
            put(a,band(source('casino','chip-lay-2',.83+i*.02,.13),120,3300),t,.85,-.3+i*.12)
            put(a,warm(330*2**(i/12),.2),t,.18)
    else:
        put(a,source('interface','toggle_003',.85,.2),.05,.75)
        for i,t in enumerate(TICKS):
            put(a,source('interface','tick_004',1+i%5*.03,.06),t,.56,(-1 if i%2 else 1)*.28)
            if i%4==0:put(a,band(source('casino','chips-collide-'+str(i%3+1),1.55,.1),200,7000),t,.18)
        for i,t in enumerate(LOCKS):
            put(a,source('interface','switch_007',.85+i*.075,.14),t,.85,-.4+i*.16)
            put(a,bell(659*2**(i/12),.2),t,.15)
    return room(a,.12 if style!='premium' else .25)
def win(style,r):
    a=empty(3.2);steps=2 if r==0 else 3 if r==2 else 5 if r==4 else 8
    if style=='mechanical':
        put(a,source('interface','switch_004',.73,.16),.01,.65)
        for k in range(steps+1):put(a,source('casino','chips-collide-'+str(k%4+1),1+k%3*.09,.32),.035+k*.068,.58/(1+k*.045),(-1 if k%2 else 1)*.38)
        for k,f in enumerate(([783.99] if r==0 else [783.99,987.77,1174.66] if r<4 else [783.99,987.77,1174.66,1567.98])):put(a,bell(f,1.2),.12+k*.11,.72,-.2+k*.12)
    elif style=='modern':
        put(a,source('interface','confirmation_002',.85,.32),.01,.5)
        notes=[523.25,659.25,783.99,1046.5,1318.5]
        for k in range(1 if r==0 else 3 if r==2 else 5):put(a,bell(notes[k],1.0,True),.04+k*.065,1.05,-.36+k*.18)
        for k in range(steps):put(a,source('casino','chip-lay-'+str(k%3+1),1.5,.12),.22+k*.055,.35,(-1 if k%2 else 1)*.4)
        if r>=4:
            for f in [261.63,329.63,392]:put(a,warm(f,1.45),.3,.45)
    elif style=='premium':
        put(a,band(source('casino','chip-lay-3',.82,.15),100,2500),.015,.65)
        notes=[329.63,493.88] if r==0 else [329.63,415.30,493.88,659.25]
        for k,f in enumerate(notes):put(a,warm(f,1.5 if r<4 else 2.1),.06+k*.035,.95,-.3+k*.18)
        for k in range(1 if r<4 else 4):put(a,bell(1318.5*2**([0,4,7,12][k]/12),1.2,True),.17+k*.095,.35,-.35+k*.22)
        if r==5:put(a,band(source('casino','chips-handle-4',1,.7),200,3500),.38,.35)
    else:
        put(a,source('interface','confirmation_004',1.06,.32),.01,.5)
        for k in range(steps+2):
            put(a,source('casino','chips-collide-'+str(k%4+1),1.1+k%3*.13,.30),.035+k*.052,.55,(-1 if k%2 else 1)*.5)
            if k<steps:put(a,bell(659.25*2**([0,4,7,12,16,19,24,19][k%8]/12),.9),.07+k*.07,.55,-.5+(k%5)*.25)
        if r>=4:
            for f in [329.63,415.30,493.88]:put(a,warm(f,1.3),.6,.42)
    return room(a,.3 if style=='premium' else .18)

# Match the approved audition's gain, then export event-sized slices instead of a timed movie.
banks={}
for style,input_lufs in [('mechanical',-25.15),('premium',-23.43)]:
    reference=empty(7.2);s=spin(style);reference[:len(s)]+=s;rw=win(style,2);at=int(3.65*SR);reference[at:at+len(rw)]+=rw
    gain=min(.065/np.sqrt(np.mean(reference*reference)),.68/np.max(np.abs(reference)))*10**((-25.2-input_lufs)/20)
    clips={}
    if style=='mechanical':
        a=empty(.28);put(a,band(source('interface','open_002',.85,.18),90,3000),.01,.65);clips['start']=room(a,.12)
        for i in range(3):
            a=empty(.16);put(a,band(source('casino','chip-lay-'+str(i+1),1.6+i*.07,.085),180,4500),.005,.72,(-1 if i%2 else 1)*.22);clips['tick-'+str(i)]=room(a,.12)
        for i in range(6):
            a=empty(.24);put(a,band(source('interface','switch_006',.82+i*.045,.14),80,5200),.005,1,-.32+i*.128);clips['lock-'+str(i)]=room(a,.12)
    else:
        a=empty(.38);put(a,band(source('casino','card-slide-4',.8,.28),100,2500),.01,.55);clips['start']=room(a,.25)
        for i in range(3):
            a=empty(.12);put(a,band(source('interface','click_003',.72+i*.025,.05),110,2400),.005,.58,(-1 if i%2 else 1)*.16);clips['tick-'+str(i)]=room(a,.25)
        for i in range(6):
            a=empty(.38);put(a,band(source('casino','chip-lay-2',.83+i*.02,.13),120,3300),.005,.85,-.3+i*.12);put(a,warm(330*2**(i/12),.2),.005,.18);clips['lock-'+str(i)]=room(a,.25)
    wins={r:win(style,r) for r in [0,2,4,5]}
    wins[1]=(wins[0]+wins[2])*.5;wins[3]=(wins[2]+wins[4])*.5;wins[6]=wins[5].copy()
    put(wins[6],bell(1567.98 if style=='mechanical' else 1975.53,1.2,style=='premium'),.6,.18,.32)
    for r,a in wins.items():clips['win-'+str(r)]=a
    cursor=int(.15*SR);slices={};pieces=[empty(.15)]
    for key,a in clips.items():
        a=a*gain
        nz=np.flatnonzero(np.max(np.abs(a),axis=1)>.000025)
        end=min(len(a),int(nz[-1]+.03*SR)) if len(nz) else len(a);a=a[:end].copy()
        n=min(int(.003*SR),len(a)//2);a[:n]*=np.linspace(0,1,n)[:,None];a[-n:]*=np.linspace(1,0,n)[:,None]
        slices[key]={'offset':cursor/SR,'seconds':len(a)/SR};pieces.extend([a,empty(.10)]);cursor+=len(a)+int(.10*SR)
    pcm=np.concatenate(pieces);assert np.max(np.abs(pcm))<.85
    wav=ROOT/(style+'-bank.wav')
    with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((pcm*32767).round().astype('<i2').tobytes())
    temporary=ROOT/(style+'-bank.mp3')
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-ar',str(SR),'-ac','2','-codec:a','libmp3lame','-b:a','96k',str(temporary)],check=True)
    data=temporary.read_bytes();digest=hashlib.sha256(data).hexdigest();name=style+'.'+digest[:12]+'.mp3';(OUT/name).write_bytes(data)
    banks[style]={'file':name,'bytes':len(data),'sha256':digest,'seconds':len(pcm)/SR,'clips':slices}
for label in ['casino','interface']:
    text=(ROOT/label/'License.txt').read_text(encoding='utf-8')
    (OUT/(label+'-LICENSE.txt')).write_text('\n'.join(line.rstrip() for line in text.splitlines()).strip()+'\n',encoding='utf-8')
meta={'version':1,'selection':{'cases':'mechanical','generator':'premium'},'sampleRate':SR,'channels':2,'banks':banks,'sources':[{'url':'https://kenney.nl/assets/casino-audio','license':'CC0','author':'Kenney Vleugels'},{'url':'https://kenney.nl/assets/interface-sounds','license':'CC0','author':'Kenney Vleugels'}],'usedSources':sorted(used),'ownDesign':'Modal bells, warm chords and stereo assembly; seven rarity levels'}
(OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
js='/* Generated by scripts/build-authors-number-sounds.py; two selected CC0/DSP banks. */\n(function(root,data){if(typeof module===\'object\'&&module.exports)module.exports=data;else root.NomeraNumberBanks=data;})(typeof globalThis!==\'undefined\'?globalThis:this,'+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+');\n'
(Path(__file__).resolve().parents[1]/'js/authors-number-banks.js').write_text(js,encoding='utf-8')
print('Built two selected banks,',sum(b['bytes'] for b in banks.values()),'bytes;',sum(len(b['clips']) for b in banks.values()),'event clips')
