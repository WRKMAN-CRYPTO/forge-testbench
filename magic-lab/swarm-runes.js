/* WRKMAN ARCANE LAB 050 / five composable runes
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
  Object.freeze({id:5,key:'phase',name:'PHASE',color:'#90e4ef',symbol:'P'})
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
 const radius=a=>Math.min(44,2.7+Math.sqrt(mass(a))*2.05);
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
 function learn(cast,agent,index,time,arr,alive){
  const runes=cast.recipe.runes,code=runes[index];
  if(!code)return [agent];
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
   let batch=[a];
   traverse(a.prevX??a.x,a.prevY??a.y,a.x,a.y,index=>{
    if(!st.recipe.runes[index])return;
    const out=[];
    for(const item of batch)out.push(...learn(st,item,index,time,st.agents,alive));
    batch=out;
    if(!batch.length){alive.delete(a);return false}
   });
   next.push(...batch);
  }
  st.agents=next;
  if(!scene)return;
  for(const a of next){
   if((a.seekUntil||0)<=time)continue;
   const target=acquireTarget(st,scene,a);
   if(!target)continue;
   const d=Math.hypot(target.dx,target.dy)||1;
   a.vx+=target.dx/d*.22*Math.min(2,dt*60);
   a.vy+=target.dy/d*.22*Math.min(2,dt*60);
   const speed=Math.hypot(a.vx,a.vy);
   if(speed>5){a.vx*=5/speed;a.vy*=5/speed}
  }
 }
 function configure(st){
  st.runeCount=st.recipe.runes.reduce((n,v)=>n+(v!==0),0);
  st.runeAnchors=new Map();st.runeMerges=0;st.runeSplits=0;
 }
 return Object.freeze({VERSION:'050',TYPES,byId,normalize,mass,radius,composition,combine,fracture,tile,traverse,configure,onBirth,advance});
});
