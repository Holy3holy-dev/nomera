# SPDX-License-Identifier: MPL-2.0
"""Extract actual pinned MPL upstream C++ TC/drift/burnout methods into float oracle.
Run with Python from any directory; requires g++ on PATH. No game JS is imported.
"""
from pathlib import Path
import hashlib, json, subprocess

root = Path(__file__).resolve().parents[2]
out = root/'work/mw-tc-drift-research'
out.mkdir(parents=True, exist_ok=True)
src = root/'work/mw-research/prostreet-port/decomp/behaviors/SuspensionRacer.cpp'
hdr = src.with_suffix('.h')
c, h = src.read_text(), hdr.read_text()

def method(signature):
    start = c.index(signature)
    brace = c.index('{', start)
    depth, pos = 1, brace + 1
    while depth:
        depth += (c[pos] == '{') - (c[pos] == '}')
        pos += 1
    return c[start:pos]

structs = h[h.index('\tstruct Drift {'):h.index('\n\tstruct Steering {')].replace('  private:', '  public:')
diff = h[h.index('\tstruct Differential {'):h.index('\n\tbool RearWheelDrive()')]
tables = c[c.index('GraphEntry<float> BurnoutFrictionData'):c.index('// Credits: Brawltendo\nvoid SuspensionRacerMW::Burnout::Update')]
yawvars = c[c.index('static float LowSpeedSpeed'):c.index('// Credits: Brawltendo\nfloat YawFrictionBoost')]
driftvars = c[c.index('GraphEntry<float> DriftStabilizerData'):c.index('// Credits: Brawltendo\nvoid SuspensionRacerMW::DoDrifting')]
tunevars = c[c.index('float EBrakeYawControlMin'):c.index('// Credits: Brawltendo\nvoid SuspensionRacerMW::TuneWheelParams')]

