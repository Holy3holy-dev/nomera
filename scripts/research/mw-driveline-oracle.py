# SPDX-License-Identifier: MPL-2.0
"""Compile unedited pinned MW Differential::CalcSplit and DoDriveForces.
Run with Python; requires g++. No JavaScript/game implementation is imported.
"""
from pathlib import Path
import hashlib, json, subprocess, tomllib

root=Path(__file__).resolve().parents[2]
out=root/'work/mw-driveline-research'
out.mkdir(parents=True,exist_ok=True)
repo=root/'work/mw-research/prostreet-port'
src=repo/'decomp/behaviors/SuspensionRacer.cpp'
hdr=src.with_suffix('.h')
c,h=src.read_text(),hdr.read_text()
def method(signature):
    start=c.index(signature); brace=c.index('{',start); depth,pos=1,brace+1
    while depth:
        depth+=(c[pos]=='{')-(c[pos]=='}'); pos+=1
    return c[start:pos]
diff=h[h.index('\tstruct Differential {'):h.index('\n\tbool RearWheelDrive()')]
prelude=r'''
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <array>
#define FLOAT_EPSILON 0.000001f
namespace UMath {
struct Vector3 {float x=0,y=0,z=0;};
float Abs(float x){return std::abs(x);}
float Clamp(float x,float a,float b){return std::clamp(x,a,b);}
float Ramp(float x,float a,float b){return Clamp((x-a)/(b-a),0.f,1.f);}
float Atan2d(float a,float b){return std::atan2(a,b)*57.2957795130823208768f;}
}
struct Tire {float omega=0,slip=0,lateral=0,torque=0,boost=1;bool ground=true,locked=false;
 float GetAngularVelocity(){return omega;}bool IsOnGround(){return ground;}
 float GetCurrentSlip(){return slip;}float GetLateralSpeed(){return lateral;}
 void ApplyDriveTorque(float t){if(!locked)torque+=t;}void ScaleTractionBoost(float t){boost*=t;}
};
struct Transmission {float torque=1000;float GetDriveTorque(){return torque;}};
struct Attributes {float DIFFERENTIAL[3]={.8f,.8f,.8f};float TORQUE_SPLIT=.5f;};
struct State {float steer_input=0;UMath::Vector3 local_vel{0,0,20};};
class SuspensionRacerMW {public:
'''
stub=r'''
 struct Burnout {int state=0;float traction=1;int GetState(){return state;}float GetTraction(){return traction;}} mBurnOut;
 Transmission transmission;Transmission*mTransmission=&transmission;
 Attributes attributes;Attributes*mMWAttributes=&attributes;
 Tire tires[4];Tire*mTires[4]={tires,tires+1,tires+2,tires+3};
 void DoDriveForces(State&);
};
'''
main=r'''
template<class A>void arr(A a,int n){std::cout<<"[";for(int i=0;i<n;i++){if(i)std::cout<<",";std::cout<<a[i];}std::cout<<"]";}
int main(){std::cout<<std::setprecision(10)<<"{\"differential\":[";int n=0;
auto df=[&](const char*name,float a,float b,float bias,float factor,bool ground0=true,bool ground1=true,bool locked=false){
 SuspensionRacerMW::Differential d;d.angular_vel[0]=a;d.angular_vel[1]=b;d.has_traction[0]=ground0;d.has_traction[1]=ground1;d.bias=bias;d.factor=factor;d.CalcSplit(locked);
 if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"omega\":["<<a<<","<<b<<"],\"contact\":["<<(ground0?"true":"false")<<","<<(ground1?"true":"false")<<"],\"bias\":"<<bias<<",\"factor\":"<<factor<<",\"locked\":"<<(locked?"true":"false")<<"},\"expected\":";arr(d.torque_split,2);std::cout<<"}";
};
df("equal",100,100,.5,.8);df("front_spinning",200,80,.5,.8);df("rear_spinning",80,200,.5,.8);
df("front_biased",200,80,.65,.8);df("rear_biased",200,80,.3,.8);
df("source_subaru",200,80,.5,.75);df("source_evo",200,80,.5,.7);df("source_gallardo_top",200,80,.475,.8);
df("rwd_center_nonzero",200,80,0,.8);df("fwd_center_nonzero",200,80,1,.8);
df("zero_angular",0,0,.3,.8);df("negative_both",-200,-80,.3,.8);
df("left_lifted",200,80,.3,.8,false,true);df("right_lifted",200,80,.3,.8,true,false);
df("both_air",200,80,.3,.8,false,false);df("locked",200,80,.3,.8,true,true,true);
df("factor_zero",200,80,.3,0);df("factor_negative",200,80,.3,-.5);df("factor_one",200,80,.3,1);
df("opposed_exact_cancel",100,-100,.5,.8);df("opposed_partial",100,-80,.5,.8);
df("opposed_bias",100,-80,.3,.8);df("epsilon_below",.0000001f,.0000001f,.5,.8);df("epsilon_above",.000002f,.000002f,.5,.8);
std::cout<<"],\"drive\":[";n=0;
auto dr=[&](const char*name,float share,std::array<float,3> factors,std::array<float,4> omega,int contacts=15,float torque=1000,float slip=0,float lateral=0,float steer=0,float bodyForward=20,float bodyLateral=0,int burn=0,float burnTraction=1,int locked=0,bool transmission=true){
 SuspensionRacerMW s;State st;s.attributes.TORQUE_SPLIT=share;for(int i=0;i<3;i++)s.attributes.DIFFERENTIAL[i]=factors[i];s.transmission.torque=torque;s.mBurnOut.state=burn;s.mBurnOut.traction=burnTraction;
 if(!transmission)s.mTransmission=nullptr;st.steer_input=steer;st.local_vel={bodyLateral,0,bodyForward};
 for(int i=0;i<4;i++){s.tires[i].omega=omega[i];s.tires[i].ground=(contacts&(1<<i))!=0;s.tires[i].slip=slip;s.tires[i].lateral=lateral;s.tires[i].locked=(locked&(1<<i))!=0;}
 s.DoDriveForces(st);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"frontShare\":"<<share<<",\"factor\":";arr(factors,3);std::cout<<",\"omega\":";arr(omega,4);
 std::cout<<",\"contactMask\":"<<contacts<<",\"torque\":"<<torque<<",\"slip\":"<<slip<<",\"lateral\":"<<lateral<<",\"steer\":"<<steer<<",\"forward\":"<<bodyForward<<",\"bodyLateral\":"<<bodyLateral<<",\"burnoutState\":"<<burn<<",\"burnoutTraction\":"<<burnTraction<<",\"lockedMask\":"<<locked<<",\"transmission\":"<<(transmission?"true":"false")<<"},\"expected\":{\"torques\":[";
 for(int i=0;i<4;i++){if(i)std::cout<<",";std::cout<<s.tires[i].torque;}std::cout<<"],\"boost\":[";for(int i=0;i<4;i++){if(i)std::cout<<",";std::cout<<s.tires[i].boost;}std::cout<<"]}}";
};
dr("stock_bmw_rwd",0,{.8,.8,0},{80,80,80,80});dr("stock_golf_fwd",1,{.8,.8,0},{80,80,80,80});
dr("stock_subaru_awd",.5,{.7,.75,.75},{80,80,80,80});dr("stock_evo_awd",.5,{.7,.7,.7},{80,80,80,80});dr("stock_gallardo_awd",.5,{.8,.8,.8},{80,80,80,80});
dr("top_gallardo_awd",.475,{.65,.65,.8},{200,190,80,75});dr("awd_front_slip",.5,{.7,.75,.75},{200,200,80,80});dr("awd_rear_slip",.5,{.7,.75,.75},{80,80,200,200});
dr("awd_inside_front_slip",.41,{.7,.75,.75},{200,80,80,80});dr("awd_inside_rear_slip",.41,{.7,.75,.75},{80,80,200,80});
dr("awd_center_disabled",.41,{.7,.75,0},{200,80,80,80});dr("awd_axles_disabled",.41,{0,0,.75},{200,80,80,80});
dr("awd_front_axle_air",.41,{.7,.75,.75},{200,80,80,80},12);dr("awd_rear_axle_air",.41,{.7,.75,.75},{80,80,200,80},3);
dr("awd_one_front_contact",.41,{.7,.75,.75},{200,80,80,80},14);dr("awd_one_rear_contact",.41,{.7,.75,.75},{80,80,200,80},7);
dr("awd_all_air",.41,{.7,.75,.75},{200,80,80,80},0);dr("rwd_nonzero_center",0,{.8,.8,.8},{200,80,80,80});dr("fwd_nonzero_center",1,{.8,.8,.8},{200,80,80,80});
dr("awd_reverse",.41,{.7,.75,.75},{-200,-80,-80,-80},15,-1000);dr("awd_zero_torque",.41,{.7,.75,.75},{200,80,80,80},15,0);
dr("awd_tc_right",.41,{.7,.75,.75},{200,80,80,80},15,1000,80,40,1,10);dr("awd_tc_left",.41,{.7,.75,.75},{80,200,80,80},15,1000,80,-40,-1,10);
dr("awd_tc_opposite",.41,{.7,.75,.75},{200,80,80,80},15,1000,80,40,-1,10);
dr("awd_burnout_bit1",.41,{.7,.75,.75},{200,80,80,80},15,1000,80,40,1,10,0,5,.6);dr("awd_burnout_bit2",.41,{.7,.75,.75},{200,80,80,80},15,1000,80,40,1,10,0,6,.6);
dr("awd_locked_rear",.41,{.7,.75,.75},{200,80,0,0},15,1000,0,0,0,20,0,0,1,12);
dr("awd_opposed_axles",.5,{.8,.8,.8},{100,100,-80,-80});dr("awd_opposed_wheels",.5,{.8,.8,.8},{100,-80,80,80});
dr("awd_no_transmission",.5,{.8,.8,.8},{100,100,80,80},15,1000,0,0,0,20,0,0,1,0,false);
std::cout<<"]}";
}
'''
oracle=out/'oracle.cpp'
oracle.write_text('// SPDX-License-Identifier: MPL-2.0\n// Actual extracted methods; Brawltendo / gaycoderprincess.\n'+prelude+diff+stub+method('void SuspensionRacerMW::Differential::CalcSplit(')+'\n'+method('void SuspensionRacerMW::DoDriveForces(')+main)
exe=out/'oracle.exe'
subprocess.run(['g++','-std=c++20','-O0','-ffp-contract=off',str(oracle),'-o',str(exe)],check=True)
result=json.loads(subprocess.check_output([str(exe)],text=True))
result['provenance']={'source':str(src.relative_to(root)),'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'headerSha256':hashlib.sha256(hdr.read_bytes()).hexdigest(),'commit':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'method':'Unedited actual Differential::CalcSplit and DoDriveForces methods, original Differential struct. ABI environment stubs; actual brake-lock gate and elementary float math.','compiler':'g++ -std=c++20 -O0 -ffp-contract=off','precision':'float32','scope':'isolated upstream port, no assertion of retail executable equivalence'}
result['originalMWData']={}
for name in ['bmwm3gtr','gti','imprezawrx','lancerevo8','gallardo']:
    for suffix in ['','_top']:
        p=repo/'CarDataDump/orig_mw_full'/f'{name}{suffix}.conf'; tr=tomllib.loads(p.read_text())['transmission']
        result['originalMWData'][name+suffix]={'differential':tr['DIFFERENTIAL'],'frontShare':tr['TORQUE_SPLIT'],'source':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
(out/'fixtures.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'{len(result["differential"])} differential + {len(result["drive"])} drive cases written to {out/"fixtures.json"}')
