# SPDX-License-Identifier: MPL-2.0
"""Compile unchanged pinned SetCOG; extract directly matched source parameters.

Rigid-body tensor construction is not present in these pinned repositories.
No NOMERA runtime implementation is imported for oracle values.
"""
from pathlib import Path
import json, re, subprocess, hashlib

root = Path(__file__).resolve().parents[2]
out = root / 'work/mw-mass-research'
out.mkdir(parents=True, exist_ok=True)
repo = root / 'work/mw-research/prostreet-port'
source = repo / 'decomp/behaviors/MWChassisBase.cpp'
text = source.read_text()
start = text.index('void ChassisMW::SetCOG(')
brace = text.index('{', start)
depth, end = 1, brace + 1
while depth:
    depth += (text[end] == '{') - (text[end] == '}')
    end += 1
method = text[start:end]
prelude = r'''
#include <algorithm>
#include <iostream>
#include <iomanip>
#define INCH2METERS(x) ((x)*.0254f)
namespace UMath {
struct Vector3 {float x,y,z;Vector3(float a=0,float b=0,float c=0):x(a),y(b),z(c){}};
float Max(float a,float b){return std::max(a,b);}
}
struct Layout {float FRONT_AXLE=1.3f,WHEEL_BASE=2.7f;};
struct Attr {Layout l;Layout*GetLayout(){return &l;}};
struct Pair {float data[2]={7.5f,7.5f};float At(int i){return data[i];}};
struct MW {float FRONT_WEIGHT_BIAS=54,ROLL_CENTER=9;Pair RIDE_HEIGHT;};
struct Body {UMath::Vector3 dim{.9f,.65f,2.2f},cog;void GetDimension(UMath::Vector3*v){*v=dim;}void SetCenterOfGravity(UMath::Vector3*v){cog=*v;}};
struct ChassisMW {Attr mAttributes;MW attr;MW*mMWAttributes=&attr;Body body;Body*mRB=&body,*mRBComplex=&body;int touching=4;
ChassisMW*GetIChassis(){return this;}int GetNumWheelsOnGround(){return touching;}void SetCOG(float,float);};
'''
cases = [
 dict(name='m3_ground', frontAxle=1.3, wheelbase=2.7, halfHeight=.65, bias=54, rollCenter=9, ride=[7.5,7.5], touching=4, extraBias=0, extraRide=0),
 dict(name='m3_air', frontAxle=1.3, wheelbase=2.7, halfHeight=.65, bias=54, rollCenter=9, ride=[7.5,7.5], touching=0, extraBias=0, extraRide=0),
 dict(name='tuned_front', frontAxle=1.5, wheelbase=2.9, halfHeight=.8, bias=61, rollCenter=11, ride=[8,9.5], touching=2, extraBias=-3, extraRide=-1.25),
 dict(name='rear_engine', frontAxle=1.1, wheelbase=2.4, halfHeight=.5, bias=39, rollCenter=8, ride=[6,5], touching=1, extraBias=2, extraRide=.5),
 dict(name='air_ignores_extra_bias', frontAxle=1.1, wheelbase=2.4, halfHeight=.5, bias=39, rollCenter=8, ride=[6,5], touching=0, extraBias=20, extraRide=.5),
 dict(name='large_body', frontAxle=2, wheelbase=3.3, halfHeight=1.1, bias=55, rollCenter=16, ride=[11,12], touching=4, extraBias=0, extraRide=0),
 dict(name='ride_front_max', frontAxle=1.2, wheelbase=2.5, halfHeight=.6, bias=50, rollCenter=9, ride=[9,7], touching=3, extraBias=0, extraRide=1),
 dict(name='bias_no_clamp', frontAxle=1.2, wheelbase=2.5, halfHeight=.6, bias=95, rollCenter=9, ride=[9,7], touching=4, extraBias=10, extraRide=0),
]
main = ['int main(){std::cout<<std::setprecision(10)<<"[";']
for i, c in enumerate(cases):
    main.append(('std::cout<<",";' if i else '') + '{ChassisMW c;')
    main.extend([
      f'c.mAttributes.l.FRONT_AXLE={float(c["frontAxle"])}f;c.mAttributes.l.WHEEL_BASE={float(c["wheelbase"])}f;',
      f'c.body.dim.y={c["halfHeight"]}f;c.attr.FRONT_WEIGHT_BIAS={float(c["bias"])}f;c.attr.ROLL_CENTER={float(c["rollCenter"])}f;',
      f'c.attr.RIDE_HEIGHT.data[0]={float(c["ride"][0])}f;c.attr.RIDE_HEIGHT.data[1]={float(c["ride"][1])}f;c.touching={c["touching"]};',
      f'c.SetCOG({float(c["extraBias"])}f,{float(c["extraRide"])}f);',
      'std::cout<<"["<<c.body.cog.x<<","<<c.body.cog.y<<","<<c.body.cog.z<<"]";}',
    ])
