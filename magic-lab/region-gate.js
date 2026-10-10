/* WRKMAN ARCANE LAB / 033 - THE FIRST GATE
 * Six ordered glyphs identify a REGION. A versioned seeded generator creates
 * its same five linked arenas at every visit. No Math.random, DOM or network.
 * Geography is canonical; explored history lives separately in a journal.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_REGIONS=api;
})(typeof globalThis==="object"?globalThis:null,function(){
 "use strict";
 const VERSION=1, HOME="000000";
 const GLYPHS=Object.freeze(["☼","◇","☽","✦","≋","△","⬡","✶"]);
 const ORIGIN=Object.freeze({x:254,y:305});
 const GATE=Object.freeze({x:128,y:300});
 const EXITS=Object.freeze([
  {x:254,y:-100,side:"N"},{x:785,y:305,side:"E"},
  {x:254,y:720,side:"S"},{x:-290,y:305,side:"W"}
 ]);
 const THEMES=Object.freeze([
  {name:"Moss",colors:[0x102d29,0x163a35,0x0a2426,0x142d36],line:0x5bbaa3,glow:0xa8e5b8},
  {name:"Ember",colors:[0x32272d,0x352c32,0x181d2d,0x242438],line:0xf1a073,glow:0xffd093},
  {name:"Frost",colors:[0x18303e,0x1b344b,0x142537,0x182e44],line:0x8dd8ed,glow:0xe2f8ff},
  {name:"Glass",colors:[0x192c3e,0x213b4b,0x111e2e,0x17293d],line:0xb5a3f5,glow:0xdcd2ff},
  {name:"Dusk",colors:[0x2b2539,0x302b3b,0x192138,0x212840],line:0xd3a5ba,glow:0xffd6e0},
  {name:"Tide",colors:[0x11353b,0x16424a,0x0c2537,0x112f40],line:0x65cee1,glow:0xc6f5e7}
 ]);
 const LABELS=["Sanctuary","Wildwood","Ruins","Caverns","Battlegrounds"];
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function valid(code){return typeof code==="string"&&/^[0-7]{6}$/.test(code);}
 function hash(code,salt=0){
  // Six base-8 digits are an unambiguous 18-bit address. Mixing is stable.
  let n=0;
  for(const c of code)n=(n<<3)|(c.charCodeAt(0)-48);
  let x=(n ^ Math.imul(VERSION,0x9e3779b1) ^ salt)>>>0;
  x=Math.imul(x^(x>>>16),0x85ebca6b)>>>0;
  x=Math.imul(x^(x>>>13),0xc2b2ae35)>>>0;
  return (x^(x>>>16))>>>0;
 }
 function random(seed){
  let state=seed>>>0;
  return ()=>{state=(state+0x6d2b79f5)>>>0;
   let t=state;t=Math.imul(t^(t>>>15),t|1);
   t^=t+Math.imul(t^(t>>>7),t|61);
   return ((t^(t>>>14))>>>0)/4294967296;
  };
 }
 function nameFor(theme,node,rng){
  const words=["Whispering","Forgotten","Shattered","Moonlit","Hollow","Ancient","Silent","Twilight","Wandering","Sunken","Luminous","Restless"];
  return node===0?"Arrival Sanctuary":words[Math.floor(rng()*words.length)]+" "+(node===1?"Wildwood":node===2?"Ruins":node===3?"Caverns":"Battle Grounds");
 }
 function neighbors(index){
  if(index===0)return [1,2,3,4];
  const prev=index===1?4:index-1,next=index===4?1:index+1;
  return [0,prev,next];
 }
 function sector(seed,index){
  if(!Number.isInteger(index)||index<0||index>4)throw Error("Invalid arena index");
  const rng=random((seed^Math.imul(index+1,0x9e3779b9))>>>0);
  const theme=THEMES[Math.floor(rng()*THEMES.length)];
  const pads=[],crate=[],pillar=[],debris=[],enemies=[];
  const items=index===0?9:15+Math.floor(rng()*8);
  // Spawn and all travel exits must stay clear. Fixed rejection budget.
  for(let i=0;i<items;i++){
   let x=0,y=0,ok=false;
   for(let tries=0;tries<28;tries++){
    const angle=rng()*Math.PI*2,radius=225+Math.sqrt(rng())*570;
    x=clamp(ORIGIN.x+Math.cos(angle)*radius,-660,1620);
    y=clamp(ORIGIN.y+Math.sin(angle)*radius*.75,-400,1000);
    if(Math.hypot(x-ORIGIN.x,y-ORIGIN.y)<215)continue;
    if(EXITS.some(exit=>Math.hypot(x-exit.x,y-exit.y)<115))continue;
    if(pads.some(p=>Math.hypot(x-p.x,y-p.y)<58))continue;
    ok=true;break;
   }
   if(!ok)continue;
   const r=13+Math.floor(rng()*17);
   pads.push({x,y,r,kind:Math.floor(rng()*3)});
  }
  // Moderate actual Matter object budgets, not every painted pebble physical.
  for(const p of pads){
   const r=rng();
   if(r<.19&&pillar.length<5)pillar.push({x:p.x,y:p.y});
   else if(r<.43&&crate.length<5)crate.push({x:p.x,y:p.y});
   else if(r<.70&&debris.length<6)debris.push({x:p.x,y:p.y,r:7+Math.floor(rng()*5)});
  }
  if(index!==0){
   // Distinct encounters seeded per arena, away from sanctuary/arrival.
   const count=2+Math.floor(rng()*3);
   const combatPads=pads.filter(p=>Math.hypot(p.x-ORIGIN.x,p.y-ORIGIN.y)>310);
   for(let i=0;i<count;i++){
    const p=combatPads[i%combatPads.length]||{x:650+i*70,y:280+i*50};
    enemies.push({type:rng()<.55?"wisp":"charger",x:p.x,y:p.y});
   }
  }
  return {index,name:nameFor(theme,index,rng),theme:theme.name,colors:theme.colors.slice(),
   line:theme.line,glow:theme.glow,pads,crate,pillar,debris,enemies,links:neighbors(index)};
 }
 function make(code){
  if(!valid(code))throw Error("A gate address requires six glyphs");
  const seed=hash(code),sectors=Array.from({length:5},(_,i)=>sector(seed,i));
  return {address:code,version:VERSION,seed,sectors};
 }
 function portals(region,index){
  const links=region.sectors[index].links;
  return links.map((to,i)=>({...EXITS[i],to,name:region.sectors[to].name}));
 }
 function drawFloor(g,arena,portals){
  const c=arena.colors;
  g.fillGradientStyle(c[0],c[1],c[2],c[3],1);
  g.fillRect(-860,-580,2680,1760);
  g.lineStyle(1,arena.line,.13);
  for(let x=-840;x<1820;x+=80)g.lineBetween(x,-580,x,1180);
  for(let y=-560;y<1180;y+=80)g.lineBetween(-860,y,1820,y);
  // Worn trails from the stable arrival point toward each connected exit.
  g.lineStyle(27,arena.line,.10);
  for(const exit of portals)g.lineBetween(ORIGIN.x,ORIGIN.y,exit.x,exit.y);
  g.fillStyle(arena.line,.09);g.fillCircle(ORIGIN.x,ORIGIN.y,190);
  g.lineStyle(3,arena.line,.52);g.strokeCircle(ORIGIN.x,ORIGIN.y,195);
  g.lineStyle(1,arena.glow,.32);g.strokeCircle(ORIGIN.x,ORIGIN.y,153);
  g.lineBetween(ORIGIN.x-130,ORIGIN.y,ORIGIN.x+130,ORIGIN.y);
  g.lineBetween(ORIGIN.x,ORIGIN.y-130,ORIGIN.x,ORIGIN.y+130);
  for(const item of arena.pads){
   g.fillStyle(item.kind===0?arena.line:arena.colors[1],item.kind===0?.14:.24);
   if(item.kind===2)g.fillRoundedRect(item.x-item.r,item.y-item.r,item.r*2,item.r*2,5);
   else g.fillCircle(item.x,item.y,item.r*1.7);
   g.lineStyle(2,item.kind===1?arena.glow:arena.line,.23);
   g.strokeCircle(item.x,item.y,item.r);
  }
  g.lineStyle(6,arena.line,.44);g.strokeRoundedRect(-800,-520,2560,1640,17);
  g.lineStyle(2,arena.glow,.34);
  for(const exit of portals){
   g.lineBetween(ORIGIN.x+(exit.x-ORIGIN.x)*.65,ORIGIN.y+(exit.y-ORIGIN.y)*.65,exit.x,exit.y);
  }
 }
 function drawPortal(g,portal,time){
  const x=portal.x,y=portal.y,beat=.5+.5*Math.sin(time*.003+portal.to);
  g.fillStyle(0x071722,.55);g.fillCircle(x,y,36);
  g.fillStyle(0x6fd7ef,.075+beat*.07);g.fillCircle(x,y,30);
  g.lineStyle(4,0x8cddf3,.65+beat*.25);g.strokeCircle(x,y,32);
  g.lineStyle(2,0xf4cf85,.74);g.strokeCircle(x,y,25);
  g.fillStyle(0xa9e9ee,.7);g.fillCircle(x,y,7+beat*4);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3+time*.00024;
   g.fillStyle(0xf4cf85,.75);g.fillCircle(x+Math.cos(a)*32,y+Math.sin(a)*32,2.5);
  }
 }
 function drawGate(g,time){
  const x=GATE.x,y=GATE.y,beat=.5+.5*Math.sin(time*.0025);
  g.fillStyle(0x020e1a,.58);g.fillCircle(x,y,55);
  g.lineStyle(7,0x7acde5,.8);g.strokeCircle(x,y,47);
  g.lineStyle(2,0xffd18b,.65+beat*.25);g.strokeCircle(x,y,39);
  g.fillStyle(0x83dbfa,.16+beat*.09);g.fillCircle(x,y,34);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4-Math.PI/2;
   g.fillStyle(0xf0c77c,.95);g.fillCircle(x+Math.cos(a)*47,y+Math.sin(a)*47,3);
  }
  g.fillStyle(0xeffbff,.7+beat*.25);g.fillCircle(x,y,8+beat*5);
 }
 return Object.freeze({VERSION,GLYPHS,HOME,ORIGIN,GATE,EXITS,valid,hash,make,neighbors,portals,drawFloor,drawPortal,drawGate});
});
