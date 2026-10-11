/* WRKMAN Arcane Lab 034 / crafted field interpreter + linked events
   Pure module: no DOM/Phaser requirement at load time. */
(function(root,factory){
 const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_CRAFTED_MAGIC=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const N=32,MASK=-1,TAU=Math.PI*2,SAVE_KEY='wrkman-arcane-lab034-crafted-field-v1',SOURCE_KEY='wrkman-agent-field-v1';
 const palettes={arcane:[[92,139,244],[176,121,250],[223,193,255]],flame:[[208,65,39],[253,126,49],[255,213,105]],healing:[[66,184,144],[144,231,119],[240,235,149]],void:[[100,67,157],[179,72,199],[255,134,202]]};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
 function starter(){
  const values=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const r=Math.hypot(x-15.5,y-15.5);values.push(r>8.3&&r<10.7?255:r>=10.7&&r<13.4?Math.round(clamp(245-(r-10.7)*74,35,245)):r>=13.4&&r<14.8?0:MASK);
  }
  return {format:'WRKMAN_AGENT_FIELD_V1',width:N,height:N,mask:'#FF00FF',name:'FIRE RING',values,settings:{mode:'ab',palette:'flame',texture:'flat',population:1200,swirl:26,momentum:62,light:62}};
 }
 function normalize(raw){
  if(!raw||raw.width!==N||raw.height!==N||!Array.isArray(raw.values)||raw.values.length!==1024)throw Error('Expected 32x32 Agent Field JSON');
  const values=raw.values.map((v,i)=>{if(!Number.isInteger(v)||(v!==MASK&&(v<0||v>255)))throw Error('Invalid cell '+i);return v});
  const s=raw.settings||{},n=(k,d)=>Number.isFinite(s[k])?clamp(s[k],0,100):d;
  return {format:'WRKMAN_AGENT_FIELD_V1',width:N,height:N,mask:'#FF00FF',name:String(raw.name||'CRAFTED FIELD').slice(0,48),values,
   settings:{mode:s.mode==='a'?'a':'ab',palette:palettes[s.palette]?s.palette:'flame',texture:s.texture==='leaf'?'leaf':'flat',population:Number.isFinite(s.population)?Math.round(clamp(s.population,200,6000)):1200,swirl:n('swirl',26),momentum:n('momentum',62),light:n('light',62)}};
 }
 function read(storage){try{const v=storage?.getItem(SAVE_KEY);return v?normalize(JSON.parse(v)):normalize(starter())}catch(_){return normalize(starter())}}
 function fromForge(storage){const x=storage?.getItem(SOURCE_KEY);if(!x)throw Error('No saved field. Save one in Agent Field or import JSON.');return normalize(JSON.parse(x))}
 function save(storage,cfg){const v=normalize(cfg);storage?.setItem(SAVE_KEY,JSON.stringify(v));return v}
 function sample(vals,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=1||y>=1)return null;
  const u=x*N,v=y*N,i=Math.floor(u),j=Math.floor(v);
  if(vals[j*N+i]===MASK)return null;
  const fx=u-i,fy=v-j;let sum=0,weight=0;
  for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){
   const a=vals[Math.min(31,j+yy)*N+Math.min(31,i+xx)];
   if(a<0)continue;const w=(xx?fx:1-fx)*(yy?fy:1-fy);sum+=a*w;weight+=w;
  }
  return weight?sum/weight:vals[j*N+i];
 }
 function gradient(vals,x,y,c){
  const e=.72/N,a=sample(vals,x+e,y),b=sample(vals,x-e,y),d=sample(vals,x,y+e),f=sample(vals,x,y-e);
  let gx=0,gy=0;
  if(a!==null&&b!==null)gx=(a-b)*.5;else if(a!==null)gx=a-c;else if(b!==null)gx=c-b;
  if(d!==null&&f!==null)gy=(d-f)*.5;else if(d!==null)gy=d-c;else if(f!==null)gy=c-f;
  const mag=Math.hypot(gx,gy);return mag>.00001?[-gx/mag,-gy/mag,mag]:[0,0,0];
 }
 function makeAgent(st){
  const i=st.starts.length?st.starts[(Math.random()*st.starts.length)|0]:-1;
  const x=i<0?Math.random():(i%N+.1+Math.random()*.8)/N;
  const y=i<0?Math.random():(Math.floor(i/N)+.1+Math.random()*.8)/N;
  const th=Math.random()*TAU,v=.7+Math.random()*1.2;
  return {x,y,vx:Math.cos(th)*v,vy:Math.sin(th)*v,seed:Math.random()*TAU,progress:0};
 }
 function start(scene,recipe,healLinked=true){
  if(scene.craftedAura)return false;
  const cfg=normalize(recipe),starts=[],hi=Math.max(0,...cfg.values);
  for(let i=0;i<1024;i++)if(cfg.values[i]>=Math.max(0,hi-50))starts.push(i);
  const now=scene.time.now;
  const st={recipe:cfg,starts,agents:[],born:now,expires:now+14000,nextHeal:now+3000,healLinked:!!healLinked,lastHits:new Map(),healFX:[],pulses:0,collisions:0};
  const limit=Math.min(360,Math.max(130,Math.round(cfg.settings.population*.18)));
  for(let i=0;i<limit;i++)st.agents.push(makeAgent(st));
  scene.craftedAura=st;return true;
 }
 function stop(scene){scene.craftedAura=null}
 function step(scene,time,delta,Combat){
  const st=scene.craftedAura;if(!st)return;
  if(time>=st.expires){stop(scene);return}
  const cfg=st.recipe.settings,vals=st.recipe.values,dt=clamp(delta/16.667,0,2),swirl=cfg.swirl/100,momentum=cfg.momentum/100;
  for(let i=0;i<st.agents.length;i++){
   const a=st.agents[i],v=sample(vals,a.x,a.y);
   if(v===null){a.vx*=Math.pow(.997,dt);a.vy*=Math.pow(.997,dt)}
   else{
    const progress=clamp(1-v/255,0,1);a.progress=lerp(a.progress,progress,.15);
    const [gx,gy,mag]=gradient(vals,a.x,a.y,v),curl=swirl*(.26+progress*.45);
    let ax=gx*.28-gy*curl+Math.cos(a.seed+time*.0008)*(.012+.025*swirl);
    let ay=gy*.28+gx*curl+Math.sin(a.seed+time*.0008)*(.012+.025*swirl);
    if(mag<.001){const th=a.seed+time*.001*(1.1+.8*swirl);ax+=Math.cos(th)*(.012+.025*swirl);ay+=Math.sin(th)*(.012+.025*swirl)}
    a.vx=(a.vx+ax*dt)*Math.pow(.885+momentum*.095,dt);a.vy=(a.vy+ay*dt)*Math.pow(.885+momentum*.095,dt);
    const cap=(cfg.mode==='ab'?1.8+2.2*(1-progress):3.2)+momentum*1.8,s=Math.hypot(a.vx,a.vy);
    if(s>cap){a.vx*=cap/s;a.vy*=cap/s}
   }
   a.x+=a.vx*dt/320;a.y+=a.vy*dt/320;
   // A persistent aura renews source particles. It never wraps or bounces.
   if((a.x<-.18||a.y<-.18||a.x>1.18||a.y>1.18)&&Math.random()<.012*dt)st.agents[i]=makeAgent(st);
  }
  // One-way linked event. No recursive spell-trigger chain is possible.
  if(st.healLinked&&time>=st.nextHeal){
   st.nextHeal=Math.max(st.nextHeal+3000,time+3000);
   if(Number.isFinite(scene.combat?.hp))scene.combat.hp=Math.min(100,scene.combat.hp+5);
   st.healFX.push({x:scene.player.x,y:scene.player.y,born:time});st.pulses++;
   scene.rings?.push({x:scene.player.x,y:scene.player.y,r:16,life:450,born:time,c:0x83e8b5});
   if(scene.rings&&scene.rings.length>36)scene.rings.shift();
  }
  st.healFX=st.healFX.filter(p=>time-p.born<600);
  if(Combat?.hitEnemy&&scene.combat?.enemies){
   const p=scene.player;
   for(const e of scene.combat.enemies){
    if(!e.alive||time<(st.lastHits.get(e.id)||0)+480)continue;
    const pos=e.body?.position;if(!pos||Math.hypot(pos.x-p.x,pos.y-p.y)>225)continue;
    for(const a of st.agents){
     const x=p.x+(a.x-.5)*290,y=p.y+(a.y-.5)*290;
     if(Math.hypot(x-pos.x,y-pos.y)<(e.r||18)+3){
      Combat.hitEnemy(scene,e,5,'crafted-field');st.lastHits.set(e.id,time);st.collisions++;break;
     }
    }
   }
  }
 }
 function hex(g,x,y,r){const pts=[];for(let i=0;i<6;i++){const th=i*TAU/6+Math.PI/6;pts.push({x:x+Math.cos(th)*r,y:y+Math.sin(th)*r})}g.fillPoints(pts,true)}
 function draw(scene,g,time){
  const st=scene.craftedAura;if(!st)return;
  const p=scene.player,cfg=st.recipe.settings,colors=palettes[cfg.palette],alpha=.29+cfg.light/100*.46;
  for(const a of st.agents){
   const x=p.x+(a.x-.5)*290,y=p.y+(a.y-.5)*290,t=cfg.mode==='ab'?a.progress:.44;
   const c=t<.5?colors[0].map((v,j)=>lerp(v,colors[1][j],t*2)):colors[1].map((v,j)=>lerp(v,colors[2][j],(t-.5)*2));
   const col=(Math.round(c[0])<<16)|(Math.round(c[1])<<8)|Math.round(c[2]);
   const r=Math.max(.8,(cfg.mode==='ab'?1.2+2*a.progress:2.5)+.25*Math.sin(time*.004+a.seed));
   g.fillStyle(col,alpha);hex(g,x,y,r);
   if(cfg.texture==='leaf'&&r>2){g.lineStyle(.55,0x17452e,.47);g.lineBetween(x,y-r*.5,x,y+r*.5)}
  }
  for(const pulse of st.healFX){
   const q=clamp((time-pulse.born)/600,0,1);
   g.lineStyle(2.2,0x82e9b0,(1-q)*.8);g.strokeCircle(pulse.x,pulse.y,15+q*58);
   for(let i=0;i<12;i++){const a=i*TAU/12+time*.0014,r=9+q*45;
    g.fillStyle(i%2?0x8ce8b7:0xcfffe0,(1-q)*.9);hex(g,pulse.x+Math.cos(a)*r,pulse.y+Math.sin(a)*r,2.3*(1-q)+.4)}
  }
 }
 const snapshot=scene=>{const s=scene.craftedAura;return s?{active:true,name:s.recipe.name,agents:s.agents.length,healLinked:s.healLinked,pulses:s.pulses,collisions:s.collisions}:{active:false}};
 return Object.freeze({SAVE_KEY,SOURCE_KEY,starter,normalize,read,fromForge,save,sample,start,stop,step,draw,snapshot});
});
