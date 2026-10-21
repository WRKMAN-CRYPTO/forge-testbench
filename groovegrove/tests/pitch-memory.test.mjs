import test from 'node:test';
import assert from 'node:assert/strict';
import {PitchMemory,WORKING_LIMIT,LONG_TERM_LIMIT} from '../pitch-memory.js';
import {Grove} from '../grove-core.js';
import {PLACES} from '../grove-world.js';
import {readFileSync} from 'node:fs';

const sound=()=>({guitar(){},voice(){},violin(){},kick(){},snare(){},hat(){}});
const put=(ear,listener,source,bar,at,pitch,kind='voice')=>
  ear.enqueue({listener,source,bar,at,pitch,kind});

test('A private ear recognizes frequency ratios across transposition without note names',()=>{
 const ear=new PitchMemory();
 put(ear,'Riff','Murmur',10,10,220);
 put(ear,'Riff','Murmur',10,10.6,330);
 put(ear,'Riff','Murmur',13,20,300);
 put(ear,'Riff','Murmur',13,20.6,450);
 ear.flush();
 const p=ear.report('Riff');
 assert.equal(p.heardNotes,4);
 assert.equal(p.playedNotes,0);
 assert.equal(p.recurring,1);
 assert.equal(p.newest.key,'seq2:700');
 assert.equal(p.newest.count,2);
 assert.equal(p.newest.firstBar,10);
 assert.equal(p.newest.lastBar,13);
 assert.equal(p.newest.from,'Murmur');
 assert.equal(ear.report('Pip').shapes,0);
 assert.equal(ear.report('Murmur').heardNotes,0);
 assert.ok(!JSON.stringify(ear.snapshot()).includes('A3'));
});

test('The system distinguishes simultaneous harmony from successive pitch changes',()=>{
 const ear=new PitchMemory();
 put(ear,'Pip','Riff',20,50,220,'guitar');
 put(ear,'Pip','Riff',20,50.025,330,'guitar');
 ear.flush();
 assert.equal(ear.report('Pip').shapes,1);
 assert.equal(ear.report('Pip').newest,null);
 const p=ear.snapshot().people.Pip.working[0];
 assert.equal(p.key,'together:700');
 assert.equal(p.count,1);
 assert.ok(!p.key.startsWith('seq'));
});

test('Cross-musician simultaneous sounds can be heard but not imposed as a musical preference',()=>{
 const ear=new PitchMemory();
 put(ear,'Pip','Murmur',20,50,220);
 put(ear,'Pip','Riff',20,50.04,330,'guitar');
 ear.flush();
 assert.equal(ear.snapshot().people.Pip.working[0].key,'together:700');
 assert.deepEqual(Object.keys(ear.people.Pip).sort(),['evictedLongTerm','evictedWorking','heardNotes','patterns','playedNotes','working']);
});

test('Real audibility and self-playing differ, and no sound travels through too much distance',()=>{
 const g=new Grove();
 const a=g.space.people.Pip,b=g.space.people.Riff,c=g.space.people.Murmur;
 a.x=100;a.y=100;b.x=1250;b.y=800;c.x=1290;c.y=790;
 g.space.sound('Pip','guitar',11,.6,220,10);
 g.pitchMemory.flush();
 assert.equal(g.pitchMemory.report('Pip').playedNotes,1);
 assert.equal(g.pitchMemory.report('Riff').heardNotes,0);
 assert.equal(g.pitchMemory.report('Murmur').heardNotes,0);
 g.space.sound('Riff','guitar',11,.6,220,11);
 g.pitchMemory.flush();
 assert.equal(g.pitchMemory.report('Murmur').heardNotes,1);
});

test('Drums, silent listening, unscheduled notes and tape playback never seed pitch relationships',()=>{
 const ear=new PitchMemory();
 put(ear,'Riff','Pip',1,2,0,'kick');
 put(ear,'Riff','Pip',1,2,-8);
 put(ear,'Riff','Pip',1,Infinity,330);
 put(ear,'Riff','Pip',1,2,220,'speech');
 ear.flush();
 assert.equal(ear.report('Riff').heardNotes,0);
 const g=new Grove(),before=g.pitchMemory.snapshot();
 g.archive.begin(10,10);
 g.archive.capture('voice',[220,10.2,.2,.3,{vowel:'m'},{player:'Murmur'}],10);
 g.archive.finish(14);
 g.archive.startListening('Pip',20);
 g.archive.playDeck(20,sound(),g.space);
 g.pitchMemory.flush();
 assert.deepEqual(g.pitchMemory.snapshot(),before);
});

