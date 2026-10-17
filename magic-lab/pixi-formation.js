/* WANDRUNE / VFX FORMATIONS 081
 * Pure presentation analysis. Never writes to agent records or modifies physics.
 * A formation is inferred from coherence and spatial continuity, never from
 * recipe/rune names or a hardcoded "cone" / "laser" spell identifier.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_PIXI_FORMATIONS=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="082-trail-aligned";
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function quantile(arr,q){
  if(!arr.length)return 0;
  const sorted=arr.slice().sort((a,b)=>a-b),p=(sorted.length-1)*q,i=Math.floor(p);
  return sorted[i]+(sorted[Math.min(sorted.length-1,i+1)]-sorted[i])*(p-i);
 }
 // This samples only existing trails. The renderer never invents a path
 // between spatially disconnected groups or offsets it by screen pixels.
 function pathsFor(points,maxPaths=64){
  const eligible=[];
  for(const p of points){
   if(!Array.isArray(p?.trail)||!p.trail.length)continue;
   const path=[];
   for(const t of p.trail){
    if(!t||!Number.isFinite(t.x)||!Number.isFinite(t.y))continue;
    if(path.length&&Math.hypot(t.x-path[path.length-1].x,t.y-path[path.length-1].y)<.4)continue;
    path.push({x:t.x,y:t.y});
   }
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   if(!path.length||Math.hypot(p.x-path[path.length-1].x,p.y-path[path.length-1].y)>.4)
    path.push({x:p.x,y:p.y});
   if(path.length<2)continue;
   let totalLength=0;
   for(let k=1;k<path.length;k++)totalLength+=Math.hypot(path[k].x-path[k-1].x,path[k].y-path[k-1].y);
   if(totalLength<3)continue;
   eligible.push(path);
  }
  const stride=Math.max(1,Math.ceil(eligible.length/Math.max(1,Math.floor(maxPaths))));
  return eligible.filter((_,i)=>i%stride===0);
 }
 function analyze(records,options={}){
  const minAgents=options.minAgents??24,maxFormations=options.maxFormations??10;
  const groups=new Map();
  for(const p of records||[]){
   if(!p||p.castIndex===undefined||p.castIndex<0||
      !Number.isInteger(p.castIndex)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||
      !Number.isFinite(p.angle)||!Number.isFinite(p.r)||p.alpha<=.05)continue;
   const key=p.castIndex+":"+(Number(p.element)||0);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(p);
  }
  const out=[];
  for(const [key,points] of groups){
   if(points.length<minAgents)continue;
   const n=points.length;
   let cx=0,cy=0,xx=0,xy=0,yy=0,cxv=0,cyv=0;
   let red=0,green=0,blue=0;
   for(const p of points){
    cx+=p.x;cy+=p.y;cxv+=Math.cos(p.angle);cyv+=Math.sin(p.angle);
    const color=Number(p.color)||0xffffff;
    red+=(color>>>16)&255;green+=(color>>>8)&255;blue+=color&255;
   }
   cx/=n;cy/=n;cxv/=n;cyv/=n;
   for(const p of points){const dx=p.x-cx,dy=p.y-cy;xx+=dx*dx;xy+=dx*dy;yy+=dy*dy;}
   xx/=n;xy/=n;yy/=n;
   const trace=xx+yy,root=Math.hypot(xx-yy,2*xy);
   const major=(trace+root)/2,minor=Math.max(0,(trace-root)/2);
   const elongation=major/Math.max(1,minor);
   const coherence=Math.hypot(cxv,cyv);
   if(elongation<2.65||major<420||coherence<.53)continue;
   const axis=.5*Math.atan2(2*xy,xx-yy);
   let ux=Math.cos(axis),uy=Math.sin(axis);
   const alignment=Math.abs((ux*cxv+uy*cyv)/coherence);
   if(alignment<.51)continue;
   if(ux*cxv+uy*cyv<0){ux=-ux;uy=-uy;}
   const nx=-uy,ny=ux;
   const samples=points.map(p=>({
    t:(p.x-cx)*ux+(p.y-cy)*uy,
    lateral:(p.x-cx)*nx+(p.y-cy)*ny,
    radius:p.r
   }));
   const begin=quantile(samples.map(p=>p.t),.035),end=quantile(samples.map(p=>p.t),.965),span=end-begin;
   if(span<54)continue;
   const BIN_COUNT=12,bins=Array.from({length:BIN_COUNT},()=>[]);
   for(const p of samples){
    if(p.t<begin||p.t>end)continue;
    const i=clamp(Math.floor((p.t-begin)/span*BIN_COUNT),0,BIN_COUNT-1);
    bins[i].push(p);
   }
   let occupied=0,longest=0,run=0;
   for(const bin of bins){
    if(bin.length>=2){occupied++;run++;longest=Math.max(longest,run);}
    else run=0;
   }
   // Require an actual connected stream, not isolated groups.
   if(occupied<8||longest<5)continue;
   const spine=bins.map((bin,i)=>{
    if(bin.length<2)return null;
    const lateral=quantile(bin.map(p=>p.lateral),.5);
    const deviations=bin.map(p=>Math.abs(p.lateral-lateral));
    const w=clamp(quantile(deviations,.72)+2.4,3,24);
    const t=quantile(bin.map(p=>p.t),.5);
    return {x:cx+ux*t+nx*lateral,y:cy+uy*t+ny*lateral,
      width:w,count:bin.length};
   });
   // Do not bridge empty sections. Renderer only joins adjacent occupied bins.
   const segments=[];
   for(let i=0;i<spine.length-1;i++)if(spine[i]&&spine[i+1])
    segments.push({a:spine[i],b:spine[i+1]});
   if(segments.length<5)continue;
   const color=(clamp(Math.round(red/n),0,255)<<16)|
     (clamp(Math.round(green/n),0,255)<<8)|clamp(Math.round(blue/n),0,255);
   out.push({key,count:n,color,axis:{x:ux,y:uy},elongation,coherence,
    alignment,occupancy:occupied/BIN_COUNT,segments,
    paths:pathsFor(points,options.maxPaths??64),
    meanRadius:points.reduce((sum,p)=>sum+p.r,0)/n});
   if(out.length>=maxFormations)break;
  }
  return out;
 }
 return Object.freeze({VERSION,analyze,pathsFor});
});
