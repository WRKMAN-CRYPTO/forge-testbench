/* WANDRUNE 058 | Convergence rune regression checks
 * node magic-lab/swarm-runes.tests.js
 * Run without Phaser, DOM, or any multiplayer backend.
 */
"use strict";
const R=require("./swarm-runes.js");
const assert=require("node:assert/strict");
const blank=()=>Array(1024).fill(0);
const agent=(x,y,element=3,extra={})=>({
 x,y,prevX:x,prevY:y,vx:0,vy:0,element,seed:x*99,tail:[],...extra
});
const cast=(agents,runes=blank())=>({
 recipe:{runes},agents,delivery:"placed",
 scale:300,worldW:360,worldH:500,center:{x:0,y:0},born:0,runeCount:0
});
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log("✓ "+name)};
test("stable rune IDs and new validation",()=>{
 assert.equal(R.VERSION,"058");
 assert.equal(R.TYPES.length,7);
 assert.equal(R.byId(5).key,"phase");
 assert.equal(R.byId(6).key,"convergence");
 assert.equal(R.normalize([...Array(1023).fill(0),6])[1023],6);
 assert.throws(()=>R.normalize([...Array(1023).fill(0),7]));
 assert.equal(R.normalize(null).length,1024);
});
test("only source cells painted with Convergence teach it",()=>{
 const runes=blank(),index=R.tile(.25,.25);runes[index]=6;
 const a=agent(.25,.25),b=agent(.50,.50);a.sourceIndex=index;b.sourceIndex=R.tile(b.x,b.y);
 const st=cast([a,b],runes);R.configure(st);R.onBirth(st);
 assert.equal(a.convergence,true);assert.equal(b.convergence,undefined);
 assert.equal(st.agents.length,2);
});
test("swept rune crossing teaches even fast agents",()=>{
 const runes=blank();runes[R.tile(.5,.5)]=6;
 const a=agent(.52,.5,3,{prevX:.48});
 const st=cast([a],runes);R.configure(st);
 R.advance(st,{combat:{enemies:[]}},2000,1/60);
 assert.equal(a.convergence,true);
});
test("idle pair of frost agents converge without fusing",()=>{
 const a=agent(.2,.5,3,{convergence:true}),b=agent(.8,.5,3,{convergence:true});
 const st=cast([a,b]);st.runeCount=1;
 R.advance(st,{combat:{enemies:[]}},2000,1/60);
 assert.ok(a.vx>0);assert.ok(b.vx<0);
 assert.equal(st.converging,2);assert.equal(st.agents.length,2);
 assert.equal(R.mass(a)+R.mass(b),2);
});
test("a solo rune bearer cannot recruit unmarked agents",()=>{
 const a=agent(.2,.5,3,{convergence:true}),b=agent(.8,.5,3);
 const st=cast([a,b]);st.runeCount=1;
 R.advance(st,{combat:{enemies:[]}},2000,1/60);
 assert.equal(a.vx,0);assert.equal(b.vx,0);assert.equal(st.converging,0);
});
test("different elements never cross-attract",()=>{
 const a=agent(.2,.5,3,{convergence:true}),b=agent(.8,.5,1,{convergence:true});
 const st=cast([a,b]);st.runeCount=1;
 R.advance(st,{combat:{enemies:[]}},2000,1/60);
 assert.equal(a.vx,0);assert.equal(b.vx,0);assert.equal(st.converging,0);
});
test("Seeker wins while a live enemy is within range",()=>{
 const a=agent(.2,.5,3,{convergence:true,seekUntil:5000});
 const b=agent(.8,.5,3,{convergence:true});
 const st=cast([a,b]);st.runeCount=1;
 R.advance(st,{combat:{enemies:[{alive:true,body:{position:{x:-130,y:0}}}]}},2000,1/60);
 assert.ok(a.vx<0,"hunter still steers to enemy");
 assert.equal(a.converging,false);
 assert.equal(st.converging,0,"inactive partner does not pull hunter away");
});
test("a dead or lost target permits regrouping",()=>{
 const a=agent(.2,.5,3,{convergence:true,seekUntil:5000});
 const b=agent(.8,.5,3,{convergence:true,seekUntil:5000});
 const st=cast([a,b]);st.runeCount=1;
 R.advance(st,{combat:{enemies:[{alive:false,body:{position:{x:-130,y:0}}}]}},2000,1/60);
 assert.equal(st.converging,2);
});
test("Seeker expiration also permits regrouping",()=>{
 const a=agent(.2,.5,3,{convergence:true,seekUntil:500});
 const b=agent(.8,.5,3,{convergence:true,seekUntil:500});
 const st=cast([a,b]);st.runeCount=1;
 R.advance(st,{combat:{enemies:[]}},2000,1/60);
 assert.equal(st.converging,2);
});
test("Behemoth transfers learned Convergence on actual merge",()=>{
 const a=agent(.2,.5,3),b=agent(.25,.5,3,{convergence:true});
 R.combine(a,b);
 assert.equal(a.convergence,true);assert.equal(R.mass(a),2);
});
test("Fracture inherits Convergence but conserves represented mass",()=>{
 const a=agent(.2,.5,3,{convergence:true,mass:50});
 const pieces=R.fracture(a);
 assert.equal(pieces.length,4);
 assert.ok(pieces.every(p=>p.convergence));
 assert.equal(pieces.reduce((n,p)=>n+R.mass(p),0),50);
});
test("large 6000-agent field remains 6000 physical agents",()=>{
 const population=Array.from({length:6000},(_,i)=>
  agent(.1+(i%100)*.008,.1+Math.floor(i/100)*.012,3,{convergence:true}));
 const st=cast(population);st.runeCount=1;
 R.advance(st,{combat:{enemies:[]}},2000,1/60);
 assert.equal(st.agents.length,6000);assert.ok(st.converging>0);
});
console.log("Wandrune 058 Convergence checks passed:",passed);
