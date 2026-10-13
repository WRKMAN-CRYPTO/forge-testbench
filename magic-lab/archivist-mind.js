/* WANDRUNE 063 | The Archivist: Counter-Deception and Forked Threats
 * No global player profiling. One creature, a bounded, imperfect memory.
 * Observes visible physical movement / nearby elemental matter, not rune layouts
 * or future inputs. Experimental physical projectile motifs are composable.
 */
(function(root,factory){
 "use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ARCHIVIST=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const ADDRESS="721360",NAME="The Archivist",KEY="wrkman-wandrune-archivist-memory-v1",RANGE=530;
 const ELEMENTS=["arcane","frost","fire","lightning"];
 const MOTIFS=["lance","fan","pincer","spiral"];
 const TACTICS=["probe","herd","bait","fork"];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const fresh=()=>({version:1,encounters:0,defeats:0,wins:0,element:[0,0,0,0],dodges:[0,0],feints:0,plans:[],lastLine:""});
 function validate(raw){
  const m=fresh();if(!raw||raw.version!==1)return m;
  for(const k of ["encounters","defeats","wins"])m[k]=clamp(Math.floor(Number(raw[k])||0),0,999);
  for(const k of ["element","dodges"]){
   if(Array.isArray(raw[k]))m[k]=m[k].map((_,i)=>clamp(Number(raw[k][i])||0,0,80));
  }
  m.feints=clamp(Number(raw.feints)||0,0,80);
  if(Array.isArray(raw.plans))m.plans=raw.plans.slice(0,6).filter(x=>
   x&&MOTIFS.includes(x.motif)&&ELEMENTS.includes(x.element)&&
   Number.isFinite(x.score)).map(x=>({motif:x.motif,element:x.element,
     lead:!!x.lead,feint:!!x.feint,tactic:TACTICS.includes(x.tactic)?x.tactic:"probe",score:clamp(x.score,-5,10)}));
  m.lastLine=String(raw.lastLine||"").slice(0,90);
  return m;
 }
 function read(storage){
  try{return validate(JSON.parse(storage?.getItem(KEY)||"null"))}catch(_){return fresh()}
 }
 function write(storage,m){
  try{storage?.setItem(KEY,JSON.stringify(validate(m)));return Boolean(storage)}
  catch(_){return false}
 }
 function make(storage,time=0){
  const prior=read(storage);
  return {prior,storage,started:time,nextThink:time,until:0,attackAt:time+2200,
   state:"observe",intent:{x:0,y:0,speed:0},held:null,pending:null,lastPlayer:null,seen:{element:[0,0,0,0],dodges:[0,0],feints:0},attempts:[],
   learned:0,observedAt:time,pressure:{x:0,y:0,count:0},
   // Projectile impressions are held only during this physical encounter.
   boltSeen:null,dodgeUntil:0,dodgeCooldown:0,dodgeDirection:null,dodgeLaunch:false,
   boltDodges:0,boltThreats:0,attacks:0,successes:0,experiments:[],lastPlan:null,
   leaveSaved:false,quoteAt:0,quote:"I have not seen your methods.",lastHp:1,
   seed:(0x9e3779b9^Math.imul(prior.encounters+1,0x85ebca6b))>>>0};
 }
 function rand(m){
  m.seed=(m.seed+0x6d2b79f5)>>>0;
  let z=m.seed;z=Math.imul(z^(z>>>15),z|1);
  z^=z+Math.imul(z^(z>>>7),z|61);
  return ((z^(z>>>14))>>>0)/4294967296;
 }
 function observedElement(a){
  // Agent source element is its visible material: do not inspect recipe.runes.
  return a.element===3?1:a.element===1?2:a.element===4?3:0;
 }
 function observe(m,{time,pos,player,casts=[],shots=[]}){
  if(time-m.observedAt<220)return;
  const previous=m.lastPlayer;
  const dt=Math.max(.05,(time-m.observedAt)/1000);
  m.observedAt=time;
  const d=Math.hypot(player.x-pos.x,player.y-pos.y);
  if(d<=RANGE&&previous&&dt<.6){
   const vx=(player.x-previous.x)/dt,vy=(player.y-previous.y)/dt;
   const dx=player.x-pos.x,dy=player.y-pos.y,dist=Math.max(1,Math.hypot(dx,dy));
   const lateral=(dx*vy-dy*vx)/dist;
   if(Math.abs(lateral)>90&&Math.hypot(vx,vy)>130){
    m.seen.dodges[lateral>0?1:0]+=.18;
    m.learned+=.18;
   }
  }
  m.lastPlayer={x:player.x,y:player.y,vx:previous?(player.x-previous.x)/dt:0,
    vy:previous?(player.y-previous.y)/dt:0};
  // Look only at nearby observed agents, sample no more than 48 per frame.
  if(!d||d>RANGE+240){m.pressure={x:0,y:0,count:0};return;}
  let budget=48,px=0,py=0,nearby=0;
  for(const cast of casts){
   if(budget<=0)break;
   const agents=cast?.agents||[];
   if(!agents.length)continue;
   const step=Math.max(1,Math.ceil(agents.length/Math.min(14,budget)));
   for(let i=0;i<agents.length&&budget>0;i+=step){
    budget--;
    const a=agents[i];
    if(!a||!Number.isFinite(a.x)||!Number.isFinite(a.y))continue;
    let x,y;
    if(cast.delivery==="world"){
     const dx=(a.x-cast.spawnX)*cast.worldW,dy=(a.y-cast.spawnY)*cast.worldH;
     x=cast.center.x+dx*cast.right.x+dy*cast.forward.x;
     y=cast.center.y+dx*cast.right.y+dy*cast.forward.y;
    }else{x=cast.center.x+(a.x-.5)*cast.scale;y=cast.center.y+(a.y-.5)*cast.scale;}
    const dist=Math.hypot(x-pos.x,y-pos.y);
    if(dist>390)continue;
    if(dist<205&&dist>1){
     const weight=clamp((205-dist)/160,.12,1);
     px+=(pos.x-x)/dist*weight;py+=(pos.y-y)/dist*weight;nearby++;
    }
    const element=observedElement(a);
    m.seen.element[element]+=.07;m.learned+=.07;
   }
  }
  // Visible ordinary projectiles also contribute evidence, but don't reveal
  // any attacker's spell construction or input intention.
  for(const shot of shots.slice(0,12)){
   const b=shot?.body;if(!b?.labAlive||b.gameTag!=="bolt")continue;
   if(Math.hypot(b.position.x-pos.x,b.position.y-pos.y)<330){
    m.seen.element[0]+=.1;m.learned+=.1;
   }
  }
  m.learned=clamp(m.learned,0,1000);
  m.pressure={x:px,y:py,count:nearby};
 }

 // Matter velocity uses pixels/physics tick (not pixels per second).
 // Extrapolate only currently visible moving bodies. We do NOT inspect casts,
 // inputs, future movement, or player intention for dodging decisions.
 const BOLT_SENSE=450,MAX_SENSED=20,MAX_TICKS=37;
 const WORLD=Object.freeze({left:-800,right:1760,top:-520,bottom:1120});
 function predictBolt(pos,velocity,radius,shot){
  const b=shot?.body||shot;
  if(!b||b.gameTag!=="bolt"||b.labAlive===false||
     !b.position||!b.velocity)return null;
  const x=b.position.x-pos.x,y=b.position.y-pos.y;
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(x,y)>BOLT_SENSE)return null;
  const vx=b.velocity.x-(velocity?.x||0),vy=b.velocity.y-(velocity?.y||0);
  const v2=vx*vx+vy*vy;
  if(v2<4||x*vx+y*vy>=0)return null; // stationary or receding projectile
  const ticks=-(x*vx+y*vy)/v2;
  if(ticks<2||ticks>MAX_TICKS)return null;
  const miss=Math.hypot(x+vx*ticks,y+vy*ticks);
  const reach=radius+8+11; // honest collision size plus uncertainty
  if(miss>=reach)return null; // don't waste dodges on near misses
  return {ticks,miss,reach,shot:{x:b.position.x,y:b.position.y,
   vx:b.velocity.x,vy:b.velocity.y,r:8},body:b};
 }
 function visibleBolts(ob){
  const found=[];
  let checked=0;
  for(const p of (ob.shots||[])){
   // His own Ember spells are not Arc Bolts and cannot hide incoming bolts
   // by filling the front of the shared projectile queue.
   if(p?.body?.gameTag!=="bolt")continue;
   if(++checked>MAX_SENSED)break;
   const threat=predictBolt(ob.pos,ob.velocity,ob.radius||32,p);
   if(threat)found.push(threat);
  }
  return found.sort((a,b)=>a.ticks-b.ticks||a.miss-b.miss);
 }
 function edgePenalty(pos,dir,obstacles){
  const dest={x:pos.x+dir.x*75,y:pos.y+dir.y*75};
  let penalty=0;
  if(dest.x<WORLD.left+52||dest.x>WORLD.right-52||
     dest.y<WORLD.top+52||dest.y>WORLD.bottom-52)penalty+=420;
  for(const o of (obstacles||[]).slice(0,14)){
   if(!o?.position)continue;
   const r=o.radius||28;
   const ax=o.position.x-pos.x,ay=o.position.y-pos.y;
   const projection=clamp(ax*dir.x+ay*dir.y,0,75);
   if(Math.hypot(ax-dir.x*projection,ay-dir.y*projection)<r+35)penalty+=200;
   if(Math.hypot(dest.x-o.position.x,dest.y-o.position.y)<r+40)penalty+=180;
  }
  return penalty;
 }
 function chooseDodge(m,ob,threats,speed){
  const first=threats[0],b=first.shot;
  const mag=Math.hypot(b.vx,b.vy)||1,axis={x:-b.vy/mag,y:b.vx/mag};
  const directions=[axis,{x:-axis.x,y:-axis.y}];
  let best=null;
  for(let side=0;side<2;side++){
   const dir=directions[side];
   const time=Math.min(first.ticks,20);
   // Damped dodge distance accounts for the acceleration required by a real
   // Matter body: no teleport and no fictitious invulnerability.
   const distance=speed*Math.max(0,time-2)*.72;
   const destination={x:ob.pos.x+dir.x*distance,y:ob.pos.y+dir.y*distance};
   let risk=edgePenalty(ob.pos,dir,ob.obstacles);
   for(const t of threats){
    const future={x:t.shot.x+t.shot.vx*t.ticks,
     y:t.shot.y+t.shot.vy*t.ticks};
    const futureSelf={x:destination.x+(ob.velocity?.x||0)*Math.min(5,t.ticks),
     y:destination.y+(ob.velocity?.y||0)*Math.min(5,t.ticks)};
    const clearance=Math.hypot(future.x-futureSelf.x,future.y-futureSelf.y);
    if(clearance<t.reach+30)risk+=(t.reach+30-clearance)*3;
   }
   // A poor early theory can send him toward the wrong side; that bias is
   // deterministic per encounter and small compared to actual collision risk.
   const habit=m.prior?.dodges||[0,0];
   risk+=((side===0?habit[0]:habit[1])||0)*.04;
   if(!best||risk<best.risk)best={dir,risk};
  }
  return best;
 }
 function weight(m,elem,motif,lead,feint){
  const preferred=m.seen.element.map((x,i)=>x+m.prior.element[i]);
  const max=Math.max(...preferred);
  const dodge=m.seen.dodges.map((x,i)=>x+m.prior.dodges[i]);
  const learnedPlan=m.prior.plans.find(p=>p.element===elem&&p.motif===motif&&(!p.tactic||p.tactic==="probe"));
  // Element counters are empirical guesses, not perfect immunities.
  let n=1+Math.min(2.2,(preferred[ELEMENTS.indexOf(elem)]||0)/Math.max(1,max)*1.2);
  if(elem==="lightning"&&max===preferred[1])n+=.7; // tries conduction after seeing frost
  if(motif==="fan"&&preferred[1]>3)n+=.6;          // tries area denial against swarm
  if(motif==="pincer"&&Math.max(...dodge)>1)n+=.55;
  if(lead&&Math.max(...dodge)>1)n+=.8;
  if(feint&&m.learned>2)n+=.35;
  return clamp(n+(learnedPlan?.score||0)*.35,.2,8);
 }
 function invent(m){
  // Every experiment combines independent properties, not a scripted fixed move.
  // Samples explore unfamiliar alternatives while exploiting observed success.
  let best=null,score=-Infinity;
  for(let i=0;i<8;i++){
   const element=ELEMENTS[Math.floor(rand(m)*ELEMENTS.length)];
   const motif=MOTIFS[Math.floor(rand(m)*MOTIFS.length)];
   const lead=rand(m)<.45,feint=rand(m)<(.12+Math.min(.25,m.learned/80));
   const observedDodge=m.seen.dodges[0]+m.seen.dodges[1]+
    m.prior.dodges[0]+m.prior.dodges[1];
   const suspicious=m.seen.feints+m.prior.feints*.7;
   const roll=rand(m);
   const tactic=observedDodge>.8?
      (roll<.17?"probe":roll<.39?"herd":
       roll<(suspicious>.8?.59:.76)?"bait":"fork"):
      (m.attacks>=1&&roll<.28?"fork":
       m.attacks>=1&&roll<.59?"herd":"probe");
   const candidate={element,motif,lead,feint,tactic,
     count:motif==="lance"?3:motif==="fan"?5:motif==="pincer"?4:6,
     spread:motif==="lance"?.11:motif==="fan"?.50:motif==="pincer"?.65:.84,
     speed:motif==="spiral"?5.9:motif==="lance"?8.0:6.6,
     name:(feint?"False ":"")+
       (motif==="pincer"?"Mirror":motif==="fan"?"Crown":motif==="lance"?"Needle":"Helix")+" of "+
       ({arcane:"Ink",frost:"Glass",fire:"Cinders",lightning:"Static"}[element])};
   const remembered=m.prior.plans.find(p=>p.element===element&&p.motif===motif&&
      (p.tactic||"probe")===tactic);
   const scoreNow=weight(m,element,motif,lead,feint)+
      (remembered?.score||0)*.36+rand(m)*1.8+
      (tactic==="herd"&&m.attacks>=1?.3:0)+
      (tactic==="fork"&&suspicious>.8?.55:0);
   if(scoreNow>score){best=candidate;score=scoreNow;}
  }
  return best;
 }

 // Always spend one regular casting budget. A tactical attack divides it
 // between a baiting opening and a delayed response to observed movement.
 function dodgePreference(m){
  const neg=m.seen.dodges[0]+m.prior.dodges[0]*.7;
  const pos=m.seen.dodges[1]+m.prior.dodges[1]*.7;
  return neg===pos?(m.attacks%2===0?1:-1):pos>neg?1:-1;
 }
 function openingPlan(m,plan,time,player){
  const target={...(plan.tellTarget||player)};
  if(!["herd","bait","fork"].includes(plan.tactic))
   return {...plan,stage:"single",target};
  const count=Math.max(1,Math.ceil(plan.count/2));
  const side=dodgePreference(m);
  m.pending={plan:{...plan},due:time+750,from:{x:player.x,y:player.y},
   side,remaining:plan.count-count,lastMoveSide:0,reversals:0,waited:false};
  return {...plan,stage:"opening",count,target,
   angleBias:-side*(plan.tactic==="bait"?.28:.17)};
 }

 // He sees which direction the player actually moves AFTER his first volley.
 // A reversal is evidence of possible deliberate deception, not mind-reading.
 function trackEscape(m,ob){
  const p=m.pending,last=m.lastPlayer;
  if(!p||!last)return;
  const theta=Math.atan2(p.from.y-ob.pos.y,p.from.x-ob.pos.x);
  const sideways={x:-Math.sin(theta),y:Math.cos(theta)};
  const lateralSpeed=(last.vx||0)*sideways.x+(last.vy||0)*sideways.y;
  if(Math.abs(lateralSpeed)<90)return;
  const side=Math.sign(lateralSpeed);
  if(p.lastMoveSide&&side!==p.lastMoveSide){
   p.reversals++;
   if(p.reversals===1)m.seen.feints=clamp(m.seen.feints+1,0,80);
   // Pay time for suspicion. The marker remains visible, giving the player
   // a chance to reverse yet again.
   if(!p.waited&&p.due-ob.time<340&&p.due-ob.time>=-125){
    p.waited=true;p.due=Math.max(p.due,ob.time+240);
   }
  }
  p.lastMoveSide=side;
 }
 function registerAttempt(m,plan){
  const tactic=TACTICS.includes(plan.tactic)?plan.tactic:"probe";
  let item=m.attempts.find(x=>x.motif===plan.motif&&x.element===plan.element&&x.tactic===tactic);
  if(!item){item={motif:plan.motif,element:plan.element,tactic,tries:0,hits:0};m.attempts.push(item);}
  item.tries++;
 }
 function followupPlan(m,ob){
  const pending=m.pending;
  if(!pending||ob.time<pending.due)return null;
  m.pending=null;
  const last=m.lastPlayer||{x:ob.player.x,y:ob.player.y,vx:0,vy:0};
  const base=pending.from;
  const theta=Math.atan2(base.y-ob.pos.y,base.x-ob.pos.x);
  const sideAxis={x:-Math.sin(theta),y:Math.cos(theta)};
  const moved=(last.x-base.x)*sideAxis.x+(last.y-base.y)*sideAxis.y;
  // Visible post-volley movement can overturn remembered habits.
  // If the player stays still, the boss acts on a fallible theory.
  const side=Math.abs(moved)>18?Math.sign(moved):pending.side;
  const shift=clamp(Math.abs(moved)>.0?Math.abs(moved)*.40:46,34,75);
  const target={
   x:clamp(last.x+sideAxis.x*side*shift+
     clamp(last.vx||0,-230,230)*.09,WORLD.left+75,WORLD.right-75),
   y:clamp(last.y+sideAxis.y*side*shift+
     clamp(last.vy||0,-230,230)*.09,WORLD.top+75,WORLD.bottom-75)
  };
  const plan={...pending.plan,stage:"followup",count:pending.remaining,target,
   spread:Math.min(.26,pending.plan.spread*.70),angleBias:0,
   contested:pending.reversals>0};
  m.state="countermove";m.quote="Let's see where you land.";
  return plan;
 }
 function decide(m,ob){
  const {time,pos,player,health=1}=ob;
  // Casting completion is checked exactly when ready, even between slower thinking ticks.
  if(time<m.nextThink&&!(m.held&&time>=m.until))return null;
  m.nextThink=time+125;
  observe(m,ob);
  const dx=player.x-pos.x,dy=player.y-pos.y,d=Math.max(1,Math.hypot(dx,dy));
  const normal={x:dx/d,y:dy/d};
  const sidestep=m.attacks%2===0?1:-1;
  let approach=d>280?1:d<185?-1:0;
  const speed=health<.22?2.25:2.6;
  m.intent={x:normal.x*approach-normal.y*.65*sidestep,
    y:normal.y*approach+normal.x*.65*sidestep,speed};
  const hazard=m.pressure||{x:0,y:0,count:0};
  const hz=Math.hypot(hazard.x,hazard.y);
  // Actual visible clusters can interrupt an experiment. Never read rune
  // overlays, invisible agent positions or future player controls.
  const danger=hazard.count>=2&&hz>.45;
  // A separate fast physical reflex runs at the same modest thought cadence.
  // Learning improves recognition latency, never speed, damage or hitboxes.
  const threats=visibleBolts(ob);
  if(!threats.length)m.boltSeen=null;
  if(threats.length){
   m.boltThreats++;
   const first=threats[0],same=m.boltSeen?.body===first.body;
   const familiarity=clamp((m.prior?.element?.[0]||0)*3+m.seen.element[0]*2,0,105);
   if(!same){
    m.boltSeen={body:first.body,at:time,delay:clamp(100-familiarity*.4+rand(m)*110,65,215)};
   }
   const recognized=time-m.boltSeen.at>=m.boltSeen.delay;
   if(recognized&&time>=m.dodgeCooldown){
    const choice=chooseDodge(m,ob,threats,speed);
    if(choice&&choice.risk<400&&first.ticks>2){
     m.dodgeDirection=choice.dir;m.dodgeLaunch=true;
     m.dodgeUntil=time+clamp(first.ticks*16.67+125,260,720);
     m.dodgeCooldown=m.dodgeUntil+clamp(180+rand(m)*170,180,350);
     m.boltDodges++;
     // A real threat can interrupt an experiment. That costs him the cast.
     if(m.held){m.held=null;m.attackAt=Math.max(m.attackAt,time+450);}
     m.pending=null; // A genuine emergency forfeits an unfinished trap.
    }
   }
  }
  if(time<m.dodgeUntil&&m.dodgeDirection){
   const dir=m.dodgeDirection;
   m.intent={x:dir.x,y:dir.y,speed}; // original movement speed, unchanged
   m.state="evade-bolt";
   const launch=m.dodgeLaunch;
   m.dodgeLaunch=false;
   return {move:m.intent,launch,threat:threats[0]||null};
  }
  if(danger){
   const bx=hazard.x/hz,by=hazard.y/hz;
   m.intent={x:bx-normal.y*.24*sidestep,
     y:by+normal.x*.24*sidestep,speed:3.8};
   if(m.held&&hz>2.2){
    m.held=null;m.pending=null;m.attackAt=time+680;
    m.state="evade";return {move:m.intent};
   }
  }
  if(m.pending)trackEscape(m,ob);
  if(m.pending&&time>=m.pending.due){
   const reply=followupPlan(m,ob);
   if(reply)return {move:m.intent,release:reply};
  }
  if(m.pending){
   m.state=m.pending.waited?"question-bait":"read-escape";
   return {move:m.intent,counterTell:{target:{...m.pending.from},side:m.pending.side}};
  }
  if(m.held){
   m.state=m.held.feint?"mislead":"inscribe";
   if(time>=m.until){
    const ready=m.held;m.held=null;m.lastPlan=ready;m.attacks++;
    registerAttempt(m,ready);
    const release=openingPlan(m,ready,time,player);
    m.attackAt=time+clamp(3300-m.learned*15,2250,3400);
    m.state="experiment";
    m.quote="Experiment "+m.attacks+": "+ready.name+".";
    return {move:m.intent,release};
   }
   return {move:{x:0,y:0,speed:0},tell:m.held};
  }
  if(d<680&&time>=m.attackAt){
   const plan=invent(m);
   plan.tellTarget={x:player.x,y:player.y}; // Physical observation at windup, never future input.
   // 75% shorter charge: normal 670ms → 168ms; deceptive 1080ms → 270ms.
   m.held=plan;m.until=time+(plan.feint?270:168);
   m.state=plan.feint?"mislead":"inscribe";
   m.quote=plan.feint?"Observe the obvious answer.":"An unfamiliar arrangement...";
   return {move:{x:0,y:0,speed:0},tell:plan};
  }
  m.state=danger?"evade-swarm":d>450?"study":"observe";
  return {move:m.intent};
 }
 function onDamage(m,damage,time){
  if(!m)return;
  // Incoming damage informs defensive caution, not omniscient counter tags.
  m.lastHp=time;m.learned+=Math.min(3,damage/25);
 }
 function onHit(m,projectile){
  if(!m||!projectile)return;
  m.successes++;
  const tactic=TACTICS.includes(projectile.tactic)?projectile.tactic:
   (m.lastPlan?.motif===projectile.motif&&m.lastPlan?.element===projectile.element?
    (m.lastPlan.tactic||"probe"):"probe");
  const p=m.experiments.find(e=>e.motif===projectile.motif&&e.element===projectile.element&&e.tactic===tactic);
  if(p)p.hits++;else m.experiments.push({motif:projectile.motif,element:projectile.element,tactic,hits:1});
  const attempt=m.attempts.find(a=>a.motif===projectile.motif&&a.element===projectile.element&&a.tactic===tactic);
  if(attempt)attempt.hits++;
 }
 function remember(m,result){
  if(!m||m.leaveSaved)return false;
  const p=m.prior;
  // Partial fading memory, only selected observations survive this vessel.
  p.element=p.element.map((v,i)=>clamp(v*.72+m.seen.element[i]*.30,0,80));
  p.dodges=p.dodges.map((v,i)=>clamp(v*.70+m.seen.dodges[i]*.32,0,80));
  p.feints=clamp((p.feints||0)*.75+m.seen.feints*.8,0,80);
  for(const e of m.experiments){
   let item=p.plans.find(x=>x.motif===e.motif&&x.element===e.element&&(x.tactic||"probe")===e.tactic);
   if(!item){item={motif:e.motif,element:e.element,tactic:e.tactic,lead:false,feint:false,score:0};p.plans.push(item);}
   item.score=clamp(item.score+.4*e.hits,-5,10);
  }
  if(m.lastPlan&&!m.experiments.some(e=>e.motif===m.lastPlan.motif&&e.element===m.lastPlan.element&&e.tactic===(m.lastPlan.tactic||"probe"))){
   let item=p.plans.find(x=>x.motif===m.lastPlan.motif&&x.element===m.lastPlan.element&&(x.tactic||"probe")===(m.lastPlan.tactic||"probe"));
   if(!item){item={motif:m.lastPlan.motif,element:m.lastPlan.element,tactic:m.lastPlan.tactic||"probe",lead:!!m.lastPlan.lead,feint:!!m.lastPlan.feint,score:0};p.plans.push(item)}
   item.score=clamp(item.score-.25,-5,10);
  }
  for(const attempt of m.attempts){
   const item=p.plans.find(x=>x.motif===attempt.motif&&x.element===attempt.element&&
      (x.tactic||"probe")===attempt.tactic);
   if(item)item.score=clamp(item.score-Math.max(0,attempt.tries-attempt.hits)*.19,-5,10);
  }
  p.plans=p.plans.sort((a,b)=>b.score-a.score).slice(0,6);
  p.encounters=clamp(p.encounters+1,0,999);
  if(result==="defeat")p.defeats=clamp(p.defeats+1,0,999);
  if(result==="win")p.wins=clamp(p.wins+1,0,999);
  p.lastLine=result==="defeat"?"Defeat was informative.":result==="win"?"You returned differently.":"The experiment is unfinished.";
  m.leaveSaved=true;
  return write(m.storage,p);
 }
 function planDirections(m,plan,origin,player){
  const latest=m.lastPlayer||{vx:0,vy:0};
  const lead=plan.stage==="opening"||plan.stage==="followup"?0:
   plan.lead?clamp(Math.hypot(latest.vx,latest.vy)*.34,0,90):0;
  const theta=Math.atan2(player.y-origin.y+Math.sign(latest.vy)*lead,player.x-origin.x+Math.sign(latest.vx)*lead)+(plan.angleBias||0);
  const angles=[];
  for(let i=0;i<plan.count;i++){
   if(plan.tactic==="fork"&&plan.stage==="opening"){
    // Two visible side corridors, leaving a center lane to outplay him.
    const side=i<plan.count/2?-1:1;
    angles.push(theta+side*(.24+.08*Math.floor(i/2)));
   }else if(plan.motif==="lance")angles.push(theta+(i-1)*plan.spread*.55);
   else if(plan.motif==="fan")angles.push(theta+(i-2)*plan.spread);
   else if(plan.motif==="pincer")angles.push(theta+((i%2===0?-1:1)*(.20+Math.floor(i/2)*plan.spread)));
   else angles.push(theta+(i-2.5)*plan.spread+.23*(m.attacks%3));
  }
  return angles;
 }
 return Object.freeze({ADDRESS,NAME,KEY,ELEMENTS,MOTIFS,TACTICS,read,make,observe,invent,decide,onDamage,onHit,remember,planDirections,predictBolt,visibleBolts,chooseDodge,openingPlan,followupPlan,trackEscape});
});
