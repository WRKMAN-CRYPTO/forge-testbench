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
check('Arc Bolt on a collision course is recognized from real Matter velocity',()=>{
 const shot={body:{labAlive:true,gameTag:'bolt',position:{x:430,y:305},velocity:{x:13,y:0}}};
 const danger=Brain.predictBolt({x:800,y:305},{x:0,y:0},32,shot);
 assert.ok(danger);assert.ok(danger.ticks>25&&danger.ticks<30);
 assert.ok(danger.miss<danger.reach);
});
check('near misses, stationary bolts, spent bolts and enemy embers are ignored',()=>{
 const at=(x,y,vx,vy,tag='bolt',alive=true)=>({body:{
   labAlive:alive,gameTag:tag,position:{x,y},velocity:{x:vx,y:vy}}});
 const pos={x:800,y:305},vel={x:0,y:0};
 assert.equal(Brain.predictBolt(pos,vel,32,at(430,400,13,0)),null);
 assert.equal(Brain.predictBolt(pos,vel,32,at(430,305,-13,0)),null);
 assert.equal(Brain.predictBolt(pos,vel,32,at(430,305,0,0)),null);
 assert.equal(Brain.predictBolt(pos,vel,32,at(430,305,13,0,'bolt',false)),null);
 assert.equal(Brain.predictBolt(pos,vel,32,at(430,305,13,0,'ember')),null);
});
check('threat evaluation considers multiple real incoming bolts',()=>{
 const b=(x,y,vx,vy)=>({body:{gameTag:'bolt',labAlive:true,
   position:{x,y},velocity:{x:vx,y:vy}}});
 const state={pos:{x:800,y:305},velocity:{x:0,y:0},radius:32,
   shots:[b(430,305,13,0),b(435,336,13,0)]};
 const threats=Brain.visibleBolts(state);
 assert.equal(threats.length,2);
 const choice=Brain.chooseDodge(Brain.make(store,0),state,threats,2.6);
 assert.ok(choice&&Number.isFinite(choice.risk));
 assert.ok(choice.dir.y<0,'move away from second bolt rather than into its corridor');
});
check('the boss own sixteen spells cannot hide incoming Arc Bolts',()=>{
 const own=Array.from({length:16},()=>({body:{gameTag:'ember',labAlive:true,
   position:{x:580,y:305},velocity:{x:-6,y:0}}}));
 const bolt={body:{gameTag:'bolt',labAlive:true,position:{x:430,y:305},
   velocity:{x:13,y:0}}};
 const detected=Brain.visibleBolts({pos:{x:800,y:305},velocity:{x:0,y:0},
   radius:32,shots:[...own,bolt]});
 assert.equal(detected.length,1,'same global projectile queue contains all enemies');
});
check('evasion requires perception and has no teleport, speed boost or invulnerability',()=>{
 const shot={body:{gameTag:'bolt',labAlive:true,position:{x:430,y:305},velocity:{x:13,y:0}}};
 const m=Brain.make(store,0),pos={x:800,y:305},base={pos,velocity:{x:0,y:0},
  radius:32,player:{x:300,y:305},health:.1,casts:[],shots:[shot],obstacles:[]};
 let launches=0,first=null,after=null;
 for(const t of [0,125,250,375,500]){
  const action=Brain.decide(m,{...base,time:t});
  if(t===0)first=action;
  if(action?.launch){launches++;after=action;assert.equal(m.state,'evade-bolt');}
 }
 assert.ok(first&&!first.launch,'cannot dodge before recognition delay');
 assert.equal(launches,1,'one physical sidestep per recognized threat');
 assert.equal(after.move.speed,2.25,'at low health retain prior slow base speed');
 assert.ok(m.boltThreats>=1);
});
check('physical dodge uses the original body and a normal-speed Matter velocity',()=>{
 const Mind=Brain.make(store,0);
 const shot={body:{gameTag:'bolt',labAlive:true,position:{x:430,y:305},velocity:{x:13,y:0}}};
 const p={x:800,y:305},body={position:p,velocity:{x:0,y:0},mass:2};
 let launches=0;
 const Body={setVelocity(b,v){launches++;b.velocity={...v}},
   applyForce(b,_,f){b.velocity.x+=f.x;b.velocity.y+=f.y}};
 const scene={player:{x:300,y:305},projectiles:[shot],craftedShots:[],craftedAura:null,
  actors:[],combat:{pillars:[],debris:[]},time:{now:0},burst(){},announceCombat(){}};
 const boss={id:1,alive:true,hp:1650,maxHP:1650,r:32,archivist:Mind,
  body,mindAt:0,mindIntent:null};
 for(const t of [0,125,250,375]){
  scene.time.now=t;Act.step(scene,boss,t,16.667,Body,()=>{});
 }
 assert.equal(launches,1,'only one physical velocity shift');
 assert.ok(Math.hypot(body.velocity.x,body.velocity.y)<=2.65,
  'normal movement speed capped; no supernatural dash');
 assert.equal(boss.hp,1650,'dodge never raises HP');
});
console.log('Archivist 060 checks passed: '+passed);
