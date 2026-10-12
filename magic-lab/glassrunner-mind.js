/* WRKMAN ARCANE LAB 051 | Glassrunner evasive predator
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
 const STATES=Object.freeze(['prowl','alert','windup','evade','recover','stagger']);
 const WORLD=Object.freeze({left:-770,right:1730,top:-485,bottom:1085});
 function make(id,x,y,now=0){
  return {id,home:{x,y},state:'prowl',face:{x:1,y:0},
   strafe:id%2?1:-1,charges:2,maxCharges:2,rechargeAt:now+3000,
   windupUntil:0,evadeUntil:0,recoverUntil:0,nextDodge:now+600,
   dodge:{x:0,y:0},launchPending:false,threat:null,observedAt:-1,
   lastDodge:-1e6,injuredAt:-1e6,decisions:0};
 }
 function hit(m,time){
  if(time-m.injuredAt>400)m.strafe*=-1;
  m.injuredAt=time;
 }
 function stagger(m,time,until){
  // Frost and kinetic stun can interrupt a poised jump. No stored
  // invincible dodge fires the instant the stun wears off.
  m.windupUntil=0;m.evadeUntil=0;m.launchPending=false;
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
 function decide(m,input){
  const {time,pos,velocity={x:0,y:0},player=null,shots=[],obstacles=[]}=input;
  m.decisions++;
  if(time>=m.rechargeAt&&m.charges<m.maxCharges){
   m.charges++;m.rechargeAt=time+2800;
  }else if(m.charges===m.maxCharges)m.rechargeAt=time+2800;
  if(input.staggered)return intent(m,'stagger');
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
  const forward={x:dx/d,y:dy/d};
  m.face={...forward};
  // A nimble predator circles the wizard but gives the caster opportunities
  // to aim, lead a shot, and catch it during recovery.
  const range=d>250?1:d<170?-.9:0;
  const tangent={x:-forward.y*m.strafe,y:forward.x*m.strafe};
  const move={x:forward.x*range+tangent.x*.78,y:forward.y*range+tangent.y*.78};
  const norm=Math.max(1,hyp(move.x,move.y));
  if(incoming)return intent(m,'alert',move.x/norm,move.y/norm,2.6);
  return intent(m,'prowl',move.x/norm,move.y/norm,2.2);
 }
 return Object.freeze({VERSION:'051',STATES,make,hit,stagger,predictThreat,findThreats,dodgeDirection,decide});
});
