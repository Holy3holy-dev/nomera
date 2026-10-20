# SPDX-License-Identifier: MPL-2.0
"""Compile unedited pinned MW wheel, suspension, and jump-stabilizer routines.

Math/rigid-body/road-query adapters are independent harness stubs. Tire forces
are prescribed inputs, not another copy of NOMERA's Tire implementation.
"""
from pathlib import Path
import json, hashlib, subprocess, math
root=Path(__file__).resolve().parents[2]
out=root/'work/mw-contact-research'
out.mkdir(parents=True,exist_ok=True)
repo=root/'work/mw-research/prostreet-port'
sources={k:repo/v for k,v in {
 'wheel':'decomp/behaviors/MWWheel.cpp',
 'suspension':'decomp/behaviors/SuspensionRacer.cpp',
 'chassis':'decomp/behaviors/MWChassisBase.cpp',
 'graph':'decomp/AverageWindow.h'}.items()}
def method(path,signature):
 c=path.read_text();start=c.index(signature);brace=c.index('{',start);depth,pos=1,brace+1
 while depth:
  depth+=(c[pos]=='{')-(c[pos]=='}');pos+=1
 return c[start:pos]
wheel=method(sources['wheel'],'bool WheelMW::UpdatePosition(')
suspension=method(sources['suspension'],'void SuspensionRacerMW::DoWheelForces(')
chassis_text=sources['chassis'].read_text()
jump_start=chassis_text.index('static const int bJumpStabilizer')
jump=chassis_text[jump_start:chassis_text.index('void ChassisMW::DoJumpStabilizer',jump_start)]+method(sources['chassis'],'void ChassisMW::DoJumpStabilizer(')
graph_text=sources['graph'].read_text()
graph=graph_text[graph_text.index('class Graph {'):graph_text.index('template <typename T> struct GraphEntry')]
prelude=r'''
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <array>
#define FLOAT_EPSILON 0.000001f
#define LBIN2NM(x) ((x)*175.1268f)
#define INCH2METERS(x) ((x)*.0254f)
namespace UMath {
struct Vector4;
struct Vector3 {float x=0,y=0,z=0;Vector3()=default;Vector3(float a,float b,float c):x(a),y(b),z(c){};Vector3(const Vector4&);Vector3 operator*(float s)const{return {x*s,y*s,z*s};}};
struct Vector4 {float x=0,y=0,z=0,w=0;};
Vector3::Vector3(const Vector4&v):x(v.x),y(v.y),z(v.z){}
struct Matrix4 {Vector4 x{1,0,0,0},y{0,1,0,0},z{0,0,1,0},p{0,0,0,1};};
Vector3 Vector4To3(const Vector4&v){return {v.x,v.y,v.z};}
Vector4 Vector4Make(Vector3 v,float w){return{v.x,v.y,v.z,w};}
float Abs(float v){return std::abs(v);}float Min(float a,float b){return std::min(a,b);}float Max(float a,float b){return std::max(a,b);}
float Clamp(float a,float b,float c){return std::clamp(a,b,c);}float Pow(float a,float b){return std::pow(a,b);}float Ramp(float a,float b,float c){return Clamp((a-b)/(c-b),0,1);}
float Dot(Vector3 a,Vector3 b){return a.x*b.x+a.y*b.y+a.z*b.z;}
float Length(Vector3 v){return std::sqrt(Dot(v,v));}float Lengthxz(Vector3 v){return std::hypot(v.x,v.z);}
void Add(Vector3 a,Vector3 b,Vector3&r){r={a.x+b.x,a.y+b.y,a.z+b.z};}void Sub(Vector3 a,Vector3 b,Vector3&r){r={a.x-b.x,a.y-b.y,a.z-b.z};}
void Cross(Vector3 a,Vector3 b,Vector3&r){r={a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};}
void UnitCross(Vector3 a,Vector3 b,Vector3&r){Cross(a,b,r);float l=Length(r);r=l?r*(1/l):Vector3{};}
void Scale(Vector3 a,float s,Vector3&r){r=a*s;}void Scale(Vector3 a,Vector3 b,Vector3&r){r={a.x*b.x,a.y*b.y,a.z*b.z};}
void ScaleAdd(Vector3 a,float s,Vector3 b,Vector3&r){Add(a*s,b,r);}
void Rotate(Vector3 a,Matrix4 m,Vector3&r){r={m.x.x*a.x+m.y.x*a.y+m.z.x*a.z,m.x.y*a.x+m.y.y*a.y+m.z.y*a.z,m.x.z*a.x+m.y.z*a.y+m.z.z*a.z};}
void RotateTranslate(Vector3 a,Matrix4 m,Vector3&r){Rotate(a,m,r);Add(r,Vector4To3(m.p),r);}
}
using UMath::Vector3;using UMath::Vector4;using UMath::Matrix4;
struct bVector2 {float x,y;bVector2(float a,float b):x(a),y(b){}};
GRAPH_DECLARATION
namespace Attrib {struct Collection{};}
struct WCollider{};
struct WWorldPos {float tolerance=0;Attrib::Collection*fSurface=nullptr;Vector4 normal{0,1,0,0};void SetTolerance(float t){tolerance=t;}static bool Update(WWorldPos*w,Vector3*p,Vector4*n,bool,const WCollider*,bool){*n=w->normal;return true;}};
class WheelMW {public:
 Vector3 mLocalArm,mWorldArm,mPosition,mVelocity;Vector4 mNormal;WWorldPos mWorldPos;float compression=.04f;
 bool UpdatePosition(const Vector3&,const Vector3&,const Matrix4&,const Vector3&,float,float,bool,const WCollider*,float);
 void SetVelocity(Vector3 v){mVelocity=v;}bool IsOnGround(){return compression>0;}void UpdateSurface(const Attrib::Collection*){}
};
struct Tire:WheelMW {Vector3 force;float radius=.33f,load=0,xspeed=0,zspeed=0,lateral=0,longitude=0,airtime=0,bottomout=-1;bool free=false;
 float GetRadius(){return radius;}Vector3 GetWorldArm(){return mWorldArm;}const Vector4&GetNormal(){return mNormal;}float GetCompression(){return compression;}void SetCompression(float c){compression=c;}
 void SetBottomOutTime(float t){bottomout=t;}const Vector3&GetVelocity(){return mVelocity;}
 float UpdateLoaded(float x,float z,float,float l,float){xspeed=x;zspeed=z;load=l;return lateral;}float GetLongitudeForce(){return longitude;}
 void SetForce(Vector3 f){force=f;}const Vector3&GetForce(){return force;}void UpdateFree(float){free=true;}
 void IncAirTime(float t){airtime+=t;}void SetAirTime(float t){airtime=t;}
 Vector3 GetLocalArm(){return mLocalArm;}void SetPosition(Vector3 p){mPosition=p;}const Vector3&GetPosition(){return mPosition;}void SetY(float y){mPosition.y=y;}
};
namespace Sim {float GetTime(){return 12.f;}}
namespace VehicleSystem {float ENABLE_ROLL_STOPS_THRESHOLD=.2f;}
namespace Physics {struct Tunings{enum{RIDEHEIGHT};float Value[1]={0};};}
const Physics::Tunings*GetVehicleMWTunings(void*){return nullptr;}
template<int N>struct AttributeArray{float data[N];float At(int i){return data[i];}};
struct Attributes {AttributeArray<2>SHOCK_STIFFNESS{{40,40}},SHOCK_EXT_STIFFNESS{{50,50}},SHOCK_VALVING{{17,17}},SHOCK_DIGRESSION{{.3,.3}},SPRING_STIFFNESS{{400,400}},SWAYBAR_STIFFNESS{{275,200}},TRAVEL{{7,7}},RIDE_HEIGHT{{3,3}},SPRING_PROGRESSION{{7.5,6}};float SHOCK_BLOWOUT=5,YAW_SPEED=1.2f;};
struct State {float time=1/120.f,mass=1500,speed=20;Matrix4 matrix;Vector3 world_cog{0,.25,0},angular_vel{},linear_vel{0,0,20},local_angular_vel{},dimension{1,.75,2},inertia{2000,2300,1000};int driver_style=0;WCollider*collider=nullptr;
 const Vector3&GetForwardVector()const{return reinterpret_cast<const Vector3&>(matrix.z);}const Vector3&GetUpVector()const{return reinterpret_cast<const Vector3&>(matrix.y);}const Vector3&GetRightVector()const{return reinterpret_cast<const Vector3&>(matrix.x);}const Vector3&GetPosition()const{return reinterpret_cast<const Vector3&>(matrix.p);}
};
enum {STYLE_DRAG=1};float Tweak_DragYawSpeed=1.6f;
struct RigidBody {Vector3 force{},torque{},av{};float correction=0;bool changedAV=false;void Resolve(const Vector3*f,const Vector3*t){force=*f;torque=*t;}void ModifyYPos(float v){correction+=v;}void SetAngularVelocity(const Vector3*v){av=*v;changedAV=true;}};
class SuspensionRacerMW {public:using State=::State;Tire tires[4];Tire*mTires[4]={tires,tires+1,tires+2,tires+3};Attributes attributes;Attributes*mMWAttributes=&attributes;RigidBody rigid;RigidBody*mRB=&rigid;int mNumWheelsOnGround=4;Vector3 steerL{0,0,1},steerR{0,0,1};
 void DoSteering(State&,Vector3&r,Vector3&l){r=steerR;l=steerL;}void TuneWheelParams(State&){}void*GetVehicle(){return nullptr;}Tire&GetWheel(int i){return tires[i];}int GetNumWheels(){return 4;}void DoWheelForces(State&);
};
struct ChassisInterface {int count=0;int GetNumWheelsOnGround(){return count;}};
struct RigidComplex {Vector4 normal{0,1,0,-1};bool contact=false;Vector4*GetGroundNormal(){return &normal;}bool IsInGroundContact(){return contact;}};
class ChassisMW {public:using State=::State;RigidComplex complex;RigidComplex*mRBComplex=&complex;RigidBody rigid;RigidBody*mRB=&rigid;ChassisInterface chassis;float mJumpTime=0,mJumpAlititude=0;ChassisInterface*GetIChassis(){return &chassis;}void DoJumpStabilizer(const State&);
};
void vec(Vector3 v){std::cout<<"["<<v.x<<","<<v.y<<","<<v.z<<"]";}
'''
def v(values):return '{'+','.join(str(float(x))+'f' for x in values)+'}'
def matrix(pitch=0,roll=0,yaw=0,position=(0,0,0)):
 # Yaw*Rx(pitch)*Rz(roll), standard right-handed +Y-up MW basis.
 cy,sy,cp,sp,cr,sr=map(float,[math.cos(yaw),math.sin(yaw),math.cos(pitch),math.sin(pitch),math.cos(roll),math.sin(roll)])
 return {'right':[cy*cr+sy*sp*sr,cp*sr,-sy*cr+cy*sp*sr], 'up':[-cy*sr+sy*sp*cr,cp*cr,sy*sr+cy*sp*cr], 'forward':[sy*cp,-sp,cy*cp], 'position':list(position)}
