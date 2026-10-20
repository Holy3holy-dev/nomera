# SPDX-License-Identifier: MPL-2.0
"""Extract unchanged source bodies and compile independent float32 oracle."""
from pathlib import Path
import json, math, hashlib, subprocess
root=Path(__file__).resolve().parents[2]
out=root/'work/mw-engine-research'
out.mkdir(parents=True,exist_ok=True)
port=root/'work/mw-research/prostreet-port'
engine=port/'decomp/behaviors/EngineRacer.cpp'; header=engine.with_suffix('.h'); physics=port/'decomp/Physics.h'; graph=port/'decomp/AverageWindow.h'
def extract(path,signature):
 t=path.read_text();start=t.index(signature);pos=t.index('{',start)+1;depth=1
 while depth:
  depth+=(t[pos]=='{')-(t[pos]=='}');pos+=1
 return t[start:pos]
spec=dict(idle=800,redline=8500,maxRpm=9500,flywheelMass=10,torqueConverter=.2,torqueSplit=0,clutchSlip=.8,finalGear=3.85,gears=[3.79,0,3.4,2.085,1.5,1.25,1.09,.91],efficiencies=[1]*8)
base=dict(gear=2,throttle=1,engineTorqueNm=300,brakingTorqueNm=-240,angularVelocity=400,angularAcceleration=0,transmissionVelocity=400,clutchRpmDiff=0,rpm=400*60/(2*math.pi),clutchState=0,clutchTime=0,clutchEngageTime=0,wheels=[30]*4,contacts=[True]*4,slips=[0]*4,speedMps=10,staging=False,perfectLaunch=0,nosBoost=1,peakTorque=400,peakTorqueRpm=6000,catchup=0,revLimiter=True,gearChanging=False,inputPresent=True,suspensionPresent=True,numWheels=4,frontDrive=False,rearDrive=True)
cases=[]
def case(name,opts={},s={},steps=[1/120]):
 cases.append(dict(name=name,spec=spec|s,input=base|opts,steps=steps))
