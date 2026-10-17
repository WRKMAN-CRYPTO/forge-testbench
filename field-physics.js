/* WRKMAN / FIELD PHYSICS 038
 * Canonical interpretation of painted 32x32 instruction fields.
 * Shared by Agent Field editor, Stone Range, Spell Forge and the roguelike.
 * No DOM, Phaser or canvas dependency. All consumers pass geometry explicitly.
 *
 * Units: vx/vy are virtual pixels per 60-Hz step. dt is seconds.
 * A field is open: no bounce, wrapping, clamping or automatic respawn.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else if(root)root.WRKMAN_FIELD_PHYSICS=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const N=32, TOTAL=1024, MASK=-1, TAU=Math.PI*2, VERSION='038';
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const lerp=(a,b,t)=>a+(b-a)*t;
 function sample(field,nx,ny){
  if(!Number.isFinite(nx)||!Number.isFinite(ny)||nx<0||ny<0||nx>=1||ny>=1)return {valid:false,value:null};
  // Membership stays pixel-exact: magenta/MASK means no field force.
  // Interpolation, however, must be CENTERED on pixel centers.
  // Physics 037 incorrectly treated each pixel's top-left corner as its
  // center, so right/bottom neighbors influenced it while left/top did not.
  const homeX=Math.floor(nx*N),homeY=Math.floor(ny*N),home=field[homeY*N+homeX];
  if(home===MASK)return {valid:false,value:null};
  const cx=nx*N-.5,cy=ny*N-.5,i=Math.floor(cx),j=Math.floor(cy);
  const fx=cx-i,fy=cy-j;let sum=0,weight=0;
  for(let oy=0;oy<=1;oy++)for(let ox=0;ox<=1;ox++){
   // At the outer border, repeat the edge pixel symmetrically.
   const x=clamp(i+ox,0,N-1),y=clamp(j+oy,0,N-1),v=field[y*N+x];
   if(v===MASK)continue;
   const w=(ox?fx:1-fx)*(oy?fy:1-fy);
   sum+=v*w;weight+=w;
  }
  return {valid:true,value:weight?sum/weight:home};
 }
 function gradient(field,nx,ny,value){
  const e=.72/N;
  const a=sample(field,nx+e,ny),b=sample(field,nx-e,ny);
  const c=sample(field,nx,ny+e),d=sample(field,nx,ny-e);
  let gx=0,gy=0;
  if(a.valid&&b.valid)gx=(a.value-b.value)*.5;
  else if(a.valid)gx=a.value-value;
  else if(b.valid)gx=value-b.value;
  if(c.valid&&d.valid)gy=(c.value-d.value)*.5;
  else if(c.valid)gy=c.value-value;
  else if(d.valid)gy=value-d.value;
  const mag=Math.hypot(gx,gy);
  return mag>.00001?[-gx/mag,-gy/mag,mag]:[0,0,0];
 }
 function startingCells(field){
  let highest=-1;
  for(let i=0;i<TOTAL;i++)if(field[i]>highest)highest=field[i];
  if(highest<0)return [];
  const threshold=Math.max(0,highest-50),out=[];
  for(let i=0;i<TOTAL;i++)if(field[i]>=threshold)out.push(i);
  return out;
 }
 function spawn(field,starts,random=Math.random,home=0){
  if(!starts)starts=startingCells(field);
  let x,y;
  if(starts.length){
   const i=starts[(random()*starts.length)|0];
   x=((i%N)+.1+random()*.8)/N;
   y=(Math.floor(i/N)+.1+random()*.8)/N;
  }else{x=random();y=random()}
  const angle=random()*TAU,speed=.7+random()*1.2;
  return {x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
   seed:random()*TAU,home,phase:0,progress:0,free:false,age:0,tail:[]};
 }
 function stepAgent(a,field,settings,dt,width,height,elapsed){
  const scale=clamp(dt*60,0,2);
  const momentum=clamp(Number(settings.momentum)||0,0,100)/100;
  const swirl=clamp(Number(settings.swirl)||0,0,100)/100;
  a.age=(a.age||0)+dt;
  const here=sample(field,a.x,a.y);
  a.free=!here.valid;
  let near=false;
  if(!here.valid){
   a.vx*=Math.pow(.997,scale);
   a.vy*=Math.pow(.997,scale);
  }else{
   const v=here.value,progress=clamp(1-v/255,0,1);
   const [gx,gy,mag]=gradient(field,a.x,a.y,v);
   a.progress=lerp(a.progress||0,progress,.15);
   near=v<22;
   const curl=swirl*(.26+progress*.45);
   const clock=elapsed*(.7+progress*1.6);
   let ax=gx*.28-gy*curl+Math.cos(a.seed+clock)*(.012+.025*swirl);
   let ay=gy*.28+gx*curl+Math.sin(a.seed+clock)*(.012+.025*swirl);
   if(mag<.001){
    const theta=a.seed+elapsed*(1.1+.8*swirl);
    ax+=Math.cos(theta)*(.012+.025*swirl);
    ay+=Math.sin(theta)*(.012+.025*swirl);
   }
   a.vx+=ax*scale;a.vy+=ay*scale;
   const drag=.885+momentum*.095;
   a.vx*=Math.pow(drag,scale);a.vy*=Math.pow(drag,scale);
   const limit=((settings.mode==='ab')?1.8+2.2*(1-progress):3.2)+momentum*1.8;
   const speed=Math.hypot(a.vx,a.vy);
   if(speed>limit){a.vx*=limit/speed;a.vy*=limit/speed}
  }
  a.x+=a.vx*scale/Math.max(1,width||360);
  a.y+=a.vy*scale/Math.max(1,height||500);
  return {free:a.free,near,offscreen:a.x<0||a.x>=1||a.y<0||a.y>=1};
 }
 function stepSwarm(agents,field,settings,dt,width,height,elapsed){
  let free=0,near=0,offscreen=0;
  for(const a of agents){
   const s=stepAgent(a,field,settings,dt,width,height,elapsed);
   if(s.free)free++;
   if(s.near)near++;
   if(s.offscreen)offscreen++;
  }
  return {free,near,offscreen,alive:agents.length};
 }
 return Object.freeze({VERSION,N,TOTAL,MASK,sample,gradient,startingCells,spawn,stepAgent,stepSwarm});
});
