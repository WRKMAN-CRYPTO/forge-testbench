/* WRKMAN Arcane Lab 044 / moving fade with unchanged Agent Field physics
 * Exactly the same 32x32 field physics as Agent Field. Casting transforms
 * coordinates into world space; it never steers individual agent velocities.
 * Game damage, durations, rendering budgets, and linked events are separate.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_CRAFTED_MAGIC=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const Motion=typeof globalThis==='object'?globalThis.WRKMAN_FIELD_PHYSICS:null;
 if(!Motion)throw Error('Canonical field physics 037 is missing');
 const Impacts=typeof globalThis==='object'?globalThis.WRKMAN_FIELD_IMPACTS:null;
 if(!Impacts)throw Error('Field collision kernel 039 is missing');
 const N=32,MASK=-1,TAU=Math.PI*2,SAVE_KEY='wrkman-arcane-lab034-crafted-field-v1',SOURCE_KEY='wrkman-agent-field-v1';
 const palettes={arcane:[[92,139,244],[176,121,250],[223,193,255]],flame:[[208,65,39],[253,126,49],[255,213,105]],healing:[[66,184,144],[144,231,119],[240,235,149]],void:[[100,67,157],[179,72,199],[255,134,202]]};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
 const DEFAULT_DRAW=1200,MAX_DRAW=6000,AGENT_MAX_AGE_MS=5500,FADE_MS=800,MAX_FADE_PARTICLES=6000;
 function starter(){
  const values=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const r=Math.hypot(x-15.5,y-15.5);
   values.push(r>8.3&&r<10.7?255:r>=10.7&&r<13.4?Math.round(clamp(245-(r-10.7)*74,35,245)):r>=13.4&&r<14.8?0:MASK);
  }
  return {format:'WRKMAN_AGENT_FIELD_V1',width:N,height:N,mask:'#FF00FF',name:'FIRE RING',values,settings:{mode:'ab',palette:'flame',texture:'flat',population:1200,delivery:'aura',swirl:26,momentum:62,light:62,renderLimit:1200,lifespan:5.5}};
 }
 function normalize(raw){
  if(!raw||raw.width!==N||raw.height!==N||!Array.isArray(raw.values)||raw.values.length!==1024)throw Error('Expected 32x32 Agent Field JSON');
  const values=raw.values.map((v,i)=>{if(!Number.isInteger(v)||(v!==MASK&&(v<0||v>255)))throw Error('Invalid cell '+i);return v});
  const s=raw.settings||{},n=(k,d)=>Number.isFinite(s[k])?clamp(s[k],0,100):d;
  // Prior 036 "projectile" fields become world emission. No old scripts
  // preserve the moving-carrier behavior by accident.
  const delivery=s.delivery==='projectile'?'world':['aura','world','placed'].includes(s.delivery)?s.delivery:'aura';
  return {format:'WRKMAN_AGENT_FIELD_V1',width:N,height:N,mask:'#FF00FF',name:String(raw.name||'CRAFTED FIELD').slice(0,48),values,
   settings:{mode:s.mode==='a'?'a':'ab',palette:palettes[s.palette]?s.palette:'flame',texture:s.texture==='leaf'?'leaf':'flat',
    population:Number.isFinite(s.population)?Math.round(clamp(s.population,200,6000)):1200,
    delivery,swirl:n('swirl',26),momentum:n('momentum',62),light:n('light',62),
    lifespan:Number.isFinite(s.lifespan)?Math.round(clamp(s.lifespan,.5,30)*2)/2:5.5,
    renderLimit:Number.isFinite(s.renderLimit)?Math.round(clamp(s.renderLimit,200,MAX_DRAW)):DEFAULT_DRAW}};
 }
 function read(storage){try{const v=storage?.getItem(SAVE_KEY);return v?normalize(JSON.parse(v)):normalize(starter())}catch(_){return normalize(starter())}}
 function fromForge(storage){const x=storage?.getItem(SOURCE_KEY);if(!x)throw Error('No saved field. Save one in Agent Field or import JSON.');return normalize(JSON.parse(x))}
 function save(storage,cfg){const v=normalize(cfg);storage?.setItem(SAVE_KEY,JSON.stringify(v));return v}
 function sample(vals,x,y){const v=Motion.sample(vals,x,y);return v.valid?v.value:null}
 function makeAgent(st,home=0){return Motion.spawn(st.recipe.values,st.starts,Math.random,home)}
 function spawnCenter(st){
  // Spawn coordinates are centered on the casting hand rather than a
  // hardcoded 32x32 midpoint. Patterns with top-row starting cells launch
  // from the caster and travel where their instructions naturally lead.
  if(!st.starts.length)return {x:.5,y:.5};
  let x=0,y=0;for(const i of st.starts){x+=(i%N+.5)/N;y+=(Math.floor(i/N)+.5)/N}
  return {x:x/st.starts.length,y:y/st.starts.length};
 }
 function worldPosition(st,a,x=a.x,y=a.y,center=st.center){
  if(st.delivery==='world'){
   const dx=(x-st.spawnX)*st.worldW,dy=(y-st.spawnY)*st.worldH;
   return {x:center.x+dx*st.right.x+dy*st.forward.x,
           y:center.y+dx*st.right.y+dy*st.forward.y};
  }
  return {x:center.x+(x-.5)*st.scale,y:center.y+(y-.5)*st.scale};
 }
 // The shared Agent Field physics is unchanged. Lifespan is a game rule,
 // measured in scene time for EACH agent, independent of frame rate and of
 // the original Motion.stepAgent age counter (which caps simulation dt).
 // At death, transfer visible agent states to a separate VISUAL swarm.
 // It retains the same velocity and field instructions during its fade, but
 // cannot collide, heal or occupy live capacity. The cast closes immediately.
 function queueFades(scene,st,dead,now){
  if(!scene||!dead.length)return;
  const cfg=st.recipe.settings,camera=scene.cameras?.main?.worldView;
  const allowed=Math.min(dead.length,cfg.renderLimit||DEFAULT_DRAW);
  const stride=Math.max(1,Math.ceil(dead.length/Math.max(1,allowed)));
  const colors=palettes[cfg.palette],pieces=[];
  for(let i=0;i<dead.length;i+=stride){
   const a=dead[i],p=worldPosition(st,a);
   if(camera&&(p.x<camera.x-24||p.x>camera.right+24||p.y<camera.y-24||p.y>camera.bottom+24))continue;
   const t=cfg.mode==='ab'?clamp(a.progress||0,0,1):.44;
   const c=t<.5?colors[0].map((v,j)=>lerp(v,colors[1][j],t*2)):
    colors[1].map((v,j)=>lerp(v,colors[2][j],(t-.5)*2));
   const color=(Math.round(c[0])<<16)|(Math.round(c[1])<<8)|Math.round(c[2]);
   const radius=cfg.mode==='ab'?1.2+3.1*clamp(a.progress||0,0,1):2.8;
   const vx=st.delivery==='world'?
    a.vx*st.right.x*st.worldW+a.vy*st.forward.x*st.worldH:a.vx;
   const vy=st.delivery==='world'?
    a.vx*st.right.y*st.worldW+a.vy*st.forward.y*st.worldH:a.vy;
   pieces.push({agent:a,x:p.x,y:p.y,r:Math.max(.9,radius),color,angle:Math.atan2(vy,vx),
    texture:cfg.texture,opacity:(.18+(.14+cfg.light/100*.84)*.63)});
  }
  if(!pieces.length)return;
  scene.craftedFades=scene.craftedFades||[];
  // Only geometry and recipe references are kept, not the parent cast, its
  // damage tracking, or the (possibly large) now-empty agent collection.
  const transform={
   delivery:st.delivery,center:{...st.center},right:{...st.right},
   forward:{...st.forward},scale:st.scale,worldW:st.worldW,worldH:st.worldH,
   spawnX:st.spawnX,spawnY:st.spawnY
  };
  scene.craftedFades.push({at:now,pieces,transform,field:st.recipe.values,
   settings:{...cfg},motionTime:st.motionTime});
  // Bound temporary rendering memory even if many spells die at once.
  let total=scene.craftedFades.reduce((n,b)=>n+b.pieces.length,0);
  while(total>MAX_FADE_PARTICLES&&scene.craftedFades.length){
   const first=scene.craftedFades[0],extra=total-MAX_FADE_PARTICLES;
   if(first.pieces.length<=extra){total-=first.pieces.length;scene.craftedFades.shift()}
   else{first.pieces.splice(0,extra);total-=extra}
  }
 }
 function expireAgents(st,now,scene=null){
  const agents=st.agents,dead=[];let alive=0;
  const ttl=st.recipe.settings.lifespan*1000;
  for(let i=0;i<agents.length;i++){
   const a=agents[i];
   if(now-(a.bornAt??st.born)<ttl)agents[alive++]=a;
   else if(scene)dead.push(a);
  }
  const removed=agents.length-alive;
  agents.length=alive;
  st.agedOut=(st.agedOut||0)+removed;
  queueFades(scene,st,dead,now);
  return removed;
 }
 function start(scene,recipe,healLinked=true,target=null){
  const cfg=normalize(recipe),starts=Motion.startingCells(cfg.values);
  const existing=(scene.craftedShots||[]).reduce((n,cast)=>n+cast.agents.length,0)+
   (scene.craftedAura?.agents.length||0);
  if(existing+cfg.settings.population>6000)return false;
  if(cfg.settings.delivery==='world'){
   if((scene.craftedShots||[]).length>=3)return false;
  }else if(scene.craftedAura)return false;
  const now=scene.time.now,delivery=cfg.settings.delivery,p=scene.player,aim=scene.aim||{x:1,y:0};
  const wanted=target&&Number.isFinite(target.x)&&Number.isFinite(target.y)?target:{x:p.x+aim.x*420,y:p.y+aim.y*420};
  const dx=wanted.x-p.x,dy=wanted.y-p.y,len=Math.hypot(dx,dy);
  const forward=len>12?{x:dx/len,y:dy/len}:{x:aim.x,y:aim.y};
  const right={x:-forward.y,y:forward.x};
  const center=delivery==='aura'?{x:p.x,y:p.y}:delivery==='placed'?
   {x:clamp(wanted.x,-780,1740),y:clamp(wanted.y,-500,1100)}:
   {x:p.x+forward.x*30,y:p.y+forward.y*30};
  const duration=cfg.settings.lifespan*1000;
  const st={recipe:cfg,starts,agents:[],born:now,expires:now+duration,nextHeal:now+3000,
   healLinked:!!healLinked,healFX:[],impactFX:[],pulses:0,collisions:0,consumed:0,agedOut:0,targetPrev:new Map(),
   delivery,center,forward,right,scale:delivery==='placed'?260:290,
   worldW:360,worldH:500,motionTime:0,free:0,offscreen:0,spawnX:.5,spawnY:.5,
   rendered:0,frames:0};
  const origin=spawnCenter(st);st.spawnX=origin.x;st.spawnY=origin.y;
  // Full requested population. There are no phantom agents replaced at
  // the draw budget. Every agent runs the original simulator each update.
  for(let i=0;i<cfg.settings.population;i++){
   const agent=makeAgent(st,i);
   agent.bornAt=now;
   st.agents.push(agent);
  }
  if(delivery==='world'){if(!scene.craftedShots)scene.craftedShots=[];scene.craftedShots.push(st)}
  else scene.craftedAura=st;
  return true;
 }
 function stop(scene,onlyAura=false){scene.craftedAura=null;if(!onlyAura){scene.craftedShots=[];scene.craftedFades=[]}}
 function stepOne(scene,st,time,delta,Combat){
  // Age out individual agents BEFORE advancing motion or checking hits.
  // Zero-agent casts expire immediately, freeing spell slots and the 6k cap.
  // Move an Aura's visual anchor to its latest location before freezing ghosts.
  if(st.delivery==='aura'){st.center.x=scene.player.x;st.center.y=scene.player.y}
  expireAgents(st,time,scene);
  if(st.agents.length===0){st.expired=true;return}
  const cfg=st.recipe.settings,dtSeconds=clamp(delta,0,50)/1000;
  st.motionTime+=dtSeconds;st.frames++;
  const previousCenter={...st.center};
  if(st.delivery==='aura'){st.center.x=scene.player.x;st.center.y=scene.player.y}
  for(const agent of st.agents){agent.prevX=agent.x;agent.prevY=agent.y}
  const stats=Motion.stepSwarm(st.agents,st.recipe.values,cfg,dtSeconds,st.worldW,st.worldH,st.motionTime);
  st.free=stats.free;st.offscreen=stats.offscreen;
  // Open-boundary agents are never recycled. Short-lived trails are only
  // presentation history; they never feed back into movement.
  if(st.frames%3===0)for(const a of st.agents){
   a.tail.push([a.x,a.y]);if(a.tail.length>5)a.tail.shift();
  }
  // One-way timed link. Even world-emitted agents cannot change where the
  // independent healing spell appears: it always anchors to the caster.
  if(st.healLinked&&time>=st.nextHeal){
   st.nextHeal=Math.max(st.nextHeal+3000,time+3000);
   if(Number.isFinite(scene.combat?.hp))scene.combat.hp=Math.min(100,scene.combat.hp+5);
   st.healFX.push({x:scene.player.x,y:scene.player.y,born:time});st.pulses++;
   scene.rings?.push({x:scene.player.x,y:scene.player.y,r:16,life:450,born:time,c:0x83e8b5});
   if(scene.rings&&scene.rings.length>36)scene.rings.shift();
  }
  st.healFX=st.healFX.filter(p=>time-p.born<600);
  Impacts.process(scene,st,time,Combat,previousCenter);
  if(st.agents.length===0)st.expired=true;
 }
 // Fading particles keep the *same* dynamics as they had at their last
 // live frame. We advance them every frame, but never pass them to Impacts.
 // Aura fades continue following the wizard, just as live Aura does.
 function stepFades(scene,time,delta){
  if(!scene.craftedFades?.length)return;
  const dt=clamp(delta,0,50)/1000,remaining=[];
  for(const batch of scene.craftedFades){
   if(time-batch.at>=FADE_MS)continue;
   batch.motionTime+=dt;
   const anchor=batch.transform;
   if(anchor.delivery==='aura'&&scene.player){
    anchor.center.x=scene.player.x;anchor.center.y=scene.player.y;
   }
   for(const p of batch.pieces){
    Motion.stepAgent(p.agent,batch.field,batch.settings,dt,
     anchor.worldW,anchor.worldH,batch.motionTime);
    const pos=worldPosition(anchor,p.agent);
    p.x=pos.x;p.y=pos.y;
    const a=p.agent;
    const vx=anchor.delivery==='world'?
     a.vx*anchor.right.x*anchor.worldW+a.vy*anchor.forward.x*anchor.worldH:a.vx;
    const vy=anchor.delivery==='world'?
     a.vx*anchor.right.y*anchor.worldW+a.vy*anchor.forward.y*anchor.worldH:a.vy;
    p.angle=Math.atan2(vy,vx);
   }
   remaining.push(batch);
  }
  scene.craftedFades=remaining;
 }
 function step(scene,time,delta,Combat){
  if(scene.craftedAura){stepOne(scene,scene.craftedAura,time,delta,Combat);
   if(scene.craftedAura.expired)scene.craftedAura=null}
  if(scene.craftedShots?.length){
   for(const cast of scene.craftedShots)stepOne(scene,cast,time,delta,Combat);
   scene.craftedShots=scene.craftedShots.filter(cast=>!cast.expired);
  }
  // Process newly expired hexes immediately, avoiding a frozen transition
  // frame, and keep moving them until their 800ms visual fade ends.
  stepFades(scene,time,delta);
 }
 function hex(g,x,y,r){
  const pts=[];for(let i=0;i<6;i++){const th=i*TAU/6+Math.PI/6;pts.push({x:x+Math.cos(th)*r,y:y+Math.sin(th)*r})}
  g.fillPoints(pts,true);
 }
 function draw(scene,g,time){
  const active=[...(scene.craftedShots||[])];if(scene.craftedAura)active.push(scene.craftedAura);
  for(const st of active){
  const cfg=st.recipe.settings,colors=palettes[cfg.palette];
  const light=.14+cfg.light/100*.84,alpha=.18+light*.63;
  const n=st.agents.length,budget=Math.min(n,cfg.renderLimit||DEFAULT_DRAW);
  const stride=Math.max(1,Math.ceil(n/budget));
  const camera=scene.cameras?.main?.worldView;
  let visible=0;
  for(let i=0;i<n;i+=stride){
   const a=st.agents[i],pt=worldPosition(st,a),x=pt.x,y=pt.y;
   if(camera&&(x<camera.x-24||x>camera.right+24||y<camera.y-24||y>camera.bottom+24))continue;
   const t=cfg.mode==='ab'?clamp(a.progress,0,1):.44,c=t<.5?
    colors[0].map((v,j)=>lerp(v,colors[1][j],t*2)):
    colors[1].map((v,j)=>lerp(v,colors[2][j],(t-.5)*2));
   const col=(Math.round(c[0])<<16)|(Math.round(c[1])<<8)|Math.round(c[2]);
   const r=(cfg.mode==='ab'?1.2+3.1*clamp(a.progress,0,1):2.8)+Math.sin(st.motionTime*3.3+a.seed)*.28;
   if(a.tail?.length){
    const first=worldPosition(st,a,a.tail[0][0],a.tail[0][1]);
    g.lineStyle(Math.max(.55,r*.6),col,.075*light);
    for(let k=1;k<a.tail.length;k++){
     const next=worldPosition(st,a,a.tail[k][0],a.tail[k][1]);
     g.lineBetween(first.x,first.y,next.x,next.y);
     first.x=next.x;first.y=next.y;
    }
    g.lineBetween(first.x,first.y,x,y);
   }
   g.fillStyle(col,alpha);
   if(cfg.texture==='leaf'){
    // Leaf facing follows the real world-space trajectory after rotating
    // World Emission's local field frame toward the wizard's aim.
    const vx=st.delivery==='world'?
     a.vx*st.right.x*st.worldW+a.vy*st.forward.x*st.worldH:a.vx;
    const vy=st.delivery==='world'?
     a.vx*st.right.y*st.worldW+a.vy*st.forward.y*st.worldH:a.vy;
    const theta=Math.atan2(vy,vx);
    const nx=Math.cos(theta),ny=Math.sin(theta),px=-ny,py=nx;
    const tip={x:x+nx*r*1.65,y:y+ny*r*1.65},base={x:x-nx*r*1.45,y:y-ny*r*1.45};
    g.fillPoints([{x:base.x,y:base.y},{x:x+px*r*.7,y:y+py*r*.7},
      {x:tip.x,y:tip.y},{x:x-px*r*.7,y:y-py*r*.7}],true);
    if(r>2){g.lineStyle(.5,0x17452e,.35);g.lineBetween(base.x,base.y,tip.x,tip.y)}
   }else hex(g,x,y,Math.max(.9,r));
   visible++;
  }
  st.rendered=visible;
  for(const impact of st.impactFX){
   const t=clamp((time-impact.born)/300,0,1);
   g.lineStyle(1.8,impact.color,(1-t)*.78);
   g.strokeCircle(impact.x,impact.y,2+t*14);
  }
  for(const pulse of st.healFX){
   const q=clamp((time-pulse.born)/600,0,1);
   g.lineStyle(2.2,0x82e9b0,(1-q)*.8);g.strokeCircle(pulse.x,pulse.y,15+q*58);
   for(let i=0;i<12;i++){
    const a=i*TAU/12+time*.0014,r=9+q*45;
    g.fillStyle(i%2?0x8ce8b7:0xcfffe0,(1-q)*.9);
    hex(g,pulse.x+Math.cos(a)*r,pulse.y+Math.sin(a)*r,2.3*(1-q)+.4);
   }
  }
  }
  // Visual-only death trails. They draw even after the parent cast is removed
  // and its gameplay capacity is free; no Phaser bodies, timers or damage.
  for(const batch of scene.craftedFades||[]){
   const elapsed=Math.max(0,time-batch.at);
   const fade=Math.pow(clamp(1-elapsed/FADE_MS,0,1),1.35);
   if(fade<=0)continue;
   for(const p of batch.pieces){
    g.fillStyle(p.color,p.opacity*fade);
    if(p.texture==='leaf'){
     const nx=Math.cos(p.angle),ny=Math.sin(p.angle),px=-ny,py=nx,r=p.r;
     g.fillPoints([{x:p.x-nx*r*1.45,y:p.y-ny*r*1.45},
      {x:p.x+px*r*.7,y:p.y+py*r*.7},
      {x:p.x+nx*r*1.65,y:p.y+ny*r*1.65},
      {x:p.x-px*r*.7,y:p.y-py*r*.7}],true);
    }else hex(g,p.x,p.y,p.r);
   }
  }
 }
 const snapshot=scene=>{
  const active=[...(scene.craftedShots||[])];if(scene.craftedAura)active.push(scene.craftedAura);
  if(!active.length)return {active:false,fading:(scene.craftedFades||[]).reduce((n,b)=>n+b.pieces.length,0)};
  const s=scene.craftedAura||active[active.length-1];
  return {active:true,name:s.recipe.name,delivery:s.delivery,center:{...s.center},
   casts:active.length,agents:active.reduce((n,c)=>n+c.agents.length,0),
   rendered:active.reduce((n,c)=>n+c.rendered,0),
   renderBudget:active.reduce((n,c)=>n+c.recipe.settings.renderLimit,0),
   healLinked:active.some(c=>c.healLinked),pulses:active.reduce((n,c)=>n+c.pulses,0),
   collisions:active.reduce((n,c)=>n+c.collisions,0),consumed:active.reduce((n,c)=>n+c.consumed,0),agedOut:active.reduce((n,c)=>n+c.agedOut,0),free:active.reduce((n,c)=>n+c.free,0),
   offscreen:active.reduce((n,c)=>n+c.offscreen,0),physics:Motion.VERSION,
   fading:(scene.craftedFades||[]).reduce((n,b)=>n+b.pieces.length,0),
   lifespan:s.recipe.settings.lifespan,
   spawn:{x:s.spawnX,y:s.spawnY},direction:{...s.forward}
  };
 };
 return Object.freeze({SAVE_KEY,SOURCE_KEY,starter,normalize,read,fromForge,save,sample,
  spawnCenter,worldPosition,AGENT_MAX_AGE_MS,FADE_MS,expireAgents,stepFades,start,stop,step,draw,snapshot});
});