case('first_full_gas')
case('first_idle_clutch_disengages',dict(throttle=0,angularVelocity=800*math.pi/30,transmissionVelocity=800*math.pi/30,wheels=[0]*4,rpm=800))
case('first_idle_gas_below_point1',dict(throttle=.099,angularVelocity=84,transmissionVelocity=84,wheels=[0]*4,rpm=800))
case('first_idle_gas_at_point1',dict(throttle=.1,angularVelocity=84,transmissionVelocity=84,wheels=[0]*4,rpm=800))
case('reverse_idle_threshold',dict(gear=0,throttle=0,angularVelocity=250,transmissionVelocity=250,wheels=[0]*4))
case('reverse_above_idle_threshold',dict(gear=0,throttle=0,angularVelocity=336,transmissionVelocity=84,wheels=[0]*4))
case('neutral_free_rev',dict(gear=1,wheels=[0]*4,angularVelocity=100,transmissionVelocity=100,rpm=955),steps=[1/120]*5)
case('second_disengaged_starts_engage',dict(gear=3,clutchState=2))
case('first_disengaged_starts_engage',dict(clutchState=2))
case('engaging_midpoint',dict(gear=3,clutchState=1,clutchTime=.125,clutchEngageTime=.25))
case('engaging_expires_before_torque',dict(gear=3,clutchState=1,clutchTime=.004,clutchEngageTime=.25))
case('engaging_negative_diff_limit',dict(gear=3,angularVelocity=84,clutchState=1,clutchTime=.2,clutchEngageTime=.25,wheels=[100]*4))
case('engaging_positive_diff_limit',dict(gear=3,angularVelocity=900,clutchState=1,clutchTime=.2,clutchEngageTime=.25,wheels=[0]*4))
case('seize_rpm_sign_cross',dict(gear=3,angularVelocity=800,clutchRpmDiff=3000,clutchState=1,clutchTime=.2,clutchEngageTime=.25,wheels=[0]*4))
case('seize_rpm_same_sign',dict(gear=3,angularVelocity=800,clutchRpmDiff=-3000,clutchState=1,clutchTime=.2,clutchEngageTime=.25,wheels=[0]*4))
case('converter_disabled',s=dict(torqueConverter=0))
case('converter_during_shift_ratio',dict(clutchState=1,clutchTime=.125,clutchEngageTime=.25,gearChanging=True))
case('converter_peak_rpm_no_boost',dict(angularVelocity=6000*math.pi/30))
case('partial_contact_one',dict(contacts=[False,False,False,True]))
case('fully_airborne',dict(contacts=[False]*4,wheels=[1000,-1000,2000,-1000]))
case('airborne_freewheel_limit',dict(contacts=[False]*4,wheels=[1000]*4))
case('coast_forward_engine_brake',dict(throttle=0,gear=4,wheels=[80]*4,angularVelocity=400,transmissionVelocity=400))
case('coast_opposite_axle_brake_sign',dict(throttle=0,gear=4,wheels=[-80]*4))
case('reverse_drive',dict(gear=0,wheels=[-30]*4))
case('reverse_opposite_wheels',dict(gear=0,wheels=[30]*4))
case('first_slipping_launch_axle_match',dict(slips=[.2]*4,wheels=[1]*4,speedMps=1,angularVelocity=500,transmissionVelocity=500))
case('first_slip_threshold_inclusive_no_match',dict(slips=[.1]*4,wheels=[1]*4,speedMps=1,angularVelocity=500,transmissionVelocity=500))
case('rear_diff_highspeed_keeps_delta',dict(slips=[.3]*4,wheels=[1,2,1,5],speedMps=40,angularVelocity=500,transmissionVelocity=500))
case('rear_diff_lowspeed_locks',dict(slips=[.3]*4,wheels=[1,2,1,5],speedMps=1,angularVelocity=500,transmissionVelocity=500))
case('front_drive',dict(frontDrive=True,rearDrive=False,wheels=[30,40,1,2]),s=dict(torqueSplit=1))
case('awd_faster_rear',dict(frontDrive=True,wheels=[20,30,40,50]),s=dict(torqueSplit=.4))
case('awd_faster_front',dict(frontDrive=True,wheels=[60,70,40,50]),s=dict(torqueSplit=.4))
case('awd_opposite_axles',dict(frontDrive=True,wheels=[-60,-70,40,50]),s=dict(torqueSplit=.5))
case('clutch_slip_zero',s=dict(clutchSlip=0))
case('clutch_slip_full',s=dict(clutchSlip=1))
case('overrev_transmission_clamp',dict(gear=3,wheels=[300]*4,angularVelocity=800,transmissionVelocity=800,speedMps=80))
case('max_rpm_instead_redline',dict(gear=3,wheels=[300]*4,angularVelocity=900,revLimiter=False,speedMps=80))
case('engine_rpm_upper_clamp',dict(gear=1,angularVelocity=890,transmissionVelocity=84,engineTorqueNm=10000))
case('engine_rpm_idle_clamp',dict(gear=1,throttle=0,angularVelocity=84,transmissionVelocity=84,brakingTorqueNm=-10000))
case('perfect_launch_peak_nos',dict(perfectLaunch=1,nosBoost=2,throttle=.4))
case('staging_blocks_perfect_launch',dict(perfectLaunch=1,nosBoost=2,throttle=.4,staging=True))
case('catchup_positive_drive',dict(catchup=1))
case('gear_efficiency',s=dict(efficiencies=[.8]*8))
case('heavy_flywheel',s=dict(flywheelMass=30))
case('zero_flywheel',s=dict(flywheelMass=0))
case('zero_ratio_guard_keeps_state',dict(gear=3),s=dict(gears=[3.79,0,3.4,0,1.5,1.25,1.09,.91]))
case('missing_input_guard',dict(inputPresent=False))
case('missing_suspension_guard',dict(suspensionPresent=False))
case('wrong_wheel_count_guard',dict(numWheels=3))
case('sequence_second_clutch_engagement',dict(gear=3,clutchState=2),steps=[1/120]*40)
case('sequence_first_launch',dict(clutchState=2,angularVelocity=84,transmissionVelocity=84,rpm=800,wheels=[0]*4),steps=[1/120]*16)
case('sequence_coast_neutral',dict(gear=1,throttle=0,angularVelocity=700,transmissionVelocity=400,rpm=6684),steps=[1/120]*20)
pre=r'''
#include <algorithm>
#include <cmath>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <vector>
typedef float Rpm;typedef float Mps;typedef float Mph;typedef float Nm;typedef float FtLbs;
CONVERSION_FUNCTIONS
#define FLOAT_EPSILON .000001f
enum GearID {G_REVERSE,G_NEUTRAL,G_FIRST,G_SECOND,G_THIRD,G_FOURTH,G_FIFTH,G_SIXTH,G_SEVENTH};
enum {DRIVER_HUMAN,DRIVER_REMOTE,SHIFT_POTENTIAL_NONE};
namespace UMath {template<class T>T Min(T a,T b){return std::min(a,b);}template<class T>T Max(T a,T b){return std::max(a,b);}float Lerp(float a,float b,float t){return a+(b-a)*t;}float Abs(float x){return std::abs(x);}float Clamp(float x,float a,float b){return std::clamp(x,a,b);}float Ramp(float x,float a,float b){return std::clamp((x-a)/(b-a),0.f,1.f);}float Sina(float x){return std::sin(x);}}
float bClamp(float v,float a,float b){return std::clamp(v,a,b);}
namespace Sim {float GetTime(){return 0;}}
struct MWCarTuning {float IDLE=800,RED_LINE=8500,MAX_RPM=9500,FLYWHEEL_MASS=10,TORQUE_CONVERTER=.2,TORQUE_SPLIT=0,CLUTCH_SLIP=.8,FINAL_GEAR=3.85;std::vector<float> TORQUE={149,179,222,266,283,275,255,235,228},ENGINE_BRAKING={.7,.8,.9};float SPOOL=.3f,HIGH_BOOST=0,LOW_BOOST=0,VACUUM=0,PSI=0,SPOOL_TIME_UP=.5f,SPOOL_TIME_DOWN=.25f;std::vector<float> GEAR_RATIO={3.79,0,3.4,2.085,1.5,1.25,1.09,.91},GEAR_EFFICIENCY={1,1,1,1,1,1,1,1};};
namespace Physics {struct Tunings{enum{INDUCTION};float Value[1]={0};};namespace Info {
'''
conversion=port/'decomp/ConversionUtil.hpp'
pre=pre.replace('CONVERSION_FUNCTIONS','\n'.join(extract(conversion,sig) for sig in ['inline Rpm RPS2RPM(', 'inline float RPM2RPS(', 'inline Mph MPS2MPH(', 'inline Nm FTLB2NM(']))
cpp=extract(physics,'inline unsigned int UTIL_InterprolateIndex(')+'\n'+pre+extract(physics,'float EngineInertia(')+'\n'
cpp+='enum eInductionType {INDUCTION_NONE,INDUCTION_TURBO_CHARGER,INDUCTION_SUPER_CHARGER};\n'
for sig in ['eInductionType InductionType(', 'float Torque(', 'float InductionRPM(', 'float InductionBoost(']:cpp+=extract(physics,sig)+'\n'
cpp+='}}\n'
cpp+=extract(graph,'template <typename T> struct GraphEntry {')+';\n'+extract(graph,'template <typename T> class tGraph {')+';\n'+extract(graph,'template <> void tGraph<float>::Blend(')+'\n'
cpp+=r'''
struct Input {bool nos=false;bool GetControlNOS(){return nos;}};using IInput=Input;
struct Vehicle {bool staging=false;float perfectLaunch=0,speed=10;bool IsStaging(){return staging;}float GetPerfectLaunch(){return perfectLaunch;}int driverClass=DRIVER_HUMAN;int GetDriverClass(){return driverClass;}float GetAbsoluteSpeed(){return speed;}};
struct Suspension {float w[4]={30,30,30,30},slip[4]={};bool contacts[4]={true,true,true,true};int numWheels=4;int GetNumWheels(){return numWheels;}int GetNumWheelsOnGround(){int n=0;for(bool b:contacts)n+=b;return n;}float GetWheelAngularVelocity(int i){return w[i];}void SetWheelAngularVelocity(int i,float v){w[i]=v;}float GetWheelSlip(int i){return slip[i];}bool IsWheelOnGround(int i){return contacts[i];}};
class EngineRacer {public:
'''
cpp+=extract(header,'struct Clutch {')+';\n'
cpp+=r'''
MWCarTuning spec;MWCarTuning*mMWInfo=&spec;Input input;IInput*mIInput=&input;Suspension suspension;Suspension*mSuspension=&suspension;Vehicle vehicle;GearID mGear=G_FIRST;Clutch mClutch;bool frontDrive=false,rearDrive=true,revLimiter=true,gearChanging=false,mEngineBraking=false;float inputThrottle=1,inputEngineTorque=300,inputBrakingTorque=-240,inputNOS=1,inputCatchup=0;float mThrottle=1,mNOSBoost=1,mPeakTorque=400,mPeakTorqueRPM=6000,mAngularVelocity=400,mAngularAcceleration=0,mTransmissionVelocity=400,mRPM=3819.7186,mClutchRPMDiff=0,mSabotage=0,mDriveTorque=0,mDriveTorqueAtEngine=0;int mShiftPotential=0;
Vehicle*GetVehicle(){return &vehicle;}const Physics::Tunings*GetVehicleTunings(){return nullptr;}void UpdatePerfectLaunchText(){}float DoThrottle(float){return inputThrottle;}float DoNos(const Physics::Tunings*,float,bool){return inputNOS;}void DoECU(){}void DoInduction(const Physics::Tunings*,float){}void DoShifting(float){}float GetEngineTorque(float){return inputEngineTorque;}float GetBrakingTorque(float,float){return inputBrakingTorque;}bool UseRevLimiter(){return revLimiter;}GearID GetGear()const{return mGear;}bool FrontWheelDrive()const{return frontDrive;}bool RearWheelDrive()const{return rearDrive;}bool IsGearChanging(){return gearChanging;}bool IsShiftingGear(){return gearChanging;}float GetGearRatio(int g){return spec.GEAR_RATIO[g];}float GetFinalGear(){return spec.FINAL_GEAR;}float GetGearEfficiency(int g){return spec.GEAR_EFFICIENCY[g];}float GetCatchupCheat(){return inputCatchup;}void Blow(){}int UpdateShiftPotential(GearID,float,float){return 0;}
float GetDifferentialAngularVelocity(bool)const;void SetDifferentialAngularVelocity(float);float GetDriveWheelSlippage()const;void LimitFreeWheels(float);void OnTaskSimulate(float);
};
'''
t=engine.read_text();cpp+=t[t.index('static const bool Tweak_EnableTorqueConverter'):t.index('void EngineRacer::OnTaskSimulate')]
cpp+='float SmoothRPMDecel[]={2.5f,15.f};\n'+extract(engine,'float Engine_SmoothRPM(')+'\n'
for sig in ['float EngineRacer::GetDifferentialAngularVelocity(', 'void EngineRacer::SetDifferentialAngularVelocity(', 'float EngineRacer::GetDriveWheelSlippage(', 'void EngineRacer::LimitFreeWheels(', 'void EngineRacer::OnTaskSimulate(']:cpp+=extract(engine,sig)+'\n'
cpp+='namespace EngineHelpers {class EngineRacer {public: MWCarTuning spec;MWCarTuning*mMWInfo=&spec;Vehicle vehicle;float mInductionBoost=0,mNOSBoost=1,mThrottle=1,mAngularVelocity=400,mSpool=0,mPSI=0;bool gearChanging=false;Vehicle*GetVehicle()const{return const_cast<Vehicle*>(&vehicle);}bool IsGearChanging(){return gearChanging;}float GetEngineTorque(float)const;float GetBrakingTorque(float,float)const;void DoInduction(const Physics::Tunings*,float);};\n'
for sig in ['float EngineRacer::GetEngineTorque(', 'float EngineRacer::GetBrakingTorque(', 'void EngineRacer::DoInduction(']:cpp+=extract(engine,sig)+'\n'
cpp+='}\n'
cpp+=r'''
void dump(EngineRacer&e){std::cout<<"{\"throttle\":"<<e.mThrottle<<",\"angularVelocity\":"<<e.mAngularVelocity<<",\"angularAcceleration\":"<<e.mAngularAcceleration<<",\"transmissionVelocity\":"<<e.mTransmissionVelocity<<",\"clutchRpmDiff\":"<<e.mClutchRPMDiff<<",\"rpm\":"<<e.mRPM<<",\"driveTorque\":"<<e.mDriveTorque<<",\"driveTorqueAtEngine\":"<<e.mDriveTorqueAtEngine<<",\"engineBraking\":"<<(e.mEngineBraking?"true":"false")<<",\"clutchState\":"<<int(e.mClutch.mState)<<",\"clutchTime\":"<<e.mClutch.mTime<<",\"clutchEngageTime\":"<<e.mClutch.mEngageTime<<",\"wheels\":[";for(int i=0;i<4;i++){if(i)std::cout<<",";std::cout<<e.suspension.w[i];}std::cout<<"]}";}
int main(){std::cout<<std::setprecision(10)<<"{\"steps\":[";
'''
def num(v):return str(v).lower() if isinstance(v,bool) else repr(v)+'f' if isinstance(v,float) else str(v)
sm=dict(idle='IDLE',redline='RED_LINE',maxRpm='MAX_RPM',flywheelMass='FLYWHEEL_MASS',torqueConverter='TORQUE_CONVERTER',torqueSplit='TORQUE_SPLIT',clutchSlip='CLUTCH_SLIP',finalGear='FINAL_GEAR',gears='GEAR_RATIO',efficiencies='GEAR_EFFICIENCY')
im=dict(throttle='inputThrottle',engineTorqueNm='inputEngineTorque',brakingTorqueNm='inputBrakingTorque',angularVelocity='mAngularVelocity',angularAcceleration='mAngularAcceleration',transmissionVelocity='mTransmissionVelocity',clutchRpmDiff='mClutchRPMDiff',rpm='mRPM',clutchTime='mClutch.mTime',clutchEngageTime='mClutch.mEngageTime',speedMps='vehicle.speed',staging='vehicle.staging',perfectLaunch='vehicle.perfectLaunch',nosBoost='inputNOS',peakTorque='mPeakTorque',peakTorqueRpm='mPeakTorqueRPM',catchup='inputCatchup',revLimiter='revLimiter',gearChanging='gearChanging',numWheels='suspension.numWheels',frontDrive='frontDrive',rearDrive='rearDrive')
for ci,c in enumerate(cases):
 cpp+='{'+'EngineRacer e;\n'
 for k,v in c['spec'].items():cpp+='e.spec.'+sm[k]+'='+('{'+','.join(map(num,v))+'}' if isinstance(v,list) else num(v))+';\n'
 for k,dst in im.items():cpp+='e.'+dst+'='+num(c['input'][k])+';\n'
 i=c['input'];cpp+='e.mGear=(GearID)'+str(i['gear'])+';e.mClutch.mState=(EngineRacer::Clutch::State)'+str(i['clutchState'])+';\n'
 if not i['inputPresent']:cpp+='e.mIInput=nullptr;\n'
 if not i['suspensionPresent']:cpp+='e.mSuspension=nullptr;\n'
 for key,dest in [('wheels','w'),('contacts','contacts'),('slips','slip')]:
  for wi,v in enumerate(i[key]):cpp+=f'e.suspension.{dest}[{wi}]={num(v)};\n'
 if ci:cpp+='std::cout<<",";'
 cpp+='std::cout<<"[";\n'
 for si,dt in enumerate(c['steps']):
  if si:cpp+='std::cout<<",";'
  cpp+='e.OnTaskSimulate('+num(dt)+');dump(e);\n'
 cpp+='std::cout<<"]";}\n'