def setmat(expr,m):return ''.join(f'{expr}.{key}={v(values+[1 if key=="p" else 0])};'for key,values in [('x',m['right']),('y',m['up']),('z',m['forward']),('p',m['position'])])
cases=[];body=['int main(){std::cout<<std::setprecision(10)<<"[";int n=0;']
def begin(kind,name,inputs):
 cases.append({'kind':kind,'name':name,'input':inputs});body.append('{if(n++)std::cout<<",";')
def end():body.append('}')
for name,pitch,roll,yaw,lv,av,cog,arm,dt,radius,height in [
 ('flat',0,0,0,[0,0,20],[0,0,0],[0,.25,0],[-.8,-.25,1.4],1/120,.33,1.5),
 ('pitch_bump',.2,0,0,[0,1,20],[.8,0,0],[0,.25,0],[-.8,-.25,1.4],1/120,.33,1.5),
 ('roll_bank',0,.25,0,[2,-4,30],[0,.5,-.7],[.1,.28,.05],[.8,-.25,-1.3],1/60,.36,1.8),
 ('yaw_pitch_roll',-.18,.14,.8,[10,-5,20],[.3,.6,-.4],[.12,.3,.1],[-.8,-.2,1.4],1/120,.31,1.4),
 ('fast_tolerance_cap',0,0,0,[20,-50,80],[1,2,3],[0,.25,0],[.9,-.4,-1.4],1/30,.35,1.6),
 ('rising_tolerance',0,0,0,[0,8,0],[0,0,0],[0,.25,0],[.8,-.2,1.3],1/60,.3,1.4)]:
 m=matrix(pitch,roll,yaw,[10,3,-8]);i={'matrix':m,'linearVelocity':lv,'angularVelocity':av,'worldCG':cog,'localArm':arm,'dt':dt,'radius':radius,'vehicleHeight':height}
 begin('wheelPosition',name,i)
 body.append('WheelMW w;State st;'+setmat('st.matrix',m)+f'w.mLocalArm={v(arm)};w.UpdatePosition({v(av)},{v(lv)},st.matrix,{v(cog)},{dt}f,{radius}f,true,nullptr,{height}f);')
 body.append('std::cout<<"{\\\"worldArm\\\":";vec(w.mWorldArm);std::cout<<",\\\"position\\\":";vec(w.mPosition);std::cout<<",\\\"velocity\\\":";vec(w.mVelocity);std::cout<<",\\\"tolerance\\\":"<<w.mWorldPos.tolerance<<"}";'.replace('\\\"','\\"'))
 end()

