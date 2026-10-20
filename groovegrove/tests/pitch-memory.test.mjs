import test from 'node:test';
import assert from 'node:assert/strict';
import {PitchMemory} from '../pitch-memory.js';
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
 const p=ear.snapshot().people.Pip.patterns[0];
 assert.equal(p.key,'together:700');
 assert.equal(p.count,1);
 assert.ok(!p.key.startsWith('seq'));
});

test('Cross-musician simultaneous sounds can be heard but not imposed as a musical preference',()=>{
 const ear=new PitchMemory();
 put(ear,'Pip','Murmur',20,50,220);
 put(ear,'Pip','Riff',20,50.04,330,'guitar');
 ear.flush();
 assert.equal(ear.snapshot().people.Pip.patterns[0].key,'together:700');
 assert.deepEqual(Object.keys(ear.people.Pip).sort(),['heardNotes','patterns','playedNotes']);
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
 assert.ok(ear.report('Pip').shapes<=96);
 assert.ok(ear.snapshot().people.Pip.patterns.length<=96);
});

test('Passive observation does not affect simulation decisions, sound, books, jams or existing memories',()=>{
 const saved=new Grove().snapshot();
 const observing=new Grove(saved),control=new Grove(saved);
 control.space.onPitchedNote=null;
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
 assert.match(html,/EAR:/);
 assert.match(server,/pitch-memory\.js/);
});