braking=[]
for name,rpm,torque,table in [('idle',800,300,[.7,.8,.9]),('middle',5150,300,[.7,.8,.9]),('redline',8500,300,[.7,.8,.9]),('below_idle',0,300,[.7,.8,.9]),('above_redline',20000,300,[.7,.8,.9]),('single_point_unclamped',4000,300,[1.4]),('multi_clamped',4000,300,[1.4,2]),('negative_torque',4000,-300,[.7,.8,.9])]:
 braking.append(dict(name=name,input=dict(rpm=rpm,engineTorqueNm=torque,table=table)))
cpp+=r'std::cout<<"],\"brakingTorque\":[";'
for i,b in enumerate(braking):
 if i:cpp+='std::cout<<",";'
 v=b['input'];cpp+='{EngineHelpers::EngineRacer e;e.spec.ENGINE_BRAKING={'+','.join(map(num,v['table']))+'};std::cout<<e.GetBrakingTorque('+num(v['engineTorqueNm'])+','+num(v['rpm'])+');}\n'
engineTorque=[]
for name,rpm,induction,nos,remote,table in [('base',4000,0,1,False,[149,179,222,266,283,275,255,235,228]),('idle',800,0,1,False,[149,179,222,266,283,275,255,235,228]),('redline',8500,0,1,False,[149,179,222,266,283,275,255,235,228]),('below_idle',0,0,1,False,[149,179,222,266,283,275,255,235,228]),('above_redline',20000,0,1,False,[149,179,222,266,283,275,255,235,228]),('induction_nos',4000,.5,2,False,[149,179,222,266,283,275,255,235,228]),('remote_omits_nos',4000,.5,2,True,[149,179,222,266,283,275,255,235,228]),('single_point_is_zero',4000,0,1,False,[400])]:
 engineTorque.append(dict(name=name,input=dict(rpm=rpm,inductionBoost=induction,nosBoost=nos,remote=remote,torqueFtlb=table)))
