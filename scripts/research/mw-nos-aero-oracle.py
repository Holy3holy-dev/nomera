# SPDX-License-Identifier: MPL-2.0
"""Extract pinned MPL upstream NOS/aero bodies, compile float C++ oracle.

Run Python scripts/research/mw-nos-aero-oracle.py; g++ required. No game JavaScript used.
The scaffold replaces engine ABI with value inputs/force capture. It is not the
original executable or complete rigid body integrator. Credits Brawltendo and
gaycoderprincess. Generated C++ carries actual source bodies unchanged.
"""
from pathlib import Path
import hashlib, json, subprocess

root = Path(__file__).resolve().parents[2]
out = root/'work/mw-nos-aero-research'
out.mkdir(parents=True, exist_ok=True)
port = root/'work/mw-research/prostreet-port'
engine = port/'decomp/behaviors/EngineRacer.cpp'
chassis = port/'decomp/behaviors/MWChassisBase.cpp'
info = port/'decomp/Physics.h'

def extract(path, signature):
    text = path.read_text()
    start = text.index(signature)
    brace = text.index('{', start)
    depth, pos = 1, brace + 1
    while depth:
        depth += (text[pos] == '{') - (text[pos] == '}')
        pos += 1
    return text[start:pos]

prelude = r'''
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>
#define G_FIRST 2
#define DRIVER_REMOTE 3
#define MPS2MPH(x) ((x)*2.23699f)
namespace UMath {
struct Vector3 {float x=0,y=0,z=0;Vector3()=default;Vector3(float x,float y,float z):x(x),y(y),z(z){}void operator*=(float s){x*=s;y*=s;z*=s;}};
struct Matrix4 {Vector3 x{1,0,0},y{0,1,0},z{0,0,1},p{0,0,0};};
float Max(float a,float b){return std::max(a,b);}float Min(float a,float b){return std::min(a,b);}float Pow(float a,float b){return std::pow(a,b);}
float Ramp(float x,float a,float b){return b-a>0.000001f?std::max(0.f,std::min((x-a)/(b-a),1.f)):0.f;}float Lerp(float a,float b,float t){return std::lerp(a,b,t);}float Abs(float a){return std::abs(a);}float Atan2a(float a,float b){return std::atan2(a,b)/6.28318530717958647692f;}
float Dot(Vector3 a,Vector3 b){return a.x*b.x+a.y*b.y+a.z*b.z;}
void Rotate(Vector3 a,Matrix4 m,Vector3&out){out={m.x.x*a.x+m.y.x*a.y+m.z.x*a.z,m.x.y*a.x+m.y.y*a.y+m.z.y*a.z,m.x.z*a.x+m.y.z*a.y+m.z.z*a.z};}
void RotateTranslate(Vector3 a,Matrix4 m,Vector3&out){Rotate(a,m,out);out.x+=m.p.x;out.y+=m.p.y;out.z+=m.p.z;}
}
struct MWCarTuning {float NOS_DISENGAGE=2,TORQUE_BOOST=1,FLOW_RATE=3,RECHARGE_MIN=50,NOS_CAPACITY=5,RECHARGE_MAX=30,RECHARGE_MAX_SPEED=100,RECHARGE_MIN_SPEED=50;float DRAG_COEFFICIENT=.32f,AERO_COEFFICIENT=.24f,AERO_CG=47;};
namespace Physics {struct Tunings {enum{NOS,AERODYNAMICS};float Value[2]={0,0};};namespace Info{
'''

declarations = r'''
}}
struct IPlayer {bool recharge=true;bool CanRechargeNOS(){return recharge;}};
struct Owner {IPlayer player;IPlayer*GetPlayer(){return &player;}};
struct Vehicle {float speed=0;int driver=0;float GetAbsoluteSpeed(){return speed;}int GetDriverClass(){return driver;}};
class EngineRacer {public:MWCarTuning spec;MWCarTuning*mMWInfo=&spec;Vehicle vehicle;Owner owner;int mGear=G_FIRST;float mThrottle=1,mNOSCapacity=1,mNOSEngaged=0,cheat=0;bool blown=false;
 bool HasNOS(){return spec.NOS_CAPACITY>0&&spec.TORQUE_BOOST>0;}bool IsBlown(){return blown;}bool IsNOSEngaged(){return mNOSEngaged>=1.0f;}Vehicle*GetVehicle(){return &vehicle;}Owner*GetOwner(){return &owner;}float GetCatchupCheat(){return cheat;}
 float DoNos(const Physics::Tunings*,float,bool);
};
struct ForceAt {UMath::Vector3 force,point;};
struct RB {std::vector<ForceAt>forces;void ResolveForce(UMath::Vector3*f,UMath::Vector3*p){forces.push_back({*f,*p});}};
class ChassisMW {public:struct State{UMath::Matrix4 matrix;float speed=0,gas_input=1,ground_effect=1;UMath::Vector3 linear_vel,cog;const UMath::Vector3&GetUpVector()const{return matrix.y;}const UMath::Vector3&GetForwardVector()const{return matrix.z;}};
 MWCarTuning spec;MWCarTuning*mMWAttributes=&spec;RB rb;RB*mRB=&rb;
 void DoAerodynamics(const State&,float,float,float,float,const Physics::Tunings*);
};
'''

