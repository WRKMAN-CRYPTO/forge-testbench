/* WRKMAN ARCANE LAB 047 / seeded random scroll geometry
 * Generates real editable WRKMAN_AGENT_FIELD_V1 recipes; never simulates
 * combat, scores a spell or overrides the canonical field physics.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_SCROLL_GENERATOR=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const N=32,MASK=-1,TAU=Math.PI*2;
 const families=['FUNNEL','ORBIT','NEEDLE','FORK','SPIRAL','LATTICE','GUTTER','SHATTER'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function hash(seed){
  let h=2166136261;
  for(let i=0;i<seed.length;i++){h=Math.imul(h^seed.charCodeAt(i),16777619)}
  return h>>>0;
 }
 function rng(seed){
  let a=hash(seed);
  return function(){
   a=(a+0x6D2B79F5)>>>0;
   let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
   return ((t^(t>>>14))>>>0)/4294967296;
  };
 }
 function makeSeed(){
  if(typeof globalThis==='object'&&globalThis.crypto?.getRandomValues){
   const bits=new Uint32Array(2);globalThis.crypto.getRandomValues(bits);
   return bits[0].toString(16).padStart(8,'0')+bits[1].toString(16).padStart(8,'0');
  }
  return Math.floor(Math.random()*0x100000000).toString(16).padStart(8,'0')+
   Math.floor(Math.random()*0x100000000).toString(16).padStart(8,'0');
 }
 function generate(inputSeed){
  const seed=String(inputSeed===undefined||inputSeed===null||inputSeed===''?makeSeed():inputSeed).slice(0,100);
  const rand=rng(seed),ri=(lo,hi)=>lo+Math.floor(rand()*(hi-lo+1)),chance=p=>rand()<p;
  const family=ri(0,families.length-1),values=Array(N*N).fill(MASK);
  const put=(x,y,v)=>{
   x=Math.round(x);y=Math.round(y);
   if(x<0||y<0||x>=N||y>=N)return;
   values[y*N+x]=v===MASK?MASK:Math.round(clamp(v,0,255));
  };
  function spot(x,y,v,r=0){
   for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)
    if(dx*dx+dy*dy<=(r+.15)*(r+.15))put(x+dx,y+dy,v);
  }
  function stroke(ax,ay,bx,by,hi=255,lo=0,r=0){
   const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*3));
   for(let i=0;i<=n;i++){
    const t=i/n;spot(ax+(bx-ax)*t,ay+(by-ay)*t,hi+(lo-hi)*t,r);
   }
  }
  function arc(cx,cy,rx,ry,a0,a1,hi=255,lo=0,r=0){
   const steps=Math.max(12,Math.ceil(Math.abs(a1-a0)*Math.max(rx,ry)*2));
   for(let i=0;i<=steps;i++){
    const t=i/steps,a=a0+(a1-a0)*t;
    spot(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,hi+(lo-hi)*t,r);
   }
  }
  let startX=16,startY=7;
  if(family===0){ // Funnel: 5 → 3 → 1, sometimes offset or leaky.
   const cx=ri(8,23),top=ri(3,8),height=ri(13,23),tilt=ri(-3,3);
   startX=cx;startY=top;
   for(let step=0;step<=height;step++){
    const t=step/height,y=top+step,x=cx+Math.round(tilt*t),half=t<.35?2:t<.72?1:0;
    const v=Math.round(255*(1-t));
    for(let dx=-half;dx<=half;dx++)put(x+dx,y,v);
   }
   if(chance(.5))put(cx+ri(-2,2),top+ri(3,height-2),MASK);
  }else if(family===1){ // Broken circles with competing sinks.
   const cx=ri(11,20),cy=ri(11,20),rx=ri(5,11),ry=ri(5,11);
   const a=rand()*TAU,sweep=TAU*(chance(.5)?ri(60,90)/100:1.4);
   arc(cx,cy,rx,ry,a,a+sweep,255,ri(0,55),chance(.2)?1:0);
   if(chance(.7))arc(cx,cy,Math.max(2,rx-ri(2,4)),Math.max(2,ry-ri(2,4)),a+1,a+sweep*.8,ri(140,245),0);
   startX=Math.round(cx+Math.cos(a)*rx);startY=Math.round(cy+Math.sin(a)*ry);
  }else if(family===2){ // Single line, bend or bifurcating distal leak.
   const ax=ri(5,26),ay=ri(3,9),bx=clamp(ax+ri(-9,9),2,29),by=ri(20,29);
   const mx=Math.round((ax+bx)/2)+ri(-5,5),my=ri(12,19);
   stroke(ax,ay,mx,my,255,ri(85,170),chance(.3)?1:0);
   stroke(mx,my,bx,by,ri(85,170),0);
   if(chance(.45))stroke(mx,my,bx+ri(-6,6),by-ri(0,5),ri(90,190),ri(0,40));
   startX=ax;startY=ay;
  }else if(family===3){ // Convergence with an optional outgoing fork.
   const cx=ri(9,22),joinY=ri(12,18),rootY=ri(3,7);
   const spread=ri(3,9);
   stroke(cx-spread,rootY,cx,joinY,255,ri(85,170));
   stroke(cx+spread,rootY,cx,joinY,255,ri(85,170));
   stroke(cx,joinY,cx+ri(-3,3),ri(23,29),ri(85,170),0);
   if(chance(.65))stroke(cx,joinY,cx+ri(-10,10),ri(22,29),ri(85,170),0);
   startX=cx-spread;startY=rootY;
  }else if(family===4){ // Variable-pitch spiral or coil.
   const cx=ri(12,19),cy=ri(12,19),turns=ri(12,37)/10,offset=rand()*TAU;
   const steps=ri(100,240),outer=ri(8,14),inner=ri(1,4);
   for(let i=0;i<=steps;i++){
    const t=i/steps,r=outer+(inner-outer)*t,a=offset+t*TAU*turns;
    spot(cx+Math.cos(a)*r,cy+Math.sin(a)*r,255*(1-t),chance(.07)?1:0);
   }
   startX=Math.round(cx+Math.cos(offset)*outer);startY=Math.round(cy+Math.sin(offset)*outer);
  }else if(family===5){ // Parallel channels/crosshatch, not an effect prefab.
   const horizontal=chance(.5),origin=ri(5,11),count=ri(2,6),spacing=ri(2,5);
   for(let i=0;i<count;i++){
    const shift=i*spacing,pos=clamp(origin+shift,1,30);
    if(horizontal)stroke(ri(1,6),pos,ri(23,30),clamp(pos+ri(-3,3),1,30),255,ri(0,100));
    else stroke(pos,ri(1,6),clamp(pos+ri(-3,3),1,30),ri(23,30),255,ri(0,100));
    if(i===0){startX=horizontal?3:pos;startY=horizontal?pos:3}
   }
  }else if(family===6){ // Serpentine gutter, imperfect joins and leakage.
   let x=ri(6,25),y=ri(3,8);startX=x;startY=y;
   let level=255;
   for(let i=0;i<ri(3,6);i++){
    const nx=clamp(x+ri(-11,11),2,29),ny=clamp(y+ri(3,6),2,29);
    const next=Math.max(0,level-ri(25,75));
    stroke(x,y,nx,ny,level,next,chance(.22)?1:0);
    x=nx;y=ny;level=next;
   }
   spot(x,y,0);
  }else{ // Occasionally the found scroll really is questionable.
   const sources=ri(2,7),marks=ri(8,60);
   for(let i=0;i<marks;i++){
    const x=ri(1,30),y=ri(1,30),v=ri(0,245);
    if(chance(.35))stroke(x,y,clamp(x+ri(-5,5),0,31),clamp(y+ri(-5,5),0,31),v,ri(0,80));
    else spot(x,y,v);
   }
   for(let i=0;i<sources;i++)spot(ri(2,29),ri(2,29),255);
   startX=ri(2,29);startY=ri(2,29);
  }
  // Small edits matter. Imperfections are geometry, not fake random damage.
  const edits=ri(0,15);
  for(let i=0;i<edits;i++){
   const x=ri(1,30),y=ri(1,30),idx=y*N+x;
   if(values[idx]!==MASK){
    if(chance(.45))put(x,y,MASK);
    else put(x,y,clamp(values[idx]+ri(-110,110),0,255));
   }else if(chance(.22)){
    spot(x,y,ri(0,255));
   }
  }
  // Guarantee an actual starting cell. No other measure of usefulness.
  spot(clamp(startX,1,30),clamp(startY,1,30),255);
  const palettes=['flame','arcane','healing','void'];
  const delivery=['world','world','aura','placed'][ri(0,3)];
  const life=ri(3,30)/2;
  const recipe={
   format:'WRKMAN_AGENT_FIELD_V1',width:N,height:N,mask:'#FF00FF',
   name:'SCROLL / '+families[family]+' '+hash(seed).toString(16).toUpperCase().padStart(8,'0').slice(0,4),
   values,settings:{
    mode:chance(.8)?'ab':'a',palette:palettes[ri(0,3)],
    texture:chance(.18)?'leaf':'flat',population:200,delivery,
    swirl:ri(0,100),momentum:ri(0,100),light:ri(0,100),
    lifespan:life,renderLimit:600
   }
  };
  return {seed,pattern:families[family],recipe};
 }
 return Object.freeze({VERSION:'047',families:Object.freeze(families.slice()),makeSeed,generate});
});
