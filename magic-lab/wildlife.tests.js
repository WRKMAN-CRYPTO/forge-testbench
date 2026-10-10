/* WRKMAN ARCANE LAB 031 / Wildlife deterministic regression tests
 * node magic-lab/wildlife.tests.js
 */
"use strict";
const W=require("./wildlife.js");
let total=0;
function expect(label,condition){if(!condition)throw Error("FAILED: "+label);total++;}
const empty={player:{x:254,y:305},motions:[],thermals:[],lights:[],shocks:[],forces:[],obstacles:[]};
const start=W.reset(),copy=W.reset();
expect("18 bounded creatures",W.MAX===18&&start.creatures.length===18);
expect("seed repeatable",JSON.stringify(start.creatures)===JSON.stringify(copy.creatures));
expect("eight ants",W.snapshot(start).ants===8);
expect("five pillbugs",W.snapshot(start).pillbugs===5);
expect("five moths",W.snapshot(start).moths===5);
W.step(start,empty,80,80);
expect("80ms tick advances once",start.steps===1);
for(let t=160;t<=32000;t+=80)W.step(start,empty,t,80);
expect("quiet creatures explore",start.creatures.filter((a,i)=>Math.hypot(a.x-copy.creatures[i].x,a.y-copy.creatures[i].y)>5).length>12);
expect("population never grows",start.creatures.length===W.MAX);
expect("positions finite",start.creatures.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)));
const ants=W.reset(),ant=ants.creatures[0];
ant.x=100;ant.y=100;ant.alarm=0;
W.step(ants,{...empty,motions:[{x:109,y:100,speed:10,range:90}]},1000,80);
expect("motion startles ant",ant.alarm>.4);
expect("ant flees away from motion",ant.fleeX<0);
const bugs=W.reset(),bug=bugs.creatures.find(a=>a.type==="pillbug");
bug.x=100;bug.y=100;
W.step(bugs,{...empty,motions:[{x:108,y:103,speed:13,range:90}]},1000,80);
expect("pillbug curls",bug.curlUntil>1000);
const pulled=W.reset(),roll=pulled.creatures.find(a=>a.type==="pillbug");
roll.x=100;roll.y=100;
W.step(pulled,{...empty,forces:[{x:170,y:100,radius:180,strength:2}]},1000,80);
expect("motion force accelerates pillbug",roll.vx>0);
expect("force makes pillbug curl",roll.curlUntil>1000);
const moths=W.reset(),moth=moths.creatures.find(a=>a.type==="moth");
moth.x=100;moth.y=100;moth.heading=0;moth.turnAt=Infinity;
for(let t=100;t<1200;t+=80)W.step(moths,{...empty,thermals:[{x:190,y:100,radius:35,heat:.45}]},t,80);
expect("moth investigates gentle warmth",moth.x>100);
const scorched=W.reset(),hotMoth=scorched.creatures.find(a=>a.type==="moth");
hotMoth.x=100;hotMoth.y=100;
W.step(scorched,{...empty,thermals:[{x:108,y:102,radius:65,heat:1}]},1000,80);
expect("extreme heat scares moth",hotMoth.alarm>.7);
const cold=W.reset(),normal=W.reset(),c=cold.creatures[0],n=normal.creatures[0];
c.x=n.x=95;c.y=n.y=90;c.heading=n.heading=0;c.turnAt=n.turnAt=Infinity;
for(let t=100;t<1800;t+=80){
 W.step(cold,{...empty,thermals:[{x:95,y:90,radius:450,heat:-.9}]},t,80);
 W.step(normal,empty,t,80);
}
expect("frost impairs movement",Math.hypot(c.vx,c.vy)<Math.hypot(n.vx,n.vy)*.85);
const disturbed=W.reset(),d=disturbed.creatures[0];
d.x=120;d.y=100;
W.step(disturbed,{...empty,shocks:[{x:100,y:100,radius:110,strength:1}]},1000,80);
expect("physical shock startles ant",d.alarm>.6);
const crowd=W.reset(),one=crowd.creatures[0],two=crowd.creatures[1];
one.x=100;one.y=100;one.alarm=.9;two.x=125;two.y=105;two.alarm=0;two.nextRelayAt=0;
for(let i=2;i<8;i++){crowd.creatures[i].x=1500;crowd.creatures[i].y=700;}
W.step(crowd,{...empty,player:{x:400,y:400}},1000,80);
expect("panic spreads through near ants",two.alarm>.4);
const distant=W.reset();distant.creatures[0].x=-400;distant.creatures[0].y=-400;
W.step(distant,{...empty,player:{x:1320,y:720}},1000,80);
expect("distant population renews",distant.recycled>0);
expect("relocation does not duplicate creatures",distant.creatures.length===18);
expect("world boundaries respected",distant.creatures.every(a=>a.x>=-782&&a.x<=1742&&a.y>=-502&&a.y<=1102));
let draws=0;
const gfx=new Proxy({},{get(){return ()=>{draws++;return gfx}}});
expect("tiny creatures visible",W.paint(start,gfx,20000,empty.player)>0);
expect("limited low-pixel rendering",draws<18*28);
expect("no spells or enemies in world module",!/bolt|detonate|spell|damage|hitEnemy|healthbar/i.test(require("fs").readFileSync(__dirname+"/wildlife.js","utf8").replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"")));
console.log("Wildlife 031: "+total+" tests passed");
