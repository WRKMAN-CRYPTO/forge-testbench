import test from 'node:test';
import assert from 'node:assert/strict';
import {Grove} from '../grove-core.js';
import {JamArchive} from '../jam-archive.js';

const sound=()=>({voice(){},guitar(){},violin(){},kick(){},snare(){},hat(){}});
const allVocal=()=>{
 const grove=new Grove();
 for(const name of ['Pip','Riff','Murmur'])grove.disciplines.people[name].current='voice';
 for(const i of ['drums','guitar','violin'])grove.disciplines.instruments[i].owner=null;
 grove.vocalist.stage='humming';grove.vocalist.curiosity=1;
 grove.vocalist.lastAttemptBar=-20;
 return grove;
};
function withRoll(roll,fn){
 const old=Math.random;Math.random=()=>roll;
 try{return fn();}finally{Math.random=old;}
}
test('All three voices can independently consent to one recorded jam',()=>{
 const grove=allVocal();
 withRoll(0,()=>{
   grove.modeBars=4;grove.considerNewActivity(null);
   assert.equal(grove.mode,'jam');
   assert.deepEqual(grove.jamParticipants,['Pip','Riff','Murmur']);
   for(let index=20;index<=44;index++)
     grove.onBeatEvent(index,20+index*(60/98),sound());
 });
 assert.equal(grove.jams,1);
 assert.equal(grove.archive.recordings.length,1);
 const tape=grove.archive.recordings[0];
 assert.deepEqual(tape.participants,['Pip','Riff','Murmur']);
 assert.ok(tape.events.length>=3);
 assert.ok(tape.events.every(e=>e.kind==='voice'));
 assert.deepEqual(new Grove(grove.snapshot()).archive.recordings,grove.archive.recordings);
});
test('Solo vocal experiments are not automatically registered as jams',()=>{
 const grove=allVocal(),before=grove.jams;
 withRoll(.999,()=>{
   grove.modeBars=4;grove.considerNewActivity(null);
   assert.equal(grove.mode,'solo');
   grove.onBeatEvent(20,20,sound());
 });
 assert.equal(grove.jams,before);
 assert.equal(grove.archive.recordings.length,0);
});
test('Two people can jam with any two instruments, with nobody required to join',()=>{
 const grove=allVocal();
 grove.disciplines.people.Pip.current='violin';
 // Murmur may be away or resting. Riff and Pip still have a pair.
 grove.space.people.Murmur.route=['pond'];
 withRoll(0,()=>{grove.modeBars=4;grove.considerNewActivity(null);});
 assert.equal(grove.mode,'jam');
 assert.deepEqual(grove.jamParticipants,['Pip','Riff']);
});
test('A silent nonparticipant is not smuggled into the tape',()=>{
 const a=new JamArchive();a.begin(9,2);
 a.capture('voice',[220,2.2,.14,.4,{vowel:'m'},{player:'Pip'}],9,null,['Pip','Riff']);
 a.capture('guitar',[196,2.3,.4,.3,{player:'Riff'}],9,null,['Pip','Riff']);
 a.capture('voice',[250,2.4,.1,.4,{vowel:'a'},{player:'Murmur'}],9,null,['Pip','Riff']);
 assert.deepEqual(a.finish(15).participants,['Pip','Riff']);
});
test('A committed jam dissolves when the remaining players leave',()=>{
 const g=allVocal();g.mode='jam';g.modeBars=5;
 g.jamParticipants=['Pip','Riff','Murmur'];
 g.space.people.Pip.route=['pond'];g.space.people.Riff.route=['pond'];
 withRoll(0,()=>g.finishBar());
 assert.equal(g.mode,'solo');
 assert.deepEqual(g.jamParticipants,[]);
 assert.equal(g.archive.recordings.length,0);
});
test('Previous jam counters and Murmur vocal memories survive the new migration',()=>{
 const old=new Grove().snapshot();delete old.jamParticipants;old.jams=710;
 old.voiceJournal.notes=987;old.vocalist.lastPitch=275;
 const g=new Grove(old);
 assert.equal(g.jams,710);assert.equal(g.voiceJournal.notes,987);
 assert.equal(g.vocalist.lastPitch,275);
 assert.deepEqual(g.jamParticipants,[]);
});
test('Instrumentless musicians are not automatically added to ensembles',()=>{
 const g=allVocal();g.disciplines.people.Murmur.current='none';
 withRoll(0,()=>{g.modeBars=4;g.considerNewActivity(null);});
 assert.deepEqual(g.jamParticipants,['Pip','Riff']);
});
