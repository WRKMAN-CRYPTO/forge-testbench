/* WANDRUNE 067 | Edict of Motion
 * A static, clearly-telegraphed area attack. It never follows the player.
 * The combat layer owns hitPlayer() so invulnerability/dash rules stay intact.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ARCHIVIST_EDICT=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const RADIUS=82,WARN_MS=650,DAMAGE=16,AFTERGLOW=420;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function create(target,time){
  return {x:target.x,y:target.y,r:RADIUS,born:time,due:time+WARN_MS,
   damage:DAMAGE,resolved:false,resolvedAt:null,inside:false};
 }
 function outcome(mark,player,time){
  if(!mark||mark.resolved||time<mark.due)return null;
  const d=Math.hypot(player.x-mark.x,player.y-mark.y);
  return {inside:d<=mark.r+12,distance:d,center:{x:mark.x,y:mark.y}};
 }
 function paint(g,mark,time){
  if(!mark)return;
  const elapsed=time-mark.born;
  if(elapsed<0)return;
  const x=mark.x,y=mark.y,r=mark.r,TAU=Math.PI*2;
  const wave=(.5+.5*Math.sin(time*.029));
  if(!mark.resolved){
   if(elapsed>WARN_MS)return;
   const p=clamp(elapsed/WARN_MS,0,1);
   const hot=clamp((p-.69)/.31,0,1);
   // The exact collision ring is always legible. Unlike the old effect,
   // the inscription visibly compresses before its guaranteed release time.
   g.fillStyle(0x44145e,.12+.13*p);
   g.fillCircle(x,y,r);
   g.lineStyle(2.4+1.8*p,hot>.5?0xffd29d:0xb379ff,.60+.24*p);
   g.strokeCircle(x,y,r);
   g.lineStyle(1.2+hot*1.7,0xc89eff,.46+.38*p);
   g.strokeCircle(x,y,r*(.86-.62*p));
   // Eight inward-moving rune teeth, ending at a dangerous crossed center.
   for(let i=0;i<8;i++){
    const a=TAU*i/8+Math.PI/8;
    const inner=r*(.8-.35*p),outer=r*(.95-.03*p);
    const tx=x+Math.cos(a)*inner,ty=y+Math.sin(a)*inner;
    g.lineStyle(1.4+hot*1.3,0xe5b5ff,.42+.42*p);
    g.lineBetween(tx,ty,x+Math.cos(a)*outer,y+Math.sin(a)*outer);
    const w=5+2*hot;
    g.fillStyle(0xb47aea,.37+.35*p);
    g.fillTriangle(tx,ty,tx+Math.cos(a+.56)*w,ty+Math.sin(a+.56)*w,
      tx+Math.cos(a-.56)*w,ty+Math.sin(a-.56)*w);
   }
   const span=12+13*hot;
   g.lineStyle(2+hot*1.6,hot>.55?0xffdfa4:0xddb4ff,.64+.26*hot);
   g.lineBetween(x-span,y-span,x+span,y+span);
   g.lineBetween(x+span,y-span,x-span,y+span);
   // Flashing rim just before detonation, rather than blinding screen flashes.
   if(hot>0){
    const a=.22+hot*.65*wave;
    g.lineStyle(1.7,0xffe2b8,a);
    g.strokeCircle(x,y,r-5);
   }
   return;
  }
  const age=Math.max(0,time-(mark.resolvedAt??mark.due));
  if(age>AFTERGLOW)return;
  const p=clamp(age/AFTERGLOW,0,1);
  const fade=Math.pow(1-p,1.35);
  const burst=1-Math.pow(1-p,2.5);
  // The outer shockwave is VISUAL ONLY. The impact radius stays fixed at 82.
  g.fillStyle(0x6b2ba6,.24*fade);
  g.fillCircle(x,y,r);
  g.fillStyle(0xd99cff,.29*fade);
  g.fillCircle(x,y,40*(1-p)+4);
  g.fillStyle(0xffdbb0,.48*Math.pow(1-p,3));
  g.fillCircle(x,y,14*(1-p)+2);
  g.lineStyle(5-3*p,0xeeadff,.95*fade);
  g.strokeCircle(x,y,r*(.42+1.33*burst));
  g.lineStyle(2.8,0xffd8a7,.85*fade);
  g.strokeCircle(x,y,r*(.78+.31*burst));
  g.lineStyle(1.6,0x9d6aff,.65*fade);
  g.strokeCircle(x,y,r);
  // Jagged rune fragments and crackling spear-rays: punchy and cheap to draw.
  for(let i=0;i<12;i++){
   const a=TAU*i/12+.17;
   const ca=Math.cos(a),sa=Math.sin(a);
   const side=-sa,sideY=ca;
   const inner=r*(.18+.35*p),tip=r*(.92+.55*burst);
   const width=(9-6*p)*(i%3===0?1.35:1);
   const bx=x+ca*inner,by=y+sa*inner;
   const tx=x+ca*tip,ty=y+sa*tip;
   g.fillStyle(i%3===0?0xffce9c:0xbf86ff,.85*fade);
   g.fillTriangle(bx+side*width,by+sideY*width,
     bx-side*width,by-sideY*width,tx,ty);
   g.lineStyle(i%2?1.2:2,0xf2c6ff,.72*fade);
   g.lineBetween(x+ca*r*.3,y+sa*r*.3,
     x+ca*r*.66+side*7,y+sa*r*.66+sideY*7);
   g.lineBetween(x+ca*r*.66+side*7,y+sa*r*.66+sideY*7,
     x+ca*r*(.87+.37*burst),y+sa*r*(.87+.37*burst));
  }
  // A brief six-sided shattered seal stays anchored to the original mark.
  for(let i=0;i<6;i++){
   const a=TAU*i/6,b=a+TAU/6;
   const rr=r*(.55+.17*p);
   g.lineStyle(1.9,0xffe1bd,.82*fade);
   g.lineBetween(x+Math.cos(a)*rr,y+Math.sin(a)*rr,
      x+Math.cos(b)*rr,y+Math.sin(b)*rr);
  }
 }
 return Object.freeze({RADIUS,WARN_MS,DAMAGE,AFTERGLOW,create,outcome,paint});
});