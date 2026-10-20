import test from 'node:test';
import assert from 'node:assert/strict';
import {Grove} from '../grove-core.js';
import {PLACES} from '../grove-world.js';

function rolls(values,fn){
  const old=Math.random;let i=0;
  Math.random=()=>values[Math.min(i++,values.length-1)];
  try{return fn();}finally{Math.random=old;}
}
function waitingElsewhere(g,name){
  g.bar=100;
  for(const other of ['Pip','Riff','Murmur'])
    g.space.people[other].lastChoice=other===name?-100:100;
  const p=g.space.people[name];
  p.x=PLACES.clearing.x;p.y=PLACES.clearing.y;
  p.place='clearing';p.destination='clearing';p.route=[];
  return p;
}

test('Riff can voluntarily discover singing while holding NONE, away from storage',()=>{
  const g=new Grove(),p=waitingElsewhere(g,'Riff');
  g.disciplines.people.Riff.current='none';
  g.disciplines.instruments.guitar.owner=null;
  const before=g.snapshot(),oldVoice=before.voiceJournal,oldRiff=before.disciplines.people.Riff;
  rolls([0],()=>g.disciplines.decide(g));
  assert.equal(g.disciplines.current('Riff'),'voice');
  assert.equal(g.disciplines.holder('guitar'),null);
  assert.equal(p.destination,'clearing');
  assert.deepEqual(p.route,[]);
  assert.match(p.purpose,/voice/);
  assert.deepEqual(g.voiceJournal.snapshot(),oldVoice);
  assert.deepEqual(g.disciplines.people.Riff.practice,oldRiff.practice);
});

test('Choosing to sing remains optional, and silence can continue',()=>{
  const g=new Grove();waitingElsewhere(g,'Riff');
  g.disciplines.people.Riff.current='none';
  g.disciplines.instruments.guitar.owner=null;
  rolls([.99],()=>g.disciplines.decide(g));
  assert.equal(g.disciplines.current('Riff'),'none');
  assert.equal(g.disciplines.people.Riff.interest,null);
});

test('A borrowed physical instrument must be returned before using voice',()=>{
  const g=new Grove(),p=waitingElsewhere(g,'Riff');
  assert.equal(g.disciplines.current('Riff'),'guitar');
  assert.equal(g.disciplines.wants('Riff','voice',g),true);
  assert.equal(g.disciplines.current('Riff'),'guitar');
  assert.equal(p.destination,'instrumentRoom');
  assert.equal(g.disciplines.switchAtStudio('Riff',g),false);
  p.x=PLACES.instrumentRoom.x;p.y=PLACES.instrumentRoom.y;
  p.route=[];p.place='instrumentRoom';
  assert.equal(g.disciplines.switchAtStudio('Riff',g),true);
  assert.equal(g.disciplines.current('Riff'),'voice');
  assert.equal(g.disciplines.holder('guitar'),null);
});

test('Previously saved Pip and Riff decisions to try voice survive recovery',()=>{
  const saved=new Grove().snapshot();
  saved.disciplines.people.Pip.interest='voice';
  saved.disciplines.people.Riff.interest='voice';
  const restored=new Grove(saved);
  assert.equal(restored.disciplines.people.Pip.interest,'voice');
  assert.equal(restored.disciplines.people.Riff.interest,'voice');
});

test('Each musician can choose the instrument room during ordinary wandering',()=>{
  for(const [name,roll] of [['Pip',.2],['Riff',.2],['Murmur',.15]]){
    const g=new Grove(),p=waitingElsewhere(g,name);
    const instrument=g.disciplines.current(name),memories=g.voiceJournal.snapshot();
    rolls([0,roll],()=>g.space.decide(g));
    assert.equal(p.destination,'instrumentRoom',name);
    assert.equal(p.route.at(-1),'instrumentRoom',name);
    assert.equal(g.disciplines.current(name),instrument);
    assert.equal(g.disciplines.people[name].interest,null);
    assert.deepEqual(g.voiceJournal.snapshot(),memories);
  }
});

test('Instrument-room visits can be declined without a compulsory route',()=>{
  const g=new Grove(),p=waitingElsewhere(g,'Riff');
  rolls([.99],()=>g.space.decide(g));
  assert.equal(p.destination,'clearing');
  assert.deepEqual(p.route,[]);
});
