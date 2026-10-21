import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PitchMemory, LONG_TERM_LIMIT} from '../pitch-memory.js';
import {PitchRecall, parseContour} from '../pitch-recall.js';
import {Grove} from '../grove-core.js';
import {tryVocalPhrase} from '../voice-music.js';
import {tryLearnerVocalPhrase} from '../learner-vocals.js';

const fakeAudio=()=>({guitar(){},violin(){},voice(){},kick(){},snare(){},hat(){}});
const promote=(ear,name,key)=>{
 ear.remember(name,key,10,'Riff');ear.remember(name,key,12,'Riff');
};
test('Only bounded observed melodic relationships are playable',()=>{
 assert.deepEqual(parseContour('seq4:200:-400:125'),[0,200,-200,-75]);
 assert.deepEqual(parseContour('seq2:0'),[0,0]);
 for(const bad of ['together:700','seq3:700','seq2:1500',
  'seq3:900:900','seq3:100:25:25','seq3:126:50',null])
  assert.equal(parseContour(bad),null);
});

test('Each musician selects only their own promoted long-term sequences',()=>{
 const ear=new PitchMemory();
 ear.remember('Pip','seq3:100:200',13,'Riff'); // working only
 promote(ear,'Riff','seq3:300:-100');
 const recall=new PitchRecall(ear,null,()=>0);
 assert.equal(recall.choose('Pip',3),null);
 assert.deepEqual(recall.choose('Riff',3)?.offsets,[0,300,200]);
 assert.equal(recall.choose('Murmur',3),null);
 assert.equal(recall.voice('Riff',[0,2],15),null); // no same-length contour
 assert.equal(recall.voice('Riff',[0,2,4],15)?.key,'seq3:300:-100');
 assert.equal(recall.report('Riff').revisits,0); // merely chosen, not sung
});

test('Actual instrument scheduling, not memory selection, unlocks a revisit',()=>{
 const ear=new PitchMemory();promote(ear,'Riff','seq3:400:-200');
 const before=ear.snapshot(),recall=new PitchRecall(ear,null,()=>0),notes=[];
 assert.throws(()=>recall.instrument('Riff','guitar',220,20,90,850,
  ()=>{throw Error('not scheduled');}),/not scheduled/);
 assert.equal(recall.active.Riff,null);
 assert.equal(recall.report('Riff').revisits,0);
 recall.instrument('Riff','guitar',220,20,90,850,p=>notes.push(p));
 assert.equal(recall.report('Riff').revisits,0);
 assert.equal(recall.instrument('Riff','guitar',220,21,90,850,null),220);
 recall.instrument('Riff','guitar',246,22,90,850,p=>notes.push(p));
 assert.equal(recall.report('Riff').revisits,1);
 recall.instrument('Riff','guitar',293,23,90,850,p=>notes.push(p));
 assert.deepEqual(notes.map(n=>Math.round(1200*Math.log2(n/220))),[0,400,200]);
 assert.equal(recall.report('Riff').revisits,1);
 assert.deepEqual(ear.snapshot(),before);
});

test('Silence, other instruments and expired ideas never count as performances',()=>{
 const ear=new PitchMemory();promote(ear,'Pip','seq2:500');
 const recall=new PitchRecall(ear,null,()=>0);
 recall.instrument('Pip','violin',330,30,185,800,()=>{});
 recall.instrument('Pip','violin',331,40,185,800,()=>{});
 assert.equal(recall.report('Pip').revisits,0);
 recall.instrument('Pip','guitar',250,41,90,850,()=>{});
 assert.equal(recall.report('Pip').revisits,0);
 assert.equal(recall.report('Murmur').revisits,0);
});

test('Full long-term memory stays bounded and unchanged when revisited',()=>{
 const ear=new PitchMemory();
 for(let i=0;i<LONG_TERM_LIMIT;i++){
  const key='seq3:'+(i*25-2400)+':0';
  ear.remember('Murmur',key,i*3+10,'Riff');
  ear.remember('Murmur',key,i*3+12,'Riff');
 }
 const before=ear.snapshot();
 assert.equal(ear.report('Murmur').longTerm,LONG_TERM_LIMIT);
 const recall=new PitchRecall(ear,null,()=>0);
 const picked=recall.choose('Murmur',3);
 assert.ok(picked&&parseContour(picked.key));
 recall.record('Murmur',{bar:800,kind:'voice',key:picked.key});
 const saved=recall.snapshot();
 assert.deepEqual(new PitchRecall(ear,saved).snapshot(),saved);
 assert.deepEqual(ear.snapshot(),before);
});