for name,pitch,roll,normal,penetrations,old,lat,longi,lv,av,previous,driver in [
 ('flat_static',0,0,[0,1,0],[-.03]*4,[.0462]*4,[0]*4,[0]*4,[0,0,20],[0,0,0],4,0),
 ('front_bump',0,0,[0,1,0],[.02,.02,-.03,-.03],[.0462]*4,[0]*4,[0]*4,[0,0,20],[0,0,0],4,0),
 ('one_wheel_bump',0,0,[0,1,0],[.04,-.03,-.03,-.03],[.0462]*4,[100,-80,20,-30],[200,220,400,410],[2,-1,20],[.3,.2,-.1],4,0),
 ('slope_15deg',0,0,[0,.9659258,-.258819],[0]*4,[.0462]*4,[100]*4,[500]*4,[1,-1,20],[.1,.2,0],4,0),
 ('bank_15deg',0,0,[-.258819,.9659258,0],[0]*4,[.0462]*4,[-500]*4,[200]*4,[2,0,20],[0,.2,.3],4,0),
 ('body_pitch_roll',.2,-.15,[0,1,0],[0]*4,[.0462]*4,[-120]*4,[300]*4,[2,-3,20],[.3,.4,-.2],4,0),
 ('airborne',0,0,[0,1,0],[-1]*4,[0]*4,[100]*4,[500]*4,[0,-4,20],[.5,.8,.3],0,0),
 ('landing',.12,-.1,[0,1,0],[-.015,.01,-.03,-.04],[0]*4,[100]*4,[500]*4,[0,-5,20],[.5,.8,.3],0,0),
 ('bottom_out',0,0,[0,1,0],[.2]*4,[0]*4,[0]*4,[0]*4,[0,-10,20],[0,0,0],0,0),
 ('wall_not_ground',0,0,[.99,.141067,0],[0]*4,[.04]*4,[100]*4,[500]*4,[0,0,20],[0,0,0],4,0),
 ('lateral_impulse_limit',0,0,[0,1,0],[-.03]*4,[.0462]*4,[1e6]*4,[0]*4,[.001,0,20],[0,0,0],4,0),
 ('drag_yaw',0,0,[0,1,0],[-.03]*4,[.0462]*4,[200,-300,400,-500],[100,200,300,400],[3,0,20],[0,0,0],4,1)]:
 m=matrix(pitch,roll,.4,[10,3,-8]);localAV=[.5,.8,.3];i={'matrix':m,'normal':normal,'penetrations':penetrations,'previousCompression':old,'lateralForces':lat,'longitudeForces':longi,'linearVelocity':lv,'angularVelocity':av,'localAngularVelocity':localAV,'previousGrounded':previous,'driverStyle':driver,'mass':1500,'worldCG':[0,.25,0],'dt':1/120,'springSpecs':{'shock':[40,40],'extension':[50,50],'valvingInches':[17,17],'digression':[.3,.3],'stiffness':[400,400],'sway':[275,200],'travelInches':[7,7],'rideHeightInches':[3,3],'progression':[7.5,6],'blowout':5,'yawSpeed':1.2},'arms':[[-.8,-.25,1.4],[.8,-.25,1.4],[-.8,-.25,-1.3],[.8,-.25,-1.3]]}
 begin('wheelForces',name,i);body.append('SuspensionRacerMW s;State st;'+setmat('st.matrix',m)+f's.mNumWheelsOnGround={previous};st.driver_style={driver};st.local_angular_vel={v(localAV)};st.angular_vel={v(av)};st.linear_vel={v(lv)};s.steerL=s.steerR=st.GetForwardVector();')
 for idx in range(4):body.append(f's.tires[{idx}].mLocalArm={v(i["arms"][idx])};s.tires[{idx}].mWorldPos.normal={v(normal+[penetrations[idx]])};s.tires[{idx}].compression={float(old[idx])}f;s.tires[{idx}].lateral={float(lat[idx])}f;s.tires[{idx}].longitude={float(longi[idx])}f;')
 body.append('s.DoWheelForces(st);std::cout<<"{\\"force\\":";vec(s.rigid.force);std::cout<<",\\"torque\\":";vec(s.rigid.torque);std::cout<<",\\"correction\\":"<<s.rigid.correction<<",\\"grounded\\":"<<s.mNumWheelsOnGround<<",\\"landing\\":"<<(s.rigid.changedAV?"true":"false")<<",\\"angularVelocity\\":";vec(s.rigid.av);std::cout<<",\\"wheels\\":[";')
 body.append('for(int j=0;j<4;j++){auto&w=s.tires[j];if(j)std::cout<<",";std::cout<<"{\\"compression\\":"<<w.compression<<",\\"load\\":"<<w.load<<",\\"xspeed\\":"<<w.xspeed<<",\\"zspeed\\":"<<w.zspeed<<",\\"force\\":";vec(w.force);std::cout<<",\\"position\\":";vec(w.mPosition);std::cout<<",\\"free\\":"<<(w.free?"true":"false")<<",\\"airtime\\":"<<w.airtime<<"}";}std::cout<<"]}";')
 end()

