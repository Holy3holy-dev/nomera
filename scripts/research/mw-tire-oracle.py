# SPDX-License-Identifier: MPL-2.0
"""Build isolated float32 oracle from the upstream MPL Tire methods, not game JS.

Run from the NOMERA root. Extracted source retains its original branch ordering,
turn-based angles and C++ floats. Only game ABI types are stubbed.
"""
from pathlib import Path
import hashlib, json, subprocess

root = Path(__file__).resolve().parents[2]
out = root / 'work/mw-tire-collision-research'
out.mkdir(parents=True, exist_ok=True)
src = root / 'work/mw-research/prostreet-port/decomp/behaviors/SuspensionRacer.cpp'
hdr = src.with_suffix('.h')
cpp, h = src.read_text(), hdr.read_text()
klass = h[h.index('\tclass Tire :'):h.index('\n\t// Methods')].replace('SuspensionRacerMW::', '')
methods = cpp[cpp.index('SuspensionRacerMW::Tire::Tire('):cpp.index('\nvoid SuspensionRacerMW::CreateTires()')].replace('SuspensionRacerMW::', '')
tables = cpp[cpp.index('const float ZeroDegreeTable'):cpp.index('\nstatic const float PostCollisionSteerReductionDuration')]

prelude = r'''
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <limits>
#define FLOAT_EPSILON 0.000001f
#define ANGLE2DEG(a) ((a) * 360.0f)
#define MPH2MPS(a) ((a) * 0.44704f)
#define FTLB2NM(a) ((a) * 1.3558f)
using Newtons=float;
namespace UMath {
struct Vector2 {float x,y;};
float Abs(float f){return std::abs(f);} float Min(float a,float b){return std::min(a,b);}
float Max(float a,float b){return std::max(a,b);} float Clamp(float a,float lo,float hi){return std::clamp(a,lo,hi);}
float Lerp(float a,float b,float t){return std::lerp(a,b,t);} float Sqrt(float a){return std::sqrt(a);}
float Atan2a(float y,float x){return std::atan2(y,x)/(2.0*3.14159265358979323846);}
float Sina(float a){return std::sin(a*(2.0*3.14159265358979323846));}
float Limit(float a,float l){ if(!(a*l>0.f)) return a; return a>0.f ? Min(a,l):Max(a,l); }
}
struct AxlePair {float Front,Rear; float At(int i)const{return i?Rear:Front;}};
struct MWCarTuning {
 AxlePair BRAKES{375.f,500.f}, BRAKE_LOCK{1.f,3.5f}, DYNAMIC_GRIP{1.7f,1.7f}, STATIC_GRIP{1.8f,2.f}, GRIP_SCALE{1.f,1.f};
 float EBRAKE=850.f;
};
namespace Attrib { namespace Gen {struct vehicle {}; struct simsurface {struct _LayoutStruct {float LATERAL_GRIP=1.f,DRIVE_GRIP=1.f,ROLLING_RESISTANCE=1.f;};};}}
class WheelMW {public: float mCompression=0.1f; struct {void* mLayoutPtr=nullptr;} mSurface; WheelMW(int){} void SetForce(UMath::Vector2){} };
class Table {
public: const float* pTable; int NumEntries; float MinArg,IndexMultiplier;
 Table(const float* t,int n,float lo,float hi):pTable(t),NumEntries(n),MinArg(lo),IndexMultiplier((n-1)/(hi-lo)){}
 float GetValue(float input) {
 const int entries = NumEntries; const float normarg = IndexMultiplier*(input-MinArg); const int index=(int)normarg;
 if(index<0||normarg<0.f)return pTable[0]; if(index>=(entries-1))return pTable[entries-1];
 float ind=index; if(ind>normarg)ind-=1.f; float delta=normarg-ind;
 return (1.f-delta)*pTable[index]+delta*pTable[index+1];
 }
};
'''
main = r'''
void print(const char* name,Tire& t){
 std::cout<<"{\"name\":\""<<name<<"\",\"expected\":{\"fx\":"<<t.mLongitudeForce<<",\"fy\":"<<t.mLateralForce
 <<",\"omega\":"<<t.mAV<<",\"angularAcc\":"<<t.mAngularAcc<<",\"traction\":"<<t.mTraction<<",\"slip\":"<<t.mSlip
 <<",\"slipAngleRadians\":"<<t.mSlipAngle*(2.*3.14159265358979323846)<<",\"lastTorque\":"<<t.mLastTorque
 <<",\"brakeLocked\":"<<(t.mBrakeLocked?"true":"false")<<",\"load\":"<<t.mLoad<<"}}";
}
int main(){
 std::cout<<std::setprecision(10)<<"["; MWCarTuning p; int n=0;
 auto fixture=[&](const char* name,int idx,float fwd,float lat,float omega,float traction,float drive,float brake,float ebrake,bool airborne=false){
 Tire t(.33f,idx,nullptr,&p); t.MatchSpeed(fwd);t.mLoad=4000.f;t.mAV=omega;t.mTraction=traction;
 t.BeginFrame(.5f,1.f,1.f,.15f);t.SetBrake(brake);t.SetEBrake(ebrake);t.ApplyDriveTorque(drive);
 if(airborne)t.UpdateFree(1.f/60.f);else t.UpdateLoaded(lat,fwd,std::sqrt(fwd*fwd+lat*lat),4000.f,1.f/60.f);
 if(n++)std::cout<<","; print(name,t);
 };
 fixture("stationary",0,0,0,0,1,0,0,0);
 fixture("pure_rolling",0,20,0,20.f/.33f,1,0,0,0);
 fixture("static_corner_2deg",0,20,20*std::tan(2.*3.14159265358979323846/180),20.f/.33f,1,0,0,0);
 fixture("combined_saturation",0,20,20*std::tan(2.*3.14159265358979323846/180),20.f/.33f,1,2500,0,0);
 fixture("dynamic_previous_slip",0,20,3,70,.6f,500,0,0);
 fixture("rear_pilot_factor",2,10,1,10.f/.33f,1,0,0,0);
 fixture("rear_ebrake_lock",2,20,1,20.f/.33f,1,0,0,1);
 fixture("airborne_drive",2,20,0,20.f/.33f,1,500,0,0,true);
 fixture("airborne_ebrake_lock",2,20,0,20.f/.33f,1,0,0,1,true);
 fixture("reverse_corner",0,-5,1,-5.f/.33f,1,-500,0,0);
 std::cout<<"]\n";
}
'''
oracle = out/'tire-oracle.cpp'
oracle.write_text('// SPDX-License-Identifier: MPL-2.0\n// Isolated upstream source extract from ProStreetMWPhysics; credits Brawltendo and gaycoderprincess. See notes.md.\n'+prelude+klass+'\n'+tables+'\n'+methods+'\n'+main)
exe = out/'tire-oracle.exe'
subprocess.run(['g++','-std=c++20','-O0','-ffp-contract=off',str(oracle),'-o',str(exe)],check=True)
result = json.loads(subprocess.check_output([str(exe)],text=True))
inputs=[
 ('stationary',0,0,0,0,1,0,0,0),('pure_rolling',0,20,0,20/.33,1,0,0,0),
 ('static_corner_2deg',0,20,20*__import__('math').tan(__import__('math').radians(2)),20/.33,1,0,0,0),
 ('combined_saturation',0,20,20*__import__('math').tan(__import__('math').radians(2)),20/.33,1,2500,0,0),
 ('dynamic_previous_slip',0,20,3,70,.6,500,0,0),('rear_pilot_factor',2,10,1,10/.33,1,0,0,0),
 ('rear_ebrake_lock',2,20,1,20/.33,1,0,0,1),('airborne_drive',2,20,0,20/.33,1,500,0,0),
 ('airborne_ebrake_lock',2,20,0,20/.33,1,0,0,1),('reverse_corner',0,-5,1,-5/.33,1,-500,0,0)]
for f,args in zip(result,inputs):
 f['input']=dict(zip(['index','fwd','lat','omega','traction','driveTorque','brake','ebrake'],args[1:]))
 f['input'].update(radius=.33,previousLoad=4000,previousRoadSpeed=args[2],previousAngularAcc=0,previousLastTorque=0,previousBrakeLocked=False,bodySpeed=__import__('math').hypot(args[2],args[3]),load=4000,dt=1/60,maxSlip=.5,gripBoost=1,tractionBoost=1,dragReduction=.15,airborne=args[0].startswith('airborne'))
(out/'tire-golden-fixtures.json').write_text(json.dumps({'provenance':{'method':'compiled upstream C++ source extraction; ABI stubs only','source':str(src.relative_to(root)),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'compiler':'g++ -std=c++20 -O0 -ffp-contract=off','precision':'C++ float32; atan2a and Sina use upstream turns conventions','scope':'isolated model; not an original-game binary equivalence claim'},'params':{'dynamicGrip':[1.7,1.7],'staticGrip':[1.8,2],'gripScale':[1,1],'brakesFtLb':[375,500],'brakeLock':[1,3.5],'ebrakeFtLb':850},'fixtures':result},indent=2)+'\n')
print(out/'tire-golden-fixtures.json')
