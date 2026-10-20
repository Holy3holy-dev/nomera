# SPDX-License-Identifier: MPL-2.0
"""Independent compiled, unedited MW collision notification callback.

This is NOT a rigidbody collision/impulse solver oracle. ABI and queried body
state are supplied by an explicit recording harness. No NOMERA JS imported.
"""
from pathlib import Path
import json,hashlib,subprocess
root=Path(__file__).resolve().parents[2]
out=root/'work/mw-rollover-research/source'
out.mkdir(parents=True,exist_ok=True)
repo=root/'work/mw-research/prostreet-port'
p=repo/'decomp/behaviors/SuspensionRacer.cpp'
code=p.read_text()
sig='void SuspensionRacerMW::OnCollision('
start=code.index(sig);brace=code.index('{',start);depth=1;end=brace+1
while depth:
 depth+=(code[end]=='{')-(code[end]=='}');end+=1
method=code[start:end]
prelude=r'''
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <iomanip>
#define FLOAT_EPSILON 0.000001f
namespace UMath {
struct Vector3 {float x=0,y=0,z=0;};
float Abs(float x){return std::abs(x);}float Max(float a,float b){return std::max(a,b);}
float Ramp(float v,float a,float b){return std::clamp((v-a)/(b-a),0.f,1.f);}
float Dot(Vector3 a,Vector3 b){return a.x*b.x+a.y*b.y+a.z*b.z;}
float LengthSquare(Vector3 v){return Dot(v,v);}
void Sub(Vector3 a,Vector3 b,Vector3&r){r={a.x-b.x,a.y-b.y,a.z-b.z};}
}
namespace Sim {
float GetTime(){return 12.5f;}
namespace Collision {
struct Info {
 enum CollisionType {WORLD=1,OBJECT=2,GROUND=3};
 unsigned char padding[28]{};uint32_t flags=WORLD;
 bool objAImmobile=false,objBImmobile=false;float impulseA=0,impulseB=0;
 uint32_t objB=0;UMath::Vector3 normal{0,1,0},closingVel{},objAVel{},position{};
};
static_assert(offsetof(Info,flags)==0x1C);
}}
struct Owner {uint32_t GetOwnerHandle(){return 123;}};
struct Vehicle {float speed=1;float GetSpeed(){return speed;}};
struct Body {
 UMath::Vector3 position{},forward{0,0,1},right{1,0,0},dimensions{1,.7f,2};
 void GetForwardVector(UMath::Vector3*out){*out=forward;}void GetRightVector(UMath::Vector3*out){*out=right;}
 const UMath::Vector3*GetPosition(){return &position;}void GetDimension(UMath::Vector3*out){*out=dimensions;}
};
static const float Tweak_CollisionImpulseSteerMin=10.f,Tweak_CollisionImpulseSteerMax=40.f;
static const float Tweak_WallSteerClosingSpeed=56.25f,Tweak_WallSteerBodySpeed=6.25f;
struct SuspensionRacerMW {
 struct {float CollisionTimer=0,WallNoseTurn=0,WallSideTurn=0;} mSteering;
 float mLastGroundCollision=0;Body rigid;int complex=1;int*mRBComplex=&complex;Body*mRB=&rigid;Owner owner;Vehicle vehicle;
 Owner*GetOwner(){return &owner;}Vehicle*GetVehicle(){return &vehicle;}
 void OnCollision(const Sim::Collision::Info&);
};
'''
def f(x):return str(float(x))+'f'
def v(a):return '{'+','.join(f(x) for x in a)+'}'
base={'type':'WORLD','impulseA':20,'impulseB':30,'objB':0,'objAImmobile':False,'objBImmobile':False,'normal':[-.6,0,-.8],'closingVel':[1,0,0],'objAVel':[0,0,0],'position':[0,0,2],'signedVehicleSpeed':1,'initialTimer':0,'complexBody':True}
cases=[]
for name,delta in [
 ('world_front_slant',{}),
 ('object_owns_B_impulse',{'type':'OBJECT','objB':123,'impulseA':40,'impulseB':25}),
 ('world_owns_B_immobile',{'objB':123,'objBImmobile':True,'initialTimer':.15}),
 ('reverse_rear_side_low_impulse',{'impulseA':9,'normal':[.6,0,-.8],'position':[0,0,-2],'signedVehicleSpeed':-1}),
 ('ground_records_clock',{'type':'GROUND','normal':[0,1,0],'initialTimer':.2}),
 ('normal_vertical_guard_boundary',{'normal':[-.6,.1,-.8]}),
 ('closing_velocity_guard_boundary',{'closingVel':[7.5,0,0]}),
 ('body_speed_blocks_nose_not_reverse_side',{'objAVel':[2.5,0,0],'normal':[.6,0,-.8],'signedVehicleSpeed':-1})]:
 cases.append({'name':name,'input':dict(base,**delta)})
body=['int main(){std::cout<<std::setprecision(10)<<"[";']
for i,c in enumerate(cases):
 x=c['input'];body.append('{SuspensionRacerMW s;Sim::Collision::Info c;')
 for field in ['impulseA','impulseB']:body.append(f'c.{field}={f(x[field])};')
 for field in ['objAImmobile','objBImmobile']:body.append(f'c.{field}={str(x[field]).lower()};')
 for field in ['normal','closingVel','objAVel','position']:body.append(f'c.{field}={v(x[field])};')
 body.append(f'c.objB={x["objB"]};c.flags=Sim::Collision::Info::{x["type"]};s.vehicle.speed={f(x["signedVehicleSpeed"])};s.mSteering.CollisionTimer={f(x["initialTimer"])};')
 if not x['complexBody']:body.append('s.mRBComplex=nullptr;')
 body.append('s.OnCollision(c);')
 if i:body.append('std::cout<<",";')
 body.append(r'''std::cout<<"{\"collisionTimer\":"<<s.mSteering.CollisionTimer<<",\"wallNoseTurn\":"<<s.mSteering.WallNoseTurn<<",\"wallSideTurn\":"<<s.mSteering.WallSideTurn<<",\"lastGroundCollision\":"<<s.mLastGroundCollision<<"}";}''')
body.append('std::cout<<"]";}')
cpp=prelude+'\n'+method+'\n'+'\n'.join(body)
# The Python raw string above intentionally contains C++ quotes once.
cpp=cpp.replace('\\"','"') if False else cpp
(out/'oracle.cpp').write_text(cpp)
subprocess.run(['g++','-std=c++20','-O0',str(out/'oracle.cpp'),'-o',str(out/'oracle.exe')],check=True)
expected=json.loads(subprocess.check_output([str(out/'oracle.exe')],text=True))
for c,e in zip(cases,expected):c['expected']=e
result={'provenance':{'repository':'https://github.com/gaycoderprincess/ProStreetMWPhysics','commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'method':'SuspensionRacerMW::OnCollision','sourceFile':'decomp/behaviors/SuspensionRacer.cpp','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'compiler':'g++ -std=c++20 -O0','scope':'Unedited callback, harness stubs body queries and collision Info layout at flags offset0x1C. Enum numeric values WORLD1 OBJECT2 GROUND3 are harness-selected because their actual host declarations are absent; only semantic branch behavior is verified. Source callback impulse units are NOT known; these event fields must not be equated to raw SI N*s. No rigidbody impulse solver, restitution, contact manifold or recovery logic is verified. No JavaScript/NOMERA runtime imported.'},'cases':cases}
(out/'collision-callback-golden.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'cases':len(cases),'results':expected},indent=2))