main = r'''
void vec(UMath::Vector3 v){std::cout<<"["<<v.x<<","<<v.y<<","<<v.z<<"]";}
int main(){std::cout<<std::setprecision(10)<<"{\"nos\":[";int n=0;
auto nos=[&](const char*name,float speedMph,int gear,float gas,bool button,float tank,float timer,float dt,float tuning=0,bool recharge=true,bool blown=false,float cheat=0,bool remote=false,float capacity=5,float boost=1){EngineRacer e;e.vehicle.speed=speedMph/2.23699f;e.vehicle.driver=remote?DRIVER_REMOTE:0;e.mGear=gear;e.mThrottle=gas;e.mNOSCapacity=tank;e.mNOSEngaged=timer;e.spec.NOS_CAPACITY=capacity;e.spec.TORQUE_BOOST=boost;e.owner.player.recharge=recharge;e.blown=blown;e.cheat=cheat;Physics::Tunings t;t.Value[Physics::Tunings::NOS]=tuning;float mult=e.DoNos(&t,dt,button);if(n++)std::cout<<",";
std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"speedMph\":"<<speedMph<<",\"gear\":"<<gear<<",\"gas\":"<<gas<<",\"button\":"<<(button?"true":"false")<<",\"tank\":"<<tank<<",\"timer\":"<<timer<<",\"dt\":"<<dt<<",\"tuning\":"<<tuning<<",\"canRecharge\":"<<(recharge?"true":"false")<<",\"blown\":"<<(blown?"true":"false")<<",\"catchup\":"<<cheat<<",\"remote\":"<<(remote?"true":"false")<<",\"capacitySeconds\":"<<capacity<<",\"boost\":"<<boost<<"},\"expected\":{\"multiplier\":"<<mult<<",\"tank\":"<<e.mNOSCapacity<<",\"timer\":"<<e.mNOSEngaged<<"}}";
};
nos("start_9mph",9,2,1,true,1,0,1.f/60);nos("start_10mph",10,2,1,true,1,0,1.f/60);nos("start_100mph",100,2,1,true,1,0,.5);
nos("continue_5mph",5,2,1,true,1,1,.5);nos("stop_4mph",4,2,1,true,1,1,.5);nos("cooldown_7mph_restart_rejected",7,2,1,true,.5,.7,.1);
nos("zero_gas_stops",100,2,0,true,.5,1,.5);nos("reverse_stops",100,0,1,true,.5,1,.5);nos("neutral_stops",100,1,1,true,.5,1,.5);nos("blown_stops",100,2,1,true,.5,1,.5,0,true,true);
nos("release_has_no_torque_fade",100,2,1,false,.5,1,.5);nos("cooldown_reaches_zero_no_same_frame_recharge",100,2,1,false,.5,.25,.5);nos("no_recharge_49mph",49,2,0,false,.5,0,1);nos("recharge_50mph",50,2,0,false,.5,0,1);nos("recharge_75mph",75,2,0,false,.5,0,1);nos("recharge_100mph",100,2,0,false,.5,0,1);nos("recharge_150mph_clamped",150,2,0,false,.5,0,1);nos("player_disallows_recharge",100,2,0,false,.5,0,1,0,false);nos("tank_clamp_full",100,2,0,false,.999,0,1);nos("tank_clamp_empty_still_full_frame_boost",100,2,1,true,.001,0,1);
nos("tuning_positive",100,2,1,true,1,0,1,1);nos("tuning_negative",100,2,1,true,1,0,1,-1);nos("ai_catchup_half_discharge",100,2,1,true,1,0,1,0,true,false,1);nos("ai_catchup_double_recharge",100,2,0,false,.5,0,1,0,true,false,1);nos("remote_infinite_tank",100,2,1,true,1,0,1,0,true,false,0,true);nos("zero_capacity_no_nos_early_return",100,2,1,true,.5,.5,1,0,true,false,0,false,0);nos("zero_boost_no_nos_early_return",100,2,1,true,.5,.5,1,0,true,false,0,false,5,0);nos("uncapped_tuning_capacity_zero",100,2,1,true,.5,.5,1,4);
std::cout<<"],\"aero\":[";n=0;
auto aero=[&](const char*name,float speed,float lateral,float forward,float gas,float ground,float roll,float pitch,float tuning,float dragPct=1,float aeroPct=1){ChassisMW a;ChassisMW::State s;float cr=std::cos(roll),sr=std::sin(roll),cp=std::cos(pitch),sp=std::sin(pitch);s.matrix.x={cr,sr,0};s.matrix.y={-sr*cp,cr*cp,sp};s.matrix.z={sr*sp,-cr*sp,cp};s.speed=speed;s.gas_input=gas;s.ground_effect=ground;s.cog={.1f,.2f,.15f};s.linear_vel={lateral,0,forward};Physics::Tunings t;t.Value[Physics::Tunings::AERODYNAMICS]=tuning;a.DoAerodynamics(s,dragPct,aeroPct,1.25f,-1.45f,&t);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"speed\":"<<speed<<",\"lateral\":"<<lateral<<",\"forward\":"<<forward<<",\"gas\":"<<gas<<",\"groundEffect\":"<<ground<<",\"roll\":"<<roll<<",\"pitch\":"<<pitch<<",\"tuning\":"<<tuning<<",\"dragPct\":"<<dragPct<<",\"aeroPct\":"<<aeroPct<<",\"cog\":[0.1,0.2,0.15],\"frontZ\":1.25,\"rearZ\":-1.45,\"dragCoefficient\":0.32,\"aeroCoefficient\":0.24,\"aeroCG\":47},\"expected\":{\"forces\":[";
for(size_t i=0;i<a.rb.forces.size();i++){if(i)std::cout<<",";auto f=a.rb.forces[i];std::cout<<"{\"force\":";vec(f.force);std::cout<<",\"point\":";vec(f.point);std::cout<<"}";}std::cout<<"]}}";
};
aero("stopped",0,0,0,1,1,0,0,0);aero("50mps_flat_throttle",50,0,50,1,1,0,0,0);aero("50mps_flat_coast",50,0,50,0,1,0,0,0);aero("50mps_half_throttle",50,0,50,.5,1,0,0,0);aero("100mps_downforce_linear",100,0,100,1,1,0,0,0);aero("sideways_dropoff_floor",50,50,0,1,1,0,0,0);aero("backwards_dropoff_floor",50,0,-50,1,1,0,0,0);aero("diagonal_dropoff_sqrt",50,30,40,1,1,0,0,0);aero("airborne_flat",50,0,50,1,0,0,0,0);aero("one_wheel_rolled",50,0,50,1,.25,.6,0,0);aero("two_wheels_rolled_upness_forced_one",50,0,50,1,.5,.6,0,0);aero("inverted_airborne_no_downforce",50,0,50,1,0,3.14159265359f,0,0);aero("inverted_two_wheels_upness_forced_one",50,0,50,1,.5,3.14159265359f,0,0);aero("tilted_force_rotates_body_up",50,0,50,0,1,.3,.2,0);aero("aero_tuning_positive",50,0,50,1,1,0,0,1);aero("aero_tuning_negative",50,0,50,1,1,0,0,-1);aero("drag_style_extra_downforce",50,0,50,1,1,0,0,0,1,1.5);aero("gamebreaker_reduced_drag",50,0,50,1,1,0,0,0,.25,1);aero("aero_disabled",50,0,50,1,1,0,0,0,1,0);aero("drag_disabled",50,0,50,1,1,0,0,0,0,1);
std::cout<<"]}";}
'''

