/* WANDRUNE 066 | Edict of Motion
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
 const RADIUS=82,WARN_MS=850,DAMAGE=16,AFTERGLOW=220;
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
  if(elapsed<0||elapsed>WARN_MS+AFTERGLOW)return;
  const before=!mark.resolved;
  const phase=clamp(elapsed/WARN_MS,0,1);
  const fade=before?1:1-clamp((elapsed-WARN_MS)/AFTERGLOW,0,1);
  const pulse=.5+.5*Math.sin(time*.018);
  // Low-alpha, stroke-led telegraph. Avoid the large white circles that
  // previously caused flicker with lightning effects on phones.
  g.fillStyle(before?0x763e95:0xbc75d2,(before?.075:.19)*fade);
  g.fillCircle(mark.x,mark.y,mark.r);
  g.lineStyle(before?2.5:3.2,0xe3afff,(.42+.39*phase+.11*pulse)*fade);
  g.strokeCircle(mark.x,mark.y,mark.r);
  g.lineStyle(1.5,0xd4c6ff,(.42+.27*pulse)*fade);
  g.strokeCircle(mark.x,mark.y,mark.r*(.90-.46*phase));
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+Math.PI/8,ri=mark.r-10,ro=mark.r+7;
   g.lineStyle(1.4,0xe3afff,(.36+.45*phase)*fade);
   g.lineBetween(mark.x+Math.cos(a)*ri,mark.y+Math.sin(a)*ri,
    mark.x+Math.cos(a)*ro,mark.y+Math.sin(a)*ro);
  }
  // The central crossed rune signals a fixed danger zone, not a homing attack.
  const span=14+8*phase;
  g.lineStyle(2,0xffdca5,(.48+.35*phase)*fade);
  g.lineBetween(mark.x-span,mark.y-span,mark.x+span,mark.y+span);
  g.lineBetween(mark.x+span,mark.y-span,mark.x-span,mark.y+span);
 }
 return Object.freeze({RADIUS,WARN_MS,DAMAGE,AFTERGLOW,create,outcome,paint});
});