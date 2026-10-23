/* Circuit driving decisions only. Every car still uses the shared vehicle physics. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRivalAI=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
 const arc=(a,b,L)=>((a-b+L*1.5)%L)-L*.5;
 function brakingSpeed(track,s,speed,pace=1,grip=1){
  const horizon=clamp(speed/3.6*3.4+25,75,235),deceleration=5.8*clamp(grip,.45,1.1);let limit=Infinity,bend=null;
  for(let d=0;d<=horizon;d+=10){const q=track.sampleTrackAtS(s+d),k=Math.abs(q.curvature),cornerMps=Math.min(q.speedHintKmh*pace/3.6,Math.sqrt(7.5*clamp(grip,.5,1.1)/Math.max(.0005,k)));
   const allowed=Math.sqrt(cornerMps*cornerMps+2*deceleration*Math.max(0,d-10))*3.6;
   if(allowed<limit){limit=allowed;bend={distance:d,curvature:q.curvature};}
  }return{limit:Math.max(45,limit),bend};
 }
 function choosePass({others,s,lateral,halfWidth,speed,length,previous,now}){
  const ahead=others.map(o=>({...o,ds:arc(o.s,s,length)})).filter(o=>o.ds>0&&o.ds<clamp(speed/3.6*1.7,24,65)&&Math.abs(o.lateral-lateral)<2.7).sort((a,b)=>a.ds-b.ds)[0];
  if(!ahead)return{side:previous?.until>now?previous.side:0,until:previous?.until||0,lead:null};
  const margin=halfWidth-2.5,candidates=[-1,1].map(side=>{const offset=clamp(ahead.lateral+side*3.8,-margin,margin),room=Math.abs(offset-ahead.lateral)>=3.3;
   const blocked=others.some(o=>{const ds=arc(o.s,s,length);return ds> -9&&ds<ahead.ds+12&&Math.abs(o.lateral-offset)<3.1;});
   return{side,offset,free:room&&!blocked,score:Math.abs(offset-lateral)+(previous?.side===side?-1.8:0)};
  }).filter(c=>c.free).sort((a,b)=>a.score-b.score||a.side-b.side);
  const choice=candidates[0];return{side:choice?.side||0,offset:choice?.offset,until:choice?now+1.3:0,lead:ahead};
 }
 function drive(e,rival,dt){
  const track=e.track,p=rival.physics,s=p.state,proj=track.projectPointToTrack(s.x,s.z,rival.progress.lastSegIndex),now=e.state.raceTimeSec||0,ai=rival.authorsAI||(rival.authorsAI={side:0,until:0,cautionUntil:0}),speed=s.speedKmh;
  const others=[{physics:e.playerPhysics,progress:e.playerProgress},...e.rivals.filter(r=>r!==rival)].map(r=>{const o=r.physics.state,q=track.projectPointToTrack(o.x,o.z,r.progress.lastSegIndex);return{s:q.s,lateral:q.lateralOffset,speed:o.speedKmh,id:r.progress.id};});
  const pace=clamp(e.difficulty.cornerSpeedFactor,.8,1.04),plan=brakingSpeed(track,proj.s,speed,pace,s.weatherGrip||1),look=clamp(12+speed/3.6*.55,14,40),target=track.sampleTrackAtS(proj.s+look);
  let offset=clamp(rival.preferredLineOffset||0,-1.5,1.5);
  // Enter a bend from outside, approach the apex gradually, then unwind.
  if(plan.bend&&Math.abs(plan.bend.curvature)>.005){const side=Math.sign(plan.bend.curvature),phase=clamp(1-plan.bend.distance/85,0,1);offset=side*(phase*2.7-1.3);}
  const pass=choosePass({others,s:proj.s,lateral:proj.lateralOffset,halfWidth:proj.halfWidth,speed,length:track.totalLength,previous:ai,now});
  if(pass.side&&pass.offset!==undefined){ai.offset=pass.offset;ai.side=pass.side;ai.until=pass.until;}
  else if(!pass.side){ai.side=0;ai.until=0;}
  if(ai.side&&now<ai.until)offset=ai.offset;
  // Do not merge across a car that is alongside, even after the pass timer expires.
  const alongside=others.find(o=>Math.abs(arc(o.s,proj.s,track.totalLength))<7&&Math.abs(o.lateral-offset)<3.1);
  if(alongside)offset=proj.lateralOffset;
  offset=clamp(offset,-proj.halfWidth+2.6,proj.halfWidth-2.6);
  rival.currentLineOffset=(Number.isFinite(rival.currentLineOffset)?rival.currentLineOffset:proj.lateralOffset)+clamp(offset-(rival.currentLineOffset||0),-2.8*dt,2.8*dt);
  const tx=target.x+target.nx*rival.currentLineOffset,tz=target.z+target.nz*rival.currentLineOffset,error=angle(Math.atan2(tx-s.x,tz-s.z)-s.heading);
  const desiredYaw=clamp(error*2.7,-1.7,1.7),steer=clamp(error*e.difficulty.reactionSteerKp+(desiredYaw-s.yawRate)*.18,-1,1);
  let targetSpeed=Math.min(p.profile.topSpeedKmh||p.profile.maxSpeedKmh||310,plan.limit);
  if(Math.abs(error)>.4)targetSpeed=Math.min(targetSpeed,Math.max(45,120-Math.abs(error)*65));
  if(now<ai.cautionUntil)targetSpeed=Math.min(targetSpeed,Math.max(45,speed*.8));
  if(pass.lead&&!pass.side){const gap=Math.max(0,pass.lead.ds-6);targetSpeed=Math.min(targetSpeed,Math.max(0,pass.lead.speed+(gap-speed/3.6*.65)*2));}
  let throttle=clamp((targetSpeed-speed)/22+.35,0,e.difficulty.throttleLimit),brakeInput=speed>targetSpeed+3?clamp((speed-targetSpeed)/32,.08,.85):0;
  if(brakeInput)throttle=0;
  const prog=rival.progress;if(speed<5&&now>3){prog.stuckTimer=(prog.stuckTimer||0)+dt;if(prog.stuckTimer>2){prog.reverseRecoveryTimer=1;prog.stuckTimer=0;}}else prog.stuckTimer=0;
  if(prog.reverseRecoveryTimer>0){prog.reverseRecoveryTimer=Math.max(0,prog.reverseRecoveryTimer-dt);return{steer:-steer,throttle:0,brakeInput:1,handbrake:false,nitro:false};}
  ai.targetSpeed=targetSpeed;ai.offsetTarget=offset;ai.leadGap=pass.lead?.ds??null;ai.braking=brakeInput;
  return{steer,throttle,brakeInput,handbrake:false,nitro:!pass.lead&&now>=ai.cautionUntil&&Math.abs(error)<.09&&plan.limit>speed+25&&speed>105&&s.nitro>45&&e.difficulty.nitroChance>.5};
 }
 function contact(rival,time){const ai=rival.authorsAI||(rival.authorsAI={side:0,until:0});ai.cautionUntil=time+.85;ai.until=0;ai.side=0;}
 return{drive,brakingSpeed,choosePass,contact,arc};
});
