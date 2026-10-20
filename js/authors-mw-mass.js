/* SPDX-License-Identifier: MPL-2.0
 * SetCOG adapted from pinned ProStreetMWPhysics 9c6e261. Source attribute
 * scales are retained; the box tensor and modern profiles are NOMERA's bridge,
 * since the original IRigidBody implementation is absent. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraMWMass=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SOURCE={
 "wrx": {
  "rollCenter": 0.2413,
  "ride": [
   0.21589999999999998,
   0.21589999999999998
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.4,
  "bias": 0.53,
  "source": "CarDataDump/orig_mw_full/imprezawrx.conf"
 },
 "m3gtr": {
  "rollCenter": 0.2286,
  "ride": [
   0.1905,
   0.1905
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.3,
  "bias": 0.54,
  "source": "CarDataDump/orig_mw_full/bmwm3gtr.conf"
 },
 "corvette_cross": {
  "rollCenter": 0.22225,
  "ride": [
   0.2032,
   0.2032
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.3,
  "bias": 0.53849998,
  "source": "CarDataDump/orig_mw_full/corvettec6r.conf"
 },
 "mustang_razor": {
  "rollCenter": 0.2667,
  "ride": [
   0.2286,
   0.2286
  ],
  "tensor": [
   1,
   3.5,
   1
  ],
  "yawSpeed": 0.65,
  "bias": 0.53,
  "source": "CarDataDump/orig_mw_full/mustanggt.conf"
 },
 "mclaren": {
  "rollCenter": 0.2286,
  "ride": [
   0.17779999999999999,
   0.17779999999999999
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.45,
  "bias": 0.53799999,
  "source": "CarDataDump/orig_mw_full/slr.conf"
 },
 "db9": {
  "rollCenter": 0.23113999999999998,
  "ride": [
   0.15239999999999998,
   0.15239999999999998
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.45,
  "bias": 0.52700001,
  "source": "CarDataDump/orig_mw_full/db9.conf"
 },
 "viper_jv": {
  "rollCenter": 0.254,
  "ride": [
   0.18033999999999997,
   0.18033999999999997
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.4,
  "bias": 0.525,
  "source": "CarDataDump/orig_mw_full/viper.conf"
 },
 "corvette_webster": {
  "rollCenter": 0.2413,
  "ride": [
   0.22479,
   0.22479
  ],
  "tensor": [
   1.5,
   2,
   1.5
  ],
  "yawSpeed": 0.3,
  "bias": 0.53200001,
  "source": "CarDataDump/orig_mw_full/corvette.conf"
 },
 "gallardo_ming": {
  "rollCenter": 0.24383999999999997,
  "ride": [
   0.1651,
   0.1651
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.425,
  "bias": 0.53849998,
  "source": "CarDataDump/orig_mw_full/gallardo.conf"
 },
 "clk_kaze": {
  "rollCenter": 0.254,
  "ride": [
   0.2032,
   0.2032
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.5,
  "bias": 0.535,
  "source": "CarDataDump/orig_mw_full/clk500.conf"
 },
 "mustang_jewels": {
  "rollCenter": 0.2667,
  "ride": [
   0.2286,
   0.2286
  ],
  "tensor": [
   1,
   3.5,
   1
  ],
  "yawSpeed": 0.65,
  "bias": 0.53,
  "source": "CarDataDump/orig_mw_full/mustanggt.conf"
 },
 "evo8_earl": {
  "rollCenter": 0.2667,
  "ride": [
   0.2032,
   0.2032
  ],
  "tensor": [
   1,
   3,
   1
  ],
  "yawSpeed": 0.7,
  "bias": 0.5475,
  "source": "CarDataDump/orig_mw_full/lancerevo8.conf"
 },
 "cayman_baron": {
  "rollCenter": 0.254,
  "ride": [
   0.21589999999999998,
   0.21589999999999998
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.425,
  "bias": 0.53700001,
  "source": "CarDataDump/orig_mw_full/caymans.conf"
 },
 "eclipse_lou": {
  "rollCenter": 0.254,
  "ride": [
   0.2286,
   0.2286
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.4,
  "bias": 0.535,
  "source": "CarDataDump/orig_mw_full/eclipsegt.conf"
 },
 "rx7": {
  "rollCenter": 0.2286,
  "ride": [
   0.1651,
   0.1651
  ],
  "tensor": [
   1.05,
   3.6,
   1.05
  ],
  "yawSpeed": 0.725,
  "bias": 0.5275,
  "source": "CarDataDump/orig_mw_full/rx8.conf"
 },
 "supra": {
  "rollCenter": 0.2413,
  "ride": [
   0.2032,
   0.2032
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.48,
  "bias": 0.53,
  "source": "CarDataDump/orig_mw_full/supra.conf"
 },
 "is300_taz": {
  "rollCenter": 0.254,
  "ride": [
   0.2032,
   0.2032
  ],
  "tensor": [
   1.4,
   2.5,
   1.4
  ],
  "yawSpeed": 0.45,
  "bias": 0.535,
  "source": "CarDataDump/orig_mw_full/is300.conf"
 },
 "golf_sonny": {
  "rollCenter": 0.24764999999999998,
  "ride": [
   0.2032,
   0.2032
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.35,
  "bias": 0.53200001,
  "source": "CarDataDump/orig_mw_full/gti.conf"
 },
 "audir8": {
  "rollCenter": 0.2032,
  "ride": [
   0.19685,
   0.19685
  ],
  "tensor": [
   1,
   2,
   1
  ],
  "yawSpeed": 0.32,
  "bias": 0.52,
  "source": "CarDataDump/orig_cb_full/darius.conf"
 }
};
 function sourceCOG({frontAxle,wheelbase,halfHeight,bias,rollCenter,ride,touching,extraBias=0,extraRide=0}){
  const rear=frontAxle-wheelbase,frontBias=touching===0?.5:(bias+extraBias)*.01;
  return[0,rollCenter*.0254-(halfHeight+Math.max(...ride.map(h=>(h+extraRide)*.0254))),wheelbase*frontBias+rear];
 }
 function properties(p){
  const source=SOURCE[p.id],tall=p.category==='suv'||p.id==='cullinan',sport=['supercar','hypercar','nfsmw'].includes(p.category);
  const spec=source||{rollCenter:.2286*p.cgHeight/.5,ride:[.19,.19],tensor:[1,tall?2.7:sport?2:2.4,1],yawSpeed:tall?.48:.43,bias:p.frontWeightBias};
  const dimensions=[p.trackWidth*1.15,tall?1.85:Math.max(1.18,p.cgHeight*2.9),p.wheelbase*1.65],m=p.massKg/12,[w,h,l]=dimensions;
  const inertia=[m*(h*h+l*l)*spec.tensor[0],m*(w*w+l*l)*spec.tensor[1],m*(w*w+h*h)*spec.tensor[2]];
  return{...spec,dimensions,inertia,bias:source?source.bias:p.frontWeightBias,source:source?.source||'NOMERA estimate',tensorIntegration:'NOMERA box × source/estimated TENSOR_SCALE'};
 }
 // Euler's body-space angular momentum equation; diagonal principal tensor.
 function angularAcceleration(inertia,omega,torque){const momentum=omega.map((v,i)=>v*inertia[i]),gyro=[omega[1]*momentum[2]-omega[2]*momentum[1],omega[2]*momentum[0]-omega[0]*momentum[2],omega[0]*momentum[1]-omega[1]*momentum[0]];return torque.map((v,i)=>(v-gyro[i])/inertia[i]);}
 return{sourceCOG,properties,angularAcceleration,sourceProfiles:SOURCE};
});
