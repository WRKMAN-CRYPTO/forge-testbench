/* WANDRUNE 059 | The Archivist
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
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const fresh=()=>({version:1,encounters:0,defeats:0,wins:0,element:[0,0,0,0],dodges:[0,0],plans:[],lastLine:""});
 function validate(raw){
  const m=fresh();if(!raw||raw.version!==1)return m;
  for(const k of ["encounters","defeats","wins"])m[k]=clamp(Math.floor(Number(raw[k])||0),0,999);
  for(const k of ["element","dodges"]){
   if(Array.isArray(raw[k]))m[k]=m[k].map((_,i)=>clamp(Number(raw[k][i])||0,0,80));
  }
  if(Array.isArray(raw.plans))m.plans=raw.plans.slice(0,6).filter(x=>
   x&&MOTIFS.includes(x.motif)&&ELEMENTS.includes(x.element)&&
   Number.isFinite(x.score)).map(x=>({motif:x.motif,element:x.element,
     lead:!!x.lead,feint:!!x.feint,score:clamp(x.score,-5,10)}));
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
   state:"observe",intent:{x:0,y:0,speed:0},held:null,lastPlayer:null,seen:{element:[0,0,0,0],dodges:[0,0]},
   learned:0,observedAt:time,pressure:{x:0,y:0,count:0},attacks:0,successes:0,experiments:[],lastPlan:null,
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
 function weight(m,elem,motif,lead,feint){
  const preferred=m.seen.element.map((x,i)=>x+m.prior.element[i]);
  const max=Math.max(...preferred);
  const dodge=m.seen.dodges.map((x,i)=>x+m.prior.dodges[i]);
  const learnedPlan=m.prior.plans.find(p=>p.element===elem&&p.motif===motif);
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
   const candidate={element,motif,lead,feint,
     count:motif==="lance"?3:motif==="fan"?5:motif==="pincer"?4:6,
     spread:motif==="lance"?.11:motif==="fan"?.50:motif==="pincer"?.65:.84,
     speed:motif==="spiral"?5.9:motif==="lance"?8.0:6.6,
     name:(feint?"False ":"")+
       (motif==="pincer"?"Mirror":motif==="fan"?"Crown":motif==="lance"?"Needle":"Helix")+" of "+
       ({arcane:"Ink",frost:"Glass",fire:"Cinders",lightning:"Static"}[element])};
   const scoreNow=weight(m,element,motif,lead,feint)+rand(m)*1.8;
   if(scoreNow>score){best=candidate;score=scoreNow;}
  }
  return best;
 }
 function decide(m,ob){
  const {time,pos,player,health=1}=ob;
  if(time<m.nextThink)return null;
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
  if(danger){
   const bx=hazard.x/hz,by=hazard.y/hz;
   m.intent={x:bx-normal.y*.24*sidestep,
     y:by+normal.x*.24*sidestep,speed:3.8};
   if(m.held&&hz>2.2){
    m.held=null;m.attackAt=time+680;
    m.state="evade";return {move:m.intent};
   }
  }
  if(m.held){
   m.state=m.held.feint?"mislead":"inscribe";
   if(time>=m.until){
    const ready=m.held;m.held=null;m.lastPlan=ready;m.attacks++;
    m.attackAt=time+clamp(3300-m.learned*15,2250,3400);
    m.state="experiment";
    m.quote="Experiment "+m.attacks+": "+ready.name+".";
    return {move:m.intent,release:ready};
   }
   return {move:{x:0,y:0,speed:0},tell:m.held};
  }
  if(d<680&&time>=m.attackAt){
   const plan=invent(m);
   plan.tellTarget={x:player.x,y:player.y}; // Physical observation at windup, never future input.
   m.held=plan;m.until=time+(plan.feint?1080:670);
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
  const p=m.experiments.find(e=>e.motif===projectile.motif&&e.element===projectile.element);
  if(p)p.hits++;else m.experiments.push({motif:projectile.motif,element:projectile.element,hits:1});
 }
 function remember(m,result){
  if(!m||m.leaveSaved)return false;
  const p=m.prior;
  // Partial fading memory, only selected observations survive this vessel.
  p.element=p.element.map((v,i)=>clamp(v*.72+m.seen.element[i]*.30,0,80));
  p.dodges=p.dodges.map((v,i)=>clamp(v*.70+m.seen.dodges[i]*.32,0,80));
  for(const e of m.experiments){
   let item=p.plans.find(x=>x.motif===e.motif&&x.element===e.element);
   if(!item){item={motif:e.motif,element:e.element,lead:false,feint:false,score:0};p.plans.push(item);}
   item.score=clamp(item.score+.4*e.hits,-5,10);
  }
  if(m.lastPlan&&!m.experiments.some(e=>e.motif===m.lastPlan.motif&&e.element===m.lastPlan.element)){
   let item=p.plans.find(x=>x.motif===m.lastPlan.motif&&x.element===m.lastPlan.element);
   if(!item){item={motif:m.lastPlan.motif,element:m.lastPlan.element,lead:!!m.lastPlan.lead,feint:!!m.lastPlan.feint,score:0};p.plans.push(item)}
   item.score=clamp(item.score-.25,-5,10);
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
  const lead=plan.lead?clamp(Math.hypot(latest.vx,latest.vy)*.34,0,90):0;
  const theta=Math.atan2(player.y-origin.y+Math.sign(latest.vy)*lead,player.x-origin.x+Math.sign(latest.vx)*lead);
  const angles=[];
  for(let i=0;i<plan.count;i++){
   if(plan.motif==="lance")angles.push(theta+(i-1)*plan.spread*.55);
   else if(plan.motif==="fan")angles.push(theta+(i-2)*plan.spread);
   else if(plan.motif==="pincer")angles.push(theta+((i%2===0?-1:1)*(.20+Math.floor(i/2)*plan.spread)));
   else angles.push(theta+(i-2.5)*plan.spread+.23*(m.attacks%3));
  }
  return angles;
 }
 return Object.freeze({ADDRESS,NAME,KEY,ELEMENTS,MOTIFS,read,make,observe,invent,decide,onDamage,onHit,remember,planDirections});
});