cpp+=r'std::cout<<"],\"engineTorque\":[";'
for i,b in enumerate(engineTorque):
 if i:cpp+='std::cout<<",";'
 v=b['input'];cpp+='{EngineHelpers::EngineRacer e;e.spec.TORQUE={'+','.join(map(num,v['torqueFtlb']))+'};e.mInductionBoost='+num(v['inductionBoost'])+';e.mNOSBoost='+num(v['nosBoost'])+';e.vehicle.driverClass='+('DRIVER_REMOTE' if v['remote'] else 'DRIVER_HUMAN')+';std::cout<<e.GetEngineTorque('+num(v['rpm'])+');}\n'
induction=[]
idbase=dict(spoolRpm=.3,highBoost=1,lowBoost=.4,vacuum=-.2,psi=20,spoolUp=.5,spoolDown=.25,rpm=5000,gas=1,spool=0,currentPsi=0,gearChanging=False,tuning=0,tuningsPresent=True)
def inductioncase(name,opts={},steps=[1/120]):induction.append(dict(name=name,input=idbase|opts,steps=steps))
inductioncase('no_induction_resets',dict(highBoost=0,lowBoost=0,spool=.8,currentPsi=10))
inductioncase('turbo_spools_up')
inductioncase('turbo_below_threshold',dict(rpm=1500))
inductioncase('turbo_below_threshold_decays',dict(rpm=1500,spool=1,currentPsi=10))
inductioncase('shift_kills_target_spool',dict(gearChanging=True,spool=1,currentPsi=20))
inductioncase('gas_half_full_target',dict(gas=.5))
inductioncase('gas_quarter_half_target',dict(gas=.25))
inductioncase('zero_up_time_instant',dict(spoolUp=0))
inductioncase('zero_down_time_instant',dict(gas=0,spool=1,currentPsi=20,spoolDown=0))
inductioncase('supercharger_low_rpm',dict(spoolRpm=0,rpm=1500))
inductioncase('positive_tuning',dict(tuning=1))
inductioncase('negative_tuning',dict(tuning=-1))
inductioncase('null_tunings',dict(tuningsPresent=False))
inductioncase('psi_fall_limited_20_per_sec',dict(spool=.2,currentPsi=20))
inductioncase('psi_rise_limited_20_per_sec',dict(spool=1,currentPsi=0))
inductioncase('spool_reaches_target_no_overshoot',dict(spool=.99))
inductioncase('spool_below_zero_clamped',dict(spool=-1))
inductioncase('spool_above_one_clamped',dict(spool=2))
inductioncase('sequence_turbo_up',steps=[1/120]*64)
inductioncase('sequence_turbo_down',dict(spool=1,currentPsi=20,gas=0),steps=[1/120]*36)
cpp+=r'std::cout<<"],\"induction\":[";'
idmap=dict(spoolRpm='spec.SPOOL',highBoost='spec.HIGH_BOOST',lowBoost='spec.LOW_BOOST',vacuum='spec.VACUUM',psi='spec.PSI',spoolUp='spec.SPOOL_TIME_UP',spoolDown='spec.SPOOL_TIME_DOWN',gas='mThrottle',spool='mSpool',currentPsi='mPSI',gearChanging='gearChanging')
for i,b in enumerate(induction):
 if i:cpp+='std::cout<<",";'
 v=b['input'];cpp+='{EngineHelpers::EngineRacer e;Physics::Tunings tune;'
 for k,dst in idmap.items():cpp+='e.'+dst+'='+num(v[k])+';'
 cpp+='e.mAngularVelocity=RPM2RPS('+num(v['rpm'])+');tune.Value[0]='+num(v['tuning'])+';std::cout<<"[";'
 for si,dt in enumerate(b['steps']):
  if si:cpp+='std::cout<<",";'
  cpp+='e.DoInduction('+('&tune' if v['tuningsPresent'] else 'nullptr')+','+num(dt)+r');std::cout<<"{\"spool\":"<<e.mSpool<<",\"psi\":"<<e.mPSI<<",\"boost\":"<<e.mInductionBoost<<"}";'
 cpp+='std::cout<<"]";}'