for name,pitch,roll,normal,alt,lv,localAV,contact,grounded,time,peak in [
 ('level_low_flight',0,0,[0,1,0],.5,[0,0,20],[0,0,0],False,0,0,0),
 ('passive_pitch_roll',.15,.1,[0,1,0],1,[0,-2,20],[.6,.9,-.3],False,0,.4,2),
 ('passive_one_wheel',.15,.1,[0,1,0],1,[0,-2,20],[.6,.9,-.3],False,1,.4,2),
 ('ground_chassis_disables_passive',.15,.1,[0,1,0],1,[0,-2,20],[.6,.9,-.3],True,1,.4,2),
 ('two_wheel_grounded',.15,.1,[0,1,0],1,[0,-2,20],[.6,.9,-.3],False,2,.4,2),
 ('active_pitch',.35,0,[0,1,0],3,[0,0,20],[0,0,0],False,0,.4,4),
 ('active_roll',0,.35,[0,1,0],3,[0,0,20],[0,0,0],False,0,.4,4),
 ('active_banked_ground',.2,.2,[-.1,.98,.1720465],4,[0,-1,20],[.2,.4,.1],False,0,.4,4),
 ('long_jump_descending',0,0,[0,1,0],3,[0,-2,20],[0,0,0],False,0,1.2,5),
 ('long_jump_rising',0,0,[0,1,0],3,[0,2,20],[0,0,0],False,0,1.2,5),
 ('long_jump_slow',0,0,[0,1,0],3,[0,-2,5],[0,0,0],False,0,1.2,5),
 ('long_jump_too_low',0,0,[0,1,0],1,[0,-2,20],[0,0,0],False,0,1.2,1),
 ('long_jump_high',0,0,[0,1,0],9,[0,-2,20],[0,0,0],False,0,1.2,10),
 ('upside_down',math.pi,0,[0,1,0],3,[0,-2,20],[.4,.8,.2],False,0,1.2,5),
 ('graph_clamp',0,0,[0,1,0],3,[0,-2,20],[3,4,2],False,0,.5,3),
 ('low_speed_damping',0,0,[0,1,0],1,[0,0,1],[.3,.1,.2],False,0,.5,3),
 ('active_altitude_zero',.35,.3,[0,1,0],0,[0,-2,20],[0,0,0],False,0,.5,3),
 ('active_altitude_far',.35,.3,[0,1,0],16,[0,-2,20],[0,0,0],False,0,.5,17)]:
 m=matrix(pitch,roll,.4);speed=math.sqrt(sum(x*x for x in lv));i={'matrix':m,'normal':normal,'altitude':alt,'linearVelocity':lv,'localAngularVelocity':localAV,'groundContact':contact,'grounded':grounded,'jumpTime':time,'peakAltitude':peak,'mass':1500,'inertia':[2000,2300,1000],'dt':1/120,'speed':speed}
 begin('jumpStabilizer',name,i);body.append('ChassisMW c;State st;'+setmat('st.matrix',m)+f'c.complex.normal={v(normal+[-alt])};c.complex.contact={str(contact).lower()};c.chassis.count={grounded};c.mJumpTime={float(time)}f;c.mJumpAlititude={float(peak)}f;st.local_angular_vel={v(localAV)};st.linear_vel={v(lv)};st.speed={speed}f;c.DoJumpStabilizer(st);')
 body.append('std::cout<<"{\\"force\\":";vec(c.rigid.force);std::cout<<",\\"torque\\":";vec(c.rigid.torque);std::cout<<",\\"jumpTime\\":"<<c.mJumpTime<<",\\"peakAltitude\\":"<<c.mJumpAlititude<<"}";');end()