prelude = r'''
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>
#define FLOAT_EPSILON 0.000001f
#define ANGLE2RAD(a) ((a)*6.28318530717958647692f)
#define DEG2RAD(a) ((a)*0.01745329251994329577f)
#define DEG2ANGLE(a) ((a)/360.f)
#define MPH2MPS(a) ((a)*0.44704f)
#define MPS2MPH(a) ((a)/0.44704f)
#define G_FIRST 2
#define STYLE_DRAG 1
namespace UMath {
struct Vector2 {float x=0,y=0;};
struct Vector3 {float x=0,y=0,z=0;};
float Abs(float a){return std::abs(a);} float Min(float a,float b){return std::min(a,b);}
float Clamp(float a,float lo,float hi){return std::clamp(a,lo,hi);}
float Ramp(float a,float lo,float hi){return Clamp((a-lo)/(hi-lo),0.f,1.f);}
float Atan2d(float a,float b){return std::atan2(a,b)*57.2957795130823208768f;}
void Scale(Vector3 a,float b,Vector3& o){o={a.x*b,a.y*b,a.z*b};}
}
template<class T> struct GraphEntry {float x;T y;};
template<class T> class tGraph {public:GraphEntry<T>* p;int n;tGraph(GraphEntry<T>*p,int n):p(p),n(n){}
 T GetValue(float x){if(x<=p[0].x)return p[0].y;for(int i=1;i<n;i++)if(x<=p[i].x)return p[i-1].y+(p[i].y-p[i-1].y)*(x-p[i-1].x)/(p[i].x-p[i-1].x);return p[n-1].y;}
 void GetValue(T*out,float x){*out=GetValue(x);}
};
class Table {public:float*p;int n;float lo,hi;Table(float*p,int n,float lo,float hi):p(p),n(n),lo(lo),hi(hi){}
 float GetValue(float x){float f=std::clamp((x-lo)/(hi-lo),0.f,1.f)*(n-1);int i=(int)f;return i>=n-1?p[n-1]:p[i]+(p[i+1]-p[i])*(f-i);}
};
namespace Physics {struct Tunings {enum{BRAKES,HANDLING,RIDEHEIGHT};float Value[3]={0,0,0};};}
struct PlayerSettings {bool Handling=true;};
struct IPlayer {PlayerSettings settings;float charge=0;PlayerSettings*GetSettings(){return &settings;}void ChargeGameBreaker(float q){charge+=q;}};
struct Owner {IPlayer*player=nullptr;IPlayer*GetPlayer(){return player;}};
struct RB {UMath::Vector3 torque;void ResolveTorque(UMath::Vector3*p){torque=*p;}};
struct Tire {
 float av=0,slip=0,lat=0,drive=0,boost=1,drift=1,brake=0,ebrake=0,lateral=1;bool ground=true,locked=false;UMath::Vector2 circle{1,1};
 float GetAngularVelocity(){return av;} bool IsOnGround(){return ground;}float GetCurrentSlip(){return slip;}float GetLateralSpeed(){return lat;}
 void ApplyDriveTorque(float t){if(!locked)drive+=t;}void ScaleTractionBoost(float t){boost*=t;}void SetDriftFriction(float t){drift=t;}
 void SetBrake(float t){brake=t;}void SetEBrake(float t){ebrake=t;}float GetEBrake(){return ebrake;}void SetLateralBoost(float t){lateral=t;}
 void SetTractionCircle(UMath::Vector2 t){circle=t;}
};
struct Transmission {float torque=1000,maxSpeed=80;float GetDriveTorque(){return torque;}float GetMaxSpeedometer(){return maxSpeed;}};
struct Attributes {float DIFFERENTIAL[3]={.4f,.4f,0};float TORQUE_SPLIT=0;std::vector<float>YAW_CONTROL{.5f,1.f,1.5f};};
struct State {float time=1.f/60.f,speed=20,gas_input=1,brake_input=0,ebrake_input=0,steer_input=0,slipangle=0,nos_boost=1,shift_boost=1,mass=1400;
 int flags=0,driver_style=0,gear=G_FIRST,blown_tires=0;UMath::Vector3 local_vel{0,0,20},local_angular_vel{},inertia{0,2000,0},forward{0,0,1};
 UMath::Vector3 GetUpVector()const{return {0,1,0};}UMath::Vector3 GetForwardVector()const{return forward;}
};
const Physics::Tunings* GetVehicleMWTunings(void*){return nullptr;}
class SuspensionRacerMW {public:
'''
stub = r'''
 struct Average {float f=0;float GetValue(){return f;}};
 struct Steering {Average InputAverage;float YawControl=1;}mSteering;
 Drift mDrift;Burnout mBurnOut;Tire tire[4];Tire*mTires[4]={&tire[0],&tire[1],&tire[2],&tire[3]};
 Transmission transmission;Transmission*mTransmission=&transmission;Attributes attributes;Attributes*mMWAttributes=&attributes;
 Owner owner;RB rb;RB*mRB=&rb;float mGameBreaker=0;int mNumWheelsOnGround=4;
 Owner*GetOwner(){return &owner;}void*GetVehicle(){return nullptr;}
 bool IsRear(int i){return i>=2;}bool IsFront(int i){return i<2;}
 bool IsDriveWheel(int i){return (IsRear(i)&&attributes.TORQUE_SPLIT<1)||(IsFront(i)&&attributes.TORQUE_SPLIT>0);}
 void DoDriveForces(State&);void DoDrifting(const State&);void TuneWheelParams(State&);float CalcYawControlLimit(float);
};
'''
main = r'''
void tires(SuspensionRacerMW&s){std::cout<<"\"tires\":[";for(int i=0;i<4;i++){if(i)std::cout<<",";auto&t=s.tire[i];std::cout<<"{\"driveTorque\":"<<t.drive<<",\"tractionBoost\":"<<t.boost<<",\"driftFriction\":"<<t.drift<<",\"brake\":"<<t.brake<<",\"ebrake\":"<<t.ebrake<<"}";}std::cout<<"]";}
void driftout(SuspensionRacerMW&s){std::cout<<"\"state\":"<<s.mDrift.State<<",\"value\":"<<s.mDrift.Value<<",\"dampingTorque\":"<<s.rb.torque.y<<",\"rearFriction\":"<<s.tire[2].drift;}
void burnout(SuspensionRacerMW&s){auto&b=s.mBurnOut;std::cout<<"\"state\":"<<b.mState<<",\"time\":"<<b.mBurnOutTime<<",\"traction\":"<<b.mTraction<<",\"allow\":"<<b.mBurnOutAllow;}
int main(){std::cout<<std::setprecision(10)<<"{\"drift\":[";int n=0;
 auto df=[&](const char*name,int prev,float value,float dt,float speed,float slipDeg,float yaw,float gas,float steer,float avg,float eb,int wheels=4,int flags=0){
  SuspensionRacerMW s;State st;s.mDrift.State=(SuspensionRacerMW::Drift::eState)prev;s.mDrift.Value=value;s.mNumWheelsOnGround=wheels;s.mSteering.InputAverage.f=avg;
  st.time=dt;st.speed=speed;st.slipangle=slipDeg/360.f;st.local_angular_vel.y=yaw;st.gas_input=gas;st.steer_input=steer;st.ebrake_input=eb;st.flags=flags;
  s.DoDrifting(st);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"state\":"<<prev<<",\"value\":"<<value<<",\"dt\":"<<dt<<",\"speed\":"<<speed<<",\"slipDegrees\":"<<slipDeg<<",\"yawRate\":"<<yaw<<",\"gas\":"<<gas<<",\"steer\":"<<steer<<",\"averageSteer\":"<<avg<<",\"ebrake\":"<<eb<<",\"groundWheels\":"<<wheels<<",\"flags\":"<<flags<<"},\"expected\":{";driftout(s);std::cout<<"}}";
 };
 df("entry_one_frame_lag",0,0,1.f/60,20,15,-.8,1,-.5,-.5,0);
 df("entry_value_rise",1,0,1.f/60,20,15,-.8,1,-.5,-.5,0);
 df("in_damping",2,.5,1.f/60,20,30,-1,1,0,0,0);
 df("no_damping_same_sign",2,.5,1.f/60,20,30,1,1,0,0,0);
 df("countersteer_rear_cut",2,.5,1.f/60,20,30,-1,1,.5,.5,0);
 df("airborne_no_damping",2,.5,1.f/60,20,30,-1,1,.5,.5,0,1);
 df("negative_mirror",2,.5,1.f/60,20,-30,1,1,-.5,-.5,0);
 df("exit_decay",3,.5,1.f/60,20,0,0,0,0,0,0);
 df("exit_to_out",3,.01,1.f/60,20,0,0,0,0,0,0);
 df("staging_reset",2,.5,1.f/60,20,30,-1,1,.5,.5,0,4,1);
 df("handbrake_entry_threshold",0,0,1.f/60,20,0,0,1,.5,.5,.6);
 df("below_min_speed",0,0,1.f/60,10,40,-1,1,.5,.5,1);
 df("ninety_damping_table_end",2,.5,1.f/60,20,90,-1,1,.5,.5,0);
 std::cout<<"],\"traction\":[";n=0;
 auto tc=[&](const char*name,float slip,float lateral,float bodyForward,float bodyLat,float steer,float split,int burn,float burntraction,bool groundL=true,bool groundR=true){
  SuspensionRacerMW s;State st;s.attributes.TORQUE_SPLIT=split;s.mBurnOut.SetState(burn);s.mBurnOut.SetTraction(burntraction);st.steer_input=steer;st.local_vel={bodyLat,0,bodyForward};
  for(int i=0;i<4;i++){s.tire[i].slip=slip;s.tire[i].lat=lateral;s.tire[i].av=50;s.tire[i].ground=(i&1)?groundR:groundL;}
  s.DoDriveForces(st);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"slip\":"<<slip<<",\"lateral\":"<<lateral<<",\"bodyForward\":"<<bodyForward<<",\"bodyLateral\":"<<bodyLat<<",\"steer\":"<<steer<<",\"frontSplit\":"<<split<<",\"burnoutState\":"<<burn<<",\"burnoutTraction\":"<<burntraction<<",\"groundLeft\":"<<(groundL?"true":"false")<<",\"groundRight\":"<<(groundR?"true":"false")<<"},\"expected\":{";tires(s);std::cout<<"}}";
 };
 tc("no_slip",0,0,20,0,.5,0,0,1);
 tc("left_partial",20,-3,10,0,-.5,0,0,1);tc("right_partial",20,3,10,0,.5,0,0,1);
 tc("left_full",40,-20,10,0,-1,0,0,1);tc("right_full",40,20,10,0,1,0,0,1);
 tc("opposite_steer_no_cut",40,20,10,0,-1,0,0,1);
 tc("awd_weighted",40,20,10,0,1,.5,0,1);
 tc("burnout_bit1",40,20,10,0,1,0,5,.6);tc("burnout_bit2",40,20,10,0,1,0,6,.6);tc("burnout_no_bits",40,20,10,0,1,0,4,.6);
 tc("airborne_right_no_drive",40,20,10,0,1,0,0,1,true,false);
 std::cout<<"],\"burnout\":[";n=0;
 auto bo=[&](const char*name,int prev,float timer,float allow,float traction,float dt,float speed,float slip,int wheel,float beta){SuspensionRacerMW s;auto&b=s.mBurnOut;b.mState=prev;b.mBurnOutTime=timer;b.mBurnOutAllow=allow;b.mTraction=traction;
 b.Update(dt,speed,slip,wheel,beta/360.f);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"state\":"<<prev<<",\"time\":"<<timer<<",\"allow\":"<<allow<<",\"traction\":"<<traction<<",\"dt\":"<<dt<<",\"speedMph\":"<<speed<<",\"slip\":"<<slip<<",\"wheel\":"<<wheel<<",\"slipDegrees\":"<<beta<<"},\"expected\":{";burnout(s);std::cout<<"}}";};
 bo("init_left",0,0,0,1,.016666667,0,5,2,0);bo("init_right",0,0,0,1,.016666667,0,5,3,0);
 bo("init_speed_boundary",0,0,0,1,.016666667,20,5,2,0);bo("init_slip_boundary",0,0,0,1,.016666667,0,.5,2,0);
 bo("timer_exact_zero",5,.1,0,.6,.1,10,5,2,0);bo("timer_negative_decrement",5,.09,0,.6,.1,10,5,2,0);
 bo("cancel_allow_exact_one",5,1,.9,.6,.1,10,0,2,0);bo("cancel_allow_over_one",5,1,.91,.6,.1,10,0,2,0);
 bo("cancel_large_yaw",5,1,0,.6,.1,6,5,2,30);bo("no_yaw_cancel_low_speed",5,1,0,.6,.1,5,5,2,30);
 std::cout<<"],\"yawBoost\":[";n=0;auto yb=[&](const char*name,float yaw,float eb,float speed,float control,float grade){if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"slipRadians\":"<<yaw<<",\"ebrake\":"<<eb<<",\"speed\":"<<speed<<",\"yawControl\":"<<control<<",\"grade\":"<<grade<<"},\"expected\":"<<YawFrictionBoost(yaw,eb,speed,control,grade)<<"}";};
 yb("normal",.2,0,15,1,0);yb("capped",1,0,100,2,0);yb("ebrake_suppressed",.2,1,30,1,0);yb("grade_not_capped",1,0,100,2,-.8);yb("negative_speed_unclamped",.2,0,-10,1,0);
 std::cout<<"],\"tuneOrder\":[";n=0;for(float prev:{0.f,.5f,1.f}){SuspensionRacerMW s;State st;st.speed=30;st.local_vel.z=30;st.slipangle=30.f/360;st.local_angular_vel.y=-1;st.steer_input=.5;s.mDrift.State=SuspensionRacerMW::Drift::D_IN;s.mDrift.Value=prev;s.TuneWheelParams(st);if(n++)std::cout<<",";std::cout<<"{\"inputPreviousDriftValue\":"<<prev<<",\"expected\":{";driftout(s);std::cout<<",";tires(s);std::cout<<"}}";}std::cout<<"]}";
}
'''
methods = '\n'.join(method(s) for s in ['void SuspensionRacerMW::Burnout::Update(', 'float YawFrictionBoost(', 'float SuspensionRacerMW::CalcYawControlLimit(', 'void SuspensionRacerMW::DoDrifting(', 'void SuspensionRacerMW::TuneWheelParams(', 'void SuspensionRacerMW::Differential::CalcSplit(', 'void SuspensionRacerMW::DoDriveForces('])
average = (src.parent.parent/'AverageWindow.h').read_text()
graph = average[average.index('template <typename T> struct GraphEntry'):average.index('// Credits: Brawltendo\nfloat Table::GetValue')]
table_method = average[average.index('float Table::GetValue'):]
table_prelude = '''class Table {public: const float* pTable; int NumEntries;float MinArg, IndexMultiplier;
 Table(const float*p,int n,float lo,float hi):pTable(p),NumEntries(n),MinArg(lo),IndexMultiplier((n-1)/(hi-lo)){}
 float GetValue(float input);
};\n'''
prelude = prelude.replace('#include <vector>', '#include <vector>\n#include <cstring>')
graph_start, graph_end = prelude.index('template<class T> struct GraphEntry'), prelude.index('namespace Physics')
prelude = prelude[:graph_start] + table_prelude + graph + table_method + prelude[graph_end:]
oracle = out/'oracle.cpp'
oracle.write_text('// SPDX-License-Identifier: MPL-2.0\n// Actual extracted upstream methods; credits Brawltendo and gaycoderprincess.\n'+prelude+structs+diff+stub+tables+yawvars+driftvars+tunevars+methods+main)
exe = out/'oracle.exe'
subprocess.run(['g++','-std=c++20','-O0','-ffp-contract=off',str(oracle),'-o',str(exe)],check=True)
result = json.loads(subprocess.check_output([str(exe)],text=True))
result['provenance']={'source':str(src.relative_to(root)),'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'headerSha256':hashlib.sha256(hdr.read_bytes()).hexdigest(),'method':'Unedited actual C++ bodies, Drift/Burnout/Differential struct definitions and graph/table interpolation; environment/ABI stubs and elementary math helpers','compiler':'g++ -std=c++20 -O0 -ffp-contract=off','precision':'float32, original turn-angle inputs','scope':'isolated upstream port; not original executable equivalence'}
(out/'fixtures.json').write_text(json.dumps(result,indent=2)+'\n')
print(out/'fixtures.json')
