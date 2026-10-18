/* WANDRUNE 089 | Connected group flame tongues, visual only.
 * Reuses existing density contours, no agent, hitbox or simulation changes.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_FIRE_GROUP_FLAMES=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="089-connected-flame-surface";
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
 function signedArea(points){
  let area=0;
  for(let i=0;i<points.length;i++){
   const p=points[i],q=points[(i+1)%points.length];
   area+=p.x*q.y-q.x*p.y;
  }
  return area*.5;
 }
 function createTongues(shells,time=0,opts={}){
  const maxTotal=clamp(Math.floor(opts.maxTotal??30),0,60);
  const maxPerShell=clamp(Math.floor(opts.maxPerShell??10),0,18);
  const result=[],now=Number.isFinite(time)?time:0;
  let groups=0;
  for(const shell of shells||[]){
   if(result.length>=maxTotal)break;
   if(!shell||shell.count<8||(shell.opacity??1)<.02)continue;
   const paths=(shell.paths||[]).filter(p=>p.closed&&p.depth%2===0&&
    p.points?.length>=5&&(p.area||0)>65).slice(0,2);
   let used=0;
   for(let pathIndex=0;pathIndex<paths.length;pathIndex++){
    const path=paths[pathIndex],points=path.points;
    const duplicate=points.length>1&&points[0].x===points.at(-1).x&&
     points[0].y===points.at(-1).y;
    const n=points.length-(duplicate?1:0);
    if(n<4)continue;
    const area=signedArea(points.slice(0,n));
    if(Math.abs(area)<=65)continue;
    const count=Math.min(maxPerShell-used,maxTotal-result.length,
     Math.max(3,Math.round((path.length||n*4)/25)));
    if(count<=0)continue;
    const scale=clamp(4+Math.sqrt(shell.count)*1.15,7,23);
    const phaseSeed=(Number(shell.trackId)||Number(shell.castIndex)||0)*1.817+pathIndex*3.17;
    for(let k=0;k<count;k++){
     const j=Math.floor((k+.43)*n/count)%n;
     const p=points[j],a=points[(j+n-1)%n],b=points[(j+1)%n];
     let tx=b.x-a.x,ty=b.y-a.y;
     const mag=Math.hypot(tx,ty);
     if(mag<.01)continue;
     tx/=mag;ty/=mag;
     const sign=area>0?1:-1;
     const nx=ty*sign,ny=-tx*sign;
     const phase=phaseSeed+k*2.399;
     const wobble=Math.sin(now*.0082+phase);
     const flutter=Math.sin(now*.013+phase*1.43);
     // Upper/side edges catch flame; the underside stays mostly coherent.
     const facing=clamp(.59-.38*ny,.17,1);
     const length=scale*facing*(.89+.19*wobble);
     if(length<2.4)continue;
     const width=clamp(5+scale*.37,6,13)*(1+.10*flutter);
     const shift=(flutter*.19+Math.sin(phase)*.16)*length;
     const rootX=p.x-nx*2.8,rootY=p.y-ny*2.8;
     result.push({
      left:{x:rootX-tx*width*.5,y:rootY-ty*width*.5},
      right:{x:rootX+tx*width*.5,y:rootY+ty*width*.5},
      tip:{x:p.x+nx*length+tx*shift,y:p.y+ny*length+ty*shift},
      tangent:{x:tx,y:ty},normal:{x:nx,y:ny},length,width,
      alpha:clamp(shell.opacity??1,0,1),
      castIndex:shell.castIndex,trackId:shell.trackId,pathIndex
     });
     used++;
    }
    if(used>=maxPerShell||result.length>=maxTotal)break;
   }
   if(used)groups++;
  }
  return {tongues:result,groups};
 }
 function drawTongues(g,tongues){
  if(!g)return 0;
  let drawn=0;
  for(const f of tongues||[]){
   if(f.alpha<=.001)continue;
   const {left:L,right:R,tip:T,tangent:V,normal:N}=f,a=f.alpha;
   // Curved protrusions have their roots inside the density surface,
   // avoiding unattached confetti or sharp triangular spikes.
   g.moveTo(L.x,L.y);
   g.bezierCurveTo(
    L.x+N.x*f.length*.46-V.x*f.width*.22,
    L.y+N.y*f.length*.46-V.y*f.width*.22,
    T.x-V.x*f.width*.12-N.x*f.length*.13,
    T.y-V.y*f.width*.12-N.y*f.length*.13,
    T.x,T.y);
   g.bezierCurveTo(
    T.x+V.x*f.width*.17-N.x*f.length*.10,
    T.y+V.y*f.width*.17-N.y*f.length*.10,
    R.x+N.x*f.length*.35+V.x*f.width*.08,
    R.y+N.y*f.length*.35+V.y*f.width*.08,
    R.x,R.y);
   g.closePath().fill({color:0xff6a1d,alpha:.4*a});
   const bx=(L.x+R.x)*.5,by=(L.y+R.y)*.5;
   const hx=bx+N.x*f.length*.49,hy=by+N.y*f.length*.49;
   g.moveTo(bx-V.x*f.width*.24,by-V.y*f.width*.24);
   g.quadraticCurveTo(hx-V.x*f.width*.1,hy-V.y*f.width*.1,hx,hy);
   g.quadraticCurveTo(hx+V.x*f.width*.11,hy+V.y*f.width*.11,
    bx+V.x*f.width*.24,by+V.y*f.width*.24);
   g.closePath().fill({color:0xffd26d,alpha:.26*a});
   drawn++;
  }
  return drawn;
 }
 return Object.freeze({VERSION,signedArea,createTongues,drawTongues});
});
