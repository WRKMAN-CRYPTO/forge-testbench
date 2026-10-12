/* WRKMAN ARCANE LAB 052 | Aggressive Glassrunner triple-dash predator
 * Physically predicts incoming swarm paths. Knows trajectory, not spell recipes.
 * No Phaser, no DOM, no dodge invincibility, no world teleport.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_GLASSRUNNER_MIND=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),hyp=Math.hypot;
 const STATES=Object.freeze(['prowl','alert','windup','evade','recover','stagger',
  'combo-tell','combo-dash','combo-gap','combo-recover']);
 const COMBO_COOLDOWN=10000,COMBO_WINDUP=560,COMBO_DASH=235,COMBO_GAP=175,COMBO_RECOVER=920;
 const WORLD=Object.freeze({left:-770,right:1730,top:-485,bottom:1085});
 function make(id,x,y,now=0){
  return {id,home:{x,y},state:'prowl',face:{x:1,y:0},
   strafe:id%2?1:-1,charges:2,maxCharges:2,rechargeAt:now+3000,
   windupUntil:0,evadeUntil:0,recoverUntil:0,nextDodge:now+600,
   dodge:{x:0,y:0},launchPending:false,threat:null,observedAt:-1,
   lastDodge:-1e6,injuredAt:-1e6,decisions:0,
   combo:{phase:'idle',step:0,until:0,readyAt:now+3200,
    heading:{x:1,y:0},startedAt:-1,finishedAt:-1,launches:0}};
 }
 function hit(m,time){
  if(time-m.injuredAt>400)m.strafe*=-1;
  m.injuredAt=time;
 }
 function stagger(m,time,until){
  // Frost and kinetic stun can interrupt a poised jump. No stored
  // invincible dodge fires the instant the stun wears off.
  m.windupUntil=0;m.evadeUntil=0;m.launchPending=false;
  if(m.combo&&m.combo.phase!=='idle'){
   // Taking a real frost/kinetic stagger breaks the sequence, not just
   // the visuals. Interrupted combos also go on their ten-second cooldown.
   m.combo.phase='idle';m.combo.until=0;
   m.combo.readyAt=Math.max(m.combo.readyAt,until+COMBO_COOLDOWN);
   m.combo.finishedAt=time;
  }
  m.recoverUntil=until+410; // interrupted jump loses its old recovery timetable
  m.nextDodge=Math.max(m.nextDodge,until+250);
  m.state='stagger';m.threat=null;
 }
 function predictThreat(pos,velocity,radius,shot,now){
  if(!shot||!Number.isFinite(shot.x)||!Number.isFinite(shot.y))return null;
  const dx=shot.x-pos.x,dy=shot.y-pos.y,range=hyp(dx,dy);
  if(range>375)return null;
  // In both velocity inputs, units are world pixels per second.
  const vx=shot.vx-velocity.x,vy=shot.vy-velocity.y;
  const speedSq=vx*vx+vy*vy;
  if(speedSq<32*32)return null;
  const dot=dx*vx+dy*vy;
  if(dot>=0)return null; // projectile passing by or moving away
  const t=clamp(-dot/speedSq,0,.85);
  if(t<.035)return null;
  const miss=hyp(dx+vx*t,dy+vy*t);
  const reach=radius+(shot.r||3)+13;
  if(miss>reach)return null;
  return {t,miss,reach,shot:{x:shot.x,y:shot.y,vx:shot.vx,vy:shot.vy,r:shot.r||3,mass:shot.mass||1},seenAt:now};
 }
 function threatScore(t){return (t.reach-t.miss)*.45+32/(t.t+.12)+Math.min(30,t.shot.mass/5)}
 function findThreats(pos,velocity,radius,shots,now){
  let best=null;
  for(const shot of shots||[]){
   const t=predictThreat(pos,velocity,radius,shot,now);
   if(t&&(!best||threatScore(t)>threatScore(best)))best=t;
  }
  return best;
 }
 function clearance(pos,dir,obstacles){
  const destination={x:pos.x+dir.x*135,y:pos.y+dir.y*135};
  let penalty=0;
  if(destination.x<WORLD.left+40||destination.x>WORLD.right-40||
     destination.y<WORLD.top+40||destination.y>WORLD.bottom-40)penalty+=1000;
  for(const ob of obstacles||[]){
   if(!ob?.position)continue;
   const r=ob.radius||30,dx=destination.x-ob.position.x,dy=destination.y-ob.position.y;
   const dist=hyp(dx,dy);
   if(dist<r+42)penalty+=700+Math.max(0,r+42-dist)*8;
   // Discourage a dash *through* a pillar, not only into its far side.
   const apx=ob.position.x-pos.x,apy=ob.position.y-pos.y;
   const projection=clamp((apx*dir.x+apy*dir.y),0,135);
   if(hyp(apx-dir.x*projection,apy-dir.y*projection)<r+23)penalty+=400;
  }
  return penalty;
 }
 function dodgeDirection(m,pos,threat,obstacles,player){
  const v=threat.shot,speed=hyp(v.vx,v.vy)||1;
  const axis={x:-v.vy/speed,y:v.vx/speed};
  const candidates=[axis,{x:-axis.x,y:-axis.y}];
  const scored=candidates.map((dir,i)=>{
   let penalty=clearance(pos,dir,obstacles);
   if(player){
    const next={x:pos.x+dir.x*135,y:pos.y+dir.y*135};
    const d=hyp(next.x-player.x,next.y-player.y);
    if(d<85)penalty+=220+(85-d)*2;
   }
   return {dir,score:penalty+(i===0?0:.2)};
  });
  scored.sort((a,b)=>a.score-b.score);
  return scored[0].dir;
 }
 function intent(m,state,x=0,y=0,speed=0,launch=false){
  m.state=state;
  return {state,x,y,speed,launch,face:{...m.face},charges:m.charges,
   dodge:{...m.dodge},threat:m.threat};
 }

 function unitToward(pos,target,fallback){
  if(!target)return fallback||{x:1,y:0};
  const dx=target.x-pos.x,dy=target.y-pos.y,d=hyp(dx,dy);
  return d>.001?{x:dx/d,y:dy/d}:fallback||{x:1,y:0};
 }
 function comboIntent(m,state,launch=false){
  const dir=m.combo.heading;
  m.state=state;
  return {state,x:dir.x,y:dir.y,speed:launch?17.6+m.combo.step*.65:0,
   launch,dodge:{...dir},comboStep:m.combo.step,comboActive:true,
   face:{...dir},charges:m.charges};
 }
 function launchComboDash(m,pos,player,time){
  const c=m.combo;
  // Each segment aims at the wizard's *current* position, then LOCKS.
  // The second segment veers slightly off axis to create a flank, not homing.
  const aimed=unitToward(pos,player,c.heading);
  const tilt=c.step===1?(m.strafe*.16):0;
  const cosine=Math.cos(tilt),sine=Math.sin(tilt);
  c.heading={x:aimed.x*cosine-aimed.y*sine,y:aimed.x*sine+aimed.y*cosine};
  m.face={...c.heading};
  c.phase='dash';c.until=time+COMBO_DASH;c.launches++;
  return comboIntent(m,'combo-dash',true);
 }
 function advanceCombo(m,pos,player,time){
  const c=m.combo;
  if(c.phase==='tell'){
   if(time<c.until)return comboIntent(m,'combo-tell');
   return launchComboDash(m,pos,player,time);
  }
  if(c.phase==='dash'){
   if(time<c.until)return comboIntent(m,'combo-dash');
   c.phase='gap';c.until=time+COMBO_GAP;
   return comboIntent(m,'combo-gap');
  }
  if(c.phase==='gap'){
   if(time<c.until)return comboIntent(m,'combo-gap');
   if(c.step<2){c.step++;return launchComboDash(m,pos,player,time)}
   // A triple attack, then a genuine open recovery window.
   c.phase='recover';c.until=time+COMBO_RECOVER;
   c.finishedAt=time;c.readyAt=time+COMBO_COOLDOWN;
   return comboIntent(m,'combo-recover');
  }
  if(c.phase==='recover'){
   if(time<c.until)return comboIntent(m,'combo-recover');
   c.phase='idle';
  }
  return null;
 }
 function decide(m,input){
  const {time,pos,velocity={x:0,y:0},player=null,shots=[],obstacles=[]}=input;
  m.decisions++;
  if(time>=m.rechargeAt&&m.charges<m.maxCharges){
   m.charges++;m.rechargeAt=time+2800;
  }else if(m.charges===m.maxCharges)m.rechargeAt=time+2800;
  if(input.staggered)return intent(m,'stagger');
  // A committed triple-dash cannot also consume defensive dodge charges.
  // Its direction is locked per segment; only a new segment reacquires aim.
  if(m.combo.phase!=='idle'){
   const combo=advanceCombo(m,pos,player,time);
   if(combo)return combo;
  }
  if(m.windupUntil>0&&time<m.windupUntil)return intent(m,'windup');
  if(m.launchPending){
   m.launchPending=false;return intent(m,'evade',m.dodge.x,m.dodge.y,14.5,true);
  }
  if(m.evadeUntil>0&&time<m.evadeUntil)return intent(m,'evade',m.dodge.x,m.dodge.y,0);
  if(m.recoverUntil>0&&time<m.recoverUntil)return intent(m,'recover');
  m.windupUntil=0;m.evadeUntil=0;m.recoverUntil=0;
  const incoming=findThreats(pos,velocity,input.radius||18,shots,time);
  if(incoming){m.threat=incoming;m.observedAt=time}
  if(incoming&&m.charges>0&&time>=m.nextDodge){
   m.dodge=dodgeDirection(m,pos,incoming,obstacles,player);
   m.face={...m.dodge};m.charges--;m.lastDodge=time;
   m.windupUntil=time+155;m.evadeUntil=m.windupUntil+250;
   m.recoverUntil=m.evadeUntil+870;m.nextDodge=m.recoverUntil+130;
   m.launchPending=true;
   return intent(m,'windup');
  }
  if(!player)return intent(m,'prowl');
  const dx=player.x-pos.x,dy=player.y-pos.y,d=Math.max(1,hyp(dx,dy));
  // Aggressive new attack: forewarned three-stage physical pursuit.
  // No immunity, no instant positioning, cooldown measured from sequence end.
  if(d>=105&&d<=385&&time>=m.combo.readyAt){
   m.combo.phase='tell';m.combo.step=0;m.combo.until=time+COMBO_WINDUP;
   m.combo.startedAt=time;m.combo.heading=unitToward(pos,player,m.face);
   m.face={...m.combo.heading};
   return comboIntent(m,'combo-tell');
  }
  const forward={x:dx/d,y:dy/d};
  m.face={...forward};
  // Stays in striking range rather than harmlessly orbiting at ~210px.
  // Keeps a lateral movement component so it remains a moving target.
  const range=d>120?1:d<60?-.4:.38;
  const tangent={x:-forward.y*m.strafe,y:forward.x*m.strafe};
  const move={x:forward.x*range+tangent.x*.43,y:forward.y*range+tangent.y*.43};
  const norm=Math.max(1,hyp(move.x,move.y));
  if(incoming)return intent(m,'alert',move.x/norm,move.y/norm,4.2);
  return intent(m,'prowl',move.x/norm,move.y/norm,3.7);
 }
 return Object.freeze({VERSION:'052',STATES,COMBO_COOLDOWN,make,hit,stagger,predictThreat,findThreats,dodgeDirection,decide});
});
