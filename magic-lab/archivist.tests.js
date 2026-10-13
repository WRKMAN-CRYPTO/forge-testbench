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
check('new tactics are learned variants, not extra base projectiles',()=>{
 const m=Brain.make(store,0);m.attacks=3;m.seen.dodges=[2,7];
 const types=new Set();
 for(let i=0;i<120;i++){
  const p=Brain.invent(m);types.add(p.tactic);
  assert.ok(Brain.TACTICS.includes(p.tactic));
  assert.ok(p.count>=3&&p.count<=6);
  assert.ok(p.speed<=8);
 }
 assert.ok(types.has('probe')&&types.has('herd')&&types.has('bait'),
   'an experienced mind explores all three strategies');
});
check('opening gambit reserves rather than duplicates its projectile budget',()=>{
 const m=Brain.make(store,0);m.seen.dodges=[0,5];
 const plan={element:'frost',motif:'fan',tactic:'bait',count:5,spread:.5,
  speed:6.6,lead:false,feint:true,tellTarget:{x:420,y:260}};
 const first=Brain.openingPlan(m,plan,2000,{x:430,y:305});
 assert.equal(first.stage,'opening');assert.equal(first.count,3);
 assert.equal(m.pending.remaining,2);assert.ok(first.angleBias<0);
 assert.deepEqual(first.target,{x:420,y:260},'locked windup aim');
 m.lastPlayer={x:430,y:340,vx:0,vy:170};
 const second=Brain.followupPlan(m,{time:2750,pos:{x:800,y:305},player:{x:430,y:340}});
 assert.equal(second.stage,'followup');
 assert.equal(second.count,2);
 assert.equal(first.count+second.count,plan.count);
 assert.equal(m.pending,null);
 assert.ok(second.target.y>340,'the learned response is based on post-volley movement');
});
check('a tactical attack executes two physical volleys with original damage',()=>{
 const m=Brain.make(store,0);
 const plan={element:'fire',motif:'pincer',tactic:'herd',count:4,spread:.65,
  speed:6.6,lead:false,feint:false,tellTarget:{x:330,y:305},name:'Mirror of Cinders'};
 const first=Brain.openingPlan(m,plan,1500,{x:330,y:305});
 m.lastPlayer={x:325,y:380,vx:0,vy:175};
 const reply=Brain.followupPlan(m,{time:2250,pos:{x:800,y:305},player:{x:325,y:380}});
 const Body={setVelocity(b,v){b.velocity=v}};
 const scene={time:{now:1500},player:{x:330,y:305},projectiles:[],
  matter:{add:{circle(x,y){return {position:{x,y},velocity:{x:0,y:0}}}}},
  burst(){},announceCombat(){}};
 const boss={alive:true,id:12,body:{position:{x:800,y:305}},archivist:m};
 assert.equal(Act.fire(scene,boss,first,Body),true);
 scene.time.now=2250;
 assert.equal(Act.fire(scene,boss,reply,Body),true);
 assert.equal(scene.projectiles.length,4,'same total count as a single cast');
 assert.equal(scene.projectiles.filter(p=>p.body.archive.stage==='opening').length,2);
 assert.equal(scene.projectiles.filter(p=>p.body.archive.stage==='followup').length,2);
 assert.ok(scene.projectiles.every(p=>p.body.archive.damage===13&&
   p.body.archive.tactic==='herd'));
});
check('an observed response influences follow-up, but can be deliberately inverted',()=>{
 const plan={element:'arcane',motif:'lance',tactic:'bait',count:3,spread:.11,
  speed:8,tellTarget:{x:400,y:300}};
 const baseline={x:400,y:300},observer={x:800,y:300};
 const left=Brain.make(store,0);left.seen.dodges=[0,5];
 Brain.openingPlan(left,plan,100,baseline);
 left.lastPlayer={x:400,y:200,vx:0,vy:-180};
 const leftResult=Brain.followupPlan(left,{time:850,pos:observer,player:{x:400,y:200}});
 const right=Brain.make(store,0);right.seen.dodges=[0,5];
 Brain.openingPlan(right,plan,100,baseline);
 right.lastPlayer={x:400,y:400,vx:0,vy:180};
 const rightResult=Brain.followupPlan(right,{time:850,pos:observer,player:{x:400,y:400}});
 assert.ok(leftResult.target.y<baseline.y&&rightResult.target.y>baseline.y,
  'changing actual movement changes the guessed landing zone');
});
check('success scores store tactical identity across defeats and old saves remain compatible',()=>{
 const key=Brain.KEY;
 const storage={data:null,getItem(){return this.data},setItem(k,v){this.data=v}};
 const m=Brain.make(storage,0);
 m.lastPlan={motif:'fan',element:'lightning',tactic:'bait'};
 Brain.onHit(m,{motif:'fan',element:'lightning',tactic:'bait'});
 assert.equal(Brain.remember(m,'defeat'),true);
 const next=Brain.make(storage,0);
 assert.ok(next.prior.plans.some(x=>x.tactic==='bait'&&x.score>0));
 const previous=JSON.parse(storage.data);
 previous.plans=[{motif:'fan',element:'lightning',lead:false,feint:false,score:1}];
 storage.data=JSON.stringify(previous);
 assert.equal(Brain.make(storage,0).prior.plans[0].tactic,'probe');
});
check('no tactical casts circumvent stun, real bolt dodges, or existing attack cooldown',()=>{
 const m=Brain.make(store,0);
 m.held={element:'frost',motif:'lance',tactic:'herd',count:3,
  spread:.11,speed:8,lead:false,feint:false,name:'Needle of Glass',
  tellTarget:{x:330,y:305}};
 m.until=1000;
 const at=t=>Brain.decide(m,{time:t,pos:{x:800,y:305},velocity:{x:0,y:0},
  player:{x:330,y:305},health:.6,casts:[],shots:[],obstacles:[]});
 const opening=at(1000);
 assert.ok(opening?.release&&opening.release.stage==='opening');
 const afterFirst=m.attackAt;
 assert.ok(afterFirst>1000+2100);
 assert.equal(at(1500)?.release,undefined);
 const reply=at(1750);
 assert.ok(reply?.release&&reply.release.stage==='followup');
 assert.equal(m.attacks,1,'followup did not count as another cast');
 assert.equal(m.attackAt,afterFirst,'followup did not shorten attack cooldown');
});
check('normal spell charge shortened 75%, releasing on intended frame',()=>{
 let m=null,result=null;
 for(let seed=1;seed<=80;seed++){
  m=Brain.make(store,0);m.seed=seed;m.attackAt=0;
  result=Brain.decide(m,{time:1000,pos:{x:800,y:305},player:{x:330,y:305},casts:[],shots:[]});
  if(result?.tell&&!result.tell.feint)break;
 }
 assert.ok(result?.tell&&!result.tell.feint);
 assert.equal(m.until,1168,'670ms quarter rounded to 168ms');
 assert.equal(Brain.decide(m,{time:1167,pos:{x:800,y:305},player:{x:330,y:305},casts:[],shots:[]})?.release,undefined);
 assert.ok(Brain.decide(m,{time:1168,pos:{x:800,y:305},player:{x:330,y:305},casts:[],shots:[]})?.release,
  'charge release must not wait for next scheduled cognition tick');
});
check('deceptive spell charge shortened 75%, without cooldown changes',()=>{
 let m=null,result=null;
 for(let seed=1;seed<=240;seed++){
  m=Brain.make(store,0);m.seed=seed;m.attackAt=0;
  result=Brain.decide(m,{time:1000,pos:{x:800,y:305},player:{x:330,y:305},casts:[],shots:[]});
  if(result?.tell&&result.tell.feint)break;
 }
 assert.ok(result?.tell?.feint);
 assert.equal(m.until,1270,'1080ms quarter = 270ms');
 assert.equal(Brain.decide(m,{time:1269,pos:{x:800,y:305},player:{x:330,y:305},casts:[],shots:[]})?.release,undefined);
 const released=Brain.decide(m,{time:1270,pos:{x:800,y:305},player:{x:330,y:305},casts:[],shots:[]});
 assert.ok(released?.release);
 assert.ok(m.attackAt-1270>=2250,'original post-cast cooldown preserved');
});
check('real combat adapter bypasses 120ms poll barrier at charge completion',()=>{
 const body={position:{x:800,y:305},velocity:{x:0,y:0},mass:2},m=Brain.make(store,0);
 m.attackAt=0;
 const b={alive:true,id:12,hp:1650,maxHP:1650,r:32,archivist:m,
  body,mindAt:0,mindIntent:null};
 const launches=[];
 const Body={setVelocity(o,v){o.velocity=v},applyForce(){}};
 const scene={time:{now:1000},player:{x:330,y:305},projectiles:[],craftedShots:[],craftedAura:null,
  combat:{pillars:[],debris:[]},actors:[],matter:{add:{circle(x,y){return{position:{x,y},velocity:{x:0,y:0}}}}},
  burst(){},announceCombat(label){launches.push({at:scene.time.now,label})}};
 // Force a normal (non-deceptive) opening to isolate schedule timing.
 const original=Brain.invent(m);
 m.held={...original,feint:false,tellTarget:{x:330,y:305}};
 m.until=1168;m.nextThink=1125;m.attackAt=3400;b.mindAt=1120;
 scene.time.now=1167;Act.step(scene,b,1167,16.667,Body,()=>{});
 assert.equal(launches.length,0);
 scene.time.now=1168;Act.step(scene,b,1168,16.667,Body,()=>{});
 assert.equal(launches.length,1,'projectiles release without waiting for 120ms polling');
 assert.equal(launches[0].at,1168);
});
check('forked attack puts physical shots on two sides with a real center gap',()=>{
 const m=Brain.make(store,0);
 const plan={element:'lightning',motif:'fan',tactic:'fork',count:6,spread:.5,
   speed:6.6,lead:false,feint:false,name:'Crown of Static',tellTarget:{x:400,y:300}};
 const first=Brain.openingPlan(m,plan,1000,{x:400,y:300});
 assert.equal(first.count,3);
 const angles=Brain.planDirections(m,first,{x:800,y:300},first.target);
 const straight=Math.PI;
 assert.ok(angles.some(a=>a<straight-.2));
 assert.ok(angles.some(a=>a>straight+.2));
 assert.ok(angles.every(a=>Math.abs(a-straight)>.19),'middle remains physically unblocked');
 const reply=Brain.followupPlan(m,{time:1750,pos:{x:800,y:300},
   player:{x:400,y:300}});
 assert.equal(first.count+reply.count,plan.count);
});
check('the Archivist recognizes a deliberate dodge reversal and actually hesitates',()=>{
 const m=Brain.make(store,0);
 const plan={element:'fire',motif:'pincer',tactic:'bait',count:4,spread:.65,
   speed:6.6,tellTarget:{x:400,y:300}};
 Brain.openingPlan(m,plan,1000,{x:400,y:300});
 const original=m.pending.due;
 m.lastPlayer={x:400,y:260,vx:0,vy:-180};
 Brain.trackEscape(m,{time:1440,pos:{x:800,y:300}});
 m.lastPlayer={x:400,y:310,vx:0,vy:230};
 Brain.trackEscape(m,{time:1570,pos:{x:800,y:300}});
 assert.equal(m.pending.reversals,1);
 assert.equal(m.pending.waited,true);
 assert.equal(m.seen.feints,1);
 assert.ok(m.pending.due>=original+200,'the bluff costs the boss real time');
 assert.equal(Brain.followupPlan(m,{time:original,pos:{x:800,y:300},
  player:{x:400,y:310}}),null,'followup withheld at old release moment');
 const reply=Brain.followupPlan(m,{time:m.pending.due,pos:{x:800,y:300},
  player:{x:400,y:310}});
 assert.ok(reply?.contested,'he remembers that the prediction was disputed');
});
check('an unmoving wizard does not falsely teach dodge reversals',()=>{
 const m=Brain.make(store,0);
 Brain.openingPlan(m,{element:'arcane',motif:'lance',tactic:'herd',count:3,
   spread:.11,speed:8,tellTarget:{x:400,y:300}},1000,{x:400,y:300});
 m.lastPlayer={x:400,y:300,vx:0,vy:0};
 Brain.trackEscape(m,{time:1470,pos:{x:800,y:300}});
 Brain.trackEscape(m,{time:1570,pos:{x:800,y:300}});
 assert.equal(m.pending.reversals,0);
 assert.equal(m.seen.feints,0);
 assert.equal(m.pending.due,1750);
});
check('learned deception memory remains bounded and old records still load',()=>{
 const own={data:null,getItem(){return this.data},setItem(k,v){this.data=v}};
 const m=Brain.make(own,0);
 m.seen.feints=4;m.prior.feints=2;
 assert.equal(Brain.remember(m,'retreat'),true);
 const next=Brain.make(own,1000);
 assert.ok(next.prior.feints>0&&next.prior.feints<6);
 const previous=JSON.parse(own.data);delete previous.feints;
 own.data=JSON.stringify(previous);
 assert.equal(Brain.make(own,2000).prior.feints,0);
});
check('actual misses reduce a failed tactical hypothesis rather than boosting it',()=>{
 const own={data:null,getItem(){return this.data},setItem(k,v){this.data=v}};
 const m=Brain.make(own,0);
 m.attempts=[{element:'frost',motif:'fan',tactic:'fork',tries:5,hits:0}];
 m.lastPlan={element:'frost',motif:'fan',tactic:'fork'};
 assert.equal(Brain.remember(m,'defeat'),true);
 const entry=Brain.make(own,0).prior.plans.find(p=>p.tactic==='fork');
 assert.ok(entry&&entry.score<-.8,'failed tactical plans lose confidence');
});
check('the learning boss explores fork, herd, bait, and probing without buffs',()=>{
 const m=Brain.make(store,0);m.attacks=11;m.seen.dodges=[3,8];
 m.seen.feints=3;const seen=new Set();
 for(let i=0;i<350;i++){
  const p=Brain.invent(m);seen.add(p.tactic);
  assert.ok(p.count>=3&&p.count<=6);
  assert.ok(p.speed<=8);
 }
 assert.deepEqual([...seen].sort(),['bait','fork','herd','probe']);
});
console.log('Archivist 063 checks passed: '+passed);