test('Every older Groove world keeps its exact ear, archive and practice',()=>{
 const saved=new Grove().snapshot();
 delete saved.pitchRecall;
 const migrated=new Grove(saved);
 assert.deepEqual(migrated.pitchMemory.snapshot(),saved.pitchMemory);
 assert.deepEqual(migrated.disciplines.snapshot(),saved.disciplines);
 assert.deepEqual(migrated.archive.snapshot(),saved.archive);
 for(const name of ['Pip','Riff','Murmur'])
  assert.equal(migrated.pitchRecall.report(name).revisits,0);
 assert.deepEqual(new Grove(migrated.snapshot()).pitchRecall.snapshot(),
   migrated.pitchRecall.snapshot());
});

test('Murmur can sing an authentic remembered 4-note contour with no forced new performance',()=>{
 const g=new Grove();g.vocalist.stage='humming';g.vocalist.curiosity=1;
 promote(g.pitchMemory,'Murmur','seq4:400:-200:100');
 g.pitchRecall.random=()=>0;
 const heard=[],old=Math.random;Math.random=()=>0;
 try{
  const r=tryVocalPhrase({singer:g.vocalist,library:{
   busy:()=>false,has:(_,skill)=>skill==='melodicContours'
  },space:g.space,bar:1000,time:100,audio:{...fakeAudio(),voice:(...a)=>heard.push(a)},
    journal:g.voiceJournal,pitchRecall:g.pitchRecall});
  assert.ok(r.sang);assert.equal(heard.length,4);
  const ratios=heard.map(a=>Math.round(1200*Math.log2(a[0]/heard[0][0])));
  assert.deepEqual(ratios,[0,400,200,300]);
  assert.equal(g.pitchRecall.report('Murmur').byKind.voice,1);
  assert.equal(g.voiceJournal.notes,4);
  const rest=tryVocalPhrase({singer:g.vocalist,library:{busy:()=>false},
   space:g.space,bar:1001,time:104,audio:fakeAudio(),pitchRecall:g.pitchRecall});
  assert.equal(rest,false);
  assert.equal(g.pitchRecall.report('Murmur').revisits,1);
 }finally{Math.random=old;}
});

test('Pip can voice a remembered motif while preserving motor learning',()=>{
 const g=new Grove(),p=g.disciplines.people.Pip;
 p.current='voice';g.disciplines.instruments.drums.owner=null;
 p.practice.voice.notes=120;p.vocal.notes=120;
 promote(g.pitchMemory,'Pip','seq3:200:-400');
 g.pitchRecall.random=()=>0;
 const heard=[],old=Math.random;Math.random=()=>0;
 try{
  const r=tryLearnerVocalPhrase({name:'Pip',grove:g,bar:500,time:500,
   audio:{...fakeAudio(),voice:(...a)=>heard.push(a)}});
  assert.ok(r);assert.equal(heard.length,3);
  assert.equal(g.pitchRecall.report('Pip').byKind.voice,1);
  assert.equal(p.practice.voice.notes,123);assert.equal(p.vocal.notes,123);
 }finally{Math.random=old;}
});

test('The original sound bus and pitch memory still ground every recorded event',()=>{
 const core=readFileSync(new URL('../grove-core.js',import.meta.url),'utf8');
 const inst=readFileSync(new URL('../grove-disciplines.js',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(core,/pitchRecall:this.pitchRecall.snapshot\(\)/);
 assert.match(core,/this.pitchRecall.instrument\('Riff','guitar'/);
 assert.match(inst,/grove.pitchRecall.instrument\(name,'violin'/);
 assert.match(inst,/grove.pitchRecall.instrument\(name,'guitar'/);
 assert.match(server,/pitch-recall\.js/);
 assert.match(page,/REVISITS/);
});