test('Personal ear memories survive a snapshot without retroactively scanning old audio',()=>{
 const first=new Grove();
 first.space.sound('Murmur','voice',25,.5,220,30);
 first.space.sound('Murmur','voice',25,.5,330,30.7);
 first.pitchMemory.flush();
 const before=first.snapshot();
 const restored=new Grove(before);
 assert.deepEqual(restored.pitchMemory.snapshot(),before.pitchMemory);
 assert.equal(restored.pitchMemory.pending.length,0);
 const old={...before};delete old.pitchMemory;
 assert.equal(new Grove(old).pitchMemory.report('Murmur').shapes,0);
 assert.deepEqual(new Grove(old).archive.snapshot(),first.archive.snapshot());
 assert.deepEqual(new Grove(old).voiceJournal.snapshot(),first.voiceJournal.snapshot());
});

test('Memory remains bounded even with many unrelated fresh motifs',()=>{
 const ear=new PitchMemory();
 for(let i=0;i<300;i++){
   const base=140+(i%35)*3;
   put(ear,'Pip','Riff',i*3,i*10,base,'guitar');
   put(ear,'Pip','Riff',i*3+1,i*10+.55,base*(1+i/150),'guitar');
 }
 ear.flush();
 assert.ok(ear.report('Pip').shapes<=WORKING_LIMIT+LONG_TERM_LIMIT);
 assert.ok(ear.snapshot().people.Pip.patterns.length<=LONG_TERM_LIMIT);
 assert.ok(ear.snapshot().people.Pip.working.length<=WORKING_LIMIT);
});

test('Passive observation does not affect simulation decisions, sound, books, jams or existing memories',()=>{
 const saved=new Grove().snapshot();
 const observing=new Grove(saved),control=new Grove(saved);
 control.space.onPitchedNote=null;
 // The existing listening journal captures its RNG at construction time.
 // Both worlds must have the same deterministic experiment decisions.
 observing.understanding.random=()=>.37;control.understanding.random=()=>.37;
 // Disable travel only to isolate sound observations, not musician choices.
 observing.space.decide=()=>{};control.space.decide=()=>{};
 observing.disciplines.decide=()=>{};control.disciplines.decide=()=>{};
 const original=Math.random;Math.random=()=>.37;
 try{
   for(let i=0;i<40;i++)observing.onBeatEvent(i,100+i*60/98,sound());
   for(let i=0;i<40;i++)control.onBeatEvent(i,100+i*60/98,sound());
 }finally{Math.random=original;}
 const a=observing.snapshot(),b=control.snapshot();
 delete a.pitchMemory;delete b.pitchMemory;
 assert.deepEqual(a,b);
 assert.ok(observing.pitchMemory.report('Riff').playedNotes>0);
});

test('Real musician journals can show bounded observed recurring patterns on iPhone',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
 assert.match(html,/grove\.pitchMemory\?\.report\(journalName\)/);
 assert.match(html,/PITCH EAR/);
 assert.match(server,/pitch-memory\.js/);
});

test('All 96 authentic v1 pitch patterns migrate without losing observations',()=>{
 const original=new PitchMemory();
 for(let i=0;i<96;i++){
  original.remember('Riff','seq2:'+(i*25),i+1,'Murmur');
  original.remember('Riff','seq2:'+(i*25),i+200,'Pip');
 }
 // Manufacture the exact on-disk v1 schema from recurring records.
 const v1=original.snapshot();
 const old={version:1,people:Object.fromEntries(['Pip','Riff','Murmur']
  .map(n=>[n,{heardNotes:v1.people[n].heardNotes,playedNotes:v1.people[n].playedNotes,
    patterns:[...v1.people[n].patterns,...v1.people[n].working]}]))};
 const before=old.people.Riff.patterns;
 assert.equal(before.length,96);
 const restored=new PitchMemory(old),p=restored.snapshot().people.Riff;
 assert.equal(p.patterns.length,96);
 assert.deepEqual(p.patterns,before);
 assert.equal(p.working.length,0);
 assert.equal(restored.report('Riff').recurring,96);
 assert.equal(restored.report('Riff').longTerm,96);
});