cpp+='std::cout<<"]}";}'

(out/'oracle.cpp').write_text('// SPDX-License-Identifier: MPL-2.0\n'+cpp)
subprocess.run(['g++','-std=c++20','-O0','-fno-fast-math',str(out/'oracle.cpp'),'-o',str(out/'oracle.exe')],check=True)
results=json.loads(subprocess.check_output([str(out/'oracle.exe')],text=True))
for c,r in zip(cases,results['steps']):c['expected']=r
for group,key in [(braking,'brakingTorque'),(engineTorque,'engineTorque'),(induction,'induction')]:
 for c,r in zip(group,results[key]):c['expected']=r
provenance=dict(portCommit=subprocess.check_output(['git','-C',str(port),'rev-parse','HEAD'],text=True).strip(),files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [engine,header,physics,graph,conversion]},compiler=subprocess.check_output(['g++','--version'],text=True).splitlines()[0],flags=['-std=c++20','-O0','-fno-fast-math'],scope='Unchanged extracted GetEngineTorque/GetBrakingTorque/DoInduction and induction helpers plus OnTaskSimulate, Clutch, differential/freewheel helpers, EngineInertia, SmoothRPM, tGraph. External throttle/NOS, ECU/induction/shifting, engine/braking torque and shift-potential stages explicit inputs or no-op stubs. Sabotage disabled; tire integration external; no original binary execution; no NOMERA JS expectations. Source unit conversion bodies extracted unchanged from ConversionUtil.hpp. Angular fixture engine/brake inputs are independent of external helper fixture inputs.')
(out/'fixtures.json').write_text(json.dumps(dict(provenance=provenance,cases=cases,brakingTorque=braking,engineTorque=engineTorque,induction=induction),indent=2)+'\n')
print(len(cases),'cases',sum(len(c['steps']) for c in cases),'steps')
