/* WRKMAN ARCANE LAB 046 / GRAVELHORN territorial intelligence.
 * Decisions are independent of Phaser. The world controls actual physical
 * movement/impacts; this mind supplies intent, memory and telegraphs.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_TERRITORY_MIND=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const STATES=Object.freeze(['patrol','watch','warn','windup','charge','recover','return']);
 const TWO_PI=Math.PI*2;
 function make(id,x,y,now=0){
  return {id,seed:(Math.imul(id+13,2654435761)>>>0)||13,
   home:{x,y},waypoint:{x,y},nextWander:now,awareness:0,state:'patrol',
   since:now,lastSeen:-1e9,lastHurt:-1e9,lastCharge:-1e9,
   windupUntil:0,chargeUntil:0,recoverUntil:0,launched:false,
   face:{x:1,y:0},decisions:0};
 }
 function random(m){
  m.seed=(Math.imul(m.seed,1664525)+1013904223)>>>0;
  return m.seed/4294967296;
 }
 function relative(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.001,Math.hypot(dx,dy));
  return {x:dx/d,y:dy/d,d};
 }
 function intent(m,state,x=0,y=0,speed=0,launch=false){
  if(m.state!==state){m.state=state;m.since=m._time}
  return {state,x,y,speed,launch,face:{...m.face},awareness:m.awareness};
 }
 function injured(m,source,time){
  m.lastHurt=time;
  m.lastSeen=time;
  m.awareness=1;
  // Being struck starts a real warning unless already committed to a rush.
  if(source&&time>=m.chargeUntil&&time>=m.recoverUntil){
   const t=relative(m.home,source);
   m.face={x:t.x,y:t.y};
  }
 }
 function decide(m,input){
  const {time,pos,player}=input,health=clamp(input.health??1,0,1);
  m._time=time;m.decisions++;
  const home=relative(pos,m.home);
  const fromHome=relative(m.home,pos);
  const p=player?relative(pos,player):null;
  const trespass=player&&relative(m.home,player).d<310;
  const nearby=Boolean(p&&p.d<300&&trespass);
  const injuredRecently=time-m.lastHurt<5800;
  const wounded=health<.38;
  let disturbance=0;
  for(const s of input.signals||[]){
   const age=time-s.at;if(age<0||age>2200)continue;
   const d=Math.hypot(pos.x-s.x,pos.y-s.y),reach=120+Math.min(2,s.power||0)*125;
   if(d>=reach)continue;
   // Danger and blasts are louder, but never reveal a distant wizard.
   const weight=(s.kind==='blast'||s.kind==='danger'?1.25:.55);
   disturbance=Math.max(disturbance,(1-d/reach)*(1-age/2300)*(s.power||0)*weight);
  }
  if(nearby){
   m.lastSeen=time;
   const pressure=(p.d<148?.26:p.d<245?.16:.09);
   m.awareness=clamp(m.awareness+pressure,0,1);
  }else m.awareness=clamp(m.awareness-(injuredRecently?.018:.065),0,1);
  if(disturbance>.08)m.awareness=clamp(m.awareness+Math.min(.24,disturbance*.23),0,1);
  if(injuredRecently)m.awareness=Math.max(m.awareness,.82);
  // An older launched charge/recovery cannot be interrupted by new noise.
  if(m.windupUntil&&time<m.windupUntil)return intent(m,'windup',0,0,0);
  if(m.chargeUntil&&time<m.chargeUntil){
   const launch=!m.launched;m.launched=true;
   return intent(m,'charge',m.face.x,m.face.y,wounded?17.5:15.0,launch);
  }
  if(m.recoverUntil&&time<m.recoverUntil)return intent(m,'recover',0,0,0);
  // Forget old committed-attack windows only after recovery has elapsed.
  if(time>=m.recoverUntil){m.windupUntil=0;m.chargeUntil=0;m.recoverUntil=0;m.launched=false}
  // Truly leaving its territory dissolves aggression. It does not chase
  // a wizard across the map just because it once saw them.
  if(fromHome.d>190){
   return intent(m,'return',home.x,home.y,2.0);
  }
  if(m.awareness>=.85&&p&&p.d<285&&trespass&&time-m.lastCharge>3400){
   // Snapshot aim BEFORE 700ms windup. The charge cannot magically turn.
   m.face={x:p.x,y:p.y};
   m.windupUntil=time+(wounded?550:720);
   m.chargeUntil=m.windupUntil+850;
   m.recoverUntil=m.chargeUntil+(wounded?740:1060);
   m.lastCharge=time;
   return intent(m,'windup',0,0,0);
  }
  if(m.awareness>=.60){
   if(p&&nearby)m.face={x:p.x,y:p.y};
   return intent(m,'warn',0,0,0);
  }
  if(m.awareness>=.17||disturbance>.15){
   if(p&&nearby)m.face={x:p.x,y:p.y};
   return intent(m,'watch',0,0,0);
  }
  if(time>=m.nextWander){
   const theta=random(m)*TWO_PI,r=25+random(m)*110;
   m.waypoint={x:m.home.x+Math.cos(theta)*r,y:m.home.y+Math.sin(theta)*r};
   m.nextWander=time+1900+random(m)*2800;
  }
  const walk=relative(pos,m.waypoint);
  if(walk.d<18)return intent(m,'patrol',0,0,0);
  m.face={x:walk.x,y:walk.y};
  return intent(m,'patrol',walk.x,walk.y,.86);
 }
 return Object.freeze({STATES,make,decide,injured});
});