test('A full legacy long-term catalog accepts brand-new patterns into working memory',()=>{
 const ear=new PitchMemory();
 for(let i=0;i<96;i++)ear.people.Riff.patterns.set('seq2:'+i,{
  key:'seq2:'+i,count:60,firstBar:i,lastBar:i+500,from:'Pip',played:0,heard:60
 });
 assert.equal(ear.report('Riff').longTerm,96);
 ear.remember('Riff','seq3:375:-250',3000,'Murmur');
 const w=ear.report('Riff');
 assert.equal(w.working,1);
 assert.equal(w.longTerm,96);
 ear.remember('Riff','seq3:375:-250',3200,'Murmur');
 assert.equal(ear.report('Riff').longTerm,97);
 assert.equal(ear.report('Riff').working,0);
 assert.equal(ear.people.Riff.patterns.get('seq3:375:-250').firstBar,3000);
 assert.equal(ear.people.Riff.patterns.get('seq3:375:-250').lastBar,3200);
});

test('Both tiers stay bounded and never close the door on new discoveries',()=>{
 const ear=new PitchMemory(),p=ear.people.Pip;
 for(let i=0;i<WORKING_LIMIT+19;i++)ear.remember('Pip','seq3:'+i+':-100',i,'Murmur');
 assert.equal(p.working.size,WORKING_LIMIT);
 assert.equal(ear.report('Pip').evictedWorking,19);
 assert.ok(p.working.has('seq3:'+(WORKING_LIMIT+18)+':-100'));
 for(let i=0;i<LONG_TERM_LIMIT;i++){
  const key='seq4:'+i+':0:25';
  ear.remember('Pip',key,1000+i*2,'Riff');
  ear.remember('Pip',key,1001+i*2,'Riff');
 }
 assert.equal(p.patterns.size,LONG_TERM_LIMIT);
 const remembered=p.patterns.keys().next().value;
 ear.remember('Pip','seq5:50:25:-75:0',4000,'Murmur');
 ear.remember('Pip','seq5:50:25:-75:0',4004,'Murmur');
 assert.equal(p.patterns.size,LONG_TERM_LIMIT);
 assert.ok(p.patterns.has('seq5:50:25:-75:0'));
 assert.equal(ear.report('Pip').evictedLongTerm,1);
 assert.equal(p.patterns.has(remembered),false);
});

test('Latest note in a single bar does not artificially promote working patterns',()=>{
 const ear=new PitchMemory();
 ear.remember('Murmur','seq2:700',41,'Murmur');
 ear.remember('Murmur','seq2:700',41,'Murmur');
 assert.equal(ear.report('Murmur').working,1);
 assert.equal(ear.report('Murmur').longTerm,0);
 ear.remember('Murmur','seq2:700',42,'Murmur');
 assert.equal(ear.report('Murmur').longTerm,1);
 assert.equal(ear.people.Murmur.patterns.get('seq2:700').count,2);
});

test('New pitch-memory generations persist with real dates and per-musician histories',()=>{
 const ear=new PitchMemory();
 ear.remember('Murmur','seq2:700',23,'Riff');
 ear.remember('Murmur','seq2:700',24,'Riff');
 ear.remember('Pip','seq3:-50:250',25,'Pip');
 for(let i=0;i<WORKING_LIMIT+1;i++)
  ear.remember('Riff','seq4:'+i+':25:-25',30+i,'Murmur');
 const saved=ear.snapshot(),restored=new PitchMemory(saved);
 assert.equal(saved.version,2);
 assert.deepEqual(restored.snapshot(),saved);
 assert.equal(restored.report('Murmur').newest.firstBar,23);
 assert.equal(restored.report('Pip').working,1);
 assert.equal(restored.report('Riff').evictedWorking,1);
 assert.ok(restored.people.Riff.working.has('seq4:'+(WORKING_LIMIT)+':25:-25'));
});