main.append('std::cout<<"]";}')
(out/'oracle.cpp').write_text(prelude + method + '\n' + '\n'.join(main))
subprocess.run(['g++','-std=c++20','-O0',str(out/'oracle.cpp'),'-o',str(out/'oracle.exe')],check=True)
values = json.loads(subprocess.check_output([str(out/'oracle.exe')],text=True))
for c, value in zip(cases, values): c['expected'] = value
commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
fixture = dict(provenance=dict(repository='https://github.com/gaycoderprincess/ProStreetMWPhysics',commit=commit,file='decomp/behaviors/MWChassisBase.cpp',sha256=hashlib.sha256(source.read_bytes()).hexdigest(),method='ChassisMW::SetCOG',compiler='g++ -std=c++20 -O0',scope='Unedited source method; harness provides attribute access and recording body. Does not assert original rigid-body tensor integration.'),cases=cases)
(out/'cog-golden.json').write_text(json.dumps(fixture,indent=2)+'\n')

profiles = json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./js/nfs-physics.js").VEHICLE_PROFILES))'],cwd=root,text=True,encoding='utf-8'))
mapping = dict(wrx='imprezawrx',m3gtr='bmwm3gtr',corvette_cross='corvettec6r',mustang_razor='mustanggt',mclaren='slr',db9='db9',viper_jv='viper',corvette_webster='corvette',gallardo_ming='gallardo',clk_kaze='clk500',mustang_jewels='mustanggt',evo8_earl='lancerevo8',cayman_baron='caymans',eclipse_lou='eclipsegt',rx7='rx8',supra='supra',is300_taz='is300',golf_sonny='gti')
rows = []
for name,p in profiles.items():
    row = dict(id=p['id'],name=name,category=p['category'])
    conf = repo/'CarDataDump/orig_mw_full'/f'{mapping[p["id"]]}.conf' if p['id'] in mapping else repo/'CarDataDump/orig_cb_full/darius.conf' if p['id']=='audir8' else None
    if conf:
        row['source'] = str(conf.relative_to(repo)).replace('\\','/')
        row['kind'] = 'Carbon Le Mans Quattro (Darius), not MW' if p['id']=='audir8' else 'MW catalogue identity'
        lines = conf.read_text().splitlines()
        for key in ['ROLL_CENTER','RIDE_HEIGHT','TENSOR_SCALE','YAW_SPEED','FRONT_WEIGHT_BIAS']:
            n, line = next((i+1,l) for i,l in enumerate(lines) if re.match(rf'{key}\s*=',l))
            row[key] = json.loads(line.split('=',1)[1].strip())
            row.setdefault('sourceLines',{})[key] = n
        row['sourceDimensions'] = None
        row['dimensionsNote'] = 'Not in dump. FRONT_AXLE,WHEEL_BASE,TRACK_WIDTH,MASS and collision-body half-dimensions remain host-game attributes.'
        if p['id']=='rx7': row['note']='NOMERA historical id rx7 is named Mazda RX-8; use rx8.conf, not rx7.conf.'
    else:
        row['source'] = None
        row['kind'] = 'NOMERA catalogue, requires explicit adapter estimates; no exact MW vehicle'
    rows.append(row)
(out/'source-profiles.json').write_text(json.dumps(dict(commit=commit,profiles=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(cogCases=len(cases),profiles=len(rows),matched=sum(bool(r['source']) for r in rows),out=str(out))))

