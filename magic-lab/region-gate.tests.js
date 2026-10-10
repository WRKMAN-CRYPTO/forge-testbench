/* WRKMAN ARCANE LAB 033 / First Gate deterministic region tests
 * node magic-lab/region-gate.tests.js
 */
"use strict";
const R=require("./region-gate.js");let total=0;
function assert(name,ok){if(!ok)throw Error("FAILED: "+name);total++;}
assert("generator version 1",R.VERSION===1);
assert("eight distinct glyphs",new Set(R.GLYPHS).size===8);
assert("valid six-position glyph address",R.valid("012345"));
for(const x of ["12345","0123456","00000a","888888","-12345",""])assert("reject invalid "+x,!R.valid(x));
assert("reject nonstring",!R.valid(null));
const a=R.make("012345"),b=R.make("012345"),c=R.make("012346");
assert("repeatable geography",JSON.stringify(a)===JSON.stringify(b));
assert("different addresses produce distinct seeds",a.seed!==c.seed);
assert("address is preserved",a.address==="012345");
assert("five sectors",a.sectors.length===5);
assert("arrival is sanctuary",a.sectors[0].name==="Arrival Sanctuary");
assert("sanctuary has no enemy",a.sectors[0].enemies.length===0);
assert("four connected neighbors",a.sectors[0].links.length===4);
for(let i=0;i<5;i++){
 const sec=a.sectors[i],portals=R.portals(a,i);
 assert("sector index "+i,sec.index===i);
 assert("valid palette "+i,sec.colors.length===4&&sec.colors.every(Number.isFinite));
 assert("portals match links "+i,portals.length===sec.links.length);
 assert("no duplicate links "+i,new Set(sec.links).size===sec.links.length);
 for(const target of sec.links){
  assert("link reachable "+i+"->"+target,target>=0&&target<5&&target!==i);
  assert("bidirectional "+i+"->"+target,a.sectors[target].links.includes(i));
 }
 assert("seeded geometric decorations "+i,sec.pads.length>=7);
 assert("encounter budget "+i,sec.enemies.length<=4&&sec.pillar.length<=5&&sec.crate.length<=5);
 assert("clear spawn "+i,sec.pads.every(p=>Math.hypot(p.x-R.ORIGIN.x,p.y-R.ORIGIN.y)>210));
 for(const portal of portals){
  assert("portal has finite coordinates "+i,Number.isFinite(portal.x)&&Number.isFinite(portal.y));
  assert("portal avoids spawn "+i,Math.hypot(portal.x-R.ORIGIN.x,portal.y-R.ORIGIN.y)>320);
  assert("clear portals "+i,sec.pads.every(p=>Math.hypot(p.x-portal.x,p.y-portal.y)>110));
 }
}
for(const code of ["000000","777777","123456","065432","716230","014725"]){
 const z=R.make(code),other=R.make(code);
 assert("repeatable across arbitrary addresses "+code,JSON.stringify(z)===JSON.stringify(other));
 for(let i=1;i<5;i++)assert("each path has return route "+code+"/"+i,z.sectors[i].links.includes(0));
}
let brushOps=0;
const gfx=new Proxy({},{get(){return (...args)=>{brushOps++;return gfx;}}});
R.drawFloor(gfx,a.sectors[0],R.portals(a,0));
for(const dest of R.portals(a,0))R.drawPortal(gfx,dest,12345);
R.drawGate(gfx,12345);
assert("render uses bounded graphics calls",brushOps>50&&brushOps<800);
console.log("Region Gate 033: "+total+" tests passed");