body.append('std::cout<<"]";}')
cpp=prelude.replace('GRAPH_DECLARATION',graph)+'\n'+wheel+'\n'+suspension+'\n'+jump+'\n'+'\n'.join(body)
# Python C++ string literals use an escaped JSON quote, not a doubled slash.
cpp=cpp.replace('\\\\"','\\"')
(out/'oracle.cpp').write_text(cpp)
subprocess.run(['g++','-std=c++20','-O0',str(out/'oracle.cpp'),'-o',str(out/'oracle.exe')],check=True)
expected=json.loads(subprocess.check_output([str(out/'oracle.exe')],text=True))
assert len(expected)==len(cases)
for case,result in zip(cases,expected):case['expected']=result
result={'provenance':{'repository':'https://github.com/gaycoderprincess/ProStreetMWPhysics','commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'files':{str(p.relative_to(repo)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources.values()},'methods':['WheelMW::UpdatePosition','SuspensionRacerMW::DoWheelForces','ChassisMW::DoJumpStabilizer'],'compiler':'g++ -std=c++20 -O0','scope':'Unedited source methods. Harness supplies vector math, fixed road query normals/penetration, fixed tire lateral and longitudinal outputs, and recording rigid body. No JavaScript or NOMERA code imported. Does not verify original WWorldPos or body integrator.'},'cases':cases}
(out/'fixtures.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'cases':len(cases),'groups':{k:sum(c['kind']==k for c in cases) for k in ('wheelPosition','wheelForces','jumpStabilizer')}}))
