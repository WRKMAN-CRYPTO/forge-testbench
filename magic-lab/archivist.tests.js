/* WANDRUNE 059 | Archivist deterministic regression suite.
 * Run: node magic-lab/archivist.tests.js
 */
'use strict';
const assert=require('node:assert/strict');
const Regions=require('./region-gate.js');
const Brain=require('./archivist-mind.js');
const Act=require('./archivist-combat.js');
let passed=0;
function check(label,fn){fn();passed++;console.log('✓ '+label);}
const files=new Map(),store={getItem:k=>files.get(k)||null,setItem:(k,v)=>files.set(k,v)};
const player=(x,y)=>({x,y});
check('reserved six glyph address names unique archive',()=>{
 assert.equal(Brain.ADDRESS,Regions.ARCHIVE_ADDRESS);
 assert.equal(Regions.valid(Brain.ADDRESS),true);
 assert.deepEqual(Brain.ADDRESS.split('').map(x=>Regions.GLYPHS[Number(x)]),['✶','☽','◇','✦','⬡','☼']);
 const gate=Regions.make(Brain.ADDRESS);
 assert.equal(gate.sectors.length,5);assert.equal(gate.sectors[0].enemies.length,0);
 assert.equal(gate.sectors[4].archivist,true);
 assert.deepEqual(gate.sectors[4].enemies.map(x=>x.type),['archivist']);
 assert.ok(Regions.portals(gate,0).some(p=>p.to===4));
});
check('nonreserved generator unchanged and stable',()=>{
 const a=Regions.make('123456'),b=Regions.make('123456');
 assert.deepEqual(a,b);assert.equal(a.special,null);
 assert.notEqual(a.sectors[4].name,'The Living Archive');
 assert.equal(a.version,1);
});
check('no information needed from spell rune layout',()=>{
 const m=Brain.make(store,0),a={x:.5,y:.5,element:3};
 const recipe=new Proxy({}, {get(){throw Error('cheating by reading rune layout')}});
 const cast={agents:[a],recipe,delivery:'placed',scale:260,center:player(880,305)};
 Brain.observe(m,{time:400,pos:player(880,305),player:player(440,305),casts:[cast]});
 assert.ok(m.seen.element[1]>0);
});
check('nearby ice clusters trigger actual movement avoidance',()=>{
 const m=Brain.make(store,0),agents=Array.from({length:50},(_,i)=>
  ({x:.44+((i%5)/140),y:.48+((i%6)/150),element:3}));
 const cast={agents,delivery:'placed',scale:260,center:player(780,305)};
 const outcome=Brain.decide(m,{time:550,pos:player(780,305),player:player(350,310),casts:[cast],shots:[]});
 assert.ok(m.pressure.count>1);
 assert.ok(Number.isFinite(outcome.move.x)&&Number.isFinite(outcome.move.y));
 assert.equal(m.state,'evade-swarm');
});
check('mutated spells have finite physical trajectories',()=>{
 const m=Brain.make(store,0),names=new Set();
 for(let i=0;i<45;i++){
  const p=Brain.invent(m);
  names.add(p.name);
  const angles=Brain.planDirections(m,p,player(800,300),player(360,300));
  assert.equal(angles.length,p.count);
  assert.ok(angles.every(Number.isFinite));
  assert.ok(angles.length<=6);
  assert.ok(['arcane','frost','fire','lightning'].includes(p.element));
 }
 assert.ok(names.size>=8,'must synthesize more than a few fixed moves');
});
check('telegraphed feints freeze observed position, not future input',()=>{
 const m=Brain.make(store,0),pos=player(885,305);
 let got=null;
 for(let time=2500;time<6000;time+=125){
  const result=Brain.decide(m,{time,pos,player:player(300+time*.01,310),casts:[],shots:[]});
  if(result?.tell){got=result.tell;break;}
 }
 assert.ok(got);assert.ok(Number.isFinite(got.tellTarget.x));
 assert.ok(Number.isFinite(got.tellTarget.y));
});
check('stored observations survive defeat, but memory is faded and bounded',()=>{
 const m=Brain.make(store,0);
 m.seen.element[1]=12;m.seen.dodges[0]=6;
 m.lastPlan=Brain.invent(m);Brain.onHit(m,{motif:m.lastPlan.motif,element:m.lastPlan.element});
 assert.equal(Brain.remember(m,'defeat'),true);
 assert.equal(Brain.remember(m,'defeat'),false,'no double count');
 const next=Brain.make(store,5000);
 assert.equal(next.prior.defeats,1);
 assert.equal(next.prior.encounters,1);
 assert.ok(next.prior.element[1]>0&&next.prior.element[1]<12);
 assert.equal(next.prior.plans.length,1);
});
check('disengaging without death also remembers an encounter',()=>{
 const m=Brain.make(store,20);m.seen.dodges[1]=3;
 assert.equal(Brain.remember(m,'retreat'),true);
 assert.equal(Brain.make(store,30).prior.encounters,2);
});
check('physical projectiles capped and stay Matter bodies',()=>{
 const launched=[],objects=[];
 const Body={setVelocity(b,v){b.velocity=v},applyForce(b,p,f){b.velocity.x+=f.x*300;b.velocity.y+=f.y*300}};
 const s={time:{now:4000},player:player(300,300),projectiles:[],combat:{enemies:[]},
  matter:{add:{circle(x,y,r){const b={position:player(x,y),velocity:player(0,0),mass:2};objects.push(b);return b}}},
  burst(){},announceCombat(){}};
 const e={id:10,alive:true,hp:1650,maxHP:1650,r:32,body:{position:player(885,305),velocity:player(0,0),mass:2},
  archivist:Brain.make(store,0),mindAt:0,mindIntent:null};
 s.combat.enemies=[e];
 const plan=Brain.invent(e.archivist);
 assert.equal(Act.fire(s,e,plan,Body),true);
 assert.ok(s.projectiles.length>0);
 assert.ok(s.projectiles.every(p=>p.body.gameTag==='ember'&&p.body.archive&&
   Number.isFinite(p.body.velocity.x)));
 for(let i=0;i<5;i++)Act.fire(s,e,plan,Body);
 assert.ok(s.projectiles.filter(p=>p.body.archive).length<=16);
 const before=e.archivist.successes;
 Act.projectileHit(s,s.projectiles[0].body);
 assert.equal(e.archivist.successes,before+1);
});
console.log('Archivist 059 checks passed: '+passed);
