/* WANDRUNE 079 / eleven composable runes
 * Third 32x32 instruction layer, independent of grayscale and birth elements.
 * Conserves represented agent mass through merge and fracture.
 * Agents retain rune memory: learned behavior stays after leaving its pixel.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_SWARM_RUNES=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const N=32,TOTAL=1024;
 const TYPES=Object.freeze([
  Object.freeze({id:0,key:'none',name:'NONE',color:'#000000',symbol:''}),
  Object.freeze({id:1,key:'behemoth',name:'BEHEMOTH',color:'#e7b9ff',symbol:'B'}),
  Object.freeze({id:2,key:'fracture',name:'FRACTURE',color:'#ffb778',symbol:'F'}),
  Object.freeze({id:3,key:'impulse',name:'IMPULSE',color:'#a8e885',symbol:'I'}),
  Object.freeze({id:4,key:'seeker',name:'SEEKER',color:'#ff8cc0',symbol:'S'}),
  Object.freeze({id:5,key:'phase',name:'PHASE',color:'#90e4ef',symbol:'P'}),
  Object.freeze({id:6,key:'convergence',name:'CONVERGENCE',color:'#92f0d9',symbol:'C'}),
  Object.freeze({id:7,key:'wall',name:'WALL',color:'#75c8e2',symbol:'▣'}),
  Object.freeze({id:8,key:'north',name:'NORTH',color:'#b5e6ff',symbol:'↑'}),
  Object.freeze({id:9,key:'south',name:'SOUTH',color:'#f6c98d',symbol:'↓'}),
  Object.freeze({id:10,key:'west',name:'WEST',color:'#b6eeb7',symbol:'←'}),
  Object.freeze({id:11,key:'east',name:'EAST',color:'#eebde7',symbol:'→'})
 ]);
 const byId=id=>TYPES[id]||TYPES[0];
 function normalize(raw){
  if(raw===undefined||raw===null)return Array(TOTAL).fill(0);
  if(!Array.isArray(raw)||raw.length!==TOTAL)throw Error('Expected 32x32 rune overlay');
  return raw.map((code,i)=>{
   if(!Number.isInteger(code)||code<0||code>=TYPES.length)throw Error('Invalid rune at '+i);
   return code;
  });
 }
 const mass=a=>Math.max(1,Math.floor(a.mass||1));
 const radius=a=>mass(a)===1?3:Math.min(44,2.7+Math.sqrt(mass(a))*2.05);
 function composition(a){
  if(a.composition)return a.composition.slice();
  const counts=[0,0,0,0,0];counts[a.element||0]=mass(a);return counts;
 }
 function prominent(counts){
  let best=0;for(let i=1;i<5;i++)if(counts[i]>counts[best])best=i;
  return best;
 }
 function combine(receiver,other){
  const a=composition(receiver),b=composition(other),old=mass(receiver),incoming=mass(other),total=old+incoming;
  for(let i=0;i<5;i++)a[i]+=b[i];
  receiver.vx=(receiver.vx*old+other.vx*incoming)/total;
  receiver.vy=(receiver.vy*old+other.vy*incoming)/total;
  receiver.mass=total;receiver.composition=a;receiver.element=prominent(a);
  receiver.runeSeen=receiver.runeSeen||new Set();
  if(other.runeSeen)for(const id of other.runeSeen)receiver.runeSeen.add(id);
  receiver.seekUntil=Math.max(receiver.seekUntil||0,other.seekUntil||0);
  receiver.phaseUntil=Math.max(receiver.phaseUntil||0,other.phaseUntil||0);
  // Behemoth keeps any learned Convergence identity; Fracture copies it to children.
  receiver.convergence=!!(receiver.convergence||other.convergence);
  return receiver;
 }
 function fracture(a){
  const weight=mass(a),parts=Math.min(4,weight);
  if(parts===1)return [a];
  const counts=composition(a);
  const chunks=Array.from({length:parts},()=>[0,0,0,0,0]);
  let idx=0;
  for(let element=0;element<5;element++){
   const c=counts[element],base=Math.floor(c/parts),rem=c%parts;
   for(let i=0;i<parts;i++)chunks[i][element]+=base;
   for(let k=0;k<rem;k++)chunks[(idx+k)%parts][element]++;
   idx=(idx+rem)%parts;
  }
  // Adjust the initial partitions so each child has nonzero mass;
  // if the original was a single element, even splitting is exact.
  const pieces=[],heading=Math.atan2(a.vy,a.vx),speed=Math.max(1,Math.hypot(a.vx,a.vy));
  for(let i=0;i<parts;i++){
   const total=chunks[i].reduce((sum,v)=>sum+v,0);
   if(!total)continue;
   const fan=i-(parts-1)/2,angle=heading+fan*.24,offset=fan*.0035;
   const child={...a,tail:[],runeSeen:new Set(a.runeSeen||[]),
    x:a.x-Math.sin(heading)*offset,y:a.y+Math.cos(heading)*offset,
    prevX:a.x,prevY:a.y,
    vx:Math.cos(angle)*speed*(1+Math.abs(fan)*.13),
    vy:Math.sin(angle)*speed*(1+Math.abs(fan)*.13),
    seed:(a.seed||0)+i*.6180339,composition:chunks[i],mass:total,
    element:prominent(chunks[i])};
   pieces.push(child);
  }
  return pieces;
 }
 function tile(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=1||y>=1)return -1;
  return Math.floor(y*N)*N+Math.floor(x*N);
 }
 // All steering stays in the local 32x32 field coordinate system.
 // World emissions already rotate local x/y into world axes at render/hit.
 const CARDINAL=Object.freeze({
  8:Object.freeze({x:0,y:-1}), 9:Object.freeze({x:0,y:1}),
  10:Object.freeze({x:-1,y:0}),11:Object.freeze({x:1,y:0})
 });
 function direct(agent,code){
  const axis=CARDINAL[code];
  if(!axis)return false;
  // Redirect momentum without creating mass, clones, or permanent AI.
  // The minimum speed makes a stationary hex answer the painted instruction;
  // otherwise its current speed is preserved (including Impulse boosts).
  const speed=Math.max(2,Math.hypot(agent.vx||0,agent.vy||0));
  agent.vx=axis.x*speed;agent.vy=axis.y*speed;
  return true;
 }
 function learn(cast,agent,index,time,arr,alive){
  const runes=cast.recipe.runes,code=runes[index];
  // WALL is solid, not learnable. Directional pixels act on each ENTRY,
  // not once per lifetime like other learned runes.
  if(!code||code===7)return [agent];
  if(CARDINAL[code]){
   direct(agent,code);
   agent.directionAt=time;
   agent.directionHits=(agent.directionHits||0)+1;
   cast.directionHits=(cast.directionHits||0)+1;
   return [agent];
  }
  agent.runeSeen=agent.runeSeen||new Set();
  if(agent.runeSeen.has(index))return [agent];
  agent.runeSeen.add(index);
  if(code===1){
   cast.runeAnchors=cast.runeAnchors||new Map();
   const anchor=cast.runeAnchors.get(index);
   // A birth rune forces all matching spawns together; elsewhere a collector
   // merges only while its anchor is still occupying that cell.
   if(anchor&&anchor!==agent&&alive.has(anchor)&&tile(anchor.x,anchor.y)===index){
    combine(anchor,agent);
    cast.runeMerges=(cast.runeMerges||0)+mass(agent);
    return [];
   }
   agent.mass=mass(agent);
   cast.runeAnchors.set(index,agent);
  }else if(code===2){
   const shards=fracture(agent);
   if(shards.length>1)cast.runeSplits=(cast.runeSplits||0)+shards.length-1;
   return shards;
  }else if(code===3){
   const v=Math.max(.5,Math.hypot(agent.vx,agent.vy)),f=2.1/v;
   agent.vx*=Math.max(1.5,f);agent.vy*=Math.max(1.5,f);
   agent.impulses=(agent.impulses||0)+1;
  }else if(code===4){
   agent.seekUntil=Math.max(agent.seekUntil||0,time+2000);
  }else if(code===5){
   agent.phaseUntil=Math.max(agent.phaseUntil||0,time+2000);
  }else if(code===6){
   // Only agents touching painted Convergence cells learn to regroup.
   agent.convergence=true;
  }
  return [agent];
 }
 function onBirth(cast){
  if(!cast.runeCount)return;
  cast.runeAnchors=new Map();
  const existing=new Set(cast.agents),next=[];
  for(const agent of cast.agents){
   const source=Number.isInteger(agent.sourceIndex)?agent.sourceIndex:tile(agent.x,agent.y);
   let produced=[agent];
   if(source>=0&&cast.recipe.runes[source]){
    produced=learn(cast,agent,source,cast.born||0,next,existing);
    if(!produced.length)existing.delete(agent);
   }
   // Birth on a directional tile immediately sets heading; the first
   // simulation step must not count the same tile a second time.
   for(const child of produced)child.directionLastTile=source;
   next.push(...produced);
  }
  cast.agents=next;
 }
 function traverse(x0,y0,x1,y1,fn){
  // Center-sampled continuous cell traversal: 3 samples per pixel crossed.
  // Each step is < 1 cell, so even high-speed agents cannot skip a rune.
  const steps=Math.min(1024,Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))*N*3)));
  let last=-2;
  for(let i=0;i<=steps;i++){
   const t=i/steps,cell=tile(x0+(x1-x0)*t,y0+(y1-y0)*t);
   if(cell<0||cell===last)continue;
   last=cell;
   if(fn(cell)===false)break;
  }
 }
 // Swept grid collision on normalized 32x32 cells. Clip the motion
 // segment to the field boundary first, then walk exact tile crossings.
 // No per-frame stepping cap: a fast agent cannot tunnel through walls.
 // A born-inside-wall agent may leave, but cannot subsequently re-enter.
 function resolveWall(st,a,startX=a.prevX??a.x,startY=a.prevY??a.y){
  if(!st.wallCount||!Number.isFinite(startX)||!Number.isFinite(startY)||
     !Number.isFinite(a.x)||!Number.isFinite(a.y))return false;
  const x0=startX,y0=startY,dx=a.x-x0,dy=a.y-y0;
  if(!dx&&!dy)return false;
  let enter=0,exit=1,enteredX=false,enteredY=false;
  for(const [p,d,axis] of [[x0,dx,0],[y0,dy,1]]){
   if(d===0){if(p<0||p>=1)return false;continue}
   const lo=(0-p)/d,hi=(1-p)/d,tmin=Math.min(lo,hi),tmax=Math.max(lo,hi);
   if(tmin>enter+1e-12){enter=tmin;enteredX=axis===0;enteredY=axis===1}
   else if(Math.abs(tmin-enter)<1e-12&&tmin>0){if(axis===0)enteredX=true;else enteredY=true}
   exit=Math.min(exit,tmax);
  }
  if(exit<enter||enter>1||exit<0)return false;
  const check=(ix,iy)=>ix>=0&&ix<32&&iy>=0&&iy<32&&st.wallMask[iy*32+ix]===1;
  let cx=Math.max(0,Math.min(31,Math.floor((x0+dx*Math.min(exit,enter+1e-11))*32)));
  let cy=Math.max(0,Math.min(31,Math.floor((y0+dy*Math.min(exit,enter+1e-11))*32)));
  function collide(t,normalX,normalY){
   const offset=1e-8/Math.max(Math.abs(dx),Math.abs(dy),1e-10);
   const safe=Math.max(0,t-offset);
   a.x=x0+dx*safe;a.y=y0+dy*safe;
   if(normalX)a.vx=-a.vx*.58;
   if(normalY)a.vy=-a.vy*.58;
   st.wallHits=(st.wallHits||0)+1;
   return true;
  }
  // When entering from outside, the first cell is a collision candidate.
  if(enter>0&&check(cx,cy))return collide(enter,enteredX,enteredY);
  const sx=Math.sign(dx),sy=Math.sign(dy);
  let tx=sx?((cx+(sx>0?1:0))/32-x0)/dx:Infinity;
  let ty=sy?((cy+(sy>0?1:0))/32-y0)/dy:Infinity;
  const stepX=sx?1/(32*Math.abs(dx)):Infinity;
  const stepY=sy?1/(32*Math.abs(dy)):Infinity;
  // Every iteration enters at least one NEW cell, including sharp corners.
  while(Math.min(tx,ty)<=exit+1e-12){
   const t=Math.min(tx,ty);
   if(t>1+1e-12)break;
   const crossX=tx<=t+1e-12,crossY=ty<=t+1e-12;
   const hitX=crossX&&check(cx+sx,cy);
   const hitY=crossY&&check(cx,cy+sy);
   const hitCorner=crossX&&crossY&&check(cx+sx,cy+sy);
   if(hitX||hitY||hitCorner)return collide(t,hitX||hitCorner,hitY||hitCorner);
   if(crossX){cx+=sx;tx+=stepX}
   if(crossY){cy+=sy;ty+=stepY}
  }
  return false;
 }
 function homeVector(st,point){
  if(st.delivery==='world'){
   const dx=point.x-st.center.x,dy=point.y-st.center.y;
   return {x:st.spawnX+(dx*st.right.x+dy*st.right.y)/st.worldW,
    y:st.spawnY+(dx*st.forward.x+dy*st.forward.y)/st.worldH};
  }
  return {x:.5+(point.x-st.center.x)/st.scale,y:.5+(point.y-st.center.y)/st.scale};
 }
 function acquireTarget(st,scene,a){
  const enemies=scene?.combat?.enemies||[];
  let nearest=null,rangeSq=460*460;
  for(const e of enemies){
   if(!e.alive||!e.body?.position)continue;
   const p=homeVector(st,e.body.position),dx=(p.x-a.x)*st.worldW,dy=(p.y-a.y)*st.worldH,d=dx*dx+dy*dy;
   if(d<rangeSq){rangeSq=d;nearest={dx,dy}};
  }
  return nearest;
 }
 function advance(st,scene,time,dt){
  if(!st.runeCount)return;
  const alive=new Set(st.agents),next=[];
  for(const a of st.agents){
   // Mass is physical inertia. Preserve momentum as the underlying field
   // turns or damps it, without altering the canonical motion interpreter.
   if(mass(a)>1&&Number.isFinite(a.beforeVx)&&Number.isFinite(a.beforeVy)){
    const resistance=1/(1+Math.sqrt(mass(a))*.09),scale=Math.min(2,Math.max(0,dt*60));
    const dvx=(a.vx-a.beforeVx)*(1-resistance);
    const dvy=(a.vy-a.beforeVy)*(1-resistance);
    a.vx-=dvx;a.vy-=dvy;
    a.x-=dvx*scale/Math.max(1,st.worldW||360);
    a.y-=dvy*scale/Math.max(1,st.worldH||500);
   }
   // Wall collision runs after real field physics, before other runes and
   // before world impacts. Neither speed nor PHASE bypasses WALL.
   if(st.wallCount)resolveWall(st,a);
   let batch=[a];
   traverse(a.prevX??a.x,a.prevY??a.y,a.x,a.y,index=>{
    const code=st.recipe.runes[index];
    const out=[];
    for(const item of batch){
     // Process empty cells as well, so leaving a cardinal tile re-arms it.
     // A recurring crossing may redirect again, but sitting still on the
     // same pixel cannot generate repeated activations.
     if(code>=8&&code<=11){
      if(item.directionLastTile!==index)out.push(...learn(st,item,index,time,st.agents,alive));
      else out.push(item);
     }else if(code)out.push(...learn(st,item,index,time,st.agents,alive));
     else out.push(item);
     for(const produced of out)produced.directionLastTile=index;
    }
    batch=out;
    if(!batch.length){alive.delete(a);return false}
   });
   // Fracture adds small positional offsets; don't introduce a child
   // inside a wall that its parent never entered.
   if(st.wallCount)for(const child of batch){
    if(child!==a)resolveWall(st,child,a.x,a.y);
   }
   next.push(...batch);
  }
  st.agents=next;
  if(!scene)return;
  // No new bodies or global hunting. The existing Seeker gets first refusal;
  // only idle, rune-marked agents participate in Convergence.
  // One group per elemental signature in THIS cast, not all spells in the arena.
  // World axes are measured using real field scale so rotation is irrelevant.
  const sx=st.delivery==='world'?st.worldW:st.scale;
  const sy=st.delivery==='world'?st.worldH:st.scale;
  const groups=new Map(),idle=[];
  st.converging=0;
  for(const a of next){
   a.converging=false;
   const target=(a.seekUntil||0)>time?acquireTarget(st,scene,a):null;
   if(target){
    // On the precise frame a cardinal rune redirects a seeker, its
    // command wins. The seeker may resume steering on later frames.
    if(a.directionAt===time)continue;
    const d=Math.hypot(target.dx,target.dy)||1;
    a.vx+=target.dx/d*.22*Math.min(2,dt*60);
    a.vy+=target.dy/d*.22*Math.min(2,dt*60);
    const speed=Math.hypot(a.vx,a.vy);
    if(speed>5){a.vx*=5/speed;a.vy*=5/speed}
    continue;
   }
   if(!a.convergence||!Number.isFinite(a.x)||!Number.isFinite(a.y))continue;
   const element=a.element||0;
   let group=groups.get(element);
   if(!group){group={count:0,x:0,y:0};groups.set(element,group)}
   group.count++;group.x+=a.x;group.y+=a.y;
   idle.push(a);
  }
  for(const a of idle){
   const group=groups.get(a.element||0);
   if(!group||group.count<2)continue;
   // Exclude the agent's own position, avoiding a self-aiming one-body group.
   const mx=(group.x-a.x)/(group.count-1),my=(group.y-a.y)/(group.count-1);
   const dx=(mx-a.x)*sx,dy=(my-a.y)*sy,d=Math.hypot(dx,dy);
   // A gathering zone instead of a forced collapse into one pixel.
   if(d<36||!Number.isFinite(d))continue;
   const thrust=.15*Math.min(2,Math.max(0,dt*60))*Math.min(1,d/130);
   a.vx+=dx/d*thrust;a.vy+=dy/d*thrust;
   const speed=Math.hypot(a.vx,a.vy);
   if(speed>5){a.vx*=5/speed;a.vy*=5/speed}
   a.converging=true;st.converging++;
  }
 }
 function configure(st){
  st.runeCount=st.recipe.runes.reduce((n,v)=>n+(v!==0),0);
  // O(1) occupancy plus row-merged rectangles for cheap game/preview art.
  st.wallMask=new Uint8Array(TOTAL);st.wallRects=[];st.wallCount=0;st.wallHits=0;
  for(let y=0;y<N;y++){
   for(let x=0;x<N;){
    if(st.recipe.runes[y*N+x]!==7){x++;continue}
    const start=x;
    do{st.wallMask[y*N+x]=1;st.wallCount++;x++}
    while(x<N&&st.recipe.runes[y*N+x]===7);
    st.wallRects.push({x0:start/N,x1:x/N,y0:y/N,y1:(y+1)/N});
   }
  }
  st.runeAnchors=new Map();st.runeMerges=0;st.runeSplits=0;st.converging=0;st.directionHits=0;
 }
 return Object.freeze({VERSION:'079',TYPES,byId,normalize,mass,radius,composition,combine,fracture,tile,traverse,resolveWall,direct,configure,onBirth,advance});
});
