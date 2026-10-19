# SPDX-License-Identifier: MPL-2.0
"""Compile pinned source function bodies, no NOMERA JavaScript in expectations."""
from pathlib import Path
import hashlib, json, subprocess
root=Path(__file__).resolve().parents[2]
out=root/'work/mw-gearbox-research'
out.mkdir(parents=True,exist_ok=True)
port=root/'work/mw-research/prostreet-port'
engine=port/'decomp/behaviors/EngineRacer.cpp'
header=engine.with_suffix('.h')
physics=port/'decomp/Physics.h'
def extract(path,signature):
    t=path.read_text(); start=t.index(signature); pos=t.index('{',start)+1; depth=1
    while depth:
        depth+=(t[pos]=='{')-(t[pos]=='}');pos+=1
    return t[start:pos]
pre=r'''
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>
#define FLOAT_EPSILON 0.000001f
#define RPS2RPM(x) ((x)*9.549296585513720146f)
#define RPM2RPS(x) ((x)*0.1047197551196597746f)
#define ENGINERACER_FUNCTION_LOG(x)
enum GearID {G_REVERSE,G_NEUTRAL,G_FIRST,G_SECOND,G_THIRD,G_FOURTH,G_FIFTH,G_SIXTH,G_SEVENTH,G_EIGHTH,G_MAX};
enum ShiftPotential {SHIFT_POTENTIAL_NONE,SHIFT_POTENTIAL_DOWN,SHIFT_POTENTIAL_UP,SHIFT_POTENTIAL_GOOD,SHIFT_POTENTIAL_PERFECT,SHIFT_POTENTIAL_MISS};
enum ShiftStatus {SHIFT_STATUS_NONE,SHIFT_STATUS_NORMAL,SHIFT_STATUS_GOOD,SHIFT_STATUS_PERFECT,SHIFT_STATUS_MISSED};
enum Override {OVERRIDE_NONE,OVERRIDE_AUTOMATIC,OVERRIDE_MANUAL};
namespace UMath {template<class T>T Min(T a,T b){return std::min(a,b);}template<class T>T Max(T a,T b){return std::max(a,b);}float Abs(float x){return std::abs(x);}float Lerp(float a,float b,float t){return a+(b-a)*t;}float Clamp(float x,float a,float b){return std::clamp(x,a,b);}float Ramp(float x,float a,float b){return std::clamp((x-a)/(b-a),0.f,1.f);}}
struct Tires{float frontRadius=.34f,rearRadius=.34f;};
struct MWCarTuning {std::vector<float> GEAR_RATIO={3.79f,0,3.4f,2.085f,1.5f,1.25f,1.09f,.91f};std::vector<float> TORQUE={149,179,222,266,283,275,255,235,228};float FINAL_GEAR=3.85f,FLYWHEEL_MASS=10,SHIFT_SPEED=.25f,IDLE=800,RED_LINE=8500,MAX_RPM=9500,SPOOL=.3f,HIGH_BOOST=0,LOW_BOOST=0,VACUUM=0,PSI=0;};
namespace Physics{struct Tunings{enum{INDUCTION};float Value[1]={0};};namespace Info{float WheelDiameter(const Tires&t,bool front){return 2*(front?t.frontRadius:t.rearRadius);}
'''
cpp=pre
cpp=extract(physics,'inline unsigned int UTIL_InterprolateIndex(')+'\n'+cpp
for sig in ['float Torque(', 'float InductionRPM(', 'float InductionBoost(', 'bool ShiftPoints(', 'float EngineInertia(']:cpp+=extract(physics,sig)+'\n'
cpp+=r'''
}}
struct Vehicle{bool staging=false;bool IsStaging(){return staging;}};
struct ISimable{bool IsPlayer(){return false;}};
struct Input{bool automatic=true;float gas=1;bool IsAutomaticShift(){return automatic;}float GetControlGas(){return gas;}};
struct Suspension{bool contacts[4]={true,true,true,true};float slips[4]={0,0,0,0};bool IsWheelOnGround(int i){return contacts[i];}float GetWheelSlip(int i){return slips[i];}};
class EngineRacer {public:
'''
cpp+=extract(header,'struct Clutch {')+';\n'
cpp+=r'''
MWCarTuning spec;MWCarTuning*mMWInfo=&spec;Tires mCarInfo;Vehicle vehicle;ISimable owner;Input input;Input*mIInput=&input;Suspension suspension;Suspension*mSuspension=&suspension;
GearID mGear=G_SECOND;float mGearShiftTimer=0,mSportShifting=0,mTransmissionVelocity=RPM2RPS(4500),mThrottle=1;ShiftPotential mShiftPotential=SHIFT_POTENTIAL_NONE;ShiftStatus mShiftStatus=SHIFT_STATUS_NONE;Override mTransmissionOverride=OVERRIDE_NONE;Clutch mClutch;
float mShiftUpRPM[10]={},mShiftDownRPM[10]={};
EngineRacer(){Physics::Info::ShiftPoints(mMWInfo,mShiftUpRPM,mShiftDownRPM,10);}
Vehicle*GetVehicle(){return &vehicle;}ISimable*GetOwner(){return &owner;}GearID GetTopGear()const{return (GearID)(spec.GEAR_RATIO.size()-1);}bool IsGearChanging(){return mGearShiftTimer>0;}ShiftPotential GetShiftPotential(){return mShiftPotential;}
float GetShiftUpRPM(int g)const{return mShiftUpRPM[g];}float GetShiftDownRPM(int g)const{return mShiftDownRPM[g];}
ShiftPotential FindShiftPotential(GearID,float,float)const;void AutoShift(float);bool SportShift(GearID);ShiftStatus OnGearChange(GearID);bool DoGearChange(GearID,bool);void DoShifting(float);GearID GuessGear(float)const;float GuessRPM(float,GearID)const;float GetShiftPoint(GearID,GearID)const;
'''
for sig in ['unsigned int GetNumGearRatios(', 'float GetGearRatio(', 'float GetRatioChange(', 'float GetShiftDelay(', 'float GetFinalGear(']:cpp+=extract(header,sig)+'\n'
cpp+='};\nstatic const bool Tweak_CoastShifting=true;\nstatic const float Tweak_CoastingPercent=.65f;\n'
for sig in ['void EngineRacer::AutoShift(', 'ShiftPotential EngineRacer::FindShiftPotential(', 'bool EngineRacer::SportShift(', 'ShiftStatus EngineRacer::OnGearChange(', 'bool EngineRacer::DoGearChange(', 'void EngineRacer::DoShifting(', 'GearID EngineRacer::GuessGear(', 'float EngineRacer::GuessRPM(', 'float EngineRacer::GetShiftPoint(']:cpp+=extract(engine,sig)+'\n'
cpp+='float SmoothRPMDecel[]={2.5f,15.f};\n'+extract(engine,'float Engine_SmoothRPM(')+'\n'
cpp+=r'''
void list(const float*p,int n){std::cout<<"[";for(int i=0;i<n;i++){if(i)std::cout<<",";std::cout<<p[i];}std::cout<<"]";}
void spec(const MWCarTuning&s){std::cout<<"{\"gears\":";list(s.GEAR_RATIO.data(),s.GEAR_RATIO.size());std::cout<<",\"torque\":";list(s.TORQUE.data(),s.TORQUE.size());std::cout<<",\"shiftSpeed\":"<<s.SHIFT_SPEED<<",\"idle\":"<<s.IDLE<<",\"redline\":"<<s.RED_LINE<<",\"maxRpm\":"<<s.MAX_RPM<<",\"spool\":"<<s.SPOOL<<",\"highBoost\":"<<s.HIGH_BOOST<<",\"lowBoost\":"<<s.LOW_BOOST<<",\"vacuum\":"<<s.VACUUM<<"}";}
int main(){std::cout<<std::setprecision(10)<<"{\"shiftPoints\":[";int n=0;
auto points=[&](const char*name,int variant,int count){MWCarTuning s;if(variant==1)s.TORQUE={300,350,390,410,390,340,260,120,60};if(variant==2)s.GEAR_RATIO[3]=0;if(variant==3)s.IDLE=s.RED_LINE;if(variant==4){s.LOW_BOOST=.7;s.HIGH_BOOST=1.2;s.VACUUM=-.2;}if(variant==5)s.TORQUE={400};float up[10],down[10];bool ok=Physics::Info::ShiftPoints(&s,up,down,count);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"spec\":";spec(s);std::cout<<",\"count\":"<<count<<",\"expected\":{\"ok\":"<<(ok?"true":"false")<<",\"up\":";list(up,count);std::cout<<",\"down\":";list(down,count);std::cout<<"}}";};
points("mw_m3gtr",0,10);points("falling_torque_early_shift",1,10);points("zero_ratio",2,10);points("idle_equals_redline",3,10);points("induction_swapped_arguments_source_behavior",4,10);points("single_torque_point",5,10);points("insufficient_output_length",0,7);
std::cout<<"],\"potential\":[";n=0;
auto potential=[&](const char*name,int gear,float rpm,float gas,float groundRpm=-1){EngineRacer e;e.mThrottle=gas;int p=e.FindShiftPotential((GearID)gear,rpm,groundRpm);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"gear\":"<<gear<<",\"rpm\":"<<rpm<<",\"gas\":"<<gas<<",\"rpmFromGround\":"<<groundRpm<<"},\"expected\":"<<p<<"}";};
potential("reverse",0,10000,1);potential("neutral",1,10000,1);potential("first_idle",2,800,1);potential("first_below_up",2,8399,1);potential("first_up_inclusive",2,8400,1);potential("top_no_up",7,9000,1);potential("second_coast_3500_hold",3,3500,0);potential("second_half_gas_3500_down",3,3500,.5);potential("second_full_gas_3500_down",3,3500,1);potential("second_full_gas_5000_down",3,5000,1);potential("second_full_gas_cap_5000_hold",3,5000,0);potential("middle_no_shift",4,6000,1);potential("ground_rpm_ignored_low",3,6000,1,0);potential("ground_rpm_ignored_high",3,6000,1,20000);potential("third_coast_4200_hold",4,4200,0);potential("third_full_4200_down",4,4200,1);
std::cout<<"],\"operations\":[";n=0;
auto op=[&](const char*name,int mode,int gear,int target,int p,float rpm,float gas,float timer,float sport,bool staging,bool automatic,int overrideVal,bool inputPresent,int airborne,float slip,float dt,int clutchState=0){EngineRacer e;e.mGear=(GearID)gear;e.mShiftPotential=(ShiftPotential)p;e.mTransmissionVelocity=RPM2RPS(rpm);e.mThrottle=gas;e.input.gas=gas;e.input.automatic=automatic;e.mGearShiftTimer=timer;e.mSportShifting=sport;e.vehicle.staging=staging;e.mTransmissionOverride=(Override)overrideVal;e.mClutch.mState=(EngineRacer::Clutch::State)clutchState;if(!inputPresent)e.mIInput=nullptr;if(airborne>=0)e.suspension.contacts[airborne]=false;e.suspension.slips[0]=slip;int result=-1;if(mode==0)e.DoShifting(dt);if(mode==1)result=e.DoGearChange((GearID)target,false);if(mode==2)result=e.SportShift((GearID)target);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"mode\":"<<mode<<",\"gear\":"<<gear<<",\"target\":"<<target<<",\"potential\":"<<p<<",\"transmissionRpm\":"<<rpm<<",\"gas\":"<<gas<<",\"timer\":"<<timer<<",\"sportTimer\":"<<sport<<",\"staging\":"<<(staging?"true":"false")<<",\"automatic\":"<<(automatic?"true":"false")<<",\"override\":"<<overrideVal<<",\"inputPresent\":"<<(inputPresent?"true":"false")<<",\"airborneWheel\":"<<airborne<<",\"slip\":"<<slip<<",\"dt\":"<<dt<<",\"clutchState\":"<<clutchState<<"},\"expected\":{\"result\":"<<result<<",\"gear\":"<<(int)e.mGear<<",\"timer\":"<<e.mGearShiftTimer<<",\"sportTimer\":"<<e.mSportShifting<<",\"potential\":"<<(int)e.mShiftPotential<<",\"clutchState\":"<<(int)e.mClutch.mState<<",\"shiftingUp\":"<<(e.mClutch.mShiftingUp?"true":"false")<<"}}";};
#define OP(name,gear,p,rpm) op(name,0,gear,0,p,rpm,1,0,0,false,true,0,true,-1,0,1.f/60)
OP("upshift",2,2,8500);OP("downshift_one",3,1,4500);OP("downshift_skips_to_first",7,1,900);OP("downshift_skips_to_third",7,1,3000);OP("neutral_direct_first",1,2,8500);OP("reverse_no_auto",0,2,8500);OP("potential_good_no_auto",2,3,8500);OP("potential_perfect_up",2,4,8500);OP("potential_miss_up",2,5,8500);OP("topgear_up_rejected",7,2,8500);
op("one_wheel_airborne_blocks_up",0,2,0,2,8500,1,0,0,false,true,0,true,3,0,.01);
op("slip_equal_four_blocks_up",0,2,0,2,8500,1,0,0,false,true,0,true,-1,4,.01);
op("slip_below_four_permits_up",0,2,0,2,8500,1,0,0,false,true,0,true,-1,3.999f,.01);
op("negative_slip_source_not_abs",0,2,0,2,8500,1,0,0,false,true,0,true,-1,-9,.01);
op("existing_timer_blocks_then_zero",0,2,0,2,8500,1,.005,0,false,true,0,true,-1,0,.01);
op("staging_blocks_auto",0,2,0,2,8500,1,0,0,true,true,0,true,-1,0,.01);
op("manual_blocks_auto",0,2,0,2,8500,1,0,0,false,false,0,true,-1,0,.01);
op("override_auto",0,2,0,2,8500,1,0,0,false,false,1,true,-1,0,.01);
op("override_manual",0,2,0,2,8500,1,0,0,false,true,2,true,-1,0,.01);
op("sport_timer_none_frozen",0,2,0,0,5000,0,0,1,false,true,0,true,-1,0,.1);
op("sport_timer_gas_decrements",0,2,0,2,8500,1,0,1,false,true,0,true,-1,0,.1);
op("sport_timer_coast_decrements_twice",0,2,0,2,8500,0,0,1,false,true,0,true,-1,0,.1);
op("sport_timer_no_input_zero",0,2,0,2,8500,1,0,1,false,false,0,false,-1,0,.1);
op("gear_same_no_change",1,3,3,2,8500,1,0,0,false,true,0,true,-1,0,.01);
op("manual_down_delay_destination_quarter",1,7,3,1,4000,1,0,0,false,true,0,true,-1,0,.01);
op("gear_neutral",1,3,1,0,4000,1,0,0,false,true,0,true,-1,0,.01);
op("gear_reverse",1,2,0,0,4000,1,0,0,false,true,0,true,-1,0,.01);
op("gear_invalid_high",1,2,9,0,4000,1,0,0,false,true,0,true,-1,0,.01);
op("gear_invalid_low",1,2,-1,0,4000,1,0,0,false,true,0,true,-1,0,.01);
op("sport_success",2,3,4,0,5000,1,0,0,false,true,0,true,-1,0,.01);
op("sport_up_rejected_when_down_potential",2,3,4,1,2000,1,0,0,false,true,0,true,-1,0,.01);
op("sport_down_rejected_when_up_potential",2,3,2,2,8500,1,0,0,false,true,0,true,-1,0,.01);
op("sport_rejected_changing",2,3,4,0,5000,1,.1,0,false,true,0,true,-1,0,.01);
op("sport_rejected_neutral",2,3,1,0,5000,1,0,0,false,true,0,true,-1,0,.01);
op("disengage_engaging_is_noop",1,3,4,0,5000,1,0,0,false,true,0,true,-1,0,.01,1);
op("port_staging_neutral_becomes_first",1,3,1,0,5000,1,0,0,true,true,0,true,-1,0,.01);
std::cout<<"],\"clutch\":[";n=0;
auto clutch=[&](const char*name,int state,float time,float engageTime,int action,float actionTime,float dt){EngineRacer::Clutch c;c.mState=(EngineRacer::Clutch::State)state;c.mTime=time;c.mEngageTime=engageTime;if(action==1)c.Disengage();if(action==2)c.Engage(actionTime);if(action==3)c.Reset();float ratio=c.Update(dt);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"state\":"<<state<<",\"time\":"<<time<<",\"engageTime\":"<<engageTime<<",\"action\":"<<action<<",\"actionTime\":"<<actionTime<<",\"dt\":"<<dt<<"},\"expected\":{\"state\":"<<(int)c.mState<<",\"time\":"<<c.mTime<<",\"engageTime\":"<<c.mEngageTime<<",\"ratio\":"<<ratio<<"}}";};
clutch("engaged",0,0,0,0,0,.01);clutch("disengage",0,0,0,1,0,.01);clutch("engaging_disengage_is_noop",1,.2,.25,1,0,.01);clutch("engage_long_start",2,0,0,2,.25,0);clutch("engage_long_mid",2,0,0,2,.25,.125);clutch("engage_long_end",2,0,0,2,.25,.25);clutch("engage_long_past_end_negative_time",2,0,0,2,.25,.3);clutch("engage_first_short",2,0,0,2,.05,.025);clutch("engage_zero_instant",2,0,0,2,0,.01);clutch("engage_engaged_noop",0,0,0,2,.25,.01);clutch("engage_engaging_noop",1,.2,.25,2,.05,.01);clutch("reset_preserves_engageTime",1,.2,.25,3,0,.01);
std::cout<<"],\"smoothRpm\":[";n=0;
auto smooth=[&](const char*name,bool shifting,int gear,float dt,float oldRpm,float newRpm,float inertia){float result=Engine_SmoothRPM(shifting,(GearID)gear,dt,oldRpm,newRpm,inertia);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"shifting\":"<<(shifting?"true":"false")<<",\"gear\":"<<gear<<",\"dt\":"<<dt<<",\"oldRpm\":"<<oldRpm<<",\"newRpm\":"<<newRpm<<",\"inertia\":"<<inertia<<"},\"expected\":"<<result<<"}";};
smooth("rise_is_blended",false,3,1.f/60,3000,5000,.5);smooth("normal_fall_limited",false,3,1.f/60,8000,3000,.5);smooth("shift_fall_faster",true,3,1.f/60,8000,3000,.5);smooth("first_shift_uses_slow_fall",true,2,1.f/60,8000,3000,.5);smooth("neutral_fast_without_shift",false,1,1.f/60,8000,3000,.5);smooth("reverse_slow",true,0,1.f/60,8000,3000,.5);smooth("small_fall_not_limited",false,3,1.f/60,5000,4990,.5);smooth("high_inertia",false,3,1.f/60,8000,3000,1);smooth("dt_zero_still_blends",false,3,0,8000,3000,.5);smooth("full_fall_when_dt_long",true,3,1,8000,3000,.5);smooth("rise_at_120hz",true,3,1.f/120,3000,5000,.5);smooth("fall_at_30hz",true,3,1.f/30,8000,3000,.5);
std::cout<<"],\"engineInertia\":[";n=0;for(float flywheel:{0.f,10.f,30.f})for(bool loaded:{false,true}){MWCarTuning s;s.FLYWHEEL_MASS=flywheel;float result=Physics::Info::EngineInertia(&s,loaded);if(n++)std::cout<<",";std::cout<<"{\"input\":{\"flywheelMass\":"<<flywheel<<",\"loaded\":"<<(loaded?"true":"false")<<"},\"expected\":"<<result<<"}";}
std::cout<<"],\"guess\":[";n=0;
auto guess=[&](const char*name,float speed,int gear,float front=.34f,float rear=.34f){EngineRacer e;e.mCarInfo.frontRadius=front;e.mCarInfo.rearRadius=rear;float rpm=e.GuessRPM(speed,(GearID)gear);int guessed=e.GuessGear(speed);if(n++)std::cout<<",";std::cout<<"{\"name\":\""<<name<<"\",\"input\":{\"speedMps\":"<<speed<<",\"gear\":"<<gear<<",\"frontRadius\":"<<front<<",\"rearRadius\":"<<rear<<",\"finalGear\":3.85},\"expected\":{\"rpm\":"<<rpm<<",\"gear\":"<<guessed<<"}}";};
guess("stationary",0,2);guess("reverse",-20,0);guess("neutral_idle",20,1);guess("first_10mps",10,2);guess("first_20mps",20,2);guess("second_20mps",20,3);guess("third_40mps",40,4);guess("top_80mps",80,7);guess("top_200mps_redline_clamp",200,7);guess("zero_radius_idle",50,3,0,0);guess("different_axle_radii_average",40,4,.3,.4);guess("small_wheel_earlier_gear",40,4,.25,.25);
std::cout<<"]}";}
'''
(out/'oracle.cpp').write_text('// SPDX-License-Identifier: MPL-2.0\n'+cpp)
subprocess.run(['g++','-std=c++20','-O0','-fno-fast-math',str(out/'oracle.cpp'),'-o',str(out/'oracle.exe')],check=True)
data=json.loads(subprocess.check_output([str(out/'oracle.exe')],text=True))
data['provenance']={'portCommit':subprocess.check_output(['git','-C',str(port),'rev-parse','HEAD'],text=True).strip(),'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [engine,header,physics,port/'CarDataDump/orig_mw_full/bmwm3gtr.conf']},'compiler':subprocess.check_output(['g++','--version'],text=True).splitlines()[0],'flags':['-std=c++20','-O0','-fno-fast-math'],'scope':'Actual source bodies extracted unchanged. ABI scaffold supplies tuning/state; no NOMERA JS, original binary, full engine or drivetrain integration. DoGearChange includes ProStreet staging-neutral hack (explicit divergence). Clutch class from port; FindShiftPotential/AutoShift/shift delay cross-checked Brawltendo MATCHING implementation.'}
(out/'fixtures.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps({k:len(v) for k,v in data.items() if k!='provenance'}))
