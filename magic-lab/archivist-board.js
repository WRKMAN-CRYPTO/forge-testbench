/* WANDRUNE 065 | The Archivist's Board
 * Deterministic, fixed-budget, two-ply physical shot evaluator.
 * It only projects visible player motion and rules of Matter projectiles.
 * It does not see controller inputs, future actions, or rune instructions.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ARCHIVIST_BOARD=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const PI=Math.PI,TAU=PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const BASE_SPEED=3.35,SHOT_RADIUS=7,PLAYER_RADIUS=17;
 const DIRECTIONS=["hold","left","right","approach","retreat"];
 const WORLD={left:-800,right:1760,top:-520,bottom:1120};
 function basis(origin,player){
  const dx=player.x-origin.x,dy=player.y-origin.y,len=Math.max(1,Math.hypot(dx,dy));
  return {forward:{x:dx/len,y:dy/len},side:{x:-dy/len,y:dx/len}};
 }
 function intended(name,b){
  if(name==="left")return {x:-b.side.x,y:-b.side.y};
  if(name==="right")return b.side;
  if(name==="approach")return {x:-b.forward.x,y:-b.forward.y};
  if(name==="retreat")return b.forward;
  return {x:0,y:0};
 }
 function angles(plan,origin,target,attacks=0){
  const dx=target.x-origin.x,dy=target.y-origin.y;
  const theta=Math.atan2(dy,dx)+(plan.angleBias||0);
  const out=[];
  for(let i=0;i<plan.count;i++){
   if(plan.tactic==="fork"&&plan.stage==="opening"){
    const side=i<plan.count/2?-1:1;
    out.push(theta+side*(.24+.08*Math.floor((i+1)/2)));
   }else if(plan.motif==="lance")out.push(theta+(i-1)*plan.spread*.55);
   else if(plan.motif==="fan")out.push(theta+(i-2)*plan.spread);
   else if(plan.motif==="pincer")out.push(theta+((i%2===0?-1:1)*(.20+Math.floor(i/2)*plan.spread)));
   else out.push(theta+(i-2.5)*plan.spread+.23*(attacks%3));
  }
  return out;
 }
 function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
 function bounded(p){return {x:clamp(p.x,WORLD.left+40,WORLD.right-40),y:clamp(p.y,WORLD.top+40,WORLD.bottom-40)}}
 function estimate(ob,name,tick,b){
  const wish=intended(name,b);
  // Current observed momentum is a prior, not an oracle: a movement choice
  // takes time to develop. Straight continuation has inertia, too.
  const last=ob.lastPlayer||{vx:0,vy:0};
  const v={x:clamp((last.vx||0)/60,-BASE_SPEED,BASE_SPEED),
           y:clamp((last.vy||0)/60,-BASE_SPEED,BASE_SPEED)};
  const ramp=clamp((tick-2)/9,0,1),blend=.38*(1-ramp);
  const x=ob.player.x+(wish.x*BASE_SPEED*(1-blend)+v.x*blend)*tick;
  const y=ob.player.y+(wish.y*BASE_SPEED*(1-blend)+v.y*blend)*tick;
  return bounded({x,y});
 }
 function nearTerrain(point,ob){
  for(const p of (ob.obstacles||[]).slice(0,14)){
   if(!p?.position)continue;
   if(distance(point,p.position)<(p.radius||25)+PLAYER_RADIUS+3)return true;
  }
  return false;
 }
 function volley(plan,origin,target,tick0,attacks){
  return angles(plan,origin,target,attacks).map(theta=>{
   const dx=Math.cos(theta),dy=Math.sin(theta);
   return {x:origin.x+dx*47,y:origin.y+dy*47,vx:dx*plan.speed,vy:dy*plan.speed,t0:tick0};
  });
 }
 function risk(path,shots,ob,b){
  let maxRisk=0,close=Infinity,blocked=false;
  // 30 simulation ticks = 0.5s of travel. A second ply can arrive at
  // roughly 45 ticks when delayed gambits are employed.
  for(let t=4;t<=76;t+=4){
   const p=estimate(ob,path,t,b);
   if(nearTerrain(p,ob)){blocked=true;break;}
   for(const s of shots){
    const age=t-s.t0;if(age<0||age>35)continue;
    const q={x:s.x+s.vx*age,y:s.y+s.vy*age};
    const d=distance(p,q);
    if(d<close)close=d;
    const threat=clamp((PLAYER_RADIUS+SHOT_RADIUS+23-d)/47,0,1);
    maxRisk=Math.max(maxRisk,threat);
   }
  }
  return {threat:maxRisk,closest:close,blocked};
 }
 function evaluate(plan,ob,attacks=0){
  if(!plan||!ob?.pos||!ob?.player||!Number.isFinite(plan.speed))return null;
  const b=basis(ob.pos,ob.player);
  const split=["herd","bait","fork"].includes(plan.tactic);
  const count=split?Math.ceil(plan.count/2):plan.count;
  const preference=ob.dodgePreference||1;
  const opening={...plan,stage:split?"opening":"single",count,
   angleBias:plan.tactic==="fork"?0:
    split?-preference*(plan.tactic==="bait"?.28:.17):0};
  const openingShots=volley(opening,ob.pos,ob.player,0,attacks);
  let sum=0,threatened=0,free=0,blocked=0,bestRisk=1;
  const all=[];
  for(const route of DIRECTIONS){
   const shots=openingShots.slice();
   // Second ply: this is an estimated response to a possible escape, NOT
   // a claim that the actual player will make it. The later real attack
   // reevaluates the position based on new visible observations.
   if(split){
    const target=estimate(ob,route,45,b);
    const counter={...plan,stage:"followup",count:plan.count-count,
     spread:Math.min(.26,plan.spread*.70),angleBias:0};
    shots.push(...volley(counter,ob.pos,target,45,attacks));
   }
   const data=risk(route,shots,ob,b);
   all.push({route,...data});
   if(data.blocked){blocked++;continue;}
   sum+=data.threat;
   if(data.threat>.47)threatened++;
   else free++;
   bestRisk=Math.min(bestRisk,data.threat);
  }
  // More threatened *plausible* routes is useful; every route unsafe means
  // our coarse model is overconfident, so don't reward fake checkmate.
  const legal=Math.max(1,DIRECTIONS.length-blocked);
  const control=threatened/legal;
  const feasibility=free>0?1:.45;
  const score=clamp((sum/legal)*2.0+control*1.7+.15*(split?1:0),0,4)*
    feasibility-(blocked/DIRECTIONS.length)*.15;
  return {score,threatened,free,blocked,control,paths:all,
    budget:plan.count,plies:split?2:1};
 }
 function compare(plans,ob,attacks=0){
  const result=plans.map(plan=>({plan,assessment:evaluate(plan,ob,attacks)}))
   .filter(x=>x.assessment);
  result.sort((a,b)=>b.assessment.score-a.assessment.score);
  return result;
 }
 return Object.freeze({DIRECTIONS,angles,estimate,evaluate,compare});
});