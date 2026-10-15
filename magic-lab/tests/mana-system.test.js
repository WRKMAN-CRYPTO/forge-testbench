/* Run from repo root: node --test magic-lab/tests/mana-system.test.js */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Mana=require('../mana-system.js');
function make(){
 const db=new Map();
 const storage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,String(v))};
 return {engine:Mana.create({storage}),storage};
}
test('200 agents are a per-cast cost, not a global swarm limit',()=>{
 const {engine:m}=make(),recipe={settings:{population:200,delivery:'world'}};
 assert.equal(m.cost(recipe),66);
 assert.equal(m.spendForCast(recipe,0),true);
 assert.equal(m.snapshot().mana,34);
 assert.equal(m.canCast(recipe),false);
 m.emit('enemyDamaged',{enemyType:'charger',damage:165,time:20});
 assert.equal(m.canCast(recipe),true);
 assert.equal(m.spendForCast(recipe,50),true);
 // Two successful casts require no global active-agent quota or hidden cooldown.
});
test('channeling replenishes mana over time and stops cleanly',()=>{
 const {engine:m}=make(),recipe={settings:{population:200,delivery:'world'}};
 m.spendForCast(recipe,0);
 m.step(50,50);
 assert.equal(m.snapshot().mana,34);
 m.startCharge();
 for(let i=0;i<20;i++)m.step(50,100+i*50);
 assert.ok(Math.abs(m.snapshot().mana-68)<1e-6);
 m.stopCharge();m.step(50,1200);
 assert.ok(Math.abs(m.snapshot().mana-68)<1e-6);
 m.startCharge();m.emit('playerDamaged',{amount:7,time:1300});
 assert.equal(m.snapshot().charging,false);
});
test('real repeated hits and kills generate mana and persistent Essence',()=>{
 const {engine:m,storage}=make(),recipe={settings:{population:200,delivery:'world'}};
 m.spendForCast(recipe,0);
 const before=m.snapshot().mana;
 m.emit('enemyDamaged',{enemyType:'wisp',damage:4,time:20});
 m.emit('enemyDamaged',{enemyType:'wisp',damage:4,time:20});
 assert.ok(m.snapshot().mana>before+2);
 m.emit('enemyDefeated',{enemyType:'wisp',time:30});
 m.emit('enemyDefeated',{enemyType:'archivist',time:40});
 assert.equal(m.snapshot().essence,49);
 m.resetCombat();
 assert.equal(m.snapshot().essence,49);
 assert.equal(Mana.create({storage}).snapshot().essence,49);
 assert.equal(m.spendEssence(13),true);
 assert.equal(m.snapshot().essence,36);
 assert.equal(m.spendEssence(99),false);
});
test('peaceful mosslings do not generate mana or Essence',()=>{
 const {engine:m}=make();const before=m.snapshot();
 m.emit('enemyDamaged',{enemyType:'mossling',damage:80,time:1});
 m.emit('enemyDefeated',{enemyType:'mossling',time:2});
 assert.deepEqual(m.snapshot(),before);
});
test('a real dash-evaded attack pays once per dash',()=>{
 const {engine:m}=make();m.spendForCast({settings:{population:200,delivery:'world'}});
 m.emit('perfectDodge',{dashId:700,time:30});
 const one=m.snapshot().mana;
 m.emit('perfectDodge',{dashId:700,time:31});
 assert.equal(m.snapshot().mana,one);
 m.emit('perfectDodge',{dashId:1100,time:32});
 assert.ok(m.snapshot().mana>one);
});
test('resource events stay open to new spell types',()=>{
 const {engine:m}=make();
 let delivered=0;const off=m.on('enemyDamaged',()=>{delivered++});
 m.emit('enemyDamaged',{enemyType:'charger',kind:'future-gravity-swarm',damage:5,time:100});
 off();
 m.emit('enemyDamaged',{enemyType:'charger',kind:'future-explosion-swarm',damage:5,time:101});
 assert.equal(delivered,1);
});
