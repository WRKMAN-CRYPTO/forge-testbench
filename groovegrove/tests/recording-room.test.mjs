import test from 'node:test';
import assert from 'node:assert/strict';
import {Grove} from '../grove-core.js';
import {PLACES} from '../grove-world.js';
import {JamArchive} from '../jam-archive.js';
import {readFileSync} from 'node:fs';

const sounds=()=>({
 guitar(){},violin(){},voice(){},kick(){},snare(){},hat(){}
});

test('Three physical rooms coexist with original practice studio coordinates',()=>{
 const g=new Grove();
 assert.equal(PLACES.studio.x,1130);
 assert.ok(PLACES.instrumentRoom.x<PLACES.studio.x);
 assert.ok(PLACES.recording.x>PLACES.studio.x);
 assert.ok(g.space.chooseDestination('Pip','recording','listen to an old jam',30));
 assert.ok(g.space.people.Pip.route.includes('instrumentRoom'));
 assert.ok(g.space.people.Pip.route.includes('studio'));
 assert.equal(g.space.people.Pip.route.at(-1),'recording');
});

test('Only the instrument room allows physical instrument switches',()=>{
 const g=new Grove(),p=g.space.people.Pip;
 g.disciplines.people.Pip.interest='violin';
 p.x=PLACES.studio.x;p.y=PLACES.studio.y;p.route=[];
 assert.equal(g.disciplines.switchAtStudio('Pip',g),false);
 p.x=PLACES.instrumentRoom.x;p.y=PLACES.instrumentRoom.y;
 p.place='instrumentRoom';p.destination='instrumentRoom';
 assert.equal(g.disciplines.switchAtStudio('Pip',g),true);
 assert.equal(g.disciplines.holder('violin'),'Pip');
 assert.equal(g.disciplines.holder('drums'),null);
 assert.equal(g.disciplines.current('Murmur'),'voice');
 assert.equal(g.space.people.Pip.destination,'studio');
});

test('A completed jam archive contains real notes with original timing',()=>{
 const g=new Grove(),out=sounds();
 g.mode='jam';g.modeBars=5;g.jamParticipants=['Pip','Riff'];
 const before=g.snapshot();
 assert.equal(before.archive.recordings.length,0);
 const original=Math.random;Math.random=()=>0;
 try{
   for(let beat=0;beat<=4;beat++)g.onBeatEvent(beat,15+beat*60/98,out);
 }finally{Math.random=original;}
 assert.equal(g.jams,1);
 assert.equal(g.archive.recordings.length,1);
 const tape=g.archive.recordings[0];
 assert.ok(tape.events.length>5);
 assert.ok(tape.durationMs>0);
 assert.ok(tape.events.some(e=>e.source==='Pip'&&e.kind==='kick'));
 assert.ok(tape.events.some(e=>e.source==='Riff'&&e.kind==='guitar'));
 assert.ok(tape.events.every(e=>e.ms>=0&&Number.isFinite(e.volume)));
 assert.deepEqual(new Grove(g.snapshot()).archive.recordings,g.archive.recordings);
});

test('Earlier jam counters are not falsely converted into recordings',()=>{
 const saved=new Grove().snapshot();delete saved.archive;saved.jams=702;
 const restored=new Grove(saved);
 assert.equal(restored.jams,702);
 assert.equal(restored.archive.recordings.length,0);
});

test('Abandoned and empty sessions are not saved as recordings',()=>{
 const archive=new JamArchive();
 archive.begin(10);archive.discard();
 assert.equal(archive.finish(16),null);
 archive.begin(30);
 assert.equal(archive.finish(36),null);
 assert.equal(archive.recordings.length,0);
});

test('Murmur can hear a saved tape without changing any vocal skill or history',()=>{
 const g=new Grove(),a=g.archive;
 a.begin(10);
 a.capture('voice',[220,2,.17,.5,{vowel:'m'},{player:'Murmur'}],10,g.space);
 a.capture('guitar',[196,2.2,.5,.5,{player:'Riff'}],10,g.space);
 const tape=a.finish(16);assert.ok(tape);
 const p=g.space.people.Murmur;
 p.x=PLACES.recording.x;p.y=PLACES.recording.y;
 p.place='recording';p.destination='recording';p.route=[];
 const journal=g.voiceJournal.snapshot(),vocalist={...g.vocalist},
   practice=g.disciplines.snapshot();
 const original=Math.random;Math.random=()=>0;
 try{
   assert.equal(a.startListening('Murmur',35)?.id,tape.id);
 }finally{Math.random=original;}
 const heard=[],audio={
 voice:(...args)=>heard.push({kind:'voice',args}),
 guitar:(...args)=>heard.push({kind:'guitar',args})};
 a.playDeck(5,audio,g.space);
 assert.equal(heard.length,2);
 assert.ok(heard.every(({args})=>args.at(-1)?.player==='Recording'));
 assert.equal(a.reviews.Murmur.heardNotes,2);
 assert.deepEqual(g.voiceJournal.snapshot(),journal);
 assert.deepEqual(g.vocalist,vocalist);
 assert.deepEqual(g.disciplines.snapshot(),practice);
 assert.equal(a.snapshot().reviews.Murmur.count,1);
});

test('The iPhone canvas exposes recording library and real-note player',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/function makeRecordingViewer\(/);
 assert.match(html,/function playRecordedNotes\(/);
 assert.match(html,/function chosenTape\(/);
 assert.match(html,/function makeInstrumentStudio\(/);
 assert.match(html,/PLAY.*real performance|actual performance/i);
 assert.match(html,/PLACES\.instrumentRoom/);
 assert.match(html,/PLACES\.recording/);
});

test('A phrase scheduled before an earlier drum attack preserves real chronological timing',()=>{
 const archive=new JamArchive();
 archive.begin(42,10);
 // A vocal phrase can be scheduled first even when its audible onset is later.
 archive.capture('voice',[330,10.35,.2,.4,{vowel:'o'},{player:'Murmur'}],42);
 archive.capture('kick',[10.1,.7],42);
 const tape=archive.finish(48);
 assert.deepEqual(tape.events.map(e=>e.ms),[100,350]);
 assert.deepEqual(tape.events.map(e=>e.kind),['kick','voice']);
 assert.equal(tape.events[1].source,'Murmur');
 assert.equal(tape.events[1].expression.vowel,'o');
});
test('The bounded tape library preserves recent actual sessions and old jam totals',()=>{
 const archive=new JamArchive();
 for(let n=0;n<30;n++){
   archive.begin(n*7,n*20);
   archive.capture('guitar',[220,n*20+.05,.4,.3,{player:'Riff'}],n*7);
   archive.finish(n*7+6);
 }
 assert.equal(archive.recordings.length,24);
 assert.equal(archive.recordings[0].startBar,42);
 assert.equal(archive.recordings.at(-1).startBar,203);
});

test('A Railway restart during a jam never creates an incomplete fake tape',()=>{
 const initial=new Grove().snapshot();
 initial.mode='jam';initial.modeBars=5;
 const g=new Grove(initial);
 const original=Math.random;Math.random=()=>0;
 try{
   for(let beat=0;beat<=4;beat++)g.onBeatEvent(beat,10+beat*60/98,sounds());
 }finally{Math.random=original;}
 assert.equal(g.jams,1);
 assert.equal(g.archive.recordings.length,0);
});
