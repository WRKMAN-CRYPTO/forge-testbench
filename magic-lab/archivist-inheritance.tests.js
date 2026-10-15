/* Wandrune 072 | The Inheritance regression tests
 * Run node magic-lab/archivist-inheritance.tests.js
 */
'use strict';
const assert=require('node:assert/strict');
const Brain=require('./archivist-inheritance.js');
const Legacy=require('./archivist-legacy.js');
const Act=require('./archivist-combat.js');
const Loadout=require('./spell-loadout.js');
const Elements=require('./elements.js');
const BODY={setVelocity(b,v){b.velocity={...v}},applyForce(b,p,f){
 b.velocity.x+=f.x*800;b.velocity.y+=f.y*800;
}};
let passed=0;
function check(name,fn){fn();passed++;console.log('✓ '+name);}
function scenario(type,playerX=400){
 const mind=Brain.make(null,0),boss={id:11,alive:true,
   body:{position:{x:800,y:305}},archivist:mind};
 const s={time:{now:1000},player:{x:playerX,y:305},
  projectiles:[],wells:[],frosts:[],rings:[],
  actors:[{body:{id:41,position:{x:408,y:305},velocity:{x:0,y:0},mass:1}}],
  combat:{hp:100,invulnUntil:0,fields:[],blastFX:[],playerKnock:{x:0,y:0},enemies:[boss]},
  matter:{add:{circle(x,y){return {position:{x,y},velocity:{x:0,y:0},mass:1}}}},
  burst(){},announceCombat(){},cameras:{main:{shake(){}}}};
 const plan={kind:'legacy',legacy:type,target:{x:400,y:305},name:Legacy.SPELLS[type].name};
 const hits=[];
 const hit=(scene,amount,x,y,source)=>{
  hits.push({amount,source});scene.combat.hp-=amount;
 };
 return {s,boss,plan,hits,hit};
}
check('wizard library and old six-spell saves resolve to swarm only',()=>{
 const previous={getItem(){return JSON.stringify(['bolt','well','frost','flame','detonate','lightning'])}};
 assert.deepEqual(Loadout.read(previous),['crafted']);
 assert.deepEqual(Loadout.LIBRARY,['crafted']);
 assert.deepEqual(Loadout.DEFAULT,['crafted']);
 assert.equal(Loadout.valid(['bolt']),false);
 assert.deepEqual(Loadout.assign(['crafted'],0,'lightning'),['crafted']);
 assert.equal(Loadout.valid(['crafted']),true);
});
check('Archivist knows all seven retired spells',()=>{
 assert.deepEqual(Brain.LEGACY_SPELLS,Legacy.ORDER);
 assert.deepEqual([...Legacy.ORDER],['bolt','well','pulse','frost','flame','detonate','lightning']);
});
check('each inherited incantation uses one normal attack, never a free follow-up',()=>{
 for(let i=0;i<Legacy.ORDER.length;i++){
  const mind=Brain.make(null,0);
  mind.attacks=2;mind.attackAt=0;mind.nextThink=0;mind.legacyIndex=i;
  mind.lastHp=-1;
  const ob=(time)=>({time,pos:{x:800,y:305},player:{x:400,y:305},shots:[],casts:[],health:1});
  const tell=Brain.decide(mind,ob(2400));
  assert.equal(tell.tell?.legacy,Legacy.ORDER[i]);
  assert.equal(mind.held?.feint,false);
  const release=Brain.decide(mind,ob(2650));
  assert.equal(release.release?.legacy,Legacy.ORDER[i]);
  assert.equal(release.release?.kind,'legacy');
  assert.equal(mind.attacks,3,'spell uses a real attack turn');
  assert.equal(mind.pending,null,'no invisible second volley');
  assert.ok(mind.attackAt>2650,'normal cooldown imposed');
 }
});
check('first attack uses inherited magic and rotates between encounters',()=>{
 for(let encounter=0;encounter<7;encounter++){
  const storage={getItem(){return JSON.stringify({version:1,encounters:encounter,
   defeats:encounter,wins:0,plans:[]})}};
  const m=Brain.make(storage,0);
  m.attackAt=0;m.nextThink=0;
  const result=Brain.decide(m,{time:2500,pos:{x:800,y:305},
   player:{x:400,y:305},casts:[],shots:[]});
  assert.equal(result.tell?.legacy,Legacy.ORDER[encounter]);
  assert.equal(m.attacks,0,'telegraph never fires early');
 }
});
check('Arc Bolt creates a real Matter projectile with legacy speed',()=>{
 const {s,boss,plan}=scenario('bolt');
 assert.equal(Act.fire(s,boss,plan,BODY),true);
 assert.equal(s.projectiles.length,1);
 const shot=s.projectiles[0].body;
 assert.equal(shot.gameTag,'ember');
 assert.equal(shot.archive.legacy,true);
 assert.ok(Math.abs(Math.hypot(shot.velocity.x,shot.velocity.y)-13)<.0001);
});
check('Gravity Well bends bodies and pulls the moving wizard',()=>{
 const {s,boss,plan,hit}=scenario('well',435);
 assert.equal(Act.fire(s,boss,plan,BODY),true);
 assert.equal(s.wells[0].r,208);
 assert.equal(s.wells[0].life,4800);
 s.time.now=1200;Act.tickHazards(s,boss,1200,hit,BODY);
 assert.ok(s.combat.playerKnock.x<0);
 assert.equal(s.combat.hp,100);
});
check('Pulse physically pushes and strikes in range after its warning',()=>{
 const {s,boss,plan,hit}=scenario('pulse',780);
 assert.equal(Act.fire(s,boss,plan,BODY),true);
 s.time.now=1300;Act.tickHazards(s,boss,1300,hit,BODY);
 assert.equal(s.combat.hp,100);
 s.time.now=1400;Act.tickHazards(s,boss,1400,hit,BODY);
 assert.equal(s.combat.hp,92);
 assert.equal(s.rings.length,1);
});
check('Frost slows player movement without creating player-owned damage',()=>{
 const {s,boss,plan,hit}=scenario('frost',780);
 Act.fire(s,boss,plan,BODY);
 s.time.now=1500;Act.tickHazards(s,boss,1500,hit,BODY);
 assert.equal(s.frosts.length,1);
 assert.equal(s.frosts[0].hostile,true);
 assert.ok(s.combat.playerFrostSlowUntil>1500);
});
check('Flame Field causes hostile sustained heat, not friendly fire',()=>{
 const {s,boss,plan,hit}=scenario('flame');
 Act.fire(s,boss,plan,BODY);
 s.time.now=1510;Act.tickHazards(s,boss,1510,hit,BODY);
 assert.equal(s.combat.fields.length,1);
 assert.equal(s.combat.fields[0].hostile,true);
 assert.equal(s.combat.hp,95);
});
check('Detonation retains burst physics, visuals, and player threat',()=>{
 const {s,boss,plan,hit}=scenario('detonate');
 Act.fire(s,boss,plan,BODY);
 s.time.now=1600;Act.tickHazards(s,boss,1600,hit,BODY);
 assert.equal(s.combat.hp,81);
 assert.equal(s.combat.blastFX.length,1);
 assert.ok(s.actors[0].body.velocity.x>0);
});
check('Spark uses actual vapor conductivity with hostile ownership',()=>{
 const {s,boss,plan,hit}=scenario('lightning');
 let harmToEnemies=0;Elements.reset(s);
 s.elementWorld.clouds.push({id:1,x:400,y:305,radius:62,mass:1.2,heat:90,
  vx:0,vy:0,chargedUntil:0});
 const original=globalThis.WRKMAN_ELEMENTS;
 globalThis.WRKMAN_ELEMENTS=Elements;
 try{
  Act.fire(s,boss,plan,BODY);
  s.time.now=1500;Act.tickHazards(s,boss,1500,hit,BODY);
  assert.equal(s.combat.hp,83);
  assert.ok(s.elementWorld.flashes.length>0);
  const result=Elements.discharge(s,400,305,
    {hitEnemy(){harmToEnemies++}},
    {hostile:true,hitPlayer(){}});
  assert.ok(result.vapor>0);
  assert.equal(harmToEnemies,0,'cannot damage the Archivist as its own target');
 }finally{globalThis.WRKMAN_ELEMENTS=original;}
});
check('warning effects draw without mutating hitboxes',()=>{
 const {s,boss,plan}=scenario('detonate');
 Act.fire(s,boss,plan,BODY);
 const g=new Proxy({}, {get(){return(...args)=>{
  assert.ok(args.every(n=>Number.isFinite(n)),'non-finite geometry');
 }}});
 Legacy.paint(s,boss,g,1200);
 assert.equal(boss.archivist.legacyEffects[0].r,146);
});
console.log('Wandrune 072 Inheritance checks passed: '+passed);
