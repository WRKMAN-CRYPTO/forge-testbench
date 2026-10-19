import test from 'node:test';
import assert from 'node:assert/strict';
import {Grove} from '../grove-core.js';
import {restoreVoiceprints} from '../voiceprints.js';
import {tryLearnerVocalPhrase} from '../learner-vocals.js';

test('Name seeds are stable; a saved voiceprint is never regenerated',()=>{
  const first=restoreVoiceprints();
  assert.notDeepEqual(first.Pip,first.Riff);
  assert.equal(first.Murmur.legacy,true);
  const restored=restoreVoiceprints({...first,Pip:{...first.Pip,seedName:'Old Pip'}});
  assert.equal(restored.Pip.seedName,'Old Pip');
  assert.deepEqual(restored.Riff,first.Riff);
});

test('An old Murmur memory keeps its vocalist and journal intact',()=>{
  const original=new Grove().snapshot();
  delete original.voiceprints; // simulate the world before the voice upgrade
  original.vocalist={...original.vocalist,stage:'humming',
    notes:133,curiosity:.97,motif:[0,2,4,2],lastPitch:261.63};
  original.voiceJournal={...original.voiceJournal,notes:133,phrases:34,
    recent:[{bar:5,pitches:[220,261.63],vowel:'a'}]};
  const upgraded=new Grove(original),saved=upgraded.snapshot();
  assert.deepEqual(saved.vocalist,original.vocalist);
  assert.equal(saved.voiceJournal.notes,133);
  assert.equal(saved.voiceJournal.phrases,34);
  assert.equal(saved.voiceJournal.recent[0].vowel,'a');
  assert.deepEqual(saved.voiceprints.Murmur,{version:1,legacy:true});
});

test('Voice is a voluntary choice, not an automatic instrument replacement',()=>{
  const g=new Grove();
  const before=g.snapshot();
  assert.equal(g.disciplines.current('Pip'),'drums');
  assert.equal(g.disciplines.current('Riff'),'guitar');
  assert.equal(tryLearnerVocalPhrase({name:'Pip',grove:g,bar:100,time:0,
    audio:{voice(){throw Error('No forced vocals');}}}),false);
  assert.equal(g.snapshot().disciplines.people.Pip.practice.voice.notes,0);
  assert.deepEqual(g.voiceJournal.snapshot(),before.voiceJournal);
});

test('Pip learns from vocal notes while Riff and Murmur remain unaffected',()=>{
  const g=new Grove();
  g.disciplines.people.Pip.current='voice';
  g.disciplines.instruments.drums.owner=null;
  const events=[];
  const previous=Math.random;Math.random=()=>0;
  try {
    const result=tryLearnerVocalPhrase({name:'Pip',grove:g,bar:200,time:3,
      audio:{voice:(...args)=>events.push(args)}});
    assert.ok(result);
    assert.equal(events.length,1);
    assert.equal(events[0][5].player,'Pip');
    assert.deepEqual(events[0][4].voiceprint,g.voiceprints.Pip);
    assert.equal(g.disciplines.people.Pip.practice.voice.notes,1);
    assert.equal(g.disciplines.people.Pip.vocal.notes,1);
    const memory=g.snapshot();
    const restored=new Grove(memory);
    assert.deepEqual(restored.voiceprints.Pip,g.voiceprints.Pip);
    assert.equal(restored.disciplines.people.Pip.practice.voice.notes,1);
    assert.equal(restored.disciplines.people.Riff.practice.voice.notes,0);
    assert.equal(restored.voiceJournal.notes,0);
    assert.deepEqual(restored.vocalist,g.vocalist);
  } finally {Math.random=previous;}
});

test('Old instrumental performance history can inspire later vocal notes',()=>{
  const g=new Grove();
  const p=g.disciplines.people.Riff;
  p.current='voice';g.disciplines.instruments.guitar.owner=null;
  p.practice.guitar.recent.unshift({bar:41,pitch:329.63,duration:.35});
  const events=[];const original=Math.random;Math.random=()=>0;
  try {
    assert.ok(tryLearnerVocalPhrase({name:'Riff',grove:g,bar:42,time:2,
      audio:{voice:(...args)=>events.push(args)}}));
    assert.ok(events[0][0]>150&&events[0][0]<500);
    assert.equal(g.snapshot().disciplines.people.Riff.practice.voice.notes,1);
  } finally {Math.random=original;}
});

test('A practiced singer can revisit a motif from three real instrumental bars',()=>{
  const g=new Grove(),r=g.disciplines.people.Riff;
  r.current='voice';g.disciplines.instruments.guitar.owner=null;
  r.practice.voice.notes=120; r.vocal.notes=120;
  r.practice.guitar.recent=[
    {bar:3,pitch:293.66},{bar:2,pitch:246.94},{bar:1,pitch:220}
  ];
  const heard=[];const previous=Math.random;Math.random=()=>0;
  try {
    const result=tryLearnerVocalPhrase({name:'Riff',grove:g,bar:40,time:2,
      audio:{voice:(...args)=>heard.push(args)}});
    assert.equal(result.pitches.length,3);
    assert.equal(heard.length,3);
    assert.notEqual(heard[0][0],heard[2][0]);
    assert.equal(r.vocal.phrases,1);
    assert.deepEqual(r.vocal.motif,[0,2,5]);
    assert.equal(g.voiceJournal.notes,0);
  } finally {Math.random=previous;}
});