engine_text = engine.read_text()
chassis_text = chassis.read_text()
nos_constants = engine_text[engine_text.index('bool Tweak_InfiniteNOS'):engine_text.index('// Credits: Brawltendo\nfloat EngineRacer::DoNos')]
aero_constants = chassis_text[chassis_text.index('static float AeroDropOff'):chassis_text.index('// Credits: Brawltendo\nvoid ChassisMW::DoAerodynamics')]
cpp = '// SPDX-License-Identifier: MPL-2.0\n' + prelude
for signature in ['float AerodynamicDownforce(', 'float NosBoost(', 'float NosCapacity(']:
    cpp += extract(info, signature) + '\n'
cpp += declarations + nos_constants + aero_constants
cpp += extract(engine, 'float EngineRacer::DoNos(') + '\n'
cpp += extract(chassis, 'void ChassisMW::DoAerodynamics(') + '\n' + main
(out/'oracle.cpp').write_text(cpp)
subprocess.run(['g++','-std=c++20','-O0','-fno-fast-math',str(out/'oracle.cpp'),'-o',str(out/'oracle.exe')],check=True)
data = json.loads(subprocess.check_output([str(out/'oracle.exe')],text=True))
data['provenance'] = {
    'portCommit':subprocess.check_output(['git','-C',str(port),'rev-parse','HEAD'],text=True).strip(),
    'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [engine,chassis,info,engine.with_suffix('.h'),port/'MWCarTuning.h',port/'decomp/ConversionUtil.hpp',port/'decomp/UMathExtras.h']},
    'compiler':subprocess.check_output(['g++','--version'],text=True).splitlines()[0],
    'flags':['-std=c++20','-O0','-fno-fast-math'],
    'scope':'Extracted actual source methods, float32 C++ on x64; mocked engine ABI and rigid force collection; no original binary or rigid body integration.',
    'conversion':'Exact upstream MPS2MPH multiplication 2.23699f; no game JavaScript imported.'
}
(out/'fixtures.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps({'nos':len(data['nos']),'aero':len(data['aero']),'fixture':str(out/'fixtures.json'),'compiler':data['provenance']['compiler']}))
