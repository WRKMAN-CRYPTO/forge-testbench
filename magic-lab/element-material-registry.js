/* WANDRUNE 069 | Element Material Registry
 * Visual descriptors only. NEVER alters agent birth, collisions, damage,
 * mass, movement, rune instructions, or the physics simulation.
 * Add a material via registerElement; add a visual-only effect via
 * registerEffect({key,draw(g,opts)}). No renderer changes are required.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_MATERIAL_REGISTRY=api;
})(typeof globalThis==="object"?globalThis:null,function(){
 "use strict";
 const elements=new Map(),names=new Map(),effects=new Map();
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
 const isColor=x=>Number.isInteger(x)&&x>=0&&x<=0xffffff;
 const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
 function registerElement(input){
  if(!input||!Number.isInteger(input.id)||input.id<0||input.id>255||input.id===5)
   throw Error("Material ID must be 0–255, except reserved source ID 5");
  if(!/^[a-z][a-z0-9-]*$/.test(input.key||""))throw Error("Invalid material key");
  if(elements.has(input.id)||names.has(input.key))throw Error("Material already registered");
  if(!isColor(input.rgb)||!isColor(input.glow))throw Error("RGB and glow must be 24-bit colors");
  for(const c of ["center","mid","edge"]){
   if(typeof input[c]!=="string"||!/^#[\da-f]{6}$/i.test(input[c]))
    throw Error("Material "+c+" must be a hex color");
  }
  const m=Object.freeze({
   ...input,
   shape:input.shape||"faceted",mote:input.mote||"spark",
   light:!!input.light,lightPriority:finite(input.lightPriority,0),
   haloSize:clamp(input.haloSize??105,40,118),
   haloAlpha:clamp(input.haloAlpha??.42,0,.53)
  });
  elements.set(m.id,m);names.set(m.key,m);
  return m;
 }
 function element(input){
  return typeof input==="string"?names.get(input)||elements.get(0):
    elements.get(input)||elements.get(0);
 }
 function registerEffect(input){
  if(!input||!/^[a-z][a-z0-9-]*$/.test(input.key||"")||
     typeof input.draw!=="function")throw Error("Effect requires a key and draw(g,opts)");
  if(effects.has(input.key))throw Error("Effect already registered");
  const entry=Object.freeze({key:input.key,draw:input.draw});
  effects.set(entry.key,entry);return entry;
 }
 function paintEffect(g,opts){
  const def=effects.get(opts?.effect);
  if(!def||!g||!opts)return false;
  def.draw(g,opts);return true;
 }
 function rgbToHex(rgb){return "#"+rgb.toString(16).padStart(6,"0")}
 const materialDefaults=[
  {id:0,key:"arcane",rgb:0xb7a4ff,glow:0xb7a4ff,center:"#ffffff",mid:"#cfbcff",edge:"#7055a4",shape:"faceted",mote:"rune"},
  {id:1,key:"fire",rgb:0xffa347,glow:0xff7c29,center:"#fffce0",mid:"#ffcf62",edge:"#b83f26",shape:"ember",mote:"ember",light:true,lightPriority:1},
  {id:2,key:"water",rgb:0x61d7fb,glow:0x56ccec,center:"#ffffff",mid:"#71e7ff",edge:"#277ca2",shape:"liquid",mote:"droplet"},
  {id:3,key:"frost",rgb:0xb6ecff,glow:0xa2eaff,center:"#ffffff",mid:"#bff2ff",edge:"#467fa8",shape:"crystal",mote:"crystal"},
  {id:4,key:"lightning",rgb:0xffed9a,glow:0xa9e5ff,center:"#ffffff",mid:"#f3faff",edge:"#408de8",shape:"conductor",mote:"arc",light:true,lightPriority:3}
 ];
 for(const d of materialDefaults)registerElement(d);
 // Existing game effects. They are visual adapters, not new birth elements.
 registerEffect({key:"gravity",draw(g,o){
  const x=o.x,y=o.y,r=Math.max(8,finite(o.r,55)),t=finite(o.time,0);
  const alpha=clamp(o.alpha??.7),p=clamp(o.progress??.4);
  const n=3;
  g.fillStyle(0x6646bc,.10*alpha);
  g.fillCircle(x,y,r*.58);
  for(let i=0;i<n;i++){
   const phase=t*.0013*(i%2?-1:1)+i*2.1;
   const dist=r*(.42+.17*i);
   g.lineStyle(1.1+i*.2,i%2?0xc6b5ff:0x9874f0,(.35+.23*p)*alpha);
   g.beginPath();
   g.arc(x,y,dist,phase,phase+Math.PI*1.1);
   g.strokePath();
  }
  g.fillStyle(0xe2d1ff,.45*alpha);g.fillCircle(x,y,3.5);
 }});
 registerEffect({key:"explosion",draw(g,o){
  const x=o.x,y=o.y,r=Math.max(6,finite(o.r,60)),p=clamp(o.progress??.5);
  const f=(1-p)*clamp(o.alpha??1),size=r*(.25+.83*Math.sqrt(p));
  const col=isColor(o.color)?o.color:0xffa44e;
  g.lineStyle(2.8*(1-p)+.7,col,.82*f);g.strokeCircle(x,y,size);
  g.lineStyle(1.2,0xffefd1,.7*f);g.strokeCircle(x,y,size*.65);
  for(let i=0;i<9;i++){
   const a=i*Math.PI*2/9+o.x*.03,p1=size*.56,p2=size*(.87+(i%3)*.10);
   g.lineStyle(1+i%2*.6,i%3?col:0xffefbd,.68*f);
   g.lineBetween(x+Math.cos(a)*p1,y+Math.sin(a)*p1,x+Math.cos(a)*p2,y+Math.sin(a)*p2);
  }
 }});
 registerEffect({key:"healing",draw(g,o){
  const x=o.x,y=o.y,r=Math.max(7,finite(o.r,42)),p=clamp(o.progress??.4),fade=(1-p)*clamp(o.alpha??1);
  g.lineStyle(2,0x8af5b5,.76*fade);g.strokeCircle(x,y,r*(.35+.8*p));
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+finite(o.time,0)*.00075,dist=r*(.36+.57*p);
   const px=x+Math.cos(a)*dist,py=y+Math.sin(a)*dist;
   g.fillStyle(i%2?0x9af9c8:0xe2ffe1,.79*fade);
   g.fillCircle(px,py,Math.max(.5,2.6*(1-p)));
   if(i%2===0){g.lineStyle(.85,0xb5ffd0,.6*fade);
    g.lineBetween(px-2,py,px+2,py);g.lineBetween(px,py-2,px,py+2);}
  }
 }});
 return Object.freeze({VERSION:"069",registerElement,element,elements:()=>[...elements.values()],
  registerEffect,effect:key=>effects.get(key)||null,effects:()=>[...effects.keys()],
  paintEffect,rgbToHex});
});
