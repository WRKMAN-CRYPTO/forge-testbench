/* WANDRUNE 090 | FLOWING FIRE | isolated rendering experiment
 * Reuses already-calculated contour shells and source record directions.
 * No new agent, field sample, cast physics or gameplay mutation.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_FIRE_GROUP_FLOW=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="090-flowing-group-fire";
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:a));
 const normalize=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d};};
 function areaOf(points){
  let a=0;
  for(let i=0;i<points.length;i++){
   const p=points[i],q=points[(i+1)%points.length];
   a+=p.x*q.y-q.x*p.y;
  }
  return a*.5;
 }
 // Coherent travel tips the whole fire in the direction of moving agents.
 // Uncoordinated clusters rise instead. This only reads render records.
 function flowOf(group){
  let dx=0,dy=0,n=0;
  for(const r of group?.members||[]){
   if(!r||!Number.isFinite(r.angle))continue;
   dx+=Math.cos(r.angle);dy+=Math.sin(r.angle);n++;
  }
  const coherence=n?Math.hypot(dx,dy)/n:0;
  const strength=clamp((coherence-.18)/.65,0,.85);
  const v=normalize(dx,dy);
  // Always retain a bit of convection, even for horizontal projectiles.
  const dir=normalize(v.x*strength,-(1-strength)+v.y*strength);
  return {x:dir.x,y:dir.y,coherence};
 }
 function sampleBoundary(points,fraction){
  let n=points.length;
  if(n>1&&points[0].x===points[n-1].x&&points[0].y===points[n-1].y)n--;
  if(n<4)return null;
  const lengths=[],totalSegments=[];
  let length=0;
  for(let i=0;i<n;i++){
   const a=points[i],b=points[(i+1)%n];
   const d=Math.hypot(b.x-a.x,b.y-a.y);
   lengths.push(d);length+=d;totalSegments.push(length);
  }
  if(length<10)return null;
  const at=clamp(fraction,0,.999999)*length;
  let i=totalSegments.findIndex(c=>c>=at);
  if(i<0)i=n-1;
  const prev=i?totalSegments[i-1]:0;
  const u=clamp((at-prev)/(lengths[i]||1),0,1);
  const a=points[i],b=points[(i+1)%n];
  const around=points[(i+n-1)%n],ahead=points[(i+2)%n];
  const tan=normalize(ahead.x-around.x,ahead.y-around.y);
  const sign=areaOf(points.slice(0,n))>0?1:-1;
  return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,
   tx:tan.x,ty:tan.y,nx:tan.y*sign,ny:-tan.x*sign,perimeter:length};
 }
 function createFlows(shells,groups,time=0,opts={}){
  const limit=clamp(Math.floor(opts.maxTotal??12),0,36);
  const perGroup=clamp(Math.floor(opts.maxPerGroup??4),0,8);
  const now=Number.isFinite(time)?time:0;
  const ribbons=[];
  let groupsDrawn=0;
  for(const shell of shells||[]){
   if(ribbons.length>=limit)break;
   if(!shell||shell.count<10||(shell.opacity??1)<.025)continue;
   const group=(groups||[]).find(g=>g&&g.castIndex===shell.castIndex&&
    ((Number.isInteger(shell.trackId)&&shell.trackId===g.trackId)||
     g.count===shell.count))||null;
   const motion=flowOf(group);
   const path=(shell.paths||[]).find(p=>p.closed&&p.depth%2===0&&
    p.points?.length>=6&&Math.abs(p.area||0)>130);
   if(!path)continue;
   // Seven staggered contour probes, NOT evenly spaced rendered spikes.
   // Choose only a few outward/upwind-facing wide ribbons with a gap.
   const seed=(shell.trackId||shell.castIndex||0)*.61803398875;
   const options=[];
   for(let j=0;j<13;j++){
    const fraction=(.067+j*.0769230769+(Math.sin(j*5.41+seed)*.013)+seed*.13)%1;
    const p=sampleBoundary(path.points,fraction);
    if(!p)continue;
    const forward=p.nx*motion.x+p.ny*motion.y;
    const up=-p.ny;
    const preference=forward*.8+Math.max(0,up)*.28;
    if(preference<.19)continue; // no regular underside 'centipede legs'
    const pulse=Math.sin(j*2.83+seed*3.4);
    const score=preference+.07*pulse;
    options.push({...p,score,fraction,ordinal:j});
   }
   options.sort((a,b)=>b.score-a.score);
   const chosen=[];
   const max=Math.min(perGroup,limit-ribbons.length);
   for(const p of options){
    if(chosen.length>=max)break;
    if(chosen.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<24))continue;
    chosen.push(p);
   }
   chosen.sort((a,b)=>a.fraction-b.fraction);
   const scale=clamp(12+Math.sqrt(shell.count)*1.55,18,38);
   let local=0;
   for(const p of chosen){
    const phase=seed*13.7+p.ordinal*3.417;
    const breathe=.87+.16*Math.sin(now*.0066+phase);
    const lean=.08*Math.sin(now*.0107+phase*1.71);
    const height=scale*(.86+.12*p.score)*breathe;
    const width=clamp(scale*(.84+.17*Math.sin(phase*.7)),16,38);
    // One combined direction shared by the group, not perpendicular
    // pin-like spikes distributed along the whole contour.
    const launch=normalize(p.nx*.55+motion.x*.86,p.ny*.55+motion.y*.86);
    const sway=lean*height;
    const tx=p.x+launch.x*height+p.tx*sway;
    const ty=p.y+launch.y*height+p.ty*sway;
    ribbons.push({
     x:p.x,y:p.y,tx,ty,width,height,
     nx:p.nx,ny:p.ny,tanX:p.tx,tanY:p.ty,
     flowX:motion.x,flowY:motion.y,
     alpha:clamp(shell.opacity??1,0,1),castIndex:shell.castIndex,
     phase,ordinal:p.ordinal,coherence:motion.coherence
    });
    local++;
   }
   if(local)groupsDrawn++;
  }
  return {ribbons,groups:groupsDrawn};
 }
 function drawFlows(g,ribbons){
  if(!g)return 0;
  let n=0;
  for(const r of ribbons||[]){
   if(r.alpha<=.001)continue;
   // Broad base crosses inside the body contour. A curved external tip
   // merges with the existing translucent density field, no teeth/legs.
   const x=r.x-r.nx*5,y=r.y-r.ny*5;
   const a={x:x-r.tanX*r.width*.55,y:y-r.tanY*r.width*.55};
   const b={x:x+r.tanX*r.width*.55,y:y+r.tanY*r.width*.55};
   const skew=r.width*.20;
   g.moveTo(a.x,a.y)
    .bezierCurveTo(a.x+r.flowX*r.height*.4-r.tanX*skew,
     a.y+r.flowY*r.height*.4-r.tanY*skew,
     r.tx-r.tanX*skew,r.ty-r.tanY*skew,r.tx,r.ty)
    .bezierCurveTo(r.tx+r.tanX*skew*.8,r.ty+r.tanY*skew*.8,
     b.x+r.flowX*r.height*.26,b.y+r.flowY*r.height*.26,b.x,b.y)
    .closePath().fill({color:0xff6a1d,alpha:.42*r.alpha});
   // Hot internal streak bends in the same direction as the shared flow.
   const hx=x+(r.tx-x)*.67,hy=y+(r.ty-y)*.67;
   g.moveTo(x-r.tanX*r.width*.23,y-r.tanY*r.width*.23)
    .quadraticCurveTo(hx-r.tanX*r.width*.12,hy-r.tanY*r.width*.12,hx,hy)
    .quadraticCurveTo(hx+r.tanX*r.width*.12,hy+r.tanY*r.width*.12,
     x+r.tanX*r.width*.23,y+r.tanY*r.width*.23)
    .closePath().fill({color:0xffd26d,alpha:.26*r.alpha});
   n++;
  }
  return n;
 }
 return Object.freeze({VERSION,areaOf,flowOf,sampleBoundary,createFlows,drawFlows});
});
